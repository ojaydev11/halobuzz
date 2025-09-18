import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Game } from '@/models/Game';
import { GameRound } from '@/models/GameRound';
import { GameStake } from '@/models/GameStake';
import { User } from '@/models/User';
import { Transaction } from '@/models/Transaction';
import { gamesEngineService } from '@/services/GamesEngineService';
import { gameImplementations } from '@/services/GameImplementations';
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth';
import { globalLimiter } from '@/middleware/rateLimiter';
import { logger } from '@/config/logger';

const router = express.Router();

/**
 * Get all available games
 */
router.get('/list', async (req, res) => {
  try {
    const games = await Game.find({ isActive: true })
      .select('name code description type category minStake maxStake roundDuration config')
      .sort({ 'metadata.totalPlayed': -1 });

    res.json({
      success: true,
      data: { games }
    });
  } catch (error) {
    logger.error('Failed to get games list:', error);
    res.status(500).json({ success: false, error: 'Failed to get games' });
  }
});

/**
 * Get current round for a game
 */
router.get('/:gameCode/current-round', async (req, res) => {
  try {
    const { gameCode } = req.params;
    
    const game = await Game.findOne({ code: gameCode, isActive: true });
    if (!game) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }

    const round = await gamesEngineService.getOrCreateRound(
      game._id.toString(),
      game.roundDuration || 30,
      game.config?.options || 2
    );

    // Calculate time remaining
    const now = new Date();
    const timeRemaining = Math.max(0, Math.floor((round.endAt.getTime() - now.getTime()) / 1000));

    res.json({
      success: true,
      data: {
        roundId: round.roundId,
        startAt: round.startAt,
        endAt: round.endAt,
        timeRemaining,
        totalStake: round.totalStake,
        status: round.status,
        optionsCount: round.optionsCount
      }
    });
  } catch (error) {
    logger.error('Failed to get current round:', error);
    res.status(500).json({ success: false, error: 'Failed to get current round' });
  }
});

/**
 * Place a stake on a game
 */
router.post('/:gameCode/stake', authMiddleware, globalLimiter, [
  body('amount').isInt({ min: 1, max: 100000 }).withMessage('Invalid stake amount'),
  body('selectedOption').optional().isInt({ min: 0 }).withMessage('Invalid option selection')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { gameCode } = req.params;
    const { amount, selectedOption, metadata } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Get game
    const game = await Game.findOne({ code: gameCode, isActive: true });
    if (!game) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }

    // Validate stake amount
    if (amount < game.minStake || amount > game.maxStake) {
      return res.status(400).json({ 
        success: false, 
        error: `Stake must be between ${game.minStake} and ${game.maxStake} coins` 
      });
    }

    // Check user balance
    const user = await User.findById(userId);
    if (!user || !user.coins || user.coins.balance < amount) {
      return res.status(400).json({ success: false, error: 'Insufficient balance' });
    }

    // Get or create current round
    const round = await gamesEngineService.getOrCreateRound(
      game._id.toString(),
      game.roundDuration || 30,
      game.config?.options || 2
    );

    // Check if round is still open
    const now = new Date();
    if (now >= round.endAt) {
      return res.status(400).json({ success: false, error: 'Round has ended' });
    }

    // Check if user already staked in this round
    const existingStake = await GameStake.findOne({
      userId,
      roundId: round.roundId
    });

    if (existingStake) {
      return res.status(400).json({ success: false, error: 'Already staked in this round' });
    }

    // Deduct stake from user balance
    await User.findByIdAndUpdate(userId, {
      $inc: { 
        'coins.balance': -amount,
        'coins.totalSpent': amount
      }
    });

    // Create stake record
    const stake = await GameStake.create({
      userId,
      gameId: game._id,
      roundId: round.roundId,
      stakeAmount: amount,
      selectedOption,
      result: 'pending',
      winAmount: 0,
      payoutStatus: 'pending',
      metadata
    });

    // Update round total stake
    await GameRound.findByIdAndUpdate(round._id, {
      $inc: { totalStake: amount }
    });

    // Create transaction record
    await Transaction.create({
      userId,
      type: 'game_stake',
      amount: -amount,
      currency: 'coins',
      status: 'completed',
      description: `Staked on ${game.name}`,
      metadata: {
        gameId: game._id,
        gameCode: game.code,
        roundId: round.roundId,
        stakeId: stake._id
      }
    });

    res.json({
      success: true,
      message: 'Stake placed successfully',
      data: {
        stakeId: stake._id,
        roundId: round.roundId,
        amount,
        selectedOption,
        roundEndsAt: round.endAt
      }
    });

  } catch (error) {
    logger.error('Failed to place stake:', error);
    res.status(500).json({ success: false, error: 'Failed to place stake' });
  }
});

/**
 * Get round result and process payouts
 */
router.get('/:gameCode/round/:roundId/result', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gameCode, roundId } = req.params;
    const userId = req.user?.userId;

    const game = await Game.findOne({ code: gameCode });
    if (!game) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }

    const round = await GameRound.findOne({ roundId });
    if (!round) {
      return res.status(404).json({ success: false, error: 'Round not found' });
    }

    // Check if round has ended
    const now = new Date();
    if (now < round.endAt) {
      return res.status(400).json({ success: false, error: 'Round still in progress' });
    }

    // Get user's stake
    const userStake = await GameStake.findOne({ userId, roundId });
    
    // Calculate game result based on game type
    let gameResult: any;
    let userWon = false;
    let winAmount = 0;

    switch (game.category) {
      case 'coin-flip':
        if (userStake?.selectedOption !== undefined) {
          gameResult = gameImplementations.coinFlip(round.seedHash, userStake.selectedOption);
          userWon = gameResult.multiplier > 0;
          winAmount = Math.floor(userStake.stakeAmount * gameResult.multiplier);
        }
        break;

      case 'dice':
        const totalPlayers = await GameStake.countDocuments({ roundId });
        gameResult = gameImplementations.luckyDice(round.seedHash, totalPlayers);
        if (userStake) {
          // Check if user is the winner based on stake order
          const stakes = await GameStake.find({ roundId }).sort({ createdAt: 1 });
          const userIndex = stakes.findIndex(s => s.userId.toString() === userId);
          userWon = userIndex === gameResult.winnerOption;
          if (userWon) {
            winAmount = Math.floor(round.totalStake * 0.6); // 60% to winner
          }
        }
        break;

      case 'wheel':
        gameResult = gameImplementations.wheelOfFortune(round.seedHash);
        if (userStake) {
          winAmount = Math.floor(userStake.stakeAmount * gameResult.multiplier);
          userWon = gameResult.multiplier > 0;
        }
        break;

      case 'predictor':
        if (userStake?.metadata?.currentNumber && userStake?.metadata?.guess) {
          gameResult = gameImplementations.numberPredictor(
            round.seedHash,
            userStake.metadata.currentNumber,
            userStake.metadata.guess
          );
          userWon = gameResult.multiplier > 0;
          winAmount = Math.floor(userStake.stakeAmount * gameResult.multiplier);
        }
        break;

      case 'color':
        if (userStake?.selectedOption !== undefined) {
          gameResult = gameImplementations.colorRush(round.seedHash, userStake.selectedOption);
          userWon = gameResult.multiplier > 0;
          winAmount = Math.floor(userStake.stakeAmount * gameResult.multiplier);
        }
        break;

      case 'rps':
        if (userStake?.selectedOption !== undefined) {
          gameResult = gameImplementations.rockPaperScissors(round.seedHash, userStake.selectedOption);
          userWon = gameResult.multiplier > 0;
          winAmount = Math.floor(userStake.stakeAmount * gameResult.multiplier);
        }
        break;

      case 'treasure':
        if (userStake?.metadata?.boxesPicked) {
          gameResult = gameImplementations.treasureHunt(round.seedHash, userStake.metadata.boxesPicked);
          userWon = gameResult.multiplier > 0;
          winAmount = Math.floor(userStake.stakeAmount * gameResult.multiplier);
        }
        break;

      case 'clicker':
        if (userStake?.metadata?.clickCount) {
          gameResult = gameImplementations.speedClicker(
            round.seedHash,
            userStake.metadata.clickCount,
            game.duration
          );
          userWon = gameResult.multiplier > 0;
          winAmount = Math.floor(userStake.stakeAmount * gameResult.multiplier);
        }
        break;
    }

    // Process payout if user won and hasn't been paid yet
    if (userStake && userWon && userStake.payoutStatus === 'pending') {
      // Update user balance
      await User.findByIdAndUpdate(userId, {
        $inc: { 
          'coins.balance': winAmount,
          'coins.totalEarned': winAmount
        }
      });

      // Update stake record
      userStake.result = 'won';
      userStake.winAmount = winAmount;
      userStake.payoutStatus = 'paid';
      await userStake.save();

      // Create payout transaction
      await Transaction.create({
        userId,
        type: 'game_won',
        amount: winAmount,
        currency: 'coins',
        status: 'completed',
        description: `Won ${game.name}`,
        metadata: {
          gameId: game._id,
          gameCode: game.code,
          roundId,
          stakeAmount: userStake.stakeAmount,
          multiplier: gameResult?.multiplier
        }
      });
    } else if (userStake && !userWon && userStake.result === 'pending') {
      userStake.result = 'lost';
      await userStake.save();
    }

    // Update round status if needed
    if (round.status === 'open' && now >= round.endAt) {
      await gamesEngineService.settleRound(roundId);
    }

    res.json({
      success: true,
      data: {
        roundId,
        gameResult,
        userStake: userStake ? {
          stakeAmount: userStake.stakeAmount,
          result: userStake.result,
          winAmount: userStake.winAmount,
          payoutStatus: userStake.payoutStatus
        } : null,
        roundStats: {
          totalStake: round.totalStake,
          totalPlayers: await GameStake.countDocuments({ roundId }),
          houseTake: Math.floor(round.totalStake * 0.4) // 40% house edge
        }
      }
    });

  } catch (error) {
    logger.error('Failed to get round result:', error);
    res.status(500).json({ success: false, error: 'Failed to get round result' });
  }
});

/**
 * Get user's game history
 */
router.get('/history', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { limit = 20, offset = 0 } = req.query;

    const stakes = await GameStake.find({ userId })
      .populate('gameId', 'name code category')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(offset));

    const total = await GameStake.countDocuments({ userId });

    // Calculate statistics
    const stats = await GameStake.aggregate([
      { $match: { userId: new (require('mongoose')).Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalStaked: { $sum: '$stakeAmount' },
          totalWon: { $sum: '$winAmount' },
          gamesPlayed: { $sum: 1 },
          gamesWon: {
            $sum: { $cond: [{ $eq: ['$result', 'won'] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        history: stakes,
        stats: stats[0] || {
          totalStaked: 0,
          totalWon: 0,
          gamesPlayed: 0,
          gamesWon: 0
        },
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset)
        }
      }
    });

  } catch (error) {
    logger.error('Failed to get game history:', error);
    res.status(500).json({ success: false, error: 'Failed to get game history' });
  }
});

/**
 * Get leaderboard for a specific game
 */
router.get('/:gameCode/leaderboard', async (req, res) => {
  try {
    const { gameCode } = req.params;
    const { period = 'daily' } = req.query;

    const game = await Game.findOne({ code: gameCode });
    if (!game) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }

    // Calculate date range
    let startDate = new Date();
    switch (period) {
      case 'daily':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'all-time':
        startDate = new Date(0);
        break;
    }

    const leaderboard = await GameStake.aggregate([
      {
        $match: {
          gameId: game._id,
          createdAt: { $gte: startDate },
          result: 'won'
        }
      },
      {
        $group: {
          _id: '$userId',
          totalWinnings: { $sum: '$winAmount' },
          gamesWon: { $sum: 1 },
          biggestWin: { $max: '$winAmount' }
        }
      },
      { $sort: { totalWinnings: -1 } },
      { $limit: 100 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          username: '$user.username',
          avatar: '$user.profilePicture',
          totalWinnings: 1,
          gamesWon: 1,
          biggestWin: 1
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        gameCode,
        period,
        leaderboard
      }
    });

  } catch (error) {
    logger.error('Failed to get leaderboard:', error);
    res.status(500).json({ success: false, error: 'Failed to get leaderboard' });
  }
});

export default router;
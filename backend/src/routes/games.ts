import express from 'express';
import { body, validationResult } from 'express-validator';
import { Game } from '../models/Game';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { reputationService } from '../services/ReputationService';
import { gamingControlsService } from '../services/GamingControlsService';
import { logger } from '../config/logger';
import { gamesEngineService } from '@/services/GamesEngineService';

const router: express.Router = express.Router();

// Get games list
router.get('/', async (req, res) => {
  try {
    const {
      type,
      limit = 20,
      page = 1,
      sortBy = 'popularity'
    } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const filter: any = { isActive: true };

    if (type) filter.type = type;

    let sortCriteria: any = {};
    switch (sortBy) {
      case 'name':
        sortCriteria = { name: 1 };
        break;
      case 'entryFee':
        sortCriteria = { entryFee: 1 };
        break;
      case 'popularity':
      default:
        sortCriteria = { 'metadata.totalPlayed': -1 };
        break;
    }

    const games = await Game.find(filter)
      .sort(sortCriteria)
      .skip(skip)
      .limit(parseInt(limit as string));

    const total = await Game.countDocuments(filter);

    res.json({
      success: true,
      data: {
        games: games.map(game => ({
          id: game._id,
          name: game.name,
          description: game.description,
          type: game.type,
          minPlayers: game.minPlayers,
          maxPlayers: game.maxPlayers,
          entryFee: game.entryFee,
          prizePool: game.prizePool,
          duration: game.duration,
          aiWinRate: game.aiWinRate,
          rules: game.rules,
          rewards: game.rewards,
          metadata: game.metadata
        })),
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });

  } catch (error) {
    logger.error('Get games failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get games'
    });
  }
});

// Get popular games
router.get('/popular', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const games = await Game.find({ isActive: true }).sort({ playCount: -1, rating: -1 }).limit(parseInt(limit as string));

    res.json({
      success: true,
      data: {
        games: games.map(game => ({
          id: game._id,
          name: game.name,
          description: game.description,
          type: game.type,
          entryFee: game.entryFee,
          prizePool: game.prizePool,
          metadata: game.metadata
        }))
      }
    });

  } catch (error) {
    logger.error('Get popular games failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get popular games'
    });
  }
});

// Get game by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const game = await Game.findById(id);
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }

    res.json({
      success: true,
      data: {
        game: {
          id: game._id,
          name: game.name,
          description: game.description,
          type: game.type,
          minPlayers: game.minPlayers,
          maxPlayers: game.maxPlayers,
          entryFee: game.entryFee,
          prizePool: game.prizePool,
          duration: game.duration,
          aiWinRate: game.aiWinRate,
          rules: game.rules,
          rewards: game.rewards,
          metadata: game.metadata
        }
      }
    });

  } catch (error) {
    logger.error('Get game failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get game'
    });
  }
});

// Play game
router.post('/:id/play', [
  body('players')
    .isArray({ min: 1 })
    .withMessage('At least one player is required'),
  body('players.*.userId')
    .isMongoId()
    .withMessage('Valid user ID is required'),
  body('players.*.betAmount')
    .isInt({ min: 1 })
    .withMessage('Valid bet amount is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { players } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate game
    const game = await Game.findById(id);
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }

    if (!game.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Game is not available'
      });
    }

    // Enforce AI win rate bounds 0.35–0.55
    const aiRate = (game.aiWinRate || 0) / 100;
    if (aiRate < 0.35 || aiRate > 0.55) {
      return res.status(400).json({
        success: false,
        error: 'Invalid game configuration: aiWinRate must be between 35% and 55%'
      });
    }

    // Check gaming controls
    const totalBetAmount = players.reduce((sum, player) => sum + player.betAmount, 0);
    const gamingCheck = await gamingControlsService.canPlayGame(userId, id, totalBetAmount);
    if (!gamingCheck.allowed) {
      return res.status(400).json({
        success: false,
        error: gamingCheck.reason,
        limits: gamingCheck.limits
      });
    }

    // Start gaming session if not already active
    if (!gamingControlsService.getActiveSessions().find(s => s.userId === userId)) {
      gamingControlsService.startSession(userId);
    }

    // Validate player count
    if (players.length < game.minPlayers || players.length > game.maxPlayers) {
      return res.status(400).json({
        success: false,
        error: `Game requires ${game.minPlayers}-${game.maxPlayers} players`
      });
    }

    // Validate players and deduct entry fees
    const validatedPlayers = [];
    const totalPrizePool = game.prizePool;

    for (const player of players) {
      const user = await User.findById(player.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: `User ${player.userId} not found`
        });
      }

      if (user.coins?.balance < player.betAmount) {
        return res.status(400).json({
          success: false,
          error: `User ${user.username} has insufficient coins`
        });
      }

      // Deduct entry fee
      await User.findByIdAndUpdate(player.userId, {
        $inc: { 
          'coins.balance': -player.betAmount,
          'coins.totalSpent': player.betAmount
        }
      });

      validatedPlayers.push({
        userId: player.userId,
        username: user.username,
        betAmount: player.betAmount
      });
    }

    // Use global deterministic round outcome so all users see same result
    const optionsCount = Math.max(2, Math.min(players.length, 10));
    const round = await gamesEngineService.getOrCreateRound(String(game._id), game.duration || 60, optionsCount);

    // Determine winners based on round outcome
    const outcomeIndex = round.outcomeIndex % validatedPlayers.length;
    const totalBetAmount = validatedPlayers.reduce((sum: number, p: any) => sum + p.betAmount, 0);
    const prizePool = totalBetAmount + (game.prizePool || 0);
    const winner = validatedPlayers[outcomeIndex];
    const winnings = Math.floor(prizePool * 0.6); // 60% to players as specified
    const house = prizePool - winnings; // 40% to house
    const gameResult = {
      winners: [{
        userId: winner.userId,
        username: winner.username,
        betAmount: winner.betAmount,
        winnings
      }],
      totalWinnings: winnings
    };

    // Distribute prizes
    const winners = gameResult.winners;
    const totalWinnings = gameResult.totalWinnings;

    for (const winner of winners) {
      await User.findByIdAndUpdate(winner.userId, {
        $inc: { 
          'coins.balance': winner.winnings,
          'coins.totalEarned': winner.winnings
        }
      });

      // Create transaction record
      const transaction = new Transaction({
        userId: winner.userId,
        type: 'game_won',
        amount: winner.winnings,
        currency: 'coins',
        status: 'completed',
        description: `Won ${game.name} game`,
        metadata: {
          gameId: game._id,
          gameName: game.name,
          betAmount: winner.betAmount,
          winnings: winner.winnings
        },
        netAmount: winner.winnings
      });
      await transaction.save();

      // Apply reputation bonus
      await reputationService.applyReputationDelta(winner.userId, 'game_won', {
        count: 1,
        gameId: game._id,
        winnings: winner.winnings
      });
    }

    // Update game statistics
    game.metadata.totalPlayed++;
    game.metadata.totalWinners += winners.length;
    game.metadata.totalPrizePool += totalWinnings;
    await game.save();

    // Update gaming session
    gamingControlsService.updateSession(userId, totalBetAmount);

    res.json({
      success: true,
      message: 'Game completed successfully',
      data: {
        game: {
          id: game._id,
          name: game.name,
          type: game.type
        },
        result: {
          winners: winners.map(winner => ({
            userId: winner.userId,
            username: winner.username,
            betAmount: winner.betAmount,
            winnings: winner.winnings
          })),
          totalWinnings,
          gameDuration: game.duration
        }
      }
    });

  } catch (error) {
    logger.error('Play game failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to play game'
    });
  }
});

// Get games by type
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { limit = 20 } = req.query;

    const games = await Game.find({ type, isActive: true }).sort({ playCount: -1 });
    const limitedGames = games.slice(0, parseInt(limit as string));

    res.json({
      success: true,
      data: {
        type,
        games: limitedGames.map(game => ({
          id: game._id,
          name: game.name,
          description: game.description,
          entryFee: game.entryFee,
          prizePool: game.prizePool,
          metadata: game.metadata
        }))
      }
    });

  } catch (error) {
    logger.error('Get games by type failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get games by type'
    });
  }
});

// Get user's game history
router.get('/user/:userId/history', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, page = 1 } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const transactions = await Transaction.find({
      userId,
      type: { $in: ['game_won', 'gift_sent'] },
      'metadata.gameId': { $exists: true }
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string))
      .populate('metadata.gameId', 'name type');

    const total = await Transaction.countDocuments({
      userId,
      type: { $in: ['game_won', 'gift_sent'] },
      'metadata.gameId': { $exists: true }
    });

    res.json({
      success: true,
      data: {
        history: transactions.map(transaction => ({
          id: transaction._id,
          type: transaction.type,
          amount: transaction.amount,
          gameName: transaction.metadata?.gameId?.name,
          gameType: transaction.metadata?.gameId?.type,
          betAmount: transaction.metadata?.betAmount,
          winnings: transaction.metadata?.winnings,
          createdAt: transaction.createdAt
        })),
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });

  } catch (error) {
    logger.error('Get user game history failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get game history'
    });
  }
});

// Helper function to simulate game with AI win rate enforcement
async function simulateGame(game: any, players: any[]) {
  const aiWinRate = game.aiWinRate / 100; // Convert to decimal
  const random = Math.random();
  
  let winners = [];
  let totalWinnings = 0;

  if (random < aiWinRate) {
    // AI wins - no human players win
    winners = [];
    totalWinnings = 0;
  } else {
    // Human players can win
    const totalBetAmount = players.reduce((sum, player) => sum + player.betAmount, 0);
    const prizePool = totalBetAmount + game.prizePool;
    
    // Randomly select winners (1-3 winners)
    const winnerCount = Math.min(Math.floor(Math.random() * 3) + 1, players.length);
    const shuffledPlayers = players.sort(() => Math.random() - 0.5);
    
    winners = shuffledPlayers.slice(0, winnerCount).map(player => ({
      userId: player.userId,
      username: player.username,
      betAmount: player.betAmount,
      winnings: Math.floor(prizePool / winnerCount)
    }));
    
    totalWinnings = winners.reduce((sum, winner) => sum + winner.winnings, 0);
  }

  return { winners, totalWinnings };
}

export default router;

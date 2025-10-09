import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../config/logger';

const router = express.Router();

// Coins transaction types
enum TransactionType {
  GAME_REWARD = 'game_reward',
  GAME_ENTRY = 'game_entry',
  PURCHASE = 'purchase',
  BONUS = 'bonus',
  REFUND = 'refund',
  TRANSFER = 'transfer',
  DAILY_REWARD = 'daily_reward',
  ACHIEVEMENT = 'achievement',
  REFERRAL = 'referral',
  STREAMING = 'streaming',
  GIFT_SENT = 'gift_sent',
  GIFT_RECEIVED = 'gift_received'
}

/**
 * GET /api/v1/coins/balance
 * Get user's coins balance
 */
router.get('/balance', authMiddleware, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const user = await User.findById(userId).select('coins');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      balance: {
        totalCoins: user.coins?.balance || 0,
        bonusCoins: user.coins?.bonusBalance || 0,
        availableCoins: user.coins?.balance || 0,
        totalEarned: user.coins?.totalEarned || 0,
        totalSpent: user.coins?.totalSpent || 0,
        lastUpdated: user.updatedAt
      }
    });
  } catch (error) {
    logger.error('Failed to get coins balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get coins balance'
    });
  }
});

/**
 * GET /api/v1/coins/transactions
 * Get user's transaction history
 */
router.get('/transactions', authMiddleware, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { limit = 50, offset = 0, type } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const query: any = { userId: new mongoose.Types.ObjectId(userId) };
    if (type) {
      query.type = type;
    }

    const [userTransactions, total] = await Promise.all([
      Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip(parseInt(offset as string))
        .limit(parseInt(limit as string))
        .lean(),
      Transaction.countDocuments(query)
    ]);

    res.json({
      success: true,
      transactions: userTransactions.map(tx => ({
        id: tx._id,
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency,
        status: tx.status,
        description: tx.description,
        metadata: tx.metadata,
        timestamp: tx.createdAt
      })),
      total,
      hasMore: total > parseInt(offset as string) + parseInt(limit as string)
    });
  } catch (error) {
    logger.error('Failed to get transaction history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transaction history'
    });
  }
});

/**
 * POST /api/v1/coins/add
 * Add coins to user balance (internal/admin use)
 */
router.post('/add', [
  authMiddleware,
  body('amount').isInt({ min: 1 }).withMessage('Amount must be positive'),
  body('type').isIn(Object.values(TransactionType)).withMessage('Invalid transaction type'),
  body('description').isString().isLength({ min: 1, max: 500 })
], async (req: any, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const userId = req.user?.userId;
    const { amount, type, description, metadata = {} } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Use MongoDB transaction for atomicity
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const user = await User.findById(userId).session(session);

      if (!user) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Update user coins
      if (!user.coins) {
        user.coins = { balance: 0, bonusBalance: 0, totalEarned: 0, totalSpent: 0 };
      }

      user.coins.balance += amount;
      user.coins.totalEarned += amount;
      await user.save({ session });

      // Create transaction record
      const transaction = new Transaction({
        userId,
        type,
        amount,
        currency: 'coins',
        status: 'completed',
        description,
        metadata,
        fees: 0,
        netAmount: amount
      });
      await transaction.save({ session });

      await session.commitTransaction();

      res.json({
        success: true,
        transaction: {
          id: transaction._id,
          amount: transaction.amount,
          balance: user.coins.balance,
          description: transaction.description,
          timestamp: transaction.createdAt
        },
        newBalance: user.coins.balance
      });
    } catch (txError) {
      await session.abortTransaction();
      throw txError;
    } finally {
      session.endSession();
    }
  } catch (error) {
    logger.error('Failed to add coins:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add coins'
    });
  }
});

/**
 * POST /api/v1/coins/spend
 * Spend coins from user balance
 */
router.post('/spend', [
  authMiddleware,
  body('amount').isInt({ min: 1 }).withMessage('Amount must be positive'),
  body('type').isIn(Object.values(TransactionType)).withMessage('Invalid transaction type'),
  body('description').isString().isLength({ min: 1, max: 500 })
], async (req: any, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const userId = req.user?.userId;
    const { amount, type, description, metadata = {} } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const user = await User.findById(userId).session(session);

      if (!user) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Check if user has enough coins
      const currentBalance = user.coins?.balance || 0;
      if (currentBalance < amount) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          error: 'Insufficient coins',
          required: amount,
          available: currentBalance
        });
      }

      // Update user coins
      if (!user.coins) {
        user.coins = { balance: 0, bonusBalance: 0, totalEarned: 0, totalSpent: 0 };
      }

      user.coins.balance -= amount;
      user.coins.totalSpent += amount;
      await user.save({ session });

      // Create transaction record
      const transaction = new Transaction({
        userId,
        type,
        amount: -amount, // Negative for spending
        currency: 'coins',
        status: 'completed',
        description,
        metadata,
        fees: 0,
        netAmount: -amount
      });
      await transaction.save({ session });

      await session.commitTransaction();

      res.json({
        success: true,
        transaction: {
          id: transaction._id,
          amount: transaction.amount,
          balance: user.coins.balance,
          description: transaction.description,
          timestamp: transaction.createdAt
        },
        newBalance: user.coins.balance
      });
    } catch (txError) {
      await session.abortTransaction();
      throw txError;
    } finally {
      session.endSession();
    }
  } catch (error) {
    logger.error('Failed to spend coins:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to spend coins'
    });
  }
});

/**
 * POST /api/v1/coins/transfer
 * Transfer coins between users
 */
router.post('/transfer', [
  authMiddleware,
  body('recipientId').isMongoId().withMessage('Valid recipient ID required'),
  body('amount').isInt({ min: 1 }).withMessage('Amount must be positive'),
  body('description').optional().isString().isLength({ max: 500 })
], async (req: any, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const userId = req.user?.userId;
    const { recipientId, amount, description = 'Coin transfer' } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    if (userId === recipientId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot transfer coins to yourself'
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const [sender, recipient] = await Promise.all([
        User.findById(userId).session(session),
        User.findById(recipientId).session(session)
      ]);

      if (!sender || !recipient) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          error: 'Sender or recipient not found'
        });
      }

      // Check sender balance
      const senderBalance = sender.coins?.balance || 0;
      if (senderBalance < amount) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          error: 'Insufficient coins for transfer',
          required: amount,
          available: senderBalance
        });
      }

      // Update balances
      if (!sender.coins) sender.coins = { balance: 0, bonusBalance: 0, totalEarned: 0, totalSpent: 0 };
      if (!recipient.coins) recipient.coins = { balance: 0, bonusBalance: 0, totalEarned: 0, totalSpent: 0 };

      sender.coins.balance -= amount;
      sender.coins.totalSpent += amount;

      recipient.coins.balance += amount;
      recipient.coins.totalEarned += amount;

      await Promise.all([
        sender.save({ session }),
        recipient.save({ session })
      ]);

      // Create transaction records (double-entry)
      const senderTransaction = new Transaction({
        userId,
        type: 'transfer',
        amount: -amount,
        currency: 'coins',
        status: 'completed',
        description: `${description} (to ${recipient.username})`,
        metadata: { recipientId, recipientUsername: recipient.username },
        fees: 0,
        netAmount: -amount
      });

      const recipientTransaction = new Transaction({
        userId: recipientId,
        type: 'transfer',
        amount,
        currency: 'coins',
        status: 'completed',
        description: `${description} (from ${sender.username})`,
        metadata: { senderId: userId, senderUsername: sender.username },
        fees: 0,
        netAmount: amount
      });

      await Promise.all([
        senderTransaction.save({ session }),
        recipientTransaction.save({ session })
      ]);

      await session.commitTransaction();

      res.json({
        success: true,
        transfer: {
          amount,
          recipientId,
          recipientUsername: recipient.username,
          description,
          timestamp: senderTransaction.createdAt
        },
        newBalance: sender.coins.balance
      });
    } catch (txError) {
      await session.abortTransaction();
      throw txError;
    } finally {
      session.endSession();
    }
  } catch (error) {
    logger.error('Failed to transfer coins:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to transfer coins'
    });
  }
});

/**
 * POST /api/v1/coins/daily-reward
 * Claim daily login reward
 */
router.post('/daily-reward', authMiddleware, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Check if user already claimed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayReward = await Transaction.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      type: 'daily_reward',
      createdAt: { $gte: today }
    });

    if (todayReward) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return res.status(400).json({
        success: false,
        error: 'Daily reward already claimed today',
        nextAvailable: tomorrow.toISOString()
      });
    }

    // Calculate streak (simplified - count consecutive days in last 7 days)
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentRewards = await Transaction.find({
      userId: new mongoose.Types.ObjectId(userId),
      type: 'daily_reward',
      createdAt: { $gte: sevenDaysAgo }
    }).sort({ createdAt: -1 });

    const baseReward = 50;
    const streakDays = Math.min(recentRewards.length + 1, 7);
    const streakBonus = (streakDays - 1) * 10;
    const totalReward = baseReward + streakBonus;

    // Award coins
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const user = await User.findById(userId).session(session);

      if (!user) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      if (!user.coins) {
        user.coins = { balance: 0, bonusBalance: 0, totalEarned: 0, totalSpent: 0 };
      }

      user.coins.balance += totalReward;
      user.coins.bonusBalance += totalReward; // Daily rewards are bonus coins
      user.coins.totalEarned += totalReward;
      await user.save({ session });

      const transaction = new Transaction({
        userId,
        type: 'daily_reward',
        amount: totalReward,
        currency: 'coins',
        status: 'completed',
        description: `Daily reward (${streakDays} day streak)`,
        metadata: { streakDays, baseReward, streakBonus },
        fees: 0,
        netAmount: totalReward
      });
      await transaction.save({ session });

      await session.commitTransaction();

      res.json({
        success: true,
        reward: {
          amount: totalReward,
          baseAmount: baseReward,
          streakBonus,
          streakDays,
          description: `Daily reward (${streakDays} day streak)`
        },
        newBalance: user.coins.balance
      });
    } catch (txError) {
      await session.abortTransaction();
      throw txError;
    } finally {
      session.endSession();
    }
  } catch (error) {
    logger.error('Failed to claim daily reward:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to claim daily reward'
    });
  }
});

export default router;

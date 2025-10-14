import express from 'express';
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { logger } from '../config/logger';
import { AuthenticatedRequest } from '../middleware/auth';

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

// Get user's coins balance
router.get('/balance', async (req: AuthenticatedRequest, res: Response) => {
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
      data: {
        balance: {
          totalCoins: user.coins?.balance || 0,
          bonusCoins: user.coins?.bonusBalance || 0,
          availableCoins: (user.coins?.balance || 0) + (user.coins?.bonusBalance || 0),
          totalEarned: user.coins?.totalEarned || 0,
          totalSpent: user.coins?.totalSpent || 0,
          lastUpdated: user.updatedAt
        }
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

// Get user's transaction history
router.get('/transactions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { limit = 50, page = 1, type } = req.query;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const filter: any = { userId };
    
    if (type) {
      filter.type = type;
    }
    
    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit as string));
    
    const total = await Transaction.countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        transactions: transactions.map(tx => ({
          id: tx._id,
          type: tx.type,
          amount: tx.amount,
          currency: tx.currency,
          description: tx.description,
          metadata: tx.metadata,
          status: tx.status,
          createdAt: tx.createdAt
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
    logger.error('Failed to get transaction history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transaction history'
    });
  }
});

// Add coins (earn)
router.post('/add', [
  body('amount').isInt({ min: 1 }).withMessage('Amount must be a positive integer'),
  body('type').isIn(Object.values(TransactionType)).withMessage('Invalid transaction type'),
  body('description').optional().isString().withMessage('Description must be a string')
], async (req: AuthenticatedRequest, res: Response) => {
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
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Update user coins
    const newBalance = (user.coins?.balance || 0) + amount;
    const newTotalEarned = (user.coins?.totalEarned || 0) + amount;
    
    await User.findByIdAndUpdate(userId, {
      $inc: {
        'coins.balance': amount,
        'coins.totalEarned': amount
      }
    });
    
    // Create transaction record
    const transaction = new Transaction({
      userId,
      type: type as string,
      amount: amount,
      currency: 'coins',
      status: 'completed',
      description: description || `Earned ${amount} coins`,
      metadata: {
        ...metadata,
        transactionType: 'earn'
      },
      netAmount: amount
    });
    
    await transaction.save();
    
    res.json({
      success: true,
      data: {
        transaction: {
          id: transaction._id,
          amount: transaction.amount,
          type: transaction.type,
          description: transaction.description,
          createdAt: transaction.createdAt
        },
        newBalance: newBalance
      }
    });
  } catch (error) {
    logger.error('Failed to add coins:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add coins'
    });
  }
});

// Spend coins
router.post('/spend', [
  body('amount').isInt({ min: 1 }).withMessage('Amount must be a positive integer'),
  body('type').isIn(Object.values(TransactionType)).withMessage('Invalid transaction type'),
  body('description').optional().isString().withMessage('Description must be a string')
], async (req: AuthenticatedRequest, res: Response) => {
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
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Check if user has enough coins
    const currentBalance = (user.coins?.balance || 0) + (user.coins?.bonusBalance || 0);
    if (currentBalance < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient coins',
        required: amount,
        available: currentBalance
      });
    }
    
    // Determine how to deduct coins (prefer bonus balance first)
    let bonusDeduction = 0;
    let balanceDeduction = 0;
    
    if (user.coins?.bonusBalance && user.coins.bonusBalance >= amount) {
      bonusDeduction = amount;
    } else if (user.coins?.bonusBalance && user.coins.bonusBalance > 0) {
      bonusDeduction = user.coins.bonusBalance;
      balanceDeduction = amount - bonusDeduction;
    } else {
      balanceDeduction = amount;
    }
    
    // Update user coins
    const updateQuery: any = {
      $inc: {
        'coins.totalSpent': amount
      }
    };
    
    if (bonusDeduction > 0) {
      updateQuery.$inc['coins.bonusBalance'] = -bonusDeduction;
    }
    if (balanceDeduction > 0) {
      updateQuery.$inc['coins.balance'] = -balanceDeduction;
    }
    
    await User.findByIdAndUpdate(userId, updateQuery);
    
    // Create transaction record
    const transaction = new Transaction({
      userId,
      type: type as string,
      amount: -amount, // Negative for spending
      currency: 'coins',
      status: 'completed',
      description: description || `Spent ${amount} coins`,
      metadata: {
        ...metadata,
        transactionType: 'spend',
        bonusDeduction,
        balanceDeduction
      },
      netAmount: -amount
    });
    
    await transaction.save();
    
    const newBalance = currentBalance - amount;
    
    res.json({
      success: true,
      data: {
        transaction: {
          id: transaction._id,
          amount: transaction.amount,
          type: transaction.type,
          description: transaction.description,
          createdAt: transaction.createdAt
        },
        newBalance: newBalance
      }
    });
  } catch (error) {
    logger.error('Failed to spend coins:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to spend coins'
    });
  }
});

// Transfer coins between users
router.post('/transfer', [
  body('recipientId').isMongoId().withMessage('Valid recipient ID is required'),
  body('amount').isInt({ min: 1 }).withMessage('Amount must be a positive integer'),
  body('description').optional().isString().withMessage('Description must be a string')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const userId = req.user?.userId;
    const { recipientId, amount, description } = req.body;
    
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
    
    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        error: 'Recipient not found'
      });
    }
    
    // Get sender
    const sender = await User.findById(userId);
    if (!sender) {
      return res.status(404).json({
        success: false,
        error: 'Sender not found'
      });
    }
    
    // Check if sender has enough coins
    const senderBalance = (sender.coins?.balance || 0) + (sender.coins?.bonusBalance || 0);
    if (senderBalance < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient coins for transfer',
        required: amount,
        available: senderBalance
      });
    }
    
    // Perform transfer using MongoDB transactions
    const session = await User.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Deduct from sender
        await User.findByIdAndUpdate(userId, {
          $inc: {
            'coins.balance': -amount,
            'coins.totalSpent': amount
          }
        }, { session });
        
        // Add to recipient
        await User.findByIdAndUpdate(recipientId, {
          $inc: {
            'coins.balance': amount,
            'coins.totalEarned': amount
          }
        }, { session });
        
        // Create transaction records
        const transferId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const senderTransaction = new Transaction({
          userId,
          type: TransactionType.TRANSFER,
          amount: -amount,
          currency: 'coins',
          status: 'completed',
          description: `Transferred ${amount} coins to ${recipient.username}`,
          metadata: {
            recipientId,
            transferId,
            transactionType: 'transfer_out'
          },
          netAmount: -amount
        });
        
        const recipientTransaction = new Transaction({
          userId: recipientId,
          type: TransactionType.TRANSFER,
          amount: amount,
          currency: 'coins',
          status: 'completed',
          description: `Received ${amount} coins from ${sender.username}`,
          metadata: {
            senderId: userId,
            transferId,
            transactionType: 'transfer_in'
          },
          netAmount: amount
        });
        
        await senderTransaction.save({ session });
        await recipientTransaction.save({ session });
      });
      
      const newBalance = senderBalance - amount;
      
      res.json({
        success: true,
        data: {
          transfer: {
            amount,
            recipientId,
            recipientUsername: recipient.username,
            description: description || `Transferred ${amount} coins`,
            timestamp: new Date()
          },
          newBalance: newBalance
        }
      });
    } finally {
      await session.endSession();
    }
  } catch (error) {
    logger.error('Failed to transfer coins:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to transfer coins'
    });
  }
});

// Get daily reward
router.post('/daily-reward', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    // Check if user already claimed today's reward
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayTransactions = await Transaction.find({
      userId,
      type: TransactionType.DAILY_REWARD,
      createdAt: {
        $gte: today,
        $lt: tomorrow
      }
    });
    
    if (todayTransactions.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Daily reward already claimed today',
        nextAvailable: tomorrow.toISOString()
      });
    }
    
    // Calculate daily reward amount (base amount + streak bonus)
    const baseReward = 50;
    const streakDays = Math.min(7, todayTransactions.length + 1); // Max 7 days streak
    const streakBonus = (streakDays - 1) * 10; // 10 coins per day of streak
    const totalReward = baseReward + streakBonus;
    
    // Add coins
    await User.findByIdAndUpdate(userId, {
      $inc: {
        'coins.balance': totalReward,
        'coins.totalEarned': totalReward
      }
    });
    
    // Create transaction record
    const transaction = new Transaction({
      userId,
      type: TransactionType.DAILY_REWARD,
      amount: totalReward,
      currency: 'coins',
      status: 'completed',
      description: `Daily reward (${streakDays} day streak)`,
      metadata: {
        streakDays,
        baseReward,
        streakBonus,
        transactionType: 'daily_reward'
      },
      netAmount: totalReward
    });
    
    await transaction.save();
    
    // Get updated balance
    const user = await User.findById(userId).select('coins');
    const newBalance = user?.coins?.balance || 0;
    
    res.json({
      success: true,
      data: {
        reward: {
          amount: totalReward,
          baseAmount: baseReward,
          streakBonus: streakBonus,
          streakDays: streakDays,
          description: `Daily reward (${streakDays} day streak)`
        },
        newBalance: newBalance
      }
    });
  } catch (error) {
    logger.error('Failed to claim daily reward:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to claim daily reward'
    });
  }
});

export default router;

import express from 'express';
import { Request, Response } from 'express';
import { logger } from '../config/logger';
import SecurityMiddleware, { SecurityLevel } from '../middleware/security';

const router = express.Router();
const securityMiddleware = SecurityMiddleware.getInstance();

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
  STREAMING = 'streaming'
}

// Coins transaction interface
interface CoinsTransaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number; // Positive for earning, negative for spending
  balance: number; // Balance after transaction
  description: string;
  metadata: {
    gameId?: string;
    sessionId?: string;
    achievementId?: string;
    purchaseId?: string;
    referralId?: string;
    streamId?: string;
    senderId?: string;
    recipientId?: string;
  };
  timestamp: Date;
  isProcessed: boolean;
}

// User coins balance interface
interface UserCoinsBalance {
  userId: string;
  totalCoins: number;
  bonusCoins: number;
  lockedCoins: number; // Coins that are locked (e.g., pending transactions)
  totalEarned: number;
  totalSpent: number;
  lastUpdated: Date;
}

// Mock storage for coins data
const userBalances: Map<string, UserCoinsBalance> = new Map();
const transactions: Map<string, CoinsTransaction> = new Map();

// Get user's coins balance
router.get('/balance', securityMiddleware.validateToken, (req: Request, res: Response) => {
  try {
    const userId = req.securityContext?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    let balance = userBalances.get(userId);
    
    if (!balance) {
      // Initialize new user with starting coins
      balance = {
        userId,
        totalCoins: 100, // Starting coins
        bonusCoins: 0,
        lockedCoins: 0,
        totalEarned: 100,
        totalSpent: 0,
        lastUpdated: new Date()
      };
      userBalances.set(userId, balance);
    }
    
    res.json({
      success: true,
      balance: {
        totalCoins: balance.totalCoins,
        bonusCoins: balance.bonusCoins,
        availableCoins: balance.totalCoins - balance.lockedCoins,
        totalEarned: balance.totalEarned,
        totalSpent: balance.totalSpent,
        lastUpdated: balance.lastUpdated
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
router.get('/transactions', securityMiddleware.validateToken, (req: Request, res: Response) => {
  try {
    const userId = req.securityContext?.userId;
    const { limit = 50, offset = 0, type } = req.query;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    let userTransactions = Array.from(transactions.values())
      .filter(tx => tx.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    if (type) {
      userTransactions = userTransactions.filter(tx => tx.type === type);
    }
    
    const paginatedTransactions = userTransactions
      .slice(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string))
      .map(tx => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        balance: tx.balance,
        description: tx.description,
        metadata: tx.metadata,
        timestamp: tx.timestamp,
        isProcessed: tx.isProcessed
      }));
    
    res.json({
      success: true,
      transactions: paginatedTransactions,
      total: userTransactions.length,
      hasMore: userTransactions.length > parseInt(offset as string) + parseInt(limit as string)
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
router.post('/add', securityMiddleware.validateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.securityContext?.userId;
    const { amount, type, description, metadata = {} } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }
    
    if (!type || !Object.values(TransactionType).includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction type'
      });
    }
    
    // Get current balance
    let balance = userBalances.get(userId);
    if (!balance) {
      balance = {
        userId,
        totalCoins: 0,
        bonusCoins: 0,
        lockedCoins: 0,
        totalEarned: 0,
        totalSpent: 0,
        lastUpdated: new Date()
      };
    }
    
    // Create transaction
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const transaction: CoinsTransaction = {
      id: transactionId,
      userId,
      type: type as TransactionType,
      amount: Math.abs(amount), // Ensure positive
      balance: balance.totalCoins + Math.abs(amount),
      description: description || `Earned ${Math.abs(amount)} coins`,
      metadata,
      timestamp: new Date(),
      isProcessed: true
    };
    
    // Update balance
    balance.totalCoins += Math.abs(amount);
    balance.totalEarned += Math.abs(amount);
    balance.lastUpdated = new Date();
    
    // Store transaction and balance
    transactions.set(transactionId, transaction);
    userBalances.set(userId, balance);
    
    res.json({
      success: true,
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        balance: transaction.balance,
        description: transaction.description,
        timestamp: transaction.timestamp
      },
      newBalance: balance.totalCoins
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
router.post('/spend', securityMiddleware.validateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.securityContext?.userId;
    const { amount, type, description, metadata = {} } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid amount'
      });
    }
    
    if (!type || !Object.values(TransactionType).includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid transaction type'
      });
    }
    
    // Get current balance
    let balance = userBalances.get(userId);
    if (!balance) {
      balance = {
        userId,
        totalCoins: 0,
        bonusCoins: 0,
        lockedCoins: 0,
        totalEarned: 0,
        totalSpent: 0,
        lastUpdated: new Date()
      };
    }
    
    // Check if user has enough coins
    if (balance.totalCoins < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient coins',
        required: amount,
        available: balance.totalCoins
      });
    }
    
    // Create transaction
    const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const transaction: CoinsTransaction = {
      id: transactionId,
      userId,
      type: type as TransactionType,
      amount: -Math.abs(amount), // Negative for spending
      balance: balance.totalCoins - Math.abs(amount),
      description: description || `Spent ${Math.abs(amount)} coins`,
      metadata,
      timestamp: new Date(),
      isProcessed: true
    };
    
    // Update balance
    balance.totalCoins -= Math.abs(amount);
    balance.totalSpent += Math.abs(amount);
    balance.lastUpdated = new Date();
    
    // Store transaction and balance
    transactions.set(transactionId, transaction);
    userBalances.set(userId, balance);
    
    res.json({
      success: true,
      transaction: {
        id: transaction.id,
        amount: transaction.amount,
        balance: transaction.balance,
        description: transaction.description,
        timestamp: transaction.timestamp
      },
      newBalance: balance.totalCoins
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
router.post('/transfer', securityMiddleware.validateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.securityContext?.userId;
    const { recipientId, amount, description } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    if (!recipientId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid recipient or amount'
      });
    }
    
    if (userId === recipientId) {
      return res.status(400).json({
        success: false,
        error: 'Cannot transfer coins to yourself'
      });
    }
    
    // Get sender balance
    const senderBalance = userBalances.get(userId);
    if (!senderBalance) {
      return res.status(400).json({
        success: false,
        error: 'Sender balance not found'
      });
    }
    
    // Check if sender has enough coins
    if (senderBalance.totalCoins < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient coins for transfer',
        required: amount,
        available: senderBalance.totalCoins
      });
    }
    
    // Get or create recipient balance
    let recipientBalance = userBalances.get(recipientId);
    if (!recipientBalance) {
      recipientBalance = {
        userId: recipientId,
        totalCoins: 0,
        bonusCoins: 0,
        lockedCoins: 0,
        totalEarned: 0,
        totalSpent: 0,
        lastUpdated: new Date()
      };
    }
    
    // Create transactions
    const transferId = `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Sender transaction (negative)
    const senderTransaction: CoinsTransaction = {
      id: `${transferId}_sender`,
      userId,
      type: TransactionType.TRANSFER,
      amount: -amount,
      balance: senderBalance.totalCoins - amount,
      description: `Transferred ${amount} coins to user ${recipientId}`,
      metadata: { recipientId },
      timestamp: new Date(),
      isProcessed: true
    };
    
    // Recipient transaction (positive)
    const recipientTransaction: CoinsTransaction = {
      id: `${transferId}_recipient`,
      userId: recipientId,
      type: TransactionType.TRANSFER,
      amount: amount,
      balance: recipientBalance.totalCoins + amount,
      description: `Received ${amount} coins from user ${userId}`,
      metadata: { senderId: userId },
      timestamp: new Date(),
      isProcessed: true
    };
    
    // Update balances
    senderBalance.totalCoins -= amount;
    senderBalance.totalSpent += amount;
    senderBalance.lastUpdated = new Date();
    
    recipientBalance.totalCoins += amount;
    recipientBalance.totalEarned += amount;
    recipientBalance.lastUpdated = new Date();
    
    // Store transactions and balances
    transactions.set(senderTransaction.id, senderTransaction);
    transactions.set(recipientTransaction.id, recipientTransaction);
    userBalances.set(userId, senderBalance);
    userBalances.set(recipientId, recipientBalance);
    
    res.json({
      success: true,
      transfer: {
        id: transferId,
        amount,
        recipientId,
        description: description || `Transferred ${amount} coins`,
        timestamp: new Date()
      },
      newBalance: senderBalance.totalCoins
    });
  } catch (error) {
    logger.error('Failed to transfer coins:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to transfer coins'
    });
  }
});

// Get daily reward
router.post('/daily-reward', securityMiddleware.validateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.securityContext?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    // Check if user already claimed today's reward
    const today = new Date().toDateString();
    const todayTransactions = Array.from(transactions.values())
      .filter(tx => 
        tx.userId === userId && 
        tx.type === TransactionType.DAILY_REWARD &&
        tx.timestamp.toDateString() === today
      );
    
    if (todayTransactions.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Daily reward already claimed today',
        nextAvailable: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    // Calculate daily reward amount (base amount + streak bonus)
    const baseReward = 50;
    const streakDays = Math.min(7, todayTransactions.length + 1); // Max 7 days streak
    const streakBonus = (streakDays - 1) * 10; // 10 coins per day of streak
    const totalReward = baseReward + streakBonus;
    
    // Add coins
    const addResult = await addCoins(userId, totalReward, TransactionType.DAILY_REWARD, 
      `Daily reward (${streakDays} day streak)`, { streakDays });
    
    res.json({
      success: true,
      reward: {
        amount: totalReward,
        baseAmount: baseReward,
        streakBonus: streakBonus,
        streakDays: streakDays,
        description: `Daily reward (${streakDays} day streak)`
      },
      newBalance: addResult.newBalance
    });
  } catch (error) {
    logger.error('Failed to claim daily reward:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to claim daily reward'
    });
  }
});

// Helper function to add coins
async function addCoins(userId: string, amount: number, type: TransactionType, description: string, metadata: any = {}) {
  let balance = userBalances.get(userId);
  if (!balance) {
    balance = {
      userId,
      totalCoins: 0,
      bonusCoins: 0,
      lockedCoins: 0,
      totalEarned: 0,
      totalSpent: 0,
      lastUpdated: new Date()
    };
  }
  
  const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const transaction: CoinsTransaction = {
    id: transactionId,
    userId,
    type,
    amount: Math.abs(amount),
    balance: balance.totalCoins + Math.abs(amount),
    description,
    metadata,
    timestamp: new Date(),
    isProcessed: true
  };
  
  balance.totalCoins += Math.abs(amount);
  balance.totalEarned += Math.abs(amount);
  balance.lastUpdated = new Date();
  
  transactions.set(transactionId, transaction);
  userBalances.set(userId, balance);
  
  return { newBalance: balance.totalCoins, transaction };
}

export default router;

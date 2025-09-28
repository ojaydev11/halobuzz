import { logger } from '../config/logger';
import { getCache, setCache } from '../config/redis';
import mongoose from 'mongoose';

// Gift transaction interfaces
interface GiftTransaction {
  id: string;
  senderId: string;
  receiverId: string;
  streamId: string;
  giftId: string;
  giftName: string;
  quantity: number;
  coinCost: number;
  timestamp: Date;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  metadata: {
    transactionHash?: string;
    errorMessage?: string;
    refundReason?: string;
  };
}

interface GiftInventory {
  giftId: string;
  giftName: string;
  coinCost: number;
  animation: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  isActive: boolean;
}

interface UserBalance {
  userId: string;
  coins: number;
  lastUpdated: Date;
  transactionCount: number;
}

class GiftTransactionService {
  private giftInventory: Map<string, GiftInventory> = new Map();
  private activeTransactions: Map<string, GiftTransaction> = new Map();
  private userBalances: Map<string, UserBalance> = new Map();

  constructor() {
    this.initializeGiftInventory();
    this.initializeCleanup();
  }

  // Initialize gift inventory
  private initializeGiftInventory(): void {
    const gifts: GiftInventory[] = [
      {
        giftId: 'rose',
        giftName: 'Rose',
        coinCost: 10,
        animation: 'rose_animation',
        rarity: 'common',
        isActive: true
      },
      {
        giftId: 'heart',
        giftName: 'Heart',
        coinCost: 50,
        animation: 'heart_animation',
        rarity: 'common',
        isActive: true
      },
      {
        giftId: 'crown',
        giftName: 'Crown',
        coinCost: 200,
        animation: 'crown_animation',
        rarity: 'rare',
        isActive: true
      },
      {
        giftId: 'diamond',
        giftName: 'Diamond',
        coinCost: 500,
        animation: 'diamond_animation',
        rarity: 'epic',
        isActive: true
      },
      {
        giftId: 'halo',
        giftName: 'Halo',
        coinCost: 1000,
        animation: 'halo_animation',
        rarity: 'legendary',
        isActive: true
      }
    ];

    gifts.forEach(gift => {
      this.giftInventory.set(gift.giftId, gift);
    });
  }

  // Process gift transaction with atomic operations
  async processGiftTransaction(
    senderId: string,
    receiverId: string,
    streamId: string,
    giftId: string,
    quantity: number
  ): Promise<{
    success: boolean;
    transactionId?: string;
    error?: string;
    giftData?: any;
  }> {
    const session = await mongoose.startSession();
    
    try {
      await session.withTransaction(async () => {
        // Validate gift exists and is active
        const gift = this.giftInventory.get(giftId);
        if (!gift || !gift.isActive) {
          throw new Error('Invalid or inactive gift');
        }

        // Calculate total cost
        const totalCost = gift.coinCost * quantity;
        
        // Check sender balance
        const senderBalance = await this.getUserBalance(senderId);
        if (senderBalance.coins < totalCost) {
          throw new Error('Insufficient coins');
        }

        // Create transaction
        const transaction: GiftTransaction = {
          id: this.generateTransactionId(),
          senderId,
          receiverId,
          streamId,
          giftId,
          giftName: gift.giftName,
          quantity,
          coinCost: totalCost,
          timestamp: new Date(),
          status: 'pending',
          metadata: {}
        };

        // Deduct coins from sender
        await this.deductCoins(senderId, totalCost, transaction.id);
        
        // Add coins to receiver (streamer gets 70% of gift value)
        const receiverCoins = Math.floor(totalCost * 0.7);
        await this.addCoins(receiverId, receiverCoins, transaction.id);

        // Mark transaction as completed
        transaction.status = 'completed';
        transaction.metadata.transactionHash = this.generateTransactionHash(transaction);
        
        // Store transaction
        await this.storeTransaction(transaction);
        
        // Cache transaction for real-time updates
        await setCache(`transaction:${transaction.id}`, transaction, 3600);
        
        logger.info(`Gift transaction completed: ${transaction.id} - ${gift.giftName} x${quantity}`);
        
        return {
          success: true,
          transactionId: transaction.id,
          giftData: {
            giftId: gift.giftId,
            giftName: gift.giftName,
            quantity,
            animation: gift.animation,
            rarity: gift.rarity,
            coinCost: totalCost,
            transactionId: transaction.id
          }
        };
      });

      return { success: true };
      
    } catch (error) {
      logger.error('Gift transaction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction failed'
      };
    } finally {
      await session.endSession();
    }
  }

  // Get user balance
  async getUserBalance(userId: string): Promise<UserBalance> {
    try {
      // Check cache first
      const cachedBalance = await getCache(`balance:${userId}`);
      if (cachedBalance) {
        return cachedBalance;
      }

      // Default balance if not found
      const defaultBalance: UserBalance = {
        userId,
        coins: 0,
        lastUpdated: new Date(),
        transactionCount: 0
      };

      // In production, this would fetch from database
      await setCache(`balance:${userId}`, defaultBalance, 300); // 5 minutes TTL
      
      return defaultBalance;
      
    } catch (error) {
      logger.error('Error getting user balance:', error);
      return {
        userId,
        coins: 0,
        lastUpdated: new Date(),
        transactionCount: 0
      };
    }
  }

  // Deduct coins from user balance
  private async deductCoins(userId: string, amount: number, transactionId: string): Promise<void> {
    try {
      const balance = await this.getUserBalance(userId);
      
      if (balance.coins < amount) {
        throw new Error('Insufficient coins');
      }
      
      balance.coins -= amount;
      balance.lastUpdated = new Date();
      balance.transactionCount++;
      
      // Update cache
      await setCache(`balance:${userId}`, balance, 300);
      
      // Log transaction
      logger.info(`Coins deducted: ${amount} from user ${userId} (txn: ${transactionId})`);
      
    } catch (error) {
      logger.error('Error deducting coins:', error);
      throw error;
    }
  }

  // Add coins to user balance
  private async addCoins(userId: string, amount: number, transactionId: string): Promise<void> {
    try {
      const balance = await this.getUserBalance(userId);
      
      balance.coins += amount;
      balance.lastUpdated = new Date();
      balance.transactionCount++;
      
      // Update cache
      await setCache(`balance:${userId}`, balance, 300);
      
      // Log transaction
      logger.info(`Coins added: ${amount} to user ${userId} (txn: ${transactionId})`);
      
    } catch (error) {
      logger.error('Error adding coins:', error);
      throw error;
    }
  }

  // Store transaction
  private async storeTransaction(transaction: GiftTransaction): Promise<void> {
    try {
      this.activeTransactions.set(transaction.id, transaction);
      
      // In production, this would save to database
      await setCache(`transaction:${transaction.id}`, transaction, 86400); // 24 hours TTL
      
    } catch (error) {
      logger.error('Error storing transaction:', error);
      throw error;
    }
  }

  // Get transaction by ID
  async getTransaction(transactionId: string): Promise<GiftTransaction | null> {
    try {
      // Check cache first
      const cachedTransaction = await getCache(`transaction:${transactionId}`);
      if (cachedTransaction) {
        return cachedTransaction;
      }

      // Check active transactions
      return this.activeTransactions.get(transactionId) || null;
      
    } catch (error) {
      logger.error('Error getting transaction:', error);
      return null;
    }
  }

  // Refund transaction
  async refundTransaction(transactionId: string, reason: string): Promise<boolean> {
    try {
      const transaction = await this.getTransaction(transactionId);
      if (!transaction || transaction.status !== 'completed') {
        return false;
      }

      const session = await mongoose.startSession();
      
      await session.withTransaction(async () => {
        // Refund coins to sender
        await this.addCoins(transaction.senderId, transaction.coinCost, transactionId);
        
        // Deduct coins from receiver
        const receiverCoins = Math.floor(transaction.coinCost * 0.7);
        await this.deductCoins(transaction.receiverId, receiverCoins, transactionId);
        
        // Update transaction status
        transaction.status = 'refunded';
        transaction.metadata.refundReason = reason;
        
        // Store updated transaction
        await this.storeTransaction(transaction);
        
        logger.info(`Transaction refunded: ${transactionId} - Reason: ${reason}`);
      });

      await session.endSession();
      return true;
      
    } catch (error) {
      logger.error('Error refunding transaction:', error);
      return false;
    }
  }

  // Get gift inventory
  async getGiftInventory(): Promise<GiftInventory[]> {
    return Array.from(this.giftInventory.values()).filter(gift => gift.isActive);
  }

  // Get user transaction history
  async getUserTransactionHistory(userId: string, limit: number = 50): Promise<GiftTransaction[]> {
    try {
      // In production, this would query the database
      const transactions = Array.from(this.activeTransactions.values())
        .filter(txn => txn.senderId === userId || txn.receiverId === userId)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
      
      return transactions;
      
    } catch (error) {
      logger.error('Error getting user transaction history:', error);
      return [];
    }
  }

  // Generate transaction ID
  private generateTransactionId(): string {
    return `gift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Generate transaction hash
  private generateTransactionHash(transaction: GiftTransaction): string {
    const data = `${transaction.id}${transaction.senderId}${transaction.receiverId}${transaction.coinCost}${transaction.timestamp.getTime()}`;
    // Simple hash function - in production, use crypto.createHash
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  // Initialize cleanup process
  private initializeCleanup(): void {
    // Clean up old transactions every hour
    setInterval(async () => {
      try {
        await this.cleanupOldTransactions();
      } catch (error) {
        logger.error('Error in transaction cleanup:', error);
      }
    }, 3600000); // 1 hour
  }

  // Clean up old transactions
  private async cleanupOldTransactions(): Promise<void> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      for (const [id, transaction] of this.activeTransactions) {
        if (transaction.timestamp < oneDayAgo) {
          this.activeTransactions.delete(id);
        }
      }
      
      logger.info('Transaction cleanup completed');
    } catch (error) {
      logger.error('Error in cleanup:', error);
    }
  }

  // Get statistics
  async getStatistics(): Promise<{
    totalTransactions: number;
    totalCoinsTransferred: number;
    activeGifts: number;
    averageTransactionValue: number;
  }> {
    try {
      const transactions = Array.from(this.activeTransactions.values());
      const totalCoinsTransferred = transactions.reduce((sum, txn) => sum + txn.coinCost, 0);
      const averageTransactionValue = transactions.length > 0 ? totalCoinsTransferred / transactions.length : 0;
      
      return {
        totalTransactions: transactions.length,
        totalCoinsTransferred,
        activeGifts: Array.from(this.giftInventory.values()).filter(gift => gift.isActive).length,
        averageTransactionValue
      };
    } catch (error) {
      logger.error('Error getting statistics:', error);
      return {
        totalTransactions: 0,
        totalCoinsTransferred: 0,
        activeGifts: 0,
        averageTransactionValue: 0
      };
    }
  }
}

// Export singleton instance
export const giftTransactionService = new GiftTransactionService();
export default giftTransactionService;

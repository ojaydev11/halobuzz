import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { TransactionService } from '../../services/TransactionService';
import { WalletService } from '../../services/WalletService';

describe('Ledger Invariants', () => {
  let transactionService: TransactionService;
  let walletService: WalletService;

  beforeEach(() => {
    transactionService = new TransactionService();
    walletService = new WalletService();
  });

  describe('Double-Entry Ledger', () => {
    it('should maintain zero-sum invariant for all transactions', async () => {
      // Given: A set of transactions
      const userId1 = 'user1';
      const userId2 = 'user2';
      
      // When: Multiple transactions occur
      await transactionService.transfer(userId1, userId2, 100);
      await transactionService.transfer(userId2, userId1, 50);
      
      // Then: Sum of all debits should equal sum of all credits
      const allTransactions = await transactionService.getAllTransactions();
      const totalDebits = allTransactions
        .filter(t => t.type === 'debit')
        .reduce((sum, t) => sum + t.amount, 0);
      const totalCredits = allTransactions
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + t.amount, 0);
      
      expect(totalDebits).toBe(totalCredits);
    });

    it('should create matching debit and credit entries for game stake', async () => {
      const userId = 'testUser';
      const stakeAmount = 100;
      
      // Stake coins (debit user, credit game pool)
      const result = await transactionService.stakeCoins(userId, stakeAmount, 'coin-flip');
      
      expect(result.transactions).toHaveLength(2);
      
      const debit = result.transactions.find(t => t.type === 'debit');
      const credit = result.transactions.find(t => t.type === 'credit');
      
      expect(debit?.amount).toBe(stakeAmount);
      expect(credit?.amount).toBe(stakeAmount);
      expect(debit?.userId).toBe(userId);
      expect(credit?.category).toBe('game_pool');
    });

    it('should create matching entries for rewards', async () => {
      const userId = 'testUser';
      const rewardAmount = 200;
      
      // Reward coins (debit game pool, credit user)
      const result = await transactionService.rewardCoins(userId, rewardAmount, 'coin-flip');
      
      expect(result.transactions).toHaveLength(2);
      
      const debit = result.transactions.find(t => t.type === 'debit');
      const credit = result.transactions.find(t => t.type === 'credit');
      
      expect(debit?.amount).toBe(rewardAmount);
      expect(credit?.amount).toBe(rewardAmount);
      expect(debit?.category).toBe('game_pool');
      expect(credit?.userId).toBe(userId);
    });

    it('should never allow negative balances', async () => {
      const userId = 'poorUser';
      const initialBalance = 50;
      const stakeAmount = 100;
      
      // Set initial balance
      await walletService.setBalance(userId, initialBalance);
      
      // Attempt to stake more than balance
      await expect(
        transactionService.stakeCoins(userId, stakeAmount, 'game')
      ).rejects.toThrow('Insufficient balance');
      
      // Balance should remain unchanged
      const balance = await walletService.getBalance(userId);
      expect(balance).toBe(initialBalance);
    });

    it('should maintain balance consistency across concurrent transactions', async () => {
      const userId = 'concurrentUser';
      const initialBalance = 1000;
      
      await walletService.setBalance(userId, initialBalance);
      
      // Simulate concurrent stake operations
      const promises = Array.from({ length: 10 }, (_, i) => 
        transactionService.stakeCoins(userId, 50, `game-${i}`)
      );
      
      await Promise.all(promises);
      
      const finalBalance = await walletService.getBalance(userId);
      expect(finalBalance).toBe(initialBalance - (50 * 10));
    });

    it('should track transaction history correctly', async () => {
      const userId = 'historyUser';
      
      await transactionService.stakeCoins(userId, 100, 'game1');
      await transactionService.rewardCoins(userId, 200, 'game1');
      await transactionService.stakeCoins(userId, 50, 'game2');
      
      const history = await transactionService.getUserTransactions(userId);
      
      expect(history).toHaveLength(6); // 3 operations × 2 entries each
      expect(history.filter(t => t.type === 'debit')).toHaveLength(3);
      expect(history.filter(t => t.type === 'credit')).toHaveLength(3);
    });
  });

  describe('Game Economy', () => {
    it('should correctly calculate net game pool balance', async () => {
      // Multiple users stake
      await transactionService.stakeCoins('user1', 100, 'game1');
      await transactionService.stakeCoins('user2', 200, 'game1');
      await transactionService.stakeCoins('user3', 150, 'game1');
      
      // One user wins
      await transactionService.rewardCoins('user1', 450, 'game1');
      
      // Game pool should be zero (all staked, all paid out)
      const poolBalance = await transactionService.getGamePoolBalance();
      expect(poolBalance).toBe(0);
    });

    it('should handle tournament prize distribution', async () => {
      const entryFee = 100;
      const players = ['p1', 'p2', 'p3', 'p4'];
      
      // All players stake
      for (const player of players) {
        await transactionService.stakeCoins(player, entryFee, 'tournament');
      }
      
      const totalPool = entryFee * players.length; // 400
      
      // Distribute prizes (1st: 50%, 2nd: 30%, 3rd: 20%)
      await transactionService.rewardCoins('p1', totalPool * 0.5, 'tournament');
      await transactionService.rewardCoins('p2', totalPool * 0.3, 'tournament');
      await transactionService.rewardCoins('p3', totalPool * 0.2, 'tournament');
      
      // All debits should equal all credits
      const transactions = await transactionService.getAllTransactions();
      const totalIn = transactions
        .filter(t => t.type === 'credit' && t.category === 'game_pool')
        .reduce((sum, t) => sum + t.amount, 0);
      const totalOut = transactions
        .filter(t => t.type === 'debit' && t.category === 'game_pool')
        .reduce((sum, t) => sum + t.amount, 0);
      
      expect(totalIn).toBe(totalOut);
    });

    it('should apply boost multipliers correctly', async () => {
      const userId = 'boostUser';
      const baseReward = 100;
      const boostMultiplier = 2;
      
      // Apply boost and reward
      const result = await transactionService.rewardCoins(
        userId,
        baseReward * boostMultiplier,
        'game',
        { boost: true, multiplier: boostMultiplier }
      );
      
      expect(result.amount).toBe(200);
      expect(result.metadata?.boost).toBe(true);
      expect(result.metadata?.multiplier).toBe(boostMultiplier);
    });
  });

  describe('Audit Trail', () => {
    it('should record complete transaction metadata', async () => {
      const userId = 'auditUser';
      const sessionId = 'session-123';
      const gameId = 'coin-flip';
      
      const result = await transactionService.stakeCoins(
        userId,
        100,
        gameId,
        { sessionId, timestamp: Date.now() }
      );
      
      expect(result.metadata?.sessionId).toBe(sessionId);
      expect(result.metadata?.gameId).toBe(gameId);
      expect(result.metadata?.timestamp).toBeDefined();
    });

    it('should allow querying transactions by game', async () => {
      await transactionService.stakeCoins('u1', 100, 'game-A');
      await transactionService.stakeCoins('u2', 200, 'game-B');
      await transactionService.stakeCoins('u3', 150, 'game-A');
      
      const gameATransactions = await transactionService.getTransactionsByGame('game-A');
      
      expect(gameATransactions).toHaveLength(4); // 2 stakes × 2 entries
      expect(gameATransactions.every(t => t.metadata?.gameId === 'game-A')).toBe(true);
    });

    it('should support transaction rollback on error', async () => {
      const userId = 'rollbackUser';
      const initialBalance = 500;
      
      await walletService.setBalance(userId, initialBalance);
      
      // Simulate transaction that fails mid-process
      try {
        await transactionService.complexTransaction(userId, async (txn) => {
          await txn.stakeCoins(100);
          await txn.stakeCoins(200);
          throw new Error('Simulated failure');
        });
      } catch (error) {
        // Expected error
      }
      
      // Balance should be unchanged (rollback successful)
      const balance = await walletService.getBalance(userId);
      expect(balance).toBe(initialBalance);
    });
  });
});


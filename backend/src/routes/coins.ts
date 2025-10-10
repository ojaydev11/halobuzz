/**
 * Coins/Economy Routes
 * Handles coin staking, rewards, boosts, and transactions
 */

import express, { Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth';
import { globalLimiter } from '@/middleware/security';
import { User } from '@/models/User';
import { Transaction } from '@/models/Transaction';
import { CoinTransaction } from '@/models/CoinTransaction';
import { logger } from '@/config/logger';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * POST /api/v1/coins/stake
 * Stake coins for game entry
 */
router.post(
  '/stake',
  authMiddleware,
  globalLimiter,
  [
    body('amount').isInt({ min: 1, max: 1000000 }),
    body('gameId').isString().notEmpty(),
    body('sessionId').optional().isString(),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const { amount, gameId, sessionId } = req.body;

      // Get user and check balance
      const user = await User.findById(userId);
      if (!user || !user.coins || user.coins.balance < amount) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient balance',
        });
      }

      // Deduct amount from balance
      const newBalance = user.coins.balance - amount;
      await User.findByIdAndUpdate(userId, {
        $set: { 'coins.balance': newBalance },
        $inc: { 'coins.totalSpent': amount },
      });

      // Create transaction record
      const transactionId = uuidv4();
      await Transaction.create({
        userId,
        type: 'game_stake',
        amount: -amount,
        currency: 'coins',
        status: 'completed',
        description: `Staked ${amount} coins for ${gameId}`,
        metadata: {
          gameId,
          sessionId: sessionId || uuidv4(),
          transactionId,
        },
      });

      // Create coin transaction for ledger
      await CoinTransaction.create({
        userId,
        type: 'stake',
        amount: -amount,
        gameId,
        sessionId: sessionId || uuidv4(),
        status: 'completed',
        metadata: {
          transactionId,
        },
      });

      logger.info(`User ${userId} staked ${amount} coins for ${gameId}`);

      res.json({
        success: true,
        data: {
          newBalance,
          transactionId,
          stakedAmount: amount,
        },
      });
    } catch (error) {
      logger.error('Stake coins error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to stake coins',
      });
    }
  }
);

/**
 * POST /api/v1/coins/reward
 * Reward coins after game completion
 */
router.post(
  '/reward',
  authMiddleware,
  globalLimiter,
  [
    body('amount').isInt({ min: 0 }),
    body('gameId').isString().notEmpty(),
    body('sessionId').isString().notEmpty(),
    body('metadata').optional().isObject(),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const { amount, gameId, sessionId, metadata } = req.body;

      if (amount === 0) {
        // Loss - no reward
        return res.json({
          success: true,
          data: {
            newBalance: (await User.findById(userId))?.coins?.balance || 0,
            rewardAmount: 0,
            transactionId: uuidv4(),
          },
        });
      }

      // Get user
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      // Add reward to balance
      const newBalance = (user.coins?.balance || 0) + amount;
      await User.findByIdAndUpdate(userId, {
        $set: { 'coins.balance': newBalance },
        $inc: { 'coins.totalEarned': amount },
      });

      // Create transaction record
      const transactionId = uuidv4();
      await Transaction.create({
        userId,
        type: 'game_reward',
        amount: amount,
        currency: 'coins',
        status: 'completed',
        description: `Rewarded ${amount} coins from ${gameId}`,
        metadata: {
          gameId,
          sessionId,
          transactionId,
          ...metadata,
        },
      });

      // Create coin transaction for ledger
      await CoinTransaction.create({
        userId,
        type: 'reward',
        amount: amount,
        gameId,
        sessionId,
        status: 'completed',
        metadata: {
          transactionId,
          ...metadata,
        },
      });

      logger.info(`User ${userId} rewarded ${amount} coins from ${gameId}`);

      res.json({
        success: true,
        data: {
          newBalance,
          rewardAmount: amount,
          transactionId,
        },
      });
    } catch (error) {
      logger.error('Reward coins error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reward coins',
      });
    }
  }
);

/**
 * GET /api/v1/coins/boost-status
 * Get user's active coin boost status
 */
router.get(
  '/boost-status',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const user = await User.findById(userId).lean();
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      // Check for active boosts
      const activeBoost = user.activeBoosts?.find((boost: any) => {
        return boost.expiresAt && new Date(boost.expiresAt) > new Date();
      });

      if (activeBoost) {
        res.json({
          success: true,
          data: {
            active: true,
            multiplier: activeBoost.multiplier || 1,
            expiresAt: activeBoost.expiresAt,
            boostType: activeBoost.type,
          },
        });
      } else {
        res.json({
          success: true,
          data: {
            active: false,
            multiplier: 1,
          },
        });
      }
    } catch (error) {
      logger.error('Get boost status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get boost status',
      });
    }
  }
);

/**
 * GET /api/v1/coins/transactions
 * Get user's coin transaction history
 */
router.get(
  '/transactions',
  authMiddleware,
  [query('limit').optional().isInt({ min: 1, max: 100 })],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      const { limit = 20 } = req.query;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const transactions = await Transaction.find({
        userId,
        currency: 'coins',
      })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit as string))
        .lean();

      res.json({
        success: true,
        data: { transactions },
      });
    } catch (error) {
      logger.error('Get transactions error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get transactions',
      });
    }
  }
);

/**
 * POST /api/v1/coins/purchase
 * Purchase coins via IAP
 */
router.post(
  '/purchase',
  authMiddleware,
  globalLimiter,
  [
    body('packageId').isString().notEmpty(),
    body('receipt').isString().notEmpty(),
    body('platform').optional().isIn(['ios', 'android']),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const { packageId, receipt, platform = 'android' } = req.body;

      // Package amounts
      const packages: Record<string, number> = {
        'coins_100': 100,
        'coins_500': 500,
        'coins_1000': 1000,
        'coins_5000': 5000,
        'coins_10000': 10000,
      };

      const coinAmount = packages[packageId];
      if (!coinAmount) {
        return res.status(400).json({
          success: false,
          error: 'Invalid package ID',
        });
      }

      // TODO: Verify receipt with Apple/Google
      // For now, trust the receipt (in production, validate it)

      // Add coins to user balance
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      const newBalance = (user.coins?.balance || 0) + coinAmount;
      await User.findByIdAndUpdate(userId, {
        $set: { 'coins.balance': newBalance },
        $inc: { 'coins.totalPurchased': coinAmount },
      });

      // Create transaction
      const transactionId = uuidv4();
      await Transaction.create({
        userId,
        type: 'coin_purchase',
        amount: coinAmount,
        currency: 'coins',
        status: 'completed',
        description: `Purchased ${coinAmount} coins (${packageId})`,
        metadata: {
          packageId,
          platform,
          receipt,
          transactionId,
        },
      });

      logger.info(`User ${userId} purchased ${coinAmount} coins (${packageId})`);

      res.json({
        success: true,
        data: {
          newBalance,
          purchasedAmount: coinAmount,
          transactionId,
        },
      });
    } catch (error) {
      logger.error('Purchase coins error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to purchase coins',
      });
    }
  }
);

/**
 * GET /api/v1/coins/balance
 * Get user's current coin balance
 */
router.get(
  '/balance',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const user = await User.findById(userId).lean();
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      res.json({
        success: true,
        data: {
          balance: user.coins?.balance || 0,
          totalEarned: user.coins?.totalEarned || 0,
          totalSpent: user.coins?.totalSpent || 0,
          totalPurchased: user.coins?.totalPurchased || 0,
        },
      });
    } catch (error) {
      logger.error('Get balance error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get balance',
      });
    }
  }
);

export default router;

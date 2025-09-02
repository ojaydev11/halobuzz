import { Router, Request, Response } from 'express';
import { CreatorCoinService } from '@/services/blockchain/CreatorCoinService';
import { authenticateToken } from '@/middleware/auth';
import { rateLimiter } from '@/middleware/rateLimiter';
import { logger } from '@/config/logger';

const router = Router();
const creatorCoinService = CreatorCoinService.getInstance();

// Apply authentication and rate limiting to all routes
router.use(authenticateToken);
router.use(rateLimiter);

/**
 * @route POST /api/v1/blockchain/creator-coin
 * @desc Create a new creator coin
 */
router.post('/creator-coin', async (req: Request, res: Response) => {
  try {
    const { symbol, name, description, totalSupply, network, metadata } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!symbol || !name || !description || !totalSupply || !network) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const creatorCoin = await creatorCoinService.createCreatorCoin(
      userId,
      symbol,
      name,
      description,
      totalSupply,
      network,
      metadata
    );

    res.status(201).json({
      success: true,
      data: creatorCoin
    });
  } catch (error) {
    logger.error('Error creating creator coin', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to create creator coin' });
  }
});

/**
 * @route POST /api/v1/blockchain/:coinId/buy
 * @desc Buy creator coins
 */
router.post('/:coinId/buy', async (req: Request, res: Response) => {
  try {
    const { coinId } = req.params;
    const { amount, maxPrice } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const transaction = await creatorCoinService.buyCoins(
      userId,
      coinId,
      amount,
      maxPrice
    );

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    logger.error('Error buying creator coins', { error, coinId: req.params.coinId, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to buy creator coins' });
  }
});

/**
 * @route POST /api/v1/blockchain/:coinId/sell
 * @desc Sell creator coins
 */
router.post('/:coinId/sell', async (req: Request, res: Response) => {
  try {
    const { coinId } = req.params;
    const { amount, minPrice } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const transaction = await creatorCoinService.sellCoins(
      userId,
      coinId,
      amount,
      minPrice
    );

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    logger.error('Error selling creator coins', { error, coinId: req.params.coinId, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to sell creator coins' });
  }
});

/**
 * @route POST /api/v1/blockchain/:coinId/staking-pool
 * @desc Create staking pool for creator coin
 */
router.post('/:coinId/staking-pool', async (req: Request, res: Response) => {
  try {
    const { coinId } = req.params;
    const { name, description, apy, minStakeAmount, lockPeriod, rewardsToken } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!name || !description || !apy || !minStakeAmount || !lockPeriod) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const stakingPool = await creatorCoinService.createStakingPool(
      coinId,
      name,
      description,
      apy,
      minStakeAmount,
      lockPeriod,
      rewardsToken
    );

    res.status(201).json({
      success: true,
      data: stakingPool
    });
  } catch (error) {
    logger.error('Error creating staking pool', { error, coinId: req.params.coinId, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to create staking pool' });
  }
});

/**
 * @route POST /api/v1/blockchain/staking/:poolId/stake
 * @desc Stake coins in a pool
 */
router.post('/staking/:poolId/stake', async (req: Request, res: Response) => {
  try {
    const { poolId } = req.params;
    const { amount } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const stakingPosition = await creatorCoinService.stakeCoins(
      userId,
      poolId,
      amount
    );

    res.status(200).json({
      success: true,
      data: stakingPosition
    });
  } catch (error) {
    logger.error('Error staking coins', { error, poolId: req.params.poolId, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to stake coins' });
  }
});

/**
 * @route POST /api/v1/blockchain/staking/:positionId/claim
 * @desc Claim staking rewards
 */
router.post('/staking/:positionId/claim', async (req: Request, res: Response) => {
  try {
    const { positionId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const rewards = await creatorCoinService.claimStakingRewards(userId, positionId);

    res.status(200).json({
      success: true,
      data: { rewards }
    });
  } catch (error) {
    logger.error('Error claiming staking rewards', { error, positionId: req.params.positionId, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to claim staking rewards' });
  }
});

/**
 * @route GET /api/v1/blockchain/:coinId/market-data
 * @desc Get creator coin market data
 */
router.get('/:coinId/market-data', async (req: Request, res: Response) => {
  try {
    const { coinId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const marketData = await creatorCoinService.getMarketData(coinId);

    res.status(200).json({
      success: true,
      data: marketData
    });
  } catch (error) {
    logger.error('Error getting market data', { error, coinId: req.params.coinId, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to get market data' });
  }
});

/**
 * @route GET /api/v1/blockchain/trending
 * @desc Get trending creator coins
 */
router.get('/trending', async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const trendingCoins = await creatorCoinService.getTrendingCoins(
      limit ? parseInt(limit as string) : 10
    );

    res.status(200).json({
      success: true,
      data: trendingCoins
    });
  } catch (error) {
    logger.error('Error getting trending coins', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to get trending coins' });
  }
});

export default router;

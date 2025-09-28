import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { monetizationService } from '../services/MonetizationService';
import { logger } from '../config/logger';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for monetization endpoints
const iapLimit = rateLimit({
  windowMs: 60000, // 1 minute
  max: 10, // 10 IAP requests per minute
  message: {
    success: false,
    error: 'Too many purchase requests. Please wait before trying again.'
  }
});

const generalLimit = rateLimit({
  windowMs: 60000, // 1 minute
  max: 30, // 30 requests per minute
  message: {
    success: false,
    error: 'Too many requests. Please wait before trying again.'
  }
});

/**
 * GET /monetization/currency/balance
 * Get user's virtual currency balance
 */
router.get('/currency/balance', authenticateToken, generalLimit, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const currency = monetizationService.getUserCurrency(userId);

    res.json({
      success: true,
      currency
    });
  } catch (error) {
    logger.error('Error fetching currency balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch currency balance'
    });
  }
});

/**
 * GET /monetization/inventory
 * Get user's complete inventory
 */
router.get('/inventory', authenticateToken, generalLimit, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const inventory = monetizationService.getUserInventory(userId);

    res.json({
      success: true,
      inventory: {
        userId: inventory.userId,
        currency: inventory.currency,
        cosmetics: Array.from(inventory.cosmetics.values()),
        boosts: Array.from(inventory.boosts.values()),
        consumables: Object.fromEntries(inventory.consumables),
        lastUpdated: inventory.lastUpdated
      }
    });
  } catch (error) {
    logger.error('Error fetching inventory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inventory'
    });
  }
});

/**
 * GET /monetization/products
 * Get all IAP products
 */
router.get('/products', generalLimit, async (req: Request, res: Response) => {
  try {
    const products = monetizationService.getIAPProducts();

    res.json({
      success: true,
      products,
      total: products.length
    });
  } catch (error) {
    logger.error('Error fetching IAP products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products'
    });
  }
});

/**
 * GET /monetization/products/featured
 * Get featured IAP products
 */
router.get('/products/featured', generalLimit, async (req: Request, res: Response) => {
  try {
    const products = monetizationService.getFeaturedProducts();

    res.json({
      success: true,
      products,
      total: products.length
    });
  } catch (error) {
    logger.error('Error fetching featured products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch featured products'
    });
  }
});

/**
 * POST /monetization/purchase
 * Process an IAP purchase
 */
router.post('/purchase', authenticateToken, iapLimit, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { productId, receiptData } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'Product ID is required'
      });
    }

    const result = await monetizationService.processPurchase(userId, productId, receiptData);

    if (result.success && result.transaction) {
      res.json({
        success: true,
        transaction: result.transaction,
        message: 'Purchase completed successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to process purchase'
      });
    }
  } catch (error) {
    logger.error('Error processing purchase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process purchase'
    });
  }
});

/**
 * GET /monetization/battle-pass
 * Get active battle passes
 */
router.get('/battle-pass', generalLimit, async (req: Request, res: Response) => {
  try {
    const battlePasses = monetizationService.getActiveBattlePasses();

    res.json({
      success: true,
      battlePasses,
      total: battlePasses.length
    });
  } catch (error) {
    logger.error('Error fetching battle passes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch battle passes'
    });
  }
});

/**
 * GET /monetization/battle-pass/:battlePassId/progress
 * Get user's battle pass progress
 */
router.get('/battle-pass/:battlePassId/progress', authenticateToken, generalLimit, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { battlePassId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const progress = monetizationService.getUserBattlePass(userId, battlePassId);

    res.json({
      success: true,
      progress
    });
  } catch (error) {
    logger.error('Error fetching battle pass progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch battle pass progress'
    });
  }
});

/**
 * POST /monetization/battle-pass/:battlePassId/purchase
 * Purchase a battle pass
 */
router.post('/battle-pass/:battlePassId/purchase', authenticateToken, iapLimit, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { battlePassId } = req.params;
    const { useGems = false } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const success = await monetizationService.purchaseBattlePass(userId, battlePassId, useGems);

    if (success) {
      res.json({
        success: true,
        message: 'Battle pass purchased successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to purchase battle pass'
      });
    }
  } catch (error) {
    logger.error('Error purchasing battle pass:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to purchase battle pass'
    });
  }
});

/**
 * POST /monetization/battle-pass/:battlePassId/claim/:tier
 * Claim battle pass reward
 */
router.post('/battle-pass/:battlePassId/claim/:tier', authenticateToken, generalLimit, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { battlePassId, tier } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const success = await monetizationService.claimBattlePassReward(userId, battlePassId, Number(tier));

    if (success) {
      res.json({
        success: true,
        message: 'Battle pass reward claimed successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to claim battle pass reward'
      });
    }
  } catch (error) {
    logger.error('Error claiming battle pass reward:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to claim battle pass reward'
    });
  }
});

/**
 * GET /monetization/loot-boxes
 * Get available loot boxes
 */
router.get('/loot-boxes', generalLimit, async (req: Request, res: Response) => {
  try {
    const lootBoxes = monetizationService.getAvailableLootBoxes();

    res.json({
      success: true,
      lootBoxes,
      total: lootBoxes.length
    });
  } catch (error) {
    logger.error('Error fetching loot boxes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch loot boxes'
    });
  }
});

/**
 * POST /monetization/loot-boxes/:lootBoxId/open
 * Open a loot box
 */
router.post('/loot-boxes/:lootBoxId/open', authenticateToken, iapLimit, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { lootBoxId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const result = await monetizationService.openLootBox(userId, lootBoxId);

    if (result.success && result.rewards) {
      res.json({
        success: true,
        rewards: result.rewards,
        message: 'Loot box opened successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to open loot box'
      });
    }
  } catch (error) {
    logger.error('Error opening loot box:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to open loot box'
    });
  }
});

/**
 * GET /monetization/daily-rewards
 * Get user's daily rewards status
 */
router.get('/daily-rewards', authenticateToken, generalLimit, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const dailyRewards = monetizationService.getUserDailyRewards(userId);

    res.json({
      success: true,
      dailyRewards,
      total: dailyRewards.length
    });
  } catch (error) {
    logger.error('Error fetching daily rewards:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch daily rewards'
    });
  }
});

/**
 * POST /monetization/daily-rewards/:day/claim
 * Claim daily reward
 */
router.post('/daily-rewards/:day/claim', authenticateToken, generalLimit, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { day } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const success = await monetizationService.claimDailyReward(userId, Number(day));

    if (success) {
      res.json({
        success: true,
        message: 'Daily reward claimed successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to claim daily reward'
      });
    }
  } catch (error) {
    logger.error('Error claiming daily reward:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to claim daily reward'
    });
  }
});

/**
 * POST /monetization/currency/add
 * Add currency to user account (for testing or game rewards)
 */
router.post('/currency/add', authenticateToken, generalLimit, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { currency, source = 'reward' } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    if (!currency) {
      return res.status(400).json({
        success: false,
        error: 'Currency amount is required'
      });
    }

    const newBalance = await monetizationService.addCurrency(userId, currency, source);

    res.json({
      success: true,
      newBalance,
      message: 'Currency added successfully'
    });
  } catch (error) {
    logger.error('Error adding currency:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add currency'
    });
  }
});

export default router;
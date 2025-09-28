import { Router, Response } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { revenueOptimizationService } from '@/services/RevenueOptimizationService';
import { authMiddleware } from '@/middleware/auth';
import { socialLimiter } from '@/middleware/security';
import { logger } from '@/config/logger';

const router = Router();

// Apply authentication and rate limiting to all routes
router.use(authMiddleware);
router.use(socialLimiter);

/**
 * Revenue Optimization Routes
 * Handles dynamic pricing, monetization opportunities, and revenue analytics
 */

// Calculate dynamic pricing
router.post('/pricing/dynamic', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId, basePrice } = req.body as {
      productId: string;
      basePrice: number;
    };
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const dynamicPricing = await revenueOptimizationService.calculateDynamicPricing(
      productId,
      userId,
      basePrice
    );

    return res.json({
      success: true,
      data: dynamicPricing
    });
  } catch (error) {
    logger.error('Error calculating dynamic pricing:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to calculate dynamic pricing'
    });
  }
});

// Get monetization opportunities
router.get('/opportunities', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const opportunities = await revenueOptimizationService.identifyMonetizationOpportunities(userId);

    return res.json({
      success: true,
      data: opportunities
    });
  } catch (error) {
    logger.error('Error getting monetization opportunities:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get monetization opportunities'
    });
  }
});

// Get personalized offers
router.get('/offers/personalized', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const offers = await revenueOptimizationService.generatePersonalizedOffers(userId);

    return res.json({
      success: true,
      data: offers
    });
  } catch (error) {
    logger.error('Error getting personalized offers:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get personalized offers'
    });
  }
});

// Get revenue analytics (Admin only)
router.get('/analytics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const analytics = await revenueOptimizationService.getRevenueAnalytics();

    return res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error getting revenue analytics:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get revenue analytics'
    });
  }
});

// Create A/B test (Admin only)
router.post('/ab-test', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { testName, variants, metrics, duration } = req.body;

    const abTest = await revenueOptimizationService.createABTest({
      testName,
      variants,
      metrics,
      duration
    });

    return res.json({
      success: true,
      data: abTest
    });
  } catch (error) {
    logger.error('Error creating A/B test:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create A/B test'
    });
  }
});

// Implement revenue strategy (Admin only)
router.post('/strategy/:strategyId/implement', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { strategyId } = req.params;
    const { parameters } = req.body;

    const result = await revenueOptimizationService.implementStrategy(strategyId, parameters);

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error implementing strategy:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to implement strategy'
    });
  }
});

// Get pricing tiers
router.get('/pricing/tiers', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const tiers = await revenueOptimizationService.getPricingTiers();

    return res.json({
      success: true,
      data: tiers
    });
  } catch (error) {
    logger.error('Error getting pricing tiers:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get pricing tiers'
    });
  }
});

// Optimize pricing (Admin only)
router.post('/pricing/optimize', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { productId, optimizationType, parameters } = req.body;

    const optimization = await revenueOptimizationService.optimizePricingTiers();

    return res.json({
      success: true,
      data: optimization
    });
  } catch (error) {
    logger.error('Error optimizing pricing:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to optimize pricing'
    });
  }
});

// Get revenue strategies (Admin only)
router.get('/strategies', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const strategies = await revenueOptimizationService.getRevenueStrategies();

    return res.json({
      success: true,
      data: strategies
    });
  } catch (error) {
    logger.error('Error getting revenue strategies:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get revenue strategies'
    });
  }
});

// Get A/B test results (Admin only)
router.get('/ab-test/:testId/results', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { testId } = req.params;

    const results = await revenueOptimizationService.getABTestResults(testId);

    return res.json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error('Error getting A/B test results:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get A/B test results'
    });
  }
});

export default router;
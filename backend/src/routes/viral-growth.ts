import { Router, Response } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { viralGrowthService } from '@/services/ViralGrowthService';
import { authMiddleware } from '@/middleware/auth';
import { socialLimiter } from '@/middleware/security';
import { logger } from '@/config/logger';

const router = Router();

// Apply authentication and rate limiting to all routes
router.use(authMiddleware);
router.use(socialLimiter);

/**
 * Viral Growth Routes
 * Handles referral programs, viral campaigns, and growth mechanics
 */

// Generate referral code
router.post('/referral/generate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const referralCode = await viralGrowthService.generateReferralCode(userId);

    return res.json({
      success: true,
      data: {
        referralCode,
        userId,
        createdAt: new Date()
      }
    });
  } catch (error) {
    logger.error('Error generating referral code:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate referral code'
    });
  }
});

// Get referral stats
router.get('/referral/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const stats = await viralGrowthService.getReferralStats(userId);

    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting referral stats:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get referral stats'
    });
  }
});

// Use referral code
router.post('/referral/use', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { referralCode } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const result = await viralGrowthService.useReferralCode(userId, referralCode);

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error using referral code:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to use referral code'
    });
  }
});

// Get viral campaigns (Admin only)
router.get('/campaigns', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const campaigns = await viralGrowthService.getViralCampaigns();

    return res.json({
      success: true,
      data: campaigns
    });
  } catch (error) {
    logger.error('Error getting viral campaigns:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get viral campaigns'
    });
  }
});

// Create viral campaign (Admin only)
router.post('/campaigns', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const campaignData = req.body;

    const campaign = await viralGrowthService.createViralCampaign(campaignData);

    return res.json({
      success: true,
      data: campaign
    });
  } catch (error) {
    logger.error('Error creating viral campaign:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create viral campaign'
    });
  }
});

// Get growth metrics (Admin only)
router.get('/metrics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { timeRange = '7d' } = req.query;

    const metrics = await viralGrowthService.getGrowthMetrics(timeRange as string);

    return res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error getting growth metrics:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get growth metrics'
    });
  }
});

// Get viral coefficient (Admin only)
router.get('/viral-coefficient', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const coefficient = await viralGrowthService.getViralCoefficient();

    return res.json({
      success: true,
      data: {
        coefficient,
        timestamp: new Date()
      }
    });
  } catch (error) {
    logger.error('Error getting viral coefficient:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get viral coefficient'
    });
  }
});

// Get top referrers (Admin only)
router.get('/top-referrers', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = 10 } = req.query;

    const topReferrers = await viralGrowthService.getTopReferrers(parseInt(limit as string));

    return res.json({
      success: true,
      data: topReferrers
    });
  } catch (error) {
    logger.error('Error getting top referrers:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get top referrers'
    });
  }
});

// Get referral leaderboard
router.get('/leaderboard', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = 50 } = req.query;

    const leaderboard = await viralGrowthService.getReferralLeaderboard(parseInt(limit as string));

    return res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    logger.error('Error getting referral leaderboard:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get referral leaderboard'
    });
  }
});

// Track viral event
router.post('/track-event', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { eventType, metadata } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    await viralGrowthService.trackViralEvent(userId, eventType, metadata);

    return res.json({
      success: true,
      message: 'Viral event tracked successfully'
    });
  } catch (error) {
    logger.error('Error tracking viral event:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to track viral event'
    });
  }
});

export default router;
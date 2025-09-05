import express, { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import { socialLimiter } from '../middleware/security';
import AdvancedSubscriptionService from '../services/subscription/SubscriptionService';
import { logger } from '../config/logger';

const router = express.Router();
const subscriptionService = AdvancedSubscriptionService.getInstance();

// Apply middleware
router.use(authMiddleware);
router.use(socialLimiter);

/**
 * @route POST /api/subscription/tier
 * @desc Create a new subscription tier
 * @access Private (Creator)
 */
router.post('/tier', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const creatorId = req.user.id;
    const tierData = req.body;

    if (!tierData.name || !tierData.price) {
      return res.status(400).json({
        success: false,
        error: 'Tier name and price are required'
      });
    }

    const tier = await subscriptionService.createSubscriptionTier(creatorId, tierData);

    logger.info('Subscription tier created', {
      tierId: tier.id,
      creatorId,
      name: tier.name,
      price: tier.price,
      requestId: req.headers['x-request-id']
    });

    res.status(201).json({
      success: true,
      data: {
        tier,
        message: 'Subscription tier created successfully'
      }
    });
  } catch (error) {
    logger.error('Error creating subscription tier:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create subscription tier'
    });
  }
});

/**
 * @route GET /api/subscription/creator/:creatorId/tiers
 * @desc Get creator's subscription tiers
 * @access Public
 */
router.get('/creator/:creatorId/tiers', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { creatorId } = req.params;

    const tiers = await subscriptionService.getCreatorTiers(creatorId);

    res.json({
      success: true,
      data: { tiers }
    });
  } catch (error) {
    logger.error('Error getting creator tiers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get creator tiers'
    });
  }
});

/**
 * @route POST /api/subscription/subscribe
 * @desc Subscribe to a creator's tier
 * @access Private
 */
router.post('/subscribe', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { creatorId, tierId, paymentMethod } = req.body;
    const subscriberId = req.user.id;

    if (!creatorId || !tierId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'creatorId, tierId, and paymentMethod are required'
      });
    }

    const subscription = await subscriptionService.subscribeUser(
      subscriberId,
      creatorId,
      tierId,
      paymentMethod
    );

    logger.info('User subscribed successfully', {
      subscriptionId: subscription.id,
      subscriberId,
      creatorId,
      tierId,
      requestId: req.headers['x-request-id']
    });

    res.status(201).json({
      success: true,
      data: {
        subscription,
        message: 'Subscription created successfully'
      }
    });
  } catch (error) {
    logger.error('Error subscribing user:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create subscription'
    });
  }
});

/**
 * @route POST /api/subscription/:subscriptionId/cancel
 * @desc Cancel a subscription
 * @access Private
 */
router.post('/:subscriptionId/cancel', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    const success = await subscriptionService.cancelSubscription(subscriptionId, reason);

    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to cancel subscription'
      });
    }

    logger.info('Subscription cancelled', {
      subscriptionId,
      userId,
      reason,
      requestId: req.headers['x-request-id']
    });

    res.json({
      success: true,
      data: {
        subscriptionId,
        message: 'Subscription cancelled successfully'
      }
    });
  } catch (error) {
    logger.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to cancel subscription'
    });
  }
});

/**
 * @route GET /api/subscription/user/:userId/subscriptions
 * @desc Get user's subscriptions
 * @access Private
 */
router.get('/user/:userId/subscriptions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user.id;

    // Check if user is requesting their own subscriptions or has permission
    if (userId !== requestingUserId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const subscriptions = await subscriptionService.getUserSubscriptions(userId);

    res.json({
      success: true,
      data: { subscriptions }
    });
  } catch (error) {
    logger.error('Error getting user subscriptions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user subscriptions'
    });
  }
});

/**
 * @route GET /api/subscription/creator/:creatorId/analytics
 * @desc Get creator's subscriber analytics
 * @access Private (Creator)
 */
router.get('/creator/:creatorId/analytics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { creatorId } = req.params;
    const requestingUserId = req.user.id;

    // Check if user is requesting their own analytics or has permission
    if (creatorId !== requestingUserId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const analytics = await subscriptionService.getSubscriberInsights(creatorId);

    res.json({
      success: true,
      data: { analytics }
    });
  } catch (error) {
    logger.error('Error getting subscriber analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get subscriber analytics'
    });
  }
});

/**
 * @route POST /api/subscription/content/exclusive
 * @desc Deliver exclusive content to subscribers
 * @access Private (Creator)
 */
router.post('/content/exclusive', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tierId, content } = req.body;
    const creatorId = req.user.id;

    if (!tierId || !content) {
      return res.status(400).json({
        success: false,
        error: 'tierId and content are required'
      });
    }

    const exclusiveContent = await subscriptionService.deliverExclusiveContent(tierId, {
      ...content,
      creatorId
    });

    logger.info('Exclusive content delivered', {
      contentId: exclusiveContent.id,
      tierId,
      creatorId,
      contentType: content.contentType,
      requestId: req.headers['x-request-id']
    });

    res.status(201).json({
      success: true,
      data: {
        content: exclusiveContent,
        message: 'Exclusive content delivered successfully'
      }
    });
  } catch (error) {
    logger.error('Error delivering exclusive content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deliver exclusive content'
    });
  }
});

/**
 * @route GET /api/subscription/creator/:creatorId/forecast
 * @desc Get revenue forecast for creator
 * @access Private (Creator)
 */
router.get('/creator/:creatorId/forecast', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { creatorId } = req.params;
    const { timeframe = '12months' } = req.query;
    const requestingUserId = req.user.id;

    // Check if user is requesting their own forecast or has permission
    if (creatorId !== requestingUserId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const forecast = await subscriptionService.forecastRevenue(creatorId, timeframe as string);

    res.json({
      success: true,
      data: { forecast }
    });
  } catch (error) {
    logger.error('Error getting revenue forecast:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get revenue forecast'
    });
  }
});

/**
 * @route PUT /api/subscription/tier/:tierId
 * @desc Update subscription tier
 * @access Private (Creator)
 */
router.put('/tier/:tierId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tierId } = req.params;
    const updates = req.body;
    const creatorId = req.user.id;

    // Mock implementation - in real app, implement tier updates
    res.json({
      success: true,
      data: {
        tierId,
        message: 'Tier updated successfully'
      }
    });
  } catch (error) {
    logger.error('Error updating subscription tier:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update subscription tier'
    });
  }
});

/**
 * @route DELETE /api/subscription/tier/:tierId
 * @desc Delete subscription tier
 * @access Private (Creator)
 */
router.delete('/tier/:tierId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tierId } = req.params;
    const creatorId = req.user.id;

    // Mock implementation - in real app, implement tier deletion
    res.json({
      success: true,
      data: {
        tierId,
        message: 'Tier deleted successfully'
      }
    });
  } catch (error) {
    logger.error('Error deleting subscription tier:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete subscription tier'
    });
  }
});

/**
 * @route GET /api/subscription/content/:contentId
 * @desc Get exclusive content details
 * @access Private (Subscriber)
 */
router.get('/content/:contentId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { contentId } = req.params;
    const userId = req.user.id;

    // Mock implementation - in real app, check subscription access and return content
    res.json({
      success: true,
      data: {
        contentId,
        message: 'Content access verified'
      }
    });
  } catch (error) {
    logger.error('Error getting exclusive content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get exclusive content'
    });
  }
});

/**
 * @route GET /api/subscription/creator/:creatorId/content
 * @desc Get creator's exclusive content (for subscribers)
 * @access Private (Subscriber)
 */
router.get('/creator/:creatorId/content', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { creatorId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user.id;

    // Mock implementation - in real app, check subscription and return content
    res.json({
      success: true,
      data: {
        content: [],
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: 0
        }
      }
    });
  } catch (error) {
    logger.error('Error getting creator content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get creator content'
    });
  }
});

/**
 * @route GET /api/subscription/stats/global
 * @desc Get global subscription statistics
 * @access Public
 */
router.get('/stats/global', async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Mock implementation - in real app, return global subscription stats
    const stats = {
      totalSubscriptions: 50000,
      totalRevenue: 2500000,
      averageSubscriptionValue: 50,
      topCreators: []
    };

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    logger.error('Error getting global subscription stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get global subscription statistics'
    });
  }
});

export default router;

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { RealTimePersonalizationService } from '../services/RealTimePersonalizationService';
import { requireAuth, requireAdmin } from '../middleware/enhancedSecurity';
import { validateInput } from '../middleware/enhancedSecurity';
import { createRateLimit } from '../middleware/enhancedSecurity';
import { getMongoDB } from '@/config/database';
import { getRedisClient } from '@/config/redis';
import { logger } from '@/config/logger';

const router = Router();

interface PersonalizationRuleRequest {
  name: string;
  description: string;
  conditions: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
    value: any;
  }>;
  actions: Array<{
    type: 'show_content' | 'hide_content' | 'modify_ui' | 'send_notification' | 'adjust_pricing';
    config: any;
  }>;
  priority: number;
  isActive: boolean;
}

interface ContentFeedRequest {
  sessionId: string;
  currentPage: string;
  limit?: number;
}

interface UIPersonalizationRequest {
  sessionId: string;
  currentPage: string;
}

interface NotificationPersonalizationRequest {
  limit?: number;
}

interface PricingPersonalizationRequest {
  productId: string;
  basePrice: number;
}

// Initialize service with MongoDB and Redis
let realTimePersonalizationService: RealTimePersonalizationService;

const initializeService = async () => {
  if (!realTimePersonalizationService) {
    const db = await getMongoDB();
    const redis = await getRedisClient();
    
    realTimePersonalizationService = new RealTimePersonalizationService(
      db.collection('analytics_events'),
      db.collection('users'),
      db.collection('livestreams'),
      db.collection('shortvideos'),
      redis,
    );
  }
  return realTimePersonalizationService;
};

  // Rate limiting for personalization endpoints
  const personalizationRateLimit = createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 50, // 50 requests per minute
    message: 'Too many personalization requests, please try again later',
  });

  const adminRateLimit = createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute
    message: 'Too many admin requests, please try again later',
  });

  /**
   * GET /api/v1/personalization/content-feed
   * Get personalized content feed for user
   */
router.get('/personalization/content-feed', 
  requireAuth, 
  personalizationRateLimit, 
  validateInput,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { sessionId, currentPage, limit = 20 } = req.query as unknown as ContentFeedRequest;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const service = await initializeService();
      const personalizedFeed = await service.personalizeContentFeed(
        userId,
        sessionId,
        currentPage
      );

      return res.json({
        success: true,
        data: personalizedFeed
      });
    } catch (error) {
      logger.error('Error getting personalized content feed:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get personalized content feed'
      });
    }
  }
);

/**
 * GET /api/v1/personalization/ui-config
 * Get personalized UI configuration
 */
router.get('/personalization/ui-config',
  requireAuth,
  personalizationRateLimit,
  validateInput,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { sessionId, currentPage } = req.query as unknown as UIPersonalizationRequest;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const service = await initializeService();
      const uiConfig = await service.getPersonalizedUIConfig(
        userId,
        sessionId,
        currentPage
      );

      return res.json({
        success: true,
        data: uiConfig
      });
    } catch (error) {
      logger.error('Error getting personalized UI config:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get personalized UI config'
      });
    }
  }
);

  /**
   * GET /api/v1/personalization/notifications
 * Get personalized notifications
 */
router.get('/personalization/notifications',
  requireAuth,
  personalizationRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { limit = 10 } = req.query as NotificationPersonalizationRequest;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const service = await initializeService();
      const notifications = await service.personalizeNotifications(userId);

      return res.json({
        success: true,
        data: notifications
      });
    } catch (error) {
      logger.error('Error getting personalized notifications:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get personalized notifications'
      });
    }
  }
);

  /**
   * POST /api/v1/personalization/pricing
 * Get personalized pricing
 */
router.post('/personalization/pricing',
  requireAuth,
  personalizationRateLimit,
  validateInput,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { productId, basePrice } = req.body as PricingPersonalizationRequest;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const service = await initializeService();
      const personalizedPricing = await service.personalizePricing(
        userId,
        productId,
        basePrice
      );

      return res.json({
        success: true,
        data: personalizedPricing
      });
    } catch (error) {
      logger.error('Error getting personalized pricing:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get personalized pricing'
      });
    }
  }
);

/**
 * POST /api/v1/personalization/rules (Admin only)
 * Create personalization rule
 */
router.post('/personalization/rules',
  requireAdmin,
  adminRateLimit,
  validateInput,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const ruleData = req.body as PersonalizationRuleRequest;

      const service = await initializeService();
      const rule = await service.createPersonalizationRule(ruleData);

      return res.json({
        success: true,
        data: rule
      });
    } catch (error) {
      logger.error('Error creating personalization rule:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create personalization rule'
      });
    }
  }
);

/**
 * GET /api/v1/personalization/rules (Admin only)
 * Get all personalization rules
 */
router.get('/personalization/rules',
  requireAdmin,
  adminRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const service = await initializeService();
      const rules = await service.getAllPersonalizationRules();

      return res.json({
        success: true,
        data: rules
      });
    } catch (error) {
      logger.error('Error getting personalization rules:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get personalization rules'
      });
    }
  }
);

/**
 * PUT /api/v1/personalization/rules/:ruleId (Admin only)
 * Update personalization rule
 */
router.put('/personalization/rules/:ruleId',
  requireAdmin,
  adminRateLimit,
  validateInput,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ruleId } = req.params;
      const ruleData = req.body as Partial<PersonalizationRuleRequest>;

      const service = await initializeService();
      const rule = await service.updatePersonalizationRule(ruleId, ruleData);

      return res.json({
        success: true,
        data: rule
      });
    } catch (error) {
      logger.error('Error updating personalization rule:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update personalization rule'
      });
    }
  }
);

/**
 * DELETE /api/v1/personalization/rules/:ruleId (Admin only)
 * Delete personalization rule
 */
router.delete('/personalization/rules/:ruleId',
  requireAdmin,
  adminRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ruleId } = req.params;

      const service = await initializeService();
      await service.deletePersonalizationRule(ruleId);

      return res.json({
        success: true,
        message: 'Personalization rule deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting personalization rule:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete personalization rule'
      });
    }
  }
);

/**
 * GET /api/v1/personalization/analytics (Admin only)
 * Get personalization analytics
 */
router.get('/personalization/analytics',
  requireAdmin,
  adminRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const service = await initializeService();
      const analytics = await service.getPersonalizationMetrics();

      return res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Error getting personalization analytics:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get personalization analytics'
      });
    }
  }
);

  /**
   * POST /api/v1/personalization/feedback
 * Submit personalization feedback
 */
router.post('/personalization/feedback',
  requireAuth,
  personalizationRateLimit,
  validateInput,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { contentId, contentType, feedback, rating } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const service = await initializeService();
      await service.submitPersonalizationFeedback({
        userId,
          contentId,
        contentType,
          feedback,
        rating
      });

      return res.json({
        success: true,
        message: 'Feedback submitted successfully'
      });
    } catch (error) {
      logger.error('Error submitting personalization feedback:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to submit personalization feedback'
      });
    }
}
);

export default router;
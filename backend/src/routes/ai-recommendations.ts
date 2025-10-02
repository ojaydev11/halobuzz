import { Router, Response } from 'express';
import { AuthenticatedRequest } from '@/middleware/enhancedSecurity';
import { AIContentRecommendationService } from '../services/AIContentRecommendationService';
import { requireAuth } from '../middleware/auth';
import { validateInput } from '../middleware/enhancedSecurity';
import { createRateLimit } from '../middleware/enhancedSecurity';
import { getMongoDB } from '@/config/database';
import { getRedisClient } from '@/config/redis';
import { logger } from '@/config/logger';
import { LiveStream } from '@/models/LiveStream';
import { ShortVideo } from '@/models/ShortVideo';
import { AnalyticsEvent } from '@/analytics/models/AnalyticsEvent';
import { User } from '@/models/User';

const router = Router();

interface RecommendationQuery {
  limit?: number;
  contentType?: 'stream' | 'video' | 'all';
  category?: string;
  language?: string;
}

interface RecommendationResponse {
  success: boolean;
  data: {
    recommendations: Array<{
      contentId: string;
      contentType: 'stream' | 'video';
      score: number;
      reason: string;
      confidence: number;
      metadata: {
        category: string;
        creator: string;
        duration: number;
        engagement: number;
      };
    }>;
    totalCount: number;
    generatedAt: Date;
    cacheHit: boolean;
  };
  message: string;
}

interface AnalyticsResponse {
  success: boolean;
  data: {
    totalRecommendations: number;
    averageScore: number;
    topCategories: Array<{ category: string; count: number }>;
    userEngagement: {
      clickThroughRate: number;
      watchTime: number;
      conversionRate: number;
    };
  };
  message: string;
}

// Initialize service with MongoDB and Redis
let aiRecommendationService: AIContentRecommendationService;

const initializeService = async () => {
  if (!aiRecommendationService) {
    const db = await getMongoDB();
    const redis = await getRedisClient();
    
    aiRecommendationService = new AIContentRecommendationService(
      User.find({}).limit(1000),
      LiveStream.find({}).limit(1000),
      ShortVideo.find({}).limit(1000),
      AnalyticsEvent.find({}).limit(1000),
      redis,
    );
  }
  return aiRecommendationService;
};

  // Rate limiting for recommendation endpoints
  const recommendationRateLimit = createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30, // 30 requests per minute
    message: 'Too many recommendation requests, please try again later',
  });

  const analyticsRateLimit = createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: 'Too many analytics requests, please try again later',
  });

  /**
   * GET /api/v1/ai-recommendations
   * Get personalized content recommendations for the authenticated user
   */
router.get('/ai-recommendations',
  requireAuth,
  recommendationRateLimit,
  validateInput,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { limit = 20, contentType = 'all', category, language } = req.query as any;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const service = await initializeService();
      const recommendations = await service.getPersonalizedRecommendations(
        userId,
        contentType as 'stream' | 'video' | 'all'
      );

      return res.json({
        success: true,
        data: recommendations,
        message: 'Recommendations generated successfully'
      });
    } catch (error) {
      logger.error('Error getting AI recommendations:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get recommendations'
      });
    }
  }
);

/**
 * GET /api/v1/ai-recommendations/similar/:contentId
 * Get similar content recommendations based on a specific content item
 */
router.get('/ai-recommendations/similar/:contentId',
  requireAuth,
  recommendationRateLimit,
  validateInput,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { contentId } = req.params;
      const { limit = 10 } = req.query;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const service = await initializeService();
      const similarContent = await service.getSimilarContent(
        contentId,
        userId,
        parseInt(limit as string)
      );

      return res.json({
        success: true,
        data: similarContent,
        message: 'Similar content recommendations generated successfully'
      });
    } catch (error) {
      logger.error('Error getting similar content:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get similar content'
      });
    }
  }
);

  /**
   * POST /api/v1/ai-recommendations/feedback
 * Submit feedback on recommendations to improve the AI model
 */
router.post('/ai-recommendations/feedback',
  requireAuth,
  recommendationRateLimit,
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
      await service.submitRecommendationFeedback(
        userId,
        contentId,
        feedback,
        { contentType, rating }
      );

      return res.json({
        success: true,
        message: 'Feedback submitted successfully'
      });
    } catch (error) {
      logger.error('Error submitting recommendation feedback:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to submit feedback'
      });
    }
  }
);

/**
 * GET /api/v1/ai-recommendations/trending
 * Get trending content recommendations
 */
router.get('/ai-recommendations/trending',
  requireAuth,
  recommendationRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { limit = 20, timeRange = '24h' } = req.query;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const service = await initializeService();
      const trendingContent = await service.getTrendingRecommendations(
        parseInt(limit as string),
        timeRange as 'hour' | 'day' | 'week' | 'month'
      );

      return res.json({
        success: true,
        data: trendingContent,
        message: 'Trending recommendations generated successfully'
      });
    } catch (error) {
      logger.error('Error getting trending recommendations:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get trending recommendations'
      });
    }
  }
);

/**
 * GET /api/v1/ai-recommendations/analytics
 * Get recommendation analytics for the authenticated user
 */
router.get('/ai-recommendations/analytics',
  requireAuth,
  analyticsRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const service = await initializeService();
      const analytics = await service.getRecommendationAnalytics(userId);

      return res.json({
        success: true,
        data: analytics,
        message: 'Recommendation analytics retrieved successfully'
      });
    } catch (error) {
      logger.error('Error getting recommendation analytics:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get recommendation analytics'
      });
    }
  }
);

/**
 * POST /api/v1/ai-recommendations/refresh
 * Refresh user's recommendation profile
 */
router.post('/ai-recommendations/refresh',
  requireAuth,
  recommendationRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const service = await initializeService();
      await service.refreshUserProfile(userId);

      return res.json({
        success: true,
        message: 'Recommendation profile refreshed successfully'
      });
    } catch (error) {
      logger.error('Error refreshing recommendation profile:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to refresh recommendation profile'
      });
    }
  }
);

export default router;
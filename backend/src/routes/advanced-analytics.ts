import { Router, Response } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { AdvancedAnalyticsService } from '../services/AdvancedAnalyticsService';
import { requireAuth, requireAdmin } from '../middleware/enhancedSecurity';
import { validateInput } from '../middleware/enhancedSecurity';
import { createRateLimit } from '../middleware/enhancedSecurity';
import { getMongoDB } from '@/config/database';
import { getRedisClient } from '@/config/redis';
import { logger } from '@/config/logger';

const router = Router();

interface DashboardQuery {
  timeRange?: 'hour' | 'day' | 'week' | 'month';
  granularity?: 'minute' | 'hour' | 'day';
}

interface DashboardResponse {
  success: boolean;
  data: {
    overview: {
      totalUsers: number;
      activeUsers: number;
      totalStreams: number;
      totalVideos: number;
      totalRevenue: number;
      engagementRate: number;
    };
    userMetrics: {
      newUsers: Array<{ timestamp: string; value: number; metadata?: any }>;
      activeUsers: Array<{ timestamp: string; value: number; metadata?: any }>;
      userRetention: {
        day1: number;
        day7: number;
        day30: number;
      };
      userSegments: Array<{
        segment: string;
        count: number;
        percentage: number;
      }>;
    };
    contentMetrics: {
      streamsPerDay: Array<{ timestamp: string; value: number; metadata?: any }>;
      videosPerDay: Array<{ timestamp: string; value: number; metadata?: any }>;
      averageWatchTime: Array<{ timestamp: string; value: number; metadata?: any }>;
      topCategories: Array<{
        category: string;
        count: number;
        engagement: number;
      }>;
      topCreators: Array<{
        creatorId: string;
        creatorName: string;
        streams: number;
        videos: number;
        totalViews: number;
        revenue: number;
      }>;
    };
    engagementMetrics: {
      likesPerDay: Array<{ timestamp: string; value: number; metadata?: any }>;
      sharesPerDay: Array<{ timestamp: string; value: number; metadata?: any }>;
      commentsPerDay: Array<{ timestamp: string; value: number; metadata?: any }>;
      giftsPerDay: Array<{ timestamp: string; value: number; metadata?: any }>;
      engagementRate: Array<{ timestamp: string; value: number; metadata?: any }>;
      viralCoefficient: number;
    };
    revenueMetrics: {
      revenuePerDay: Array<{ timestamp: string; value: number; metadata?: any }>;
      revenueBySource: Array<{
        source: string;
        amount: number;
        percentage: number;
      }>;
      averageRevenuePerUser: Array<{ timestamp: string; value: number; metadata?: any }>;
      conversionRate: Array<{ timestamp: string; value: number; metadata?: any }>;
      topRevenueGenerators: Array<{
        userId: string;
        userName: string;
        revenue: number;
        streams: number;
        videos: number;
      }>;
    };
    technicalMetrics: {
      apiResponseTime: Array<{ timestamp: string; value: number; metadata?: any }>;
      errorRate: Array<{ timestamp: string; value: number; metadata?: any }>;
      activeConnections: Array<{ timestamp: string; value: number; metadata?: any }>;
      cacheHitRate: Array<{ timestamp: string; value: number; metadata?: any }>;
      databasePerformance: {
        queryTime: number;
        connectionPool: number;
        slowQueries: number;
      };
    };
  };
  message: string;
}

interface PredictiveInsightsResponse {
  success: boolean;
  data: {
    userGrowth: {
      predictedGrowth: number;
      confidence: number;
      factors: string[];
    };
    revenueForecast: {
      predictedRevenue: number;
      confidence: number;
      factors: string[];
    };
    contentTrends: {
      trendingCategories: string[];
      predictedEngagement: number;
      recommendations: string[];
    };
    riskFactors: {
      churnRisk: number;
      technicalRisks: string[];
      businessRisks: string[];
    };
  };
  message: string;
}

// Initialize service with MongoDB and Redis
let analyticsService: AdvancedAnalyticsService;

const initializeService = async () => {
  if (!analyticsService) {
    const db = await getMongoDB();
    const redis = await getRedisClient();
    
    analyticsService = new AdvancedAnalyticsService(
      db.collection('analytics_events'),
      db.collection('users'),
      db.collection('livestreams'),
      db.collection('shortvideos'),
      redis,
    );
  }
  return analyticsService;
};

  // Rate limiting for analytics endpoints
  const analyticsRateLimit = createRateLimit({
    windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
    message: 'Too many analytics requests, please try again later',
  });

const adminRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: 'Too many admin requests, please try again later',
  });

  /**
 * GET /api/v1/analytics/dashboard
 * Get comprehensive analytics dashboard (admin only)
 */
router.get('/analytics/dashboard',
  requireAuth,
  requireAdmin,
  adminRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { timeRange = 'day', granularity = 'hour' } = req.query as DashboardQuery;

      const service = await initializeService();
      const dashboard = await service.getDashboardData(timeRange, granularity);

      return res.json({
        success: true,
        data: dashboard,
        message: 'Dashboard data retrieved successfully'
      });
    } catch (error) {
      logger.error('Error getting dashboard data:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get dashboard data'
      });
    }
  }
);

/**
 * GET /api/v1/analytics/predictive-insights
 * Get predictive analytics insights (admin only)
 */
router.get('/analytics/predictive-insights',
  requireAuth,
  requireAdmin,
  adminRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const service = await initializeService();
      const insights = await service.getPredictiveInsights();

      return res.json({
        success: true,
        data: insights,
        message: 'Predictive insights retrieved successfully'
      });
    } catch (error) {
      logger.error('Error getting predictive insights:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get predictive insights'
      });
    }
  }
);

/**
 * GET /api/v1/analytics/user-behavior
 * Get user behavior analytics (admin only)
 */
router.get('/analytics/user-behavior',
  requireAuth,
  requireAdmin,
  analyticsRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId, timeRange = 'week' } = req.query;

      const service = await initializeService();
      const behavior = await service.getUserBehaviorAnalytics(
        userId as string,
        timeRange as string
      );

      return res.json({
        success: true,
        data: behavior
      });
    } catch (error) {
      logger.error('Error getting user behavior analytics:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get user behavior analytics'
      });
    }
  }
);

/**
 * GET /api/v1/analytics/content-performance
 * Get content performance analytics (admin only)
 */
router.get('/analytics/content-performance',
  requireAuth,
  requireAdmin,
  analyticsRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { contentType, timeRange = 'week' } = req.query;

      const service = await initializeService();
      const performance = await service.getContentPerformanceAnalytics(
        contentType as string,
        timeRange as string
      );

      return res.json({
        success: true,
        data: performance
      });
    } catch (error) {
      logger.error('Error getting content performance analytics:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get content performance analytics'
      });
    }
  }
);

/**
 * GET /api/v1/analytics/revenue-analytics
 * Get revenue analytics (admin only)
 */
router.get('/analytics/revenue-analytics',
  requireAuth,
  requireAdmin,
  analyticsRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { timeRange = 'month' } = req.query;

      const service = await initializeService();
      const revenue = await service.getRevenueAnalytics(timeRange as string);

      return res.json({
        success: true,
        data: revenue
      });
    } catch (error) {
      logger.error('Error getting revenue analytics:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get revenue analytics'
      });
    }
  }
);

/**
 * GET /api/v1/analytics/engagement-metrics
 * Get engagement metrics (admin only)
 */
router.get('/analytics/engagement-metrics',
  requireAuth,
  requireAdmin,
  analyticsRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { timeRange = 'week' } = req.query;

      const service = await initializeService();
      const engagement = await service.getEngagementMetrics(timeRange as string);

      return res.json({
        success: true,
        data: engagement
      });
    } catch (error) {
      logger.error('Error getting engagement metrics:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get engagement metrics'
      });
    }
  }
);

/**
 * GET /api/v1/analytics/technical-metrics
 * Get technical performance metrics (admin only)
 */
router.get('/analytics/technical-metrics',
  requireAuth,
  requireAdmin,
  analyticsRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { timeRange = 'hour' } = req.query;

      const service = await initializeService();
      const technical = await service.getTechnicalMetrics(timeRange as string);

      return res.json({
        success: true,
        data: technical
      });
    } catch (error) {
      logger.error('Error getting technical metrics:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get technical metrics'
      });
    }
  }
);

/**
 * POST /api/v1/analytics/custom-report
 * Generate custom analytics report (admin only)
 */
router.post('/analytics/custom-report',
  requireAuth,
  requireAdmin,
  adminRateLimit,
  validateInput,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { reportConfig } = req.body;

      const service = await initializeService();
      const report = await service.generateCustomReport(reportConfig);

      return res.json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('Error generating custom report:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to generate custom report'
      });
    }
  }
);

/**
 * GET /api/v1/analytics/real-time-metrics
 * Get real-time metrics (admin only)
 */
router.get('/analytics/real-time-metrics',
  requireAuth,
  requireAdmin,
  analyticsRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const service = await initializeService();
      const realTimeMetrics = await service.getRealTimeMetrics();

      return res.json({
        success: true,
        data: realTimeMetrics
      });
    } catch (error) {
      logger.error('Error getting real-time metrics:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get real-time metrics'
      });
    }
  }
);

/**
 * GET /api/v1/analytics/export/:format
 * Export analytics data (admin only)
 */
router.get('/analytics/export/:format',
  requireAuth,
  requireAdmin,
  adminRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { format } = req.params;
      const { timeRange, metrics } = req.query;

      const service = await initializeService();
      const exportData = await service.exportAnalyticsData(
        format,
        timeRange as string,
        metrics as string
      );

      return res.json({
        success: true,
        data: exportData
      });
    } catch (error) {
      logger.error('Error exporting analytics data:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to export analytics data'
      });
    }
  }
);

export default router;
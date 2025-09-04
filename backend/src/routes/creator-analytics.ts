import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { socialLimiter } from '../middleware/security';
import CreatorAnalyticsService from '../services/creator-analytics/CreatorAnalyticsService';
import { logger } from '../config/logger';

const router = express.Router();
const analyticsService = CreatorAnalyticsService.getInstance();

// Apply middleware
router.use(authenticateToken);
router.use(socialLimiter);

/**
 * @route GET /api/analytics/creator/:creatorId/performance
 * @desc Get creator performance metrics
 * @access Private (Creator)
 */
router.get('/creator/:creatorId/performance', async (req, res) => {
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

    const metrics = await analyticsService.getPerformanceMetrics(creatorId);

    res.json({
      success: true,
      data: { metrics }
    });
  } catch (error) {
    logger.error('Error getting performance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get performance metrics'
    });
  }
});

/**
 * @route GET /api/analytics/creator/:creatorId/audience
 * @desc Get audience analytics and insights
 * @access Private (Creator)
 */
router.get('/creator/:creatorId/audience', async (req, res) => {
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

    const audience = await analyticsService.getAudienceInsights(creatorId);

    res.json({
      success: true,
      data: { audience }
    });
  } catch (error) {
    logger.error('Error getting audience insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get audience insights'
    });
  }
});

/**
 * @route GET /api/analytics/creator/:creatorId/optimization
 * @desc Get content optimization tips
 * @access Private (Creator)
 */
router.get('/creator/:creatorId/optimization', async (req, res) => {
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

    const optimization = await analyticsService.getContentOptimizationTips(creatorId);

    res.json({
      success: true,
      data: { optimization }
    });
  } catch (error) {
    logger.error('Error getting optimization tips:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get optimization tips'
    });
  }
});

/**
 * @route GET /api/analytics/creator/:creatorId/revenue
 * @desc Get revenue optimization analysis
 * @access Private (Creator)
 */
router.get('/creator/:creatorId/revenue', async (req, res) => {
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

    const revenue = await analyticsService.analyzeRevenueOptimization(creatorId);

    res.json({
      success: true,
      data: { revenue }
    });
  } catch (error) {
    logger.error('Error getting revenue optimization:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get revenue optimization analysis'
    });
  }
});

/**
 * @route GET /api/analytics/creator/:creatorId/dashboard
 * @desc Get complete analytics dashboard data
 * @access Private (Creator)
 */
router.get('/creator/:creatorId/dashboard', async (req, res) => {
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

    const dashboard = await analyticsService.getDashboardData(creatorId);

    res.json({
      success: true,
      data: { dashboard }
    });
  } catch (error) {
    logger.error('Error getting dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard data'
    });
  }
});

/**
 * @route GET /api/analytics/creator/:creatorId/performance/trends
 * @desc Get performance trends over time
 * @access Private (Creator)
 */
router.get('/creator/:creatorId/performance/trends', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { days = 30, metric = 'all' } = req.query;
    const requestingUserId = req.user.id;

    // Check if user is requesting their own analytics or has permission
    if (creatorId !== requestingUserId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Mock implementation - in real app, return specific trend data
    const trends = {
      views: [],
      likes: [],
      shares: [],
      comments: [],
      revenue: []
    };

    res.json({
      success: true,
      data: {
        trends,
        period: `${days} days`,
        metric
      }
    });
  } catch (error) {
    logger.error('Error getting performance trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get performance trends'
    });
  }
});

/**
 * @route GET /api/analytics/creator/:creatorId/audience/demographics
 * @desc Get detailed audience demographics
 * @access Private (Creator)
 */
router.get('/creator/:creatorId/audience/demographics', async (req, res) => {
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

    const audience = await analyticsService.getAudienceInsights(creatorId);

    res.json({
      success: true,
      data: {
        demographics: audience.demographics
      }
    });
  } catch (error) {
    logger.error('Error getting audience demographics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get audience demographics'
    });
  }
});

/**
 * @route GET /api/analytics/creator/:creatorId/content/performance
 * @desc Get individual content performance metrics
 * @access Private (Creator)
 */
router.get('/creator/:creatorId/content/performance', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { page = 1, limit = 20, sortBy = 'views', sortOrder = 'desc' } = req.query;
    const requestingUserId = req.user.id;

    // Check if user is requesting their own analytics or has permission
    if (creatorId !== requestingUserId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Mock implementation - in real app, return content performance data
    const contentPerformance = [];

    res.json({
      success: true,
      data: {
        content: contentPerformance,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: 0
        },
        sort: {
          by: sortBy,
          order: sortOrder
        }
      }
    });
  } catch (error) {
    logger.error('Error getting content performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get content performance'
    });
  }
});

/**
 * @route GET /api/analytics/creator/:creatorId/engagement/analysis
 * @desc Get detailed engagement analysis
 * @access Private (Creator)
 */
router.get('/creator/:creatorId/engagement/analysis', async (req, res) => {
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

    const audience = await analyticsService.getAudienceInsights(creatorId);

    res.json({
      success: true,
      data: {
        engagement: audience.engagement,
        behavior: audience.behavior,
        loyalty: audience.loyalty
      }
    });
  } catch (error) {
    logger.error('Error getting engagement analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get engagement analysis'
    });
  }
});

/**
 * @route GET /api/analytics/creator/:creatorId/revenue/breakdown
 * @desc Get detailed revenue breakdown
 * @access Private (Creator)
 */
router.get('/creator/:creatorId/revenue/breakdown', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { period = 'month' } = req.query;
    const requestingUserId = req.user.id;

    // Check if user is requesting their own analytics or has permission
    if (creatorId !== requestingUserId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const revenue = await analyticsService.analyzeRevenueOptimization(creatorId);

    res.json({
      success: true,
      data: {
        currentRevenue: revenue.currentRevenue,
        revenueStreams: revenue.revenueStreams,
        period
      }
    });
  } catch (error) {
    logger.error('Error getting revenue breakdown:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get revenue breakdown'
    });
  }
});

/**
 * @route GET /api/analytics/creator/:creatorId/insights/summary
 * @desc Get key insights summary
 * @access Private (Creator)
 */
router.get('/creator/:creatorId/insights/summary', async (req, res) => {
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

    const [metrics, audience, optimization] = await Promise.all([
      analyticsService.getPerformanceMetrics(creatorId),
      analyticsService.getAudienceInsights(creatorId),
      analyticsService.getContentOptimizationTips(creatorId)
    ]);

    const summary = {
      keyMetrics: {
        totalViews: metrics.totalViews,
        totalRevenue: metrics.totalRevenue,
        averageEngagementRate: metrics.averageEngagementRate,
        totalFollowers: metrics.totalFollowers
      },
      topInsights: [
        {
          insight: 'Your engagement rate is above average',
          impact: 'positive',
          recommendation: 'Continue current content strategy'
        },
        {
          insight: 'Peak viewing time is 7-9 PM',
          impact: 'neutral',
          recommendation: 'Schedule more content during peak hours'
        }
      ],
      priorityActions: optimization.priority.immediate.slice(0, 3),
      growthOpportunities: [
        {
          opportunity: 'Expand to new content categories',
          potential: 'high',
          effort: 'medium'
        }
      ]
    };

    res.json({
      success: true,
      data: { summary }
    });
  } catch (error) {
    logger.error('Error getting insights summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get insights summary'
    });
  }
});

/**
 * @route GET /api/analytics/creator/:creatorId/export
 * @desc Export analytics data
 * @access Private (Creator)
 */
router.get('/creator/:creatorId/export', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const { format = 'json', period = '30days' } = req.query;
    const requestingUserId = req.user.id;

    // Check if user is requesting their own analytics or has permission
    if (creatorId !== requestingUserId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const dashboard = await analyticsService.getDashboardData(creatorId);

    if (format === 'csv') {
      // Mock CSV export - in real app, generate actual CSV
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-${creatorId}-${period}.csv"`);
      res.send('metric,value\nviews,1500000\nlikes,75000\n');
    } else {
      res.json({
        success: true,
        data: {
          export: dashboard,
          format,
          period,
          exportedAt: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    logger.error('Error exporting analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export analytics data'
    });
  }
});

export default router;

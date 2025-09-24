import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AdvancedAnalyticsService } from '../services/AdvancedAnalyticsService';
import { requireAuth, requireAdmin } from '../middleware/enhancedSecurity';
import { validateInput } from '../middleware/enhancedSecurity';
import { createRateLimit } from '../middleware/enhancedSecurity';

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
      trends: string[];
    };
    contentTrends: {
      trendingCategories: string[];
      predictedTrends: Array<{
        category: string;
        growth: number;
        confidence: number;
      }>;
    };
    churnPrediction: {
      atRiskUsers: number;
      churnProbability: number;
      interventionSuggestions: string[];
    };
  };
  message: string;
}

interface RealTimeMetricsResponse {
  success: boolean;
  data: {
    activeStreams: number;
    activeUsers: number;
    currentRevenue: number;
    topTrendingContent: Array<{
      contentId: string;
      contentType: 'stream' | 'video';
      views: number;
      engagement: number;
    }>;
    systemHealth: {
      apiLatency: number;
      errorRate: number;
      activeConnections: number;
      cacheHitRate: number;
    };
    alerts: Array<{
      type: 'warning' | 'error' | 'info';
      message: string;
      timestamp: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }>;
  };
  message: string;
}

export default async function advancedAnalyticsRoutes(fastify: FastifyInstance) {
  const advancedAnalyticsService = new AdvancedAnalyticsService(
    fastify.mongo.db.collection('analytics_events'),
    fastify.mongo.db.collection('users'),
    fastify.mongo.db.collection('livestreams'),
    fastify.mongo.db.collection('shortvideos'),
    fastify.redis,
  );

  // Rate limiting for analytics endpoints
  const analyticsRateLimit = createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute
    message: 'Too many analytics requests, please try again later',
  });

  const realTimeRateLimit = createRateLimit({
    windowMs: 10 * 1000, // 10 seconds
    max: 10, // 10 requests per 10 seconds
    message: 'Too many real-time requests, please try again later',
  });

  /**
   * GET /api/v1/advanced-analytics/dashboard
   * Get comprehensive dashboard metrics (admin only)
   */
  fastify.get<{
    Querystring: DashboardQuery;
  }>('/advanced-analytics/dashboard', {
    preHandler: [requireAuth, requireAdmin, analyticsRateLimit, validateInput],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          timeRange: { type: 'string', enum: ['hour', 'day', 'week', 'month'], default: 'day' },
          granularity: { type: 'string', enum: ['minute', 'hour', 'day'], default: 'hour' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                overview: {
                  type: 'object',
                  properties: {
                    totalUsers: { type: 'number' },
                    activeUsers: { type: 'number' },
                    totalStreams: { type: 'number' },
                    totalVideos: { type: 'number' },
                    totalRevenue: { type: 'number' },
                    engagementRate: { type: 'number' },
                  },
                },
                userMetrics: {
                  type: 'object',
                  properties: {
                    newUsers: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          timestamp: { type: 'string', format: 'date-time' },
                          value: { type: 'number' },
                          metadata: { type: 'object' },
                        },
                      },
                    },
                    activeUsers: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          timestamp: { type: 'string', format: 'date-time' },
                          value: { type: 'number' },
                          metadata: { type: 'object' },
                        },
                      },
                    },
                    userRetention: {
                      type: 'object',
                      properties: {
                        day1: { type: 'number' },
                        day7: { type: 'number' },
                        day30: { type: 'number' },
                      },
                    },
                    userSegments: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          segment: { type: 'string' },
                          count: { type: 'number' },
                          percentage: { type: 'number' },
                        },
                      },
                    },
                  },
                },
                contentMetrics: {
                  type: 'object',
                  properties: {
                    streamsPerDay: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          timestamp: { type: 'string', format: 'date-time' },
                          value: { type: 'number' },
                          metadata: { type: 'object' },
                        },
                      },
                    },
                    videosPerDay: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          timestamp: { type: 'string', format: 'date-time' },
                          value: { type: 'number' },
                          metadata: { type: 'object' },
                        },
                      },
                    },
                    averageWatchTime: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          timestamp: { type: 'string', format: 'date-time' },
                          value: { type: 'number' },
                          metadata: { type: 'object' },
                        },
                      },
                    },
                    topCategories: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          category: { type: 'string' },
                          count: { type: 'number' },
                          engagement: { type: 'number' },
                        },
                      },
                    },
                    topCreators: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          creatorId: { type: 'string' },
                          creatorName: { type: 'string' },
                          streams: { type: 'number' },
                          videos: { type: 'number' },
                          totalViews: { type: 'number' },
                          revenue: { type: 'number' },
                        },
                      },
                    },
                  },
                },
                engagementMetrics: {
                  type: 'object',
                  properties: {
                    likesPerDay: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          timestamp: { type: 'string', format: 'date-time' },
                          value: { type: 'number' },
                          metadata: { type: 'object' },
                        },
                      },
                    },
                    sharesPerDay: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          timestamp: { type: 'string', format: 'date-time' },
                          value: { type: 'number' },
                          metadata: { type: 'object' },
                        },
                      },
                    },
                    commentsPerDay: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          timestamp: { type: 'string', format: 'date-time' },
                          value: { type: 'number' },
                          metadata: { type: 'object' },
                        },
                      },
                    },
                    giftsPerDay: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          timestamp: { type: 'string', format: 'date-time' },
                          value: { type: 'number' },
                          metadata: { type: 'object' },
                        },
                      },
                    },
                    engagementRate: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          timestamp: { type: 'string', format: 'date-time' },
                          value: { type: 'number' },
                          metadata: { type: 'object' },
                        },
                      },
                    },
                    viralCoefficient: { type: 'number' },
                  },
                },
                revenueMetrics: {
                  type: 'object',
                  properties: {
                    revenuePerDay: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          timestamp: { type: 'string', format: 'date-time' },
                          value: { type: 'number' },
                          metadata: { type: 'object' },
                        },
                      },
                    },
                    revenueBySource: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          source: { type: 'string' },
                          amount: { type: 'number' },
                          percentage: { type: 'number' },
                        },
                      },
                    },
                    averageRevenuePerUser: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          timestamp: { type: 'string', format: 'date-time' },
                          value: { type: 'number' },
                          metadata: { type: 'object' },
                        },
                      },
                    },
                    conversionRate: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          timestamp: { type: 'string', format: 'date-time' },
                          value: { type: 'number' },
                          metadata: { type: 'object' },
                        },
                      },
                    },
                    topRevenueGenerators: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          userId: { type: 'string' },
                          userName: { type: 'string' },
                          revenue: { type: 'number' },
                          streams: { type: 'number' },
                          videos: { type: 'number' },
                        },
                      },
                    },
                  },
                },
                technicalMetrics: {
                  type: 'object',
                  properties: {
                    apiResponseTime: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          timestamp: { type: 'string', format: 'date-time' },
                          value: { type: 'number' },
                          metadata: { type: 'object' },
                        },
                      },
                    },
                    errorRate: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          timestamp: { type: 'string', format: 'date-time' },
                          value: { type: 'number' },
                          metadata: { type: 'object' },
                        },
                      },
                    },
                    activeConnections: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          timestamp: { type: 'string', format: 'date-time' },
                          value: { type: 'number' },
                          metadata: { type: 'object' },
                        },
                      },
                    },
                    cacheHitRate: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          timestamp: { type: 'string', format: 'date-time' },
                          value: { type: 'number' },
                          metadata: { type: 'object' },
                        },
                      },
                    },
                    databasePerformance: {
                      type: 'object',
                      properties: {
                        queryTime: { type: 'number' },
                        connectionPool: { type: 'number' },
                        slowQueries: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: DashboardQuery }>, reply: FastifyReply): Promise<DashboardResponse> => {
    try {
      const { timeRange = 'day', granularity = 'hour' } = request.query;

      const metrics = await advancedAnalyticsService.getDashboardMetrics(timeRange, granularity);

      // Convert timestamps to ISO strings for JSON serialization
      const convertTimeSeries = (data: any[]) => 
        data.map(item => ({
          ...item,
          timestamp: item.timestamp instanceof Date ? item.timestamp.toISOString() : item.timestamp,
        }));

      return {
        success: true,
        data: {
          ...metrics,
          userMetrics: {
            ...metrics.userMetrics,
            newUsers: convertTimeSeries(metrics.userMetrics.newUsers),
            activeUsers: convertTimeSeries(metrics.userMetrics.activeUsers),
          },
          contentMetrics: {
            ...metrics.contentMetrics,
            streamsPerDay: convertTimeSeries(metrics.contentMetrics.streamsPerDay),
            videosPerDay: convertTimeSeries(metrics.contentMetrics.videosPerDay),
            averageWatchTime: convertTimeSeries(metrics.contentMetrics.averageWatchTime),
          },
          engagementMetrics: {
            ...metrics.engagementMetrics,
            likesPerDay: convertTimeSeries(metrics.engagementMetrics.likesPerDay),
            sharesPerDay: convertTimeSeries(metrics.engagementMetrics.sharesPerDay),
            commentsPerDay: convertTimeSeries(metrics.engagementMetrics.commentsPerDay),
            giftsPerDay: convertTimeSeries(metrics.engagementMetrics.giftsPerDay),
            engagementRate: convertTimeSeries(metrics.engagementMetrics.engagementRate),
          },
          revenueMetrics: {
            ...metrics.revenueMetrics,
            revenuePerDay: convertTimeSeries(metrics.revenueMetrics.revenuePerDay),
            averageRevenuePerUser: convertTimeSeries(metrics.revenueMetrics.averageRevenuePerUser),
            conversionRate: convertTimeSeries(metrics.revenueMetrics.conversionRate),
          },
          technicalMetrics: {
            ...metrics.technicalMetrics,
            apiResponseTime: convertTimeSeries(metrics.technicalMetrics.apiResponseTime),
            errorRate: convertTimeSeries(metrics.technicalMetrics.errorRate),
            activeConnections: convertTimeSeries(metrics.technicalMetrics.activeConnections),
            cacheHitRate: convertTimeSeries(metrics.technicalMetrics.cacheHitRate),
          },
        },
        message: `Dashboard metrics retrieved for ${timeRange} with ${granularity} granularity`,
      };
    } catch (error) {
      fastify.log.error('Error getting dashboard metrics:', error);
      reply.code(500);
      return {
        success: false,
        data: {
          overview: {
            totalUsers: 0,
            activeUsers: 0,
            totalStreams: 0,
            totalVideos: 0,
            totalRevenue: 0,
            engagementRate: 0,
          },
          userMetrics: {
            newUsers: [],
            activeUsers: [],
            userRetention: { day1: 0, day7: 0, day30: 0 },
            userSegments: [],
          },
          contentMetrics: {
            streamsPerDay: [],
            videosPerDay: [],
            averageWatchTime: [],
            topCategories: [],
            topCreators: [],
          },
          engagementMetrics: {
            likesPerDay: [],
            sharesPerDay: [],
            commentsPerDay: [],
            giftsPerDay: [],
            engagementRate: [],
            viralCoefficient: 0,
          },
          revenueMetrics: {
            revenuePerDay: [],
            revenueBySource: [],
            averageRevenuePerUser: [],
            conversionRate: [],
            topRevenueGenerators: [],
          },
          technicalMetrics: {
            apiResponseTime: [],
            errorRate: [],
            activeConnections: [],
            cacheHitRate: [],
            databasePerformance: { queryTime: 0, connectionPool: 0, slowQueries: 0 },
          },
        },
        message: 'Failed to retrieve dashboard metrics',
      };
    }
  });

  /**
   * GET /api/v1/advanced-analytics/predictive-insights
   * Get predictive insights using ML algorithms (admin only)
   */
  fastify.get('/advanced-analytics/predictive-insights', {
    preHandler: [requireAuth, requireAdmin, analyticsRateLimit],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                userGrowth: {
                  type: 'object',
                  properties: {
                    predictedGrowth: { type: 'number' },
                    confidence: { type: 'number' },
                    factors: { type: 'array', items: { type: 'string' } },
                  },
                },
                revenueForecast: {
                  type: 'object',
                  properties: {
                    predictedRevenue: { type: 'number' },
                    confidence: { type: 'number' },
                    trends: { type: 'array', items: { type: 'string' } },
                  },
                },
                contentTrends: {
                  type: 'object',
                  properties: {
                    trendingCategories: { type: 'array', items: { type: 'string' } },
                    predictedTrends: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          category: { type: 'string' },
                          growth: { type: 'number' },
                          confidence: { type: 'number' },
                        },
                      },
                    },
                  },
                },
                churnPrediction: {
                  type: 'object',
                  properties: {
                    atRiskUsers: { type: 'number' },
                    churnProbability: { type: 'number' },
                    interventionSuggestions: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply): Promise<PredictiveInsightsResponse> => {
    try {
      const insights = await advancedAnalyticsService.getPredictiveInsights();

      return {
        success: true,
        data: insights,
        message: 'Predictive insights retrieved successfully',
      };
    } catch (error) {
      fastify.log.error('Error getting predictive insights:', error);
      reply.code(500);
      return {
        success: false,
        data: {
          userGrowth: {
            predictedGrowth: 0,
            confidence: 0,
            factors: ['Unable to generate predictions'],
          },
          revenueForecast: {
            predictedRevenue: 0,
            confidence: 0,
            trends: ['Unable to generate forecast'],
          },
          contentTrends: {
            trendingCategories: [],
            predictedTrends: [],
          },
          churnPrediction: {
            atRiskUsers: 0,
            churnProbability: 0,
            interventionSuggestions: ['Unable to generate predictions'],
          },
        },
        message: 'Failed to retrieve predictive insights',
      };
    }
  });

  /**
   * GET /api/v1/advanced-analytics/real-time
   * Get real-time metrics (admin only)
   */
  fastify.get('/advanced-analytics/real-time', {
    preHandler: [requireAuth, requireAdmin, realTimeRateLimit],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                activeStreams: { type: 'number' },
                activeUsers: { type: 'number' },
                currentRevenue: { type: 'number' },
                topTrendingContent: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      contentId: { type: 'string' },
                      contentType: { type: 'string', enum: ['stream', 'video'] },
                      views: { type: 'number' },
                      engagement: { type: 'number' },
                    },
                  },
                },
                systemHealth: {
                  type: 'object',
                  properties: {
                    apiLatency: { type: 'number' },
                    errorRate: { type: 'number' },
                    activeConnections: { type: 'number' },
                    cacheHitRate: { type: 'number' },
                  },
                },
                alerts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string', enum: ['warning', 'error', 'info'] },
                      message: { type: 'string' },
                      timestamp: { type: 'string', format: 'date-time' },
                      severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                    },
                  },
                },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply): Promise<RealTimeMetricsResponse> => {
    try {
      const realTimeMetrics = await advancedAnalyticsService.getRealTimeMetrics();

      // Convert timestamps to ISO strings
      const alerts = realTimeMetrics.alerts.map(alert => ({
        ...alert,
        timestamp: alert.timestamp.toISOString(),
      }));

      return {
        success: true,
        data: {
          ...realTimeMetrics,
          alerts,
        },
        message: 'Real-time metrics retrieved successfully',
      };
    } catch (error) {
      fastify.log.error('Error getting real-time metrics:', error);
      reply.code(500);
      return {
        success: false,
        data: {
          activeStreams: 0,
          activeUsers: 0,
          currentRevenue: 0,
          topTrendingContent: [],
          systemHealth: {
            apiLatency: 0,
            errorRate: 0,
            activeConnections: 0,
            cacheHitRate: 0,
          },
          alerts: [],
        },
        message: 'Failed to retrieve real-time metrics',
      };
    }
  });

  /**
   * GET /api/v1/advanced-analytics/export
   * Export analytics data (admin only)
   */
  fastify.get<{
    Querystring: {
      format: 'csv' | 'json' | 'xlsx';
      timeRange?: 'hour' | 'day' | 'week' | 'month';
      metrics?: string[];
    };
  }>('/advanced-analytics/export', {
    preHandler: [requireAuth, requireAdmin, analyticsRateLimit, validateInput],
    schema: {
      querystring: {
        type: 'object',
        required: ['format'],
        properties: {
          format: { type: 'string', enum: ['csv', 'json', 'xlsx'] },
          timeRange: { type: 'string', enum: ['hour', 'day', 'week', 'month'], default: 'day' },
          metrics: { type: 'array', items: { type: 'string' } },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                downloadUrl: { type: 'string' },
                filename: { type: 'string' },
                fileSize: { type: 'number' },
                expiresAt: { type: 'string', format: 'date-time' },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{
    Querystring: {
      format: 'csv' | 'json' | 'xlsx';
      timeRange?: 'hour' | 'day' | 'week' | 'month';
      metrics?: string[];
    };
  }>, reply: FastifyReply) => {
    try {
      const { format, timeRange = 'day', metrics = ['all'] } = request.query;
      const adminUser = (request as any).user;

      // Generate export file
      const exportData = await advancedAnalyticsService.getDashboardMetrics(timeRange, 'day');
      
      // Create export file (this would typically use a file generation service)
      const filename = `halobuzz-analytics-${timeRange}-${Date.now()}.${format}`;
      const downloadUrl = `/api/v1/advanced-analytics/download/${filename}`;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Log export action
      await fastify.mongo.db.collection('analytics_events').insertOne({
        userId: adminUser.id,
        eventType: 'admin_action',
        metadata: {
          action: 'export_analytics',
          format,
          timeRange,
          metrics,
          filename,
        },
        timestamp: new Date(),
        appId: 'halobuzz',
      });

      return {
        success: true,
        data: {
          downloadUrl,
          filename,
          fileSize: JSON.stringify(exportData).length, // Mock file size
          expiresAt: expiresAt.toISOString(),
        },
        message: `Analytics data exported successfully in ${format.toUpperCase()} format`,
      };
    } catch (error) {
      fastify.log.error('Error exporting analytics data:', error);
      reply.code(500);
      return {
        success: false,
        data: {
          downloadUrl: '',
          filename: '',
          fileSize: 0,
          expiresAt: new Date().toISOString(),
        },
        message: 'Failed to export analytics data',
      };
    }
  });

  /**
   * GET /api/v1/advanced-analytics/custom-report
   * Generate custom analytics report (admin only)
   */
  fastify.post<{
    Body: {
      name: string;
      description: string;
      metrics: string[];
      filters: {
        timeRange: 'hour' | 'day' | 'week' | 'month';
        granularity: 'minute' | 'hour' | 'day';
        categories?: string[];
        creators?: string[];
        users?: string[];
      };
      schedule?: {
        frequency: 'daily' | 'weekly' | 'monthly';
        time: string; // HH:MM format
        recipients: string[];
      };
    };
  }>('/advanced-analytics/custom-report', {
    preHandler: [requireAuth, requireAdmin, analyticsRateLimit, validateInput],
    schema: {
      body: {
        type: 'object',
        required: ['name', 'description', 'metrics', 'filters'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          metrics: { type: 'array', items: { type: 'string' } },
          filters: {
            type: 'object',
            required: ['timeRange', 'granularity'],
            properties: {
              timeRange: { type: 'string', enum: ['hour', 'day', 'week', 'month'] },
              granularity: { type: 'string', enum: ['minute', 'hour', 'day'] },
              categories: { type: 'array', items: { type: 'string' } },
              creators: { type: 'array', items: { type: 'string' } },
              users: { type: 'array', items: { type: 'string' } },
            },
          },
          schedule: {
            type: 'object',
            properties: {
              frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
              time: { type: 'string' },
              recipients: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                reportId: { type: 'string' },
                reportName: { type: 'string' },
                status: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
                nextRun: { type: 'string', format: 'date-time' },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{
    Body: {
      name: string;
      description: string;
      metrics: string[];
      filters: {
        timeRange: 'hour' | 'day' | 'week' | 'month';
        granularity: 'minute' | 'hour' | 'day';
        categories?: string[];
        creators?: string[];
        users?: string[];
      };
      schedule?: {
        frequency: 'daily' | 'weekly' | 'monthly';
        time: string;
        recipients: string[];
      };
    };
  }>, reply: FastifyReply) => {
    try {
      const adminUser = (request as any).user;
      const { name, description, metrics, filters, schedule } = request.body;

      // Generate report ID
      const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Calculate next run time if scheduled
      let nextRun: Date | null = null;
      if (schedule) {
        nextRun = calculateNextRunTime(schedule.frequency, schedule.time);
      }

      // Store report configuration
      await fastify.mongo.db.collection('custom_reports').insertOne({
        reportId,
        name,
        description,
        metrics,
        filters,
        schedule,
        createdBy: adminUser.id,
        createdAt: new Date(),
        nextRun,
        status: 'active',
      });

      // Log report creation
      await fastify.mongo.db.collection('analytics_events').insertOne({
        userId: adminUser.id,
        eventType: 'admin_action',
        metadata: {
          action: 'create_custom_report',
          reportId,
          reportName: name,
          metrics,
          filters,
          schedule,
        },
        timestamp: new Date(),
        appId: 'halobuzz',
      });

      return {
        success: true,
        data: {
          reportId,
          reportName: name,
          status: 'active',
          createdAt: new Date().toISOString(),
          nextRun: nextRun ? nextRun.toISOString() : null,
        },
        message: 'Custom report created successfully',
      };
    } catch (error) {
      fastify.log.error('Error creating custom report:', error);
      reply.code(500);
      return {
        success: false,
        data: {
          reportId: '',
          reportName: '',
          status: 'error',
          createdAt: new Date().toISOString(),
          nextRun: null,
        },
        message: 'Failed to create custom report',
      };
    }
  });
}

/**
 * Calculate next run time for scheduled reports
 */
function calculateNextRunTime(frequency: string, time: string): Date {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  
  let nextRun = new Date();
  nextRun.setHours(hours, minutes, 0, 0);

  switch (frequency) {
    case 'daily':
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;
    case 'weekly':
      nextRun.setDate(nextRun.getDate() + 7);
      break;
    case 'monthly':
      nextRun.setMonth(nextRun.getMonth() + 1);
      break;
  }

  return nextRun;
}

export default advancedAnalyticsRoutes;

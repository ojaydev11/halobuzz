import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AIContentRecommendationService } from '../services/AIContentRecommendationService';
import { requireAuth } from '../middleware/auth';
import { validateInput } from '../middleware/enhancedSecurity';
import { createRateLimit } from '../middleware/enhancedSecurity';

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

export default async function aiRecommendationRoutes(fastify: FastifyInstance) {
  const aiRecommendationService = new AIContentRecommendationService(
    fastify.mongo.db.collection('users'),
    fastify.mongo.db.collection('livestreams'),
    fastify.mongo.db.collection('shortvideos'),
    fastify.mongo.db.collection('analytics_events'),
    fastify.redis,
  );

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
  fastify.get<{
    Querystring: RecommendationQuery;
  }>('/ai-recommendations', {
    preHandler: [requireAuth, recommendationRateLimit, validateInput],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
          contentType: { type: 'string', enum: ['stream', 'video', 'all'], default: 'all' },
          category: { type: 'string' },
          language: { type: 'string' },
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
                recommendations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      contentId: { type: 'string' },
                      contentType: { type: 'string', enum: ['stream', 'video'] },
                      score: { type: 'number' },
                      reason: { type: 'string' },
                      confidence: { type: 'number' },
                      metadata: {
                        type: 'object',
                        properties: {
                          category: { type: 'string' },
                          creator: { type: 'string' },
                          duration: { type: 'number' },
                          engagement: { type: 'number' },
                        },
                      },
                    },
                  },
                },
                totalCount: { type: 'number' },
                generatedAt: { type: 'string', format: 'date-time' },
                cacheHit: { type: 'boolean' },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: RecommendationQuery }>, reply: FastifyReply): Promise<RecommendationResponse> => {
    try {
      const userId = (request as any).user.id;
      const { limit = 20, contentType = 'all', category, language } = request.query;

      // Check for cached recommendations first
      const cachedRecommendations = await aiRecommendationService.getCachedRecommendations(userId);
      
      let recommendations;
      let cacheHit = false;

      if (cachedRecommendations && cachedRecommendations.length > 0) {
        recommendations = cachedRecommendations;
        cacheHit = true;
      } else {
        // Generate new recommendations
        recommendations = await aiRecommendationService.generateRecommendations(
          userId,
          limit,
          contentType,
        );
      }

      // Apply additional filters if specified
      if (category || language) {
        recommendations = recommendations.filter(rec => {
          if (category && rec.metadata.category !== category) return false;
          if (language && rec.metadata.language !== language) return false;
          return true;
        });
      }

      // Log recommendation request for analytics
      await fastify.mongo.db.collection('analytics_events').insertOne({
        userId,
        eventType: 'recommendation_request',
        metadata: {
          limit,
          contentType,
          category,
          language,
          cacheHit,
          recommendationCount: recommendations.length,
        },
        timestamp: new Date(),
        appId: 'halobuzz',
      });

      return {
        success: true,
        data: {
          recommendations,
          totalCount: recommendations.length,
          generatedAt: new Date(),
          cacheHit,
        },
        message: `Generated ${recommendations.length} personalized recommendations`,
      };
    } catch (error) {
      fastify.log.error('Error getting AI recommendations:', error);
      reply.code(500);
      return {
        success: false,
        data: {
          recommendations: [],
          totalCount: 0,
          generatedAt: new Date(),
          cacheHit: false,
        },
        message: 'Failed to generate recommendations',
      };
    }
  });

  /**
   * POST /api/v1/ai-recommendations/feedback
   * Provide feedback on recommendations to improve the algorithm
   */
  fastify.post<{
    Body: {
      contentId: string;
      contentType: 'stream' | 'video';
      action: 'click' | 'like' | 'share' | 'skip' | 'watch';
      watchTime?: number;
      rating?: number;
    };
  }>('/ai-recommendations/feedback', {
    preHandler: [requireAuth, recommendationRateLimit, validateInput],
    schema: {
      body: {
        type: 'object',
        required: ['contentId', 'contentType', 'action'],
        properties: {
          contentId: { type: 'string' },
          contentType: { type: 'string', enum: ['stream', 'video'] },
          action: { type: 'string', enum: ['click', 'like', 'share', 'skip', 'watch'] },
          watchTime: { type: 'number', minimum: 0 },
          rating: { type: 'number', minimum: 1, maximum: 5 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{
    Body: {
      contentId: string;
      contentType: 'stream' | 'video';
      action: 'click' | 'like' | 'share' | 'skip' | 'watch';
      watchTime?: number;
      rating?: number;
    };
  }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.id;
      const { contentId, contentType, action, watchTime, rating } = request.body;

      // Update user preferences based on feedback
      await aiRecommendationService.updateUserPreferences(userId, contentId, contentType, action);

      // Log feedback for analytics
      await fastify.mongo.db.collection('analytics_events').insertOne({
        userId,
        eventType: 'recommendation_feedback',
        metadata: {
          contentId,
          contentType,
          action,
          watchTime,
          rating,
        },
        timestamp: new Date(),
        appId: 'halobuzz',
      });

      return {
        success: true,
        message: 'Feedback recorded successfully',
      };
    } catch (error) {
      fastify.log.error('Error recording recommendation feedback:', error);
      reply.code(500);
      return {
        success: false,
        message: 'Failed to record feedback',
      };
    }
  });

  /**
   * GET /api/v1/ai-recommendations/analytics
   * Get recommendation analytics for admin dashboard (admin only)
   */
  fastify.get('/ai-recommendations/analytics', {
    preHandler: [requireAuth, analyticsRateLimit],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                totalRecommendations: { type: 'number' },
                averageScore: { type: 'number' },
                topCategories: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      category: { type: 'string' },
                      count: { type: 'number' },
                    },
                  },
                },
                userEngagement: {
                  type: 'object',
                  properties: {
                    clickThroughRate: { type: 'number' },
                    watchTime: { type: 'number' },
                    conversionRate: { type: 'number' },
                  },
                },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply): Promise<AnalyticsResponse> => {
    try {
      const user = (request as any).user;
      
      // Check if user is admin
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        reply.code(403);
        return {
          success: false,
          data: {
            totalRecommendations: 0,
            averageScore: 0,
            topCategories: [],
            userEngagement: {
              clickThroughRate: 0,
              watchTime: 0,
              conversionRate: 0,
            },
          },
          message: 'Access denied. Admin privileges required.',
        };
      }

      const analytics = await aiRecommendationService.getRecommendationAnalytics();

      return {
        success: true,
        data: analytics,
        message: 'Recommendation analytics retrieved successfully',
      };
    } catch (error) {
      fastify.log.error('Error getting recommendation analytics:', error);
      reply.code(500);
      return {
        success: false,
        data: {
          totalRecommendations: 0,
          averageScore: 0,
          topCategories: [],
          userEngagement: {
            clickThroughRate: 0,
            watchTime: 0,
            conversionRate: 0,
          },
        },
        message: 'Failed to retrieve analytics',
      };
    }
  });

  /**
   * POST /api/v1/ai-recommendations/refresh
   * Force refresh recommendations for a user (admin only)
   */
  fastify.post<{
    Body: {
      userId: string;
      contentType?: 'stream' | 'video' | 'all';
    };
  }>('/ai-recommendations/refresh', {
    preHandler: [requireAuth, analyticsRateLimit, validateInput],
    schema: {
      body: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' },
          contentType: { type: 'string', enum: ['stream', 'video', 'all'] },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{
    Body: {
      userId: string;
      contentType?: 'stream' | 'video' | 'all';
    };
  }>, reply: FastifyReply) => {
    try {
      const adminUser = (request as any).user;
      
      // Check if user is admin
      if (adminUser.role !== 'admin' && adminUser.role !== 'super_admin') {
        reply.code(403);
        return {
          success: false,
          message: 'Access denied. Admin privileges required.',
        };
      }

      const { userId, contentType = 'all' } = request.body;

      // Clear cached recommendations
      await fastify.redis.del(`recommendations:${userId}`);

      // Generate new recommendations
      const recommendations = await aiRecommendationService.generateRecommendations(
        userId,
        20,
        contentType,
      );

      // Log admin action
      await fastify.mongo.db.collection('analytics_events').insertOne({
        userId: adminUser.id,
        eventType: 'admin_action',
        metadata: {
          action: 'refresh_recommendations',
          targetUserId: userId,
          contentType,
          recommendationCount: recommendations.length,
        },
        timestamp: new Date(),
        appId: 'halobuzz',
      });

      return {
        success: true,
        message: `Refreshed ${recommendations.length} recommendations for user ${userId}`,
      };
    } catch (error) {
      fastify.log.error('Error refreshing recommendations:', error);
      reply.code(500);
      return {
        success: false,
        message: 'Failed to refresh recommendations',
      };
    }
  });

  /**
   * GET /api/v1/ai-recommendations/trending
   * Get trending content recommendations
   */
  fastify.get<{
    Querystring: {
      limit?: number;
      category?: string;
      timeRange?: 'hour' | 'day' | 'week';
    };
  }>('/ai-recommendations/trending', {
    preHandler: [recommendationRateLimit],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
          category: { type: 'string' },
          timeRange: { type: 'string', enum: ['hour', 'day', 'week'], default: 'day' },
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
                trendingContent: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      contentId: { type: 'string' },
                      contentType: { type: 'string', enum: ['stream', 'video'] },
                      engagement: { type: 'number' },
                      growth: { type: 'number' },
                      metadata: {
                        type: 'object',
                        properties: {
                          category: { type: 'string' },
                          creator: { type: 'string' },
                          title: { type: 'string' },
                        },
                      },
                    },
                  },
                },
                timeRange: { type: 'string' },
                generatedAt: { type: 'string', format: 'date-time' },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{
    Querystring: {
      limit?: number;
      category?: string;
      timeRange?: 'hour' | 'day' | 'week';
    };
  }>, reply: FastifyReply) => {
    try {
      const { limit = 20, category, timeRange = 'day' } = request.query;

      // Calculate time range
      const now = new Date();
      let startTime: Date;
      
      switch (timeRange) {
        case 'hour':
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case 'day':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      // Get trending content based on engagement
      const trendingQuery: any = {
        timestamp: { $gte: startTime },
        eventType: { $in: ['content_like', 'content_share', 'content_comment', 'content_watch'] },
      };

      if (category) {
        trendingQuery['metadata.category'] = category;
      }

      const trendingEvents = await fastify.mongo.db.collection('analytics_events')
        .aggregate([
          { $match: trendingQuery },
          {
            $group: {
              _id: '$metadata.contentId',
              contentType: { $first: '$metadata.contentType' },
              category: { $first: '$metadata.category' },
              creator: { $first: '$metadata.creatorId' },
              title: { $first: '$metadata.title' },
              totalEngagement: {
                $sum: {
                  $cond: [
                    { $eq: ['$eventType', 'content_watch'] },
                    { $multiply: ['$metadata.watchTime', 0.1] },
                    { $cond: [
                      { $eq: ['$eventType', 'content_like'] },
                      1,
                      { $cond: [
                        { $eq: ['$eventType', 'content_share'] },
                        3,
                        { $cond: [
                          { $eq: ['$eventType', 'content_comment'] },
                          2,
                          0
                        ]}
                      ]}
                    ]}
                  ]
                }
              },
              engagementCount: { $sum: 1 },
            },
          },
          { $sort: { totalEngagement: -1 } },
          { $limit: limit },
        ])
        .toArray();

      const trendingContent = trendingEvents.map(event => ({
        contentId: event._id,
        contentType: event.contentType,
        engagement: event.totalEngagement,
        growth: event.engagementCount,
        metadata: {
          category: event.category,
          creator: event.creator,
          title: event.title,
        },
      }));

      return {
        success: true,
        data: {
          trendingContent,
          timeRange,
          generatedAt: new Date(),
        },
        message: `Retrieved ${trendingContent.length} trending content items`,
      };
    } catch (error) {
      fastify.log.error('Error getting trending content:', error);
      reply.code(500);
      return {
        success: false,
        data: {
          trendingContent: [],
          timeRange: 'day',
          generatedAt: new Date(),
        },
        message: 'Failed to retrieve trending content',
      };
    }
  });
}

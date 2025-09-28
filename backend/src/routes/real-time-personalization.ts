import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { RealTimePersonalizationService } from '../services/RealTimePersonalizationService';
import { requireAuth, requireAdmin } from '../middleware/enhancedSecurity';
import { validateInput } from '../middleware/enhancedSecurity';
import { createRateLimit } from '../middleware/enhancedSecurity';

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

export default async function realTimePersonalizationRoutes(fastify: FastifyInstance) {
  const realTimePersonalizationService = new RealTimePersonalizationService(
    fastify.mongo.db.collection('analytics_events'),
    fastify.mongo.db.collection('users'),
    fastify.mongo.db.collection('livestreams'),
    fastify.mongo.db.collection('shortvideos'),
    fastify.redis,
  );

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
  fastify.get<{
    Querystring: ContentFeedRequest;
  }>('/personalization/content-feed', {
    preHandler: [requireAuth, personalizationRateLimit, validateInput],
    schema: {
      querystring: {
        type: 'object',
        required: ['sessionId', 'currentPage'],
        properties: {
          sessionId: { type: 'string' },
          currentPage: { type: 'string' },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  contentId: { type: 'string' },
                  contentType: { type: 'string', enum: ['stream', 'video', 'ad', 'notification'] },
                  personalizationScore: { type: 'number' },
                  reason: { type: 'string' },
                  metadata: {
                    type: 'object',
                    properties: {
                      category: { type: 'string' },
                      creator: { type: 'string' },
                      duration: { type: 'number' },
                      engagement: { type: 'number' },
                    },
                  },
                  adaptations: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        type: { type: 'string' },
                        originalValue: { type: 'object' },
                        personalizedValue: { type: 'object' },
                        reason: { type: 'string' },
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
  }, async (request: FastifyRequest<{ Querystring: ContentFeedRequest }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.id;
      const { sessionId, currentPage, limit = 20 } = request.query;

      const personalizedContent = await realTimePersonalizationService.personalizeContentFeed(
        userId,
        sessionId,
        currentPage,
      );

      // Apply limit
      const limitedContent = personalizedContent.slice(0, limit);

      return {
        success: true,
        data: limitedContent,
        message: `Generated ${limitedContent.length} personalized content items`,
      };
    } catch (error) {
      fastify.log.error('Error personalizing content feed:', error);
      reply.code(500);
      return {
        success: false,
        data: [],
        message: 'Failed to personalize content feed',
      };
    }
  });

  /**
   * GET /api/v1/personalization/ui
   * Get personalized UI elements for user
   */
  fastify.get<{
    Querystring: UIPersonalizationRequest;
  }>('/personalization/ui', {
    preHandler: [requireAuth, personalizationRateLimit, validateInput],
    schema: {
      querystring: {
        type: 'object',
        required: ['sessionId', 'currentPage'],
        properties: {
          sessionId: { type: 'string' },
          currentPage: { type: 'string' },
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
                layout: {
                  type: 'object',
                  properties: {
                    recommendedContent: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          contentId: { type: 'string' },
                          contentType: { type: 'string' },
                          personalizationScore: { type: 'number' },
                          reason: { type: 'string' },
                          metadata: { type: 'object' },
                          adaptations: { type: 'array' },
                        },
                      },
                    },
                    trendingContent: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          contentId: { type: 'string' },
                          contentType: { type: 'string' },
                          personalizationScore: { type: 'number' },
                          reason: { type: 'string' },
                          metadata: { type: 'object' },
                          adaptations: { type: 'array' },
                        },
                      },
                    },
                    followingContent: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          contentId: { type: 'string' },
                          contentType: { type: 'string' },
                          personalizationScore: { type: 'number' },
                          reason: { type: 'string' },
                          metadata: { type: 'object' },
                          adaptations: { type: 'array' },
                        },
                      },
                    },
                    categories: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          order: { type: 'number' },
                          isVisible: { type: 'boolean' },
                        },
                      },
                    },
                  },
                },
                features: {
                  type: 'object',
                  properties: {
                    showNotifications: { type: 'boolean' },
                    showTrending: { type: 'boolean' },
                    showFollowing: { type: 'boolean' },
                    showRecommendations: { type: 'boolean' },
                    showAds: { type: 'boolean' },
                  },
                },
                styling: {
                  type: 'object',
                  properties: {
                    theme: { type: 'string', enum: ['light', 'dark', 'auto'] },
                    fontSize: { type: 'string', enum: ['small', 'medium', 'large'] },
                    colorScheme: { type: 'string' },
                  },
                },
                interactions: {
                  type: 'object',
                  properties: {
                    autoPlay: { type: 'boolean' },
                    showSubtitles: { type: 'boolean' },
                    enableComments: { type: 'boolean' },
                    enableSharing: { type: 'boolean' },
                  },
                },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: UIPersonalizationRequest }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.id;
      const { sessionId, currentPage } = request.query;

      const personalizedUI = await realTimePersonalizationService.personalizeUI(
        userId,
        sessionId,
        currentPage,
      );

      return {
        success: true,
        data: personalizedUI,
        message: 'UI personalized successfully',
      };
    } catch (error) {
      fastify.log.error('Error personalizing UI:', error);
      reply.code(500);
      return {
        success: false,
        data: {
          layout: {
            recommendedContent: [],
            trendingContent: [],
            followingContent: [],
            categories: [],
          },
          features: {
            showNotifications: true,
            showTrending: true,
            showFollowing: true,
            showRecommendations: true,
            showAds: true,
          },
          styling: {
            theme: 'light',
            fontSize: 'medium',
            colorScheme: 'default',
          },
          interactions: {
            autoPlay: false,
            showSubtitles: false,
            enableComments: true,
            enableSharing: true,
          },
        },
        message: 'Failed to personalize UI',
      };
    }
  });

  /**
   * GET /api/v1/personalization/notifications
   * Get personalized notifications for user
   */
  fastify.get<{
    Querystring: NotificationPersonalizationRequest;
  }>('/personalization/notifications', {
    preHandler: [requireAuth, personalizationRateLimit, validateInput],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  title: { type: 'string' },
                  message: { type: 'string' },
                  priority: { type: 'string', enum: ['low', 'medium', 'high'] },
                  timing: { type: 'string', format: 'date-time' },
                  personalizationScore: { type: 'number' },
                },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: NotificationPersonalizationRequest }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.id;
      const { limit = 10 } = request.query;

      const personalizedNotifications = await realTimePersonalizationService.personalizeNotifications(userId);

      // Apply limit
      const limitedNotifications = personalizedNotifications.slice(0, limit);

      return {
        success: true,
        data: limitedNotifications,
        message: `Generated ${limitedNotifications.length} personalized notifications`,
      };
    } catch (error) {
      fastify.log.error('Error personalizing notifications:', error);
      reply.code(500);
      return {
        success: false,
        data: [],
        message: 'Failed to personalize notifications',
      };
    }
  });

  /**
   * POST /api/v1/personalization/pricing
   * Get personalized pricing for user
   */
  fastify.post<{
    Body: PricingPersonalizationRequest;
  }>('/personalization/pricing', {
    preHandler: [requireAuth, personalizationRateLimit, validateInput],
    schema: {
      body: {
        type: 'object',
        required: ['productId', 'basePrice'],
        properties: {
          productId: { type: 'string' },
          basePrice: { type: 'number', minimum: 0 },
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
                personalizedPrice: { type: 'number' },
                discount: { type: 'number' },
                reason: { type: 'string' },
                personalizationScore: { type: 'number' },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: PricingPersonalizationRequest }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.id;
      const { productId, basePrice } = request.body;

      const pricingResult = await realTimePersonalizationService.personalizePricing(
        userId,
        productId,
        basePrice,
      );

      return {
        success: true,
        data: pricingResult,
        message: 'Pricing personalized successfully',
      };
    } catch (error) {
      fastify.log.error('Error personalizing pricing:', error);
      reply.code(500);
      return {
        success: false,
        data: {
          personalizedPrice: 0,
          discount: 0,
          reason: 'Personalization failed',
          personalizationScore: 0,
        },
        message: 'Failed to personalize pricing',
      };
    }
  });

  /**
   * POST /api/v1/personalization/rules
   * Create personalization rule (admin only)
   */
  fastify.post<{
    Body: PersonalizationRuleRequest;
  }>('/personalization/rules', {
    preHandler: [requireAuth, requireAdmin, adminRateLimit, validateInput],
    schema: {
      body: {
        type: 'object',
        required: ['name', 'description', 'conditions', 'actions', 'priority', 'isActive'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          conditions: {
            type: 'array',
            items: {
              type: 'object',
              required: ['field', 'operator', 'value'],
              properties: {
                field: { type: 'string' },
                operator: { type: 'string', enum: ['equals', 'contains', 'greater_than', 'less_than', 'in', 'not_in'] },
                value: { type: 'object' },
              },
            },
          },
          actions: {
            type: 'array',
            items: {
              type: 'object',
              required: ['type', 'config'],
              properties: {
                type: { type: 'string', enum: ['show_content', 'hide_content', 'modify_ui', 'send_notification', 'adjust_pricing'] },
                config: { type: 'object' },
              },
            },
          },
          priority: { type: 'number', minimum: 1, maximum: 100 },
          isActive: { type: 'boolean' },
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
                ruleId: { type: 'string' },
                name: { type: 'string' },
                status: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: PersonalizationRuleRequest }>, reply: FastifyReply) => {
    try {
      const adminUser = (request as any).user;
      const ruleConfig = request.body;

      const rule = await realTimePersonalizationService.createPersonalizationRule(ruleConfig);

      // Log rule creation
      await fastify.mongo.db.collection('analytics_events').insertOne({
        userId: adminUser.id,
        eventType: 'admin_action',
        metadata: {
          action: 'create_personalization_rule',
          ruleId: rule.ruleId,
          ruleName: rule.name,
          conditions: rule.conditions.length,
          actions: rule.actions.length,
        },
        timestamp: new Date(),
        appId: 'halobuzz',
      });

      return {
        success: true,
        data: {
          ruleId: rule.ruleId,
          name: rule.name,
          status: rule.isActive ? 'active' : 'inactive',
          createdAt: rule.createdAt.toISOString(),
        },
        message: 'Personalization rule created successfully',
      };
    } catch (error) {
      fastify.log.error('Error creating personalization rule:', error);
      reply.code(500);
      return {
        success: false,
        data: {
          ruleId: '',
          name: '',
          status: 'error',
          createdAt: new Date().toISOString(),
        },
        message: 'Failed to create personalization rule',
      };
    }
  });

  /**
   * GET /api/v1/personalization/metrics
   * Get personalization metrics (admin only)
   */
  fastify.get<{
    Querystring: {
      timeRange?: 'hour' | 'day' | 'week' | 'month';
    };
  }>('/personalization/metrics', {
    preHandler: [requireAuth, requireAdmin, adminRateLimit],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          timeRange: { type: 'string', enum: ['hour', 'day', 'week', 'month'], default: 'day' },
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
                totalPersonalizations: { type: 'number' },
                successRate: { type: 'number' },
                userSatisfaction: { type: 'number' },
                engagementImprovement: { type: 'number' },
                conversionImprovement: { type: 'number' },
                topPersonalizationTypes: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string' },
                      count: { type: 'number' },
                      successRate: { type: 'number' },
                    },
                  },
                },
                userSegments: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      segment: { type: 'string' },
                      personalizationCount: { type: 'number' },
                      averageScore: { type: 'number' },
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
  }, async (request: FastifyRequest<{ Querystring: { timeRange?: 'hour' | 'day' | 'week' | 'month' } }>, reply: FastifyReply) => {
    try {
      const { timeRange = 'day' } = request.query;

      const metrics = await realTimePersonalizationService.getPersonalizationMetrics(timeRange);

      return {
        success: true,
        data: metrics,
        message: 'Personalization metrics retrieved successfully',
      };
    } catch (error) {
      fastify.log.error('Error getting personalization metrics:', error);
      reply.code(500);
      return {
        success: false,
        data: {
          totalPersonalizations: 0,
          successRate: 0,
          userSatisfaction: 0,
          engagementImprovement: 0,
          conversionImprovement: 0,
          topPersonalizationTypes: [],
          userSegments: [],
        },
        message: 'Failed to retrieve personalization metrics',
      };
    }
  });

  /**
   * GET /api/v1/personalization/user-context
   * Get user context for personalization (admin only)
   */
  fastify.get<{
    Params: { userId: string };
    Querystring: {
      sessionId?: string;
      currentPage?: string;
    };
  }>('/personalization/user-context/:userId', {
    preHandler: [requireAuth, requireAdmin, adminRateLimit],
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          sessionId: { type: 'string' },
          currentPage: { type: 'string' },
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
                userId: { type: 'string' },
                sessionId: { type: 'string' },
                currentPage: { type: 'string' },
                deviceInfo: { type: 'object' },
                location: { type: 'object' },
                behavior: { type: 'object' },
                preferences: { type: 'object' },
                realTimeData: { type: 'object' },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { userId: string }; Querystring: { sessionId?: string; currentPage?: string } }>, reply: FastifyReply) => {
    try {
      const { userId } = request.params;
      const { sessionId = '', currentPage = 'home' } = request.query;

      const userContext = await realTimePersonalizationService.buildUserContext(
        userId,
        sessionId,
        currentPage,
      );

      return {
        success: true,
        data: userContext,
        message: 'User context retrieved successfully',
      };
    } catch (error) {
      fastify.log.error('Error getting user context:', error);
      reply.code(500);
      return {
        success: false,
        data: {
          userId: '',
          sessionId: '',
          currentPage: '',
          deviceInfo: {},
          location: {},
          behavior: {},
          preferences: {},
          realTimeData: {},
        },
        message: 'Failed to retrieve user context',
      };
    }
  });

  /**
   * POST /api/v1/personalization/feedback
   * Provide feedback on personalization
   */
  fastify.post<{
    Body: {
      personalizationType: string;
      contentId?: string;
      rating: number;
      feedback?: string;
    };
  }>('/personalization/feedback', {
    preHandler: [requireAuth, personalizationRateLimit, validateInput],
    schema: {
      body: {
        type: 'object',
        required: ['personalizationType', 'rating'],
        properties: {
          personalizationType: { type: 'string' },
          contentId: { type: 'string' },
          rating: { type: 'number', minimum: 1, maximum: 5 },
          feedback: { type: 'string' },
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
  }, async (request: FastifyRequest<{ Body: { personalizationType: string; contentId?: string; rating: number; feedback?: string } }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.id;
      const { personalizationType, contentId, rating, feedback } = request.body;

      // Log feedback
      await fastify.mongo.db.collection('analytics_events').insertOne({
        userId,
        eventType: 'personalization_feedback',
        metadata: {
          personalizationType,
          contentId,
          rating,
          feedback,
        },
        timestamp: new Date(),
        appId: 'halobuzz',
      });

      return {
        success: true,
        message: 'Personalization feedback recorded successfully',
      };
    } catch (error) {
      fastify.log.error('Error recording personalization feedback:', error);
      reply.code(500);
      return {
        success: false,
        message: 'Failed to record personalization feedback',
      };
    }
  });
}

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { MachineLearningOptimizationService } from '../services/MachineLearningOptimizationService';
import { requireAuth, requireAdmin } from '../middleware/enhancedSecurity';
import { validateInput } from '../middleware/enhancedSecurity';
import { createRateLimit } from '../middleware/enhancedSecurity';

interface ABTestCreateRequest {
  name: string;
  description: string;
  hypothesis: string;
  variants: Array<{
    variantId: string;
    name: string;
    weight: number;
    config: any;
  }>;
  targetAudience: {
    userSegments?: string[];
    demographics?: {
      ageRange?: [number, number];
      location?: string[];
      deviceType?: string[];
    };
    behavior?: {
      minEngagement?: number;
      minWatchTime?: number;
      minSessions?: number;
    };
  };
  metrics: Array<{
    metricName: string;
    metricType: 'conversion' | 'engagement' | 'revenue' | 'retention';
    targetValue?: number;
    isPrimary: boolean;
  }>;
  duration: number;
}

interface ModelTrainRequest {
  name: string;
  type: 'classification' | 'regression' | 'clustering';
  algorithm: 'random_forest' | 'neural_network' | 'linear_regression' | 'kmeans';
  features: string[];
  target: string;
  trainingData: any[];
}

interface PredictionRequest {
  modelId: string;
  inputData: any;
}

export default async function mlOptimizationRoutes(fastify: FastifyInstance) {
  const mlOptimizationService = new MachineLearningOptimizationService(
    fastify.mongo.db.collection('analytics_events'),
    fastify.mongo.db.collection('users'),
    fastify.redis,
  );

  // Rate limiting for ML endpoints
  const mlRateLimit = createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: 'Too many ML requests, please try again later',
  });

  const predictionRateLimit = createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 predictions per minute
    message: 'Too many prediction requests, please try again later',
  });

  /**
   * POST /api/v1/ml-optimization/ab-test/create
   * Create a new A/B test (admin only)
   */
  fastify.post<{
    Body: ABTestCreateRequest;
  }>('/ml-optimization/ab-test/create', {
    preHandler: [requireAuth, requireAdmin, mlRateLimit, validateInput],
    schema: {
      body: {
        type: 'object',
        required: ['name', 'description', 'hypothesis', 'variants', 'metrics', 'duration'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          hypothesis: { type: 'string' },
          variants: {
            type: 'array',
            items: {
              type: 'object',
              required: ['variantId', 'name', 'weight', 'config'],
              properties: {
                variantId: { type: 'string' },
                name: { type: 'string' },
                weight: { type: 'number', minimum: 0, maximum: 1 },
                config: { type: 'object' },
              },
            },
          },
          targetAudience: {
            type: 'object',
            properties: {
              userSegments: { type: 'array', items: { type: 'string' } },
              demographics: {
                type: 'object',
                properties: {
                  ageRange: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2 },
                  location: { type: 'array', items: { type: 'string' } },
                  deviceType: { type: 'array', items: { type: 'string' } },
                },
              },
              behavior: {
                type: 'object',
                properties: {
                  minEngagement: { type: 'number' },
                  minWatchTime: { type: 'number' },
                  minSessions: { type: 'number' },
                },
              },
            },
          },
          metrics: {
            type: 'array',
            items: {
              type: 'object',
              required: ['metricName', 'metricType', 'isPrimary'],
              properties: {
                metricName: { type: 'string' },
                metricType: { type: 'string', enum: ['conversion', 'engagement', 'revenue', 'retention'] },
                targetValue: { type: 'number' },
                isPrimary: { type: 'boolean' },
              },
            },
          },
          duration: { type: 'number', minimum: 1, maximum: 365 },
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
                testId: { type: 'string' },
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
  }, async (request: FastifyRequest<{ Body: ABTestCreateRequest }>, reply: FastifyReply) => {
    try {
      const adminUser = (request as any).user;
      const abTestConfig = request.body;

      const abTest = await mlOptimizationService.createABTest(abTestConfig);

      // Log A/B test creation
      await fastify.mongo.db.collection('analytics_events').insertOne({
        userId: adminUser.id,
        eventType: 'admin_action',
        metadata: {
          action: 'create_ab_test',
          testId: abTest.testId,
          testName: abTest.name,
          variants: abTest.variants.length,
          metrics: abTest.metrics.length,
        },
        timestamp: new Date(),
        appId: 'halobuzz',
      });

      return {
        success: true,
        data: {
          testId: abTest.testId,
          name: abTest.name,
          status: abTest.status,
          createdAt: abTest.createdAt.toISOString(),
        },
        message: 'A/B test created successfully',
      };
    } catch (error) {
      fastify.log.error('Error creating A/B test:', error);
      reply.code(500);
      return {
        success: false,
        data: {
          testId: '',
          name: '',
          status: 'error',
          createdAt: new Date().toISOString(),
        },
        message: 'Failed to create A/B test',
      };
    }
  });

  /**
   * POST /api/v1/ml-optimization/ab-test/:testId/start
   * Start an A/B test (admin only)
   */
  fastify.post<{
    Params: { testId: string };
  }>('/ml-optimization/ab-test/:testId/start', {
    preHandler: [requireAuth, requireAdmin, mlRateLimit],
    schema: {
      params: {
        type: 'object',
        required: ['testId'],
        properties: {
          testId: { type: 'string' },
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
  }, async (request: FastifyRequest<{ Params: { testId: string } }>, reply: FastifyReply) => {
    try {
      const { testId } = request.params;
      const adminUser = (request as any).user;

      const success = await mlOptimizationService.startABTest(testId);

      if (success) {
        // Log A/B test start
        await fastify.mongo.db.collection('analytics_events').insertOne({
          userId: adminUser.id,
          eventType: 'admin_action',
          metadata: {
            action: 'start_ab_test',
            testId,
          },
          timestamp: new Date(),
          appId: 'halobuzz',
        });

        return {
          success: true,
          message: 'A/B test started successfully',
        };
      } else {
        reply.code(400);
        return {
          success: false,
          message: 'Failed to start A/B test',
        };
      }
    } catch (error) {
      fastify.log.error('Error starting A/B test:', error);
      reply.code(500);
      return {
        success: false,
        message: 'Failed to start A/B test',
      };
    }
  });

  /**
   * GET /api/v1/ml-optimization/ab-test/:testId/results
   * Get A/B test results (admin only)
   */
  fastify.get<{
    Params: { testId: string };
  }>('/ml-optimization/ab-test/:testId/results', {
    preHandler: [requireAuth, requireAdmin, mlRateLimit],
    schema: {
      params: {
        type: 'object',
        required: ['testId'],
        properties: {
          testId: { type: 'string' },
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
                testId: { type: 'string' },
                variantResults: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      variantId: { type: 'string' },
                      variantName: { type: 'string' },
                      participants: { type: 'number' },
                      conversions: { type: 'number' },
                      conversionRate: { type: 'number' },
                      confidence: { type: 'number' },
                      statisticalSignificance: { type: 'boolean' },
                      metrics: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            metricName: { type: 'string' },
                            value: { type: 'number' },
                            improvement: { type: 'number' },
                          },
                        },
                      },
                    },
                  },
                },
                winner: {
                  type: 'object',
                  properties: {
                    variantId: { type: 'string' },
                    variantName: { type: 'string' },
                    improvement: { type: 'number' },
                    confidence: { type: 'number' },
                  },
                },
                recommendations: { type: 'array', items: { type: 'string' } },
                status: { type: 'string' },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { testId: string } }>, reply: FastifyReply) => {
    try {
      const { testId } = request.params;

      const results = await mlOptimizationService.getABTestResults(testId);

      if (results) {
        return {
          success: true,
          data: results,
          message: 'A/B test results retrieved successfully',
        };
      } else {
        reply.code(404);
        return {
          success: false,
          data: {
            testId: '',
            variantResults: [],
            winner: null,
            recommendations: [],
            status: 'not_found',
          },
          message: 'A/B test not found',
        };
      }
    } catch (error) {
      fastify.log.error('Error getting A/B test results:', error);
      reply.code(500);
      return {
        success: false,
        data: {
          testId: '',
          variantResults: [],
          winner: null,
          recommendations: [],
          status: 'error',
        },
        message: 'Failed to retrieve A/B test results',
      };
    }
  });

  /**
   * POST /api/v1/ml-optimization/ab-test/assign
   * Assign user to A/B test variant
   */
  fastify.post<{
    Body: {
      testId: string;
    };
  }>('/ml-optimization/ab-test/assign', {
    preHandler: [requireAuth, predictionRateLimit],
    schema: {
      body: {
        type: 'object',
        required: ['testId'],
        properties: {
          testId: { type: 'string' },
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
                variantId: { type: 'string' },
                testId: { type: 'string' },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: { testId: string } }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.id;
      const { testId } = request.body;

      const variantId = await mlOptimizationService.assignUserToVariant(userId, testId);

      if (variantId) {
        return {
          success: true,
          data: {
            variantId,
            testId,
          },
          message: 'User assigned to A/B test variant',
        };
      } else {
        reply.code(400);
        return {
          success: false,
          data: {
            variantId: '',
            testId: '',
          },
          message: 'User not eligible for A/B test or test not active',
        };
      }
    } catch (error) {
      fastify.log.error('Error assigning user to variant:', error);
      reply.code(500);
      return {
        success: false,
        data: {
          variantId: '',
          testId: '',
        },
        message: 'Failed to assign user to variant',
      };
    }
  });

  /**
   * POST /api/v1/ml-optimization/ab-test/conversion
   * Record conversion for A/B test
   */
  fastify.post<{
    Body: {
      testId: string;
      metricName: string;
      value?: number;
    };
  }>('/ml-optimization/ab-test/conversion', {
    preHandler: [requireAuth, predictionRateLimit],
    schema: {
      body: {
        type: 'object',
        required: ['testId', 'metricName'],
        properties: {
          testId: { type: 'string' },
          metricName: { type: 'string' },
          value: { type: 'number', default: 1 },
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
  }, async (request: FastifyRequest<{ Body: { testId: string; metricName: string; value?: number } }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.id;
      const { testId, metricName, value = 1 } = request.body;

      await mlOptimizationService.recordConversion(userId, testId, metricName, value);

      return {
        success: true,
        message: 'Conversion recorded successfully',
      };
    } catch (error) {
      fastify.log.error('Error recording conversion:', error);
      reply.code(500);
      return {
        success: false,
        message: 'Failed to record conversion',
      };
    }
  });

  /**
   * POST /api/v1/ml-optimization/model/train
   * Train a machine learning model (admin only)
   */
  fastify.post<{
    Body: ModelTrainRequest;
  }>('/ml-optimization/model/train', {
    preHandler: [requireAuth, requireAdmin, mlRateLimit, validateInput],
    schema: {
      body: {
        type: 'object',
        required: ['name', 'type', 'algorithm', 'features', 'target', 'trainingData'],
        properties: {
          name: { type: 'string' },
          type: { type: 'string', enum: ['classification', 'regression', 'clustering'] },
          algorithm: { type: 'string', enum: ['random_forest', 'neural_network', 'linear_regression', 'kmeans'] },
          features: { type: 'array', items: { type: 'string' } },
          target: { type: 'string' },
          trainingData: { type: 'array' },
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
                modelId: { type: 'string' },
                name: { type: 'string' },
                type: { type: 'string' },
                algorithm: { type: 'string' },
                accuracy: { type: 'number' },
                status: { type: 'string' },
                lastTrained: { type: 'string', format: 'date-time' },
                performance: {
                  type: 'object',
                  properties: {
                    trainingAccuracy: { type: 'number' },
                    validationAccuracy: { type: 'number' },
                    testAccuracy: { type: 'number' },
                    crossValidationScore: { type: 'number' },
                  },
                },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: ModelTrainRequest }>, reply: FastifyReply) => {
    try {
      const adminUser = (request as any).user;
      const modelConfig = request.body;

      const model = await mlOptimizationService.trainModel(modelConfig, modelConfig.trainingData);

      // Log model training
      await fastify.mongo.db.collection('analytics_events').insertOne({
        userId: adminUser.id,
        eventType: 'admin_action',
        metadata: {
          action: 'train_ml_model',
          modelId: model.modelId,
          modelName: model.name,
          modelType: model.type,
          algorithm: model.algorithm,
          accuracy: model.accuracy,
        },
        timestamp: new Date(),
        appId: 'halobuzz',
      });

      return {
        success: true,
        data: {
          modelId: model.modelId,
          name: model.name,
          type: model.type,
          algorithm: model.algorithm,
          accuracy: model.accuracy,
          status: model.status,
          lastTrained: model.lastTrained.toISOString(),
          performance: model.performance,
        },
        message: 'Model trained successfully',
      };
    } catch (error) {
      fastify.log.error('Error training model:', error);
      reply.code(500);
      return {
        success: false,
        data: {
          modelId: '',
          name: '',
          type: '',
          algorithm: '',
          accuracy: 0,
          status: 'error',
          lastTrained: new Date().toISOString(),
          performance: {
            trainingAccuracy: 0,
            validationAccuracy: 0,
            testAccuracy: 0,
            crossValidationScore: 0,
          },
        },
        message: 'Failed to train model',
      };
    }
  });

  /**
   * POST /api/v1/ml-optimization/model/predict
   * Make prediction using trained model
   */
  fastify.post<{
    Body: PredictionRequest;
  }>('/ml-optimization/model/predict', {
    preHandler: [requireAuth, predictionRateLimit, validateInput],
    schema: {
      body: {
        type: 'object',
        required: ['modelId', 'inputData'],
        properties: {
          modelId: { type: 'string' },
          inputData: { type: 'object' },
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
                prediction: { type: 'object' },
                modelId: { type: 'string' },
                confidence: { type: 'number' },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: PredictionRequest }>, reply: FastifyReply) => {
    try {
      const { modelId, inputData } = request.body;

      const prediction = await mlOptimizationService.makePrediction(modelId, inputData);

      return {
        success: true,
        data: {
          prediction,
          modelId,
          confidence: prediction.confidence || 0,
        },
        message: 'Prediction made successfully',
      };
    } catch (error) {
      fastify.log.error('Error making prediction:', error);
      reply.code(500);
      return {
        success: false,
        data: {
          prediction: {},
          modelId: '',
          confidence: 0,
        },
        message: 'Failed to make prediction',
      };
    }
  });

  /**
   * GET /api/v1/ml-optimization/recommendations
   * Get optimization recommendations (admin only)
   */
  fastify.get('/ml-optimization/recommendations', {
    preHandler: [requireAuth, requireAdmin, mlRateLimit],
    schema: {
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
                  category: { type: 'string' },
                  priority: { type: 'string' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  expectedImpact: {
                    type: 'object',
                    properties: {
                      metric: { type: 'string' },
                      improvement: { type: 'number' },
                      confidence: { type: 'number' },
                    },
                  },
                  implementation: {
                    type: 'object',
                    properties: {
                      effort: { type: 'string' },
                      timeline: { type: 'string' },
                      resources: { type: 'array', items: { type: 'string' } },
                    },
                  },
                  successCriteria: { type: 'array', items: { type: 'string' } },
                  risks: { type: 'array', items: { type: 'string' } },
                },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const recommendations = await mlOptimizationService.generateOptimizationRecommendations();

      return {
        success: true,
        data: recommendations,
        message: 'Optimization recommendations retrieved successfully',
      };
    } catch (error) {
      fastify.log.error('Error getting optimization recommendations:', error);
      reply.code(500);
      return {
        success: false,
        data: [],
        message: 'Failed to retrieve optimization recommendations',
      };
    }
  });

  /**
   * GET /api/v1/ml-optimization/insights
   * Get ML insights from data patterns (admin only)
   */
  fastify.get('/ml-optimization/insights', {
    preHandler: [requireAuth, requireAdmin, mlRateLimit],
    schema: {
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
                  insightType: { type: 'string' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  confidence: { type: 'number' },
                  impact: { type: 'string' },
                  data: { type: 'object' },
                  recommendations: { type: 'array', items: { type: 'string' } },
                  actionable: { type: 'boolean' },
                },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const insights = await mlOptimizationService.generateMLInsights();

      return {
        success: true,
        data: insights,
        message: 'ML insights retrieved successfully',
      };
    } catch (error) {
      fastify.log.error('Error getting ML insights:', error);
      reply.code(500);
      return {
        success: false,
        data: [],
        message: 'Failed to retrieve ML insights',
      };
    }
  });

  /**
   * GET /api/v1/ml-optimization/models
   * Get list of trained models (admin only)
   */
  fastify.get('/ml-optimization/models', {
    preHandler: [requireAuth, requireAdmin, mlRateLimit],
    schema: {
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
                  modelId: { type: 'string' },
                  name: { type: 'string' },
                  type: { type: 'string' },
                  algorithm: { type: 'string' },
                  accuracy: { type: 'number' },
                  status: { type: 'string' },
                  lastTrained: { type: 'string', format: 'date-time' },
                },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // This would typically fetch from a models collection or Redis
      // For now, return mock data
      const models = [
        {
          modelId: 'model_123',
          name: 'User Engagement Predictor',
          type: 'classification',
          algorithm: 'random_forest',
          accuracy: 0.87,
          status: 'deployed',
          lastTrained: new Date().toISOString(),
        },
        {
          modelId: 'model_456',
          name: 'Revenue Forecast Model',
          type: 'regression',
          algorithm: 'neural_network',
          accuracy: 0.92,
          status: 'ready',
          lastTrained: new Date().toISOString(),
        },
      ];

      return {
        success: true,
        data: models,
        message: 'Models retrieved successfully',
      };
    } catch (error) {
      fastify.log.error('Error getting models:', error);
      reply.code(500);
      return {
        success: false,
        data: [],
        message: 'Failed to retrieve models',
      };
    }
  });
}

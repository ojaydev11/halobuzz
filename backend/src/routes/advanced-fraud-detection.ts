import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AdvancedFraudDetectionService } from '../services/AdvancedFraudDetectionService';
import { requireAuth, requireAdmin } from '../middleware/enhancedSecurity';
import { validateInput } from '../middleware/enhancedSecurity';
import { createRateLimit } from '../middleware/enhancedSecurity';

interface FraudPatternRequest {
  name: string;
  description: string;
  type: 'behavioral' | 'transactional' | 'account' | 'content' | 'network';
  severity: 'low' | 'medium' | 'high' | 'critical';
  conditions: Array<{
    field: string;
    operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'regex';
    value: any;
    weight: number;
  }>;
  threshold: number;
  isActive: boolean;
}

interface FraudAlertResolutionRequest {
  alertId: string;
  resolution: string;
}

interface FraudAnalysisRequest {
  userId: string;
}

export default async function advancedFraudDetectionRoutes(fastify: FastifyInstance) {
  const fraudDetectionService = new AdvancedFraudDetectionService(
    fastify.mongo.db.collection('analytics_events'),
    fastify.mongo.db.collection('users'),
    fastify.redis,
  );

  // Rate limiting for fraud detection endpoints
  const fraudRateLimit = createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute
    message: 'Too many fraud detection requests, please try again later',
  });

  const adminRateLimit = createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: 'Too many admin requests, please try again later',
  });

  /**
   * POST /api/v1/fraud-detection/patterns
   * Create fraud detection pattern (admin only)
   */
  fastify.post<{
    Body: FraudPatternRequest;
  }>('/fraud-detection/patterns', {
    preHandler: [requireAuth, requireAdmin, adminRateLimit, validateInput],
    schema: {
      body: {
        type: 'object',
        required: ['name', 'description', 'type', 'severity', 'conditions', 'threshold', 'isActive'],
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          type: { type: 'string', enum: ['behavioral', 'transactional', 'account', 'content', 'network'] },
          severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          conditions: {
            type: 'array',
            items: {
              type: 'object',
              required: ['field', 'operator', 'value', 'weight'],
              properties: {
                field: { type: 'string' },
                operator: { type: 'string', enum: ['equals', 'greater_than', 'less_than', 'contains', 'regex'] },
                value: { type: 'object' },
                weight: { type: 'number', minimum: 0, maximum: 1 },
              },
            },
          },
          threshold: { type: 'number', minimum: 0, maximum: 1 },
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
                patternId: { type: 'string' },
                name: { type: 'string' },
                type: { type: 'string' },
                severity: { type: 'string' },
                isActive: { type: 'boolean' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: FraudPatternRequest }>, reply: FastifyReply) => {
    try {
      const adminUser = (request as any).user;
      const patternConfig = request.body;

      const pattern = await fraudDetectionService.createFraudPattern(patternConfig);

      // Log pattern creation
      await fastify.mongo.db.collection('analytics_events').insertOne({
        userId: adminUser.id,
        eventType: 'admin_action',
        metadata: {
          action: 'create_fraud_pattern',
          patternId: pattern.patternId,
          patternName: pattern.name,
          patternType: pattern.type,
          severity: pattern.severity,
          conditions: pattern.conditions.length,
        },
        timestamp: new Date(),
        appId: 'halobuzz',
      });

      return {
        success: true,
        data: {
          patternId: pattern.patternId,
          name: pattern.name,
          type: pattern.type,
          severity: pattern.severity,
          isActive: pattern.isActive,
          createdAt: pattern.createdAt.toISOString(),
        },
        message: 'Fraud detection pattern created successfully',
      };
    } catch (error) {
      fastify.log.error('Error creating fraud pattern:', error);
      reply.code(500);
      return {
        success: false,
        data: {
          patternId: '',
          name: '',
          type: '',
          severity: '',
          isActive: false,
          createdAt: new Date().toISOString(),
        },
        message: 'Failed to create fraud pattern',
      };
    }
  });

  /**
   * POST /api/v1/fraud-detection/analyze
   * Analyze user for fraud patterns (admin only)
   */
  fastify.post<{
    Body: FraudAnalysisRequest;
  }>('/fraud-detection/analyze', {
    preHandler: [requireAuth, requireAdmin, fraudRateLimit, validateInput],
    schema: {
      body: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' },
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
                  alertId: { type: 'string' },
                  userId: { type: 'string' },
                  patternId: { type: 'string' },
                  patternName: { type: 'string' },
                  severity: { type: 'string' },
                  score: { type: 'number' },
                  description: { type: 'string' },
                  evidence: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        field: { type: 'string' },
                        value: { type: 'object' },
                        expectedValue: { type: 'object' },
                        deviation: { type: 'number' },
                      },
                    },
                  },
                  status: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Body: FraudAnalysisRequest }>, reply: FastifyReply) => {
    try {
      const adminUser = (request as any).user;
      const { userId } = request.body;

      const alerts = await fraudDetectionService.analyzeUserForFraud(userId);

      // Log analysis
      await fastify.mongo.db.collection('analytics_events').insertOne({
        userId: adminUser.id,
        eventType: 'admin_action',
        metadata: {
          action: 'analyze_user_fraud',
          targetUserId: userId,
          alertCount: alerts.length,
        },
        timestamp: new Date(),
        appId: 'halobuzz',
      });

      return {
        success: true,
        data: alerts.map(alert => ({
          alertId: alert.alertId,
          userId: alert.userId,
          patternId: alert.patternId,
          patternName: alert.patternName,
          severity: alert.severity,
          score: alert.score,
          description: alert.description,
          evidence: alert.evidence,
          status: alert.status,
          createdAt: alert.createdAt.toISOString(),
        })),
        message: `Fraud analysis completed. Found ${alerts.length} alerts.`,
      };
    } catch (error) {
      fastify.log.error('Error analyzing user for fraud:', error);
      reply.code(500);
      return {
        success: false,
        data: [],
        message: 'Failed to analyze user for fraud',
      };
    }
  });

  /**
   * GET /api/v1/fraud-detection/risk-score/:userId
   * Get user risk score (admin only)
   */
  fastify.get<{
    Params: { userId: string };
  }>('/fraud-detection/risk-score/:userId', {
    preHandler: [requireAuth, requireAdmin, fraudRateLimit],
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' },
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
                overallScore: { type: 'number' },
                categoryScores: {
                  type: 'object',
                  properties: {
                    behavioral: { type: 'number' },
                    transactional: { type: 'number' },
                    account: { type: 'number' },
                    content: { type: 'number' },
                    network: { type: 'number' },
                  },
                },
                factors: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      factor: { type: 'string' },
                      score: { type: 'number' },
                      weight: { type: 'number' },
                      description: { type: 'string' },
                    },
                  },
                },
                lastUpdated: { type: 'string', format: 'date-time' },
                trend: { type: 'string', enum: ['increasing', 'decreasing', 'stable'] },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    try {
      const { userId } = request.params;

      const riskScore = await fraudDetectionService.calculateRiskScore(userId);

      return {
        success: true,
        data: {
          userId: riskScore.userId,
          overallScore: riskScore.overallScore,
          categoryScores: riskScore.categoryScores,
          factors: riskScore.factors,
          lastUpdated: riskScore.lastUpdated.toISOString(),
          trend: riskScore.trend,
        },
        message: 'Risk score calculated successfully',
      };
    } catch (error) {
      fastify.log.error('Error calculating risk score:', error);
      reply.code(500);
      return {
        success: false,
        data: {
          userId: '',
          overallScore: 0,
          categoryScores: {
            behavioral: 0,
            transactional: 0,
            account: 0,
            content: 0,
            network: 0,
          },
          factors: [],
          lastUpdated: new Date().toISOString(),
          trend: 'stable',
        },
        message: 'Failed to calculate risk score',
      };
    }
  });

  /**
   * GET /api/v1/fraud-detection/anomalies/:userId
   * Detect anomalies in user behavior (admin only)
   */
  fastify.get<{
    Params: { userId: string };
  }>('/fraud-detection/anomalies/:userId', {
    preHandler: [requireAuth, requireAdmin, fraudRateLimit],
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' },
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
                anomalies: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string' },
                      description: { type: 'string' },
                      severity: { type: 'string' },
                      score: { type: 'number' },
                      timestamp: { type: 'string', format: 'date-time' },
                      data: { type: 'object' },
                    },
                  },
                },
                overallAnomalyScore: { type: 'number' },
                lastAnalyzed: { type: 'string', format: 'date-time' },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { userId: string } }>, reply: FastifyReply) => {
    try {
      const { userId } = request.params;

      const anomalyDetection = await fraudDetectionService.detectAnomalies(userId);

      return {
        success: true,
        data: {
          userId: anomalyDetection.userId,
          anomalies: anomalyDetection.anomalies.map(anomaly => ({
            type: anomaly.type,
            description: anomaly.description,
            severity: anomaly.severity,
            score: anomaly.score,
            timestamp: anomaly.timestamp.toISOString(),
            data: anomaly.data,
          })),
          overallAnomalyScore: anomalyDetection.overallAnomalyScore,
          lastAnalyzed: anomalyDetection.lastAnalyzed.toISOString(),
        },
        message: `Anomaly detection completed. Found ${anomalyDetection.anomalies.length} anomalies.`,
      };
    } catch (error) {
      fastify.log.error('Error detecting anomalies:', error);
      reply.code(500);
      return {
        success: false,
        data: {
          userId: '',
          anomalies: [],
          overallAnomalyScore: 0,
          lastAnalyzed: new Date().toISOString(),
        },
        message: 'Failed to detect anomalies',
      };
    }
  });

  /**
   * GET /api/v1/fraud-detection/metrics
   * Get fraud detection metrics (admin only)
   */
  fastify.get<{
    Querystring: {
      timeRange?: 'hour' | 'day' | 'week' | 'month';
    };
  }>('/fraud-detection/metrics', {
    preHandler: [requireAuth, requireAdmin, fraudRateLimit],
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
                totalAlerts: { type: 'number' },
                alertsBySeverity: {
                  type: 'object',
                  properties: {
                    low: { type: 'number' },
                    medium: { type: 'number' },
                    high: { type: 'number' },
                    critical: { type: 'number' },
                  },
                },
                alertsByType: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string' },
                      count: { type: 'number' },
                      percentage: { type: 'number' },
                    },
                  },
                },
                resolutionRate: { type: 'number' },
                falsePositiveRate: { type: 'number' },
                averageResolutionTime: { type: 'number' },
                topFraudPatterns: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      patternId: { type: 'string' },
                      patternName: { type: 'string' },
                      count: { type: 'number' },
                      successRate: { type: 'number' },
                    },
                  },
                },
                riskDistribution: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      riskLevel: { type: 'string' },
                      userCount: { type: 'number' },
                      percentage: { type: 'number' },
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

      const metrics = await fraudDetectionService.getFraudMetrics(timeRange);

      return {
        success: true,
        data: metrics,
        message: 'Fraud detection metrics retrieved successfully',
      };
    } catch (error) {
      fastify.log.error('Error getting fraud metrics:', error);
      reply.code(500);
      return {
        success: false,
        data: {
          totalAlerts: 0,
          alertsBySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
          alertsByType: [],
          resolutionRate: 0,
          falsePositiveRate: 0,
          averageResolutionTime: 0,
          topFraudPatterns: [],
          riskDistribution: [],
        },
        message: 'Failed to retrieve fraud metrics',
      };
    }
  });

  /**
   * POST /api/v1/fraud-detection/resolve-alert
   * Resolve fraud alert (admin only)
   */
  fastify.post<{
    Body: FraudAlertResolutionRequest;
  }>('/fraud-detection/resolve-alert', {
    preHandler: [requireAuth, requireAdmin, adminRateLimit, validateInput],
    schema: {
      body: {
        type: 'object',
        required: ['alertId', 'resolution'],
        properties: {
          alertId: { type: 'string' },
          resolution: { type: 'string' },
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
  }, async (request: FastifyRequest<{ Body: FraudAlertResolutionRequest }>, reply: FastifyReply) => {
    try {
      const adminUser = (request as any).user;
      const { alertId, resolution } = request.body;

      const success = await fraudDetectionService.resolveFraudAlert(alertId, adminUser.id, resolution);

      if (success) {
        return {
          success: true,
          message: 'Fraud alert resolved successfully',
        };
      } else {
        reply.code(400);
        return {
          success: false,
          message: 'Failed to resolve fraud alert',
        };
      }
    } catch (error) {
      fastify.log.error('Error resolving fraud alert:', error);
      reply.code(500);
      return {
        success: false,
        message: 'Failed to resolve fraud alert',
      };
    }
  });

  /**
   * GET /api/v1/fraud-detection/alerts
   * Get fraud alerts (admin only)
   */
  fastify.get<{
    Querystring: {
      status?: 'new' | 'investigating' | 'resolved' | 'false_positive';
      severity?: 'low' | 'medium' | 'high' | 'critical';
      limit?: number;
      offset?: number;
    };
  }>('/fraud-detection/alerts', {
    preHandler: [requireAuth, requireAdmin, fraudRateLimit],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['new', 'investigating', 'resolved', 'false_positive'] },
          severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          offset: { type: 'integer', minimum: 0, default: 0 },
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
                alerts: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      alertId: { type: 'string' },
                      userId: { type: 'string' },
                      patternId: { type: 'string' },
                      patternName: { type: 'string' },
                      severity: { type: 'string' },
                      score: { type: 'number' },
                      description: { type: 'string' },
                      status: { type: 'string' },
                      createdAt: { type: 'string', format: 'date-time' },
                      resolvedAt: { type: 'string', format: 'date-time' },
                      resolvedBy: { type: 'string' },
                    },
                  },
                },
                total: { type: 'number' },
                limit: { type: 'number' },
                offset: { type: 'number' },
              },
            },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request: FastifyRequest<{ Querystring: { status?: string; severity?: string; limit?: number; offset?: number } }>, reply: FastifyReply) => {
    try {
      const { status, severity, limit = 20, offset = 0 } = request.query;

      // Build query
      const query: any = {
        eventType: 'fraud_alert',
      };

      if (status) {
        query['metadata.status'] = status;
      }

      if (severity) {
        query['metadata.severity'] = severity;
      }

      // Get alerts
      const alerts = await fastify.mongo.db.collection('analytics_events')
        .find(query)
        .sort({ timestamp: -1 })
        .skip(offset)
        .limit(limit)
        .toArray();

      const total = await fastify.mongo.db.collection('analytics_events')
        .countDocuments(query);

      return {
        success: true,
        data: {
          alerts: alerts.map(alert => ({
            alertId: alert.metadata.alertId,
            userId: alert.userId,
            patternId: alert.metadata.patternId,
            patternName: alert.metadata.patternName,
            severity: alert.metadata.severity,
            score: alert.metadata.score,
            description: alert.metadata.description,
            status: alert.metadata.status,
            createdAt: alert.timestamp.toISOString(),
            resolvedAt: alert.metadata.resolvedAt ? new Date(alert.metadata.resolvedAt).toISOString() : null,
            resolvedBy: alert.metadata.resolvedBy || null,
          })),
          total,
          limit,
          offset,
        },
        message: 'Fraud alerts retrieved successfully',
      };
    } catch (error) {
      fastify.log.error('Error getting fraud alerts:', error);
      reply.code(500);
      return {
        success: false,
        data: {
          alerts: [],
          total: 0,
          limit: 20,
          offset: 0,
        },
        message: 'Failed to retrieve fraud alerts',
      };
    }
  });

  /**
   * GET /api/v1/fraud-detection/patterns
   * Get fraud detection patterns (admin only)
   */
  fastify.get('/fraud-detection/patterns', {
    preHandler: [requireAuth, requireAdmin, fraudRateLimit],
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
                  patternId: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  type: { type: 'string' },
                  severity: { type: 'string' },
                  threshold: { type: 'number' },
                  isActive: { type: 'boolean' },
                  createdAt: { type: 'string', format: 'date-time' },
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
      // Mock patterns - in real implementation, this would fetch from Redis
      const patterns = [
        {
          patternId: 'pattern_1',
          name: 'Rapid Account Creation',
          description: 'Multiple accounts created from same IP',
          type: 'account',
          severity: 'high',
          threshold: 0.7,
          isActive: true,
          createdAt: new Date().toISOString(),
        },
        {
          patternId: 'pattern_2',
          name: 'Suspicious Transaction Pattern',
          description: 'Unusual transaction amounts or frequency',
          type: 'transactional',
          severity: 'medium',
          threshold: 0.6,
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      ];

      return {
        success: true,
        data: patterns,
        message: 'Fraud detection patterns retrieved successfully',
      };
    } catch (error) {
      fastify.log.error('Error getting fraud patterns:', error);
      reply.code(500);
      return {
        success: false,
        data: [],
        message: 'Failed to retrieve fraud patterns',
      };
    }
  });
}

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { body, validationResult } from 'express-validator';
import { trustCredibilityService } from '@/services/TrustCredibilityService';
import { logger } from '@/config/logger';

/**
 * Trust & Credibility Routes
 * Handles user verification, trust scores, and credibility systems
 */

interface TrustRequest extends FastifyRequest {
  user?: {
    userId: string;
    email: string;
  };
}

export default async function trustCredibilityRoutes(fastify: FastifyInstance) {
  // Get user trust score
  fastify.get('/score', {
    preHandler: [fastify.authenticate],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                trustScore: { type: 'number' },
                credibilityLevel: { type: 'string' },
                verificationStatus: { type: 'object' },
                badges: { type: 'array' },
                transparencyScore: { type: 'number' },
                socialProof: { type: 'object' },
                financialTrust: { type: 'object' },
                contentTrust: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request: TrustRequest, reply: FastifyReply) => {
    try {
      const userId = request.user?.userId;

      if (!userId) {
        return reply.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const trustMetrics = await trustCredibilityService.calculateTrustScore(userId);

      return reply.json({
        success: true,
        data: trustMetrics
      });
    } catch (error) {
      logger.error('Failed to get trust score:', error);
      return reply.status(500).json({
        success: false,
        error: 'Failed to get trust score'
      });
    }
  });

  // Verify user identity
  fastify.post('/verify', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        properties: {
          email: { type: 'string' },
          phone: { type: 'string' },
          identity: {
            type: 'object',
            properties: {
              documentType: { type: 'string' },
              documentNumber: { type: 'string' },
              documentImage: { type: 'string' }
            }
          },
          socialMedia: {
            type: 'object',
            properties: {
              platform: { type: 'string' },
              username: { type: 'string' },
              profileUrl: { type: 'string' }
            }
          }
        }
      }
    }
  }, async (request: TrustRequest, reply: FastifyReply) => {
    try {
      const errors = validationResult(request);
      if (!errors.isEmpty()) {
        return reply.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const userId = request.user?.userId;
      const verificationData = request.body as any;

      if (!userId) {
        return reply.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const result = await trustCredibilityService.verifyUserIdentity(userId, verificationData);

      return reply.json({
        success: result.success,
        data: {
          verificationLevel: result.verificationLevel,
          providers: result.providers
        }
      });
    } catch (error) {
      logger.error('Failed to verify user identity:', error);
      return reply.status(500).json({
        success: false,
        error: 'Failed to verify user identity'
      });
    }
  });

  // Generate trust report
  fastify.get('/report', {
    preHandler: [fastify.authenticate],
    schema: {
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
                breakdown: { type: 'object' },
                recommendations: { type: 'array', items: { type: 'string' } },
                riskFactors: { type: 'array', items: { type: 'string' } },
                lastUpdated: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: TrustRequest, reply: FastifyReply) => {
    try {
      const userId = request.user?.userId;

      if (!userId) {
        return reply.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const report = await trustCredibilityService.generateTrustReport(userId);

      return reply.json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('Failed to generate trust report:', error);
      return reply.status(500).json({
        success: false,
        error: 'Failed to generate trust report'
      });
    }
  });

  // Award trust badge
  fastify.post('/badges/award', {
    preHandler: [fastify.authenticate, fastify.requireAdmin],
    schema: {
      body: {
        type: 'object',
        required: ['badgeId'],
        properties: {
          badgeId: { type: 'string' },
          userId: { type: 'string' }
        }
      }
    }
  }, async (request: TrustRequest, reply: FastifyReply) => {
    try {
      const { badgeId, userId } = request.body as {
        badgeId: string;
        userId: string;
      };

      const result = await trustCredibilityService.awardTrustBadge(userId, badgeId);

      return reply.json({
        success: result.success,
        data: result.badge,
        message: result.message
      });
    } catch (error) {
      logger.error('Failed to award trust badge:', error);
      return reply.status(500).json({
        success: false,
        error: 'Failed to award trust badge'
      });
    }
  });

  // Get available trust badges
  fastify.get('/badges', {
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
                  id: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  icon: { type: 'string' },
                  color: { type: 'string' },
                  requirements: { type: 'object' },
                  benefits: { type: 'object' },
                  isActive: { type: 'boolean' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Mock implementation - would get actual badges
      const badges = [
        {
          id: 'verified-creator',
          name: 'Verified Creator',
          description: 'Identity verified content creator',
          icon: 'verified',
          color: '#10b981',
          requirements: {
            minTrustScore: 70,
            minFollowers: 1000,
            verificationRequired: true
          },
          benefits: {
            visibilityBoost: 1.5,
            credibilityMultiplier: 1.3,
            exclusiveFeatures: ['priority-support', 'advanced-analytics'],
            prioritySupport: true
          },
          isActive: true
        },
        {
          id: 'trusted-streamer',
          name: 'Trusted Streamer',
          description: 'Consistent, high-quality streamer',
          icon: 'stream',
          color: '#3b82f6',
          requirements: {
            minTrustScore: 60,
            minStreams: 50,
            timeBased: true
          },
          benefits: {
            visibilityBoost: 1.3,
            credibilityMultiplier: 1.2,
            exclusiveFeatures: ['stream-boost'],
            prioritySupport: false
          },
          isActive: true
        }
      ];

      return reply.json({
        success: true,
        data: badges
      });
    } catch (error) {
      logger.error('Failed to get trust badges:', error);
      return reply.status(500).json({
        success: false,
        error: 'Failed to get trust badges'
      });
    }
  });

  // Get transparency dashboard
  fastify.get('/transparency', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                platformStats: { type: 'object' },
                trustDistribution: { type: 'array' },
                verificationStats: { type: 'object' },
                financialTransparency: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const dashboard = await trustCredibilityService.createTransparencyDashboard();

      return reply.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      logger.error('Failed to get transparency dashboard:', error);
      return reply.status(500).json({
        success: false,
        error: 'Failed to get transparency dashboard'
      });
    }
  });

  // Implement reputation recovery
  fastify.post('/recovery', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['recoveryPlan'],
        properties: {
          recoveryPlan: {
            type: 'object',
            properties: {
              actions: { type: 'array', items: { type: 'string' } },
              timeline: { type: 'number' },
              milestones: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    action: { type: 'string' },
                    target: { type: 'number' },
                    reward: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request: TrustRequest, reply: FastifyReply) => {
    try {
      const userId = request.user?.userId;
      const { recoveryPlan } = request.body as { recoveryPlan: any };

      if (!userId) {
        return reply.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const result = await trustCredibilityService.implementReputationRecovery(userId, recoveryPlan);

      return reply.json({
        success: result.success,
        data: {
          recoveryId: result.recoveryId,
          estimatedRecoveryTime: result.estimatedRecoveryTime,
          currentProgress: result.currentProgress
        }
      });
    } catch (error) {
      logger.error('Failed to implement reputation recovery:', error);
      return reply.status(500).json({
        success: false,
        error: 'Failed to implement reputation recovery'
      });
    }
  });

  // Get user verification status
  fastify.get('/verification/status', {
    preHandler: [fastify.authenticate],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                email: { type: 'boolean' },
                phone: { type: 'boolean' },
                identity: { type: 'boolean' },
                bankAccount: { type: 'boolean' },
                socialMedia: { type: 'boolean' },
                address: { type: 'boolean' },
                overallScore: { type: 'number' },
                verificationLevel: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request: TrustRequest, reply: FastifyReply) => {
    try {
      const userId = request.user?.userId;

      if (!userId) {
        return reply.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const trustMetrics = await trustCredibilityService.calculateTrustScore(userId);

      return reply.json({
        success: true,
        data: trustMetrics.verificationStatus
      });
    } catch (error) {
      logger.error('Failed to get verification status:', error);
      return reply.status(500).json({
        success: false,
        error: 'Failed to get verification status'
      });
    }
  });

  // Get trust leaderboard
  fastify.get('/leaderboard', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 50 },
          category: { type: 'string', enum: ['overall', 'verification', 'social', 'financial', 'content'] }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { limit = 50, category = 'overall' } = request.query as {
        limit: number;
        category: string;
      };

      // Mock implementation - would get actual leaderboard data
      const leaderboard = [
        {
          userId: 'user1',
          username: 'topcreator1',
          trustScore: 95,
          credibilityLevel: 'excellent',
          badges: ['verified-creator', 'trusted-streamer'],
          rank: 1
        },
        {
          userId: 'user2',
          username: 'topcreator2',
          trustScore: 92,
          credibilityLevel: 'excellent',
          badges: ['verified-creator'],
          rank: 2
        }
      ];

      return reply.json({
        success: true,
        data: {
          category,
          leaderboard: leaderboard.slice(0, limit),
          totalUsers: 1000
        }
      });
    } catch (error) {
      logger.error('Failed to get trust leaderboard:', error);
      return reply.status(500).json({
        success: false,
        error: 'Failed to get trust leaderboard'
      });
    }
  });
}

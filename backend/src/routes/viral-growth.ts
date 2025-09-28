import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { body, validationResult } from 'express-validator';
import { viralGrowthService } from '@/services/ViralGrowthService';
import { logger } from '@/config/logger';
import jwt from 'jsonwebtoken';

// Simple authentication middleware for Fastify
const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
  const token = request.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    (request as any).user = decoded;
  } catch (error) {
    return reply.status(401).send({ error: 'Invalid token' });
  }
};

// Simple admin middleware for Fastify
const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
  const user = (request as any).user;
  if (!user || user.role !== 'admin') {
    return reply.status(403).send({ error: 'Admin access required' });
  }
};

/**
 * Viral Growth Routes
 * Handles referral programs, viral campaigns, and growth mechanics
 */

interface ViralRequest extends FastifyRequest {
  user?: {
    userId: string;
    email: string;
  };
}

export default async function viralGrowthRoutes(fastify: FastifyInstance) {
  // Generate referral code
  fastify.post('/referral/generate', {
    preHandler: [authenticate],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                referralCode: { type: 'string' },
                referralUrl: { type: 'string' },
                rewards: {
                  type: 'object',
                  properties: {
                    referrerReward: { type: 'number' },
                    refereeReward: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request: ViralRequest, reply: FastifyReply) => {
    try {
      const userId = request.user?.userId;

      if (!userId) {
        return reply.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const referralCode = await viralGrowthService.generateReferralCode(userId);
      const referralUrl = `https://halobuzz.com/invite/${referralCode}`;

      return reply.json({
        success: true,
        data: {
          referralCode,
          referralUrl,
          rewards: {
            referrerReward: 100,
            refereeReward: 50
          }
        }
      });
    } catch (error) {
      logger.error('Failed to generate referral code:', error);
      return reply.status(500).json({
        success: false,
        error: 'Failed to generate referral code'
      });
    }
  });

  // Process referral signup
  fastify.post('/referral/signup', {
    schema: {
      body: {
        type: 'object',
        required: ['referralCode', 'userId'],
        properties: {
          referralCode: { type: 'string' },
          userId: { type: 'string' }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const errors = validationResult(request);
      if (!errors.isEmpty()) {
        return reply.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { referralCode, userId } = request.body as {
        referralCode: string;
        userId: string;
      };

      const result = await viralGrowthService.processReferralSignup(referralCode, userId);

      return reply.json({
        success: result.success,
        data: result.success ? {
          referrerReward: result.referrerReward,
          refereeReward: result.refereeReward,
          referrerId: result.referrerId
        } : null,
        message: result.success ? 'Referral processed successfully' : 'Invalid or expired referral code'
      });
    } catch (error) {
      logger.error('Failed to process referral signup:', error);
      return reply.status(500).json({
        success: false,
        error: 'Failed to process referral signup'
      });
    }
  });

  // Create viral challenge
  fastify.post('/challenges/create', {
    preHandler: [authenticate, requireAdmin],
    schema: {
      body: {
        type: 'object',
        required: ['name', 'type', 'reward'],
        properties: {
          name: { type: 'string' },
          type: { type: 'string', enum: ['referral', 'challenge', 'contest', 'trending', 'collaboration'] },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          reward: {
            type: 'object',
            properties: {
              coins: { type: 'number' },
              experience: { type: 'number' },
              specialBadges: { type: 'array', items: { type: 'string' } },
              exclusiveAccess: { type: 'array', items: { type: 'string' } }
            }
          },
          requirements: {
            type: 'object',
            properties: {
              minParticipants: { type: 'number' },
              maxParticipants: { type: 'number' },
              eligibilityCriteria: { type: 'object' }
            }
          },
          viralMultiplier: { type: 'number', default: 2.0 }
        }
      }
    }
  }, async (request: ViralRequest, reply: FastifyReply) => {
    try {
      const challengeData = request.body as any;
      
      // Convert date strings to Date objects
      if (challengeData.startDate) {
        challengeData.startDate = new Date(challengeData.startDate);
      }
      if (challengeData.endDate) {
        challengeData.endDate = new Date(challengeData.endDate);
      }

      const challengeId = await viralGrowthService.createViralChallenge(challengeData);

      return reply.json({
        success: true,
        data: {
          challengeId,
          message: 'Viral challenge created successfully'
        }
      });
    } catch (error) {
      logger.error('Failed to create viral challenge:', error);
      return reply.status(500).json({
        success: false,
        error: 'Failed to create viral challenge'
      });
    }
  });

  // Join viral challenge
  fastify.post('/challenges/:challengeId/join', {
    preHandler: [authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          challengeId: { type: 'string' }
        }
      }
    }
  }, async (request: ViralRequest, reply: FastifyReply) => {
    try {
      const { challengeId } = request.params as { challengeId: string };
      const userId = request.user?.userId;

      if (!userId) {
        return reply.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const result = await viralGrowthService.joinViralChallenge(challengeId, userId);

      return reply.json({
        success: result.success,
        data: result.success ? result.reward : null,
        message: result.message || (result.success ? 'Successfully joined challenge' : 'Failed to join challenge')
      });
    } catch (error) {
      logger.error('Failed to join viral challenge:', error);
      return reply.status(500).json({
        success: false,
        error: 'Failed to join viral challenge'
      });
    }
  });

  // Calculate viral score
  fastify.post('/content/viral-score', {
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['contentId', 'contentType'],
        properties: {
          contentId: { type: 'string' },
          contentType: { type: 'string', enum: ['stream', 'reel', 'game'] }
        }
      }
    }
  }, async (request: ViralRequest, reply: FastifyReply) => {
    try {
      const { contentId, contentType } = request.body as {
        contentId: string;
        contentType: 'stream' | 'reel' | 'game';
      };

      const viralScore = await viralGrowthService.calculateViralScore(contentId, contentType);

      return reply.json({
        success: true,
        data: viralScore
      });
    } catch (error) {
      logger.error('Failed to calculate viral score:', error);
      return reply.status(500).json({
        success: false,
        error: 'Failed to calculate viral score'
      });
    }
  });

  // Boost content visibility
  fastify.post('/content/:contentId/boost', {
    preHandler: [authenticate],
    schema: {
      params: {
        type: 'object',
        properties: {
          contentId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['boostType'],
        properties: {
          boostType: { type: 'string', enum: ['trending', 'featured', 'viral'] }
        }
      }
    }
  }, async (request: ViralRequest, reply: FastifyReply) => {
    try {
      const { contentId } = request.params as { contentId: string };
      const { boostType } = request.body as { boostType: 'trending' | 'featured' | 'viral' };

      const result = await viralGrowthService.boostContentVisibility(contentId, boostType);

      return reply.json({
        success: result.success,
        data: {
          boostMultiplier: result.boostMultiplier,
          duration: result.duration,
          message: `Content boosted with ${boostType} multiplier`
        }
      });
    } catch (error) {
      logger.error('Failed to boost content visibility:', error);
      return reply.status(500).json({
        success: false,
        error: 'Failed to boost content visibility'
      });
    }
  });

  // Get social proof data
  fastify.get('/social-proof', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                totalUsers: { type: 'number' },
                activeStreamers: { type: 'number' },
                totalGiftsSent: { type: 'number' },
                totalHoursStreamed: { type: 'number' },
                trendingHashtags: { type: 'array', items: { type: 'string' } },
                topCountries: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      country: { type: 'string' },
                      users: { type: 'number' }
                    }
                  }
                },
                successStories: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      userId: { type: 'string' },
                      achievement: { type: 'string' },
                      earnings: { type: 'number' },
                      followers: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const socialProof = await viralGrowthService.generateSocialProof();

      return reply.json({
        success: true,
        data: socialProof
      });
    } catch (error) {
      logger.error('Failed to get social proof:', error);
      return reply.status(500).json({
        success: false,
        error: 'Failed to get social proof data'
      });
    }
  });

  // Create collaboration opportunities
  fastify.post('/collaborations/opportunities', {
    preHandler: [authenticate],
    schema: {
      body: {
        type: 'object',
        properties: {
          targetAudience: { type: 'object' }
        }
      }
    }
  }, async (request: ViralRequest, reply: FastifyReply) => {
    try {
      const userId = request.user?.userId;
      const { targetAudience } = request.body as { targetAudience: any };

      if (!userId) {
        return reply.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const opportunities = await viralGrowthService.createCollaborationOpportunity(userId, targetAudience);

      return reply.json({
        success: opportunities.success,
        data: opportunities.opportunities
      });
    } catch (error) {
      logger.error('Failed to create collaboration opportunities:', error);
      return reply.status(500).json({
        success: false,
        error: 'Failed to create collaboration opportunities'
      });
    }
  });

  // Get viral campaigns
  fastify.get('/campaigns', {
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
                  type: { type: 'string' },
                  startDate: { type: 'string' },
                  endDate: { type: 'string' },
                  reward: { type: 'object' },
                  requirements: { type: 'object' },
                  viralMultiplier: { type: 'number' },
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
      // Mock implementation - would get actual campaigns
      const campaigns = [
        {
          id: 'new-user-bonus',
          name: 'New User Welcome Bonus',
          type: 'referral',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          reward: {
            coins: 100,
            experience: 50,
            specialBadges: ['welcome'],
            exclusiveAccess: []
          },
          requirements: {
            minParticipants: 1,
            eligibilityCriteria: { isNewUser: true }
          },
          viralMultiplier: 1.5,
          isActive: true
        }
      ];

      return reply.json({
        success: true,
        data: campaigns
      });
    } catch (error) {
      logger.error('Failed to get viral campaigns:', error);
      return reply.status(500).send({
        success: false,
        error: 'Failed to get viral campaigns'
      });
    }
  });
}

import { Router, Request, Response } from 'express';
import { karmaReputationService } from '../services/KarmaReputationService';
import { culturalFestivalService } from '../services/cultural/CulturalFestivalService';
import { CommunityLoveService } from '../services/community/CommunityLoveService';
import { ReputationService } from '../services/ReputationService';
import { setupLogger } from '../config/logger';
import { authenticateToken } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();
const logger = setupLogger();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route GET /api/karma-reputation/score/:userId
 * @desc Get unified karma and reputation score for a user
 * @access Private
 */
router.get('/score/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user?.id;

    // Users can only view their own score or if they have permission
    if (userId !== requestingUserId && !req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only view your own karma and reputation score.'
      });
    }

    const result = await karmaReputationService.getUserUnifiedScore(userId);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('Error getting unified score:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/karma-reputation/leaderboard
 * @desc Get unified karma and reputation leaderboard
 * @access Private
 */
router.get('/leaderboard', rateLimit(10, 60), async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    
    if (limit > 100) {
      return res.status(400).json({
        success: false,
        error: 'Limit cannot exceed 100'
      });
    }

    const result = await karmaReputationService.getUnifiedLeaderboard(limit);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('Error getting leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route POST /api/karma-reputation/action
 * @desc Record a karma or reputation action
 * @access Private
 */
router.post('/action', rateLimit(20, 60), async (req: Request, res: Response) => {
  try {
    const { type, metadata, impact, verifiedBy, culturalContext } = req.body;
    const userId = req.user?.id;

    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Action type is required'
      });
    }

    const result = await karmaReputationService.recordAction({
      userId,
      type,
      metadata,
      impact,
      verifiedBy,
      culturalContext
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: {
        reputationDelta: result.reputationDelta,
        karmaDelta: result.karmaDelta,
        message: result.message
      }
    });

  } catch (error) {
    logger.error('Error recording action:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/karma-reputation/cultural-events
 * @desc Get recent cultural events and festival participations
 * @access Private
 */
router.get('/cultural-events', rateLimit(15, 60), async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    
    const result = await karmaReputationService.getCulturalEvents(limit);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('Error getting cultural events:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/karma-reputation/festivals
 * @desc Get all festivals
 * @access Private
 */
router.get('/festivals', async (req: Request, res: Response) => {
  try {
    const festivals = await culturalFestivalService.getAllFestivals();
    
    res.json({
      success: true,
      data: festivals
    });

  } catch (error) {
    logger.error('Error getting festivals:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/karma-reputation/festivals/active
 * @desc Get active festivals
 * @access Private
 */
router.get('/festivals/active', async (req: Request, res: Response) => {
  try {
    const festivals = await culturalFestivalService.getActiveFestivals();
    
    res.json({
      success: true,
      data: festivals
    });

  } catch (error) {
    logger.error('Error getting active festivals:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/karma-reputation/festivals/upcoming
 * @desc Get upcoming festivals
 * @access Private
 */
router.get('/festivals/upcoming', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const festivals = await culturalFestivalService.getUpcomingFestivals(limit);
    
    res.json({
      success: true,
      data: festivals
    });

  } catch (error) {
    logger.error('Error getting upcoming festivals:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/karma-reputation/festivals/:festivalId
 * @desc Get specific festival details
 * @access Private
 */
router.get('/festivals/:festivalId', async (req: Request, res: Response) => {
  try {
    const { festivalId } = req.params;
    const festival = await culturalFestivalService.getFestivalById(festivalId);
    
    if (!festival) {
      return res.status(404).json({
        success: false,
        error: 'Festival not found'
      });
    }

    res.json({
      success: true,
      data: festival
    });

  } catch (error) {
    logger.error('Error getting festival:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route POST /api/karma-reputation/festivals/:festivalId/participate
 * @desc Participate in a festival event
 * @access Private
 */
router.post('/festivals/:festivalId/participate', rateLimit(10, 300), async (req: Request, res: Response) => {
  try {
    const { festivalId } = req.params;
    const { eventId, participationType, culturalNotes } = req.body;
    const userId = req.user?.id;

    if (!eventId || !participationType) {
      return res.status(400).json({
        success: false,
        error: 'Event ID and participation type are required'
      });
    }

    // Check if user can participate
    const canParticipate = await culturalFestivalService.canParticipateInEvent(userId, festivalId, eventId);
    if (!canParticipate.canParticipate) {
      return res.status(400).json({
        success: false,
        error: canParticipate.reason
      });
    }

    const result = await culturalFestivalService.recordFestivalParticipation(
      userId,
      festivalId,
      eventId,
      participationType,
      culturalNotes
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: {
        karmaEarned: result.karmaEarned,
        reputationEarned: result.reputationEarned,
        message: result.message
      }
    });

  } catch (error) {
    logger.error('Error recording festival participation:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/karma-reputation/festivals/:festivalId/leaderboard
 * @desc Get festival leaderboard
 * @access Private
 */
router.get('/festivals/:festivalId/leaderboard', rateLimit(10, 60), async (req: Request, res: Response) => {
  try {
    const { festivalId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const result = await culturalFestivalService.getFestivalLeaderboard(festivalId, limit);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('Error getting festival leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/karma-reputation/festivals/:festivalId/stats
 * @desc Get festival statistics
 * @access Private
 */
router.get('/festivals/:festivalId/stats', async (req: Request, res: Response) => {
  try {
    const { festivalId } = req.params;
    const result = await culturalFestivalService.getFestivalStats(festivalId);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('Error getting festival stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/karma-reputation/karma/categories
 * @desc Get karma events by category
 * @access Private
 */
router.get('/karma/categories/:category', rateLimit(15, 60), async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const validCategories = ['helpfulness', 'mentorship', 'creativity', 'positivity', 'cultural_respect', 'community_service'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid karma category'
      });
    }

    // This would typically use ReputationEvent.findKarmaByCategory
    // For now, we'll return a placeholder
    res.json({
      success: true,
      data: []
    });

  } catch (error) {
    logger.error('Error getting karma by category:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/karma-reputation/reputation/history/:userId
 * @desc Get user's reputation history
 * @access Private
 */
router.get('/reputation/history/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user?.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = parseInt(req.query.skip as string) || 0;

    // Users can only view their own history or if they have permission
    if (userId !== requestingUserId && !req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only view your own reputation history.'
      });
    }

    const reputationService = new ReputationService();
    const result = await reputationService.getUserReputation(userId);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: result.data
    });

  } catch (error) {
    logger.error('Error getting reputation history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/karma-reputation/community/actions
 * @desc Get community actions and milestones
 * @access Private
 */
router.get('/community/actions', rateLimit(15, 60), async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    
    // This would typically get recent community actions
    // For now, we'll return a placeholder
    res.json({
      success: true,
      data: []
    });

  } catch (error) {
    logger.error('Error getting community actions:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route GET /api/karma-reputation/community/milestones
 * @desc Get available community milestones
 * @access Private
 */
router.get('/community/milestones', async (req: Request, res: Response) => {
  try {
    // This would typically get available milestones from CommunityLoveService
    const milestones = [
      {
        id: 'first_help',
        name: 'पहिलो सहयोग (First Help)',
        description: 'Help your first community member',
        requirement: 'Complete one verified helping action',
        reward: {
          karmaPoints: 10,
          badge: '🤝',
          privileges: ['helper_badge', 'priority_support']
        }
      },
      {
        id: 'mentor_master',
        name: 'गुरु (Guru)',
        description: 'Successfully mentor 10 users',
        requirement: 'Complete 10 verified mentorship actions',
        reward: {
          karmaPoints: 100,
          badge: '🧘',
          privileges: ['mentor_badge', 'special_title', 'community_recognition']
        }
      },
      {
        id: 'cultural_ambassador',
        name: 'सांस्कृतिक राजदूत (Cultural Ambassador)',
        description: 'Promote Nepali culture globally',
        requirement: 'Create 20 cultural content pieces with high engagement',
        reward: {
          karmaPoints: 200,
          badge: '🏔️',
          privileges: ['cultural_badge', 'content_boost', 'festival_features']
        }
      }
    ];

    res.json({
      success: true,
      data: milestones
    });

  } catch (error) {
    logger.error('Error getting community milestones:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Admin-only routes
/**
 * @route POST /api/karma-reputation/admin/festivals/:festivalId/activate
 * @desc Activate a festival (Admin only)
 * @access Private (Admin)
 */
router.post('/admin/festivals/:festivalId/activate', async (req: Request, res: Response) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { festivalId } = req.params;
    const result = await culturalFestivalService.activateFestival(festivalId);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    logger.error('Error activating festival:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route POST /api/karma-reputation/admin/festivals/:festivalId/deactivate
 * @desc Deactivate a festival (Admin only)
 * @access Private (Admin)
 */
router.post('/admin/festivals/:festivalId/deactivate', async (req: Request, res: Response) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { festivalId } = req.params;
    const result = await culturalFestivalService.deactivateFestival(festivalId);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    logger.error('Error deactivating festival:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * @route PUT /api/karma-reputation/admin/festivals/:festivalId/dates
 * @desc Update festival dates (Admin only)
 * @access Private (Admin)
 */
router.put('/admin/festivals/:festivalId/dates', async (req: Request, res: Response) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { festivalId } = req.params;
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
    }

    const result = await culturalFestivalService.updateFestivalDates(
      festivalId,
      new Date(startDate),
      new Date(endDate)
    );
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    logger.error('Error updating festival dates:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

export default router;

import express, { Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { reverseGiftChallengeService } from '../services/ReverseGiftChallengeService';
import { body, param, validationResult } from 'express-validator';
import { logger } from '../config/logger';

const router = express.Router();

// Create a new Reverse Gift Challenge
router.post('/create', requireAuth, [
  body('streamId')
    .isMongoId()
    .withMessage('Valid stream ID is required'),
  body('title')
    .isString()
    .isLength({ min: 3, max: 100 })
    .withMessage('Title must be between 3 and 100 characters'),
  body('description')
    .isString()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),
  body('totalCoins')
    .isInt({ min: 100 })
    .withMessage('Total coins must be at least 100'),
  body('minViewers')
    .optional()
    .isInt({ min: 5 })
    .withMessage('Minimum viewers must be at least 5'),
  body('maxWinners')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Max winners must be between 1 and 100'),
  body('duration')
    .optional()
    .isInt({ min: 1, max: 30 })
    .withMessage('Duration must be between 1 and 30 minutes'),
  body('entryRequirement.type')
    .optional()
    .isIn(['free', 'gift', 'follow', 'og_only'])
    .withMessage('Invalid entry requirement type'),
  body('distribution.type')
    .optional()
    .isIn(['equal', 'random', 'tiered', 'ai_based'])
    .withMessage('Invalid distribution type')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const hostId = req.user?.userId;
    if (!hostId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const challenge = await reverseGiftChallengeService.createChallenge({
      hostId,
      ...req.body
    });

    res.status(201).json({
      success: true,
      data: challenge
    });
  } catch (error: any) {
    logger.error('Failed to create Reverse Gift Challenge', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create challenge'
    });
  }
});

// Start a pending challenge
router.post('/:challengeId/start', requireAuth, [
  param('challengeId')
    .isMongoId()
    .withMessage('Valid challenge ID is required')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const hostId = req.user?.userId;
    if (!hostId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { challengeId } = req.params;

    const challenge = await reverseGiftChallengeService.startChallenge(challengeId, hostId);

    res.json({
      success: true,
      data: challenge
    });
  } catch (error: any) {
    logger.error('Failed to start Reverse Gift Challenge', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to start challenge'
    });
  }
});

// Join a challenge
router.post('/:challengeId/join', requireAuth, [
  param('challengeId')
    .isMongoId()
    .withMessage('Valid challenge ID is required'),
  body('giftAmount')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Gift amount must be non-negative')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { challengeId } = req.params;
    const { giftAmount = 0 } = req.body;

    const result = await reverseGiftChallengeService.joinChallenge(
      challengeId,
      userId,
      giftAmount
    );

    res.json({
      success: result.success,
      message: result.message
    });
  } catch (error: any) {
    logger.error('Failed to join Reverse Gift Challenge', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to join challenge'
    });
  }
});

// End a challenge and select winners
router.post('/:challengeId/end', requireAuth, [
  param('challengeId')
    .isMongoId()
    .withMessage('Valid challenge ID is required')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const hostId = req.user?.userId;
    if (!hostId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { challengeId } = req.params;

    const challenge = await reverseGiftChallengeService.endChallenge(challengeId, hostId);

    res.json({
      success: true,
      data: {
        challengeId: challenge._id,
        status: challenge.status,
        winners: challenge.winners,
        analytics: challenge.analytics
      }
    });
  } catch (error: any) {
    logger.error('Failed to end Reverse Gift Challenge', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to end challenge'
    });
  }
});

// Get active challenges
router.get('/active', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const challenges = await reverseGiftChallengeService.getActiveChallenges(limit);

    res.json({
      success: true,
      data: challenges
    });
  } catch (error: any) {
    logger.error('Failed to get active challenges', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active challenges'
    });
  }
});

// Get challenges by stream
router.get('/stream/:streamId', [
  param('streamId')
    .isMongoId()
    .withMessage('Valid stream ID is required')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { streamId } = req.params;
    const challenges = await reverseGiftChallengeService.getChallengesByStream(streamId);

    res.json({
      success: true,
      data: challenges
    });
  } catch (error: any) {
    logger.error('Failed to get challenges by stream', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get challenges'
    });
  }
});

export default router;
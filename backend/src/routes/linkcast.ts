import express, { Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth';
import { linkCastService } from '../services/LinkCastService';
import { body, param, validationResult } from 'express-validator';
import { logger } from '../config/logger';

const router = express.Router();

// Create LinkCast invitation
router.post('/invite', requireAuth, [
  body('secondaryHostId')
    .isMongoId()
    .withMessage('Valid secondary host ID is required'),
  body('primaryStreamId')
    .isMongoId()
    .withMessage('Valid stream ID is required'),
  body('settings.splitScreen')
    .optional()
    .isBoolean(),
  body('settings.audioMix')
    .optional()
    .isBoolean(),
  body('settings.maxDuration')
    .optional()
    .isInt({ min: 30, max: 240 })
    .withMessage('Duration must be between 30 and 240 minutes'),
  body('settings.revenueShare.primaryHost')
    .optional()
    .isInt({ min: 0, max: 100 }),
  body('settings.revenueShare.secondaryHost')
    .optional()
    .isInt({ min: 0, max: 100 })
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const primaryHostId = req.user?.userId;
    if (!primaryHostId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { secondaryHostId, primaryStreamId, settings } = req.body;

    // Validate revenue share adds up to 100%
    if (settings?.revenueShare) {
      const total = (settings.revenueShare.primaryHost || 50) + 
                   (settings.revenueShare.secondaryHost || 50);
      if (total !== 100) {
        return res.status(400).json({
          success: false,
          error: 'Revenue share must total 100%'
        });
      }
    }

    const linkCast = await linkCastService.createLinkCastInvitation({
      primaryHostId,
      secondaryHostId,
      primaryStreamId,
      settings
    });

    res.status(201).json({
      success: true,
      data: linkCast
    });
  } catch (error: any) {
    logger.error('Failed to create LinkCast invitation', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create LinkCast invitation'
    });
  }
});

// Accept LinkCast invitation
router.post('/:linkCastId/accept', requireAuth, [
  param('linkCastId')
    .isMongoId()
    .withMessage('Valid LinkCast ID is required')
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

    const { linkCastId } = req.params;

    const linkCast = await linkCastService.acceptInvitation(linkCastId, userId);

    res.json({
      success: true,
      data: linkCast
    });
  } catch (error: any) {
    logger.error('Failed to accept LinkCast invitation', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to accept LinkCast invitation'
    });
  }
});

// Reject LinkCast invitation
router.post('/:linkCastId/reject', requireAuth, [
  param('linkCastId')
    .isMongoId()
    .withMessage('Valid LinkCast ID is required'),
  body('reason')
    .optional()
    .isString()
    .isLength({ max: 200 })
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

    const { linkCastId } = req.params;
    const { reason } = req.body;

    await linkCastService.rejectInvitation(linkCastId, userId, reason);

    res.json({
      success: true,
      message: 'LinkCast invitation rejected'
    });
  } catch (error: any) {
    logger.error('Failed to reject LinkCast invitation', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to reject LinkCast invitation'
    });
  }
});

// End LinkCast session
router.post('/:linkCastId/end', requireAuth, [
  param('linkCastId')
    .isMongoId()
    .withMessage('Valid LinkCast ID is required')
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

    const { linkCastId } = req.params;

    await linkCastService.endLinkCast(linkCastId, userId);

    res.json({
      success: true,
      message: 'LinkCast session ended'
    });
  } catch (error: any) {
    logger.error('Failed to end LinkCast session', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to end LinkCast session'
    });
  }
});

// Get active LinkCast sessions
router.get('/active', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const linkCasts = await linkCastService.getActiveLinkCasts(limit);

    res.json({
      success: true,
      data: linkCasts
    });
  } catch (error: any) {
    logger.error('Failed to get active LinkCast sessions', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get active LinkCast sessions'
    });
  }
});

// Get pending invitations for current user
router.get('/invitations/pending', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const invitations = await linkCastService.getPendingInvitations(userId);

    res.json({
      success: true,
      data: invitations
    });
  } catch (error: any) {
    logger.error('Failed to get pending LinkCast invitations', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pending invitations'
    });
  }
});

// Process gift for LinkCast session (called by gift service)
router.post('/:linkCastId/gift', requireAuth, [
  param('linkCastId')
    .isMongoId()
    .withMessage('Valid LinkCast ID is required'),
  body('giftCoins')
    .isInt({ min: 1 })
    .withMessage('Valid gift coin amount is required')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { linkCastId } = req.params;
    const { giftCoins } = req.body;

    await linkCastService.processGift(linkCastId, giftCoins);

    res.json({
      success: true,
      message: 'Gift processed successfully'
    });
  } catch (error: any) {
    logger.error('Failed to process LinkCast gift', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to process gift'
    });
  }
});

export default router;
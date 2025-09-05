import { Router, Response } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { CollaborativeContentService } from '@/services/collaboration/CollaborativeContentService';
import { authMiddleware } from '@/middleware/auth';
import { socialLimiter } from '@/middleware/security';
import { logger } from '@/config/logger';

const router = Router();
const collaborationService = CollaborativeContentService.getInstance();

// Apply authentication and rate limiting to all routes
router.use(authMiddleware);
router.use(socialLimiter);

/**
 * @route POST /api/v1/collaboration/session
 * @desc Create a new collaboration session
 */
router.post('/session', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { contentType, content, duration } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!contentType || !content) {
      return res.status(400).json({ error: 'Content type and content are required' });
    }

    const session = await collaborationService.createCollaborationSession(
      userId,
      contentType,
      content,
      duration
    );

    res.status(201).json({
      success: true,
      data: session
    });
  } catch (error) {
    logger.error('Error creating collaboration session', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to create collaboration session' });
  }
});

/**
 * @route POST /api/v1/collaboration/:sessionId/invite
 * @desc Invite users to collaborate
 */
router.post('/:sessionId/invite', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { invitees } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!invitees || !Array.isArray(invitees)) {
      return res.status(400).json({ error: 'Invitees array is required' });
    }

    const invites = await collaborationService.inviteToCollaboration(
      sessionId,
      userId,
      invitees
    );

    res.status(200).json({
      success: true,
      data: invites
    });
  } catch (error) {
    logger.error('Error inviting to collaboration', { error, sessionId: req.params.sessionId, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to send invites' });
  }
});

/**
 * @route POST /api/v1/collaboration/invite/:inviteId/accept
 * @desc Accept collaboration invite
 */
router.post('/invite/:inviteId/accept', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { inviteId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const session = await collaborationService.acceptInvite(inviteId, userId);

    res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    logger.error('Error accepting collaboration invite', { error, inviteId: req.params.inviteId, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to accept invite' });
  }
});

/**
 * @route POST /api/v1/collaboration/:sessionId/edit
 * @desc Apply real-time edit
 */
router.post('/:sessionId/edit', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { editType, changes } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!editType || !changes) {
      return res.status(400).json({ error: 'Edit type and changes are required' });
    }

    const edit = await collaborationService.applyRealTimeEdit(
      sessionId,
      userId,
      editType,
      changes
    );

    res.status(200).json({
      success: true,
      data: edit
    });
  } catch (error) {
    logger.error('Error applying real-time edit', { error, sessionId: req.params.sessionId, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to apply edit' });
  }
});

/**
 * @route POST /api/v1/collaboration/:sessionId/comment
 * @desc Add comment to collaboration
 */
router.post('/:sessionId/comment', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { comment, timestamp } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!comment) {
      return res.status(400).json({ error: 'Comment is required' });
    }

    const event = await collaborationService.addComment(
      sessionId,
      userId,
      comment,
      timestamp
    );

    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    logger.error('Error adding comment', { error, sessionId: req.params.sessionId, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

/**
 * @route GET /api/v1/collaboration/:sessionId
 * @desc Get collaboration session
 */
router.get('/:sessionId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const session = await collaborationService.getCollaborationSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Collaboration session not found' });
    }

    // Check if user has access to this session
    if (!session.participants.includes(userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    logger.error('Error getting collaboration session', { error, sessionId: req.params.sessionId, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to get collaboration session' });
  }
});

/**
 * @route GET /api/v1/collaboration/user/sessions
 * @desc Get user's collaboration sessions
 */
router.get('/user/sessions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const sessions = await collaborationService.getUserCollaborations(userId);

    res.status(200).json({
      success: true,
      data: sessions
    });
  } catch (error) {
    logger.error('Error getting user collaborations', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to get user collaborations' });
  }
});

/**
 * @route POST /api/v1/collaboration/:sessionId/complete
 * @desc Complete collaboration session
 */
router.post('/:sessionId/complete', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const session = await collaborationService.completeCollaboration(sessionId, userId);

    res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    logger.error('Error completing collaboration', { error, sessionId: req.params.sessionId, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to complete collaboration' });
  }
});

/**
 * @route GET /api/v1/collaboration/:sessionId/analytics
 * @desc Get collaboration analytics
 */
router.get('/:sessionId/analytics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const analytics = await collaborationService.getCollaborationAnalytics(sessionId);

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error getting collaboration analytics', { error, sessionId: req.params.sessionId, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to get collaboration analytics' });
  }
});

export default router;

import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthenticatedRequest, authMiddleware } from '../../../middleware/auth';
import { agoraService } from '../../../services/streaming/AgoraService';
import { LiveStream } from '../../../models/LiveStream';
import { logger } from '../../../config/logger';
import { rateLimiter } from '../../../middleware/rateLimiter';
import { metricsService } from '../../../services/MetricsService';

const router = express.Router();

// Rate limiting for stream operations
const streamRateLimiter = rateLimiter({ 
  windowMs: 60000, // 1 minute
  max: 10, // 10 stream operations per minute
  message: 'Too many stream operations'
});

/**
 * POST /api/v1/streams/start
 * Start a new live stream
 */
router.post('/start', [
  authMiddleware,
  streamRateLimiter,
  body('title')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be 1-100 characters'),
  body('category')
    .optional()
    .isIn(['entertainment', 'music', 'dance', 'comedy', 'gaming', 'education', 'lifestyle', 'news', 'sports', 'other'])
    .withMessage('Invalid category'),
  body('isAudioOnly')
    .optional()
    .isBoolean()
    .withMessage('isAudioOnly must be boolean'),
  body('isAnonymous')
    .optional()
    .isBoolean()
    .withMessage('isAnonymous must be boolean'),
  body('isPrivate')
    .optional()
    .isBoolean()
    .withMessage('isPrivate must be boolean'),
  body('tags')
    .optional()
    .isArray({ max: 5 })
    .withMessage('Maximum 5 tags allowed')
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

    // Check if user already has an active stream
    const existingStream = await LiveStream.findOne({
      hostId: userId,
      status: 'live'
    });

    if (existingStream) {
      return res.status(400).json({
        success: false,
        error: 'You already have an active stream'
      });
    }

    // Start the stream
    const streamData = await agoraService.startStream(userId, req.body.title, {
      description: req.body.description,
      category: req.body.category,
      isAudioOnly: req.body.isAudioOnly,
      isAnonymous: req.body.isAnonymous,
      isPrivate: req.body.isPrivate,
      tags: req.body.tags
    });

    // Track metrics
    metricsService.incrementCounter('stream_start_total', {
      category: req.body.category || 'entertainment',
      type: req.body.isAudioOnly ? 'audio' : 'video'
    });

    // Log stream start
    logger.info(`Stream started`, {
      userId,
      streamId: streamData.streamId,
      category: req.body.category || 'entertainment',
      isAudioOnly: req.body.isAudioOnly || false
    });

    res.status(200).json({
      success: true,
      message: 'Stream started successfully',
      data: streamData
    });

  } catch (error: any) {
    logger.error('Failed to start stream:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start stream'
    });
  }
});

/**
 * POST /api/v1/streams/end
 * End an active live stream
 */
router.post('/end', [
  authMiddleware,
  streamRateLimiter,
  body('streamId')
    .isMongoId()
    .withMessage('Valid streamId required')
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

    // End the stream
    const result = await agoraService.endStream(userId, req.body.streamId);

    // Track metrics
    metricsService.incrementCounter('stream_end_total');
    metricsService.recordHistogram('stream_duration_seconds', result.duration);

    // Log stream end
    logger.info(`Stream ended`, {
      userId,
      streamId: req.body.streamId,
      duration: result.duration,
      totalViewers: result.totalViewers
    });

    res.status(200).json({
      success: true,
      message: 'Stream ended successfully',
      data: result
    });

  } catch (error: any) {
    logger.error('Failed to end stream:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to end stream'
    });
  }
});

/**
 * POST /api/v1/streams/join
 * Join a live stream as viewer
 */
router.post('/join', [
  authMiddleware,
  rateLimiter({ windowMs: 60000, max: 30 }), // 30 joins per minute
  body('streamId')
    .isMongoId()
    .withMessage('Valid streamId required')
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

    // Join the stream
    const joinData = await agoraService.joinStream(userId, req.body.streamId);

    // Track metrics
    metricsService.incrementCounter('stream_join_total', {
      category: joinData.streamInfo.category
    });

    // Log stream join
    logger.info(`User joined stream`, {
      userId,
      streamId: req.body.streamId,
      currentViewers: joinData.streamInfo.currentViewers
    });

    res.status(200).json({
      success: true,
      message: 'Joined stream successfully',
      data: joinData
    });

  } catch (error: any) {
    logger.error('Failed to join stream:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to join stream'
    });
  }
});

/**
 * POST /api/v1/streams/leave
 * Leave a live stream
 */
router.post('/leave', [
  authMiddleware,
  body('streamId')
    .isMongoId()
    .withMessage('Valid streamId required')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    // Leave the stream
    const result = await agoraService.leaveStream(userId, req.body.streamId);

    // Log stream leave
    logger.info(`User left stream`, {
      userId,
      streamId: req.body.streamId,
      currentViewers: result.currentViewers
    });

    res.status(200).json({
      success: true,
      message: 'Left stream successfully',
      data: result
    });

  } catch (error: any) {
    logger.error('Failed to leave stream:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to leave stream'
    });
  }
});

/**
 * POST /api/v1/streams/reconnect
 * Handle stream reconnection (< 5s target)
 */
router.post('/reconnect', [
  authMiddleware,
  body('streamId').isMongoId(),
  body('role').isIn(['host', 'viewer'])
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    const startTime = Date.now();
    
    // Handle reconnection
    const result = await agoraService.handleReconnect(
      userId, 
      req.body.streamId, 
      req.body.role
    );

    const reconnectTime = Date.now() - startTime;

    // Track reconnect latency
    metricsService.recordHistogram('stream_reconnect_ms', reconnectTime);

    // Ensure < 5s reconnect time
    if (reconnectTime > 5000) {
      logger.warn(`Slow reconnection: ${reconnectTime}ms for user ${userId}`);
    }

    res.status(200).json({
      success: true,
      message: 'Reconnected successfully',
      data: {
        ...result,
        reconnectLatency: reconnectTime
      }
    });

  } catch (error: any) {
    logger.error('Failed to reconnect:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reconnect'
    });
  }
});

/**
 * GET /api/v1/streams/active
 * Get list of active streams
 */
router.get('/active', [
  rateLimiter({ windowMs: 60000, max: 60 }) // 60 requests per minute
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { category, country, page = 1, limit = 20 } = req.query;

    const query: any = { status: 'live', isPrivate: false };
    if (category) query.category = category;
    if (country) query.country = country;

    const streams = await LiveStream.find(query)
      .sort({ currentViewers: -1, startedAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('hostId', 'username avatar ogLevel')
      .lean();

    res.status(200).json({
      success: true,
      data: streams,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: await LiveStream.countDocuments(query)
      }
    });

  } catch (error: any) {
    logger.error('Failed to get active streams:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get streams'
    });
  }
});

export default router;
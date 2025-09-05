import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthenticatedRequest, authMiddleware } from '../../../middleware/auth';
import { moderationService } from '../../../services/ai/ModerationService';
import { logger } from '../../../config/logger';
import { metricsService } from '../../../services/MetricsService';
import multer from 'multer';
import { ModerationFlag } from '../../../models/ModerationFlag';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

/**
 * POST /api/v1/moderation/scan
 * Scan content for violations
 */
router.post('/scan', [
  authMiddleware,
  upload.single('content'),
  body('type')
    .isIn(['stream', 'reel', 'profile'])
    .withMessage('Valid content type required'),
  body('contentId')
    .optional()
    .isMongoId()
    .withMessage('Valid content ID required')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No content provided for scanning'
      });
    }

    const userId = req.user?.userId;
    const { type, contentId } = req.body;

    logger.info('Content scan requested', {
      userId,
      type,
      contentId,
      fileType: req.file.mimetype,
      fileSize: req.file.size
    });

    // Scan content
    let result;
    if (req.file.mimetype.startsWith('video/')) {
      // For video, save temporarily and scan
      const tempPath = `/tmp/scan_${Date.now()}.mp4`;
      require('fs').writeFileSync(tempPath, req.file.buffer);
      result = await moderationService.scanVideo(tempPath, {
        userId,
        type
      });
      require('fs').unlinkSync(tempPath);
    } else {
      // For images, scan directly
      result = await moderationService.scanImage(req.file.buffer, {
        userId,
        type
      });
    }

    // Track metrics
    metricsService.incrementCounter('moderation_scan_total', {
      type,
      action: result.action
    });

    // Log scan result
    logger.info('Content scan completed', {
      userId,
      type,
      contentId,
      safe: result.safe,
      action: result.action,
      violations: result.violations
    });

    res.status(200).json({
      success: true,
      data: {
        safe: result.safe,
        action: result.action,
        violations: result.violations,
        score: result.score,
        evidence: process.env.NODE_ENV === 'development' ? result.evidence : undefined
      }
    });

  } catch (error: any) {
    logger.error('Content scan failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Scan failed'
    });
  }
});

/**
 * POST /api/v1/moderation/decision
 * Admin override for moderation decision
 */
router.post('/decision', [
  authMiddleware,
  body('targetId')
    .isMongoId()
    .withMessage('Valid target ID required'),
  body('targetType')
    .isIn(['stream', 'reel', 'user'])
    .withMessage('Valid target type required'),
  body('decision')
    .isIn(['approve', 'reject'])
    .withMessage('Valid decision required'),
  body('reason')
    .isString()
    .isLength({ min: 10, max: 500 })
    .withMessage('Reason must be 10-500 characters')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const adminId = req.user?.userId;
    const userRole = req.user?.role;

    // Check admin permissions
    if (userRole !== 'admin' && userRole !== 'moderator') {
      return res.status(403).json({
        success: false,
        error: 'Admin or moderator access required'
      });
    }

    const { targetId, targetType, decision, reason } = req.body;

    // Apply override
    await moderationService.overrideModerationDecision(
      targetId,
      targetType,
      decision,
      adminId!,
      reason
    );

    // Track metrics
    metricsService.incrementCounter('moderation_override_total', {
      targetType,
      decision
    });

    // Log override
    logger.info('Moderation override applied', {
      adminId,
      targetId,
      targetType,
      decision,
      reason
    });

    res.status(200).json({
      success: true,
      message: `Content ${decision}d successfully`,
      data: {
        targetId,
        targetType,
        decision,
        timestamp: new Date()
      }
    });

  } catch (error: any) {
    logger.error('Moderation override failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Override failed'
    });
  }
});

/**
 * GET /api/v1/moderation/queue
 * Get moderation queue for review
 */
router.get('/queue', [
  authMiddleware
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRole = req.user?.role;

    // Check permissions
    if (userRole !== 'admin' && userRole !== 'moderator') {
      return res.status(403).json({
        success: false,
        error: 'Admin or moderator access required'
      });
    }

    const { status = 'pending', priority, page = 1, limit = 20 } = req.query;

    const query: any = { status };
    if (priority) query.priority = priority;

    const flags = await ModerationFlag.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .populate('reporterId', 'username')
      .populate('reportedUserId', 'username')
      .populate('reportedStreamId', 'title')
      .lean();

    const total = await ModerationFlag.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        flags,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      }
    });

  } catch (error: any) {
    logger.error('Failed to get moderation queue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve queue'
    });
  }
});

/**
 * POST /api/v1/moderation/report
 * User report content
 */
router.post('/report', [
  authMiddleware,
  body('targetId')
    .isMongoId()
    .withMessage('Valid target ID required'),
  body('targetType')
    .isIn(['user', 'stream', 'message', 'content'])
    .withMessage('Valid target type required'),
  body('reason')
    .isIn(['inappropriate', 'spam', 'harassment', 'violence', 'copyright', 'fake_news', 'other'])
    .withMessage('Valid reason required'),
  body('description')
    .isString()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be 10-1000 characters')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const reporterId = req.user?.userId;
    const { targetId, targetType, reason, description, evidence } = req.body;

    // Create moderation flag
    const flag = await ModerationFlag.create({
      reporterId,
      type: targetType,
      reason,
      description,
      evidence: evidence || [],
      status: 'pending',
      priority: ['violence', 'harassment'].includes(reason) ? 'high' : 'medium',
      ...(targetType === 'user' && { reportedUserId: targetId }),
      ...(targetType === 'stream' && { reportedStreamId: targetId }),
      ...(targetType === 'message' && { reportedMessageId: targetId })
    });

    // Track metrics
    metricsService.incrementCounter('moderation_report_total', {
      type: targetType,
      reason
    });

    logger.info('Content reported', {
      reporterId,
      targetId,
      targetType,
      reason
    });

    res.status(200).json({
      success: true,
      message: 'Report submitted successfully',
      data: {
        flagId: flag._id,
        status: 'pending'
      }
    });

  } catch (error: any) {
    logger.error('Failed to submit report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit report'
    });
  }
});

/**
 * GET /api/v1/moderation/evidence/:flagId
 * Get evidence for a moderation case
 */
router.get('/evidence/:flagId', [
  authMiddleware
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRole = req.user?.role;

    // Check permissions
    if (userRole !== 'admin' && userRole !== 'moderator') {
      return res.status(403).json({
        success: false,
        error: 'Admin or moderator access required'
      });
    }

    const { flagId } = req.params;

    const flag = await ModerationFlag.findById(flagId)
      .populate('reporterId', 'username')
      .populate('reportedUserId', 'username')
      .lean();

    if (!flag) {
      return res.status(404).json({
        success: false,
        error: 'Flag not found'
      });
    }

    res.status(200).json({
      success: true,
      data: flag
    });

  } catch (error: any) {
    logger.error('Failed to get evidence:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve evidence'
    });
  }
});

/**
 * GET /api/v1/moderation/evidence-pack
 * Get 20-case evidence pack for validation
 */
router.get('/evidence-pack', [
  authMiddleware
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRole = req.user?.role;

    if (userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const evidencePack = await moderationService.generateEvidencePack();

    res.status(200).json({
      success: true,
      data: {
        cases: evidencePack,
        total: evidencePack.length,
        generatedAt: new Date()
      }
    });

  } catch (error: any) {
    logger.error('Failed to generate evidence pack:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate evidence pack'
    });
  }
});

/**
 * GET /api/v1/moderation/stats
 * Get moderation statistics
 */
router.get('/stats', [
  authMiddleware
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userRole = req.user?.role;

    if (userRole !== 'admin' && userRole !== 'moderator') {
      return res.status(403).json({
        success: false,
        error: 'Admin or moderator access required'
      });
    }

    // Get moderation stats
    const stats = await ModerationFlag.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const falsePositives = await ModerationFlag.countDocuments({
      status: 'dismissed',
      action: 'none'
    });

    const avgReviewTime = await ModerationFlag.aggregate([
      {
        $match: { 
          status: 'resolved',
          reviewedAt: { $exists: true }
        }
      },
      {
        $project: {
          reviewTime: {
            $subtract: ['$reviewedAt', '$createdAt']
          }
        }
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: '$reviewTime' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        statusBreakdown: stats.reduce((acc, s) => {
          acc[s._id] = s.count;
          return acc;
        }, {} as any),
        falsePositives,
        falsePositiveRate: falsePositives / (stats.reduce((sum, s) => sum + s.count, 0) || 1),
        avgReviewTimeMs: avgReviewTime[0]?.avgTime || 0,
        lastUpdated: new Date()
      }
    });

  } catch (error: any) {
    logger.error('Failed to get moderation stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve stats'
    });
  }
});

export default router;
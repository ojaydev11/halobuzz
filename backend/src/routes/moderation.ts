import express from 'express';
import { aiModerationService } from '../services/AIModerationService';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { ModerationFlag } from '../models/ModerationFlag';

const router = express.Router();

/**
 * @route POST /moderation/analyze
 * @desc Analyze content for moderation
 */
router.post('/analyze', authMiddleware, async (req, res) => {
  try {
    const { content, type, context } = req.body;
    const userId = req.user?.id;

    if (!content || !type) {
      return res.status(400).json({
        success: false,
        error: 'Content and type are required'
      });
    }

    const result = await aiModerationService.moderateContent(
      content,
      type,
      userId,
      context
    );

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error analyzing content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze content'
    });
  }
});

/**
 * @route POST /moderation/verify-age
 * @desc Verify user age
 */
router.post('/verify-age', authMiddleware, async (req, res) => {
  try {
    const { documentImage } = req.body;
    const userId = req.user?.id;

    const result = await aiModerationService.verifyUserAge(userId, documentImage);

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error verifying age:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify age'
    });
  }
});

/**
 * @route GET /moderation/flags
 * @desc Get moderation flags for user
 */
router.get('/flags', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { limit = 50, offset = 0 } = req.query;

    const flags = await ModerationFlag.findByUser(userId, Number(limit));

    res.json({
      success: true,
      flags
    });
  } catch (error) {
    console.error('Error fetching moderation flags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch moderation flags'
    });
  }
});

/**
 * @route GET /moderation/stats
 * @desc Get moderation statistics
 */
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const { timeframe = 'day' } = req.query;

    const stats = await aiModerationService.getModerationStats(
      timeframe as 'day' | 'week' | 'month'
    );

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching moderation stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch moderation stats'
    });
  }
});

/**
 * @route POST /moderation/flags/:flagId/resolve
 * @desc Resolve a moderation flag
 */
router.post('/flags/:flagId/resolve', authMiddleware, async (req, res) => {
  try {
    const { flagId } = req.params;
    const { resolution } = req.body;
    const userId = req.user?.id;

    const flag = await ModerationFlag.findById(flagId);
    if (!flag) {
      return res.status(404).json({
        success: false,
        error: 'Flag not found'
      });
    }

    // Check if user can resolve this flag
    if (flag.userId.toString() !== userId && !req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to resolve this flag'
      });
    }

    await flag.resolve(userId, resolution);

    res.json({
      success: true,
      message: 'Flag resolved successfully'
    });
  } catch (error) {
    console.error('Error resolving flag:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resolve flag'
    });
  }
});

/**
 * @route POST /moderation/bulk-action
 * @desc Perform bulk action on moderation flags
 */
router.post('/bulk-action', adminMiddleware, async (req, res) => {
  try {
    const { flagIds, action } = req.body;
    const adminId = req.user?.id;

    if (!flagIds || !Array.isArray(flagIds) || flagIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Flag IDs are required'
      });
    }

    let resolvedCount = 0;
    let flaggedCount = 0;

    for (const flagId of flagIds) {
      const flag = await ModerationFlag.findById(flagId);
      if (flag) {
        if (action === 'resolve') {
          await flag.resolve(adminId, 'Bulk resolved by admin');
          resolvedCount++;
        } else if (action === 'flag') {
          await flag.flag();
          flaggedCount++;
        }
      }
    }

    res.json({
      success: true,
      message: `Bulk action completed: ${resolvedCount} resolved, ${flaggedCount} flagged`,
      stats: {
        resolved: resolvedCount,
        flagged: flaggedCount
      }
    });
  } catch (error) {
    console.error('Error performing bulk action:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform bulk action'
    });
  }
});

/**
 * @route GET /moderation/pending
 * @desc Get pending moderation flags (admin only)
 */
router.get('/pending', adminMiddleware, async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    const flags = await ModerationFlag.findPending(Number(limit));

    res.json({
      success: true,
      flags
    });
  } catch (error) {
    console.error('Error fetching pending flags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending flags'
    });
  }
});

/**
 * @route GET /moderation/analytics
 * @desc Get moderation analytics (admin only)
 */
router.get('/analytics', adminMiddleware, async (req, res) => {
  try {
    const { timeframe = 'day' } = req.query;

    // Get basic stats
    const stats = await aiModerationService.getModerationStats(
      timeframe as 'day' | 'week' | 'month'
    );

    // Get additional analytics
    const analytics = await ModerationFlag.aggregate([
      {
        $match: {
          createdAt: { $gte: stats.startDate }
        }
      },
      {
        $group: {
          _id: {
            contentType: '$contentType',
            action: '$action'
          },
          count: { $sum: 1 },
          avgConfidence: { $avg: '$confidence' }
        }
      },
      {
        $group: {
          _id: '$_id.contentType',
          actions: {
            $push: {
              action: '$_id.action',
              count: '$count',
              avgConfidence: '$avgConfidence'
            }
          },
          totalCount: { $sum: '$count' }
        }
      }
    ]);

    res.json({
      success: true,
      stats,
      analytics
    });
  } catch (error) {
    console.error('Error fetching moderation analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch moderation analytics'
    });
  }
});

export default router;



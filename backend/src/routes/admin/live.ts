import { Router } from 'express';
import { LiveStream } from '../../models/LiveStream';
import { Reel } from '../../models/Reel';
import { AuditLog } from '../../models/AuditLog';
import { requireAuth } from '../../middleware/auth';
import { requireScope } from '../../middleware/rbac';

const router = Router();

/**
 * GET /api/v1/admin/live/sessions
 * Get paginated live sessions
 * Requires: admin:read scope
 */
router.get('/sessions', requireAuth, requireScope(['admin:read']), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    const skip = (page - 1) * limit;

    const query: any = {};
    if (status) query.status = status;

    const [sessions, total] = await Promise.all([
      LiveStream.find(query)
        .populate('host', 'username avatar followers')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .lean(),
      LiveStream.countDocuments(query),
    ]);

    const pages = Math.ceil(total / limit);

    res.json({
      data: sessions,
      total,
      page,
      pages,
    });
  } catch (error) {
    console.error('Admin get live sessions error:', error);
    res.status(500).json({
      error: 'Failed to fetch live sessions',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/admin/live/sessions/:id/force-end
 * Force end a live session
 * Requires: admin:write scope
 */
router.post('/sessions/:id/force-end', requireAuth, requireScope(['admin:write']), async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    const session = await LiveStream.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Live session not found' });
    }

    if (session.status !== 'live') {
      return res.status(400).json({ error: 'Session is not live' });
    }

    session.status = 'ended';
    session.endedAt = new Date();
    await session.save();

    // Log action
    await AuditLog.create({
      admin: req.user!._id,
      action: 'live.force_end',
      resource: 'livestream',
      resourceId: session._id,
      details: { reason, host: session.host },
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      message: 'Live session ended successfully',
      session,
    });
  } catch (error) {
    console.error('Admin force end session error:', error);
    res.status(500).json({
      error: 'Failed to end live session',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/admin/reels
 * Get paginated reels
 * Requires: admin:read scope
 */
router.get('/', requireAuth, requireScope(['admin:read']), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const isFlagged = req.query.isFlagged === 'true' ? true : undefined;

    const skip = (page - 1) * limit;

    const query: any = {};
    if (isFlagged !== undefined) query.isFlagged = isFlagged;

    const [reels, total] = await Promise.all([
      Reel.find(query)
        .populate('creator', 'username avatar followers')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .lean(),
      Reel.countDocuments(query),
    ]);

    const pages = Math.ceil(total / limit);

    res.json({
      data: reels,
      total,
      page,
      pages,
    });
  } catch (error) {
    console.error('Admin get reels error:', error);
    res.status(500).json({
      error: 'Failed to fetch reels',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/admin/reels/:id/takedown
 * Takedown a reel
 * Requires: admin:write scope
 */
router.post('/:id/takedown', requireAuth, requireScope(['admin:write']), async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    const reel = await Reel.findById(req.params.id);
    if (!reel) {
      return res.status(404).json({ error: 'Reel not found' });
    }

    reel.isFlagged = true;
    reel.isDeleted = true;
    await reel.save();

    // Log action
    await AuditLog.create({
      admin: req.user!._id,
      action: 'reel.takedown',
      resource: 'reel',
      resourceId: reel._id,
      details: { reason, creator: reel.creator },
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      message: 'Reel taken down successfully',
      reel,
    });
  } catch (error) {
    console.error('Admin takedown reel error:', error);
    res.status(500).json({
      error: 'Failed to takedown reel',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

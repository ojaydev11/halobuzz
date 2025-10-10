import { Router } from 'express';
import { ModerationFlag } from '../../models/ModerationFlag';
import { AuditLog } from '../../models/AuditLog';
import { requireAuth } from '../../middleware/auth';
import { requireScope } from '../../middleware/rbac';

const router = Router();

/**
 * GET /api/v1/admin/moderation/flags
 * Get paginated moderation flags
 * Requires: admin:read scope
 */
router.get('/flags', requireAuth, requireScope(['admin:read']), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const type = req.query.type as string;

    const skip = (page - 1) * limit;

    const query: any = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const [flags, total] = await Promise.all([
      ModerationFlag.find(query)
        .populate('reporter', 'username avatar')
        .populate('target')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .lean(),
      ModerationFlag.countDocuments(query),
    ]);

    const pages = Math.ceil(total / limit);

    res.json({
      data: flags,
      total,
      page,
      pages,
    });
  } catch (error) {
    console.error('Admin get moderation flags error:', error);
    res.status(500).json({
      error: 'Failed to fetch moderation flags',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/admin/moderation/flags/:id/resolve
 * Resolve a moderation flag
 * Requires: admin:write scope
 */
router.post('/flags/:id/resolve', requireAuth, requireScope(['admin:write']), async (req, res) => {
  try {
    const { action, reason } = req.body;

    if (!action || !reason) {
      return res.status(400).json({ error: 'Action and reason are required' });
    }

    const flag = await ModerationFlag.findById(req.params.id);
    if (!flag) {
      return res.status(404).json({ error: 'Flag not found' });
    }

    if (flag.status !== 'pending') {
      return res.status(400).json({ error: 'Flag is not pending' });
    }

    flag.status = 'resolved';
    flag.reviewedBy = req.user!.userId as any;
    flag.reviewedAt = new Date();
    flag.resolution = `${action}: ${reason}`;

    await flag.save();

    // Log action
    await AuditLog.create({
      admin: req.user!.userId,
      action: 'moderation.resolve',
      resource: 'flag',
      resourceId: flag._id,
      details: { action, reason, flagType: flag.contentType },
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      message: 'Flag resolved successfully',
      flag,
    });
  } catch (error) {
    console.error('Admin resolve flag error:', error);
    res.status(500).json({
      error: 'Failed to resolve flag',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

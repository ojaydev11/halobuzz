import { Router } from 'express';
import { User } from '../../models/User';
import { AuditLog } from '../../models/AuditLog';
import { requireAuth } from '../../middleware/auth';
import { requireScope } from '../../middleware/rbac';

const router = Router();

/**
 * GET /api/v1/admin/users
 * Get paginated list of users
 * Requires: admin:read scope
 */
router.get('/', requireAuth, requireScope(['admin:read']), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const kycStatus = req.query.kycStatus as string;
    const isBanned = req.query.isBanned === 'true' ? true : req.query.isBanned === 'false' ? false : undefined;
    const sortBy = req.query.sortBy as string || '-createdAt';

    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
      ];
    }

    if (kycStatus) {
      query.kycStatus = kycStatus;
    }

    if (isBanned !== undefined) {
      query.isBanned = isBanned;
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .sort(sortBy)
        .skip(skip)
        .limit(limit)
        .select('-password -totpSecret -mfaSecret -backupCodes -deviceTokens -kycDocuments')
        .lean(),
      User.countDocuments(query),
    ]);

    const pages = Math.ceil(total / limit);

    res.json({
      data: users,
      total,
      page,
      pages,
    });
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/admin/users/:id
 * Get single user by ID
 * Requires: admin:read scope
 */
router.get('/:id', requireAuth, requireScope(['admin:read']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -totpSecret -mfaSecret -backupCodes -deviceTokens')
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Admin get user error:', error);
    res.status(500).json({
      error: 'Failed to fetch user',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/admin/users/:id/ban
 * Ban a user
 * Requires: admin:write scope
 */
router.post('/:id/ban', requireAuth, requireScope(['admin:write']), async (req, res) => {
  try {
    const { reason, expiresAt } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Ban reason is required' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isBanned) {
      return res.status(400).json({ error: 'User is already banned' });
    }

    user.isBanned = true;
    user.banReason = reason;
    if (expiresAt) {
      user.banExpiresAt = new Date(expiresAt);
    }

    await user.save();

    // Log action
    await AuditLog.create({
      admin: req.user!._id,
      action: 'user.ban',
      resource: 'user',
      resourceId: user._id,
      details: { reason, expiresAt },
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      message: 'User banned successfully',
      user: {
        _id: user._id,
        username: user.username,
        isBanned: user.isBanned,
        banReason: user.banReason,
        banExpiresAt: user.banExpiresAt,
      },
    });
  } catch (error) {
    console.error('Admin ban user error:', error);
    res.status(500).json({
      error: 'Failed to ban user',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/admin/users/:id/unban
 * Unban a user
 * Requires: admin:write scope
 */
router.post('/:id/unban', requireAuth, requireScope(['admin:write']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.isBanned) {
      return res.status(400).json({ error: 'User is not banned' });
    }

    user.isBanned = false;
    user.banReason = undefined;
    user.banExpiresAt = undefined;

    await user.save();

    // Log action
    await AuditLog.create({
      admin: req.user!._id,
      action: 'user.unban',
      resource: 'user',
      resourceId: user._id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      message: 'User unbanned successfully',
      user: {
        _id: user._id,
        username: user.username,
        isBanned: user.isBanned,
      },
    });
  } catch (error) {
    console.error('Admin unban user error:', error);
    res.status(500).json({
      error: 'Failed to unban user',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/admin/users/:id/kyc/approve
 * Approve KYC for a user
 * Requires: admin:write scope
 */
router.post('/:id/kyc/approve', requireAuth, requireScope(['admin:write']), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.kycStatus === 'verified') {
      return res.status(400).json({ error: 'KYC already verified' });
    }

    user.kycStatus = 'verified';
    user.ageVerified = true;
    user.trust.factors.kycVerified = true;
    user.trust.score = Math.min(100, user.trust.score + 20);

    // Update trust level based on score
    if (user.trust.score >= 80) {
      user.trust.level = 'verified';
    } else if (user.trust.score >= 60) {
      user.trust.level = 'high';
    }

    await user.save();

    // Log action
    await AuditLog.create({
      admin: req.user!._id,
      action: 'kyc.approve',
      resource: 'user',
      resourceId: user._id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      message: 'KYC approved successfully',
      user: {
        _id: user._id,
        username: user.username,
        kycStatus: user.kycStatus,
        trust: user.trust,
      },
    });
  } catch (error) {
    console.error('Admin approve KYC error:', error);
    res.status(500).json({
      error: 'Failed to approve KYC',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/admin/users/:id/kyc/reject
 * Reject KYC for a user
 * Requires: admin:write scope
 */
router.post('/:id/kyc/reject', requireAuth, requireScope(['admin:write']), async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.kycStatus = 'rejected';

    await user.save();

    // Log action
    await AuditLog.create({
      admin: req.user!._id,
      action: 'kyc.reject',
      resource: 'user',
      resourceId: user._id,
      details: { reason },
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      message: 'KYC rejected successfully',
      user: {
        _id: user._id,
        username: user.username,
        kycStatus: user.kycStatus,
      },
    });
  } catch (error) {
    console.error('Admin reject KYC error:', error);
    res.status(500).json({
      error: 'Failed to reject KYC',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /api/v1/admin/users/:id/role
 * Update user role
 * Requires: super_admin role
 */
router.put('/:id/role', requireAuth, requireScope(['admin:write']), async (req, res) => {
  try {
    // Only super admins can change roles
    if (req.user?.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only super admins can change user roles' });
    }

    const { role } = req.body;

    if (!['user', 'admin', 'moderator', 'super_admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const oldRole = user.role;
    user.role = role;

    await user.save();

    // Log action
    await AuditLog.create({
      admin: req.user!._id,
      action: 'user.role.update',
      resource: 'user',
      resourceId: user._id,
      details: { oldRole, newRole: role },
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      message: 'User role updated successfully',
      user: {
        _id: user._id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Admin update role error:', error);
    res.status(500).json({
      error: 'Failed to update user role',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

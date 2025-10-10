import { Router } from 'express';
import { CoinTransaction } from '../../models/CoinTransaction';
import { Transaction } from '../../models/Transaction';
import { AuditLog } from '../../models/AuditLog';
import { requireAuth } from '../../middleware/auth';
import { requireScope } from '../../middleware/rbac';

const router = Router();

/**
 * GET /api/v1/admin/economy/transactions
 * Get paginated coin transactions
 * Requires: admin:read scope
 */
router.get('/transactions', requireAuth, requireScope(['admin:read']), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const userId = req.query.userId as string;
    const type = req.query.type as string;

    const skip = (page - 1) * limit;

    const query: any = {};
    if (userId) query.user = userId;
    if (type) query.type = type;

    const [transactions, total] = await Promise.all([
      CoinTransaction.find(query)
        .populate('user', 'username avatar')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .lean(),
      CoinTransaction.countDocuments(query),
    ]);

    const pages = Math.ceil(total / limit);

    res.json({
      data: transactions,
      total,
      page,
      pages,
    });
  } catch (error) {
    console.error('Admin get transactions error:', error);
    res.status(500).json({
      error: 'Failed to fetch transactions',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/admin/economy/payouts
 * Get paginated payout requests
 * Requires: admin:read scope
 */
router.get('/payouts', requireAuth, requireScope(['admin:read']), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    const skip = (page - 1) * limit;

    const query: any = { type: 'withdrawal' };
    if (status) query.status = status;

    const [payouts, total] = await Promise.all([
      Transaction.find(query)
        .populate('user', 'username email avatar')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(query),
    ]);

    const pages = Math.ceil(total / limit);

    res.json({
      data: payouts,
      total,
      page,
      pages,
    });
  } catch (error) {
    console.error('Admin get payouts error:', error);
    res.status(500).json({
      error: 'Failed to fetch payouts',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/admin/economy/payouts/:id/approve
 * Approve a payout request
 * Requires: admin:write scope
 */
router.post('/payouts/:id/approve', requireAuth, requireScope(['admin:write']), async (req, res) => {
  try {
    const payout = await Transaction.findById(req.params.id);
    if (!payout) {
      return res.status(404).json({ error: 'Payout not found' });
    }

    if (payout.status !== 'pending') {
      return res.status(400).json({ error: 'Payout is not pending' });
    }

    payout.status = 'completed';
    await payout.save();

    // Log action
    await AuditLog.create({
      admin: req.user!.userId,
      action: 'payout.approve',
      resource: 'transaction',
      resourceId: payout._id,
      details: { amount: payout.amount, userId: payout.userId },
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      message: 'Payout approved successfully',
      payout,
    });
  } catch (error) {
    console.error('Admin approve payout error:', error);
    res.status(500).json({
      error: 'Failed to approve payout',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/admin/economy/payouts/:id/reject
 * Reject a payout request
 * Requires: admin:write scope
 */
router.post('/payouts/:id/reject', requireAuth, requireScope(['admin:write']), async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const payout = await Transaction.findById(req.params.id);
    if (!payout) {
      return res.status(404).json({ error: 'Payout not found' });
    }

    if (payout.status !== 'pending') {
      return res.status(400).json({ error: 'Payout is not pending' });
    }

    payout.status = 'failed';
    payout.metadata = { ...payout.metadata, rejectionReason: reason };
    await payout.save();

    // Log action
    await AuditLog.create({
      admin: req.user!.userId,
      action: 'payout.reject',
      resource: 'transaction',
      resourceId: payout._id,
      details: { amount: payout.amount, userId: payout.userId, reason },
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      message: 'Payout rejected successfully',
      payout,
    });
  } catch (error) {
    console.error('Admin reject payout error:', error);
    res.status(500).json({
      error: 'Failed to reject payout',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

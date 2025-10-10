import { Router } from 'express';
import { User } from '../../models/User';
import { CoinTransaction } from '../../models/CoinTransaction';
import { LiveStream } from '../../models/LiveStream';
import { GameSession } from '../../models/GameSession';
import { Reel } from '../../models/Reel';
import { ModerationFlag } from '../../models/ModerationFlag';
import { requireAuth } from '../../middleware/auth';
import { requireScope } from '../../middleware/rbac';

const router = Router();

/**
 * GET /api/v1/admin/analytics/dashboard
 * Get dashboard statistics for admin overview
 * Requires: admin:read scope
 */
router.get('/dashboard', requireAuth, requireScope(['admin:read']), async (req, res) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // USER METRICS
    const [totalUsers, usersSevenDaysAgo, active7dUsers, verifiedUsers] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $lte: sevenDaysAgo } }),
      User.countDocuments({ lastActiveAt: { $gte: sevenDaysAgo } }),
      User.countDocuments({ isVerified: true }),
    ]);

    const growth7d = totalUsers > 0
      ? ((totalUsers - usersSevenDaysAgo) / (usersSevenDaysAgo || 1)) * 100
      : 0;

    // ECONOMY METRICS
    const [revenue30dResult, revenue30dAgoResult] = await Promise.all([
      CoinTransaction.aggregate([
        {
          $match: {
            type: 'purchase',
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]),
      CoinTransaction.aggregate([
        {
          $match: {
            type: 'purchase',
            createdAt: { $gte: new Date(thirtyDaysAgo.getTime() - 30 * 24 * 60 * 60 * 1000), $lt: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    const revenue30d = revenue30dResult[0]?.total || 0;
    const revenue30dAgo = revenue30dAgoResult[0]?.total || 0;
    const economyGrowth30d = revenue30dAgo > 0
      ? ((revenue30d - revenue30dAgo) / revenue30dAgo) * 100
      : 0;

    // Coins circulating
    const coinsCirculatingResult = await User.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: '$coins.balance' },
        },
      },
    ]);
    const coinsCirculating = coinsCirculatingResult[0]?.total || 0;

    // Average transaction size
    const avgTransactionResult = await CoinTransaction.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: null,
          avg: { $avg: '$amount' },
        },
      },
    ]);
    const avgTransactionSize = avgTransactionResult[0]?.avg || 0;

    // PLATFORM ACTIVITY
    const [liveSessions, gameSessions24h, reelsCreated24h, flagsPending] = await Promise.all([
      LiveStream.countDocuments({ status: 'live' }),
      GameSession.countDocuments({
        createdAt: { $gte: twentyFourHoursAgo },
        status: 'completed',
      }),
      Reel.countDocuments({ createdAt: { $gte: twentyFourHoursAgo } }),
      ModerationFlag.countDocuments({ status: 'pending' }),
    ]);

    // INFRASTRUCTURE METRICS (Super Admin only)
    let infrastructure = undefined;
    if (req.user?.roles?.includes('super_admin')) {
      // Simulated metrics - replace with actual monitoring data
      infrastructure = {
        apiResponseTimeP95: 245, // ms
        uptime30d: 99.97, // percentage
        dbLoad: 42, // percentage
        redisHitRate: 94.2, // percentage
      };
    }

    res.json({
      users: {
        total: totalUsers,
        active7d: active7dUsers,
        verified: verifiedUsers,
        growth7d: parseFloat(growth7d.toFixed(2)),
      },
      economy: {
        revenue30d,
        coinsCirculating,
        avgTransactionSize: parseFloat(avgTransactionSize.toFixed(2)),
        growth30d: parseFloat(economyGrowth30d.toFixed(2)),
      },
      platform: {
        liveSessions,
        gameSessions24h,
        reelsCreated24h,
        flagsPending,
      },
      infrastructure,
    });
  } catch (error) {
    console.error('Admin analytics dashboard error:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard statistics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

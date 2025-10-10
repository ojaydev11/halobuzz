import { Router } from 'express';
import { Tournament } from '../../models/Tournament';
import { GameSession } from '../../models/GameSession';
import { requireAuth } from '../../middleware/auth';
import { requireScope } from '../../middleware/rbac';

const router = Router();

/**
 * GET /api/v1/admin/tournaments
 * Get paginated tournaments
 * Requires: admin:read scope
 */
router.get('/', requireAuth, requireScope(['admin:read']), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;

    const skip = (page - 1) * limit;

    const query: any = {};
    if (status) query.status = status;

    const [tournaments, total] = await Promise.all([
      Tournament.find(query)
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .lean(),
      Tournament.countDocuments(query),
    ]);

    const pages = Math.ceil(total / limit);

    res.json({
      data: tournaments,
      total,
      page,
      pages,
    });
  } catch (error) {
    console.error('Admin get tournaments error:', error);
    res.status(500).json({
      error: 'Failed to fetch tournaments',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/admin/games/sessions
 * Get paginated game sessions
 * Requires: admin:read scope
 */
router.get('/sessions', requireAuth, requireScope(['admin:read']), async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const game = req.query.game as string;

    const skip = (page - 1) * limit;

    const query: any = {};
    if (game) query.game = game;

    const [sessions, total] = await Promise.all([
      GameSession.find(query)
        .populate('players', 'username avatar')
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .lean(),
      GameSession.countDocuments(query),
    ]);

    const pages = Math.ceil(total / limit);

    res.json({
      data: sessions,
      total,
      page,
      pages,
    });
  } catch (error) {
    console.error('Admin get game sessions error:', error);
    res.status(500).json({
      error: 'Failed to fetch game sessions',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

/**
 * E-Sports Games API Routes
 * Production-Ready Game Session Management
 *
 * Endpoints:
 * - Session management (start, end, validate)
 * - Leaderboards
 * - Player stats
 * - Anti-cheat validation
 */

import express, { Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth';
import { globalLimiter } from '@/middleware/security';
import { gameSessionService } from '@/services/GameSessionService';
import { antiCheatService } from '@/services/AntiCheatService';
import { GameSession } from '@/models/GameSession';
import { logger } from '@/config/logger';

const router = express.Router();

/**
 * POST /api/v1/games-esports/session/start
 * Start a new game session with entry fee deduction
 */
router.post(
  '/session/start',
  authMiddleware,
  globalLimiter,
  [
    body('gameId').isString().notEmpty().withMessage('Game ID is required'),
    body('entryFee').isInt({ min: 1, max: 100000 }).withMessage('Invalid entry fee'),
    body('mode').optional().isIn(['solo', 'multiplayer', 'tournament']).withMessage('Invalid mode'),
    body('tournamentId').optional().isString(),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const { gameId, entryFee, mode, tournamentId } = req.body;

      const result = await gameSessionService.startSession({
        userId,
        gameId,
        entryFee,
        mode,
        tournamentId,
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error,
        });
      }

      return res.json({
        success: true,
        data: {
          sessionId: result.session.sessionId,
          gameId: result.session.gameId,
          entryFee: result.session.entryFee,
          startTime: result.session.startTime,
          status: result.session.status,
        },
      });
    } catch (error) {
      logger.error('Failed to start game session:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to start session',
      });
    }
  }
);

/**
 * POST /api/v1/games-esports/session/end
 * End a game session with score validation and reward calculation
 */
router.post(
  '/session/end',
  authMiddleware,
  globalLimiter,
  [
    body('sessionId').isString().notEmpty().withMessage('Session ID is required'),
    body('score').isInt({ min: 0 }).withMessage('Invalid score'),
    body('metadata').optional().isObject(),
    body('fpsMetrics').optional().isArray(),
    body('networkLatency').optional().isArray(),
    body('actionLog').optional().isArray(),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const { sessionId, score, metadata, fpsMetrics, networkLatency, actionLog } = req.body;

      // Verify session belongs to user
      const session = await GameSession.findOne({ sessionId, userId });
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found or unauthorized',
        });
      }

      const result = await gameSessionService.endSession({
        sessionId,
        score,
        metadata,
        fpsMetrics,
        networkLatency,
        actionLog,
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error,
        });
      }

      return res.json({
        success: true,
        data: {
          sessionId,
          score,
          reward: result.reward,
          validated: result.validated,
        },
      });
    } catch (error) {
      logger.error('Failed to end game session:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to end session',
      });
    }
  }
);

/**
 * GET /api/v1/games-esports/session/:sessionId
 * Get session details
 */
router.get(
  '/session/:sessionId',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.userId;

      const session = await GameSession.findOne({ sessionId });
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found',
        });
      }

      // Only owner or admin can view session details
      if (session.userId.toString() !== userId && !req.user?.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      return res.json({
        success: true,
        data: session,
      });
    } catch (error) {
      logger.error('Failed to get session:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get session',
      });
    }
  }
);

/**
 * GET /api/v1/games-esports/sessions/player
 * Get player's recent sessions
 */
router.get(
  '/sessions/player',
  authMiddleware,
  [query('limit').optional().isInt({ min: 1, max: 100 })],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const limit = parseInt(req.query.limit as string) || 10;

      const sessions = await gameSessionService.getPlayerSessions(userId, limit);

      return res.json({
        success: true,
        data: { sessions },
      });
    } catch (error) {
      logger.error('Failed to get player sessions:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get sessions',
      });
    }
  }
);

/**
 * GET /api/v1/games-esports/stats/player/:gameId
 * Get player statistics for a specific game
 */
router.get(
  '/stats/player/:gameId',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const { gameId } = req.params;

      const stats = await gameSessionService.getPlayerStats(userId, gameId);

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Failed to get player stats:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get stats',
      });
    }
  }
);

/**
 * GET /api/v1/games-esports/leaderboard/:gameId
 * Get game leaderboard
 */
router.get(
  '/leaderboard/:gameId',
  [
    query('timeframe').optional().isIn(['daily', 'weekly', 'monthly', 'all-time']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { gameId } = req.params;
      const timeframe = (req.query.timeframe as string) || 'all-time';
      const limit = parseInt(req.query.limit as string) || 100;

      // Calculate date filter based on timeframe
      let dateFilter: Date | undefined;
      const now = new Date();

      switch (timeframe) {
        case 'daily':
          dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'weekly':
          dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateFilter = undefined;
      }

      const query: any = {
        gameId,
        status: 'completed',
        validated: true,
      };

      if (dateFilter) {
        query.createdAt = { $gte: dateFilter };
      }

      // Get top scores
      const topSessions = await GameSession.find(query)
        .sort({ score: -1 })
        .limit(limit)
        .populate('userId', 'username avatar displayName')
        .lean();

      // Format leaderboard
      const leaderboard = topSessions.map((session, index) => ({
        rank: index + 1,
        userId: session.userId,
        score: session.score,
        reward: session.reward,
        createdAt: session.createdAt,
        gameId: session.gameId,
      }));

      return res.json({
        success: true,
        data: {
          gameId,
          timeframe,
          leaderboard,
        },
      });
    } catch (error) {
      logger.error('Failed to get leaderboard:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get leaderboard',
      });
    }
  }
);

/**
 * POST /api/v1/games-esports/anti-cheat/validate
 * Manually validate a score (admin only)
 */
router.post(
  '/anti-cheat/validate',
  authMiddleware,
  [body('sessionId').isString().notEmpty()],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Check if user is admin
      if (!req.user?.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
        });
      }

      const { sessionId } = req.body;

      const session = await GameSession.findOne({ sessionId });
      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found',
        });
      }

      // Re-validate
      const validation = await antiCheatService.validateScore({
        userId: session.userId.toString(),
        gameId: session.gameId,
        sessionId,
        score: session.score,
        duration: session.duration || 0,
        metadata: session.metadata,
      });

      return res.json({
        success: true,
        data: {
          sessionId,
          validated: validation.valid,
          flags: validation.flags,
          suspicionScore: validation.suspicionScore,
        },
      });
    } catch (error) {
      logger.error('Failed to validate session:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to validate',
      });
    }
  }
);

/**
 * GET /api/v1/games-esports/anti-cheat/trust-score/:userId
 * Get player's anti-cheat trust score
 */
router.get(
  '/anti-cheat/trust-score/:userId',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;

      // Only user themselves or admin can view trust score
      if (userId !== req.user?.userId && !req.user?.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized',
        });
      }

      const trustScore = await antiCheatService.getPlayerTrustScore(userId);

      return res.json({
        success: true,
        data: {
          userId,
          trustScore,
          status: trustScore >= 80 ? 'excellent' : trustScore >= 60 ? 'good' : trustScore >= 40 ? 'fair' : 'poor',
        },
      });
    } catch (error) {
      logger.error('Failed to get trust score:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get trust score',
      });
    }
  }
);

export default router;

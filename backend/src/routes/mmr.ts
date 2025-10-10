/**
 * MMR (Matchmaking Rating) API Routes
 * Elo-based Ranking System for Competitive Games
 *
 * Endpoints:
 * - Get/create player rating
 * - Update after match
 * - Find opponent for matchmaking
 * - Leaderboards
 * - Player rank/percentile
 */

import express, { Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth';
import { mmrService } from '@/services/MMRService';
import { logger } from '@/config/logger';

const router = express.Router();

/**
 * GET /api/v1/mmr/:gameId/player
 * Get player's MMR rating for a game
 */
router.get(
  '/:gameId/player',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const { gameId } = req.params;

      const rating = await mmrService.getOrCreateRating(userId, gameId);

      return res.json({
        success: true,
        data: {
          mmr: rating.mmr,
          rank: rating.rank,
          division: rating.division,
          wins: rating.wins,
          losses: rating.losses,
          draws: rating.draws,
          winRate: rating.winRate,
          gamesPlayed: rating.gamesPlayed,
          currentWinStreak: rating.currentWinStreak,
          longestWinStreak: rating.longestWinStreak,
          peakMmr: rating.peakMmr,
          season: rating.season,
          placementMatchesRemaining: rating.placementMatchesRemaining,
        },
      });
    } catch (error) {
      logger.error('Failed to get MMR rating:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get rating',
      });
    }
  }
);

/**
 * POST /api/v1/mmr/:gameId/update-after-match
 * Update MMR after a match (server-side only, called after match validation)
 */
router.post(
  '/:gameId/update-after-match',
  authMiddleware,
  [
    body('winnerId').isString().notEmpty(),
    body('loserId').isString().notEmpty(),
    body('isDraw').optional().isBoolean(),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      // This should ideally be called from server-side match validation
      // For security, verify the requester is one of the players or admin
      const userId = req.user?.userId;
      const { winnerId, loserId, isDraw } = req.body;

      if (userId !== winnerId && userId !== loserId && !req.user?.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized to update MMR',
        });
      }

      const { gameId } = req.params;

      const result = await mmrService.updateAfterMatch(gameId, {
        winnerId,
        loserId,
        isDraw,
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Failed to update MMR:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update MMR',
      });
    }
  }
);

/**
 * GET /api/v1/mmr/:gameId/find-opponent
 * Find a suitable opponent for matchmaking
 */
router.get(
  '/:gameId/find-opponent',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const { gameId } = req.params;

      const opponent = await mmrService.findOpponent(userId, gameId);

      if (!opponent) {
        return res.json({
          success: true,
          data: null,
          message: 'No suitable opponent found at this time',
        });
      }

      return res.json({
        success: true,
        data: {
          opponentId: opponent.userId,
          opponentMmr: opponent.mmr,
          opponentRank: `${opponent.rank} ${opponent.division}`,
          opponentWins: opponent.wins,
          opponentLosses: opponent.losses,
        },
      });
    } catch (error) {
      logger.error('Failed to find opponent:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to find opponent',
      });
    }
  }
);

/**
 * GET /api/v1/mmr/:gameId/leaderboard
 * Get MMR leaderboard for a game
 */
router.get(
  '/:gameId/leaderboard',
  [query('limit').optional().isInt({ min: 1, max: 100 })],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { gameId } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;

      const leaderboard = await mmrService.getLeaderboard(gameId, limit);

      return res.json({
        success: true,
        data: {
          gameId,
          leaderboard,
        },
      });
    } catch (error) {
      logger.error('Failed to get MMR leaderboard:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get leaderboard',
      });
    }
  }
);

/**
 * GET /api/v1/mmr/:gameId/player-rank
 * Get player's rank and leaderboard position
 */
router.get(
  '/:gameId/player-rank',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const { gameId } = req.params;

      const rankInfo = await mmrService.getPlayerRank(userId, gameId);

      if (!rankInfo) {
        return res.status(404).json({
          success: false,
          error: 'Rank not found',
        });
      }

      return res.json({
        success: true,
        data: rankInfo,
      });
    } catch (error) {
      logger.error('Failed to get player rank:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get rank',
      });
    }
  }
);

/**
 * POST /api/v1/mmr/reset-season
 * Reset MMR for new season (admin only)
 */
router.post(
  '/reset-season',
  authMiddleware,
  [body('newSeason').isString().notEmpty()],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user?.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
        });
      }

      const { newSeason } = req.body;

      await mmrService.resetSeason(newSeason);

      return res.json({
        success: true,
        message: `Season reset to ${newSeason}`,
      });
    } catch (error) {
      logger.error('Failed to reset season:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to reset season',
      });
    }
  }
);

export default router;

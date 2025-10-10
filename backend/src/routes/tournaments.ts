/**
 * Tournament Routes
 * Handles tournament creation, joining, score submission, and leaderboards
 */

import express, { Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth';
import { globalLimiter } from '@/middleware/security';
import { Tournament } from '@/models/Tournament';
import { User } from '@/models/User';
import { GameSession } from '@/models/GameSession';
import { Transaction } from '@/models/Transaction';
import { getCache, setCache, deleteCache } from '@/config/redis';
import { logger } from '@/config/logger';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * GET /api/v1/tournaments/active
 * Get active tournaments
 */
router.get(
  '/active',
  authMiddleware,
  [
    query('gameId').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { gameId, limit = 20 } = req.query;

      const filter: any = {
        status: { $in: ['upcoming', 'active'] },
        endTime: { $gt: new Date() },
      };

      if (gameId) {
        filter.gameId = gameId;
      }

      const tournaments = await Tournament.find(filter)
        .sort({ startTime: 1 })
        .limit(parseInt(limit as string))
        .lean();

      res.json({
        success: true,
        data: { tournaments },
      });
    } catch (error) {
      logger.error('Get active tournaments error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get tournaments',
      });
    }
  }
);

/**
 * GET /api/v1/tournaments/:id
 * Get tournament details
 */
router.get(
  '/:id',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      const tournament = await Tournament.findById(id).lean();

      if (!tournament) {
        return res.status(404).json({
          success: false,
          error: 'Tournament not found',
        });
      }

      res.json({
        success: true,
        data: { tournament },
      });
    } catch (error) {
      logger.error('Get tournament details error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get tournament details',
      });
    }
  }
);

/**
 * POST /api/v1/tournaments/join
 * Join a tournament
 */
router.post(
  '/join',
  authMiddleware,
  globalLimiter,
  [
    body('tournamentId').isString().notEmpty(),
    body('entryFee').isInt({ min: 0 }),
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

      const { tournamentId, entryFee } = req.body;

      // Get tournament
      const tournament = await Tournament.findById(tournamentId);
      if (!tournament) {
        return res.status(404).json({
          success: false,
          error: 'Tournament not found',
        });
      }

      // Check if tournament is joinable
      if (tournament.status === 'ended') {
        return res.status(400).json({
          success: false,
          error: 'Tournament has ended',
        });
      }

      if (tournament.status === 'active') {
        return res.status(400).json({
          success: false,
          error: 'Tournament already in progress',
        });
      }

      // Check if already joined
      if (tournament.participants.some((p: any) => p.userId.toString() === userId)) {
        return res.status(400).json({
          success: false,
          error: 'Already joined this tournament',
        });
      }

      // Check if full
      if (tournament.participants.length >= tournament.maxPlayers) {
        return res.status(400).json({
          success: false,
          error: 'Tournament is full',
        });
      }

      // Get user and check balance
      const user = await User.findById(userId);
      if (!user || !user.coins || user.coins.balance < entryFee) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient balance',
        });
      }

      // Deduct entry fee
      await User.findByIdAndUpdate(userId, {
        $inc: {
          'coins.balance': -entryFee,
          'coins.totalSpent': entryFee,
        },
      });

      // Add to tournament
      tournament.participants.push({
        userId,
        username: user.username,
        avatar: user.avatar,
        score: 0,
        rank: 0,
        joinedAt: new Date(),
      } as any);

      tournament.prizePool += entryFee * 0.9; // 10% rake

      await tournament.save();

      // Create transaction
      await Transaction.create({
        userId,
        type: 'tournament_entry',
        amount: -entryFee,
        currency: 'coins',
        status: 'completed',
        description: `Entry fee for ${tournament.name}`,
        metadata: {
          tournamentId: tournament._id,
          gameId: tournament.gameId,
        },
      });

      logger.info(`User ${userId} joined tournament ${tournamentId}`);

      res.json({
        success: true,
        message: 'Successfully joined tournament',
        data: {
          tournament,
          newBalance: user.coins.balance - entryFee,
        },
      });
    } catch (error) {
      logger.error('Join tournament error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to join tournament',
      });
    }
  }
);

/**
 * POST /api/v1/tournaments/submit-score
 * Submit score to tournament (idempotent with signature validation)
 */
router.post(
  '/submit-score',
  authMiddleware,
  globalLimiter,
  [
    body('tournamentId').isString().notEmpty(),
    body('sessionId').isString().notEmpty(),
    body('score').isInt({ min: 0 }),
    body('signature').isString().notEmpty(),
    body('metadata').optional().isObject(),
    body('timestamp').isInt(),
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

      const { tournamentId, sessionId, score, signature, metadata, timestamp } = req.body;

      // Verify signature (HMAC-SHA256)
      const secret = process.env.GAME_SECRET_KEY || 'game-secret-key';
      const message = `${sessionId}:${score}`;
      const expectedSignature = crypto.createHmac('sha256', secret).update(message).digest('hex');

      if (signature !== expectedSignature) {
        logger.warn(`Invalid signature for score submission: user ${userId}, session ${sessionId}`);
        return res.status(400).json({
          success: false,
          error: 'Invalid score signature',
        });
      }

      // Check idempotency - has this score already been submitted?
      const submissionKey = `tournament:submission:${tournamentId}:${sessionId}`;
      const existingSubmission = await getCache(submissionKey);
      if (existingSubmission) {
        return res.json({
          success: true,
          message: 'Score already submitted',
          data: existingSubmission,
        });
      }

      // Get tournament
      const tournament = await Tournament.findById(tournamentId);
      if (!tournament) {
        return res.status(404).json({
          success: false,
          error: 'Tournament not found',
        });
      }

      if (tournament.status === 'ended') {
        return res.status(400).json({
          success: false,
          error: 'Tournament has ended',
        });
      }

      // Find participant
      const participant = tournament.participants.find((p: any) => p.userId.toString() === userId);
      if (!participant) {
        return res.status(400).json({
          success: false,
          error: 'Not a participant in this tournament',
        });
      }

      // Update score (keep highest score)
      const isNewHighScore = score > (participant.score || 0);
      if (isNewHighScore) {
        participant.score = score;

        // Recalculate ranks
        const sortedParticipants = [...tournament.participants].sort((a: any, b: any) => b.score - a.score);
        sortedParticipants.forEach((p: any, index) => {
          p.rank = index + 1;
        });

        await tournament.save();

        // Update leaderboard in Redis (sorted set)
        const leaderboardKey = `tournament:${tournamentId}:leaderboard`;
        await setCache(leaderboardKey, sortedParticipants, 3600);
      }

      // Store submission for idempotency
      const submissionData = {
        rank: participant.rank,
        score: participant.score,
        isNewHighScore,
        timestamp: Date.now(),
      };
      await setCache(submissionKey, submissionData, 3600); // 1 hour TTL

      logger.info(`Score submitted for user ${userId} in tournament ${tournamentId}: ${score} (high: ${isNewHighScore})`);

      res.json({
        success: true,
        data: submissionData,
      });
    } catch (error) {
      logger.error('Submit score error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit score',
      });
    }
  }
);

/**
 * GET /api/v1/tournaments/:id/leaderboard
 * Get tournament leaderboard
 */
router.get(
  '/:id/leaderboard',
  authMiddleware,
  [query('limit').optional().isInt({ min: 1, max: 100 })],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { limit = 100 } = req.query;

      // Try Redis cache first
      const leaderboardKey = `tournament:${id}:leaderboard`;
      let leaderboard = await getCache(leaderboardKey) as any[];

      if (!leaderboard) {
        // Fallback to database
        const tournament = await Tournament.findById(id).lean();
        if (!tournament) {
          return res.status(404).json({
            success: false,
            error: 'Tournament not found',
          });
        }

        leaderboard = [...tournament.participants]
          .sort((a: any, b: any) => b.score - a.score)
          .slice(0, parseInt(limit as string));

        // Cache for 30 seconds
        await setCache(leaderboardKey, leaderboard, 30);
      } else {
        leaderboard = leaderboard.slice(0, parseInt(limit as string));
      }

      res.json({
        success: true,
        data: { leaderboard },
      });
    } catch (error) {
      logger.error('Get leaderboard error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get leaderboard',
      });
    }
  }
);

/**
 * GET /api/v1/tournaments/:id/my-rank
 * Get user's rank in tournament
 */
router.get(
  '/:id/my-rank',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const tournament = await Tournament.findById(id).lean();
      if (!tournament) {
        return res.status(404).json({
          success: false,
          error: 'Tournament not found',
        });
      }

      const participant = tournament.participants.find((p: any) => p.userId.toString() === userId);
      if (!participant) {
        return res.status(404).json({
          success: false,
          error: 'Not a participant in this tournament',
        });
      }

      res.json({
        success: true,
        data: {
          rank: participant.rank,
          score: participant.score,
        },
      });
    } catch (error) {
      logger.error('Get user rank error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get rank',
      });
    }
  }
);

/**
 * GET /api/v1/tournaments/history
 * Get user's tournament history
 */
router.get(
  '/history',
  authMiddleware,
  [query('limit').optional().isInt({ min: 1, max: 100 })],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      const { limit = 20 } = req.query;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const tournaments = await Tournament.find({
        'participants.userId': userId,
      })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit as string))
        .lean();

      res.json({
        success: true,
        data: { tournaments },
      });
    } catch (error) {
      logger.error('Get tournament history error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get tournament history',
      });
    }
  }
);

/**
 * POST /api/v1/tournaments/:id/leave
 * Leave a tournament (before it starts)
 */
router.post(
  '/:id/leave',
  authMiddleware,
  globalLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const tournament = await Tournament.findById(id);
      if (!tournament) {
        return res.status(404).json({
          success: false,
          error: 'Tournament not found',
        });
      }

      if (tournament.status !== 'upcoming') {
        return res.status(400).json({
          success: false,
          error: 'Cannot leave tournament that has started',
        });
      }

      const participantIndex = tournament.participants.findIndex((p: any) => p.userId.toString() === userId);
      if (participantIndex === -1) {
        return res.status(400).json({
          success: false,
          error: 'Not a participant in this tournament',
        });
      }

      const entryFee = tournament.entryFee;

      // Remove participant
      tournament.participants.splice(participantIndex, 1);
      tournament.prizePool -= entryFee * 0.9;

      await tournament.save();

      // Refund entry fee
      await User.findByIdAndUpdate(userId, {
        $inc: {
          'coins.balance': entryFee,
          'coins.totalSpent': -entryFee,
        },
      });

      // Create refund transaction
      await Transaction.create({
        userId,
        type: 'tournament_refund',
        amount: entryFee,
        currency: 'coins',
        status: 'completed',
        description: `Refund for leaving ${tournament.name}`,
        metadata: {
          tournamentId: tournament._id,
        },
      });

      logger.info(`User ${userId} left tournament ${id}`);

      res.json({
        success: true,
        message: 'Successfully left tournament and refunded',
      });
    } catch (error) {
      logger.error('Leave tournament error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to leave tournament',
      });
    }
  }
);

export default router;


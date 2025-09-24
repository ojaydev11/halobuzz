import express from 'express';
import { body, validationResult } from 'express-validator';
import { logger } from '../config/logger';
import { AuthenticatedRequest } from '../middleware/auth';
import aiGameService from '../services/AIGameService';
import { Game } from '../models/Game';
import { User } from '../models/User';

const router = express.Router();

// Create AI game session
router.post('/session/create', [
  body('gameId')
    .notEmpty()
    .withMessage('Game ID is required')
    .isMongoId()
    .withMessage('Invalid game ID'),
  body('players')
    .isArray({ min: 1 })
    .withMessage('At least one player is required'),
  body('players.*.userId')
    .notEmpty()
    .withMessage('Player user ID is required'),
  body('players.*.betAmount')
    .isInt({ min: 1 })
    .withMessage('Valid bet amount is required'),
  body('gameType')
    .optional()
    .isIn(['single', 'multiplayer'])
    .withMessage('Game type must be single or multiplayer')
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { gameId, players, gameType = 'single' } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    // Validate game exists and is active
    const game = await Game.findById(gameId);
    if (!game || !game.isActive) {
      return res.status(404).json({
        success: false,
        error: 'Game not found or inactive'
      });
    }

    // Validate AI win rate is within bounds
    if (game.aiWinRate < 35 || game.aiWinRate > 55) {
      return res.status(400).json({
        success: false,
        error: 'Game configuration invalid - AI win rate out of bounds'
      });
    }

    // Validate players and check balances
    const validatedPlayers = [];
    for (const player of players) {
      const user = await User.findById(player.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: `User ${player.userId} not found`
        });
      }

      if (user.coins?.balance < player.betAmount) {
        return res.status(400).json({
          success: false,
          error: `User ${user.username} has insufficient coins`
        });
      }

      validatedPlayers.push({
        userId: player.userId,
        username: user.username,
        betAmount: player.betAmount
      });
    }

    // Create AI game session
    const result = await aiGameService.createGameSession(gameId, validatedPlayers, gameType);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    logger.info(`AI game session created: ${result.sessionId} for game ${gameId}`);

    res.json({
      success: true,
      data: {
        sessionId: result.sessionId,
        gameId,
        gameType,
        players: validatedPlayers,
        aiWinRate: game.aiWinRate,
        targetRTP: 60,
        houseEdge: 40
      }
    });

  } catch (error) {
    logger.error('Error creating AI game session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create game session'
    });
  }
});

// Start AI game session
router.post('/session/:sessionId/start', async (req: AuthenticatedRequest, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    // Start the game session
    const result = await aiGameService.startGameSession(sessionId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    logger.info(`AI game session started: ${sessionId}`);

    res.json({
      success: true,
      message: 'Game session started successfully'
    });

  } catch (error) {
    logger.error('Error starting AI game session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start game session'
    });
  }
});

// Process game round
router.post('/session/:sessionId/round', [
  body('playerActions')
    .isArray({ min: 1 })
    .withMessage('Player actions are required'),
  body('playerActions.*.playerId')
    .notEmpty()
    .withMessage('Player ID is required'),
  body('playerActions.*.action')
    .notEmpty()
    .withMessage('Action data is required')
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { sessionId } = req.params;
    const { playerActions } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    // Process the game round
    const result = await aiGameService.processGameRound(sessionId, playerActions);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    logger.info(`Game round processed: ${sessionId}`);

    res.json({
      success: true,
      data: {
        outcome: result.outcome,
        roundCompleted: true,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error processing game round:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process game round'
    });
  }
});

// Get session status
router.get('/session/:sessionId', async (req: AuthenticatedRequest, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    // Get session from cache
    const session = await aiGameService.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        gameId: session.gameId,
        status: session.status,
        roundNumber: session.roundNumber,
        totalRounds: session.totalRounds,
        players: session.players.map(player => ({
          userId: player.userId,
          username: player.username,
          currentScore: player.currentScore,
          totalWinnings: player.totalWinnings,
          isAI: player.isAI,
          aiDifficulty: player.aiDifficulty
        })),
        aiWinRate: session.aiWinRate,
        antiCheatData: {
          riskScore: session.antiCheatData.riskScore,
          flags: session.antiCheatData.flags
        }
      }
    });

  } catch (error) {
    logger.error('Error getting session status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session status'
    });
  }
});

// Get AI game statistics
router.get('/statistics', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    // Get statistics
    const stats = await aiGameService.getSessionStatistics();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error('Error getting AI game statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics'
    });
  }
});

// Get available AI games
router.get('/games', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    // Get active games with AI support
    const games = await Game.find({
      isActive: true,
      aiWinRate: { $gte: 35, $lte: 55 }
    }).select('name code description type category aiWinRate entryFee minStake maxStake');

    res.json({
      success: true,
      data: games
    });

  } catch (error) {
    logger.error('Error getting AI games:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get games'
    });
  }
});

// Report suspicious activity
router.post('/report/suspicious', [
  body('sessionId')
    .notEmpty()
    .withMessage('Session ID is required'),
  body('reason')
    .notEmpty()
    .withMessage('Reason is required'),
  body('details')
    .optional()
    .isString()
    .withMessage('Details must be a string')
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { sessionId, reason, details } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    // Log suspicious activity report
    logger.warn(`Suspicious activity reported: ${sessionId} - ${reason}`, {
      sessionId,
      reporterId: userId,
      reason,
      details,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Suspicious activity reported successfully'
    });

  } catch (error) {
    logger.error('Error reporting suspicious activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to report suspicious activity'
    });
  }
});

export default router;

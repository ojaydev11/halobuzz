import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { advancedGamesService } from '../services/AdvancedGamesService';
import { logger } from '../config/logger';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for advanced games
const gameJoinLimit = rateLimit({
  windowMs: 60000, // 1 minute
  max: 5, // 5 game joins per minute
  message: {
    success: false,
    error: 'Too many game join attempts. Please wait before trying again.'
  }
});

const actionLimit = rateLimit({
  windowMs: 1000, // 1 second
  max: 10, // 10 actions per second
  message: {
    success: false,
    error: 'Action rate limit exceeded. Please slow down.'
  }
});

/**
 * GET /advanced-games/list
 * Get all available advanced games
 */
router.get('/list', async (req: Request, res: Response) => {
  try {
    const games = advancedGamesService.getAvailableGames();

    res.json({
      success: true,
      games: games.map(game => ({
        _id: game.id,
        name: game.name,
        code: game.code,
        description: `Advanced ${game.type.replace('-', ' ')} game with ${game.playerCapacity} players`,
        type: game.type,
        category: game.category,
        minStake: 10, // Base minimum
        maxStake: 10000,
        duration: game.duration / 1000, // Convert to seconds
        playerCount: game.playerCapacity,
        difficulty: game.difficulty,
        features: game.features,
        rewards: game.rewards,
        requirements: game.requirements
      }))
    });
  } catch (error) {
    logger.error('Error fetching advanced games list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch games list'
    });
  }
});

/**
 * GET /advanced-games/:gameCode
 * Get specific game details
 */
router.get('/:gameCode', async (req: Request, res: Response) => {
  try {
    const { gameCode } = req.params;
    const games = advancedGamesService.getAvailableGames();
    const game = games.find(g => g.code === gameCode);

    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }

    res.json({
      success: true,
      game: {
        _id: game.id,
        name: game.name,
        code: game.code,
        description: `Advanced ${game.type.replace('-', ' ')} game`,
        type: game.type,
        category: game.category,
        playerCapacity: game.playerCapacity,
        duration: game.duration,
        difficulty: game.difficulty,
        features: game.features,
        rewards: game.rewards,
        requirements: game.requirements
      }
    });
  } catch (error) {
    logger.error('Error fetching game details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch game details'
    });
  }
});

/**
 * POST /advanced-games/:gameCode/join
 * Join an advanced game session
 */
router.post('/:gameCode/join', authenticateToken, gameJoinLimit, async (req: Request, res: Response) => {
  try {
    const { gameCode } = req.params;
    const { stake } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    if (!stake || stake < 10) {
      return res.status(400).json({
        success: false,
        error: 'Invalid stake amount'
      });
    }

    // Mock user data (in production, fetch from database)
    const user = {
      id: userId,
      username: req.user?.username || 'Player',
      level: 10,
      avatar: '🎮',
      stake: stake
    };

    // Check if user meets requirements (mock check)
    const games = advancedGamesService.getAvailableGames();
    const game = games.find(g => g.code === gameCode);

    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }

    // Mock requirements check
    if (user.level < game.requirements.level) {
      return res.status(403).json({
        success: false,
        error: `Level ${game.requirements.level} required. You are level ${user.level}.`
      });
    }

    // Join the game
    const session = await advancedGamesService.joinGame(gameCode, user);

    logger.info(`User ${userId} joined game ${gameCode} with stake ${stake}`);

    res.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        gameId: session.gameId,
        status: session.status,
        players: Array.from(session.players.values()).map(p => ({
          id: p.id,
          username: p.username,
          level: p.level,
          score: p.score,
          rank: p.rank,
          status: p.status
        })),
        timeRemaining: session.timeRemaining,
        currentRound: session.currentRound,
        totalRounds: session.totalRounds,
        totalPot: session.totalPot
      }
    });
  } catch (error: any) {
    logger.error('Error joining game:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to join game'
    });
  }
});

/**
 * GET /advanced-games/session/:sessionId
 * Get game session status
 */
router.get('/session/:sessionId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = advancedGamesService.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    res.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        gameId: session.gameId,
        status: session.status,
        players: Array.from(session.players.values()).map(p => ({
          id: p.id,
          username: p.username,
          level: p.level,
          score: p.score,
          rank: p.rank,
          status: p.status
        })),
        timeRemaining: session.timeRemaining,
        currentRound: session.currentRound,
        totalRounds: session.totalRounds,
        totalPot: session.totalPot,
        startTime: session.startTime,
        endTime: session.endTime
      }
    });
  } catch (error) {
    logger.error('Error fetching session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch session'
    });
  }
});

/**
 * POST /advanced-games/session/:sessionId/action
 * Perform action in game session
 */
router.post('/session/:sessionId/action', authenticateToken, actionLimit, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { action } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Action required'
      });
    }

    await advancedGamesService.handlePlayerAction(sessionId, userId, action);

    res.json({
      success: true,
      message: 'Action processed successfully'
    });
  } catch (error: any) {
    logger.error('Error processing action:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process action'
    });
  }
});

/**
 * GET /advanced-games/:gameCode/leaderboard
 * Get game leaderboard
 */
router.get('/:gameCode/leaderboard', async (req: Request, res: Response) => {
  try {
    const { gameCode } = req.params;
    const { limit = 50, period = 'all' } = req.query;

    // Mock leaderboard data
    const mockLeaderboard = [
      { rank: 1, username: 'GameMaster', score: 15000, winRate: 0.85, level: 25, coinsEarned: 50000 },
      { rank: 2, username: 'ProGamer', score: 14200, winRate: 0.82, level: 23, coinsEarned: 45000 },
      { rank: 3, username: 'ElitePlayer', score: 13800, winRate: 0.79, level: 22, coinsEarned: 42000 },
      { rank: 4, username: 'Champion', score: 13200, winRate: 0.76, level: 21, coinsEarned: 38000 },
      { rank: 5, username: 'Warrior', score: 12800, winRate: 0.73, level: 20, coinsEarned: 35000 }
    ];

    res.json({
      success: true,
      leaderboard: mockLeaderboard.slice(0, Number(limit)),
      gameCode,
      period,
      total: mockLeaderboard.length
    });
  } catch (error) {
    logger.error('Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard'
    });
  }
});

/**
 * GET /advanced-games/tournaments/upcoming
 * Get upcoming tournaments
 */
router.get('/tournaments/upcoming', async (req: Request, res: Response) => {
  try {
    // Mock tournament data
    const upcomingTournaments = [
      {
        id: 'tournament_1',
        name: 'Weekly Chess Championship',
        gameCode: 'speed-chess',
        startTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        entryFee: 100,
        prizePool: 10000,
        maxPlayers: 64,
        registeredPlayers: 32,
        status: 'open'
      },
      {
        id: 'tournament_2',
        name: 'Battle Royale Showdown',
        gameCode: 'crypto-battle-royale',
        startTime: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
        entryFee: 250,
        prizePool: 50000,
        maxPlayers: 100,
        registeredPlayers: 78,
        status: 'open'
      },
      {
        id: 'tournament_3',
        name: 'Strategy Masters Cup',
        gameCode: 'strategy-empire',
        startTime: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
        entryFee: 500,
        prizePool: 100000,
        maxPlayers: 16,
        registeredPlayers: 8,
        status: 'open'
      }
    ];

    res.json({
      success: true,
      tournaments: upcomingTournaments
    });
  } catch (error) {
    logger.error('Error fetching tournaments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tournaments'
    });
  }
});

/**
 * POST /advanced-games/tournaments/:tournamentId/register
 * Register for a tournament
 */
router.post('/tournaments/:tournamentId/register', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { tournamentId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    // Mock tournament registration
    logger.info(`User ${userId} registered for tournament ${tournamentId}`);

    res.json({
      success: true,
      message: 'Successfully registered for tournament',
      tournamentId
    });
  } catch (error) {
    logger.error('Error registering for tournament:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register for tournament'
    });
  }
});

/**
 * WebSocket support for real-time game updates
 * This would typically be handled by Socket.IO
 */
router.get('/session/:sessionId/events', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = advancedGamesService.getSession(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Return recent events
    const recentEvents = session.events.slice(-10);

    res.json({
      success: true,
      events: recentEvents,
      sessionStatus: session.status
    });
  } catch (error) {
    logger.error('Error fetching session events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch session events'
    });
  }
});

export default router;
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { leaderboardService } from '../services/LeaderboardService';
import { logger } from '../config/logger';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting
const leaderboardLimit = rateLimit({
  windowMs: 60000, // 1 minute
  max: 20, // 20 requests per minute
  message: {
    success: false,
    error: 'Too many leaderboard requests. Please wait before trying again.'
  }
});

/**
 * GET /leaderboards/global/:gameCode
 * Get global leaderboard for a specific game
 */
router.get('/global/:gameCode', leaderboardLimit, async (req: Request, res: Response) => {
  try {
    const { gameCode } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const leaderboard = leaderboardService.getGlobalLeaderboard(
      gameCode,
      Number(limit),
      Number(offset)
    );

    res.json({
      success: true,
      leaderboard,
      gameCode,
      period: 'global',
      total: leaderboard.length,
      limit: Number(limit),
      offset: Number(offset)
    });
  } catch (error) {
    logger.error('Error fetching global leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch global leaderboard'
    });
  }
});

/**
 * GET /leaderboards/weekly/:gameCode
 * Get weekly leaderboard for a specific game
 */
router.get('/weekly/:gameCode', leaderboardLimit, async (req: Request, res: Response) => {
  try {
    const { gameCode } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const leaderboard = leaderboardService.getWeeklyLeaderboard(
      gameCode,
      Number(limit),
      Number(offset)
    );

    res.json({
      success: true,
      leaderboard,
      gameCode,
      period: 'weekly',
      total: leaderboard.length,
      limit: Number(limit),
      offset: Number(offset),
      resetTime: this.getNextWeeklyReset()
    });
  } catch (error) {
    logger.error('Error fetching weekly leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch weekly leaderboard'
    });
  }
});

/**
 * GET /leaderboards/monthly/:gameCode
 * Get monthly leaderboard for a specific game
 */
router.get('/monthly/:gameCode', leaderboardLimit, async (req: Request, res: Response) => {
  try {
    const { gameCode } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const leaderboard = leaderboardService.getMonthlyLeaderboard(
      gameCode,
      Number(limit),
      Number(offset)
    );

    res.json({
      success: true,
      leaderboard,
      gameCode,
      period: 'monthly',
      total: leaderboard.length,
      limit: Number(limit),
      offset: Number(offset),
      resetTime: this.getNextMonthlyReset()
    });
  } catch (error) {
    logger.error('Error fetching monthly leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch monthly leaderboard'
    });
  }
});

/**
 * GET /leaderboards/player/:gameCode
 * Get specific player's ranking in a game
 */
router.get('/player/:gameCode', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { gameCode } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const playerRanking = leaderboardService.getPlayerRanking(gameCode, userId);

    if (!playerRanking) {
      return res.json({
        success: true,
        playerRanking: null,
        message: 'Player has not played this game yet'
      });
    }

    res.json({
      success: true,
      playerRanking,
      gameCode
    });
  } catch (error) {
    logger.error('Error fetching player ranking:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch player ranking'
    });
  }
});

/**
 * GET /leaderboards/global-rankings
 * Get cross-game global player rankings
 */
router.get('/global-rankings', leaderboardLimit, async (req: Request, res: Response) => {
  try {
    const { limit = 100 } = req.query;

    const globalRankings = leaderboardService.getGlobalPlayerRankings(Number(limit));

    res.json({
      success: true,
      globalRankings,
      total: globalRankings.length,
      limit: Number(limit),
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching global rankings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch global rankings'
    });
  }
});

/**
 * GET /leaderboards/tournaments
 * Get all tournaments
 */
router.get('/tournaments', async (req: Request, res: Response) => {
  try {
    const { status = 'all' } = req.query;

    let tournaments = leaderboardService.getAllTournaments();

    if (status !== 'all') {
      tournaments = tournaments.filter(t => t.status === status);
    }

    res.json({
      success: true,
      tournaments: tournaments.map(tournament => ({
        id: tournament.id,
        name: tournament.name,
        gameCode: tournament.gameCode,
        startTime: tournament.startTime.toISOString(),
        endTime: tournament.endTime.toISOString(),
        entryFee: tournament.entryFee,
        prizePool: tournament.prizePool,
        maxPlayers: tournament.maxPlayers,
        registeredPlayers: tournament.registeredPlayers,
        status: tournament.status,
        format: tournament.format,
        rewards: tournament.rewards
      })),
      total: tournaments.length,
      status
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
 * GET /leaderboards/tournaments/upcoming
 * Get upcoming tournaments
 */
router.get('/tournaments/upcoming', async (req: Request, res: Response) => {
  try {
    const upcomingTournaments = leaderboardService.getUpcomingTournaments();

    res.json({
      success: true,
      tournaments: upcomingTournaments.map(tournament => ({
        id: tournament.id,
        name: tournament.name,
        gameCode: tournament.gameCode,
        startTime: tournament.startTime.toISOString(),
        endTime: tournament.endTime.toISOString(),
        entryFee: tournament.entryFee,
        prizePool: tournament.prizePool,
        maxPlayers: tournament.maxPlayers,
        registeredPlayers: tournament.registeredPlayers,
        status: tournament.status,
        format: tournament.format,
        rules: tournament.rules,
        rewards: tournament.rewards,
        timeUntilStart: tournament.startTime.getTime() - Date.now(),
        spotsRemaining: tournament.maxPlayers - tournament.registeredPlayers
      })),
      total: upcomingTournaments.length
    });
  } catch (error) {
    logger.error('Error fetching upcoming tournaments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upcoming tournaments'
    });
  }
});

/**
 * POST /leaderboards/tournaments/:tournamentId/register
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

    const playerData = {
      id: userId,
      username: req.user?.username || 'Player',
      level: 10, // Mock level
      registrationTime: new Date()
    };

    const success = await leaderboardService.registerForTournament(tournamentId, userId, playerData);

    if (success) {
      res.json({
        success: true,
        message: 'Successfully registered for tournament',
        tournamentId
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to register for tournament'
      });
    }
  } catch (error: any) {
    logger.error('Error registering for tournament:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to register for tournament'
    });
  }
});

/**
 * GET /leaderboards/tournaments/:tournamentId
 * Get specific tournament details
 */
router.get('/tournaments/:tournamentId', async (req: Request, res: Response) => {
  try {
    const { tournamentId } = req.params;
    const tournaments = leaderboardService.getAllTournaments();
    const tournament = tournaments.find(t => t.id === tournamentId);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        error: 'Tournament not found'
      });
    }

    res.json({
      success: true,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        gameCode: tournament.gameCode,
        startTime: tournament.startTime.toISOString(),
        endTime: tournament.endTime.toISOString(),
        entryFee: tournament.entryFee,
        prizePool: tournament.prizePool,
        maxPlayers: tournament.maxPlayers,
        registeredPlayers: tournament.registeredPlayers,
        status: tournament.status,
        format: tournament.format,
        rules: tournament.rules,
        rewards: tournament.rewards,
        timeUntilStart: tournament.startTime.getTime() - Date.now(),
        spotsRemaining: tournament.maxPlayers - tournament.registeredPlayers
      }
    });
  } catch (error) {
    logger.error('Error fetching tournament details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tournament details'
    });
  }
});

/**
 * GET /leaderboards/seasonal-events
 * Get seasonal events and special tournaments
 */
router.get('/seasonal-events', async (req: Request, res: Response) => {
  try {
    const seasonalEvents = leaderboardService.getSeasonalEvents();

    res.json({
      success: true,
      events: seasonalEvents,
      total: seasonalEvents.length
    });
  } catch (error) {
    logger.error('Error fetching seasonal events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch seasonal events'
    });
  }
});

/**
 * GET /leaderboards/stats/summary
 * Get leaderboard statistics summary
 */
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    // Mock statistics
    const stats = {
      totalPlayers: 50000,
      activePlayers24h: 15000,
      activePlayers7d: 35000,
      totalGamesPlayed: 1000000,
      totalPrizesPaid: 25000000,
      avgSessionTime: 1800, // 30 minutes
      topCountries: [
        { country: 'US', players: 12000, percentage: 24 },
        { country: 'UK', players: 6000, percentage: 12 },
        { country: 'DE', players: 5000, percentage: 10 },
        { country: 'JP', players: 4500, percentage: 9 },
        { country: 'KR', players: 4000, percentage: 8 }
      ],
      popularGames: [
        { gameCode: 'crypto-battle-royale', players: 20000, percentage: 40 },
        { gameCode: 'speed-chess', players: 12000, percentage: 24 },
        { gameCode: 'ai-poker', players: 8000, percentage: 16 },
        { gameCode: 'reflex-arena', players: 6000, percentage: 12 },
        { gameCode: 'strategy-empire', players: 4000, percentage: 8 }
      ],
      upcomingTournaments: leaderboardService.getUpcomingTournaments().length,
      activeTournaments: leaderboardService.getAllTournaments().filter(t => t.status === 'active').length
    };

    res.json({
      success: true,
      stats,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching leaderboard stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leaderboard stats'
    });
  }
});

/**
 * Helper functions
 */
function getNextWeeklyReset(): string {
  const now = new Date();
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + (7 - now.getDay() + 1) % 7);
  nextMonday.setHours(0, 0, 0, 0);
  return nextMonday.toISOString();
}

function getNextMonthlyReset(): string {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  nextMonth.setHours(0, 0, 0, 0);
  return nextMonth.toISOString();
}

export default router;
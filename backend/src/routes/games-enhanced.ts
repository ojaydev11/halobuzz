import { Router, Request, Response } from 'express';
import { logger } from '../config/logger';

const router = Router();

// Mock games data
const mockGames = [
  {
    id: 'racing-1',
    name: 'HaloBuzz Racing',
    description: 'High-speed racing through futuristic tracks',
    category: 'arcade',
    difficulty: 'medium',
    entryFee: 10,
    rewardMultiplier: 2.5,
    maxPlayers: 1,
    estimatedDuration: 120, // seconds
    thumbnail: 'https://picsum.photos/300/200?random=1',
    isActive: true,
    features: ['leaderboards', 'achievements', 'power-ups'],
    instructions: 'Use arrow keys to steer, spacebar to boost. Avoid obstacles and collect coins!',
    minLevel: 1,
    maxLevel: 100,
    tags: ['racing', 'speed', 'adventure'],
  },
  {
    id: 'puzzle-1',
    name: 'Puzzle Master',
    description: 'Solve challenging puzzles to earn rewards',
    category: 'puzzle',
    difficulty: 'easy',
    entryFee: 5,
    rewardMultiplier: 1.8,
    maxPlayers: 1,
    estimatedDuration: 180,
    thumbnail: 'https://picsum.photos/300/200?random=2',
    isActive: true,
    features: ['hints', 'time-bonus', 'streak-multiplier'],
    instructions: 'Match the colored blocks to clear the board. Complete levels to earn coins!',
    minLevel: 1,
    maxLevel: 50,
    tags: ['puzzle', 'strategy', 'brain'],
  },
  {
    id: 'battle-1',
    name: 'Battle Arena',
    description: 'Epic battles in the ultimate fighting arena',
    category: 'action',
    difficulty: 'hard',
    entryFee: 25,
    rewardMultiplier: 4.0,
    maxPlayers: 4,
    estimatedDuration: 300,
    thumbnail: 'https://picsum.photos/300/200?random=3',
    isActive: true,
    features: ['multiplayer', 'tournaments', 'rankings'],
    instructions: 'Fight against other players using special moves and combos. Last player standing wins!',
    minLevel: 5,
    maxLevel: 100,
    tags: ['battle', 'multiplayer', 'combat'],
  },
];

// Mock user coins data
const mockUserCoins = {
  balance: 150,
  totalEarned: 500,
  totalSpent: 350,
  recentTransactions: [
    { id: '1', type: 'earn', amount: 50, description: 'Game completion bonus', timestamp: new Date().toISOString() },
    { id: '2', type: 'spend', amount: 10, description: 'Racing game entry', timestamp: new Date().toISOString() },
  ],
};

// Mock leaderboard data
const mockLeaderboards = {
  'racing-1': [
    { rank: 1, username: 'SpeedDemon', score: 15000, coinsEarned: 375, timestamp: new Date().toISOString() },
    { rank: 2, username: 'RacingPro', score: 14200, coinsEarned: 355, timestamp: new Date().toISOString() },
    { rank: 3, username: 'FastLane', score: 13800, coinsEarned: 345, timestamp: new Date().toISOString() },
  ],
  'puzzle-1': [
    { rank: 1, username: 'BrainMaster', score: 2500, coinsEarned: 45, timestamp: new Date().toISOString() },
    { rank: 2, username: 'PuzzleSolver', score: 2300, coinsEarned: 41, timestamp: new Date().toISOString() },
    { rank: 3, username: 'LogicKing', score: 2100, coinsEarned: 38, timestamp: new Date().toISOString() },
  ],
  'battle-1': [
    { rank: 1, username: 'ArenaChamp', score: 5000, coinsEarned: 200, timestamp: new Date().toISOString() },
    { rank: 2, username: 'FightMaster', score: 4800, coinsEarned: 192, timestamp: new Date().toISOString() },
    { rank: 3, username: 'CombatKing', score: 4600, coinsEarned: 184, timestamp: new Date().toISOString() },
  ],
};

// GET /games-enhanced/list - Get all available games
router.get('/list', async (req: Request, res: Response) => {
  try {
    logger.info('Fetching enhanced games list');
    
    const { category, difficulty, minFee, maxFee } = req.query;
    
    let filteredGames = mockGames.filter(game => game.isActive);
    
    // Apply filters
    if (category && category !== 'all') {
      filteredGames = filteredGames.filter(game => game.category === category);
    }
    
    if (difficulty) {
      filteredGames = filteredGames.filter(game => game.difficulty === difficulty);
    }
    
    if (minFee) {
      filteredGames = filteredGames.filter(game => game.entryFee >= Number(minFee));
    }
    
    if (maxFee) {
      filteredGames = filteredGames.filter(game => game.entryFee <= Number(maxFee));
    }
    
    res.json({
      success: true,
      games: filteredGames,
      total: filteredGames.length,
      categories: ['all', 'arcade', 'puzzle', 'action', 'strategy', 'sports'],
      difficulties: ['easy', 'medium', 'hard'],
    });
  } catch (error) {
    logger.error('Error fetching games list:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch games list',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /games-enhanced/:gameId - Get specific game details
router.get('/:gameId', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    logger.info(`Fetching game details for: ${gameId}`);
    
    const game = mockGames.find(g => g.id === gameId);
    
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found',
      });
    }
    
    res.json({
      success: true,
      game,
    });
  } catch (error) {
    logger.error('Error fetching game details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch game details',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /games-enhanced/:gameId/start - Start a game session
router.post('/:gameId/start', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const { userId } = req.body;
    
    logger.info(`Starting game session for game: ${gameId}, user: ${userId}`);
    
    const game = mockGames.find(g => g.id === gameId);
    
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found',
      });
    }
    
    // Check if user has enough coins
    if (mockUserCoins.balance < game.entryFee) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient coins',
        required: game.entryFee,
        available: mockUserCoins.balance,
      });
    }
    
    // Deduct entry fee
    mockUserCoins.balance -= game.entryFee;
    mockUserCoins.totalSpent += game.entryFee;
    
    // Create game session
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session = {
      id: sessionId,
      gameId,
      userId,
      startTime: new Date().toISOString(),
      entryFee: game.entryFee,
      status: 'active',
      score: 0,
      coinsEarned: 0,
    };
    
    res.json({
      success: true,
      session,
      coinsBalance: mockUserCoins.balance,
    });
  } catch (error) {
    logger.error('Error starting game session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start game session',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// POST /games-enhanced/session/:sessionId/complete - Complete a game session
router.post('/session/:sessionId/complete', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { finalScore, isWon, timeSpent } = req.body;
    
    logger.info(`Completing game session: ${sessionId}, score: ${finalScore}`);
    
    // Calculate coins earned based on score and game multiplier
    const game = mockGames.find(g => g.id === 'racing-1'); // Simplified for demo
    const baseCoins = Math.floor(finalScore / 100);
    const multiplier = game?.rewardMultiplier || 1;
    const coinsEarned = Math.floor(baseCoins * multiplier);
    
    // Add coins to user balance
    mockUserCoins.balance += coinsEarned;
    mockUserCoins.totalEarned += coinsEarned;
    
    // Add transaction record
    mockUserCoins.recentTransactions.unshift({
      id: `tx_${Date.now()}`,
      type: 'earn',
      amount: coinsEarned,
      description: `Game completion: ${coinsEarned} coins earned`,
      timestamp: new Date().toISOString(),
    });
    
    res.json({
      success: true,
      session: {
        id: sessionId,
        finalScore,
        coinsEarned,
        isWon,
        timeSpent,
        completedAt: new Date().toISOString(),
      },
      coinsBalance: mockUserCoins.balance,
      totalEarned: mockUserCoins.totalEarned,
    });
  } catch (error) {
    logger.error('Error completing game session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete game session',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /games-enhanced/:gameId/leaderboard - Get game leaderboard
router.get('/:gameId/leaderboard', async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const { limit = 10, offset = 0 } = req.query;
    
    logger.info(`Fetching leaderboard for game: ${gameId}`);
    
    const leaderboard = mockLeaderboards[gameId as keyof typeof mockLeaderboards] || [];
    const paginatedLeaderboard = leaderboard.slice(Number(offset), Number(offset) + Number(limit));
    
    res.json({
      success: true,
      leaderboard: paginatedLeaderboard,
      total: leaderboard.length,
      gameId,
    });
  } catch (error) {
    logger.error('Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// GET /coins/balance - Get user coins balance
router.get('/coins/balance', async (req: Request, res: Response) => {
  try {
    logger.info('Fetching user coins balance');
    
    res.json({
      success: true,
      ...mockUserCoins,
    });
  } catch (error) {
    logger.error('Error fetching coins balance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch coins balance',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
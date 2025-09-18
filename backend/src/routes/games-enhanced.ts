import express from 'express';
import { Request, Response } from 'express';
import { logger } from '../config/logger';
import SecurityMiddleware, { SecurityLevel } from '../middleware/security';

const router = express.Router();
const securityMiddleware = SecurityMiddleware.getInstance();

// Game types and configurations
interface Game {
  id: string;
  name: string;
  description: string;
  category: 'arcade' | 'puzzle' | 'action' | 'strategy' | 'sports';
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  minCoinsToPlay: number;
  coinRewardMultiplier: number;
  maxPlayers: number;
  isActive: boolean;
  thumbnail: string;
  gameUrl: string;
  instructions: string[];
  leaderboardEnabled: boolean;
  achievements: Achievement[];
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  coinReward: number;
  xpReward: number;
  requirement: {
    type: 'score' | 'time' | 'wins' | 'streak' | 'combo';
    value: number;
  };
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface GameSession {
  id: string;
  userId: string;
  gameId: string;
  startTime: Date;
  endTime?: Date;
  score: number;
  coinsEarned: number;
  xpEarned: number;
  achievements: string[];
  isCompleted: boolean;
  isWon: boolean;
  gameData: any;
}

interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName: string;
  avatar?: string;
  score: number;
  rank: number;
  gameId: string;
  timestamp: Date;
}

// Mock games data
const games: Game[] = [
  {
    id: '1',
    name: 'HaloBuzz Racing',
    description: 'High-speed racing game with power-ups and obstacles',
    category: 'arcade',
    difficulty: 'medium',
    minCoinsToPlay: 10,
    coinRewardMultiplier: 2.5,
    maxPlayers: 4,
    isActive: true,
    thumbnail: 'https://via.placeholder.com/300x200/ff0000/ffffff?text=Racing+Game',
    gameUrl: '/games/racing',
    instructions: [
      'Use arrow keys or swipe to control your car',
      'Collect coins and power-ups',
      'Avoid obstacles and other cars',
      'Complete laps to earn bonus points'
    ],
    leaderboardEnabled: true,
    achievements: [
      {
        id: 'racing_1',
        name: 'First Race',
        description: 'Complete your first race',
        icon: '🏁',
        coinReward: 50,
        xpReward: 100,
        requirement: { type: 'wins', value: 1 },
        rarity: 'common'
      },
      {
        id: 'racing_2',
        name: 'Speed Demon',
        description: 'Complete a race in under 60 seconds',
        icon: '⚡',
        coinReward: 200,
        xpReward: 500,
        requirement: { type: 'time', value: 60 },
        rarity: 'rare'
      }
    ]
  },
  {
    id: '2',
    name: 'Puzzle Master',
    description: 'Match-3 puzzle game with special effects',
    category: 'puzzle',
    difficulty: 'easy',
    minCoinsToPlay: 5,
    coinRewardMultiplier: 1.8,
    maxPlayers: 1,
    isActive: true,
    thumbnail: 'https://via.placeholder.com/300x200/00ff00/ffffff?text=Puzzle+Game',
    gameUrl: '/games/puzzle',
    instructions: [
      'Match 3 or more gems of the same color',
      'Create special combinations for bonus points',
      'Clear all gems to advance to next level',
      'Use power-ups strategically'
    ],
    leaderboardEnabled: true,
    achievements: [
      {
        id: 'puzzle_1',
        name: 'Gem Collector',
        description: 'Collect 1000 gems',
        icon: '💎',
        coinReward: 100,
        xpReward: 200,
        requirement: { type: 'score', value: 1000 },
        rarity: 'common'
      }
    ]
  },
  {
    id: '3',
    name: 'Battle Arena',
    description: 'Real-time multiplayer battle game',
    category: 'action',
    difficulty: 'hard',
    minCoinsToPlay: 25,
    coinRewardMultiplier: 4.0,
    maxPlayers: 8,
    isActive: true,
    thumbnail: 'https://via.placeholder.com/300x200/ff00ff/ffffff?text=Battle+Game',
    gameUrl: '/games/battle',
    instructions: [
      'Defeat other players to earn points',
      'Collect weapons and power-ups',
      'Survive as long as possible',
      'Last player standing wins'
    ],
    leaderboardEnabled: true,
    achievements: [
      {
        id: 'battle_1',
        name: 'Warrior',
        description: 'Win 10 battles',
        icon: '⚔️',
        coinReward: 500,
        xpReward: 1000,
        requirement: { type: 'wins', value: 10 },
        rarity: 'epic'
      }
    ]
  }
];

// Mock game sessions storage
const gameSessions: Map<string, GameSession> = new Map();
const leaderboards: Map<string, LeaderboardEntry[]> = new Map();

// Get all available games
router.get('/list', securityMiddleware.validateToken, (req: Request, res: Response) => {
  try {
    const { category, difficulty, minCoins } = req.query;
    
    let filteredGames = games.filter(game => game.isActive);
    
    if (category) {
      filteredGames = filteredGames.filter(game => game.category === category);
    }
    
    if (difficulty) {
      filteredGames = filteredGames.filter(game => game.difficulty === difficulty);
    }
    
    if (minCoins) {
      filteredGames = filteredGames.filter(game => game.minCoinsToPlay <= parseInt(minCoins as string));
    }
    
    res.json({
      success: true,
      games: filteredGames,
      total: filteredGames.length
    });
  } catch (error) {
    logger.error('Failed to get games list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get games list'
    });
  }
});

// Get specific game details
router.get('/:gameId', securityMiddleware.validateToken, (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const game = games.find(g => g.id === gameId);
    
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    res.json({
      success: true,
      game
    });
  } catch (error) {
    logger.error('Failed to get game details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get game details'
    });
  }
});

// Start a new game session
router.post('/:gameId/start', securityMiddleware.validateToken, async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const userId = req.securityContext?.userId;
    const { userCoins } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    const game = games.find(g => g.id === gameId);
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    if (!game.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Game is not available'
      });
    }
    
    if (userCoins < game.minCoinsToPlay) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient coins to play this game',
        requiredCoins: game.minCoinsToPlay,
        userCoins
      });
    }
    
    // Create new game session
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const gameSession: GameSession = {
      id: sessionId,
      userId,
      gameId,
      startTime: new Date(),
      score: 0,
      coinsEarned: 0,
      xpEarned: 0,
      achievements: [],
      isCompleted: false,
      isWon: false,
      gameData: {}
    };
    
    gameSessions.set(sessionId, gameSession);
    
    res.json({
      success: true,
      sessionId,
      game: {
        id: game.id,
        name: game.name,
        instructions: game.instructions,
        gameUrl: game.gameUrl
      },
      message: 'Game session started successfully'
    });
  } catch (error) {
    logger.error('Failed to start game session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start game session'
    });
  }
});

// Update game session (score, progress, etc.)
router.put('/session/:sessionId', securityMiddleware.validateToken, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.securityContext?.userId;
    const { score, gameData, isCompleted, isWon } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    const session = gameSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Game session not found'
      });
    }
    
    if (session.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to game session'
      });
    }
    
    // Update session data
    session.score = score || session.score;
    session.gameData = { ...session.gameData, ...gameData };
    session.isCompleted = isCompleted || session.isCompleted;
    session.isWon = isWon || session.isWon;
    
    if (isCompleted) {
      session.endTime = new Date();
      
      // Calculate rewards
      const game = games.find(g => g.id === session.gameId);
      if (game) {
        session.coinsEarned = Math.floor(session.score * game.coinRewardMultiplier);
        session.xpEarned = Math.floor(session.score * 0.1);
        
        // Check for achievements
        const newAchievements = checkAchievements(session, game);
        session.achievements = [...session.achievements, ...newAchievements];
      }
    }
    
    gameSessions.set(sessionId, session);
    
    res.json({
      success: true,
      session: {
        id: session.id,
        score: session.score,
        coinsEarned: session.coinsEarned,
        xpEarned: session.xpEarned,
        achievements: session.achievements,
        isCompleted: session.isCompleted,
        isWon: session.isWon
      }
    });
  } catch (error) {
    logger.error('Failed to update game session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update game session'
    });
  }
});

// Complete game session and award coins
router.post('/session/:sessionId/complete', securityMiddleware.validateToken, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.securityContext?.userId;
    const { finalScore, gameData } = req.body;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }
    
    const session = gameSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Game session not found'
      });
    }
    
    if (session.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to game session'
      });
    }
    
    // Finalize session
    session.score = finalScore || session.score;
    session.endTime = new Date();
    session.isCompleted = true;
    session.gameData = { ...session.gameData, ...gameData };
    
    // Calculate final rewards
    const game = games.find(g => g.id === session.gameId);
    if (game) {
      session.coinsEarned = Math.floor(session.score * game.coinRewardMultiplier);
      session.xpEarned = Math.floor(session.score * 0.1);
      
      // Check for achievements
      const newAchievements = checkAchievements(session, game);
      session.achievements = [...session.achievements, ...newAchievements];
      
      // Update leaderboard
      updateLeaderboard(session, game);
    }
    
    gameSessions.set(sessionId, session);
    
    res.json({
      success: true,
      rewards: {
        coins: session.coinsEarned,
        xp: session.xpEarned,
        achievements: session.achievements
      },
      session: {
        id: session.id,
        score: session.score,
        isWon: session.isWon,
        duration: session.endTime.getTime() - session.startTime.getTime()
      }
    });
  } catch (error) {
    logger.error('Failed to complete game session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete game session'
    });
  }
});

// Get leaderboard for a game
router.get('/:gameId/leaderboard', securityMiddleware.validateToken, (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    const { limit = 50 } = req.query;
    
    const game = games.find(g => g.id === gameId);
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    if (!game.leaderboardEnabled) {
      return res.status(400).json({
        success: false,
        error: 'Leaderboard not enabled for this game'
      });
    }
    
    const leaderboard = leaderboards.get(gameId) || [];
    const limitedLeaderboard = leaderboard.slice(0, parseInt(limit as string));
    
    res.json({
      success: true,
      leaderboard: limitedLeaderboard,
      game: {
        id: game.id,
        name: game.name
      }
    });
  } catch (error) {
    logger.error('Failed to get leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get leaderboard'
    });
  }
});

// Get user's game statistics
router.get('/stats/:userId', securityMiddleware.validateToken, (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.securityContext?.userId;
    
    if (requestingUserId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to user statistics'
      });
    }
    
    // Get user's game sessions
    const userSessions = Array.from(gameSessions.values()).filter(session => session.userId === userId);
    
    const stats = {
      totalGamesPlayed: userSessions.length,
      totalScore: userSessions.reduce((sum, session) => sum + session.score, 0),
      totalCoinsEarned: userSessions.reduce((sum, session) => sum + session.coinsEarned, 0),
      totalXpEarned: userSessions.reduce((sum, session) => sum + session.xpEarned, 0),
      gamesWon: userSessions.filter(session => session.isWon).length,
      winRate: userSessions.length > 0 ? (userSessions.filter(session => session.isWon).length / userSessions.length) * 100 : 0,
      averageScore: userSessions.length > 0 ? userSessions.reduce((sum, session) => sum + session.score, 0) / userSessions.length : 0,
      achievements: userSessions.flatMap(session => session.achievements),
      recentGames: userSessions
        .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
        .slice(0, 10)
        .map(session => ({
          gameId: session.gameId,
          score: session.score,
          coinsEarned: session.coinsEarned,
          isWon: session.isWon,
          playedAt: session.startTime
        }))
    };
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Failed to get user game statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user game statistics'
    });
  }
});

// Helper function to check achievements
function checkAchievements(session: GameSession, game: Game): string[] {
  const newAchievements: string[] = [];
  
  for (const achievement of game.achievements) {
    if (session.achievements.includes(achievement.id)) {
      continue; // Already earned
    }
    
    let earned = false;
    
    switch (achievement.requirement.type) {
      case 'score':
        earned = session.score >= achievement.requirement.value;
        break;
      case 'time':
        if (session.endTime) {
          const duration = (session.endTime.getTime() - session.startTime.getTime()) / 1000;
          earned = duration <= achievement.requirement.value;
        }
        break;
      case 'wins':
        // This would need to be tracked across all sessions
        earned = false; // Simplified for now
        break;
      case 'streak':
        // This would need to be tracked across all sessions
        earned = false; // Simplified for now
        break;
      case 'combo':
        // This would need to be tracked in game data
        earned = false; // Simplified for now
        break;
    }
    
    if (earned) {
      newAchievements.push(achievement.id);
    }
  }
  
  return newAchievements;
}

// Helper function to update leaderboard
function updateLeaderboard(session: GameSession, game: Game) {
  if (!game.leaderboardEnabled) return;
  
  const currentLeaderboard = leaderboards.get(game.id) || [];
  
  // Add or update user's entry
  const existingIndex = currentLeaderboard.findIndex(entry => entry.userId === session.userId);
  
  const leaderboardEntry: LeaderboardEntry = {
    userId: session.userId,
    username: `user_${session.userId}`, // This would come from user data
    displayName: `Player ${session.userId}`,
    score: session.score,
    rank: 0, // Will be calculated after sorting
    gameId: game.id,
    timestamp: session.endTime || new Date()
  };
  
  if (existingIndex >= 0) {
    // Update existing entry if score is higher
    if (session.score > currentLeaderboard[existingIndex].score) {
      currentLeaderboard[existingIndex] = leaderboardEntry;
    }
  } else {
    // Add new entry
    currentLeaderboard.push(leaderboardEntry);
  }
  
  // Sort by score (descending) and update ranks
  currentLeaderboard.sort((a, b) => b.score - a.score);
  currentLeaderboard.forEach((entry, index) => {
    entry.rank = index + 1;
  });
  
  // Keep only top 100 entries
  const topEntries = currentLeaderboard.slice(0, 100);
  leaderboards.set(game.id, topEntries);
}

export default router;

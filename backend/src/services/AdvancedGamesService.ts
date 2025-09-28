import crypto from 'crypto';
import { EventEmitter } from 'events';
import { logger } from '@/config/logger';

export interface AdvancedGame {
  id: string;
  name: string;
  code: string;
  type: 'battle-royale' | 'tournament' | 'multiplayer' | 'ai-challenge' | 'skill' | 'strategy';
  category: string;
  playerCapacity: number;
  duration: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  features: string[];
  rewards: {
    winner: number;
    topThree: number[];
    participation: number;
  };
  requirements: {
    level: number;
    winRate?: number;
    experience?: number;
  };
  gameLogic: any;
}

export interface Player {
  id: string;
  username: string;
  level: number;
  avatar?: string;
  score: number;
  rank: number;
  status: 'active' | 'eliminated' | 'disconnected';
  stake: number;
  joinedAt: Date;
  lastAction: Date;
}

export interface GameSession {
  sessionId: string;
  gameId: string;
  players: Map<string, Player>;
  status: 'waiting' | 'starting' | 'active' | 'paused' | 'finished';
  startTime?: Date;
  endTime?: Date;
  currentRound: number;
  totalRounds: number;
  timeRemaining: number;
  totalPot: number;
  gameState: any;
  events: GameEvent[];
}

export interface GameEvent {
  id: string;
  type: 'player_joined' | 'player_eliminated' | 'round_started' | 'round_ended' | 'game_finished';
  timestamp: Date;
  data: any;
}

/**
 * Advanced Games Service - Handles complex multiplayer gaming sessions
 * Features: Battle Royale, Tournaments, AI Challenges, Real-time multiplayer
 */
export class AdvancedGamesService extends EventEmitter {
  private static instance: AdvancedGamesService;
  private activeSessions: Map<string, GameSession> = new Map();
  private waitingSessions: Map<string, GameSession> = new Map();
  private gameDefinitions: Map<string, AdvancedGame> = new Map();

  private constructor() {
    super();
    this.initializeGames();
    this.startSessionManager();
  }

  static getInstance(): AdvancedGamesService {
    if (!AdvancedGamesService.instance) {
      AdvancedGamesService.instance = new AdvancedGamesService();
    }
    return AdvancedGamesService.instance;
  }

  /**
   * Initialize all advanced games
   */
  private initializeGames(): void {
    const games: AdvancedGame[] = [
      {
        id: 'crypto-battle-royale',
        name: 'Crypto Battle Royale',
        code: 'crypto-battle-royale',
        type: 'battle-royale',
        category: 'combat',
        playerCapacity: 100,
        duration: 900000, // 15 minutes
        difficulty: 'extreme',
        features: ['real-time-combat', 'power-ups', 'shrinking-zone', 'spectator-mode'],
        rewards: {
          winner: 80,
          topThree: [10, 6, 4],
          participation: 0
        },
        requirements: {
          level: 10,
          winRate: 0.3,
          experience: 5000
        },
        gameLogic: new BattleRoyaleLogic()
      },
      {
        id: 'speed-chess',
        name: 'Speed Chess Tournament',
        code: 'speed-chess',
        type: 'tournament',
        category: 'strategy',
        playerCapacity: 32,
        duration: 600000, // 10 minutes
        difficulty: 'hard',
        features: ['time-pressure', 'bracket-elimination', 'elo-rating', 'replay-analysis'],
        rewards: {
          winner: 50,
          topThree: [25, 15, 10],
          participation: 0
        },
        requirements: {
          level: 5,
          experience: 1000
        },
        gameLogic: new ChessLogic()
      },
      {
        id: 'ai-poker',
        name: 'AI Poker Master',
        code: 'ai-poker',
        type: 'ai-challenge',
        category: 'cards',
        playerCapacity: 6,
        duration: 1800000, // 30 minutes
        difficulty: 'hard',
        features: ['advanced-ai', 'psychological-analysis', 'bluff-detection', 'adaptive-difficulty'],
        rewards: {
          winner: 400,
          topThree: [200, 100, 50],
          participation: 0
        },
        requirements: {
          level: 3
        },
        gameLogic: new PokerLogic()
      },
      {
        id: 'reflex-arena',
        name: 'Reflex Arena',
        code: 'reflex-arena',
        type: 'skill',
        category: 'arcade',
        playerCapacity: 50,
        duration: 180000, // 3 minutes
        difficulty: 'medium',
        features: ['reaction-time', 'global-leaderboard', 'combo-system', 'precision-scoring'],
        rewards: {
          winner: 300,
          topThree: [150, 75, 37],
          participation: 5
        },
        requirements: {
          level: 1
        },
        gameLogic: new ReflexLogic()
      },
      {
        id: 'strategy-empire',
        name: 'Strategy Empire',
        code: 'strategy-empire',
        type: 'strategy',
        category: 'rts',
        playerCapacity: 8,
        duration: 2700000, // 45 minutes
        difficulty: 'extreme',
        features: ['resource-management', 'base-building', 'tech-trees', 'alliance-system'],
        rewards: {
          winner: 600,
          topThree: [300, 150, 75],
          participation: 10
        },
        requirements: {
          level: 15,
          winRate: 0.4,
          experience: 10000
        },
        gameLogic: new StrategyLogic()
      }
    ];

    games.forEach(game => {
      this.gameDefinitions.set(game.code, game);
    });

    logger.info(`Initialized ${games.length} advanced games`);
  }

  /**
   * Start the session manager for handling game lifecycles
   */
  private startSessionManager(): void {
    setInterval(() => {
      this.manageGameSessions();
    }, 1000);

    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 60000);
  }

  /**
   * Get all available advanced games
   */
  getAvailableGames(): AdvancedGame[] {
    return Array.from(this.gameDefinitions.values());
  }

  /**
   * Join a game session
   */
  async joinGame(gameCode: string, player: Omit<Player, 'score' | 'rank' | 'status' | 'joinedAt' | 'lastAction'>): Promise<GameSession> {
    const gameDefinition = this.gameDefinitions.get(gameCode);
    if (!gameDefinition) {
      throw new Error('Game not found');
    }

    // Find or create a waiting session
    let session = this.findWaitingSession(gameCode);
    if (!session) {
      session = this.createGameSession(gameDefinition);
    }

    // Add player to session
    const fullPlayer: Player = {
      ...player,
      score: 0,
      rank: 0,
      status: 'active',
      joinedAt: new Date(),
      lastAction: new Date()
    };

    session.players.set(player.id, fullPlayer);
    session.totalPot += player.stake;

    // Emit player joined event
    const event: GameEvent = {
      id: crypto.randomUUID(),
      type: 'player_joined',
      timestamp: new Date(),
      data: { playerId: player.id, playerCount: session.players.size }
    };
    session.events.push(event);

    // Check if session is ready to start
    if (session.players.size >= gameDefinition.playerCapacity) {
      this.startGameSession(session);
    }

    this.emit('playerJoined', { sessionId: session.sessionId, player: fullPlayer });

    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): GameSession | undefined {
    return this.activeSessions.get(sessionId) || this.waitingSessions.get(sessionId);
  }

  /**
   * Handle player action in game
   */
  async handlePlayerAction(sessionId: string, playerId: string, action: any): Promise<void> {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const player = session.players.get(playerId);
    if (!player || player.status !== 'active') {
      throw new Error('Player not found or inactive');
    }

    const gameDefinition = this.gameDefinitions.get(session.gameId);
    if (!gameDefinition) {
      throw new Error('Game definition not found');
    }

    // Update player last action time
    player.lastAction = new Date();

    // Process action through game logic
    const result = await gameDefinition.gameLogic.processAction(session, playerId, action);

    // Update session based on result
    if (result.playerEliminated) {
      player.status = 'eliminated';
      this.emit('playerEliminated', { sessionId, playerId, rank: result.rank });
    }

    if (result.gameEnded) {
      this.endGameSession(session);
    }

    this.emit('gameAction', { sessionId, playerId, action, result });
  }

  /**
   * Create a new game session
   */
  private createGameSession(gameDefinition: AdvancedGame): GameSession {
    const sessionId = `${gameDefinition.code}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const session: GameSession = {
      sessionId,
      gameId: gameDefinition.code,
      players: new Map(),
      status: 'waiting',
      currentRound: 1,
      totalRounds: gameDefinition.gameLogic.getTotalRounds ? gameDefinition.gameLogic.getTotalRounds() : 1,
      timeRemaining: gameDefinition.duration,
      totalPot: 0,
      gameState: gameDefinition.gameLogic.initializeGameState(),
      events: []
    };

    this.waitingSessions.set(sessionId, session);
    logger.info(`Created new game session: ${sessionId} for game: ${gameDefinition.name}`);

    return session;
  }

  /**
   * Start a game session
   */
  private startGameSession(session: GameSession): void {
    session.status = 'starting';
    session.startTime = new Date();

    // Move from waiting to active
    this.waitingSessions.delete(session.sessionId);
    this.activeSessions.set(session.sessionId, session);

    // Initialize game for all players
    const gameDefinition = this.gameDefinitions.get(session.gameId);
    if (gameDefinition) {
      gameDefinition.gameLogic.startGame(session);
    }

    // Start game timer
    setTimeout(() => {
      session.status = 'active';
      this.emit('gameStarted', { sessionId: session.sessionId });
    }, 5000); // 5 second countdown

    logger.info(`Started game session: ${session.sessionId} with ${session.players.size} players`);
  }

  /**
   * End a game session
   */
  private endGameSession(session: GameSession): void {
    session.status = 'finished';
    session.endTime = new Date();

    // Calculate final rankings and rewards
    const rankings = this.calculateFinalRankings(session);
    const rewards = this.calculateRewards(session, rankings);

    // Emit game finished event
    const event: GameEvent = {
      id: crypto.randomUUID(),
      type: 'game_finished',
      timestamp: new Date(),
      data: { rankings, rewards, duration: Date.now() - (session.startTime?.getTime() || 0) }
    };
    session.events.push(event);

    this.emit('gameFinished', {
      sessionId: session.sessionId,
      rankings,
      rewards,
      session
    });

    // Schedule session cleanup
    setTimeout(() => {
      this.activeSessions.delete(session.sessionId);
    }, 300000); // Keep for 5 minutes for result viewing

    logger.info(`Ended game session: ${session.sessionId}`);
  }

  /**
   * Calculate final player rankings
   */
  private calculateFinalRankings(session: GameSession): Player[] {
    const players = Array.from(session.players.values());
    return players.sort((a, b) => {
      // Sort by score (higher is better), then by status, then by join time
      if (a.score !== b.score) return b.score - a.score;
      if (a.status !== b.status) {
        if (a.status === 'active') return -1;
        if (b.status === 'active') return 1;
        if (a.status === 'eliminated' && b.status === 'disconnected') return -1;
        if (a.status === 'disconnected' && b.status === 'eliminated') return 1;
      }
      return a.joinedAt.getTime() - b.joinedAt.getTime();
    }).map((player, index) => ({ ...player, rank: index + 1 }));
  }

  /**
   * Calculate reward distribution
   */
  private calculateRewards(session: GameSession, rankings: Player[]): Map<string, number> {
    const gameDefinition = this.gameDefinitions.get(session.gameId);
    if (!gameDefinition) return new Map();

    const rewards = new Map<string, number>();
    const totalPot = session.totalPot;

    rankings.forEach((player, index) => {
      let rewardPercent = 0;

      if (index === 0) {
        rewardPercent = gameDefinition.rewards.winner;
      } else if (index < 4 && gameDefinition.rewards.topThree[index - 1]) {
        rewardPercent = gameDefinition.rewards.topThree[index - 1];
      } else {
        rewardPercent = gameDefinition.rewards.participation;
      }

      const rewardAmount = Math.floor((totalPot * rewardPercent) / 100);
      if (rewardAmount > 0) {
        rewards.set(player.id, rewardAmount);
      }
    });

    return rewards;
  }

  /**
   * Find waiting session for a game
   */
  private findWaitingSession(gameCode: string): GameSession | undefined {
    for (const session of this.waitingSessions.values()) {
      if (session.gameId === gameCode && session.status === 'waiting') {
        const gameDefinition = this.gameDefinitions.get(gameCode);
        if (gameDefinition && session.players.size < gameDefinition.playerCapacity) {
          return session;
        }
      }
    }
    return undefined;
  }

  /**
   * Manage active game sessions
   */
  private manageGameSessions(): void {
    for (const session of this.activeSessions.values()) {
      if (session.status === 'active') {
        // Update time remaining
        const elapsed = Date.now() - (session.startTime?.getTime() || Date.now());
        const gameDefinition = this.gameDefinitions.get(session.gameId);
        if (gameDefinition) {
          session.timeRemaining = Math.max(0, gameDefinition.duration - elapsed);

          // End game if time is up
          if (session.timeRemaining === 0) {
            this.endGameSession(session);
          }
        }

        // Check for disconnected players
        this.checkPlayerConnections(session);
      }
    }
  }

  /**
   * Check for disconnected players
   */
  private checkPlayerConnections(session: GameSession): void {
    const now = Date.now();
    const disconnectThreshold = 30000; // 30 seconds

    for (const player of session.players.values()) {
      if (player.status === 'active' &&
          now - player.lastAction.getTime() > disconnectThreshold) {
        player.status = 'disconnected';
        this.emit('playerDisconnected', { sessionId: session.sessionId, playerId: player.id });
      }
    }
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expireThreshold = 3600000; // 1 hour

    // Clean waiting sessions that are too old
    for (const [sessionId, session] of this.waitingSessions.entries()) {
      const age = now - (session.startTime?.getTime() || now);
      if (age > expireThreshold) {
        this.waitingSessions.delete(sessionId);
        logger.info(`Cleaned up expired waiting session: ${sessionId}`);
      }
    }

    // Clean finished sessions
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.status === 'finished') {
        const finishAge = now - (session.endTime?.getTime() || now);
        if (finishAge > expireThreshold) {
          this.activeSessions.delete(sessionId);
          logger.info(`Cleaned up finished session: ${sessionId}`);
        }
      }
    }
  }
}

/**
 * Base class for game logic implementations
 */
abstract class GameLogic {
  abstract initializeGameState(): any;
  abstract startGame(session: GameSession): void;
  abstract processAction(session: GameSession, playerId: string, action: any): Promise<any>;
  abstract getTotalRounds?(): number;
}

/**
 * Battle Royale game logic
 */
class BattleRoyaleLogic extends GameLogic {
  initializeGameState(): any {
    return {
      zone: { radius: 1000, centerX: 0, centerY: 0, shrinkRate: 50 },
      powerUps: [],
      eliminations: []
    };
  }

  getTotalRounds(): number {
    return 1; // Battle Royale is a single round game
  }

  startGame(session: GameSession): void {
    // Initialize player positions
    session.players.forEach((player, playerId) => {
      player.score = 100; // Health
      // Add position, inventory, etc.
    });
  }

  async processAction(session: GameSession, playerId: string, action: any): Promise<any> {
    const player = session.players.get(playerId);
    if (!player) return { success: false };

    switch (action.type) {
      case 'move':
        // Handle movement
        break;
      case 'attack':
        // Handle combat
        const target = session.players.get(action.targetId);
        if (target && target.status === 'active') {
          target.score -= action.damage || 10;
          if (target.score <= 0) {
            target.status = 'eliminated';
            return { playerEliminated: true, rank: this.calculateRank(session, target.id) };
          }
        }
        break;
      case 'use_item':
        // Handle item usage
        break;
    }

    // Check if only one player remains
    const activePlayers = Array.from(session.players.values()).filter(p => p.status === 'active');
    if (activePlayers.length <= 1) {
      return { gameEnded: true };
    }

    return { success: true };
  }

  private calculateRank(session: GameSession, playerId: string): number {
    const eliminatedCount = Array.from(session.players.values())
      .filter(p => p.status === 'eliminated').length;
    return session.players.size - eliminatedCount + 1;
  }
}

/**
 * Chess tournament logic
 */
class ChessLogic extends GameLogic {
  initializeGameState(): any {
    return {
      bracket: [],
      currentMatches: [],
      round: 1
    };
  }

  startGame(session: GameSession): void {
    // Create tournament bracket
    const players = Array.from(session.players.values());
    this.createBracket(session, players);
  }

  async processAction(session: GameSession, playerId: string, action: any): Promise<any> {
    // Handle chess moves, match completion, etc.
    return { success: true };
  }

  getTotalRounds(): number {
    return Math.ceil(Math.log2(32)); // For 32 players
  }

  private createBracket(session: GameSession, players: Player[]): void {
    // Tournament bracket logic
  }
}

/**
 * Poker logic with AI opponents
 */
class PokerLogic extends GameLogic {
  initializeGameState(): any {
    return {
      deck: this.shuffleDeck(),
      communityCards: [],
      pot: 0,
      currentBet: 0,
      round: 'pre-flop'
    };
  }

  getTotalRounds(): number {
    return 5; // Poker has 5 betting rounds
  }

  startGame(session: GameSession): void {
    // Deal initial cards
  }

  async processAction(session: GameSession, playerId: string, action: any): Promise<any> {
    // Handle poker actions: fold, call, raise, check
    return { success: true };
  }

  private shuffleDeck(): string[] {
    // Card shuffling logic
    return [];
  }
}

/**
 * Reflex arena logic
 */
class ReflexLogic extends GameLogic {
  initializeGameState(): any {
    return {
      targets: [],
      round: 1,
      targetSpeed: 1000
    };
  }

  getTotalRounds(): number {
    return 1; // Reflex game is a single round
  }

  startGame(session: GameSession): void {
    // Start reflex challenges
  }

  async processAction(session: GameSession, playerId: string, action: any): Promise<any> {
    // Handle target hitting, reaction time calculation
    return { success: true };
  }
}

/**
 * Strategy empire logic
 */
class StrategyLogic extends GameLogic {
  initializeGameState(): any {
    return {
      map: this.generateMap(),
      resources: {},
      buildings: {},
      units: {},
      turn: 1
    };
  }

  getTotalRounds(): number {
    return 10; // Strategy game has multiple rounds
  }

  startGame(session: GameSession): void {
    // Initialize player empires
  }

  async processAction(session: GameSession, playerId: string, action: any): Promise<any> {
    // Handle building, unit movement, combat, diplomacy
    return { success: true };
  }

  private generateMap(): any {
    // Map generation logic
    return {};
  }
}

export const advancedGamesService = AdvancedGamesService.getInstance();
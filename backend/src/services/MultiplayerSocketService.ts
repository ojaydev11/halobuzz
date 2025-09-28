import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { advancedGamesService } from './AdvancedGamesService';
import { logger } from '@/config/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  currentSessionId?: string;
}

/**
 * Multiplayer Socket Service
 * Handles real-time communication for advanced games
 */
export class MultiplayerSocketService {
  private static instance: MultiplayerSocketService;
  private io: SocketIOServer | null = null;
  private connectedPlayers = new Map<string, AuthenticatedSocket>();
  private sessionPlayers = new Map<string, Set<string>>(); // sessionId -> Set of playerIds

  private constructor() {}

  static getInstance(): MultiplayerSocketService {
    if (!MultiplayerSocketService.instance) {
      MultiplayerSocketService.instance = new MultiplayerSocketService();
    }
    return MultiplayerSocketService.instance;
  }

  /**
   * Initialize Socket.IO server
   */
  initialize(httpServer: HTTPServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || "*",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    this.setupGameEventListeners();

    logger.info('Multiplayer Socket Service initialized');
  }

  /**
   * Setup authentication middleware
   */
  private setupMiddleware(): void {
    if (!this.io) return;

    this.io.use((socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret') as any;
        socket.userId = decoded.id;
        socket.username = decoded.username || 'Player';

        logger.info(`Socket authenticated for user: ${socket.userId}`);
        next();
      } catch (error) {
        logger.error('Socket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Setup socket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info(`Player connected: ${socket.userId} (${socket.username})`);

      // Store connected player
      if (socket.userId) {
        this.connectedPlayers.set(socket.userId, socket);
      }

      // Join game session
      socket.on('join_session', async (data: { sessionId: string }) => {
        try {
          await this.handleJoinSession(socket, data.sessionId);
        } catch (error) {
          socket.emit('error', { message: 'Failed to join session' });
        }
      });

      // Leave game session
      socket.on('leave_session', async () => {
        try {
          await this.handleLeaveSession(socket);
        } catch (error) {
          socket.emit('error', { message: 'Failed to leave session' });
        }
      });

      // Game actions
      socket.on('game_action', async (data: { action: any }) => {
        try {
          await this.handleGameAction(socket, data.action);
        } catch (error) {
          socket.emit('error', { message: 'Failed to process action' });
        }
      });

      // Player status updates
      socket.on('player_status', (data: { status: string }) => {
        this.handlePlayerStatusUpdate(socket, data.status);
      });

      // Chat messages
      socket.on('chat_message', (data: { message: string }) => {
        this.handleChatMessage(socket, data.message);
      });

      // Heartbeat for connection monitoring
      socket.on('heartbeat', () => {
        socket.emit('heartbeat_ack', { timestamp: Date.now() });
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnection(socket);
      });
    });
  }

  /**
   * Setup listeners for game service events
   */
  private setupGameEventListeners(): void {
    // Player joined game
    advancedGamesService.on('playerJoined', (data: { sessionId: string; player: any }) => {
      this.broadcastToSession(data.sessionId, 'player_joined', {
        player: {
          id: data.player.id,
          username: data.player.username,
          level: data.player.level,
          avatar: data.player.avatar
        },
        playerCount: this.getSessionPlayerCount(data.sessionId)
      });
    });

    // Game started
    advancedGamesService.on('gameStarted', (data: { sessionId: string }) => {
      this.broadcastToSession(data.sessionId, 'game_started', {
        message: 'Game is starting! Get ready!',
        countdown: 5
      });

      // Send countdown
      this.startCountdown(data.sessionId, 5);
    });

    // Player eliminated
    advancedGamesService.on('playerEliminated', (data: { sessionId: string; playerId: string; rank: number }) => {
      this.broadcastToSession(data.sessionId, 'player_eliminated', {
        playerId: data.playerId,
        rank: data.rank
      });

      // Send personal message to eliminated player
      const playerSocket = this.connectedPlayers.get(data.playerId);
      if (playerSocket) {
        playerSocket.emit('elimination_notice', {
          rank: data.rank,
          message: `You were eliminated! Final rank: #${data.rank}`
        });
      }
    });

    // Player disconnected
    advancedGamesService.on('playerDisconnected', (data: { sessionId: string; playerId: string }) => {
      this.broadcastToSession(data.sessionId, 'player_disconnected', {
        playerId: data.playerId
      });
    });

    // Game finished
    advancedGamesService.on('gameFinished', (data: { sessionId: string; rankings: any[]; rewards: Map<string, number> }) => {
      this.broadcastToSession(data.sessionId, 'game_finished', {
        rankings: data.rankings.map(player => ({
          id: player.id,
          username: player.username,
          rank: player.rank,
          score: player.score,
          reward: data.rewards.get(player.id) || 0
        }))
      });

      // Send individual rewards
      data.rewards.forEach((reward, playerId) => {
        const playerSocket = this.connectedPlayers.get(playerId);
        if (playerSocket) {
          playerSocket.emit('reward_earned', {
            amount: reward,
            message: `You earned ${reward} coins!`
          });
        }
      });

      // Clean up session
      setTimeout(() => {
        this.cleanupSession(data.sessionId);
      }, 30000); // Clean up after 30 seconds
    });

    // General game action results
    advancedGamesService.on('gameAction', (data: { sessionId: string; playerId: string; action: any; result: any }) => {
      // Broadcast action result to all players in session
      this.broadcastToSession(data.sessionId, 'action_result', {
        playerId: data.playerId,
        action: data.action.type,
        result: data.result,
        timestamp: Date.now()
      });
    });
  }

  /**
   * Handle player joining a session
   */
  private async handleJoinSession(socket: AuthenticatedSocket, sessionId: string): Promise<void> {
    if (!socket.userId) return;

    const session = advancedGamesService.getSession(sessionId);
    if (!session) {
      socket.emit('error', { message: 'Session not found' });
      return;
    }

    // Join socket room
    socket.join(sessionId);
    socket.currentSessionId = sessionId;

    // Add to session players tracking
    if (!this.sessionPlayers.has(sessionId)) {
      this.sessionPlayers.set(sessionId, new Set());
    }
    this.sessionPlayers.get(sessionId)!.add(socket.userId);

    // Send session state to player
    socket.emit('session_joined', {
      sessionId,
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
      totalRounds: session.totalRounds
    });

    logger.info(`Player ${socket.userId} joined session ${sessionId}`);
  }

  /**
   * Handle player leaving a session
   */
  private async handleLeaveSession(socket: AuthenticatedSocket): Promise<void> {
    if (!socket.userId || !socket.currentSessionId) return;

    const sessionId = socket.currentSessionId;

    // Leave socket room
    socket.leave(sessionId);

    // Remove from session tracking
    const sessionPlayers = this.sessionPlayers.get(sessionId);
    if (sessionPlayers) {
      sessionPlayers.delete(socket.userId);
      if (sessionPlayers.size === 0) {
        this.sessionPlayers.delete(sessionId);
      }
    }

    socket.currentSessionId = undefined;
    socket.emit('session_left', { sessionId });

    logger.info(`Player ${socket.userId} left session ${sessionId}`);
  }

  /**
   * Handle game action from player
   */
  private async handleGameAction(socket: AuthenticatedSocket, action: any): Promise<void> {
    if (!socket.userId || !socket.currentSessionId) {
      socket.emit('error', { message: 'No active session' });
      return;
    }

    try {
      await advancedGamesService.handlePlayerAction(socket.currentSessionId, socket.userId, action);
      socket.emit('action_acknowledged', { action: action.type, timestamp: Date.now() });
    } catch (error: any) {
      socket.emit('action_error', { message: error.message });
    }
  }

  /**
   * Handle player status update
   */
  private handlePlayerStatusUpdate(socket: AuthenticatedSocket, status: string): void {
    if (!socket.userId || !socket.currentSessionId) return;

    this.broadcastToSession(socket.currentSessionId, 'player_status_update', {
      playerId: socket.userId,
      status
    }, socket.userId); // Exclude sender
  }

  /**
   * Handle chat message
   */
  private handleChatMessage(socket: AuthenticatedSocket, message: string): void {
    if (!socket.userId || !socket.currentSessionId) return;

    // Basic message filtering
    if (message.length > 200 || message.trim().length === 0) {
      socket.emit('error', { message: 'Invalid message' });
      return;
    }

    this.broadcastToSession(socket.currentSessionId, 'chat_message', {
      playerId: socket.userId,
      username: socket.username,
      message: message.trim(),
      timestamp: Date.now()
    });
  }

  /**
   * Handle player disconnection
   */
  private handleDisconnection(socket: AuthenticatedSocket): void {
    if (socket.userId) {
      logger.info(`Player disconnected: ${socket.userId}`);

      // Remove from connected players
      this.connectedPlayers.delete(socket.userId);

      // Leave session if in one
      if (socket.currentSessionId) {
        this.handleLeaveSession(socket);
      }
    }
  }

  /**
   * Start countdown for game start
   */
  private startCountdown(sessionId: string, seconds: number): void {
    const interval = setInterval(() => {
      seconds--;

      if (seconds > 0) {
        this.broadcastToSession(sessionId, 'countdown', { seconds });
      } else {
        clearInterval(interval);
        this.broadcastToSession(sessionId, 'countdown_finished', {});
      }
    }, 1000);
  }

  /**
   * Broadcast message to all players in a session
   */
  private broadcastToSession(sessionId: string, event: string, data: any, excludeUserId?: string): void {
    if (!this.io) return;

    if (excludeUserId) {
      const excludeSocket = this.connectedPlayers.get(excludeUserId);
      if (excludeSocket) {
        excludeSocket.to(sessionId).emit(event, data);
      } else {
        this.io.to(sessionId).emit(event, data);
      }
    } else {
      this.io.to(sessionId).emit(event, data);
    }
  }

  /**
   * Send message to specific player
   */
  private sendToPlayer(playerId: string, event: string, data: any): void {
    const socket = this.connectedPlayers.get(playerId);
    if (socket) {
      socket.emit(event, data);
    }
  }

  /**
   * Get session player count
   */
  private getSessionPlayerCount(sessionId: string): number {
    const session = advancedGamesService.getSession(sessionId);
    return session ? session.players.size : 0;
  }

  /**
   * Clean up session resources
   */
  private cleanupSession(sessionId: string): void {
    this.sessionPlayers.delete(sessionId);

    if (this.io) {
      // Make all clients leave the room
      this.io.in(sessionId).socketsLeave(sessionId);
    }

    logger.info(`Cleaned up session: ${sessionId}`);
  }

  /**
   * Get connected player count
   */
  getConnectedPlayerCount(): number {
    return this.connectedPlayers.size;
  }

  /**
   * Get active session count
   */
  getActiveSessionCount(): number {
    return this.sessionPlayers.size;
  }

  /**
   * Broadcast global announcement
   */
  broadcastGlobalAnnouncement(message: string, type: 'info' | 'warning' | 'success' = 'info'): void {
    if (!this.io) return;

    this.io.emit('global_announcement', {
      message,
      type,
      timestamp: Date.now()
    });
  }

  /**
   * Send tournament notification
   */
  sendTournamentNotification(playerId: string, tournament: any): void {
    this.sendToPlayer(playerId, 'tournament_notification', {
      tournament,
      message: `Tournament "${tournament.name}" is starting soon!`
    });
  }

  /**
   * Broadcast leaderboard update
   */
  broadcastLeaderboardUpdate(gameCode: string, leaderboard: any[]): void {
    if (!this.io) return;

    this.io.emit('leaderboard_update', {
      gameCode,
      leaderboard: leaderboard.slice(0, 10), // Top 10
      timestamp: Date.now()
    });
  }
}

export const multiplayerSocketService = MultiplayerSocketService.getInstance();
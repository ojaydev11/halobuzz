import { setupLogger } from '@/config/logger';
import { getCache, setCache, deleteCache } from '@/config/redis';
import { v4 as uuidv4 } from 'uuid';

const logger = setupLogger();

export interface GamePlayer {
  userId: string;
  username: string;
  avatar?: string;
  mmr?: number;
  socketId: string;
  team?: 'A' | 'B';
  ready: boolean;
  score: number;
  disconnected: boolean;
  joinedAt: number;
}

export interface GameRoomState {
  roomId: string;
  gameId: string;
  mode: 'solo' | '1v1' | 'battle_royale' | 'tournament';
  status: 'waiting' | 'ready' | 'starting' | 'in_progress' | 'paused' | 'completed' | 'abandoned';
  players: GamePlayer[];
  spectators: string[]; // userIds
  maxPlayers: number;
  hostId?: string; // For custom rooms
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  gameState: any; // Game-specific state (scores, rounds, etc.)
  config: {
    entryFee?: number;
    prizePool?: number;
    roundTime?: number;
    totalRounds?: number;
    allowSpectators?: boolean;
  };
  metadata: {
    matchId?: string;
    tournamentId?: string;
    seasonId?: string;
  };
}

export interface GameAction {
  actionId: string;
  userId: string;
  type: string;
  data: any;
  timestamp: number;
  validated: boolean;
}

export interface GameResult {
  roomId: string;
  gameId: string;
  winners: string[];
  losers: string[];
  scores: Record<string, number>;
  duration: number;
  completedAt: number;
  metadata: any;
}

export class GameRoomService {
  private readonly ROOM_TTL = 3600; // 1 hour
  private readonly ACTION_LOG_LIMIT = 1000;

  /**
   * Create a new game room
   */
  async createRoom(params: {
    gameId: string;
    mode: GameRoomState['mode'];
    maxPlayers: number;
    hostId?: string;
    config?: GameRoomState['config'];
    metadata?: GameRoomState['metadata'];
  }): Promise<{ success: boolean; room?: GameRoomState; error?: string }> {
    try {
      const roomId = `room:${params.gameId}:${uuidv4()}`;

      const room: GameRoomState = {
        roomId,
        gameId: params.gameId,
        mode: params.mode,
        status: 'waiting',
        players: [],
        spectators: [],
        maxPlayers: params.maxPlayers,
        hostId: params.hostId,
        createdAt: Date.now(),
        gameState: this.initializeGameState(params.gameId),
        config: params.config || {},
        metadata: params.metadata || {}
      };

      await setCache(roomId, room, this.ROOM_TTL);

      // Add to active rooms index
      await this.addToActiveRooms(params.gameId, roomId);

      logger.info(`Game room created: ${roomId} for game ${params.gameId}`);

      return { success: true, room };
    } catch (error) {
      logger.error('Error creating game room:', error);
      return {
        success: false,
        error: 'Failed to create game room'
      };
    }
  }

  /**
   * Join a game room as player
   */
  async joinRoom(roomId: string, player: Omit<GamePlayer, 'ready' | 'score' | 'disconnected' | 'joinedAt'>): Promise<{ success: boolean; room?: GameRoomState; error?: string }> {
    try {
      const room = await this.getRoom(roomId);
      if (!room) {
        return { success: false, error: 'Room not found' };
      }

      // Check if room is full
      if (room.players.length >= room.maxPlayers) {
        return { success: false, error: 'Room is full' };
      }

      // Check if player already in room
      if (room.players.some(p => p.userId === player.userId)) {
        return { success: false, error: 'Already in room' };
      }

      // Check if room is in valid state for joining
      if (room.status !== 'waiting' && room.status !== 'ready') {
        return { success: false, error: 'Game already in progress' };
      }

      // Add player
      room.players.push({
        ...player,
        ready: false,
        score: 0,
        disconnected: false,
        joinedAt: Date.now()
      });

      // Auto-ready for 1v1 matches when 2 players join
      if (room.mode === '1v1' && room.players.length === 2) {
        room.status = 'ready';
      }

      await setCache(roomId, room, this.ROOM_TTL);

      logger.info(`Player ${player.userId} joined room ${roomId}`);

      return { success: true, room };
    } catch (error) {
      logger.error('Error joining room:', error);
      return {
        success: false,
        error: 'Failed to join room'
      };
    }
  }

  /**
   * Leave a game room
   */
  async leaveRoom(roomId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const room = await this.getRoom(roomId);
      if (!room) {
        return { success: true }; // Already doesn't exist
      }

      // Remove player
      room.players = room.players.filter(p => p.userId !== userId);

      // If room is empty, delete it
      if (room.players.length === 0 && room.spectators.length === 0) {
        await this.deleteRoom(roomId);
        return { success: true };
      }

      // If game in progress and player leaves, mark as abandoned
      if (room.status === 'in_progress') {
        const player = room.players.find(p => p.userId === userId);
        if (player) {
          player.disconnected = true;
        }

        // Check if all players disconnected
        if (room.players.every(p => p.disconnected)) {
          room.status = 'abandoned';
        }
      }

      await setCache(roomId, room, this.ROOM_TTL);

      logger.info(`Player ${userId} left room ${roomId}`);

      return { success: true };
    } catch (error) {
      logger.error('Error leaving room:', error);
      return {
        success: false,
        error: 'Failed to leave room'
      };
    }
  }

  /**
   * Mark player as ready
   */
  async setPlayerReady(roomId: string, userId: string, ready: boolean): Promise<{ success: boolean; room?: GameRoomState; error?: string }> {
    try {
      const room = await this.getRoom(roomId);
      if (!room) {
        return { success: false, error: 'Room not found' };
      }

      const player = room.players.find(p => p.userId === userId);
      if (!player) {
        return { success: false, error: 'Player not in room' };
      }

      player.ready = ready;

      // Check if all players ready
      if (room.players.length >= 2 && room.players.every(p => p.ready)) {
        room.status = 'ready';
      } else if (room.status === 'ready' && !room.players.every(p => p.ready)) {
        room.status = 'waiting';
      }

      await setCache(roomId, room, this.ROOM_TTL);

      return { success: true, room };
    } catch (error) {
      logger.error('Error setting player ready:', error);
      return {
        success: false,
        error: 'Failed to set ready status'
      };
    }
  }

  /**
   * Start the game
   */
  async startGame(roomId: string): Promise<{ success: boolean; room?: GameRoomState; error?: string }> {
    try {
      const room = await this.getRoom(roomId);
      if (!room) {
        return { success: false, error: 'Room not found' };
      }

      if (room.status !== 'ready') {
        return { success: false, error: 'Room not ready to start' };
      }

      if (room.players.length < 2 && room.mode !== 'solo') {
        return { success: false, error: 'Not enough players' };
      }

      room.status = 'starting';
      room.startedAt = Date.now();

      await setCache(roomId, room, this.ROOM_TTL);

      // Auto-transition to in_progress after countdown
      setTimeout(async () => {
        const updatedRoom = await this.getRoom(roomId);
        if (updatedRoom && updatedRoom.status === 'starting') {
          updatedRoom.status = 'in_progress';
          await setCache(roomId, updatedRoom, this.ROOM_TTL);
        }
      }, 3000); // 3 second countdown

      logger.info(`Game started in room ${roomId}`);

      return { success: true, room };
    } catch (error) {
      logger.error('Error starting game:', error);
      return {
        success: false,
        error: 'Failed to start game'
      };
    }
  }

  /**
   * Record a game action
   */
  async recordAction(roomId: string, action: Omit<GameAction, 'actionId' | 'timestamp' | 'validated'>): Promise<{ success: boolean; action?: GameAction; error?: string }> {
    try {
      const room = await this.getRoom(roomId);
      if (!room) {
        return { success: false, error: 'Room not found' };
      }

      if (room.status !== 'in_progress') {
        return { success: false, error: 'Game not in progress' };
      }

      const gameAction: GameAction = {
        ...action,
        actionId: uuidv4(),
        timestamp: Date.now(),
        validated: false
      };

      // Store action in action log
      const logKey = `${roomId}:actions`;
      const actions = (await getCache(logKey) as GameAction[]) || [];
      actions.push(gameAction);

      // Keep only recent actions
      if (actions.length > this.ACTION_LOG_LIMIT) {
        actions.splice(0, actions.length - this.ACTION_LOG_LIMIT);
      }

      await setCache(logKey, actions, this.ROOM_TTL);

      logger.info(`Action recorded in room ${roomId}: ${action.type} by ${action.userId}`);

      return { success: true, action: gameAction };
    } catch (error) {
      logger.error('Error recording action:', error);
      return {
        success: false,
        error: 'Failed to record action'
      };
    }
  }

  /**
   * Update game state
   */
  async updateGameState(roomId: string, stateUpdate: any): Promise<{ success: boolean; error?: string }> {
    try {
      const room = await this.getRoom(roomId);
      if (!room) {
        return { success: false, error: 'Room not found' };
      }

      room.gameState = {
        ...room.gameState,
        ...stateUpdate,
        lastUpdated: Date.now()
      };

      await setCache(roomId, room, this.ROOM_TTL);

      return { success: true };
    } catch (error) {
      logger.error('Error updating game state:', error);
      return {
        success: false,
        error: 'Failed to update game state'
      };
    }
  }

  /**
   * Update player score
   */
  async updatePlayerScore(roomId: string, userId: string, score: number): Promise<{ success: boolean; error?: string }> {
    try {
      const room = await this.getRoom(roomId);
      if (!room) {
        return { success: false, error: 'Room not found' };
      }

      const player = room.players.find(p => p.userId === userId);
      if (!player) {
        return { success: false, error: 'Player not in room' };
      }

      player.score = score;

      await setCache(roomId, room, this.ROOM_TTL);

      return { success: true };
    } catch (error) {
      logger.error('Error updating player score:', error);
      return {
        success: false,
        error: 'Failed to update score'
      };
    }
  }

  /**
   * End the game
   */
  async endGame(roomId: string, result: Omit<GameResult, 'roomId' | 'gameId' | 'completedAt'>): Promise<{ success: boolean; result?: GameResult; error?: string }> {
    try {
      const room = await this.getRoom(roomId);
      if (!room) {
        return { success: false, error: 'Room not found' };
      }

      room.status = 'completed';
      room.endedAt = Date.now();

      await setCache(roomId, room, this.ROOM_TTL);

      const gameResult: GameResult = {
        roomId,
        gameId: room.gameId,
        completedAt: Date.now(),
        ...result
      };

      // Store result
      await setCache(`${roomId}:result`, gameResult, this.ROOM_TTL);

      // Remove from active rooms
      await this.removeFromActiveRooms(room.gameId, roomId);

      logger.info(`Game ended in room ${roomId}`);

      return { success: true, result: gameResult };
    } catch (error) {
      logger.error('Error ending game:', error);
      return {
        success: false,
        error: 'Failed to end game'
      };
    }
  }

  /**
   * Get room state
   */
  async getRoom(roomId: string): Promise<GameRoomState | null> {
    try {
      const room = await getCache(roomId) as GameRoomState;
      return room || null;
    } catch (error) {
      logger.error('Error getting room:', error);
      return null;
    }
  }

  /**
   * Get game result
   */
  async getGameResult(roomId: string): Promise<GameResult | null> {
    try {
      const result = await getCache(`${roomId}:result`) as GameResult;
      return result || null;
    } catch (error) {
      logger.error('Error getting game result:', error);
      return null;
    }
  }

  /**
   * Get action log
   */
  async getActionLog(roomId: string): Promise<GameAction[]> {
    try {
      const actions = await getCache(`${roomId}:actions`) as GameAction[];
      return actions || [];
    } catch (error) {
      logger.error('Error getting action log:', error);
      return [];
    }
  }

  /**
   * Join as spectator
   */
  async joinAsSpectator(roomId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const room = await this.getRoom(roomId);
      if (!room) {
        return { success: false, error: 'Room not found' };
      }

      if (!room.config.allowSpectators) {
        return { success: false, error: 'Spectators not allowed' };
      }

      if (!room.spectators.includes(userId)) {
        room.spectators.push(userId);
        await setCache(roomId, room, this.ROOM_TTL);
      }

      return { success: true };
    } catch (error) {
      logger.error('Error joining as spectator:', error);
      return {
        success: false,
        error: 'Failed to join as spectator'
      };
    }
  }

  /**
   * Get active rooms for a game
   */
  async getActiveRooms(gameId: string): Promise<string[]> {
    try {
      const rooms = await getCache(`game:${gameId}:active_rooms`) as string[];
      return rooms || [];
    } catch (error) {
      return [];
    }
  }

  // ============ PRIVATE HELPERS ============

  private async deleteRoom(roomId: string): Promise<void> {
    await deleteCache(roomId);
    await deleteCache(`${roomId}:actions`);
    await deleteCache(`${roomId}:result`);
  }

  private async addToActiveRooms(gameId: string, roomId: string): Promise<void> {
    const key = `game:${gameId}:active_rooms`;
    const rooms = await getCache(key) as string[] || [];
    if (!rooms.includes(roomId)) {
      rooms.push(roomId);
      await setCache(key, rooms, this.ROOM_TTL);
    }
  }

  private async removeFromActiveRooms(gameId: string, roomId: string): Promise<void> {
    const key = `game:${gameId}:active_rooms`;
    const rooms = await getCache(key) as string[] || [];
    const filtered = rooms.filter(r => r !== roomId);
    await setCache(key, filtered, this.ROOM_TTL);
  }

  private initializeGameState(gameId: string): any {
    // Game-specific initialization
    const baseState = {
      round: 1,
      startTime: Date.now(),
      lastUpdated: Date.now()
    };

    switch (gameId) {
      case 'coin-flip-deluxe':
        return { ...baseState, flips: [] };
      case 'tap-duel':
        return { ...baseState, taps: { player1: 0, player2: 0 } };
      case 'trivia-royale':
        return { ...baseState, currentQuestion: 0, questionsAsked: [] };
      case 'buzz-runner':
        return { ...baseState, distance: 0, obstacles: [] };
      case 'stack-storm':
        return { ...baseState, height: 0, blocks: [] };
      case 'buzz-arena':
        return { ...baseState, rounds: [], currentRound: 1 };
      default:
        return baseState;
    }
  }
}

export const gameRoomService = new GameRoomService();

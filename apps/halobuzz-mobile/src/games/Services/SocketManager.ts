/**
 * Socket.IO Manager for Real-Time Game Features
 * Handles matchmaking, game rooms, and live events
 */

import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://p01--halo-api--6jbmvhzxwv4y.code.run';

export interface MatchmakingData {
  gameId: string;
  mmr?: number;
  mode?: 'casual' | 'ranked';
}

export interface MatchFoundData {
  matchId: string;
  roomId: string;
  opponent: {
    userId: string;
    username?: string;
    mmr?: number;
    rank?: string;
  };
  gameId: string;
}

export interface GameRoomJoinData {
  roomId: string;
}

export interface PlayerActionData {
  roomId: string;
  action: any;
  timestamp: number;
}

export interface GameStateUpdate {
  roomId: string;
  state: any;
  timestamp: number;
}

export interface GameEndData {
  roomId: string;
  results: {
    winnerId?: string;
    loserId?: string;
    isDraw?: boolean;
    scores: Record<string, number>;
  };
}

type EventCallback = (...args: any[]) => void;

class SocketManager {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private eventHandlers: Map<string, EventCallback[]> = new Map();

  /**
   * Initialize and connect to Socket.IO server
   */
  async connect(): Promise<void> {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('userToken');

      if (!token) {
        console.error('No auth token found, cannot connect socket');
        return;
      }

      this.socket = io(`${SOCKET_URL}/games`, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
      });

      this.setupConnectionHandlers();
      this.setupGameHandlers();

      console.log('Socket.IO connecting...');
    } catch (error) {
      console.error('Failed to initialize socket:', error);
    }
  }

  /**
   * Disconnect from Socket.IO server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('Socket disconnected');
    }
  }

  /**
   * Check if socket is connected
   */
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  /**
   * Setup connection event handlers
   */
  private setupConnectionHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('socket:connected', { socketId: this.socket?.id });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      this.isConnected = false;
      this.emit('socket:disconnected', { reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      this.reconnectAttempts++;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.emit('socket:error', { error: 'Connection failed' });
      }
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
      this.emit('socket:error', { error });
    });
  }

  /**
   * Setup game-specific event handlers
   */
  private setupGameHandlers(): void {
    if (!this.socket) return;

    // Matchmaking events
    this.socket.on('matchmaking:match_found', (data: MatchFoundData) => {
      console.log('Match found:', data);
      this.emit('matchmaking:match_found', data);
    });

    this.socket.on('matchmaking:match_ready', (data) => {
      console.log('Match ready:', data);
      this.emit('matchmaking:match_ready', data);
    });

    this.socket.on('matchmaking:cancelled', (data) => {
      console.log('Matchmaking cancelled:', data);
      this.emit('matchmaking:cancelled', data);
    });

    this.socket.on('matchmaking:timeout', (data) => {
      console.log('Matchmaking timeout:', data);
      this.emit('matchmaking:timeout', data);
    });

    // Game room events
    this.socket.on('game:joined', (data) => {
      console.log('Joined game room:', data);
      this.emit('game:joined', data);
    });

    this.socket.on('game:player_joined', (data) => {
      console.log('Player joined:', data);
      this.emit('game:player_joined', data);
    });

    this.socket.on('game:player_left', (data) => {
      console.log('Player left:', data);
      this.emit('game:player_left', data);
    });

    this.socket.on('game:start', (data) => {
      console.log('Game starting:', data);
      this.emit('game:start', data);
    });

    this.socket.on('game:state_update', (data: GameStateUpdate) => {
      this.emit('game:state_update', data);
    });

    this.socket.on('game:action_broadcast', (data) => {
      this.emit('game:action_broadcast', data);
    });

    this.socket.on('game:score_broadcast', (data) => {
      this.emit('game:score_broadcast', data);
    });

    this.socket.on('game:end', (data: GameEndData) => {
      console.log('Game ended:', data);
      this.emit('game:end', data);
    });

    // Error handling
    this.socket.on('game:error', (data) => {
      console.error('Game error:', data);
      this.emit('game:error', data);
    });
  }

  /**
   * Join matchmaking queue
   */
  joinMatchmaking(data: MatchmakingData): void {
    if (!this.isSocketConnected()) {
      console.error('Socket not connected');
      return;
    }

    console.log('Joining matchmaking:', data);
    this.socket?.emit('matchmaking:join', data);
  }

  /**
   * Leave matchmaking queue
   */
  leaveMatchmaking(data: { gameId: string }): void {
    if (!this.isSocketConnected()) return;

    console.log('Leaving matchmaking:', data);
    this.socket?.emit('matchmaking:leave', data);
  }

  /**
   * Get matchmaking stats
   */
  getMatchmakingStats(data: { gameId: string }): void {
    if (!this.isSocketConnected()) return;

    this.socket?.emit('matchmaking:stats', data);
  }

  /**
   * Join a game room
   */
  joinGameRoom(data: GameRoomJoinData): void {
    if (!this.isSocketConnected()) {
      console.error('Socket not connected');
      return;
    }

    console.log('Joining game room:', data);
    this.socket?.emit('game:join', data);
  }

  /**
   * Leave a game room
   */
  leaveGameRoom(data: { roomId: string }): void {
    if (!this.isSocketConnected()) return;

    console.log('Leaving game room:', data);
    this.socket?.emit('game:leave', data);
  }

  /**
   * Mark player as ready
   */
  setPlayerReady(data: { roomId: string }): void {
    if (!this.isSocketConnected()) return;

    console.log('Player ready:', data);
    this.socket?.emit('game:ready', data);
  }

  /**
   * Send player action
   */
  sendPlayerAction(data: PlayerActionData): void {
    if (!this.isSocketConnected()) return;

    this.socket?.emit('game:action', data);
  }

  /**
   * Update player score
   */
  updateScore(data: { roomId: string; score: number }): void {
    if (!this.isSocketConnected()) return;

    this.socket?.emit('game:score_update', data);
  }

  /**
   * End game and submit results
   */
  endGame(data: GameEndData): void {
    if (!this.isSocketConnected()) return;

    console.log('Ending game:', data);
    this.socket?.emit('game:end', data);
  }

  /**
   * Register event listener
   */
  on(event: string, callback: EventCallback): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)?.push(callback);
  }

  /**
   * Unregister event listener
   */
  off(event: string, callback: EventCallback): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(callback);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to registered handlers
   */
  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Clear all event handlers
   */
  clearEventHandlers(): void {
    this.eventHandlers.clear();
  }

  /**
   * Remove handlers for specific event
   */
  clearEvent(event: string): void {
    this.eventHandlers.delete(event);
  }
}

// Singleton instance
export const socketManager = new SocketManager();
export default socketManager;

import { io, Socket } from 'socket.io-client';
import { store } from '../store';
import { selectUser } from '../store/slices/authSlice';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  async initializeSocket() {
    try {
      const user = selectUser(store.getState());
      
      if (!user?.id) {
        console.log('No user found, skipping socket initialization');
        return;
      }

      this.socket = io('http://localhost:3001', {
        auth: {
          userId: user.id,
          token: 'user-token', // Replace with actual token
        },
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
      });

      this.setupEventListeners();
      
      console.log('Socket.IO connected successfully');
    } catch (error) {
      console.error('Failed to initialize socket:', error);
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      this.handleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.handleReconnect();
    });

    // Canonical events only
    this.socket.on('stream:join', (data) => {
      console.log('Stream join:', data);
    });

    this.socket.on('stream:leave', (data) => {
      console.log('Stream leave:', data);
    });

    this.socket.on('chat:new', (data) => {
      console.log('Chat new:', data);
    });

    this.socket.on('gift:sent', (data) => {
      console.log('Gift sent:', data);
    });

    this.socket.on('throne:claimed', (data) => {
      console.log('Throne claimed:', data);
    });

    this.socket.on('battle:boost', (data) => {
      console.log('Battle boost:', data);
    });

    this.socket.on('ai:warning', (data) => {
      console.log('AI warning:', data);
    });

    this.socket.on('og:changed', (data) => {
      console.log('OG changed:', data);
    });

    this.socket.on('metrics:update', (data) => {
      console.log('Metrics update:', data);
    });
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.initializeSocket();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  // Canonical emitters
  joinLiveStream(streamId: string) {
    if (this.socket) {
      this.socket.emit('stream:join', { streamId });
    }
  }

  leaveLiveStream(streamId: string) {
    if (this.socket) {
      this.socket.emit('stream:leave', { streamId });
    }
  }

  sendChatMessage(streamId: string, message: string, type: 'public' | 'private' | 'gift' = 'public') {
    if (this.socket) {
      this.socket.emit('chat:new', { streamId, message, type });
    }
  }

  sendGift(streamId: string, giftId: string, quantity: number = 1) {
    if (this.socket) {
      this.socket.emit('gift:sent', { streamId, giftId, quantity });
    }
  }

  claimThrone(streamId: string) {
    if (this.socket) {
      this.socket.emit('throne:claimed', { streamId });
    }
  }

  sendBattleBoost(streamId: string, boostType: string, boostAmount: number) {
    if (this.socket) {
      this.socket.emit('battle:boost', { streamId, boostType, boostAmount });
    }
  }

  sendAiWarning(streamId: string, warningType: string, message: string) {
    if (this.socket) {
      this.socket.emit('ai:warning', { streamId, warningType, message });
    }
  }

  // Utility methods
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Event listener management
  on(event: string, callback: (data: any) => void) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (data: any) => void) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

export const socketService = new SocketService();

export const initializeSocket = async () => {
  await socketService.initializeSocket();
};

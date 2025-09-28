import { io, Socket } from 'socket.io-client';
import { Platform } from 'react-native';
import { PerformanceMonitor } from '@/utils/performanceMonitor';

interface SocketConfig {
  url: string;
  options?: any;
  enableCompression?: boolean;
  enableBinary?: boolean;
  adaptiveHeartbeat?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  pingTimeout?: number;
  enableDeltaUpdates?: boolean;
}

interface BinaryMessage {
  type: string;
  data: ArrayBuffer;
  timestamp: number;
}

interface DeltaState {
  [key: string]: any;
}

// Binary message types for efficient data transfer
export const MessageTypes = {
  CHAT_MESSAGE: 0x01,
  GIFT_SEND: 0x02,
  USER_JOIN: 0x03,
  USER_LEAVE: 0x04,
  STREAM_STATS: 0x05,
  HEARTBEAT: 0x06,
  DELTA_UPDATE: 0x07,
} as const;

// Message compression utilities
class MessageCompressor {
  static compress(data: any): ArrayBuffer | string {
    try {
      const jsonString = JSON.stringify(data);

      // For small messages, JSON is more efficient
      if (jsonString.length < 100) {
        return jsonString;
      }

      // Use binary encoding for larger messages
      const encoder = new TextEncoder();
      const uint8Array = encoder.encode(jsonString);

      // Simple compression: remove common patterns
      return this.simpleBinaryCompress(uint8Array);
    } catch (error) {
      console.warn('Message compression failed:', error);
      return JSON.stringify(data);
    }
  }

  static decompress(data: ArrayBuffer | string): any {
    try {
      if (typeof data === 'string') {
        return JSON.parse(data);
      }

      // Decompress binary data
      const decompressed = this.simpleBinaryDecompress(data);
      const decoder = new TextDecoder();
      const jsonString = decoder.decode(decompressed);
      return JSON.parse(jsonString);
    } catch (error) {
      console.warn('Message decompression failed:', error);
      return null;
    }
  }

  private static simpleBinaryCompress(data: Uint8Array): ArrayBuffer {
    // Simple run-length encoding for repeated bytes
    const compressed: number[] = [];
    let i = 0;

    while (i < data.length) {
      let count = 1;
      const currentByte = data[i];

      // Count consecutive identical bytes
      while (i + count < data.length && data[i + count] === currentByte && count < 255) {
        count++;
      }

      if (count > 3) {
        // Use RLE: [255, count, byte]
        compressed.push(255, count, currentByte);
      } else {
        // Direct encoding for short runs
        for (let j = 0; j < count; j++) {
          compressed.push(currentByte);
        }
      }

      i += count;
    }

    return new Uint8Array(compressed).buffer;
  }

  private static simpleBinaryDecompress(data: ArrayBuffer): Uint8Array {
    const input = new Uint8Array(data);
    const decompressed: number[] = [];
    let i = 0;

    while (i < input.length) {
      if (input[i] === 255 && i + 2 < input.length) {
        // RLE decode: [255, count, byte]
        const count = input[i + 1];
        const byte = input[i + 2];
        for (let j = 0; j < count; j++) {
          decompressed.push(byte);
        }
        i += 3;
      } else {
        decompressed.push(input[i]);
        i++;
      }
    }

    return new Uint8Array(decompressed);
  }
}

// Delta update manager for efficient state synchronization
class DeltaManager {
  private lastState: DeltaState = {};

  createDelta(newState: DeltaState): DeltaState | null {
    const delta: DeltaState = {};
    let hasChanges = false;

    for (const [key, value] of Object.entries(newState)) {
      if (this.lastState[key] !== value) {
        delta[key] = value;
        hasChanges = true;
      }
    }

    // Check for removed keys
    for (const key of Object.keys(this.lastState)) {
      if (!(key in newState)) {
        delta[key] = null; // null indicates removal
        hasChanges = true;
      }
    }

    this.lastState = { ...newState };
    return hasChanges ? delta : null;
  }

  applyDelta(delta: DeltaState): DeltaState {
    const newState = { ...this.lastState };

    for (const [key, value] of Object.entries(delta)) {
      if (value === null) {
        delete newState[key];
      } else {
        newState[key] = value;
      }
    }

    this.lastState = newState;
    return newState;
  }

  reset() {
    this.lastState = {};
  }
}

// Adaptive heartbeat based on network conditions
class HeartbeatManager {
  private interval: number = 25000; // Default 25s
  private timer: NodeJS.Timeout | null = null;
  private missedPings = 0;
  private rttHistory: number[] = [];
  private lastPingTime = 0;

  start(socket: Socket) {
    this.stop();
    this.scheduleNextPing(socket);
  }

  stop() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleNextPing(socket: Socket) {
    this.timer = setTimeout(() => {
      this.sendPing(socket);
    }, this.interval);
  }

  private sendPing(socket: Socket) {
    this.lastPingTime = Date.now();

    socket.emit('ping', { timestamp: this.lastPingTime });

    // Listen for pong response
    const pongHandler = (data: any) => {
      const rtt = Date.now() - this.lastPingTime;
      this.handlePongReceived(rtt);
      socket.off('pong', pongHandler);
    };

    socket.on('pong', pongHandler);

    // Timeout for missed pong
    setTimeout(() => {
      socket.off('pong', pongHandler);
      this.handleMissedPong(socket);
    }, 5000);
  }

  private handlePongReceived(rtt: number) {
    this.missedPings = 0;
    this.rttHistory.push(rtt);

    // Keep only last 10 RTT measurements
    if (this.rttHistory.length > 10) {
      this.rttHistory.shift();
    }

    // Adapt heartbeat interval based on network conditions
    const avgRtt = this.rttHistory.reduce((a, b) => a + b, 0) / this.rttHistory.length;

    if (avgRtt < 100) {
      // Good network: longer intervals
      this.interval = Math.min(30000, this.interval + 1000);
    } else if (avgRtt > 500) {
      // Poor network: shorter intervals for quicker detection
      this.interval = Math.max(15000, this.interval - 2000);
    }

    PerformanceMonitor.markEnd('socket_ping');
  }

  private handleMissedPong(socket: Socket) {
    this.missedPings++;

    if (this.missedPings >= 3) {
      // Connection likely lost - trigger reconnect
      socket.disconnect();
    } else {
      // Reduce interval for quicker recovery detection
      this.interval = Math.max(10000, this.interval - 5000);
    }
  }
}

// Main optimized socket service
export class OptimizedSocket {
  private socket: Socket | null = null;
  private config: SocketConfig;
  private messageCompressor = new MessageCompressor();
  private deltaManager = new DeltaManager();
  private heartbeatManager = new HeartbeatManager();
  private reconnectAttempts = 0;
  private isConnecting = false;
  private messageQueue: Array<{ event: string; data: any }> = [];
  private listeners = new Map<string, Function[]>();
  private bandwidth = {
    sent: 0,
    received: 0,
    startTime: Date.now(),
  };

  constructor(config: SocketConfig) {
    this.config = {
      enableCompression: true,
      enableBinary: true,
      adaptiveHeartbeat: true,
      maxReconnectAttempts: 5,
      reconnectDelay: 2000,
      pingTimeout: 10000,
      enableDeltaUpdates: true,
      ...config,
    };
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnecting || this.socket?.connected) {
        resolve();
        return;
      }

      this.isConnecting = true;
      PerformanceMonitor.markStart('socket_connect');

      const socketOptions = {
        transports: ['websocket'], // Prefer WebSocket over polling
        upgrade: true,
        rememberUpgrade: true,
        timeout: this.config.pingTimeout,
        forceNew: true,
        compression: this.config.enableCompression,
        ...this.config.options,
      };

      this.socket = io(this.config.url, socketOptions);

      this.socket.on('connect', () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        PerformanceMonitor.markEnd('socket_connect');

        // Start adaptive heartbeat
        if (this.config.adaptiveHeartbeat) {
          this.heartbeatManager.start(this.socket!);
        }

        // Process queued messages
        this.processMessageQueue();

        resolve();
      });

      this.socket.on('connect_error', (error) => {
        this.isConnecting = false;
        PerformanceMonitor.markEnd('socket_connect');

        if (this.reconnectAttempts < this.config.maxReconnectAttempts!) {
          setTimeout(() => this.reconnect(), this.config.reconnectDelay!);
        } else {
          reject(error);
        }
      });

      this.socket.on('disconnect', () => {
        this.heartbeatManager.stop();
        this.handleDisconnect();
      });

      // Bandwidth monitoring
      this.socket.onAny((event, data) => {
        const size = this.estimateMessageSize(data);
        this.bandwidth.received += size;
      });

      this.socket.onAnyOutgoing((event, data) => {
        const size = this.estimateMessageSize(data);
        this.bandwidth.sent += size;
      });
    });
  }

  disconnect() {
    this.heartbeatManager.stop();
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Optimized message sending with compression and batching
  emit(event: string, data: any, options: { compress?: boolean; binary?: boolean } = {}) {
    if (!this.socket?.connected) {
      this.messageQueue.push({ event, data });
      return;
    }

    const shouldCompress = options.compress ?? this.config.enableCompression;
    const shouldUseBinary = options.binary ?? this.config.enableBinary;

    let payload = data;

    // Apply compression if enabled
    if (shouldCompress && typeof data === 'object') {
      payload = MessageCompressor.compress(data);
    }

    // Use binary encoding for large payloads
    if (shouldUseBinary && payload instanceof ArrayBuffer) {
      this.socket.emit(event, payload);
    } else {
      this.socket.emit(event, payload);
    }
  }

  // Delta updates for efficient state synchronization
  emitDelta(event: string, newState: DeltaState) {
    if (!this.config.enableDeltaUpdates) {
      this.emit(event, newState);
      return;
    }

    const delta = this.deltaManager.createDelta(newState);
    if (delta) {
      this.emit(`${event}_delta`, delta, { compress: true });
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);

    if (this.socket) {
      this.socket.on(event, this.createOptimizedHandler(event, callback));
    }
  }

  off(event: string, callback?: Function) {
    if (callback) {
      const handlers = this.listeners.get(event) || [];
      const index = handlers.indexOf(callback);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    } else {
      this.listeners.delete(event);
    }

    if (this.socket) {
      this.socket.off(event, callback as any);
    }
  }

  // Batch multiple messages for efficiency
  batch(messages: Array<{ event: string; data: any }>) {
    if (!this.socket?.connected) {
      this.messageQueue.push(...messages);
      return;
    }

    // Send as single batch message
    this.emit('batch', messages, { compress: true });
  }

  // Get connection statistics
  getStats() {
    const duration = (Date.now() - this.bandwidth.startTime) / 1000;

    return {
      connected: this.socket?.connected || false,
      reconnectAttempts: this.reconnectAttempts,
      queuedMessages: this.messageQueue.length,
      bandwidth: {
        sent: this.bandwidth.sent,
        received: this.bandwidth.received,
        sentPerSecond: this.bandwidth.sent / duration,
        receivedPerSecond: this.bandwidth.received / duration,
      },
    };
  }

  private createOptimizedHandler(event: string, callback: Function) {
    return (data: any) => {
      PerformanceMonitor.markStart(`socket_message_${event}`);

      // Handle compressed messages
      if (data instanceof ArrayBuffer || (typeof data === 'string' && data.startsWith('{'))) {
        try {
          const decompressed = MessageCompressor.decompress(data);
          callback(decompressed);
        } catch (error) {
          callback(data); // Fallback to raw data
        }
      } else {
        callback(data);
      }

      PerformanceMonitor.markEnd(`socket_message_${event}`);
    };
  }

  private reconnect() {
    this.reconnectAttempts++;
    const delay = Math.min(this.config.reconnectDelay! * Math.pow(2, this.reconnectAttempts), 30000);

    setTimeout(() => {
      if (!this.socket?.connected) {
        this.connect().catch(() => {
          // Retry will be handled by connect_error event
        });
      }
    }, delay);
  }

  private handleDisconnect() {
    // Reset delta manager state
    this.deltaManager.reset();

    // Attempt reconnection
    if (this.reconnectAttempts < this.config.maxReconnectAttempts!) {
      this.reconnect();
    }
  }

  private processMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      this.emit(message.event, message.data);
    }
  }

  private estimateMessageSize(data: any): number {
    if (data instanceof ArrayBuffer) {
      return data.byteLength;
    } else if (typeof data === 'string') {
      return data.length;
    } else {
      return JSON.stringify(data || {}).length;
    }
  }
}

// Factory for creating optimized socket instances
export const createOptimizedSocket = (config: SocketConfig): OptimizedSocket => {
  return new OptimizedSocket(config);
};
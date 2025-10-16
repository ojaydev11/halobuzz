/**
 * ChangeStreamService
 * Real-time database change monitoring and event broadcasting
 * 
 * Monitors MongoDB change streams and broadcasts events to WebSocket clients
 * for real-time notifications and live updates.
 */

import { EventEmitter } from 'events';
import mongoose from 'mongoose';
import { setupLogger } from '@/config/logger';

const logger = setupLogger();

export interface ChangeStreamEvent {
  operationType: 'insert' | 'update' | 'replace' | 'delete' | 'invalidate' | 'drop' | 'dropDatabase' | 'rename';
  fullDocument?: any;
  documentKey: { _id: mongoose.Types.ObjectId };
  updateDescription?: {
    updatedFields: any;
    removedFields: string[];
  };
  clusterTime: any;
  ns: {
    db: string;
    coll: string;
  };
  timestamp: Date;
}

export interface BroadcastEvent {
  type: string;
  collection: string;
  operation: string;
  documentId: string;
  userId?: string;
  data?: any;
  timestamp: Date;
}

export class ChangeStreamService extends EventEmitter {
  private static instance: ChangeStreamService;
  private changeStreams: Map<string, any> = new Map();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  // Collections to monitor
  private readonly MONITORED_COLLECTIONS = [
    'users',
    'gifts', 
    'transactions',
    'livestreams',
    'gamesessions',
    'tournaments',
    'messages',
    'reputationevents',
    'auditlogs'
  ];

  private constructor() {
    super();
    this.setupErrorHandling();
  }

  static getInstance(): ChangeStreamService {
    if (!ChangeStreamService.instance) {
      ChangeStreamService.instance = new ChangeStreamService();
    }
    return ChangeStreamService.instance;
  }

  /**
   * Initialize change streams for all monitored collections
   */
  async initialize(): Promise<void> {
    try {
      if (this.isConnected) {
        logger.warn('ChangeStreamService already initialized');
        return;
      }

      logger.info('Initializing ChangeStreamService...');

      // Check if MongoDB connection supports change streams
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('MongoDB connection not available');
      }

      // Start monitoring each collection
      for (const collectionName of this.MONITORED_COLLECTIONS) {
        await this.startCollectionMonitoring(collectionName);
      }

      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;

      logger.info(`ChangeStreamService initialized successfully for ${this.MONITORED_COLLECTIONS.length} collections`);
      this.emit('service:initialized', { collections: this.MONITORED_COLLECTIONS });

    } catch (error) {
      logger.error('Failed to initialize ChangeStreamService:', error);
      this.handleReconnection();
    }
  }

  /**
   * Start monitoring a specific collection
   */
  private async startCollectionMonitoring(collectionName: string): Promise<void> {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection(collectionName);

      // Create change stream with resume token
      const changeStream = collection.watch([], {
        fullDocument: 'updateLookup',
        resumeAfter: await this.getResumeToken(collectionName)
      });

      // Handle change events
      changeStream.on('change', (change: ChangeStreamEvent) => {
        this.handleChangeEvent(collectionName, change);
      });

      // Handle error events
      changeStream.on('error', (error: Error) => {
        logger.error(`Change stream error for collection ${collectionName}:`, error);
        this.handleStreamError(collectionName, error);
      });

      // Handle close events
      changeStream.on('close', () => {
        logger.warn(`Change stream closed for collection ${collectionName}`);
        this.handleStreamClose(collectionName);
      });

      this.changeStreams.set(collectionName, changeStream);
      logger.info(`Started monitoring collection: ${collectionName}`);

    } catch (error) {
      logger.error(`Failed to start monitoring collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Handle change events from MongoDB change streams
   */
  private handleChangeEvent(collectionName: string, change: ChangeStreamEvent): void {
    try {
      const broadcastEvent = this.transformChangeToBroadcastEvent(collectionName, change);
      
      // Emit the event for internal listeners
      this.emit('change', broadcastEvent);
      
      // Emit collection-specific events
      this.emit(`change:${collectionName}`, broadcastEvent);
      
      // Emit operation-specific events
      this.emit(`change:${collectionName}:${change.operationType}`, broadcastEvent);

      // Store resume token for recovery
      this.storeResumeToken(collectionName, change._id);

      logger.debug(`Change event processed: ${collectionName}.${change.operationType}`, {
        documentId: change.documentKey._id,
        operation: change.operationType
      });

    } catch (error) {
      logger.error(`Error handling change event for ${collectionName}:`, error);
    }
  }

  /**
   * Transform MongoDB change event to broadcast event
   */
  private transformChangeToBroadcastEvent(collectionName: string, change: ChangeStreamEvent): BroadcastEvent {
    const broadcastEvent: BroadcastEvent = {
      type: 'database_change',
      collection: collectionName,
      operation: change.operationType,
      documentId: change.documentKey._id.toString(),
      timestamp: new Date()
    };

    // Add user-specific data for relevant collections
    if (change.fullDocument) {
      switch (collectionName) {
        case 'gifts':
          broadcastEvent.userId = change.fullDocument.senderId || change.fullDocument.recipientId;
          broadcastEvent.data = {
            giftId: change.fullDocument._id,
            senderId: change.fullDocument.senderId,
            recipientId: change.fullDocument.recipientId,
            amount: change.fullDocument.amount,
            type: change.fullDocument.type
          };
          break;
        case 'messages':
          broadcastEvent.userId = change.fullDocument.senderId || change.fullDocument.recipientId;
          broadcastEvent.data = {
            messageId: change.fullDocument._id,
            senderId: change.fullDocument.senderId,
            recipientId: change.fullDocument.recipientId,
            content: change.fullDocument.content
          };
          break;
        case 'livestreams':
          broadcastEvent.userId = change.fullDocument.userId;
          broadcastEvent.data = {
            streamId: change.fullDocument._id,
            userId: change.fullDocument.userId,
            title: change.fullDocument.title,
            status: change.fullDocument.status
          };
          break;
        case 'users':
          broadcastEvent.userId = change.fullDocument._id.toString();
          broadcastEvent.data = {
            userId: change.fullDocument._id,
            username: change.fullDocument.username,
            isOnline: change.fullDocument.isOnline,
            lastActiveAt: change.fullDocument.lastActiveAt
          };
          break;
        default:
          broadcastEvent.data = change.fullDocument;
      }
    }

    return broadcastEvent;
  }

  /**
   * Get resume token for a collection (for recovery after disconnection)
   */
  private async getResumeToken(collectionName: string): Promise<any> {
    try {
      // In production, store resume tokens in Redis or database
      // For now, return undefined to start from current time
      return undefined;
    } catch (error) {
      logger.error(`Error getting resume token for ${collectionName}:`, error);
      return undefined;
    }
  }

  /**
   * Store resume token for a collection
   */
  private async storeResumeToken(collectionName: string, token: any): Promise<void> {
    try {
      // In production, store resume tokens in Redis or database
      // For now, just log the token
      logger.debug(`Stored resume token for ${collectionName}:`, token);
    } catch (error) {
      logger.error(`Error storing resume token for ${collectionName}:`, error);
    }
  }

  /**
   * Handle stream errors
   */
  private handleStreamError(collectionName: string, error: Error): void {
    logger.error(`Stream error for ${collectionName}:`, error);
    this.emit('stream:error', { collection: collectionName, error });
    
    // Attempt to restart the stream
    this.restartCollectionMonitoring(collectionName);
  }

  /**
   * Handle stream close events
   */
  private handleStreamClose(collectionName: string): void {
    logger.warn(`Stream closed for ${collectionName}`);
    this.emit('stream:close', { collection: collectionName });
    
    // Attempt to restart the stream
    this.restartCollectionMonitoring(collectionName);
  }

  /**
   * Restart monitoring for a specific collection
   */
  private async restartCollectionMonitoring(collectionName: string): Promise<void> {
    try {
      // Close existing stream
      const existingStream = this.changeStreams.get(collectionName);
      if (existingStream) {
        await existingStream.close();
        this.changeStreams.delete(collectionName);
      }

      // Wait a bit before restarting
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Restart monitoring
      await this.startCollectionMonitoring(collectionName);
      logger.info(`Restarted monitoring for collection: ${collectionName}`);

    } catch (error) {
      logger.error(`Failed to restart monitoring for ${collectionName}:`, error);
    }
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached. ChangeStreamService will not reconnect.');
      this.emit('service:failed', { reason: 'max_reconnect_attempts' });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    logger.info(`Attempting to reconnect ChangeStreamService in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(async () => {
      try {
        await this.initialize();
      } catch (error) {
        logger.error('Reconnection attempt failed:', error);
        this.handleReconnection();
      }
    }, delay);
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    this.on('error', (error) => {
      logger.error('ChangeStreamService error:', error);
    });

    // Handle process termination
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  /**
   * Shutdown the service gracefully
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down ChangeStreamService...');
    
    try {
      // Close all change streams
      for (const [collectionName, stream] of this.changeStreams) {
        try {
          await stream.close();
          logger.info(`Closed change stream for ${collectionName}`);
        } catch (error) {
          logger.error(`Error closing stream for ${collectionName}:`, error);
        }
      }

      this.changeStreams.clear();
      this.isConnected = false;
      
      logger.info('ChangeStreamService shutdown complete');
      this.emit('service:shutdown');

    } catch (error) {
      logger.error('Error during ChangeStreamService shutdown:', error);
    }
  }

  /**
   * Get service status
   */
  getStatus(): { connected: boolean; monitoredCollections: string[]; activeStreams: number } {
    return {
      connected: this.isConnected,
      monitoredCollections: this.MONITORED_COLLECTIONS,
      activeStreams: this.changeStreams.size
    };
  }

  /**
   * Manually trigger a test event
   */
  triggerTestEvent(collectionName: string, operation: string, documentId: string, data?: any): void {
    const testEvent: BroadcastEvent = {
      type: 'test_event',
      collection: collectionName,
      operation: operation,
      documentId: documentId,
      data: data,
      timestamp: new Date()
    };

    this.emit('change', testEvent);
    logger.info(`Test event triggered: ${collectionName}.${operation}`);
  }
}

// Export singleton instance
export const changeStreamService = ChangeStreamService.getInstance();

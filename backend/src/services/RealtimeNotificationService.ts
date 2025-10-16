/**
 * RealtimeNotificationService
 * Bridges ChangeStreamService events to WebSocket clients
 * 
 * Listens to database change events and broadcasts them to appropriate
 * WebSocket rooms and users for real-time notifications.
 */

import { EventEmitter } from 'events';
import { Server as SocketIOServer } from 'socket.io';
import { changeStreamService, BroadcastEvent } from './ChangeStreamService';
import { setupLogger } from '@/config/logger';

const logger = setupLogger();

export interface NotificationConfig {
  enabled: boolean;
  collections: string[];
  operations: string[];
  userSpecific: boolean;
  roomSpecific: boolean;
}

export interface UserNotification {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
  read: boolean;
}

export class RealtimeNotificationService extends EventEmitter {
  private static instance: RealtimeNotificationService;
  private io: SocketIOServer | null = null;
  private isInitialized = false;
  private notificationConfig: NotificationConfig = {
    enabled: true,
    collections: ['gifts', 'messages', 'livestreams', 'users'],
    operations: ['insert', 'update', 'delete'],
    userSpecific: true,
    roomSpecific: true
  };

  // In-memory notification store (in production, use Redis or database)
  private userNotifications: Map<string, UserNotification[]> = new Map();

  private constructor() {
    super();
  }

  static getInstance(): RealtimeNotificationService {
    if (!RealtimeNotificationService.instance) {
      RealtimeNotificationService.instance = new RealtimeNotificationService();
    }
    return RealtimeNotificationService.instance;
  }

  /**
   * Initialize the service with Socket.IO server
   */
  async initialize(io: SocketIOServer): Promise<void> {
    try {
      if (this.isInitialized) {
        logger.warn('RealtimeNotificationService already initialized');
        return;
      }

      this.io = io;
      
      // Setup change stream event listeners
      this.setupChangeStreamListeners();
      
      // Setup Socket.IO event handlers
      this.setupSocketIOHandlers();
      
      this.isInitialized = true;
      logger.info('RealtimeNotificationService initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize RealtimeNotificationService:', error);
      throw error;
    }
  }

  /**
   * Setup listeners for change stream events
   */
  private setupChangeStreamListeners(): void {
    // Listen to all change events
    changeStreamService.on('change', (event: BroadcastEvent) => {
      this.handleChangeEvent(event);
    });

    // Listen to specific collection events
    this.notificationConfig.collections.forEach(collection => {
      changeStreamService.on(`change:${collection}`, (event: BroadcastEvent) => {
        this.handleCollectionChangeEvent(collection, event);
      });
    });

    logger.info('Change stream listeners setup complete');
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupSocketIOHandlers(): void {
    if (!this.io) return;

    // Handle user connections
    this.io.on('connection', (socket) => {
      const userId = (socket as any).user?.userId;
      if (!userId) return;

      logger.debug(`User ${userId} connected to realtime notifications`);

      // Join user to their personal notification room
      socket.join(`user:${userId}`);

      // Send pending notifications
      this.sendPendingNotifications(userId, socket);

      // Handle notification read events
      socket.on('notification:read', (data) => {
        this.markNotificationAsRead(userId, data.notificationId);
      });

      // Handle notification preferences
      socket.on('notification:preferences', (preferences) => {
        this.updateUserNotificationPreferences(userId, preferences);
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        logger.debug(`User ${userId} disconnected from realtime notifications`);
      });
    });
  }

  /**
   * Handle general change events
   */
  private handleChangeEvent(event: BroadcastEvent): void {
    if (!this.notificationConfig.enabled) return;

    try {
      // Check if this collection and operation should trigger notifications
      if (!this.shouldNotify(event.collection, event.operation)) {
        return;
      }

      // Create notification based on event type
      const notification = this.createNotificationFromEvent(event);
      if (!notification) return;

      // Broadcast to appropriate users/rooms
      this.broadcastNotification(notification, event);

      logger.debug(`Processed change event: ${event.collection}.${event.operation}`, {
        documentId: event.documentId,
        userId: event.userId
      });

    } catch (error) {
      logger.error('Error handling change event:', error);
    }
  }

  /**
   * Handle collection-specific change events
   */
  private handleCollectionChangeEvent(collection: string, event: BroadcastEvent): void {
    try {
      switch (collection) {
        case 'gifts':
          this.handleGiftEvent(event);
          break;
        case 'messages':
          this.handleMessageEvent(event);
          break;
        case 'livestreams':
          this.handleStreamEvent(event);
          break;
        case 'users':
          this.handleUserEvent(event);
          break;
        default:
          logger.debug(`No specific handler for collection: ${collection}`);
      }
    } catch (error) {
      logger.error(`Error handling ${collection} event:`, error);
    }
  }

  /**
   * Handle gift-related events
   */
  private handleGiftEvent(event: BroadcastEvent): void {
    if (event.operation === 'insert' && event.data) {
      // Gift sent notification
      const notification: UserNotification = {
        userId: event.data.recipientId,
        type: 'gift_received',
        title: 'Gift Received! 🎁',
        message: `You received a ${event.data.type} gift!`,
        data: {
          giftId: event.data.giftId,
          senderId: event.data.senderId,
          amount: event.data.amount,
          type: event.data.type
        },
        timestamp: new Date(),
        read: false
      };

      this.addUserNotification(notification);
      this.broadcastToUser(notification.userId, 'notification:new', notification);
    }
  }

  /**
   * Handle message-related events
   */
  private handleMessageEvent(event: BroadcastEvent): void {
    if (event.operation === 'insert' && event.data) {
      // New message notification
      const notification: UserNotification = {
        userId: event.data.recipientId,
        type: 'message_received',
        title: 'New Message',
        message: `You have a new message`,
        data: {
          messageId: event.data.messageId,
          senderId: event.data.senderId,
          content: event.data.content
        },
        timestamp: new Date(),
        read: false
      };

      this.addUserNotification(notification);
      this.broadcastToUser(notification.userId, 'notification:new', notification);
    }
  }

  /**
   * Handle stream-related events
   */
  private handleStreamEvent(event: BroadcastEvent): void {
    if (event.operation === 'insert' && event.data) {
      // Stream started notification
      const notification: UserNotification = {
        userId: event.data.userId,
        type: 'stream_started',
        title: 'Stream Started',
        message: `Your stream "${event.data.title}" is now live!`,
        data: {
          streamId: event.data.streamId,
          title: event.data.title,
          status: event.data.status
        },
        timestamp: new Date(),
        read: false
      };

      this.addUserNotification(notification);
      this.broadcastToUser(notification.userId, 'notification:new', notification);
    }
  }

  /**
   * Handle user-related events
   */
  private handleUserEvent(event: BroadcastEvent): void {
    if (event.operation === 'update' && event.data) {
      // User status change notification
      if (event.data.isOnline !== undefined) {
        this.broadcastToRoom('user:status', 'user:status_change', {
          userId: event.data.userId,
          username: event.data.username,
          isOnline: event.data.isOnline,
          lastActiveAt: event.data.lastActiveAt
        });
      }
    }
  }

  /**
   * Create notification from change event
   */
  private createNotificationFromEvent(event: BroadcastEvent): UserNotification | null {
    // Generic notification creation logic
    return {
      userId: event.userId || 'system',
      type: 'database_change',
      title: `${event.collection} ${event.operation}`,
      message: `A ${event.operation} operation occurred on ${event.collection}`,
      data: event.data,
      timestamp: new Date(),
      read: false
    };
  }

  /**
   * Check if notification should be sent
   */
  private shouldNotify(collection: string, operation: string): boolean {
    return this.notificationConfig.enabled &&
           this.notificationConfig.collections.includes(collection) &&
           this.notificationConfig.operations.includes(operation);
  }

  /**
   * Add notification to user's notification list
   */
  private addUserNotification(notification: UserNotification): void {
    const userId = notification.userId;
    const notifications = this.userNotifications.get(userId) || [];
    
    // Add to beginning of array (most recent first)
    notifications.unshift(notification);
    
    // Keep only last 100 notifications per user
    if (notifications.length > 100) {
      notifications.splice(100);
    }
    
    this.userNotifications.set(userId, notifications);
  }

  /**
   * Broadcast notification to appropriate targets
   */
  private broadcastNotification(notification: UserNotification, event: BroadcastEvent): void {
    if (this.notificationConfig.userSpecific && event.userId) {
      this.broadcastToUser(event.userId, 'notification:new', notification);
    }

    if (this.notificationConfig.roomSpecific) {
      // Broadcast to relevant rooms based on event type
      this.broadcastToRoom(`collection:${event.collection}`, 'notification:new', notification);
    }
  }

  /**
   * Broadcast to specific user
   */
  private broadcastToUser(userId: string, event: string, data: any): void {
    if (!this.io) return;

    this.io.to(`user:${userId}`).emit(event, data);
    logger.debug(`Broadcasted ${event} to user ${userId}`);
  }

  /**
   * Broadcast to specific room
   */
  private broadcastToRoom(room: string, event: string, data: any): void {
    if (!this.io) return;

    this.io.to(room).emit(event, data);
    logger.debug(`Broadcasted ${event} to room ${room}`);
  }

  /**
   * Send pending notifications to user
   */
  private sendPendingNotifications(userId: string, socket: any): void {
    const notifications = this.userNotifications.get(userId) || [];
    const unreadNotifications = notifications.filter(n => !n.read);

    if (unreadNotifications.length > 0) {
      socket.emit('notifications:pending', {
        count: unreadNotifications.length,
        notifications: unreadNotifications.slice(0, 10) // Send only last 10
      });
    }
  }

  /**
   * Mark notification as read
   */
  private markNotificationAsRead(userId: string, notificationId: string): void {
    const notifications = this.userNotifications.get(userId) || [];
    const notification = notifications.find(n => n.data?.notificationId === notificationId);
    
    if (notification) {
      notification.read = true;
      this.userNotifications.set(userId, notifications);
    }
  }

  /**
   * Update user notification preferences
   */
  private updateUserNotificationPreferences(userId: string, preferences: any): void {
    // In production, store preferences in database
    logger.info(`Updated notification preferences for user ${userId}:`, preferences);
  }

  /**
   * Send custom notification
   */
  sendCustomNotification(userId: string, type: string, title: string, message: string, data?: any): void {
    const notification: UserNotification = {
      userId,
      type,
      title,
      message,
      data,
      timestamp: new Date(),
      read: false
    };

    this.addUserNotification(notification);
    this.broadcastToUser(userId, 'notification:new', notification);
  }

  /**
   * Get user notifications
   */
  getUserNotifications(userId: string, limit: number = 20): UserNotification[] {
    const notifications = this.userNotifications.get(userId) || [];
    return notifications.slice(0, limit);
  }

  /**
   * Get service status
   */
  getStatus(): { initialized: boolean; config: NotificationConfig; activeUsers: number } {
    return {
      initialized: this.isInitialized,
      config: this.notificationConfig,
      activeUsers: this.userNotifications.size
    };
  }

  /**
   * Update notification configuration
   */
  updateConfig(config: Partial<NotificationConfig>): void {
    this.notificationConfig = { ...this.notificationConfig, ...config };
    logger.info('Notification configuration updated:', this.notificationConfig);
  }
}

// Export singleton instance
export const realtimeNotificationService = RealtimeNotificationService.getInstance();

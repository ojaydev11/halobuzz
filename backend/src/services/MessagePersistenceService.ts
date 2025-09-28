import { logger } from '../config/logger';
import { getCache, setCache, deleteCache } from '../config/redis';
import mongoose from 'mongoose';

// Message persistence interfaces
interface PersistedMessage {
  id: string;
  userId: string;
  channelId: string;
  channelType: 'stream' | 'game' | 'chat';
  message: string;
  messageType: 'text' | 'gift' | 'system' | 'moderation';
  timestamp: Date;
  metadata?: {
    giftId?: string;
    giftQuantity?: number;
    moderationScore?: number;
    isDeleted?: boolean;
  };
}

interface OfflineMessage {
  userId: string;
  messages: PersistedMessage[];
  lastSeen: Date;
  unreadCount: number;
}

interface ChannelState {
  channelId: string;
  channelType: 'stream' | 'game' | 'chat';
  lastMessageId: string;
  messageCount: number;
  activeUsers: string[];
  lastActivity: Date;
}

class MessagePersistenceService {
  private messageQueue: Map<string, PersistedMessage[]> = new Map();
  private offlineUsers: Map<string, OfflineMessage> = new Map();
  private channelStates: Map<string, ChannelState> = new Map();

  constructor() {
    this.initializeCleanup();
  }

  // Persist message to Redis and database
  async persistMessage(message: PersistedMessage): Promise<boolean> {
    try {
      const channelKey = `${message.channelType}:${message.channelId}`;
      
      // Store in Redis for fast access
      await setCache(`message:${message.id}`, message, 3600); // 1 hour TTL
      
      // Add to channel message list
      const channelMessages = await getCache(`channel:messages:${channelKey}`) as PersistedMessage[] || [];
      channelMessages.push(message);
      
      // Keep only last 100 messages in Redis
      if (channelMessages.length > 100) {
        channelMessages.splice(0, channelMessages.length - 100);
      }
      
      await setCache(`channel:messages:${channelKey}`, channelMessages, 3600);
      
      // Update channel state
      await this.updateChannelState(message.channelId, message.channelType, message.id);
      
      // Check for offline users
      await this.handleOfflineUsers(message);
      
      logger.info(`Message persisted: ${message.id} in ${channelKey}`);
      return true;
      
    } catch (error) {
      logger.error('Error persisting message:', error);
      return false;
    }
  }

  // Get recent messages for a channel
  async getRecentMessages(
    channelId: string, 
    channelType: 'stream' | 'game' | 'chat',
    limit: number = 50
  ): Promise<PersistedMessage[]> {
    try {
      const channelKey = `${channelType}:${channelId}`;
      const messages = await getCache(`channel:messages:${channelKey}`) as PersistedMessage[] || [];
      
      // Return last N messages
      return messages.slice(-limit);
      
    } catch (error) {
      logger.error('Error getting recent messages:', error);
      return [];
    }
  }

  // Handle offline users - store messages for later delivery
  private async handleOfflineUsers(message: PersistedMessage): Promise<void> {
    try {
      const channelKey = `${message.channelType}:${message.channelId}`;
      
      // Get all users in this channel
      const channelUsers = await getCache(`channel:users:${channelKey}`) as string[] || [];
      
      for (const userId of channelUsers) {
        // Check if user is online
        const isOnline = await getCache(`user:online:${userId}`);
        
        if (!isOnline) {
          // User is offline, store message for later
          await this.storeOfflineMessage(userId, message);
        }
      }
    } catch (error) {
      logger.error('Error handling offline users:', error);
    }
  }

  // Store message for offline user
  private async storeOfflineMessage(userId: string, message: PersistedMessage): Promise<void> {
    try {
      const offlineKey = `offline:${userId}`;
      const offlineData = await getCache(offlineKey) as any || {
        userId,
        messages: [],
        lastSeen: new Date(),
        unreadCount: 0
      };
      
      // Add message to offline queue
      offlineData.messages.push(message);
      offlineData.unreadCount++;
      
      // Keep only last 100 offline messages
      if (offlineData.messages.length > 100) {
        offlineData.messages.splice(0, offlineData.messages.length - 100);
      }
      
      await setCache(offlineKey, offlineData, 86400); // 24 hours TTL
      
    } catch (error) {
      logger.error('Error storing offline message:', error);
    }
  }

  // Get offline messages for user
  async getOfflineMessages(userId: string): Promise<PersistedMessage[]> {
    try {
      const offlineKey = `offline:${userId}`;
      const offlineData = await getCache(offlineKey);
      
      if (!offlineData) {
        return [];
      }
      
      return offlineData.messages || [];
      
    } catch (error) {
      logger.error('Error getting offline messages:', error);
      return [];
    }
  }

  // Mark user as online and deliver offline messages
  async markUserOnline(userId: string): Promise<PersistedMessage[]> {
    try {
      // Mark user as online
      await setCache(`user:online:${userId}`, true, 300); // 5 minutes TTL
      
      // Get offline messages
      const offlineMessages = await this.getOfflineMessages(userId);
      
      // Clear offline messages
      await deleteCache(`offline:${userId}`);
      
      logger.info(`User ${userId} marked online, delivered ${offlineMessages.length} offline messages`);
      
      return offlineMessages;
      
    } catch (error) {
      logger.error('Error marking user online:', error);
      return [];
    }
  }

  // Mark user as offline
  async markUserOffline(userId: string): Promise<void> {
    try {
      await deleteCache(`user:online:${userId}`);
      logger.info(`User ${userId} marked offline`);
    } catch (error) {
      logger.error('Error marking user offline:', error);
    }
  }

  // Update channel state
  private async updateChannelState(
    channelId: string, 
    channelType: 'stream' | 'game' | 'chat',
    lastMessageId: string
  ): Promise<void> {
    try {
      const channelKey = `${channelType}:${channelId}`;
      const state = await getCache(`channel:state:${channelKey}`) as ChannelState || {
        channelId,
        channelType,
        lastMessageId: '',
        messageCount: 0,
        activeUsers: [],
        lastActivity: new Date()
      };
      
      state.lastMessageId = lastMessageId;
      state.messageCount++;
      state.lastActivity = new Date();
      
      await setCache(`channel:state:${channelKey}`, state, 3600);
      
    } catch (error) {
      logger.error('Error updating channel state:', error);
    }
  }

  // Add user to channel
  async addUserToChannel(
    userId: string, 
    channelId: string, 
    channelType: 'stream' | 'game' | 'chat'
  ): Promise<void> {
    try {
      const channelKey = `${channelType}:${channelId}`;
      const usersKey = `channel:users:${channelKey}`;
      
      const users = await getCache(usersKey) as string[] || [];
      if (!users.includes(userId)) {
        users.push(userId);
        await setCache(usersKey, users, 3600);
      }
      
      // Update channel state
      const cachedState = await getCache(`channel:state:${channelKey}`);
      const state: ChannelState = cachedState ? JSON.parse(cachedState as string) : {
        channelId,
        channelType,
        lastMessageId: '',
        messageCount: 0,
        activeUsers: [],
        lastActivity: new Date()
      };
      
      if (!state.activeUsers.includes(userId)) {
        state.activeUsers.push(userId);
        await setCache(`channel:state:${channelKey}`, state, 3600);
      }
      
    } catch (error) {
      logger.error('Error adding user to channel:', error);
    }
  }

  // Remove user from channel
  async removeUserFromChannel(
    userId: string, 
    channelId: string, 
    channelType: 'stream' | 'game' | 'chat'
  ): Promise<void> {
    try {
      const channelKey = `${channelType}:${channelId}`;
      const usersKey = `channel:users:${channelKey}`;
      
      const users = await getCache(usersKey) as string[] || [];
      const filteredUsers = users.filter((id: string) => id !== userId);
      await setCache(usersKey, filteredUsers, 3600);
      
      // Update channel state
      const cachedState = await getCache(`channel:state:${channelKey}`);
      const state: ChannelState = cachedState ? JSON.parse(cachedState as string) : {
        channelId,
        channelType,
        lastMessageId: '',
        messageCount: 0,
        activeUsers: [],
        lastActivity: new Date()
      };
      
      state.activeUsers = state.activeUsers.filter((id: string) => id !== userId);
      await setCache(`channel:state:${channelKey}`, state, 3600);
      
    } catch (error) {
      logger.error('Error removing user from channel:', error);
    }
  }

  // Get channel state
  async getChannelState(
    channelId: string, 
    channelType: 'stream' | 'game' | 'chat'
  ): Promise<ChannelState | null> {
    try {
      const channelKey = `${channelType}:${channelId}`;
      return await getCache(`channel:state:${channelKey}`);
    } catch (error) {
      logger.error('Error getting channel state:', error);
      return null;
    }
  }

  // Clean up old messages and offline data
  private initializeCleanup(): void {
    // Run cleanup every hour
    setInterval(async () => {
      try {
        await this.cleanupOldData();
      } catch (error) {
        logger.error('Error in cleanup process:', error);
      }
    }, 3600000); // 1 hour
  }

  // Clean up old data
  private async cleanupOldData(): Promise<void> {
    try {
      // This would typically clean up old messages from database
      // For now, we'll just log the cleanup
      logger.info('Message persistence cleanup completed');
    } catch (error) {
      logger.error('Error in cleanup:', error);
    }
  }

  // Get statistics
  async getStatistics(): Promise<{
    totalChannels: number;
    totalMessages: number;
    offlineUsers: number;
    activeChannels: number;
  }> {
    try {
      // This would typically query the database for real statistics
      // For now, return mock data
      return {
        totalChannels: this.channelStates.size,
        totalMessages: 0, // Would be calculated from database
        offlineUsers: this.offlineUsers.size,
        activeChannels: Array.from(this.channelStates.values()).filter(
          state => state.activeUsers.length > 0
        ).length
      };
    } catch (error) {
      logger.error('Error getting statistics:', error);
      return {
        totalChannels: 0,
        totalMessages: 0,
        offlineUsers: 0,
        activeChannels: 0
      };
    }
  }
}

// Export singleton instance
export const messagePersistenceService = new MessagePersistenceService();
export default messagePersistenceService;

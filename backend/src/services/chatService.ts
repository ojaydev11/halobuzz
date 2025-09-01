import { Message } from '@/models/Message';
import { User } from '@/models/User';
import { setupLogger } from '@/config/logger';
import axios from 'axios';

const logger = setupLogger();

export class ChatService {
  // Moderate message using AI engine; returns whether to block and a score
  static async moderateMessage(message: string): Promise<{ blocked: boolean; score: number; action: 'warn' | 'ban' | 'none' }> {
    try {
      if (!process.env.AI_ENGINE_URL) {
        logger.warn('AI engine URL not configured, skipping moderation');
        return { blocked: false, score: 0, action: 'none' };
      }

      const response = await axios.post(
        `${process.env.AI_ENGINE_URL}/internal/moderation/analyze`,
        {
          text: message,
          type: 'chat'
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.AI_ENGINE_SECRET}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );

      const result = response.data || {};
      const score = typeof result.profanityScore === 'number' ? result.profanityScore : 0;
      // Thresholds: warn at >=0.6 via ai:warning, ban at >=0.9
      if (score >= 0.9) return { blocked: true, score, action: 'ban' };
      if (score >= 0.6) return { blocked: true, score, action: 'warn' };
      return { blocked: false, score, action: 'none' };
    } catch (error) {
      logger.error('Error moderating message:', error);
      // If moderation fails, allow the message (fail open)
      return { blocked: false, score: 0, action: 'none' };
    }
  }

  // Save message to database
  static async saveMessage(data: {
    streamId: string;
    userId: string;
    message: string;
    type: 'public' | 'private' | 'gift';
    timestamp: Date;
  }): Promise<any> {
    try {
      const { streamId, userId, message, type, timestamp } = data;

      const savedMessage = await Message.create({
        roomId: streamId,
        senderId: userId,
        text: message,
        type,
        timestamp
      });

      return savedMessage;
    } catch (error) {
      logger.error('Error saving message:', error);
      throw error;
    }
  }

  // Get messages for a room
  static async getMessages(roomId: string, limit: number = 50, skip: number = 0): Promise<any[]> {
    try {
      const messages = await Message.find({ roomId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('senderId', 'username avatar ogLevel')
        .lean();

      return messages.reverse(); // Return in chronological order
    } catch (error) {
      logger.error('Error getting messages:', error);
      throw error;
    }
  }

  // Delete message (for OG4/5 users)
  static async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      if (!user || user.ogLevel < 4) {
        throw new Error('Insufficient permissions');
      }

      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      // Check if user is the sender or has OG4/5 privileges
      if (message.senderId.toString() !== userId && user.ogLevel < 4) {
        throw new Error('Cannot delete other users\' messages');
      }

      message.deleted = true;
      message.ogUnsendable = true;
      await message.save();

      return true;
    } catch (error) {
      logger.error('Error deleting message:', error);
      throw error;
    }
  }

  // Get recent messages for a user
  static async getUserRecentMessages(userId: string, limit: number = 20): Promise<any[]> {
    try {
      const messages = await Message.find({
        senderId: userId,
        deleted: { $ne: true }
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('roomId', 'title')
        .lean();

      return messages;
    } catch (error) {
      logger.error('Error getting user recent messages:', error);
      throw error;
    }
  }

  // Get message statistics
  static async getMessageStats(roomId: string): Promise<any> {
    try {
      const stats = await Message.aggregate([
        { $match: { roomId: roomId } },
        {
          $group: {
            _id: null,
            totalMessages: { $sum: 1 },
            uniqueSenders: { $addToSet: '$senderId' },
            giftMessages: {
              $sum: { $cond: [{ $eq: ['$type', 'gift'] }, 1, 0] }
            }
          }
        },
        {
          $project: {
            totalMessages: 1,
            uniqueSenders: { $size: '$uniqueSenders' },
            giftMessages: 1
          }
        }
      ]);

      return stats[0] || {
        totalMessages: 0,
        uniqueSenders: 0,
        giftMessages: 0
      };
    } catch (error) {
      logger.error('Error getting message stats:', error);
      throw error;
    }
  }

  // Search messages
  static async searchMessages(roomId: string, query: string, limit: number = 20): Promise<any[]> {
    try {
      const messages = await Message.find({
        roomId,
        text: { $regex: query, $options: 'i' },
        deleted: { $ne: true }
      })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('senderId', 'username avatar')
        .lean();

      return messages;
    } catch (error) {
      logger.error('Error searching messages:', error);
      throw error;
    }
  }

  // Get chat room info
  static async getChatRoomInfo(roomId: string): Promise<any> {
    try {
      const messageStats = await this.getMessageStats(roomId);
      const recentMessages = await this.getMessages(roomId, 10);

      return {
        roomId,
        messageStats,
        recentMessages,
        activeUsers: recentMessages.length > 0 ? 
          [...new Set(recentMessages.map(m => m.senderId._id.toString()))] : []
      };
    } catch (error) {
      logger.error('Error getting chat room info:', error);
      throw error;
    }
  }
}

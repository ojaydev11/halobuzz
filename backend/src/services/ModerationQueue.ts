import { ModerationFlag } from '../models/ModerationFlag';
import { User } from '../models/User';
import { LiveStream } from '../models/LiveStream';
import { Message } from '../models/Message';
import { ReputationEvent } from '../models/ReputationEvent';
import { reputationService } from './ReputationService';
import { logger } from '../config/logger';

export class ModerationQueue {
  private actionSeverity = {
    warn: 1,
    blur: 2,
    ban: 3
  };

  async createFlag(flagData: {
    reporterId: string;
    reportedUserId?: string;
    reportedStreamId?: string;
    reportedMessageId?: string;
    type: 'user' | 'stream' | 'message' | 'content';
    reason: string;
    description: string;
    evidence?: string[];
  }) {
    try {
      const flag = new ModerationFlag({
        ...flagData,
        status: 'pending',
        priority: this.calculatePriority(flagData.reason)
      });

      await flag.save();

      // Apply reputation penalty to reported user if applicable
      if (flagData.reportedUserId) {
        await reputationService.applyReputationDelta(
          flagData.reportedUserId,
          'report_received',
          { count: 1 }
        );
      }

      logger.info(`Moderation flag created: ${flag._id} for ${flagData.type}`);
      return { success: true, flagId: flag._id };
    } catch (error) {
      logger.error('Failed to create moderation flag:', error);
      return { success: false, error: error.message };
    }
  }

  async assignModerator(flagId: string, moderatorId: string) {
    try {
      const flag = await ModerationFlag.findById(flagId);
      if (!flag) {
        return { success: false, error: 'Flag not found' };
      }

      flag.assignModerator(moderatorId);
      await flag.save();

      logger.info(`Moderator ${moderatorId} assigned to flag ${flagId}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to assign moderator:', error);
      return { success: false, error: error.message };
    }
  }

  async processFlag(flagId: string, action: 'warn' | 'blur' | 'ban' | 'delete' | 'none', details: any) {
    try {
      const flag = await ModerationFlag.findById(flagId);
      if (!flag) {
        return { success: false, error: 'Flag not found' };
      }

      // Resolve the flag
      flag.resolve(action, {
        reason: details.reason,
        duration: details.duration,
        notified: false
      });
      await flag.save();

      // Apply moderation action
      if (action !== 'none') {
        await this.applyModerationAction(flag, action, details);
      }

      logger.info(`Flag ${flagId} processed with action: ${action}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to process flag:', error);
      return { success: false, error: error.message };
    }
  }

  private async applyModerationAction(flag: any, action: string, details: any) {
    try {
      const severity = this.actionSeverity[action] || 1;

      switch (flag.type) {
        case 'user':
          await this.moderateUser(flag.reportedUserId, action, details);
          break;
        case 'stream':
          await this.moderateStream(flag.reportedStreamId, action, details);
          break;
        case 'message':
          await this.moderateMessage(flag.reportedMessageId, action, details);
          break;
        case 'content':
          await this.moderateContent(flag, action, details);
          break;
      }

      // Apply reputation penalty
      if (flag.reportedUserId) {
        await reputationService.applyReputationDelta(
          flag.reportedUserId,
          'moderation_action',
          { action, severity }
        );
      }
    } catch (error) {
      logger.error('Failed to apply moderation action:', error);
      throw error;
    }
  }

  private async moderateUser(userId: string, action: string, details: any) {
    const user = await User.findById(userId);
    if (!user) return;

    switch (action) {
      case 'warn':
        // Send warning notification
        await this.sendWarningNotification(userId, details.reason);
        break;
      case 'ban':
        const banDuration = details.duration || 24; // hours
        user.isBanned = true;
        user.banReason = details.reason;
        user.banExpiresAt = new Date(Date.now() + banDuration * 60 * 60 * 1000);
        await user.save();
        break;
    }
  }

  private async moderateStream(streamId: string, action: string, details: any) {
    const stream = await LiveStream.findById(streamId);
    if (!stream) return;

    switch (action) {
      case 'warn':
        // Send warning to stream host
        await this.sendWarningNotification(stream.hostId.toString(), details.reason);
        break;
      case 'ban':
        stream.status = 'banned';
        stream.moderationStatus = 'rejected';
        stream.moderationNotes = details.reason;
        await stream.save();
        break;
    }
  }

  private async moderateMessage(messageId: string, action: string, details: any) {
    const message = await Message.findById(messageId);
    if (!message) return;

    switch (action) {
      case 'delete':
        message.softDelete('system');
        await message.save();
        break;
      case 'warn':
        // Send warning to message sender
        await this.sendWarningNotification(message.userId.toString(), details.reason);
        break;
    }
  }

  private async moderateContent(flag: any, action: string, details: any) {
    // Handle content moderation (e.g., blur inappropriate content)
    switch (action) {
      case 'blur':
        // Apply blur effect to content
        await this.applyBlurEffect(flag, details);
        break;
      case 'delete':
        // Remove content
        await this.removeContent(flag, details);
        break;
    }
  }

  private async sendWarningNotification(userId: string, reason: string) {
    // TODO: Implement notification service
    logger.info(`Warning notification sent to user ${userId}: ${reason}`);
  }

  private async applyBlurEffect(flag: any, details: any) {
    // TODO: Implement content blurring
    logger.info(`Blur effect applied to content for flag ${flag._id}`);
  }

  private async removeContent(flag: any, details: any) {
    // TODO: Implement content removal
    logger.info(`Content removed for flag ${flag._id}`);
  }

  private calculatePriority(reason: string): 'low' | 'medium' | 'high' | 'urgent' {
    const priorityMap = {
      'violence': 'urgent',
      'harassment': 'high',
      'inappropriate': 'medium',
      'spam': 'low',
      'copyright': 'high',
      'fake_news': 'medium',
      'other': 'low'
    };
    return priorityMap[reason] || 'medium';
  }

  async getPendingFlags(limit: number = 50) {
    try {
      const flags = await ModerationFlag.findPending(limit);
      return { success: true, data: flags };
    } catch (error) {
      logger.error('Failed to get pending flags:', error);
      return { success: false, error: error.message };
    }
  }

  async getFlagStats() {
    try {
      const stats = await ModerationFlag.getStats();
      return { success: true, data: stats };
    } catch (error) {
      logger.error('Failed to get flag stats:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserFlags(userId: string) {
    try {
      const flags = await ModerationFlag.findByReportedUser(userId);
      return { success: true, data: flags };
    } catch (error) {
      logger.error('Failed to get user flags:', error);
      return { success: false, error: error.message };
    }
  }

  async getStreamFlags(streamId: string) {
    try {
      const flags = await ModerationFlag.findByStream(streamId);
      return { success: true, data: flags };
    } catch (error) {
      logger.error('Failed to get stream flags:', error);
      return { success: false, error: error.message };
    }
  }

  async autoModerateContent(content: string): Promise<{ isFlagged: boolean; reason?: string; confidence?: number }> {
    try {
      // TODO: Implement AI content moderation
      // This would integrate with OpenAI or similar service for content analysis
      
      const flaggedWords = ['spam', 'inappropriate', 'harassment'];
      const lowerContent = content.toLowerCase();
      
      for (const word of flaggedWords) {
        if (lowerContent.includes(word)) {
          return {
            isFlagged: true,
            reason: 'inappropriate',
            confidence: 0.8
          };
        }
      }

      return { isFlagged: false };
    } catch (error) {
      logger.error('Auto moderation failed:', error);
      return { isFlagged: false };
    }
  }

  async getModerationQueue(limit: number = 20) {
    try {
      const queue = await ModerationFlag.find({ status: 'pending' })
        .sort({ priority: -1, createdAt: 1 })
        .limit(limit)
        .populate('reporterId', 'username avatar')
        .populate('reportedUserId', 'username avatar')
        .populate('assignedModerator', 'username avatar');

      return { success: true, data: queue };
    } catch (error) {
      logger.error('Failed to get moderation queue:', error);
      return { success: false, error: error.message };
    }
  }
}

export const moderationQueue = new ModerationQueue();

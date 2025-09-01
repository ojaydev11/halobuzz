import { LiveStream } from '@/models/LiveStream';
import { User } from '@/models/User';
import { Gift } from '@/models/Gift';
import { Transaction } from '@/models/Transaction';
import { setupLogger } from '@/config/logger';
import { getCache, setCache } from '@/config/redis';

const logger = setupLogger();

export class LiveStreamService {
  // Add viewer to stream
  static async addViewer(streamId: string, userId: string): Promise<void> {
    try {
      const stream = await LiveStream.findById(streamId);
      if (!stream) {
        throw new Error('Stream not found');
      }

      // Add viewer to stream
      if (!stream.viewers.includes(userId)) {
        stream.viewers.push(userId);
        stream.metrics.viewers = stream.viewers.length;
        
        // Update peak viewers
        if (stream.metrics.viewers > stream.metrics.peakViewers) {
          stream.metrics.peakViewers = stream.metrics.viewers;
        }
        
        await stream.save();
        
        // Cache stream info
        await setCache(`stream:${streamId}`, stream.toJSON(), 300); // 5 minutes
      }
    } catch (error) {
      logger.error('Error adding viewer to stream:', error);
      throw error;
    }
  }

  // Remove viewer from stream
  static async removeViewer(streamId: string, userId: string): Promise<void> {
    try {
      const stream = await LiveStream.findById(streamId);
      if (!stream) {
        throw new Error('Stream not found');
      }

      // Remove viewer from stream
      const viewerIndex = stream.viewers.indexOf(userId);
      if (viewerIndex > -1) {
        stream.viewers.splice(viewerIndex, 1);
        stream.metrics.viewers = stream.viewers.length;
        await stream.save();
        
        // Update cache
        await setCache(`stream:${streamId}`, stream.toJSON(), 300);
      }
    } catch (error) {
      logger.error('Error removing viewer from stream:', error);
      throw error;
    }
  }

  // Get stream info
  static async getStreamInfo(streamId: string): Promise<any> {
    try {
      // Try cache first
      const cached = await getCache(`stream:${streamId}`);
      if (cached) {
        return cached;
      }

      const stream = await LiveStream.findById(streamId)
        .populate('hostId', 'username avatar ogLevel')
        .populate('viewers', 'username avatar');

      if (!stream) {
        throw new Error('Stream not found');
      }

      const streamInfo = {
        id: stream._id,
        title: stream.title,
        host: stream.hostId,
        viewers: stream.viewers,
        metrics: stream.metrics,
        status: stream.status,
        isAnonymous: stream.isAnonymous,
        country: stream.country,
        agoraChannel: stream.agora.channel
      };

      // Cache for 5 minutes
      await setCache(`stream:${streamId}`, streamInfo, 300);
      
      return streamInfo;
    } catch (error) {
      logger.error('Error getting stream info:', error);
      throw error;
    }
  }

  // Process gift transaction
  static async processGift(data: {
    streamId: string;
    senderId: string;
    giftId: string;
    quantity: number;
  }): Promise<{ success: boolean; giftName?: string; animation?: string; error?: string }> {
    try {
      const { streamId, senderId, giftId, quantity } = data;

      // Get gift details
      const gift = await Gift.findById(giftId);
      if (!gift || !gift.active) {
        return { success: false, error: 'Gift not available' };
      }

      // Get sender
      const sender = await User.findById(senderId);
      if (!sender) {
        return { success: false, error: 'Sender not found' };
      }

      const totalCost = gift.priceCoins * quantity;

      // Check if sender has enough coins
      if (sender.coins.balance < totalCost) {
        return { success: false, error: 'Insufficient coins' };
      }

      // Get stream and host
      const stream = await LiveStream.findById(streamId);
      if (!stream) {
        return { success: false, error: 'Stream not found' };
      }

      const host = await User.findById(stream.hostId);
      if (!host) {
        return { success: false, error: 'Host not found' };
      }

      // Deduct coins from sender
      sender.coins.balance -= totalCost;
      sender.coins.totalSpent += totalCost;
      await sender.save();

      // Add coins to host (70% of gift value)
      const hostEarnings = Math.floor(totalCost * 0.7);
      host.coins.balance += hostEarnings;
      host.coins.totalEarned += hostEarnings;
      await host.save();

      // Update stream metrics
      stream.metrics.giftsCoins += totalCost;
      await stream.save();

      // Create transaction records
      await Transaction.create([
        {
          userId: senderId,
          type: 'gift_sent',
          amountCoins: -totalCost,
          metadata: {
            streamId,
            giftId,
            quantity,
            recipientId: host._id
          }
        },
        {
          userId: host._id,
          type: 'gift_received',
          amountCoins: hostEarnings,
          metadata: {
            streamId,
            giftId,
            quantity,
            senderId
          }
        }
      ]);

      return {
        success: true,
        giftName: gift.name,
        animation: gift.animation.lottieUrl
      };
    } catch (error) {
      logger.error('Error processing gift:', error);
      return { success: false, error: 'Failed to process gift' };
    }
  }

  // Check throne access
  static async checkThroneAccess(userId: string, streamId: string): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return false;
      }

      // Check if user has OG level 4+ or active throne
      if (user.ogLevel >= 4 || user.isHaloThroneActive) {
        return true;
      }

      // Check if user has claimed throne for this stream
      const stream = await LiveStream.findById(streamId);
      if (!stream) {
        return false;
      }

      // Check if user is the throne holder for this stream
      return stream.throne?.holderUserId?.toString() === userId;
    } catch (error) {
      logger.error('Error checking throne access:', error);
      return false;
    }
  }

  // Process battle boost
  static async processBattleBoost(data: {
    streamId: string;
    userId: string;
    boostType: string;
    boostAmount: number;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { streamId, userId, boostType, boostAmount } = data;

      const stream = await LiveStream.findById(streamId);
      if (!stream) {
        return { success: false, error: 'Stream not found' };
      }

      // Update stream engagement score
      stream.rankingInputs.aiEngagementScore += boostAmount;
      await stream.save();

      return { success: true };
    } catch (error) {
      logger.error('Error processing battle boost:', error);
      return { success: false, error: 'Failed to process battle boost' };
    }
  }

  // Update stream metrics
  static async updateStreamMetrics(streamId: string, metrics: any): Promise<void> {
    try {
      const stream = await LiveStream.findById(streamId);
      if (!stream) {
        throw new Error('Stream not found');
      }

      // Update metrics
      stream.metrics = { ...stream.metrics, ...metrics };
      
      // Update ranking inputs
      stream.rankingInputs = {
        viewerCount: stream.metrics.viewers,
        giftsAmount: stream.metrics.giftsCoins,
        aiEngagementScore: stream.metrics.engagementScore || 0
      };

      await stream.save();
    } catch (error) {
      logger.error('Error updating stream metrics:', error);
      throw error;
    }
  }

  // Join game
  static async joinGame(gameId: string, userId: string): Promise<void> {
    try {
      // This would integrate with the games service
      logger.info(`User ${userId} joined game ${gameId}`);
    } catch (error) {
      logger.error('Error joining game:', error);
      throw error;
    }
  }

  // Handle user disconnect
  static async handleUserDisconnect(userId: string): Promise<void> {
    try {
      // Remove user from all active streams
      const activeStreams = await LiveStream.find({
        status: 'live',
        viewers: userId
      });

      for (const stream of activeStreams) {
        await this.removeViewer(stream._id.toString(), userId);
      }

      // Update user's last active time
      await User.findByIdAndUpdate(userId, {
        lastActiveAt: new Date()
      });
    } catch (error) {
      logger.error('Error handling user disconnect:', error);
    }
  }
}

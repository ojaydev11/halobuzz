import { ReverseGiftChallenge, IReverseGiftChallenge } from '../models/ReverseGiftChallenge';
import { User } from '../models/User';
import { LiveStream } from '../models/LiveStream';
import { Transaction } from '../models/Transaction';
import { notificationService } from './notificationService';
import { logger } from '../config/logger';
import { io } from '../config/socket';

interface CreateChallengeRequest {
  hostId: string;
  streamId: string;
  title: string;
  description: string;
  totalCoins: number;
  minViewers?: number;
  maxWinners?: number;
  entryRequirement?: {
    type: 'free' | 'gift' | 'follow' | 'og_only';
    minGiftAmount?: number;
    ogTierRequired?: number;
  };
  distribution?: {
    type: 'equal' | 'random' | 'tiered' | 'ai_based';
    tiers?: Array<{
      position: number;
      percentage: number;
      coins: number;
    }>;
  };
  aiSettings?: {
    favorEngagement?: boolean;
    favorLoyalty?: boolean;
    favorNewcomers?: boolean;
    redistributionAlgorithm?: 'fair' | 'weighted' | 'surprise';
  };
  duration?: number; // Duration in minutes
}

class ReverseGiftChallengeService {
  /**
   * Create a new Reverse Gift Challenge
   */
  async createChallenge(request: CreateChallengeRequest): Promise<IReverseGiftChallenge> {
    try {
      // Validate host exists and has enough coins
      const host = await User.findById(request.hostId);
      if (!host) {
        throw new Error('Host not found');
      }

      if (host.coins.balance < request.totalCoins) {
        throw new Error('Insufficient coins for challenge');
      }

      // Validate stream exists and is live
      const stream = await LiveStream.findById(request.streamId);
      if (!stream || stream.status !== 'live') {
        throw new Error('Stream must be live to start a challenge');
      }

      // Check if there's already an active challenge for this stream
      const existingChallenge = await ReverseGiftChallenge.findOne({
        streamId: request.streamId,
        status: { $in: ['pending', 'active'] }
      });

      if (existingChallenge) {
        throw new Error('A challenge is already active for this stream');
      }

      // Calculate scheduled end time
      const scheduledEndTime = request.duration ? 
        new Date(Date.now() + request.duration * 60 * 1000) : 
        new Date(Date.now() + 10 * 60 * 1000); // Default 10 minutes

      // Create the challenge
      const challenge = new ReverseGiftChallenge({
        hostId: request.hostId,
        streamId: request.streamId,
        title: request.title,
        description: request.description,
        totalCoins: request.totalCoins,
        minViewers: request.minViewers || 10,
        maxWinners: request.maxWinners || 10,
        entryRequirement: request.entryRequirement || { type: 'free' },
        distribution: request.distribution || { type: 'equal' },
        aiSettings: request.aiSettings || {},
        scheduledEndTime
      });

      // Deduct coins from host
      host.coins.balance -= request.totalCoins;
      await host.save();

      // Create transaction record
      await Transaction.create({
        userId: request.hostId,
        type: 'gift_sent',
        amount: request.totalCoins,
        currency: 'coins',
        status: 'completed',
        description: `Reverse Gift Challenge: ${request.title}`,
        metadata: {
          challengeId: challenge._id,
          streamId: request.streamId
        },
        fees: 0,
        netAmount: -request.totalCoins
      });

      await challenge.save();

      // Notify stream viewers
      this.broadcastChallengeStart(stream.agoraChannel, challenge);

      logger.info('Reverse Gift Challenge created', {
        challengeId: challenge._id,
        hostId: request.hostId,
        totalCoins: request.totalCoins
      });

      return challenge;
    } catch (error) {
      logger.error('Failed to create Reverse Gift Challenge', error);
      throw error;
    }
  }

  /**
   * Start a pending challenge
   */
  async startChallenge(challengeId: string, hostId: string): Promise<IReverseGiftChallenge> {
    try {
      const challenge = await ReverseGiftChallenge.findById(challengeId);
      
      if (!challenge) {
        throw new Error('Challenge not found');
      }

      if (challenge.hostId.toString() !== hostId) {
        throw new Error('Unauthorized to start this challenge');
      }

      if (challenge.status !== 'pending') {
        throw new Error('Challenge cannot be started');
      }

      // Check minimum viewers requirement
      const stream = await LiveStream.findById(challenge.streamId);
      if (!stream || stream.currentViewers < challenge.minViewers) {
        throw new Error(`Minimum ${challenge.minViewers} viewers required`);
      }

      challenge.startChallenge();
      await challenge.save();

      // Broadcast to viewers
      this.broadcastChallengeUpdate(stream.agoraChannel, challenge, 'started');

      // Schedule auto-end
      this.scheduleAutoEnd(challenge._id.toString(), challenge.scheduledEndTime!);

      logger.info('Reverse Gift Challenge started', {
        challengeId: challenge._id
      });

      return challenge;
    } catch (error) {
      logger.error('Failed to start Reverse Gift Challenge', error);
      throw error;
    }
  }

  /**
   * Join a challenge
   */
  async joinChallenge(
    challengeId: string,
    userId: string,
    giftAmount: number = 0
  ): Promise<{ success: boolean; message: string }> {
    try {
      const challenge = await ReverseGiftChallenge.findById(challengeId);
      
      if (!challenge) {
        throw new Error('Challenge not found');
      }

      if (challenge.status !== 'active') {
        throw new Error('Challenge is not active');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check entry requirements
      const canJoin = await this.checkEntryRequirements(challenge, user, giftAmount);
      if (!canJoin.eligible) {
        return { success: false, message: canJoin.reason || 'Not eligible' };
      }

      // Add participant
      const isNew = challenge.addParticipant(userId, user.username, giftAmount);
      await challenge.save();

      // Broadcast participant count update
      const stream = await LiveStream.findById(challenge.streamId);
      if (stream) {
        this.broadcastParticipantUpdate(stream.agoraChannel, challenge);
      }

      logger.info('User joined Reverse Gift Challenge', {
        challengeId: challenge._id,
        userId,
        isNewParticipant: isNew
      });

      return {
        success: true,
        message: isNew ? 'Successfully joined challenge' : 'Gift amount updated'
      };
    } catch (error: any) {
      logger.error('Failed to join Reverse Gift Challenge', error);
      throw error;
    }
  }

  /**
   * End a challenge and select winners
   */
  async endChallenge(challengeId: string, hostId?: string): Promise<IReverseGiftChallenge> {
    try {
      const challenge = await ReverseGiftChallenge.findById(challengeId);
      
      if (!challenge) {
        throw new Error('Challenge not found');
      }

      // If hostId provided, verify authorization
      if (hostId && challenge.hostId.toString() !== hostId) {
        throw new Error('Unauthorized to end this challenge');
      }

      if (challenge.status !== 'active') {
        throw new Error('Challenge is not active');
      }

      const stream = await LiveStream.findById(challenge.streamId);
      
      // Calculate analytics before selecting winners
      if (stream) {
        const initialViewers = stream.totalViewers - challenge.participants.length;
        challenge.calculateAnalytics(initialViewers, stream.currentViewers);
      }

      // Select winners
      challenge.selectWinners();
      await challenge.save();

      // Distribute coins to winners
      await this.distributeCoinsToWinners(challenge);

      // Notify winners and broadcast results
      await this.notifyWinners(challenge);
      
      if (stream) {
        this.broadcastChallengeResults(stream.agoraChannel, challenge);
      }

      logger.info('Reverse Gift Challenge ended', {
        challengeId: challenge._id,
        totalWinners: challenge.winners.length,
        totalCoinsDistributed: challenge.totalCoins
      });

      return challenge;
    } catch (error) {
      logger.error('Failed to end Reverse Gift Challenge', error);
      throw error;
    }
  }

  /**
   * Get active challenges
   */
  async getActiveChallenges(limit: number = 20): Promise<IReverseGiftChallenge[]> {
    try {
      return await ReverseGiftChallenge.findActive();
    } catch (error) {
      logger.error('Failed to get active challenges', error);
      throw error;
    }
  }

  /**
   * Get challenge by stream
   */
  async getChallengesByStream(streamId: string): Promise<IReverseGiftChallenge[]> {
    try {
      return await ReverseGiftChallenge.findByStream(streamId);
    } catch (error) {
      logger.error('Failed to get challenges by stream', error);
      throw error;
    }
  }

  /**
   * Check if user meets entry requirements
   */
  private async checkEntryRequirements(
    challenge: IReverseGiftChallenge,
    user: any,
    giftAmount: number
  ): Promise<{ eligible: boolean; reason?: string }> {
    switch (challenge.entryRequirement.type) {
      case 'free':
        return { eligible: true };
        
      case 'gift':
        if (giftAmount < (challenge.entryRequirement.minGiftAmount || 1)) {
          return {
            eligible: false,
            reason: `Minimum gift of ${challenge.entryRequirement.minGiftAmount} coins required`
          };
        }
        return { eligible: true };
        
      case 'follow':
        // Check if user follows the host
        // This would require a follow relationship check
        // For now, we'll assume it's implemented
        return { eligible: true };
        
      case 'og_only':
        if (user.ogLevel < (challenge.entryRequirement.ogTierRequired || 1)) {
          return {
            eligible: false,
            reason: `OG Tier ${challenge.entryRequirement.ogTierRequired} required`
          };
        }
        return { eligible: true };
        
      default:
        return { eligible: true };
    }
  }

  /**
   * Distribute coins to winners
   */
  private async distributeCoinsToWinners(challenge: IReverseGiftChallenge): Promise<void> {
    try {
      const distributionPromises = challenge.winners.map(async (winner) => {
        // Update user balance
        await User.findByIdAndUpdate(winner.userId, {
          $inc: {
            'coins.balance': winner.coinsWon,
            'coins.totalEarned': winner.coinsWon
          }
        });

        // Create transaction record
        await Transaction.create({
          userId: winner.userId,
          type: 'gift_received',
          amount: winner.coinsWon,
          currency: 'coins',
          status: 'completed',
          description: `Won in Reverse Gift Challenge: ${challenge.title}`,
          metadata: {
            challengeId: challenge._id,
            position: winner.position
          },
          fees: 0,
          netAmount: winner.coinsWon
        });

        // Update winner claim time
        winner.claimedAt = new Date();
      });

      await Promise.all(distributionPromises);
    } catch (error) {
      logger.error('Failed to distribute coins to winners', error);
      throw error;
    }
  }

  /**
   * Notify winners
   */
  private async notifyWinners(challenge: IReverseGiftChallenge): Promise<void> {
    try {
      const notifications = challenge.winners.map(async (winner) => {
        await notificationService.sendNotification(winner.userId.toString(), {
          title: '🎉 You Won!',
          body: `Congratulations! You won ${winner.coinsWon} coins in "${challenge.title}"`,
          data: {
            type: 'reverse_gift_winner',
            challengeId: challenge._id.toString(),
            coinsWon: winner.coinsWon,
            position: winner.position
          }
        });
      });

      await Promise.all(notifications);
    } catch (error) {
      logger.error('Failed to notify winners', error);
    }
  }

  /**
   * Broadcast challenge start
   */
  private broadcastChallengeStart(channel: string, challenge: IReverseGiftChallenge): void {
    io.to(channel).emit('reverseGiftChallengeStart', {
      challengeId: challenge._id,
      title: challenge.title,
      description: challenge.description,
      totalCoins: challenge.totalCoins,
      maxWinners: challenge.maxWinners,
      entryRequirement: challenge.entryRequirement,
      scheduledEndTime: challenge.scheduledEndTime
    });
  }

  /**
   * Broadcast challenge update
   */
  private broadcastChallengeUpdate(
    channel: string,
    challenge: IReverseGiftChallenge,
    event: string
  ): void {
    io.to(channel).emit('reverseGiftChallengeUpdate', {
      challengeId: challenge._id,
      event,
      status: challenge.status,
      participantCount: challenge.participants.length
    });
  }

  /**
   * Broadcast participant update
   */
  private broadcastParticipantUpdate(channel: string, challenge: IReverseGiftChallenge): void {
    io.to(channel).emit('reverseGiftParticipantUpdate', {
      challengeId: challenge._id,
      participantCount: challenge.participants.length,
      totalGifts: challenge.analytics.totalGiftsReceived
    });
  }

  /**
   * Broadcast challenge results
   */
  private broadcastChallengeResults(channel: string, challenge: IReverseGiftChallenge): void {
    io.to(channel).emit('reverseGiftChallengeResults', {
      challengeId: challenge._id,
      winners: challenge.winners.map(w => ({
        username: w.username,
        position: w.position,
        coinsWon: w.coinsWon
      })),
      analytics: challenge.analytics
    });
  }

  /**
   * Schedule auto-end for challenge
   */
  private scheduleAutoEnd(challengeId: string, endTime: Date): void {
    const delay = endTime.getTime() - Date.now();
    
    if (delay > 0) {
      setTimeout(async () => {
        try {
          await this.endChallenge(challengeId);
          logger.info('Challenge auto-ended', { challengeId });
        } catch (error) {
          logger.error('Failed to auto-end challenge', { challengeId, error });
        }
      }, delay);
    }
  }
}

export const reverseGiftChallengeService = new ReverseGiftChallengeService();
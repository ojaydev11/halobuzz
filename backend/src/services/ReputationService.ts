import { User } from '../models/User';
import { ReputationEvent } from '../models/ReputationEvent';
import { setupLogger } from '../config/logger';

const logger = setupLogger();

export class ReputationService {
  async awardPoints(userId: string, action: string, metadata: any = {}) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const points = this.calculateReputationPoints(action, metadata);
      if (points === 0) {
        return { success: true, points: 0 };
      }

      // Update user reputation
      await User.findByIdAndUpdate(userId, {
        $inc: { 'karma.total': points }
      });

      // Create reputation event
      const event = new ReputationEvent({
        userId,
        action,
        points,
        metadata,
        timestamp: new Date()
      });

      await event.save();

      logger.info(`Awarded ${points} reputation points to user ${userId} for ${action}`);
      return { success: true, points };
    } catch (error) {
      logger.error('Failed to award reputation points:', error);
      return { success: false, error: error.message };
    }
  }

  private reputationRules = {
    gift_sent: {
      base: 1,
      multiplier: 0.1, // per coin spent
      max: 50
    },
    gift_received: {
      base: 2,
      multiplier: 0.05, // per coin received
      max: 100
    },
    stream_hosted: {
      base: 10,
      multiplier: 0.01, // per viewer
      max: 200
    },
    stream_watched: {
      base: 1,
      multiplier: 0.001, // per minute watched
      max: 20
    },
    og_subscription: {
      base: 50,
      multiplier: 10, // per tier level
      max: 500
    },
    throne_claimed: {
      base: 100,
      multiplier: 0.1, // per coin earned
      max: 1000
    },
    game_won: {
      base: 20,
      multiplier: 1, // per game won
      max: 200
    },
    report_received: {
      base: -10,
      multiplier: -5, // per report
      max: -100
    },
    moderation_action: {
      base: -50,
      multiplier: -10, // per action severity
      max: -500
    }
  };

  async applyReputationDelta(userId: string, type: string, metadata: any = {}) {
    try {
      const rule = this.reputationRules[type];
      if (!rule) {
        logger.warn(`No reputation rule found for type: ${type}`);
        return { success: false, error: 'Invalid reputation event type' };
      }

      // Calculate delta based on rule and metadata
      let delta = rule.base;
      
      switch (type) {
        case 'gift_sent':
          delta += (metadata.coins || 0) * rule.multiplier;
          break;
        case 'gift_received':
          delta += (metadata.coins || 0) * rule.multiplier;
          break;
        case 'stream_hosted':
          delta += (metadata.viewers || 0) * rule.multiplier;
          break;
        case 'stream_watched':
          delta += (metadata.duration || 0) * rule.multiplier;
          break;
        case 'og_subscription':
          delta += (metadata.tier || 0) * rule.multiplier;
          break;
        case 'throne_claimed':
          delta += (metadata.coins || 0) * rule.multiplier;
          break;
        case 'game_won':
          delta += (metadata.count || 1) * rule.multiplier;
          break;
        case 'report_received':
          delta += (metadata.count || 1) * rule.multiplier;
          break;
        case 'moderation_action':
          delta += (metadata.severity || 1) * rule.multiplier;
          break;
      }

      // Apply limits
      delta = Math.max(rule.max, Math.min(-rule.max, delta));

      // Create reputation event
      const event = new ReputationEvent({
        userId,
        type,
        delta,
        description: this.generateDescription(type, metadata),
        metadata
      });
      await event.save();

      // Update user's trust score
      await this.updateUserTrustScore(userId);

      logger.info(`Reputation delta applied: ${delta} for user ${userId}, type: ${type}`);
      return { success: true, delta };
    } catch (error) {
      logger.error('Failed to apply reputation delta:', error);
      return { success: false, error: error.message };
    }
  }

  private generateDescription(type: string, metadata: any): string {
    switch (type) {
      case 'gift_sent':
        return `Sent ${metadata.coins || 0} coins worth of gifts`;
      case 'gift_received':
        return `Received ${metadata.coins || 0} coins worth of gifts`;
      case 'stream_hosted':
        return `Hosted a stream with ${metadata.viewers || 0} viewers`;
      case 'stream_watched':
        return `Watched streams for ${metadata.duration || 0} minutes`;
      case 'og_subscription':
        return `Subscribed to OG Tier ${metadata.tier || 0}`;
      case 'throne_claimed':
        return `Claimed throne with ${metadata.coins || 0} coins`;
      case 'game_won':
        return `Won ${metadata.count || 1} games`;
      case 'report_received':
        return `Received ${metadata.count || 1} reports`;
      case 'moderation_action':
        return `Moderation action: ${metadata.action || 'unknown'}`;
      default:
        return `Reputation event: ${type}`;
    }
  }

  async updateUserTrustScore(userId: string) {
    try {
      // Get total reputation
      const reputationResult = await ReputationEvent.aggregate([
        { $match: { userId } },
        { $group: { _id: null, totalReputation: { $sum: '$points' } } }
      ]);
      const totalReputation = reputationResult[0]?.totalReputation || 0;

      // Get user's reputation events summary
      const summary = await ReputationEvent.aggregate([
        { $match: { userId } },
        { $group: { _id: '$type', count: { $sum: 1 }, totalPoints: { $sum: '$points' } } }
      ]);
      
      // Calculate trust factors
      const factors = await this.calculateTrustFactors(userId, summary);

      // Calculate trust score (0-100)
      let trustScore = Math.max(0, Math.min(100, totalReputation / 10));

      // Apply trust level
      let trustLevel = 'low';
      if (trustScore >= 80) trustLevel = 'verified';
      else if (trustScore >= 60) trustLevel = 'high';
      else if (trustScore >= 30) trustLevel = 'medium';

      // Update user
      await User.findByIdAndUpdate(userId, {
        'trust.score': trustScore,
        'trust.level': trustLevel,
        'trust.factors': factors
      });

      logger.info(`Trust score updated for user ${userId}: ${trustScore} (${trustLevel})`);
      return { success: true, trustScore, trustLevel };
    } catch (error) {
      logger.error('Failed to update trust score:', error);
      return { success: false, error: error.message };
    }
  }

  private async calculateTrustFactors(userId: string, summary: any[]) {
    const user = await User.findById(userId);
    if (!user) return {};

    const factors = {
      kycVerified: user.kycStatus === 'verified',
      phoneVerified: !!user.phone,
      emailVerified: !!user.email,
      socialConnected: !!(user.socialLogin?.google || user.socialLogin?.facebook || user.socialLogin?.apple),
      activeDays: Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      totalStreams: user.trust?.factors?.totalStreams || 0,
      totalGifts: user.trust?.factors?.totalGifts || 0,
      reportCount: 0
    };

    // Get report count from summary
    const reportEvent = summary.find(s => s._id === 'report_received');
    if (reportEvent) {
      factors.reportCount = reportEvent.count;
    }

    return factors;
  }

  async getUserReputation(userId: string) {
    try {
      const [totalReputation, summary, recentEvents] = await Promise.all([
        ReputationEvent.aggregate([
          { $match: { userId } },
          { $group: { _id: null, totalReputation: { $sum: '$points' } } }
        ]),
        ReputationEvent.aggregate([
          { $match: { userId } },
          { $group: { _id: '$type', count: { $sum: 1 }, totalPoints: { $sum: '$points' } } }
        ]),
        ReputationEvent.find({ userId }).sort({ createdAt: -1 }).limit(10)
      ]);

      const user = await User.findById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      return {
        success: true,
        data: {
          totalReputation: totalReputation[0]?.totalReputation || 0,
          trustScore: user.trust?.score || 0,
          trustLevel: user.trust?.level || 'low',
          summary,
          recentEvents
        }
      };
    } catch (error) {
      logger.error('Failed to get user reputation:', error);
      return { success: false, error: error.message };
    }
  }

  async getReputationLeaderboard(limit: number = 50) {
    try {
      const users = await User.find({ 'trust.score': { $gt: 0 } })
        .sort({ 'trust.score': -1 })
        .limit(limit)
        .select('username avatar trust.score trust.level followers');

      return {
        success: true,
        data: users
      };
    } catch (error) {
      logger.error('Failed to get reputation leaderboard:', error);
      return { success: false, error: error.message };
    }
  }

  async getReputationStats() {
    try {
      const stats = await ReputationEvent.aggregate([
        {
          $group: {
            _id: '$type',
            totalDelta: { $sum: '$delta' },
            count: { $sum: 1 },
            avgDelta: { $avg: '$delta' }
          }
        }
      ]);

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      logger.error('Failed to get reputation stats:', error);
      return { success: false, error: error.message };
    }
  }

  async resetUserReputation(userId: string) {
    try {
      // Delete all reputation events
      await ReputationEvent.deleteMany({ userId });

      // Reset user trust score
      await User.findByIdAndUpdate(userId, {
        'trust.score': 0,
        'trust.level': 'low',
        'trust.factors': {
          kycVerified: false,
          phoneVerified: false,
          emailVerified: false,
          socialConnected: false,
          activeDays: 0,
          totalStreams: 0,
          totalGifts: 0,
          reportCount: 0
        }
      });

      logger.info(`Reputation reset for user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to reset user reputation:', error);
      return { success: false, error: error.message };
    }
  }
}

export const reputationService = new ReputationService();

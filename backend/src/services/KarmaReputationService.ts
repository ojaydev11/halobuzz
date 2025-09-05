import { User } from '../models/User';
import { ReputationEvent } from '../models/ReputationEvent';
import { CommunityLoveService } from './community/CommunityLoveService';
import { ReputationService } from './ReputationService';
import { setupLogger } from '../config/logger';

const logger = setupLogger();

export interface KarmaReputationAction {
  userId: string;
  type: string;
  metadata?: any;
  impact?: number;
  verifiedBy?: string;
  culturalContext?: {
    festivalName?: string;
    festivalNameNepali?: string;
    culturalSignificance?: string;
  };
}

export interface UnifiedScore {
  reputation: {
    total: number;
    trustScore: number;
    trustLevel: string;
  };
  karma: {
    total: number;
    categories: {
      helpfulness: number;
      mentorship: number;
      creativity: number;
      positivity: number;
      cultural_respect: number;
      community_service: number;
    };
    level: string;
    levelName: string;
    milestones: string[];
  };
  combined: {
    score: number;
    level: string;
    rank: number;
  };
}

export class KarmaReputationService {
  private reputationService: ReputationService;
  private communityLoveService: typeof CommunityLoveService;

  constructor() {
    this.reputationService = new ReputationService();
    this.communityLoveService = CommunityLoveService;
  }

  /**
   * Record a unified karma and reputation action
   */
  async recordAction(action: KarmaReputationAction): Promise<{
    success: boolean;
    reputationDelta?: number;
    karmaDelta?: number;
    message: string;
    error?: string;
  }> {
    try {
      const { userId, type, metadata = {}, impact = 1, verifiedBy, culturalContext } = action;

      // Determine if this is a karma action, reputation action, or both
      const isKarmaAction = this.isKarmaActionType(type);
      const isReputationAction = this.isReputationActionType(type);

      let reputationDelta = 0;
      let karmaDelta = 0;
      let message = '';

      // Handle reputation action
      if (isReputationAction) {
        const reputationResult = await this.reputationService.applyReputationDelta(userId, type, metadata);
        if (reputationResult.success) {
          reputationDelta = reputationResult.delta;
          message += `Reputation: ${reputationDelta > 0 ? '+' : ''}${reputationDelta}. `;
        }
      }

      // Handle karma action
      if (isKarmaAction) {
        const karmaResult = await this.communityLoveService.recordCommunityAction({
          userId,
          type: type as 'help_neighbor' | 'teach_skill' | 'mentor_user' | 'donate_time' | 'support_cause' | 'create_positive_content',
          description: this.generateActionDescription(type, metadata, culturalContext),
          impact,
          verificationRequired: false
        });

        if (karmaResult.success) {
          karmaDelta = karmaResult.karmaAwarded || 0;
          message += `Karma: +${karmaDelta}. `;
        }
      }

      // Create unified reputation event if both systems are involved
      if (isKarmaAction || isReputationAction) {
        await this.createUnifiedEvent(userId, type, reputationDelta, karmaDelta, metadata, culturalContext);
      }

      // Update user's combined score
      await this.updateUserCombinedScore(userId);

      const finalMessage = message.trim() || 'Action recorded successfully';
      logger.info(`Unified action recorded for user ${userId}: ${finalMessage}`);

      return {
        success: true,
        reputationDelta,
        karmaDelta,
        message: finalMessage
      };

    } catch (error) {
      logger.error('Failed to record unified action:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to record action'
      };
    }
  }

  /**
   * Get unified karma and reputation score for a user
   */
  async getUserUnifiedScore(userId: string): Promise<{
    success: boolean;
    data?: UnifiedScore;
    error?: string;
  }> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Get reputation data
      const reputationData = await this.reputationService.getUserReputation(userId);
      if (!reputationData.success) {
        return { success: false, error: 'Failed to get reputation data' };
      }

      // Get karma data
      const karmaData = await this.communityLoveService.getKarmaScore(userId);

      // Calculate combined score
      const combinedScore = this.calculateCombinedScore(
        reputationData.data.totalReputation,
        karmaData.totalKarma
      );

      // Get user rank
      const rank = await this.getUserRank(userId);

      const unifiedScore: UnifiedScore = {
        reputation: {
          total: reputationData.data.totalReputation,
          trustScore: reputationData.data.trustScore,
          trustLevel: reputationData.data.trustLevel
        },
        karma: {
          total: karmaData.totalKarma,
          categories: karmaData.categories,
          level: karmaData.level,
          levelName: this.getKarmaLevelName(karmaData.level),
          milestones: (karmaData as any).milestones || []
        },
        combined: {
          score: combinedScore,
          level: this.getCombinedLevel(combinedScore),
          rank
        }
      };

      return { success: true, data: unifiedScore };

    } catch (error) {
      logger.error('Failed to get unified score:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get unified leaderboard combining karma and reputation
   */
  async getUnifiedLeaderboard(limit: number = 50): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    try {
      const users = await User.find({
        $or: [
          { 'karma.total': { $gt: 0 } },
          { 'trust.score': { $gt: 0 } }
        ]
      })
        .sort({ 'karma.total': -1, 'trust.score': -1 })
        .limit(limit)
        .select('username avatar karma.total karma.level karma.levelName trust.score trust.level followers');

      const leaderboard = users.map((user, index) => ({
        rank: index + 1,
        userId: user._id,
        username: user.username,
        avatar: user.avatar,
        karma: {
          total: user.karma?.total || 0,
          level: user.karma?.level || 'beginner',
          levelName: user.karma?.levelName || 'नयाँ साथी (New Friend)'
        },
        reputation: {
          trustScore: user.trust?.score || 0,
          trustLevel: user.trust?.level || 'low'
        },
        combined: {
          score: this.calculateCombinedScore(user.trust?.score || 0, user.karma?.total || 0),
          level: this.getCombinedLevel(this.calculateCombinedScore(user.trust?.score || 0, user.karma?.total || 0))
        },
        followers: user.followers || 0
      }));

      return { success: true, data: leaderboard };

    } catch (error) {
      logger.error('Failed to get unified leaderboard:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get cultural events and festival participation
   */
  async getCulturalEvents(limit: number = 20): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    try {
      const culturalEvents = await ReputationEvent.find({ type: 'cultural_celebration' }).limit(limit);
      
      return { success: true, data: culturalEvents };

    } catch (error) {
      logger.error('Failed to get cultural events:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Award festival bonus karma and reputation
   */
  async awardFestivalBonus(userId: string, festivalName: string, festivalNameNepali: string, bonusType: 'participation' | 'celebration' | 'cultural_contribution'): Promise<{
    success: boolean;
    karmaBonus?: number;
    reputationBonus?: number;
    message?: string;
    error?: string;
  }> {
    try {
      const bonusMultipliers = {
        participation: { karma: 10, reputation: 5 },
        celebration: { karma: 20, reputation: 10 },
        cultural_contribution: { karma: 30, reputation: 15 }
      };

      const bonus = bonusMultipliers[bonusType];
      if (!bonus) {
        return { success: false, error: 'Invalid bonus type' };
      }

      // Award karma
      const karmaResult = await this.communityLoveService.recordCommunityAction({
        userId,
        type: 'create_positive_content',
        description: `Festival ${bonusType}: ${festivalName}`,
        impact: bonus.karma / 5, // Convert to impact scale
        verificationRequired: false
      });

      // Award reputation
      const reputationResult = await this.reputationService.applyReputationDelta(
        userId,
        'cultural_celebration',
        {
          festivalName,
          festivalNameNepali,
          bonusType,
          culturalSignificance: 'Festival celebration and cultural participation'
        }
      );

      // Create unified event
      await this.createUnifiedEvent(
        userId,
        'cultural_celebration',
        reputationResult.delta || 0,
        karmaResult.karmaAwarded || 0,
        {
          festivalName,
          festivalNameNepali,
          bonusType,
          culturalSignificance: 'Festival celebration and cultural participation'
        },
        {
          festivalName,
          festivalNameNepali,
          culturalSignificance: 'Festival celebration and cultural participation'
        }
      );

      // Update combined score
      await this.updateUserCombinedScore(userId);

      const message = `Festival bonus awarded: ${festivalNameNepali} (${festivalName}) - Karma: +${karmaResult.karmaAwarded || 0}, Reputation: +${reputationResult.delta || 0}`;

      return {
        success: true,
        karmaBonus: karmaResult.karmaAwarded || 0,
        reputationBonus: reputationResult.delta || 0,
        message
      };

    } catch (error) {
      logger.error('Failed to award festival bonus:', error);
      return { success: false, error: error.message };
    }
  }

  // Private helper methods

  private isKarmaActionType(type: string): boolean {
    const karmaTypes = [
      'help_neighbor', 'teach_skill', 'mentor_user', 'donate_time',
      'support_cause', 'create_positive_content', 'cultural_celebration',
      'festival_participation', 'community_challenge', 'wellness_support'
    ];
    return karmaTypes.includes(type);
  }

  private isReputationActionType(type: string): boolean {
    const reputationTypes = [
      'gift_sent', 'gift_received', 'stream_hosted', 'stream_watched',
      'og_subscription', 'throne_claimed', 'game_won', 'report_received',
      'moderation_action', 'cultural_celebration'
    ];
    return reputationTypes.includes(type);
  }

  private generateActionDescription(type: string, metadata: any, culturalContext?: any): string {
    if (culturalContext?.festivalName) {
      return `${type.replace('_', ' ')} during ${culturalContext.festivalName}`;
    }
    
    switch (type) {
      case 'help_neighbor':
        return 'Helped a community member';
      case 'teach_skill':
        return 'Taught a valuable skill';
      case 'mentor_user':
        return 'Provided mentorship and guidance';
      case 'donate_time':
        return 'Donated time for community service';
      case 'support_cause':
        return 'Supported a community cause';
      case 'create_positive_content':
        return 'Created positive, inspiring content';
      case 'cultural_celebration':
        return 'Participated in cultural celebration';
      case 'festival_participation':
        return 'Actively participated in festival activities';
      case 'community_challenge':
        return 'Completed community challenge';
      case 'wellness_support':
        return 'Provided wellness and mental health support';
      default:
        return `Community action: ${type.replace('_', ' ')}`;
    }
  }

  private async createUnifiedEvent(
    userId: string,
    type: string,
    reputationDelta: number,
    karmaDelta: number,
    metadata: any,
    culturalContext?: any
  ): Promise<void> {
    const event = new ReputationEvent({
      userId,
      type,
      delta: reputationDelta,
      karmaDelta,
      karmaCategory: this.getKarmaCategory(type),
      description: this.generateActionDescription(type, metadata, culturalContext),
      descriptionNepali: culturalContext?.festivalNameNepali ? 
        `${type.replace('_', ' ')} - ${culturalContext.festivalNameNepali}` : null,
      metadata: {
        ...metadata,
        ...culturalContext,
        unifiedEvent: true
      }
    });

    await event.save();
  }

  private getKarmaCategory(type: string): string {
    const categoryMap: { [key: string]: string } = {
      'help_neighbor': 'helpfulness',
      'teach_skill': 'mentorship',
      'mentor_user': 'mentorship',
      'donate_time': 'community_service',
      'support_cause': 'community_service',
      'create_positive_content': 'creativity',
      'cultural_celebration': 'cultural_respect',
      'festival_participation': 'cultural_respect',
      'community_challenge': 'community_service',
      'wellness_support': 'positivity'
    };
    return categoryMap[type] || 'helpfulness';
  }

  private calculateCombinedScore(reputation: number, karma: number): number {
    // Weight karma more heavily as it represents community contribution
    return Math.round((reputation * 0.3) + (karma * 0.7));
  }

  private getCombinedLevel(score: number): string {
    if (score >= 1000) return 'Legendary Community Leader';
    if (score >= 500) return 'Community Elder';
    if (score >= 200) return 'Trusted Helper';
    if (score >= 50) return 'Active Member';
    return 'New Member';
  }

  private getKarmaLevelName(level: string): string {
    const levelNames: { [key: string]: string } = {
      'beginner': 'नयाँ साथी (New Friend)',
      'helper': 'सहायक (Helper)',
      'guardian': 'संरक्षक (Guardian)',
      'elder': 'ज्येष्ठ (Elder)',
      'bodhisattva': 'बोधिसत्व (Enlightened Helper)'
    };
    return levelNames[level] || 'नयाँ साथी (New Friend)';
  }

  private async getUserRank(userId: string): Promise<number> {
    const user = await User.findById(userId);
    if (!user) return 0;

    const combinedScore = this.calculateCombinedScore(
      user.trust?.score || 0,
      user.karma?.total || 0
    );

    const usersAbove = await User.countDocuments({
      $expr: {
        $gt: [
          { $add: [
            { $multiply: [{ $ifNull: ['$trust.score', 0] }, 0.3] },
            { $multiply: [{ $ifNull: ['$karma.total', 0] }, 0.7] }
          ]},
          combinedScore
        ]
      }
    });

    return usersAbove + 1;
  }

  private async updateUserCombinedScore(userId: string): Promise<void> {
    const unifiedScore = await this.getUserUnifiedScore(userId);
    if (unifiedScore.success && unifiedScore.data) {
      // Update user with latest karma level name
      await User.findByIdAndUpdate(userId, {
        'karma.levelName': unifiedScore.data.karma.levelName
      });
    }
  }
}

export const karmaReputationService = new KarmaReputationService();

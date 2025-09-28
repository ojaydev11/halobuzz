import { User } from '@/models/User';
import { LiveStream } from '@/models/LiveStream';
import { Transaction } from '@/models/Transaction';
import { logger } from '@/config/logger';
import { getCache, setCache } from '@/config/redis';
import crypto from 'crypto';

/**
 * Viral Growth Service
 * Implements advanced viral mechanics to boost user acquisition and engagement
 */

export interface ReferralProgram {
  referrerReward: number;
  refereeReward: number;
  bonusMultiplier: number;
  maxReferrals: number;
  expirationDays: number;
}

export interface ViralCampaign {
  id: string;
  name: string;
  type: 'referral' | 'challenge' | 'contest' | 'trending' | 'collaboration';
  startDate: Date;
  endDate: Date;
  reward: {
    coins: number;
    experience: number;
    specialBadges: string[];
    exclusiveAccess: string[];
  };
  requirements: {
    minParticipants: number;
    maxParticipants?: number;
    eligibilityCriteria: any;
  };
  viralMultiplier: number;
  isActive: boolean;
}

export interface SocialProof {
  totalUsers: number;
  activeStreamers: number;
  totalGiftsSent: number;
  totalHoursStreamed: number;
  trendingHashtags: string[];
  topCountries: Array<{ country: string; users: number }>;
  successStories: Array<{
    userId: string;
    achievement: string;
    earnings: number;
    followers: number;
  }>;
}

export class ViralGrowthService {
  private referralProgram: ReferralProgram = {
    referrerReward: 100, // coins
    refereeReward: 50,   // coins
    bonusMultiplier: 1.5,
    maxReferrals: 10,
    expirationDays: 30
  };

  private viralCampaigns: Map<string, ViralCampaign> = new Map();

  constructor() {
    this.initializeViralCampaigns();
  }

  /**
   * Generate unique referral code for user
   */
  async generateReferralCode(userId: string): Promise<string> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate unique code based on user ID and timestamp
      const timestamp = Date.now().toString(36);
      const hash = crypto.createHash('md5').update(userId + timestamp).digest('hex');
      const referralCode = `HB${hash.substring(0, 8).toUpperCase()}`;

      // Store referral code
      await setCache(`referral:${referralCode}`, {
        userId,
        createdAt: new Date(),
        uses: 0,
        maxUses: this.referralProgram.maxReferrals
      }, this.referralProgram.expirationDays * 24 * 60 * 60);

      // Update user with referral code
      await User.findByIdAndUpdate(userId, {
        referralCode,
        referralStats: {
          totalReferrals: 0,
          successfulReferrals: 0,
          totalEarnings: 0,
          lastReferralAt: null
        }
      });

      logger.info(`Generated referral code ${referralCode} for user ${userId}`);
      return referralCode;
    } catch (error) {
      logger.error('Failed to generate referral code:', error);
      throw error;
    }
  }

  /**
   * Process referral signup
   */
  async processReferralSignup(referralCode: string, newUserId: string): Promise<{
    success: boolean;
    referrerReward: number;
    refereeReward: number;
    referrerId?: string;
  }> {
    try {
      const referralData = await getCache(`referral:${referralCode}`) as any;
      if (!referralData) {
        return { success: false, referrerReward: 0, refereeReward: 0 };
      }

      const referrerId = referralData.userId;

      // Check if referral limit reached
      if (referralData.uses >= referralData.maxUses) {
        return { success: false, referrerReward: 0, refereeReward: 0 };
      }

      // Check if user already used this referral code
      const existingReferral = await getCache(`referral_used:${newUserId}`);
      if (existingReferral) {
        return { success: false, referrerReward: 0, refereeReward: 0 };
      }

      // Award rewards
      const referrerReward = this.referralProgram.referrerReward;
      const refereeReward = this.referralProgram.refereeReward;

      // Update referrer
      await User.findByIdAndUpdate(referrerId, {
        $inc: {
          'coins.balance': referrerReward,
          'coins.totalEarned': referrerReward,
          'referralStats.totalReferrals': 1,
          'referralStats.successfulReferrals': 1,
          'referralStats.totalEarnings': referrerReward
        },
        $set: {
          'referralStats.lastReferralAt': new Date()
        }
      });

      // Update referee
      await User.findByIdAndUpdate(newUserId, {
        $inc: {
          'coins.balance': refereeReward,
          'coins.totalEarned': refereeReward
        },
        $set: {
          referredBy: referrerId,
          referralCode: referralCode
        }
      });

      // Update referral usage
      await setCache(`referral:${referralCode}`, {
        ...referralData,
        uses: (referralData as any).uses + 1
      }, this.referralProgram.expirationDays * 24 * 60 * 60);

      // Mark referral as used
      await setCache(`referral_used:${newUserId}`, {
        referralCode,
        referrerId,
        usedAt: new Date()
      }, 365 * 24 * 60 * 60); // 1 year

      // Create transaction records
      await this.createReferralTransactions(referrerId, newUserId, referrerReward, refereeReward);

      logger.info(`Referral processed: ${referralCode} -> ${newUserId}, rewards: ${referrerReward}/${refereeReward}`);
      
      return {
        success: true,
        referrerReward,
        refereeReward,
        referrerId
      };
    } catch (error) {
      logger.error('Failed to process referral signup:', error);
      throw error;
    }
  }

  /**
   * Create viral challenge
   */
  async createViralChallenge(challenge: Omit<ViralCampaign, 'id'>): Promise<string> {
    try {
      const challengeId = crypto.randomUUID();
      const viralChallenge: ViralCampaign = {
        id: challengeId,
        ...challenge,
        viralMultiplier: challenge.viralMultiplier || 2.0
      };

      this.viralCampaigns.set(challengeId, viralChallenge);

      // Store in Redis for quick access
      await setCache(`viral_campaign:${challengeId}`, viralChallenge, 
        Math.ceil((challenge.endDate.getTime() - Date.now()) / 1000));

      logger.info(`Created viral challenge: ${challengeId}`);
      return challengeId;
    } catch (error) {
      logger.error('Failed to create viral challenge:', error);
      throw error;
    }
  }

  /**
   * Join viral challenge
   */
  async joinViralChallenge(challengeId: string, userId: string): Promise<{
    success: boolean;
    reward?: any;
    message?: string;
  }> {
    try {
      const campaign = this.viralCampaigns.get(challengeId);
      if (!campaign || !campaign.isActive) {
        return { success: false, message: 'Challenge not available' };
      }

      // Check eligibility
      const isEligible = await this.checkChallengeEligibility(campaign, userId);
      if (!isEligible) {
        return { success: false, message: 'Not eligible for this challenge' };
      }

      // Add user to challenge participants
      const participants = (await getCache(`challenge_participants:${challengeId}`) as any[]) || [];
      if (participants.includes(userId)) {
        return { success: false, message: 'Already participating' };
      }

      participants.push(userId);
      await setCache(`challenge_participants:${challengeId}`, participants,
        Math.ceil((campaign.endDate.getTime() - Date.now()) / 1000));

      // Award initial reward
      await this.awardChallengeReward(userId, campaign.reward);

      logger.info(`User ${userId} joined viral challenge ${challengeId}`);
      return { success: true, reward: campaign.reward };
    } catch (error) {
      logger.error('Failed to join viral challenge:', error);
      throw error;
    }
  }

  /**
   * Calculate viral score for content
   */
  async calculateViralScore(contentId: string, contentType: 'stream' | 'reel' | 'game'): Promise<{
    viralScore: number;
    factors: {
      engagementRate: number;
      shareRate: number;
      completionRate: number;
      socialProof: number;
      timing: number;
      creatorReputation: number;
    };
    recommendations: string[];
  }> {
    try {
      let content;
      if (contentType === 'stream') {
        content = await LiveStream.findById(contentId);
      }
      // Add other content types as needed

      if (!content) {
        throw new Error('Content not found');
      }

      const factors = {
        engagementRate: await this.calculateEngagementRate(contentId),
        shareRate: await this.calculateShareRate(contentId),
        completionRate: await this.calculateCompletionRate(contentId),
        socialProof: await this.calculateSocialProof(contentId),
        timing: await this.calculateTimingScore(content),
        creatorReputation: await this.calculateCreatorReputation(content.hostId)
      };

      const viralScore = (
        factors.engagementRate * 0.3 +
        factors.shareRate * 0.25 +
        factors.completionRate * 0.2 +
        factors.socialProof * 0.15 +
        factors.timing * 0.05 +
        factors.creatorReputation * 0.05
      ) * 100;

      const recommendations = this.generateViralRecommendations(factors, viralScore);

      return {
        viralScore: Math.round(viralScore * 100) / 100,
        factors,
        recommendations
      };
    } catch (error) {
      logger.error('Failed to calculate viral score:', error);
      throw error;
    }
  }

  /**
   * Boost content visibility based on viral potential
   */
  async boostContentVisibility(contentId: string, boostType: 'trending' | 'featured' | 'viral'): Promise<{
    success: boolean;
    boostMultiplier: number;
    duration: number;
  }> {
    try {
      const viralScore = await this.calculateViralScore(contentId, 'stream');
      
      let boostMultiplier = 1.0;
      let duration = 3600; // 1 hour default

      switch (boostType) {
        case 'trending':
          boostMultiplier = viralScore.viralScore > 70 ? 2.0 : 1.5;
          duration = 7200; // 2 hours
          break;
        case 'featured':
          boostMultiplier = viralScore.viralScore > 80 ? 3.0 : 2.0;
          duration = 14400; // 4 hours
          break;
        case 'viral':
          boostMultiplier = viralScore.viralScore > 90 ? 5.0 : 3.0;
          duration = 28800; // 8 hours
          break;
      }

      // Store boost data
      await setCache(`content_boost:${contentId}`, {
        boostType,
        boostMultiplier,
        startTime: new Date(),
        endTime: new Date(Date.now() + duration * 1000),
        viralScore: viralScore.viralScore
      }, duration);

      logger.info(`Boosted content ${contentId} with ${boostType} (${boostMultiplier}x for ${duration}s)`);
      
      return {
        success: true,
        boostMultiplier,
        duration
      };
    } catch (error) {
      logger.error('Failed to boost content visibility:', error);
      throw error;
    }
  }

  /**
   * Generate social proof data
   */
  async generateSocialProof(): Promise<SocialProof> {
    try {
      const totalUsers = await User.countDocuments();
      const activeStreamers = await User.countDocuments({ 'trust.level': { $in: ['high', 'verified'] } });
      
      // Get aggregated stats
      const stats = await User.aggregate([
        {
          $group: {
            _id: null,
            totalGiftsSent: { $sum: '$totalCoinsSpent' },
            totalHoursStreamed: { $sum: '$totalStreams' }
          }
        }
      ]);

      const trendingHashtags = await this.getTrendingHashtags();
      const topCountries = await this.getTopCountries();
      const successStories = await this.getSuccessStories();

      return {
        totalUsers,
        activeStreamers,
        totalGiftsSent: stats[0]?.totalGiftsSent || 0,
        totalHoursStreamed: stats[0]?.totalHoursStreamed || 0,
        trendingHashtags,
        topCountries,
        successStories
      };
    } catch (error) {
      logger.error('Failed to generate social proof:', error);
      throw error;
    }
  }

  /**
   * Create collaboration opportunities
   */
  async createCollaborationOpportunity(creatorId: string, targetAudience: any): Promise<{
    success: boolean;
    opportunities: Array<{
      collaboratorId: string;
      matchScore: number;
      potentialReach: number;
      suggestedReward: number;
    }>;
  }> {
    try {
      const creator = await User.findById(creatorId);
      if (!creator) {
        throw new Error('Creator not found');
      }

      // Find potential collaborators based on audience overlap
      const collaborators = await User.find({
        _id: { $ne: creatorId },
        'trust.level': { $in: ['high', 'verified'] },
        followers: { $gte: creator.followers * 0.5, $lte: creator.followers * 2 }
      }).limit(10);

      const opportunities = await Promise.all(
        collaborators.map(async (collaborator) => {
          const matchScore = await this.calculateCollaborationMatch(creator, collaborator);
          const potentialReach = Math.min(creator.followers, collaborator.followers) * 0.8;
          const suggestedReward = Math.floor(potentialReach * 0.1);

          return {
            collaboratorId: collaborator._id.toString(),
            matchScore,
            potentialReach,
            suggestedReward
          };
        })
      );

      return {
        success: true,
        opportunities: opportunities.filter(opp => opp.matchScore > 0.6)
      };
    } catch (error) {
      logger.error('Failed to create collaboration opportunities:', error);
      throw error;
    }
  }

  // Private helper methods
  private async initializeViralCampaigns(): Promise<void> {
    const campaigns: ViralCampaign[] = [
      {
        id: 'new-user-bonus',
        name: 'New User Welcome Bonus',
        type: 'referral',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        reward: {
          coins: 100,
          experience: 50,
          specialBadges: ['welcome'],
          exclusiveAccess: []
        },
        requirements: {
          minParticipants: 1,
          eligibilityCriteria: { isNewUser: true }
        },
        viralMultiplier: 1.5,
        isActive: true
      },
      {
        id: 'streaming-streak',
        name: '7-Day Streaming Streak',
        type: 'challenge',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        reward: {
          coins: 500,
          experience: 200,
          specialBadges: ['streak-master'],
          exclusiveAccess: ['premium-features']
        },
        requirements: {
          minParticipants: 10,
          eligibilityCriteria: { minStreams: 1 }
        },
        viralMultiplier: 2.0,
        isActive: true
      }
    ];

    campaigns.forEach(campaign => {
      this.viralCampaigns.set(campaign.id, campaign);
    });
  }

  private async createReferralTransactions(referrerId: string, refereeId: string, referrerReward: number, refereeReward: number): Promise<void> {
    const transactions = [
      {
        userId: referrerId,
        type: 'referral_bonus',
        amount: referrerReward,
        description: 'Referral bonus for bringing new user',
        metadata: { refereeId, type: 'referrer' }
      },
      {
        userId: refereeId,
        type: 'referral_bonus',
        amount: refereeReward,
        description: 'Welcome bonus for joining via referral',
        metadata: { referrerId, type: 'referee' }
      }
    ];

    await Transaction.insertMany(transactions);
  }

  private async checkChallengeEligibility(campaign: ViralCampaign, userId: string): Promise<boolean> {
    const user = await User.findById(userId);
    if (!user) return false;

    // Check basic eligibility criteria
    if (campaign.requirements.eligibilityCriteria.isNewUser && user.createdAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
      return true;
    }

    if (campaign.requirements.eligibilityCriteria.minStreams && (user as any).totalStreams >= campaign.requirements.eligibilityCriteria.minStreams) {
      return true;
    }

    return true; // Default to eligible
  }

  private async awardChallengeReward(userId: string, reward: any): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      $inc: {
        'coins.balance': reward.coins,
        'coins.totalEarned': reward.coins
      }
    });
  }

  private async calculateEngagementRate(contentId: string): Promise<number> {
    // Mock implementation - would calculate based on likes, comments, shares
    return Math.random() * 0.3 + 0.1; // 10-40%
  }

  private async calculateShareRate(contentId: string): Promise<number> {
    // Mock implementation - would calculate based on shares
    return Math.random() * 0.2 + 0.05; // 5-25%
  }

  private async calculateCompletionRate(contentId: string): Promise<number> {
    // Mock implementation - would calculate based on watch time
    return Math.random() * 0.4 + 0.3; // 30-70%
  }

  private async calculateSocialProof(contentId: string): Promise<number> {
    // Mock implementation - would calculate based on social signals
    return Math.random() * 0.3 + 0.2; // 20-50%
  }

  private async calculateTimingScore(content: any): Promise<number> {
    // Mock implementation - would calculate based on optimal posting times
    return Math.random() * 0.4 + 0.3; // 30-70%
  }

  private async calculateCreatorReputation(creatorId: string): Promise<number> {
    const creator = await User.findById(creatorId);
    if (!creator) return 0;
    
    return creator.trust.score / 100; // Convert to 0-1 scale
  }

  private generateViralRecommendations(factors: any, viralScore: number): string[] {
    const recommendations: string[] = [];
    
    if (factors.engagementRate < 0.2) {
      recommendations.push('Improve content quality to increase engagement');
    }
    
    if (factors.shareRate < 0.1) {
      recommendations.push('Add shareable elements to your content');
    }
    
    if (factors.timing < 0.5) {
      recommendations.push('Post during peak hours for better visibility');
    }
    
    if (viralScore > 80) {
      recommendations.push('Your content has high viral potential! Consider boosting visibility');
    }
    
    return recommendations;
  }

  private async getTrendingHashtags(): Promise<string[]> {
    // Mock implementation - would analyze trending hashtags
    return ['#halobuzz', '#livestream', '#gaming', '#nepal', '#viral'];
  }

  private async getTopCountries(): Promise<Array<{ country: string; users: number }>> {
    // Mock implementation - would analyze user distribution
    return [
      { country: 'Nepal', users: 1500 },
      { country: 'India', users: 800 },
      { country: 'USA', users: 300 },
      { country: 'UK', users: 200 }
    ];
  }

  private async getSuccessStories(): Promise<Array<{ userId: string; achievement: string; earnings: number; followers: number }>> {
    // Mock implementation - would get real success stories
    return [
      {
        userId: 'user1',
        achievement: 'Top Streamer of the Month',
        earnings: 5000,
        followers: 10000
      },
      {
        userId: 'user2',
        achievement: 'Gaming Champion',
        earnings: 3000,
        followers: 8000
      }
    ];
  }

  private async calculateCollaborationMatch(creator1: any, creator2: any): Promise<number> {
    // Mock implementation - would calculate based on audience overlap, content similarity, etc.
    return Math.random() * 0.4 + 0.6; // 60-100%
  }
}

export const viralGrowthService = new ViralGrowthService();

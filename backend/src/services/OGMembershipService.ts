import { EventEmitter } from 'events';
import { logger } from '@/config/logger';
import { coinLedger } from './CoinLedgerService';
import { CoinWallet } from '@/models/CoinWallet';
import { CoinEconomyConfig } from '@/models/CoinEconomyConfig';
import { CoinTransaction } from '@/models/CoinTransaction';

export interface OGTier {
  level: number;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  benefits: {
    bonusMultiplier: number;
    dailyCoins: number;
    giftingBonus: number;
    exclusiveFeatures: string[];
    prioritySupport: boolean;
    customBadges: boolean;
    earlyAccess: boolean;
    maxGameStakeMultiplier: number;
    withdrawalFeeDiscount: number;
    specialAnimations: boolean;
  };
  requirements?: {
    minSpending: number;
    minActivity: number;
  };
  perks: {
    throneDiscountPercent: number;
    giftAnimationUpgrades: boolean;
    customRoomThemes: boolean;
    exclusiveGifts: string[];
    vipChatColor: string;
    profileBadge: string;
    streamingPriority: boolean;
  };
}

export interface PremiumFeature {
  id: string;
  name: string;
  category: 'visual' | 'functional' | 'social' | 'gaming';
  pricing: {
    coins: number;
    duration: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'permanent';
    durationValue: number; // in milliseconds
  };
  requiredOGLevel: number;
  description: string;
  isActive: boolean;
  benefits: string[];
  limitations?: string[];
}

export interface UserMembership {
  userId: string;
  currentTier: number;
  memberSince: Date;
  nextBillingDate: Date;
  isActive: boolean;
  isAutoRenew: boolean;
  totalSpentOnOG: number;
  membershipHistory: {
    tier: number;
    startDate: Date;
    endDate?: Date;
    paymentAmount: number;
    paymentType: 'monthly' | 'yearly';
  }[];
  activePremiumFeatures: {
    featureId: string;
    activatedAt: Date;
    expiresAt?: Date;
    totalSpent: number;
  }[];
  benefits: {
    totalBonusCoinsEarned: number;
    giftingBonusUsed: number;
    prioritySupportTickets: number;
    earlyAccessFeatures: string[];
  };
  activityMetrics: {
    monthlySpending: number;
    dailyLoginStreak: number;
    lastActiveDate: Date;
    gamesPlayedThisMonth: number;
    giftsGivenThisMonth: number;
  };
}

export interface MembershipUpgradeResult {
  success: boolean;
  newTier: number;
  cost: number;
  benefits: string[];
  nextBillingDate: Date;
  transactionId: string;
}

/**
 * OG Membership Service - Manages premium membership tiers and exclusive features
 * Handles recurring subscriptions, premium feature activations, and member benefits
 */
export class OGMembershipService extends EventEmitter {
  private static instance: OGMembershipService;
  private ogTiers: Map<number, OGTier> = new Map();
  private premiumFeatures: Map<string, PremiumFeature> = new Map();
  private userMemberships: Map<string, UserMembership> = new Map();

  private constructor() {
    super();
    this.initializeOGTiers();
    this.initializePremiumFeatures();
    this.startMembershipManagement();
    this.startBenefitsCalculation();
  }

  static getInstance(): OGMembershipService {
    if (!OGMembershipService.instance) {
      OGMembershipService.instance = new OGMembershipService();
    }
    return OGMembershipService.instance;
  }

  /**
   * Initialize OG membership tiers
   */
  private async initializeOGTiers(): Promise<void> {
    try {
      const config = await CoinEconomyConfig.getCurrentConfig();

      if (config.ogTiers && config.ogTiers.length > 0) {
        config.ogTiers.forEach(tierConfig => {
          const tier: OGTier = {
            level: tierConfig.level,
            name: tierConfig.name,
            monthlyPrice: tierConfig.monthlyPrice,
            yearlyPrice: tierConfig.yearlyPrice,
            benefits: {
              bonusMultiplier: tierConfig.benefits.bonusMultiplier,
              dailyCoins: tierConfig.benefits.dailyCoins,
              giftingBonus: tierConfig.benefits.giftingBonus,
              exclusiveFeatures: tierConfig.benefits.exclusiveFeatures,
              prioritySupport: tierConfig.benefits.prioritySupport,
              customBadges: tierConfig.benefits.customBadges,
              earlyAccess: tierConfig.benefits.earlyAccess,
              maxGameStakeMultiplier: 1 + (tierConfig.level * 0.2), // 20% more per level
              withdrawalFeeDiscount: tierConfig.level * 10, // 10% discount per level
              specialAnimations: tierConfig.level >= 3
            },
            requirements: tierConfig.requirements,
            perks: {
              throneDiscountPercent: tierConfig.level * 5, // 5% discount per level
              giftAnimationUpgrades: tierConfig.level >= 2,
              customRoomThemes: tierConfig.level >= 3,
              exclusiveGifts: [`og${tierConfig.level}_gift`],
              vipChatColor: this.getTierColor(tierConfig.level),
              profileBadge: `og_${tierConfig.level}_badge`,
              streamingPriority: tierConfig.level >= 4
            }
          };
          this.ogTiers.set(tier.level, tier);
        });
      } else {
        await this.initializeDefaultOGTiers();
      }

      logger.info(`Initialized ${this.ogTiers.size} OG tiers`);
    } catch (error) {
      logger.error('Error initializing OG tiers:', error);
      await this.initializeDefaultOGTiers();
    }
  }

  /**
   * Initialize default OG tiers
   */
  private async initializeDefaultOGTiers(): Promise<void> {
    const defaultTiers: OGTier[] = [
      {
        level: 1,
        name: 'OG Bronze',
        monthlyPrice: 500, // 500 coins
        yearlyPrice: 5000, // 10 months price
        benefits: {
          bonusMultiplier: 1.1, // 10% bonus
          dailyCoins: 20,
          giftingBonus: 1.05, // 5% more gifting power
          exclusiveFeatures: ['bronze_badge', 'priority_queue'],
          prioritySupport: false,
          customBadges: true,
          earlyAccess: false,
          maxGameStakeMultiplier: 1.2,
          withdrawalFeeDiscount: 10,
          specialAnimations: false
        },
        perks: {
          throneDiscountPercent: 5,
          giftAnimationUpgrades: false,
          customRoomThemes: false,
          exclusiveGifts: ['bronze_star'],
          vipChatColor: '#CD7F32',
          profileBadge: 'og_bronze_badge',
          streamingPriority: false
        }
      },
      {
        level: 2,
        name: 'OG Silver',
        monthlyPrice: 1000,
        yearlyPrice: 10000,
        benefits: {
          bonusMultiplier: 1.2, // 20% bonus
          dailyCoins: 50,
          giftingBonus: 1.1, // 10% more gifting power
          exclusiveFeatures: ['silver_badge', 'priority_queue', 'custom_emotes'],
          prioritySupport: true,
          customBadges: true,
          earlyAccess: true,
          maxGameStakeMultiplier: 1.4,
          withdrawalFeeDiscount: 20,
          specialAnimations: false
        },
        perks: {
          throneDiscountPercent: 10,
          giftAnimationUpgrades: true,
          customRoomThemes: false,
          exclusiveGifts: ['silver_crown', 'silver_heart'],
          vipChatColor: '#C0C0C0',
          profileBadge: 'og_silver_badge',
          streamingPriority: false
        }
      },
      {
        level: 3,
        name: 'OG Gold',
        monthlyPrice: 2000,
        yearlyPrice: 20000,
        benefits: {
          bonusMultiplier: 1.35, // 35% bonus
          dailyCoins: 100,
          giftingBonus: 1.2, // 20% more gifting power
          exclusiveFeatures: ['gold_badge', 'priority_queue', 'custom_emotes', 'room_customization'],
          prioritySupport: true,
          customBadges: true,
          earlyAccess: true,
          maxGameStakeMultiplier: 1.6,
          withdrawalFeeDiscount: 30,
          specialAnimations: true
        },
        perks: {
          throneDiscountPercent: 15,
          giftAnimationUpgrades: true,
          customRoomThemes: true,
          exclusiveGifts: ['gold_trophy', 'gold_rose', 'golden_dragon'],
          vipChatColor: '#FFD700',
          profileBadge: 'og_gold_badge',
          streamingPriority: false
        }
      },
      {
        level: 4,
        name: 'OG Platinum',
        monthlyPrice: 3500,
        yearlyPrice: 35000,
        benefits: {
          bonusMultiplier: 1.5, // 50% bonus
          dailyCoins: 200,
          giftingBonus: 1.3, // 30% more gifting power
          exclusiveFeatures: ['platinum_badge', 'priority_queue', 'custom_emotes', 'room_customization', 'vip_games'],
          prioritySupport: true,
          customBadges: true,
          earlyAccess: true,
          maxGameStakeMultiplier: 1.8,
          withdrawalFeeDiscount: 40,
          specialAnimations: true
        },
        perks: {
          throneDiscountPercent: 20,
          giftAnimationUpgrades: true,
          customRoomThemes: true,
          exclusiveGifts: ['platinum_crown', 'platinum_diamond', 'platinum_phoenix'],
          vipChatColor: '#E5E4E2',
          profileBadge: 'og_platinum_badge',
          streamingPriority: true
        }
      },
      {
        level: 5,
        name: 'OG Diamond',
        monthlyPrice: 5000,
        yearlyPrice: 50000,
        benefits: {
          bonusMultiplier: 1.75, // 75% bonus
          dailyCoins: 350,
          giftingBonus: 1.5, // 50% more gifting power
          exclusiveFeatures: ['diamond_badge', 'priority_queue', 'custom_emotes', 'room_customization', 'vip_games', 'exclusive_tournaments'],
          prioritySupport: true,
          customBadges: true,
          earlyAccess: true,
          maxGameStakeMultiplier: 2.0,
          withdrawalFeeDiscount: 50,
          specialAnimations: true
        },
        requirements: {
          minSpending: 25000, // 25k coins monthly
          minActivity: 20 // 20 days active per month
        },
        perks: {
          throneDiscountPercent: 25,
          giftAnimationUpgrades: true,
          customRoomThemes: true,
          exclusiveGifts: ['diamond_galaxy', 'diamond_halo', 'ultimate_crown'],
          vipChatColor: '#B9F2FF',
          profileBadge: 'og_diamond_badge',
          streamingPriority: true
        }
      }
    ];

    defaultTiers.forEach(tier => {
      this.ogTiers.set(tier.level, tier);
    });

    logger.info(`Initialized ${defaultTiers.length} default OG tiers`);
  }

  /**
   * Initialize premium features
   */
  private initializePremiumFeatures(): void {
    const features: PremiumFeature[] = [
      {
        id: 'halo_throne',
        name: 'Halo Throne',
        category: 'social',
        pricing: {
          coins: 2000,
          duration: 'daily',
          durationValue: 24 * 60 * 60 * 1000 // 24 hours
        },
        requiredOGLevel: 0,
        description: 'Appear at the top of live streams with special throne effects',
        isActive: true,
        benefits: [
          'Top position in viewer lists',
          'Special throne animation',
          'Increased gift visibility',
          '15% host earning bonus'
        ]
      },
      {
        id: 'stealth_mode',
        name: 'Stealth Mode',
        category: 'social',
        pricing: {
          coins: 100,
          duration: 'daily',
          durationValue: 24 * 60 * 60 * 1000
        },
        requiredOGLevel: 1,
        description: 'Browse and watch streams without appearing in viewer lists',
        isActive: true,
        benefits: [
          'Invisible viewing',
          'Anonymous gifting option',
          'Private message immunity'
        ]
      },
      {
        id: 'custom_animations',
        name: 'Custom Animations',
        category: 'visual',
        pricing: {
          coins: 1500,
          duration: 'permanent',
          durationValue: 0
        },
        requiredOGLevel: 2,
        description: 'Access to exclusive custom gift animations and effects',
        isActive: true,
        benefits: [
          '20+ exclusive animations',
          'Custom gift trails',
          'Personal animation library'
        ]
      },
      {
        id: 'priority_support',
        name: 'Priority Support',
        category: 'functional',
        pricing: {
          coins: 500,
          duration: 'monthly',
          durationValue: 30 * 24 * 60 * 60 * 1000 // 30 days
        },
        requiredOGLevel: 1,
        description: '24/7 priority customer support with instant response',
        isActive: true,
        benefits: [
          'Instant support response',
          'Dedicated support agent',
          'Priority bug fixes'
        ]
      },
      {
        id: 'game_boost',
        name: 'Game Performance Boost',
        category: 'gaming',
        pricing: {
          coins: 300,
          duration: 'weekly',
          durationValue: 7 * 24 * 60 * 60 * 1000 // 7 days
        },
        requiredOGLevel: 3,
        description: 'Enhanced gaming performance with AI assistance',
        isActive: true,
        benefits: [
          '10% better AI opponent balancing',
          '5% RTP boost in eligible games',
          'Exclusive tournament access'
        ]
      },
      {
        id: 'custom_room_themes',
        name: 'Custom Room Themes',
        category: 'visual',
        pricing: {
          coins: 800,
          duration: 'monthly',
          durationValue: 30 * 24 * 60 * 60 * 1000
        },
        requiredOGLevel: 3,
        description: 'Customize your live streaming room with themes and layouts',
        isActive: true,
        benefits: [
          '50+ theme options',
          'Custom background uploads',
          'Personalized layout controls'
        ]
      },
      {
        id: 'whale_privileges',
        name: 'Whale Privileges',
        category: 'functional',
        pricing: {
          coins: 10000,
          duration: 'monthly',
          durationValue: 30 * 24 * 60 * 60 * 1000
        },
        requiredOGLevel: 5,
        description: 'Ultimate VIP experience with exclusive whale benefits',
        isActive: true,
        benefits: [
          'Personal account manager',
          'Custom game limits',
          'Exclusive whale-only events',
          'Direct line to platform executives'
        ],
        limitations: ['Limited to 50 users globally']
      }
    ];

    features.forEach(feature => {
      this.premiumFeatures.set(feature.id, feature);
    });

    logger.info(`Initialized ${features.length} premium features`);
  }

  /**
   * Upgrade user's OG membership
   */
  async upgradeMembership(
    userId: string,
    targetTier: number,
    paymentType: 'monthly' | 'yearly' = 'monthly'
  ): Promise<MembershipUpgradeResult> {
    const tier = this.ogTiers.get(targetTier);
    if (!tier) {
      throw new Error('Invalid OG tier');
    }

    // Get user's current membership
    const currentMembership = await this.getUserMembership(userId);
    if (currentMembership.currentTier >= targetTier) {
      throw new Error('Cannot downgrade or maintain same tier');
    }

    // Check requirements
    if (tier.requirements) {
      const wallet = await CoinWallet.findOne({ userId });
      if (!wallet) {
        throw new Error('User wallet not found');
      }

      if (tier.requirements.minSpending > 0) {
        // Check monthly spending requirement
        const monthlySpending = await this.calculateMonthlySpending(userId);
        if (monthlySpending < tier.requirements.minSpending) {
          throw new Error(`Minimum monthly spending of ${tier.requirements.minSpending} coins required`);
        }
      }

      if (tier.requirements.minActivity > 0) {
        // Check activity requirement
        const monthlyActivity = await this.calculateMonthlyActivity(userId);
        if (monthlyActivity < tier.requirements.minActivity) {
          throw new Error(`Minimum ${tier.requirements.minActivity} active days per month required`);
        }
      }
    }

    // Calculate cost
    const cost = paymentType === 'yearly' ? tier.yearlyPrice : tier.monthlyPrice;

    try {
      // Process payment
      const transaction = await coinLedger.processTransaction({
        userId,
        type: 'og_purchase',
        amount: cost,
        source: 'og',
        destination: 'system_fee',
        context: {
          tier: targetTier,
          tierName: tier.name,
          paymentType,
          previousTier: currentMembership.currentTier
        }
      });

      // Update user membership
      const nextBillingDate = new Date();
      if (paymentType === 'yearly') {
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
      } else {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      }

      const updatedMembership = await this.updateUserMembership(userId, {
        currentTier: targetTier,
        nextBillingDate,
        isActive: true,
        totalSpentOnOG: currentMembership.totalSpentOnOG + cost,
        membershipHistory: [
          ...currentMembership.membershipHistory,
          {
            tier: targetTier,
            startDate: new Date(),
            paymentAmount: cost,
            paymentType
          }
        ]
      });

      // Apply tier benefits immediately
      await this.applyTierBenefits(userId, targetTier);

      const result: MembershipUpgradeResult = {
        success: true,
        newTier: targetTier,
        cost,
        benefits: this.getTierBenefitsList(tier),
        nextBillingDate,
        transactionId: transaction.txId
      };

      this.emit('membershipUpgraded', {
        userId,
        previousTier: currentMembership.currentTier,
        newTier: targetTier,
        paymentType,
        cost
      });

      logger.info(`User ${userId} upgraded to OG ${tier.name} (${paymentType})`);

      return result;

    } catch (error) {
      logger.error('Error upgrading membership:', error);
      throw error;
    }
  }

  /**
   * Purchase premium feature
   */
  async purchasePremiumFeature(
    userId: string,
    featureId: string,
    duration?: number
  ): Promise<{
    success: boolean;
    feature: PremiumFeature;
    cost: number;
    expiresAt?: Date;
    transactionId: string;
  }> {
    const feature = this.premiumFeatures.get(featureId);
    if (!feature || !feature.isActive) {
      throw new Error('Premium feature not available');
    }

    // Check OG level requirement
    const membership = await this.getUserMembership(userId);
    if (membership.currentTier < feature.requiredOGLevel) {
      throw new Error(`OG Level ${feature.requiredOGLevel} required for this feature`);
    }

    // Calculate cost and duration
    let cost = feature.pricing.coins;
    let expiresAt: Date | undefined;

    if (feature.pricing.duration !== 'permanent') {
      const durationMs = duration ? duration * 1000 : feature.pricing.durationValue;
      expiresAt = new Date(Date.now() + durationMs);

      // Adjust cost for custom duration
      if (duration && feature.pricing.duration === 'hourly') {
        cost = Math.ceil(feature.pricing.coins * (duration / 3600)); // duration in seconds
      }
    }

    // Apply OG discount
    const ogTier = this.ogTiers.get(membership.currentTier);
    if (ogTier && featureId === 'halo_throne') {
      const discount = ogTier.perks.throneDiscountPercent / 100;
      cost = Math.floor(cost * (1 - discount));
    }

    try {
      // Process payment
      const transaction = await coinLedger.processTransaction({
        userId,
        type: 'premium_feature',
        amount: cost,
        source: 'premium',
        destination: 'system_fee',
        context: {
          feature: featureId,
          featureName: feature.name,
          duration,
          expiresAt
        }
      });

      // Activate feature for user
      await this.activatePremiumFeature(userId, featureId, expiresAt, cost);

      this.emit('premiumFeaturePurchased', {
        userId,
        featureId,
        cost,
        expiresAt
      });

      logger.info(`User ${userId} purchased ${feature.name} for ${cost} coins`);

      return {
        success: true,
        feature,
        cost,
        expiresAt,
        transactionId: transaction.txId
      };

    } catch (error) {
      logger.error('Error purchasing premium feature:', error);
      throw error;
    }
  }

  /**
   * Get user's current membership details
   */
  async getUserMembership(userId: string): Promise<UserMembership> {
    let membership = this.userMemberships.get(userId);

    if (!membership) {
      membership = await this.buildUserMembership(userId);
      this.userMemberships.set(userId, membership);
    }

    return membership;
  }

  /**
   * Get available premium features for user
   */
  async getAvailablePremiumFeatures(userId: string): Promise<PremiumFeature[]> {
    const membership = await this.getUserMembership(userId);

    return Array.from(this.premiumFeatures.values())
      .filter(feature =>
        feature.isActive &&
        membership.currentTier >= feature.requiredOGLevel
      )
      .sort((a, b) => a.requiredOGLevel - b.requiredOGLevel);
  }

  /**
   * Get OG tier benefits for display
   */
  getOGTiers(): OGTier[] {
    return Array.from(this.ogTiers.values()).sort((a, b) => a.level - b.level);
  }

  /**
   * Calculate daily bonus coins for user
   */
  async calculateDailyBonus(userId: string): Promise<number> {
    const membership = await this.getUserMembership(userId);

    if (!membership.isActive) {
      return 0;
    }

    const tier = this.ogTiers.get(membership.currentTier);
    return tier?.benefits.dailyCoins || 0;
  }

  /**
   * Apply gifting bonus for OG members
   */
  async applyGiftingBonus(userId: string, baseAmount: number): Promise<number> {
    const membership = await this.getUserMembership(userId);

    if (!membership.isActive) {
      return baseAmount;
    }

    const tier = this.ogTiers.get(membership.currentTier);
    if (!tier) {
      return baseAmount;
    }

    return Math.floor(baseAmount * tier.benefits.giftingBonus);
  }

  /**
   * Private helper methods
   */
  private async buildUserMembership(userId: string): Promise<UserMembership> {
    const wallet = await CoinWallet.findOne({ userId });

    const membership: UserMembership = {
      userId,
      currentTier: wallet?.ogLevel || 0,
      memberSince: new Date(), // Default to current date since createdAt is not available
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      isActive: (wallet?.ogLevel || 0) > 0,
      isAutoRenew: false,
      totalSpentOnOG: wallet?.ogCoinsSpent || 0,
      membershipHistory: [],
      activePremiumFeatures: [],
      benefits: {
        totalBonusCoinsEarned: 0,
        giftingBonusUsed: 0,
        prioritySupportTickets: 0,
        earlyAccessFeatures: []
      },
      activityMetrics: {
        monthlySpending: 0,
        dailyLoginStreak: 0,
        lastActiveDate: new Date(),
        gamesPlayedThisMonth: 0,
        giftsGivenThisMonth: 0
      }
    };

    // Load membership history from transactions
    const ogTransactions = await CoinTransaction.find({
      userId,
      type: 'og_purchase',
      status: 'completed'
    }).sort({ createdAt: -1 });

    membership.membershipHistory = ogTransactions.map(tx => ({
      tier: tx.metadata?.ogTier || 0,
      startDate: tx.createdAt,
      paymentAmount: tx.amount,
      paymentType: tx.paymentMethod || 'monthly'
    }));

    return membership;
  }

  private async updateUserMembership(userId: string, updates: Partial<UserMembership>): Promise<UserMembership> {
    const currentMembership = await this.getUserMembership(userId);
    const updatedMembership = { ...currentMembership, ...updates };

    this.userMemberships.set(userId, updatedMembership);

    return updatedMembership;
  }

  private async applyTierBenefits(userId: string, tier: number): Promise<void> {
    const wallet = await CoinWallet.findOne({ userId });
    if (!wallet) return;

    const tierData = this.ogTiers.get(tier);
    if (!tierData) return;

    // Update wallet with tier benefits
    wallet.ogLevel = tier;
    wallet.ogBonusMultiplier = tierData.benefits.bonusMultiplier;

    // Update daily limits based on tier
    wallet.dailyLimits.gaming = Math.floor(wallet.dailyLimits.gaming * tierData.benefits.maxGameStakeMultiplier);
    wallet.dailyLimits.gifting = Math.floor(wallet.dailyLimits.gifting * tierData.benefits.giftingBonus);

    await wallet.save();
  }

  private async activatePremiumFeature(userId: string, featureId: string, expiresAt: Date | undefined, cost: number): Promise<void> {
    const membership = await this.getUserMembership(userId);

    // Remove existing activation of same feature
    membership.activePremiumFeatures = membership.activePremiumFeatures.filter(
      f => f.featureId !== featureId
    );

    // Add new activation
    membership.activePremiumFeatures.push({
      featureId,
      activatedAt: new Date(),
      expiresAt,
      totalSpent: cost
    });

    this.userMemberships.set(userId, membership);

    // Update wallet with feature-specific benefits
    if (featureId === 'halo_throne' || featureId === 'stealth_mode') {
      const wallet = await CoinWallet.findOne({ userId });
      if (wallet) {
        if (featureId === 'halo_throne') {
          wallet.premiumFeatures.haloThrone.active = true;
          wallet.premiumFeatures.haloThrone.expiresAt = expiresAt;
          wallet.premiumFeatures.haloThrone.coinsSpent += cost;
        } else if (featureId === 'stealth_mode') {
          wallet.premiumFeatures.stealthMode.active = true;
          wallet.premiumFeatures.stealthMode.expiresAt = expiresAt;
          wallet.premiumFeatures.stealthMode.coinsSpent += cost;
        }
        await wallet.save();
      }
    }
  }

  private getTierColor(level: number): string {
    const colors: { [level: number]: string } = {
      1: '#CD7F32', // Bronze
      2: '#C0C0C0', // Silver
      3: '#FFD700', // Gold
      4: '#E5E4E2', // Platinum
      5: '#B9F2FF'  // Diamond
    };
    return colors[level] || '#FFFFFF';
  }

  private getTierBenefitsList(tier: OGTier): string[] {
    return [
      `${(tier.benefits.bonusMultiplier - 1) * 100}% bonus multiplier`,
      `${tier.benefits.dailyCoins} daily coins`,
      `${(tier.benefits.giftingBonus - 1) * 100}% gifting bonus`,
      `${tier.benefits.withdrawalFeeDiscount}% withdrawal fee discount`,
      ...tier.benefits.exclusiveFeatures.map(f => `Access to ${f}`),
      ...Object.entries(tier.perks)
        .filter(([_, value]) => value !== false && value !== 0)
        .map(([key, value]) => `${key.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${value}`)
    ];
  }

  private async calculateMonthlySpending(userId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const transactions = await CoinTransaction.find({
      userId,
      type: { $in: ['game_stake', 'gift_sent', 'og_purchase', 'premium_feature'] },
      status: 'completed',
      createdAt: { $gte: startOfMonth }
    });

    return transactions.reduce((total, tx) => total + tx.amount, 0);
  }

  private async calculateMonthlyActivity(userId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const transactions = await CoinTransaction.find({
      userId,
      createdAt: { $gte: startOfMonth }
    }).distinct('createdAt');

    // Count unique days with activity
    const activeDays = new Set(
      transactions.map(date => date.toDateString())
    );

    return activeDays.size;
  }

  private startMembershipManagement(): void {
    // Check membership renewals every hour
    setInterval(async () => {
      await this.processRenewals();
      await this.checkExpiringFeatures();
    }, 3600000); // 1 hour

    // Daily bonus distribution
    setInterval(async () => {
      await this.distributeDailyBonuses();
    }, 86400000); // 24 hours
  }

  private startBenefitsCalculation(): void {
    // Update member benefits every 6 hours
    setInterval(async () => {
      await this.updateMemberBenefits();
    }, 21600000); // 6 hours
  }

  private async processRenewals(): Promise<void> {
    // This would handle automatic membership renewals
    // For now, just log renewal checks
    const renewalsToProcess = Array.from(this.userMemberships.values())
      .filter(m => m.isActive && m.isAutoRenew && m.nextBillingDate <= new Date());

    if (renewalsToProcess.length > 0) {
      logger.info(`Processing ${renewalsToProcess.length} membership renewals`);
      // Implementation would process automatic renewals here
    }
  }

  private async checkExpiringFeatures(): Promise<void> {
    const now = new Date();

    for (const membership of this.userMemberships.values()) {
      const expiredFeatures = membership.activePremiumFeatures.filter(
        f => f.expiresAt && f.expiresAt <= now
      );

      if (expiredFeatures.length > 0) {
        // Remove expired features
        membership.activePremiumFeatures = membership.activePremiumFeatures.filter(
          f => !f.expiresAt || f.expiresAt > now
        );

        this.emit('premiumFeaturesExpired', {
          userId: membership.userId,
          expiredFeatures: expiredFeatures.map(f => f.featureId)
        });

        logger.info(`Expired ${expiredFeatures.length} premium features for user ${membership.userId}`);
      }
    }
  }

  private async distributeDailyBonuses(): Promise<void> {
    const activeMembers = Array.from(this.userMemberships.values())
      .filter(m => m.isActive && m.currentTier > 0);

    for (const member of activeMembers) {
      const bonusAmount = await this.calculateDailyBonus(member.userId);

      if (bonusAmount > 0) {
        try {
          await coinLedger.processTransaction({
            userId: member.userId,
            type: 'reward',
            amount: bonusAmount,
            source: 'system',
            destination: 'wallet',
            context: {
              type: 'og_daily_bonus',
              ogLevel: member.currentTier
            }
          });

          member.benefits.totalBonusCoinsEarned += bonusAmount;

          logger.debug(`Distributed ${bonusAmount} daily bonus coins to OG${member.currentTier} user ${member.userId}`);
        } catch (error) {
          logger.error(`Error distributing daily bonus to user ${member.userId}:`, error);
        }
      }
    }
  }

  private async updateMemberBenefits(): Promise<void> {
    // Update activity metrics and benefits for all members
    for (const membership of this.userMemberships.values()) {
      try {
        // Calculate monthly activity
        membership.activityMetrics.monthlySpending = await this.calculateMonthlySpending(membership.userId);

        // Update other metrics as needed
        this.userMemberships.set(membership.userId, membership);
      } catch (error) {
        logger.error(`Error updating benefits for user ${membership.userId}:`, error);
      }
    }
  }
}

export const ogMembership = OGMembershipService.getInstance();
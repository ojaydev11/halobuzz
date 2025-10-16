import { EventEmitter } from 'events';
import { logger } from '@/config/logger';
import { coinLedger } from './CoinLedgerService';
import { aiPersonalization } from './AIHyperPersonalizationEngine';
import { CoinTransaction } from '@/models/CoinTransaction';
import { CoinWallet } from '@/models/CoinWallet';

export interface DynamicGift {
  id: string;
  name: string;
  emoji: string;
  category: 'basic' | 'premium' | 'luxury' | 'legendary' | 'mythical';

  // Multi-tier pricing structure
  pricing: {
    baseCost: number;
    tierMultipliers: {
      tier1: number; // New users (0-100 total spent)
      tier2: number; // Regular users (100-1000 total spent)
      tier3: number; // VIP users (1000-10000 total spent)
      tier4: number; // Whale users (10000+ total spent)
    };
    dynamicFactors: {
      popularityMultiplier: number; // Based on recent usage
      timeMultiplier: number; // Time of day/week adjustments
      eventMultiplier: number; // Special events
      relationshipMultiplier: number; // Sender-recipient relationship strength
      moodMultiplier: number; // Recipient's current mood
    };
  };

  // Advanced effects and mechanics
  effects: {
    visual: {
      animation: string;
      duration: number;
      screenEffect?: string;
      particleCount?: number;
      colorScheme: string[];
    };
    audio: {
      sound: string;
      volume: number;
      echo?: boolean;
    };
    haptic?: {
      pattern: 'light' | 'medium' | 'heavy' | 'custom';
      duration?: number;
    };
    social: {
      broadcastLevel: 'none' | 'friends' | 'room' | 'global'; // Who sees the gift
      leaderboardPoints: number;
      statusBoost: number; // Temporary status boost for recipient
    };
  };

  // Recipient earnings structure
  earnings: {
    basePercentage: number; // Base % of gift cost that goes to recipient
    bonusFactors: {
      loyaltyBonus: number; // Bonus based on sender's loyalty to recipient
      streakBonus: number; // Bonus for consecutive gifts from same sender
      achievementBonus: number; // Bonus based on recipient's achievements
      timeBonus: number; // Prime time bonus
    };
  };

  // Gift mechanics
  mechanics: {
    stackable: boolean; // Can multiple of same gift be sent together
    combo: boolean; // Can combine with other gifts for bonuses
    chain: boolean; // Can trigger chain reactions
    rarity: number; // 0-1 (affects availability and special effects)
    cooldown?: number; // Cooldown between uses (in seconds)
    requirement?: {
      senderLevel?: number;
      recipientLevel?: number;
      relationship?: string;
      event?: string;
    };
  };

  // Limited availability
  availability: {
    isLimited: boolean;
    totalSupply?: number;
    dailyLimit?: number;
    userLimit?: number;
    expiryDate?: Date;
    regions?: string[];
  };
}

export interface GiftMultiplierEngine {
  userId: string;

  // Real-time multiplier factors
  activeMultipliers: {
    relationship: number; // 0.5x to 3x based on relationship strength
    timing: number; // 0.8x to 2x based on optimal timing
    mood: number; // 0.7x to 1.8x based on recipient mood
    streak: number; // 1x to 2.5x for consecutive gifting
    social: number; // 1x to 2x based on social proof
    event: number; // 1x to 5x during special events
    loyalty: number; // 0.9x to 2.2x based on platform loyalty
    achievement: number; // 1x to 1.5x based on recent achievements
  };

  // Dynamic pricing calculations
  personalizedPricing: {
    [giftId: string]: {
      finalPrice: number;
      multiplier: number;
      discount?: number;
      reasoning: string[];
    };
  };

  lastUpdated: Date;
}

export interface GiftCombo {
  id: string;
  name: string;
  gifts: string[]; // Gift IDs required for combo
  bonusMultiplier: number; // Extra multiplier for combo
  specialEffect: string;
  achievement?: string; // Unlocks achievement
}

export interface GiftChain {
  initiatorId: string;
  recipientId: string;
  chainGifts: Array<{
    giftId: string;
    senderId: string;
    timestamp: Date;
    multiplier: number;
  }>;
  totalValue: number;
  chainBonus: number;
  status: 'active' | 'completed' | 'expired';
  expiresAt: Date;
}

export interface LiveGiftingSession {
  streamId: string;
  hostId: string;

  // Real-time gift tracking
  activeGifts: Array<{
    id: string;
    senderId: string;
    giftId: string;
    amount: number;
    multiplier: number;
    timestamp: Date;
    effect: 'active' | 'completed';
  }>;

  // Dynamic atmosphere effects
  atmosphere: {
    energy: number; // 0-100 based on recent gifting activity
    mood: 'celebration' | 'competition' | 'romance' | 'friendship' | 'neutral';
    hypeLevel: number; // 0-10 affects gift multipliers
    socialProof: number; // Number of recent gifters affects others
  };

  // Revenue optimization
  revenueOptimization: {
    targetRevenue: number;
    currentRevenue: number;
    suggestedGifts: string[]; // AI-suggested gifts to increase revenue
    urgencyLevel: number; // 0-10 affects pricing
    competitionLevel: number; // Number of other active streams
  };

  // Gamification elements
  giftingChallenges: Array<{
    id: string;
    type: 'individual' | 'community';
    target: number;
    current: number;
    reward: string;
    expiresAt: Date;
  }>;
}

/**
 * Advanced Gift Economy Service
 * Multi-tier pricing with dynamic multipliers and addiction-level engagement mechanics
 */
export class AdvancedGiftEconomyService extends EventEmitter {
  private static instance: AdvancedGiftEconomyService;
  private dynamicGifts: Map<string, DynamicGift> = new Map();
  private giftMultipliers: Map<string, GiftMultiplierEngine> = new Map();
  private activeChains: Map<string, GiftChain> = new Map();
  private liveSessions: Map<string, LiveGiftingSession> = new Map();
  private giftCombos: Map<string, GiftCombo> = new Map();

  // Economic balance parameters
  private readonly ECONOMIC_PARAMETERS = {
    MAX_MULTIPLIER: 5.0,
    MIN_MULTIPLIER: 0.3,
    CHAIN_DECAY_RATE: 0.95,
    HYPE_BOOST_THRESHOLD: 5,
    SOCIAL_PROOF_FACTOR: 0.1,
    REVENUE_OPTIMIZATION_TARGET: 1.3 // 30% revenue increase target
  };

  private constructor() {
    super();
    this.initializeDynamicGifts();
    this.initializeGiftCombos();
    this.startEconomicEngine();
    this.startRevenueOptimization();
  }

  static getInstance(): AdvancedGiftEconomyService {
    if (!AdvancedGiftEconomyService.instance) {
      AdvancedGiftEconomyService.instance = new AdvancedGiftEconomyService();
    }
    return AdvancedGiftEconomyService.instance;
  }

  /**
   * Calculate dynamic gift price with all multipliers
   */
  async calculateDynamicGiftPrice(
    giftId: string,
    senderId: string,
    recipientId: string,
    context: {
      streamId?: string;
      timing: Date;
      quantity: number;
    }
  ): Promise<{
    finalPrice: number;
    originalPrice: number;
    totalMultiplier: number;
    breakdown: { [factor: string]: number };
    savings?: number;
    reasoning: string[];
  }> {
    const gift = this.dynamicGifts.get(giftId);
    if (!gift) {
      throw new Error('Gift not found');
    }

    // Get sender's profile for personalization
    const senderProfile = await aiPersonalization.getUserProfile(senderId);
    const recipientProfile = await aiPersonalization.getUserProfile(recipientId);

    // Start with base price
    let currentPrice = gift.pricing.baseCost;
    const breakdown: { [factor: string]: number } = {};
    const reasoning: string[] = [];

    // 1. User Tier Multiplier (based on total spending)
    const senderTier = this.getUserTier(senderProfile.spendingPsychology.spendingTier);
    const tierMultiplier = gift.pricing.tierMultipliers[senderTier];
    breakdown.tier = tierMultiplier;
    currentPrice *= tierMultiplier;

    if (tierMultiplier < 1) {
      reasoning.push(`${((1 - tierMultiplier) * 100).toFixed(0)}% discount for ${senderTier} users`);
    } else if (tierMultiplier > 1) {
      reasoning.push(`Premium pricing for ${senderTier} users`);
    }

    // 2. Relationship Multiplier
    const relationshipStrength = await this.calculateRelationshipStrength(senderId, recipientId);
    const relationshipMultiplier = this.calculateRelationshipMultiplier(relationshipStrength);
    breakdown.relationship = relationshipMultiplier;
    currentPrice *= relationshipMultiplier;

    if (relationshipMultiplier > 1.2) {
      reasoning.push(`${((relationshipMultiplier - 1) * 100).toFixed(0)}% bonus for strong relationship`);
    } else if (relationshipMultiplier < 0.9) {
      reasoning.push(`${((1 - relationshipMultiplier) * 100).toFixed(0)}% discount to encourage connection`);
    }

    // 3. Timing Multiplier (peak hours, special days)
    const timingMultiplier = this.calculateTimingMultiplier(context.timing, recipientProfile);
    breakdown.timing = timingMultiplier;
    currentPrice *= timingMultiplier;

    if (timingMultiplier > 1.1) {
      reasoning.push('Prime time bonus - perfect timing!');
    } else if (timingMultiplier < 0.9) {
      reasoning.push('Off-peak discount');
    }

    // 4. Mood & Emotional State Multiplier
    const moodMultiplier = this.calculateMoodMultiplier(recipientProfile);
    breakdown.mood = moodMultiplier;
    currentPrice *= moodMultiplier;

    if (moodMultiplier > 1.1) {
      reasoning.push('Recipient is in a great mood - higher impact!');
    }

    // 5. Social Proof & Hype Multiplier
    let socialMultiplier = 1.0;
    if (context.streamId) {
      const session = this.liveSessions.get(context.streamId);
      if (session) {
        socialMultiplier = this.calculateSocialProofMultiplier(session);
        breakdown.social = socialMultiplier;
        currentPrice *= socialMultiplier;

        if (socialMultiplier > 1.2) {
          reasoning.push('High energy stream - gifts have more impact!');
        }
      }
    }

    // 6. Streak & Loyalty Multiplier
    const streakMultiplier = await this.calculateStreakMultiplier(senderId, recipientId);
    breakdown.streak = streakMultiplier;
    currentPrice *= streakMultiplier;

    if (streakMultiplier > 1.1) {
      reasoning.push(`Loyalty bonus for ${Math.floor((streakMultiplier - 1) * 10)} consecutive gifts!`);
    }

    // 7. Popularity & Demand Multiplier
    const popularityMultiplier = await this.calculatePopularityMultiplier(giftId);
    breakdown.popularity = popularityMultiplier;
    currentPrice *= popularityMultiplier;

    if (popularityMultiplier > 1.1) {
      reasoning.push('Trending gift - high demand!');
    } else if (popularityMultiplier < 0.9) {
      reasoning.push('Special promotion on this gift');
    }

    // 8. Quantity Discount (for bulk purchases)
    let quantityMultiplier = 1.0;
    if (context.quantity > 1) {
      quantityMultiplier = this.calculateQuantityDiscount(context.quantity);
      breakdown.quantity = quantityMultiplier;
      currentPrice *= quantityMultiplier;

      if (quantityMultiplier < 1) {
        reasoning.push(`${((1 - quantityMultiplier) * 100).toFixed(0)}% bulk discount`);
      }
    }

    // Apply bounds
    const totalMultiplier = currentPrice / gift.pricing.baseCost;
    const boundedMultiplier = Math.max(
      this.ECONOMIC_PARAMETERS.MIN_MULTIPLIER,
      Math.min(this.ECONOMIC_PARAMETERS.MAX_MULTIPLIER, totalMultiplier)
    );

    const finalPrice = Math.round(gift.pricing.baseCost * boundedMultiplier);
    const savings = gift.pricing.baseCost - finalPrice;

    return {
      finalPrice,
      originalPrice: gift.pricing.baseCost,
      totalMultiplier: boundedMultiplier,
      breakdown,
      savings: savings > 0 ? savings : undefined,
      reasoning
    };
  }

  /**
   * Send advanced gift with dynamic effects
   */
  async sendAdvancedGift(
    senderId: string,
    recipientId: string,
    giftId: string,
    quantity: number = 1,
    context: {
      streamId?: string;
      message?: string;
      isCombo?: boolean;
      comboGifts?: string[];
    }
  ): Promise<{
    success: boolean;
    totalCost: number;
    recipientEarnings: number;
    effects: any[];
    multiplier: number;
    achievements?: string[];
    chainTriggered?: boolean;
  }> {
    const gift = this.dynamicGifts.get(giftId);
    if (!gift) {
      throw new Error('Gift not found');
    }

    // Calculate dynamic pricing
    const pricing = await this.calculateDynamicGiftPrice(giftId, senderId, recipientId, {
      streamId: context.streamId,
      timing: new Date(),
      quantity
    });

    const totalCost = pricing.finalPrice * quantity;

    // Check combo bonuses
    let comboBonus = 1.0;
    const comboEffects: any[] = [];
    const achievements: string[] = [];

    if (context.isCombo && context.comboGifts) {
      const combo = this.findMatchingCombo([...context.comboGifts, giftId]);
      if (combo) {
        comboBonus = combo.bonusMultiplier;
        comboEffects.push({
          type: 'combo',
          name: combo.name,
          effect: combo.specialEffect,
          bonus: comboBonus
        });

        if (combo.achievement) {
          achievements.push(combo.achievement);
        }
      }
    }

    // Calculate recipient earnings with all bonuses
    const baseEarnings = totalCost * (gift.earnings.basePercentage / 100);
    const loyaltyBonus = await this.calculateLoyaltyBonus(senderId, recipientId);
    const streakBonus = await this.calculateStreakBonus(senderId, recipientId);
    const achievementBonus = await this.calculateAchievementBonus(recipientId);

    const totalEarningsMultiplier = comboBonus *
                                  (1 + loyaltyBonus) *
                                  (1 + streakBonus) *
                                  (1 + achievementBonus);

    const recipientEarnings = Math.round(baseEarnings * totalEarningsMultiplier);

    try {
      // Process payment transaction
      await coinLedger.processTransaction({
        userId: senderId,
        targetUserId: recipientId,
        type: 'gift_sent',
        amount: totalCost,
        source: 'gift',
        destination: 'host_earnings',
        context: {
          giftId,
          giftName: gift.name,
          quantity,
          multiplier: pricing.totalMultiplier,
          comboBonus,
          streamId: context.streamId,
          message: context.message
        }
      });

      // Credit recipient
      await coinLedger.processTransaction({
        userId: recipientId,
        targetUserId: senderId,
        type: 'gift_received',
        amount: recipientEarnings,
        source: 'gift',
        destination: 'wallet',
        context: {
          giftId,
          giftName: gift.name,
          quantity,
          fromUserId: senderId,
          earningsMultiplier: totalEarningsMultiplier
        }
      });

      // Generate gift effects
      const effects = await this.generateGiftEffects(gift, quantity, pricing.totalMultiplier, comboEffects);

      // Update live session if applicable
      if (context.streamId) {
        await this.updateLiveSession(context.streamId, {
          senderId,
          recipientId,
          giftId,
          amount: totalCost,
          multiplier: pricing.totalMultiplier
        });
      }

      // Check for chain triggers
      const chainTriggered = await this.checkChainTrigger(senderId, recipientId, giftId, totalCost);

      // Update gift statistics
      await this.updateGiftStatistics(giftId, totalCost, pricing.totalMultiplier);

      this.emit('advancedGiftSent', {
        senderId,
        recipientId,
        giftId,
        quantity,
        totalCost,
        recipientEarnings,
        multiplier: pricing.totalMultiplier,
        effects,
        achievements,
        chainTriggered
      });

      return {
        success: true,
        totalCost,
        recipientEarnings,
        effects,
        multiplier: pricing.totalMultiplier,
        achievements: achievements.length > 0 ? achievements : undefined,
        chainTriggered
      };

    } catch (error) {
      logger.error('Error sending advanced gift:', error);
      throw error;
    }
  }

  /**
   * Get personalized gift recommendations with dynamic pricing
   */
  async getPersonalizedGiftRecommendations(
    senderId: string,
    recipientId: string,
    context: { streamId?: string; budget?: number }
  ): Promise<Array<{
    gift: DynamicGift;
    pricing: any;
    confidence: number;
    reason: string;
    urgency?: number;
    specialOffer?: boolean;
  }>> {
    const recommendations = [];

    // Get AI personalization insights
    const giftPredictions = await aiPersonalization.generateGiftRecommendations(senderId);
    const senderProfile = await aiPersonalization.getUserProfile(senderId);

    // Filter gifts based on budget and preferences
    const availableGifts = Array.from(this.dynamicGifts.values())
      .filter(gift => this.isGiftAvailable(gift, senderId, recipientId));

    for (const gift of availableGifts.slice(0, 10)) { // Top 10 recommendations
      const pricing = await this.calculateDynamicGiftPrice(gift.id, senderId, recipientId, {
        streamId: context.streamId,
        timing: new Date(),
        quantity: 1
      });

      // Skip if over budget
      if (context.budget && pricing.finalPrice > context.budget) {
        continue;
      }

      // Calculate confidence based on user preferences and AI predictions
      let confidence = 0.5; // Base confidence

      // Check if this gift matches AI predictions
      const matchingPrediction = giftPredictions.gifts.find(p =>
        p.giftId === gift.id || p.recipientId === recipientId
      );
      if (matchingPrediction) {
        confidence = matchingPrediction.confidence;
      }

      // Boost confidence for preferred gift categories
      const giftCategory = gift.category;
      const preferenceWeight = senderProfile.preferences.giftingBehavior[gift.id] || 0.5;
      confidence = (confidence + preferenceWeight) / 2;

      // Generate personalized reason
      const reason = this.generateGiftRecommendationReason(gift, pricing, senderProfile);

      // Check for urgency factors
      const urgency = this.calculateGiftUrgency(gift, pricing, context);

      // Check for special offers
      const specialOffer = pricing.savings && pricing.savings > gift.pricing.baseCost * 0.2;

      recommendations.push({
        gift,
        pricing,
        confidence,
        reason,
        urgency: urgency > 0 ? urgency : undefined,
        specialOffer
      });
    }

    // Sort by confidence and urgency
    recommendations.sort((a, b) => {
      const scoreA = a.confidence * 0.7 + (a.urgency || 0) * 0.3;
      const scoreB = b.confidence * 0.7 + (b.urgency || 0) * 0.3;
      return scoreB - scoreA;
    });

    return recommendations.slice(0, 8); // Top 8 recommendations
  }

  /**
   * Start live gifting session with dynamic atmosphere
   */
  async startLiveGiftingSession(
    streamId: string,
    hostId: string,
    targetRevenue?: number
  ): Promise<LiveGiftingSession> {
    const session: LiveGiftingSession = {
      streamId,
      hostId,
      activeGifts: [],
      atmosphere: {
        energy: 0,
        mood: 'neutral',
        hypeLevel: 0,
        socialProof: 0
      },
      revenueOptimization: {
        targetRevenue: targetRevenue || 5000, // Default target
        currentRevenue: 0,
        suggestedGifts: [],
        urgencyLevel: 0,
        competitionLevel: 0
      },
      giftingChallenges: []
    };

    this.liveSessions.set(streamId, session);

    // Initialize AI-driven challenges
    await this.createGiftingChallenges(session);

    this.emit('liveSessionStarted', { streamId, hostId, session });

    return session;
  }

  /**
   * Private implementation methods
   */
  private initializeDynamicGifts(): void {
    const gifts: DynamicGift[] = [
      {
        id: 'spark_heart',
        name: 'Spark Heart',
        emoji: '💖',
        category: 'basic',
        pricing: {
          baseCost: 10,
          tierMultipliers: { tier1: 0.7, tier2: 0.85, tier3: 1.0, tier4: 1.2 },
          dynamicFactors: {
            popularityMultiplier: 1.0,
            timeMultiplier: 1.0,
            eventMultiplier: 1.0,
            relationshipMultiplier: 1.0,
            moodMultiplier: 1.0
          }
        },
        effects: {
          visual: {
            animation: 'floating_hearts',
            duration: 3000,
            screenEffect: 'heart_burst',
            particleCount: 15,
            colorScheme: ['#FF69B4', '#FF1493', '#DC143C']
          },
          audio: { sound: 'heart_chime', volume: 0.7 },
          haptic: { pattern: 'light', duration: 500 },
          social: { broadcastLevel: 'room', leaderboardPoints: 5, statusBoost: 2 }
        },
        earnings: {
          basePercentage: 70,
          bonusFactors: { loyaltyBonus: 0.1, streakBonus: 0.05, achievementBonus: 0.02, timeBonus: 0.08 }
        },
        mechanics: {
          stackable: true,
          combo: true,
          chain: true,
          rarity: 0.9, // Very common
          cooldown: 1
        },
        availability: { isLimited: false }
      },
      {
        id: 'diamond_crown',
        name: 'Diamond Crown',
        emoji: '👑',
        category: 'luxury',
        pricing: {
          baseCost: 2500,
          tierMultipliers: { tier1: 0.6, tier2: 0.8, tier3: 1.0, tier4: 1.3 },
          dynamicFactors: {
            popularityMultiplier: 1.2,
            timeMultiplier: 1.5,
            eventMultiplier: 2.0,
            relationshipMultiplier: 1.8,
            moodMultiplier: 1.3
          }
        },
        effects: {
          visual: {
            animation: 'royal_ascension',
            duration: 8000,
            screenEffect: 'golden_aura',
            particleCount: 100,
            colorScheme: ['#FFD700', '#FFA500', '#FF8C00']
          },
          audio: { sound: 'royal_fanfare', volume: 1.0, echo: true },
          haptic: { pattern: 'heavy', duration: 2000 },
          social: { broadcastLevel: 'global', leaderboardPoints: 200, statusBoost: 50 }
        },
        earnings: {
          basePercentage: 75,
          bonusFactors: { loyaltyBonus: 0.2, streakBonus: 0.15, achievementBonus: 0.1, timeBonus: 0.12 }
        },
        mechanics: {
          stackable: false,
          combo: true,
          chain: true,
          rarity: 0.05, // Very rare
          cooldown: 300, // 5 minutes
          requirement: { senderLevel: 10 }
        },
        availability: { isLimited: true, dailyLimit: 100 }
      },
      {
        id: 'galaxy_storm',
        name: 'Galaxy Storm',
        emoji: '🌌',
        category: 'mythical',
        pricing: {
          baseCost: 10000,
          tierMultipliers: { tier1: 0.4, tier2: 0.6, tier3: 0.8, tier4: 1.0 },
          dynamicFactors: {
            popularityMultiplier: 1.5,
            timeMultiplier: 2.0,
            eventMultiplier: 3.0,
            relationshipMultiplier: 2.5,
            moodMultiplier: 1.8
          }
        },
        effects: {
          visual: {
            animation: 'cosmic_explosion',
            duration: 15000,
            screenEffect: 'reality_warp',
            particleCount: 500,
            colorScheme: ['#4B0082', '#9400D3', '#8A2BE2', '#DA70D6']
          },
          audio: { sound: 'cosmic_boom', volume: 1.0, echo: true },
          haptic: { pattern: 'custom', duration: 5000 },
          social: { broadcastLevel: 'global', leaderboardPoints: 1000, statusBoost: 200 }
        },
        earnings: {
          basePercentage: 80,
          bonusFactors: { loyaltyBonus: 0.3, streakBonus: 0.25, achievementBonus: 0.2, timeBonus: 0.15 }
        },
        mechanics: {
          stackable: false,
          combo: true,
          chain: true,
          rarity: 0.001, // Ultra rare
          cooldown: 3600, // 1 hour
          requirement: { senderLevel: 25, recipientLevel: 15 }
        },
        availability: { isLimited: true, totalSupply: 1000, userLimit: 1 }
      }
    ];

    gifts.forEach(gift => {
      this.dynamicGifts.set(gift.id, gift);
    });

    logger.info(`Initialized ${gifts.length} dynamic gifts`);
  }

  private initializeGiftCombos(): void {
    const combos: GiftCombo[] = [
      {
        id: 'love_combo',
        name: 'Love Storm',
        gifts: ['spark_heart', 'rose', 'kiss'],
        bonusMultiplier: 1.5,
        specialEffect: 'love_explosion',
        achievement: 'romantic_gesture'
      },
      {
        id: 'royal_combo',
        name: 'Royal Treatment',
        gifts: ['diamond_crown', 'golden_throne', 'royal_scepter'],
        bonusMultiplier: 2.0,
        specialEffect: 'coronation_ceremony',
        achievement: 'royal_patron'
      },
      {
        id: 'cosmic_combo',
        name: 'Universal Dominance',
        gifts: ['galaxy_storm', 'black_hole', 'supernova'],
        bonusMultiplier: 3.0,
        specialEffect: 'universe_creation',
        achievement: 'cosmic_emperor'
      }
    ];

    combos.forEach(combo => {
      this.giftCombos.set(combo.id, combo);
    });

    logger.info(`Initialized ${combos.length} gift combos`);
  }

  private getUserTier(spendingTier: string): 'tier1' | 'tier2' | 'tier3' | 'tier4' {
    const tierMap = {
      'minnow': 'tier1',
      'dolphin': 'tier2',
      'whale': 'tier3',
      'mega_whale': 'tier4'
    } as const;

    return tierMap[spendingTier as keyof typeof tierMap] || 'tier1';
  }

  private async calculateRelationshipStrength(senderId: string, recipientId: string): Promise<number> {
    // Analyze relationship based on interaction history
    const interactions = await CoinTransaction.find({
      $or: [
        { userId: senderId, targetUserId: recipientId, type: 'gift_sent' },
        { userId: recipientId, targetUserId: senderId, type: 'gift_sent' }
      ]
    }).limit(50);

    if (interactions.length === 0) return 0.1; // New relationship

    // Calculate relationship score based on:
    // - Frequency of interactions
    // - Recency of interactions
    // - Mutual gifting
    // - Value of gifts exchanged

    const recentInteractions = interactions.filter(i =>
      Date.now() - i.createdAt.getTime() < 7 * 24 * 60 * 60 * 1000 // Last 7 days
    );

    const mutualGifts = interactions.filter(i => i.userId === recipientId).length;
    const totalValue = interactions.reduce((sum, i) => sum + i.amount, 0);

    const strength = Math.min(1.0, (
      (recentInteractions.length * 0.3) +
      (mutualGifts > 0 ? 0.4 : 0) +
      (Math.log(totalValue + 1) * 0.1)
    ));

    return Math.max(0.1, strength); // Minimum relationship strength
  }

  private calculateRelationshipMultiplier(strength: number): number {
    // Strong relationships get better pricing
    if (strength > 0.8) return 0.7; // 30% discount
    if (strength > 0.6) return 0.8; // 20% discount
    if (strength > 0.4) return 0.9; // 10% discount
    if (strength < 0.2) return 1.1; // 10% premium (to encourage connection)
    return 1.0; // Neutral
  }

  private calculateTimingMultiplier(timing: Date, recipientProfile: any): number {
    const hour = timing.getHours();
    const dayOfWeek = timing.getDay();

    // Check if it's recipient's active hours
    const isActiveHour = recipientProfile.behaviorPatterns.dailyActiveHours.includes(hour);
    const weekendBonus = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.1 : 1.0;

    let multiplier = 1.0;

    if (isActiveHour) {
      multiplier *= 1.2; // 20% bonus for active hours
    } else {
      multiplier *= 0.9; // 10% discount for inactive hours
    }

    multiplier *= weekendBonus;

    // Prime time bonuses (evening hours)
    if (hour >= 19 && hour <= 22) {
      multiplier *= 1.15;
    }

    return Math.max(0.7, Math.min(1.8, multiplier));
  }

  private calculateMoodMultiplier(recipientProfile: any): number {
    const mood = recipientProfile.emotionalState.currentMood;
    const engagementLevel = recipientProfile.emotionalState.engagementLevel;

    const moodMultipliers = {
      'excited': 1.5,
      'happy': 1.3,
      'neutral': 1.0,
      'bored': 1.2, // Gifts can lift mood
      'frustrated': 0.8,
      'angry': 0.7
    };

    let multiplier = moodMultipliers[mood as keyof typeof moodMultipliers] || 1.0;

    // Engagement level bonus
    multiplier *= (0.8 + (engagementLevel * 0.4)); // 0.8x to 1.2x based on engagement

    return Math.max(0.7, Math.min(1.8, multiplier));
  }

  private calculateSocialProofMultiplier(session: LiveGiftingSession): number {
    const { energy, hypeLevel, socialProof } = session.atmosphere;

    let multiplier = 1.0;

    // Energy bonus (more active streams = higher multiplier)
    multiplier += (energy / 100) * 0.3; // Up to 30% bonus

    // Hype level bonus
    multiplier += (hypeLevel / 10) * 0.2; // Up to 20% bonus

    // Social proof bonus (more recent gifters = higher multiplier)
    multiplier += Math.min(socialProof * this.ECONOMIC_PARAMETERS.SOCIAL_PROOF_FACTOR, 0.5);

    return Math.max(0.8, Math.min(2.0, multiplier));
  }

  private async calculateStreakMultiplier(senderId: string, recipientId: string): Promise<number> {
    // Find consecutive days with gifts from sender to recipient
    const recentGifts = await CoinTransaction.find({
      userId: senderId,
      targetUserId: recipientId,
      type: 'gift_sent',
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    }).sort({ createdAt: -1 });

    if (recentGifts.length === 0) return 1.0;

    // Calculate consecutive day streak
    let streak = 0;
    let lastDate = '';

    for (const gift of recentGifts) {
      const giftDate = gift.createdAt.toDateString();
      if (lastDate === '' || lastDate === giftDate) {
        // Same day or first gift
        lastDate = giftDate;
      } else {
        const dayDiff = Math.floor(
          (new Date(lastDate).getTime() - new Date(giftDate).getTime()) / (24 * 60 * 60 * 1000)
        );

        if (dayDiff === 1) {
          // Consecutive day
          streak++;
          lastDate = giftDate;
        } else {
          // Streak broken
          break;
        }
      }
    }

    // Streak bonus: 5% per consecutive day, max 50%
    return Math.min(1.5, 1.0 + (streak * 0.05));
  }

  private async calculatePopularityMultiplier(giftId: string): Promise<number> {
    // Calculate gift popularity based on recent usage
    const recentGifts = await CoinTransaction.find({
      'context.giftId': giftId,
      type: 'gift_sent',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    });

    const totalGifts = await CoinTransaction.countDocuments({
      type: 'gift_sent',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    if (totalGifts === 0) return 1.0;

    const popularity = recentGifts.length / totalGifts;

    // Popular gifts get slight premium, unpopular get discount
    if (popularity > 0.2) return 1.15; // 15% premium for very popular
    if (popularity > 0.1) return 1.05; // 5% premium for popular
    if (popularity < 0.01) return 0.85; // 15% discount for unpopular
    if (popularity < 0.05) return 0.95; // 5% discount for less popular

    return 1.0;
  }

  private calculateQuantityDiscount(quantity: number): number {
    // Bulk purchase discounts
    if (quantity >= 100) return 0.8; // 20% discount
    if (quantity >= 50) return 0.85; // 15% discount
    if (quantity >= 20) return 0.9; // 10% discount
    if (quantity >= 10) return 0.95; // 5% discount

    return 1.0; // No discount
  }

  private async calculateLoyaltyBonus(senderId: string, recipientId: string): Promise<number> {
    // Calculate loyalty based on total gifts sent to this recipient
    const totalGifts = await CoinTransaction.find({
      userId: senderId,
      targetUserId: recipientId,
      type: 'gift_sent'
    });

    const totalValue = totalGifts.reduce((sum, gift) => sum + gift.amount, 0);

    // Loyalty bonus based on total value gifted
    if (totalValue > 50000) return 0.3; // 30% bonus
    if (totalValue > 20000) return 0.2; // 20% bonus
    if (totalValue > 10000) return 0.15; // 15% bonus
    if (totalValue > 5000) return 0.1; // 10% bonus
    if (totalValue > 1000) return 0.05; // 5% bonus

    return 0;
  }

  private async calculateStreakBonus(senderId: string, recipientId: string): Promise<number> {
    // Similar to streak multiplier but for earnings
    const streakMultiplier = await this.calculateStreakMultiplier(senderId, recipientId);
    return (streakMultiplier - 1) * 0.5; // Convert multiplier to bonus percentage
  }

  private async calculateAchievementBonus(recipientId: string): Promise<number> {
    // Bonus based on recipient's recent achievements
    // This would integrate with achievement system
    const recipientProfile = await aiPersonalization.getUserProfile(recipientId);

    if (recipientProfile.behaviorPatterns.statusSeeking > 0.8) {
      return 0.1; // 10% bonus for status-seeking users
    }

    return 0;
  }

  private async generateGiftEffects(
    gift: DynamicGift,
    quantity: number,
    multiplier: number,
    comboEffects: any[]
  ): Promise<any[]> {
    const effects = [];

    // Base gift effect
    const baseEffect = {
      ...gift.effects,
      multiplier,
      quantity
    };

    // Scale effects based on quantity and multiplier
    if (quantity > 1) {
      baseEffect.visual.particleCount *= Math.min(quantity, 10);
      baseEffect.visual.duration *= Math.min(1 + (quantity * 0.1), 2);
    }

    if (multiplier > 1.5) {
      baseEffect.visual.particleCount *= 1.5;
      baseEffect.audio.volume *= 1.2;
    }

    effects.push(baseEffect);

    // Add combo effects
    effects.push(...comboEffects);

    // Special milestone effects
    if (quantity >= 100) {
      effects.push({
        type: 'milestone',
        effect: 'century_celebration',
        message: `${quantity} ${gift.name}s! Incredible generosity!`
      });
    }

    return effects;
  }

  private findMatchingCombo(giftIds: string[]): GiftCombo | undefined {
    for (const combo of this.giftCombos.values()) {
      const hasAllGifts = combo.gifts.every(requiredGift =>
        giftIds.includes(requiredGift)
      );

      if (hasAllGifts) {
        return combo;
      }
    }
    return undefined;
  }

  private isGiftAvailable(gift: DynamicGift, senderId: string, recipientId: string): boolean {
    // Check availability constraints
    if (gift.availability.isLimited) {
      if (gift.availability.expiryDate && gift.availability.expiryDate < new Date()) {
        return false;
      }

      // Additional availability checks would go here
      // - Daily limits
      // - User limits
      // - Regional restrictions
    }

    // Check requirements
    if (gift.mechanics.requirement) {
      // Would check actual user levels and requirements
      return true; // Simplified for now
    }

    return true;
  }

  private generateGiftRecommendationReason(gift: DynamicGift, pricing: any, senderProfile: any): string {
    const reasons = [];

    if (pricing.savings && pricing.savings > 0) {
      reasons.push(`Save ${pricing.savings} coins`);
    }

    if (pricing.totalMultiplier > 1.3) {
      reasons.push('Maximum impact timing');
    }

    if (gift.category === 'luxury' && senderProfile.spendingPsychology.exclusivityDesire > 0.7) {
      reasons.push('Perfect for your exclusive taste');
    }

    if (gift.mechanics.combo) {
      reasons.push('Combo potential for bonus effects');
    }

    return reasons.join(' • ') || 'Personalized recommendation';
  }

  private calculateGiftUrgency(gift: DynamicGift, pricing: any, context: any): number {
    let urgency = 0;

    // Limited availability urgency
    if (gift.availability.isLimited) {
      urgency += 3;
    }

    // Price advantage urgency
    if (pricing.savings && pricing.savings > gift.pricing.baseCost * 0.15) {
      urgency += 4;
    }

    // Time-sensitive events
    const hour = new Date().getHours();
    if (hour >= 20 && hour <= 22) { // Prime time
      urgency += 2;
    }

    return Math.min(10, urgency);
  }

  private async updateLiveSession(streamId: string, giftData: any): Promise<void> {
    const session = this.liveSessions.get(streamId);
    if (!session) return;

    // Add to active gifts
    session.activeGifts.push({
      id: `gift_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      senderId: giftData.senderId,
      giftId: giftData.giftId,
      amount: giftData.amount,
      multiplier: giftData.multiplier,
      timestamp: new Date(),
      effect: 'active'
    });

    // Update atmosphere
    session.atmosphere.energy = Math.min(100, session.atmosphere.energy + 10);
    session.atmosphere.socialProof += 1;

    if (giftData.amount > 1000) {
      session.atmosphere.hypeLevel = Math.min(10, session.atmosphere.hypeLevel + 1);
    }

    // Update revenue
    session.revenueOptimization.currentRevenue += giftData.amount;

    // Clean old gifts (keep last 100)
    session.activeGifts = session.activeGifts.slice(-100);

    this.emit('liveSessionUpdated', { streamId, session, giftData });
  }

  private async checkChainTrigger(
    senderId: string,
    recipientId: string,
    giftId: string,
    amount: number
  ): Promise<boolean> {
    // Check if this gift can trigger a chain reaction
    const gift = this.dynamicGifts.get(giftId);
    if (!gift || !gift.mechanics.chain) return false;

    // Look for existing chains
    const existingChain = Array.from(this.activeChains.values()).find(chain =>
      chain.recipientId === recipientId && chain.status === 'active'
    );

    if (existingChain) {
      // Add to existing chain
      existingChain.chainGifts.push({
        giftId,
        senderId,
        timestamp: new Date(),
        multiplier: 1 + (existingChain.chainGifts.length * 0.1) // Escalating multiplier
      });
      existingChain.totalValue += amount;
      existingChain.chainBonus *= this.ECONOMIC_PARAMETERS.CHAIN_DECAY_RATE;

      return true;
    } else if (amount > 500) {
      // Start new chain for high-value gifts
      const chainId = `chain_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      this.activeChains.set(chainId, {
        initiatorId: senderId,
        recipientId,
        chainGifts: [{
          giftId,
          senderId,
          timestamp: new Date(),
          multiplier: 1.0
        }],
        totalValue: amount,
        chainBonus: 1.0,
        status: 'active',
        expiresAt: new Date(Date.now() + 300000) // 5 minutes
      });

      return true;
    }

    return false;
  }

  private async updateGiftStatistics(giftId: string, cost: number, multiplier: number): Promise<void> {
    // Update gift usage statistics for popularity calculations
    // This would typically update a separate statistics collection
    this.emit('giftStatisticsUpdated', { giftId, cost, multiplier, timestamp: new Date() });
  }

  private async createGiftingChallenges(session: LiveGiftingSession): Promise<void> {
    // Create dynamic challenges based on stream context
    const challenges = [
      {
        id: 'community_goal',
        type: 'community' as const,
        target: session.revenueOptimization.targetRevenue,
        current: 0,
        reward: 'Exclusive celebration animation',
        expiresAt: new Date(Date.now() + 3600000) // 1 hour
      }
    ];

    session.giftingChallenges = challenges;
  }

  // Background processes
  private startEconomicEngine(): void {
    // Update gift popularity and trends every 15 minutes
    setInterval(async () => {
      await this.updateGiftTrends();
    }, 900000);

    // Manage gift chains every minute
    setInterval(() => {
      this.manageGiftChains();
    }, 60000);

    // Update live session atmospheres every 30 seconds
    setInterval(() => {
      this.updateSessionAtmospheres();
    }, 30000);
  }

  private startRevenueOptimization(): void {
    // Revenue optimization analysis every 10 minutes
    setInterval(async () => {
      await this.optimizeRevenue();
    }, 600000);
  }

  private async updateGiftTrends(): Promise<void> {
    // Analyze gift usage trends and update popularity multipliers
    const hourlyStats = await CoinTransaction.aggregate([
      {
        $match: {
          type: 'gift_sent',
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: '$context.giftId',
          count: { $sum: 1 },
          totalValue: { $sum: '$amount' },
          avgMultiplier: { $avg: '$context.multiplier' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    this.emit('giftTrendsUpdated', { trends: hourlyStats, timestamp: new Date() });
  }

  private manageGiftChains(): void {
    const now = Date.now();

    for (const [chainId, chain] of this.activeChains.entries()) {
      if (chain.expiresAt.getTime() <= now) {
        // Chain expired - finalize and reward
        chain.status = 'completed';
        this.finalizeGiftChain(chain);
        this.activeChains.delete(chainId);
      }
    }
  }

  private updateSessionAtmospheres(): void {
    for (const session of this.liveSessions.values()) {
      // Decay energy and hype over time
      session.atmosphere.energy *= 0.98;
      session.atmosphere.hypeLevel *= 0.99;
      session.atmosphere.socialProof *= 0.95;

      // Update mood based on recent activity
      if (session.atmosphere.energy > 70) {
        session.atmosphere.mood = 'celebration';
      } else if (session.atmosphere.hypeLevel > 7) {
        session.atmosphere.mood = 'competition';
      } else {
        session.atmosphere.mood = 'neutral';
      }
    }
  }

  private async optimizeRevenue(): Promise<void> {
    for (const session of this.liveSessions.values()) {
      const currentProgress = session.revenueOptimization.currentRevenue / session.revenueOptimization.targetRevenue;

      if (currentProgress < 0.5) {
        // Behind target - increase urgency
        session.revenueOptimization.urgencyLevel = Math.min(10, session.revenueOptimization.urgencyLevel + 2);

        // Suggest high-impact gifts
        session.revenueOptimization.suggestedGifts = ['diamond_crown', 'galaxy_storm', 'royal_combo'];
      } else if (currentProgress > 1.2) {
        // Exceeding target - reduce urgency
        session.revenueOptimization.urgencyLevel = Math.max(0, session.revenueOptimization.urgencyLevel - 1);
      }
    }
  }

  private finalizeGiftChain(chain: GiftChain): void {
    // Calculate chain rewards and bonuses
    const totalBonus = chain.chainGifts.length * 0.1; // 10% bonus per gift in chain

    this.emit('giftChainCompleted', {
      chainId: chain.initiatorId,
      recipientId: chain.recipientId,
      totalValue: chain.totalValue,
      chainLength: chain.chainGifts.length,
      totalBonus
    });
  }

  /**
   * Get available gift packages for a user
   */
  async getAvailableGiftPackages(userId: string): Promise<Array<{
    gift: DynamicGift;
    pricing: any;
    isAvailable: boolean;
    reason?: string;
  }>> {
    try {
      const senderProfile = await aiPersonalization.getUserProfile(userId);
      const packages = [];

      for (const gift of this.dynamicGifts.values()) {
        // Check availability
        const isAvailable = this.isGiftAvailable(gift, userId, '');

        // Calculate pricing for default recipient (empty string = general pricing)
        let pricing = null;
        let reason = undefined;

        if (isAvailable) {
          try {
            pricing = await this.calculateDynamicGiftPrice(gift.id, userId, userId, {
              timing: new Date(),
              quantity: 1
            });
          } catch (error) {
            reason = 'Pricing unavailable';
          }
        } else {
          reason = this.getUnavailableReason(gift, userId);
        }

        packages.push({
          gift,
          pricing,
          isAvailable,
          reason
        });
      }

      // Sort by category and price
      packages.sort((a, b) => {
        const categoryOrder = { basic: 1, premium: 2, luxury: 3, legendary: 4, mythical: 5 };
        return categoryOrder[a.gift.category] - categoryOrder[b.gift.category];
      });

      return packages;
    } catch (error) {
      logger.error('Error getting available gift packages:', error);
      return [];
    }
  }

  /**
   * Get gift history for a user
   */
  async getGiftHistory(
    userId: string,
    filters: {
      type?: 'sent' | 'received';
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    gifts: any[];
    total: number;
    totalValue: number;
  }> {
    try {
      const query: any = {
        $or: [
          { userId, type: 'gift_sent' },
          { targetUserId: userId, type: 'gift_received' }
        ]
      };

      if (filters.type === 'sent') {
        query.$or = [{ userId, type: 'gift_sent' }];
      } else if (filters.type === 'received') {
        query.$or = [{ targetUserId: userId, type: 'gift_received' }];
      }

      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) query.createdAt.$gte = filters.startDate;
        if (filters.endDate) query.createdAt.$lte = filters.endDate;
      }

      const total = await CoinTransaction.countDocuments(query);

      const transactions = await CoinTransaction
        .find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit || 50)
        .skip(filters.offset || 0);

      const totalValue = transactions.reduce((sum, tx) => sum + tx.amount, 0);

      const gifts = transactions.map(tx => ({
        transactionId: tx._id,
        giftId: tx.context?.giftId,
        giftName: tx.context?.giftName,
        amount: tx.amount,
        senderId: tx.type === 'gift_sent' ? tx.userId : tx.targetUserId,
        recipientId: tx.type === 'gift_sent' ? tx.targetUserId : tx.userId,
        quantity: tx.context?.quantity || 1,
        multiplier: tx.context?.multiplier || 1,
        timestamp: tx.createdAt,
        type: tx.type
      }));

      return { gifts, total, totalValue };
    } catch (error) {
      logger.error('Error getting gift history:', error);
      return { gifts: [], total: 0, totalValue: 0 };
    }
  }

  /**
   * Get gift analytics for a user
   */
  async getGiftAnalytics(userId: string): Promise<{
    totalSent: number;
    totalReceived: number;
    totalValueSent: number;
    totalValueReceived: number;
    favoriteGifts: any[];
    topRecipients: any[];
    topSenders: any[];
    giftingStreak: number;
  }> {
    try {
      // Get all gift transactions
      const sent = await CoinTransaction.find({
        userId,
        type: 'gift_sent'
      });

      const received = await CoinTransaction.find({
        targetUserId: userId,
        type: 'gift_received'
      });

      const totalSent = sent.length;
      const totalReceived = received.length;
      const totalValueSent = sent.reduce((sum, tx) => sum + tx.amount, 0);
      const totalValueReceived = received.reduce((sum, tx) => sum + tx.amount, 0);

      // Calculate favorite gifts
      const giftCounts: { [key: string]: number } = {};
      sent.forEach(tx => {
        const giftId = tx.context?.giftId;
        if (giftId) giftCounts[giftId] = (giftCounts[giftId] || 0) + 1;
      });

      const favoriteGifts = Object.entries(giftCounts)
        .map(([giftId, count]) => ({ giftId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate top recipients
      const recipientCounts: { [key: string]: number } = {};
      sent.forEach(tx => {
        const recipientId = tx.targetUserId;
        if (recipientId) recipientCounts[recipientId] = (recipientCounts[recipientId] || 0) + 1;
      });

      const topRecipients = Object.entries(recipientCounts)
        .map(([recipientId, count]) => ({ recipientId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate top senders
      const senderCounts: { [key: string]: number } = {};
      received.forEach(tx => {
        const senderId = tx.userId;
        if (senderId) senderCounts[senderId] = (senderCounts[senderId] || 0) + 1;
      });

      const topSenders = Object.entries(senderCounts)
        .map(([senderId, count]) => ({ senderId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Calculate gifting streak
      const giftingStreak = await this.calculateGiftingStreak(userId);

      return {
        totalSent,
        totalReceived,
        totalValueSent,
        totalValueReceived,
        favoriteGifts,
        topRecipients,
        topSenders,
        giftingStreak
      };
    } catch (error) {
      logger.error('Error getting gift analytics:', error);
      return {
        totalSent: 0,
        totalReceived: 0,
        totalValueSent: 0,
        totalValueReceived: 0,
        favoriteGifts: [],
        topRecipients: [],
        topSenders: [],
        giftingStreak: 0
      };
    }
  }

  /**
   * Get trending gifts
   */
  async getTrendingGifts(): Promise<Array<{
    gift: DynamicGift;
    trendScore: number;
    recentCount: number;
    popularityChange: number;
  }>> {
    try {
      const now = Date.now();
      const last24h = new Date(now - 24 * 60 * 60 * 1000);
      const previous24h = new Date(now - 48 * 60 * 60 * 1000);

      const trending = [];

      for (const gift of this.dynamicGifts.values()) {
        // Count recent usage
        const recentCount = await CoinTransaction.countDocuments({
          'context.giftId': gift.id,
          type: 'gift_sent',
          createdAt: { $gte: last24h }
        });

        const previousCount = await CoinTransaction.countDocuments({
          'context.giftId': gift.id,
          type: 'gift_sent',
          createdAt: { $gte: previous24h, $lt: last24h }
        });

        // Calculate popularity change
        const popularityChange = previousCount > 0
          ? ((recentCount - previousCount) / previousCount) * 100
          : recentCount > 0 ? 100 : 0;

        // Calculate trend score
        const trendScore = recentCount * (1 + Math.max(0, popularityChange / 100));

        trending.push({
          gift,
          trendScore,
          recentCount,
          popularityChange
        });
      }

      // Sort by trend score
      trending.sort((a, b) => b.trendScore - a.trendScore);

      return trending.slice(0, 10);
    } catch (error) {
      logger.error('Error getting trending gifts:', error);
      return [];
    }
  }

  /**
   * Calculate gift value with all multipliers
   */
  async calculateGiftValue(
    giftId: string,
    senderId: string,
    recipientId: string,
    quantity: number = 1
  ): Promise<{
    baseValue: number;
    finalValue: number;
    multipliers: any;
    earnings: number;
  }> {
    try {
      const gift = this.dynamicGifts.get(giftId);
      if (!gift) {
        throw new Error('Gift not found');
      }

      // Calculate pricing
      const pricing = await this.calculateDynamicGiftPrice(giftId, senderId, recipientId, {
        timing: new Date(),
        quantity
      });

      // Calculate recipient earnings
      const baseEarnings = pricing.finalPrice * (gift.earnings.basePercentage / 100);
      const loyaltyBonus = await this.calculateLoyaltyBonus(senderId, recipientId);
      const streakBonus = await this.calculateStreakBonus(senderId, recipientId);

      const totalEarningsMultiplier = (1 + loyaltyBonus) * (1 + streakBonus);
      const earnings = Math.round(baseEarnings * totalEarningsMultiplier);

      return {
        baseValue: gift.pricing.baseCost,
        finalValue: pricing.finalPrice,
        multipliers: pricing.breakdown,
        earnings
      };
    } catch (error) {
      logger.error('Error calculating gift value:', error);
      throw error;
    }
  }

  /**
   * Get gift leaderboard
   */
  async getGiftLeaderboard(
    timeframe: 'daily' | 'weekly' | 'monthly' | 'alltime' = 'weekly',
    category?: 'sent' | 'received'
  ): Promise<Array<{
    userId: string;
    totalGifts: number;
    totalValue: number;
    rank: number;
  }>> {
    try {
      const timeframes = {
        daily: 24 * 60 * 60 * 1000,
        weekly: 7 * 24 * 60 * 60 * 1000,
        monthly: 30 * 24 * 60 * 60 * 1000,
        alltime: 0
      };

      const timeLimit = timeframes[timeframe];
      const query: any = {};

      if (timeLimit > 0) {
        query.createdAt = { $gte: new Date(Date.now() - timeLimit) };
      }

      if (category === 'sent') {
        query.type = 'gift_sent';
      } else if (category === 'received') {
        query.type = 'gift_received';
      } else {
        query.type = { $in: ['gift_sent', 'gift_received'] };
      }

      // Aggregate by user
      const results = await CoinTransaction.aggregate([
        { $match: query },
        {
          $group: {
            _id: category === 'received' ? '$targetUserId' : '$userId',
            totalGifts: { $sum: 1 },
            totalValue: { $sum: '$amount' }
          }
        },
        { $sort: { totalValue: -1 } },
        { $limit: 100 }
      ]);

      return results.map((result, index) => ({
        userId: result._id,
        totalGifts: result.totalGifts,
        totalValue: result.totalValue,
        rank: index + 1
      }));
    } catch (error) {
      logger.error('Error getting gift leaderboard:', error);
      return [];
    }
  }

  /**
   * Process gift combo
   */
  async processGiftCombo(
    senderId: string,
    recipientId: string,
    giftIds: string[]
  ): Promise<{
    success: boolean;
    combo?: GiftCombo;
    bonusMultiplier: number;
    totalCost: number;
    effects: any[];
  }> {
    try {
      // Find matching combo
      const combo = this.findMatchingCombo(giftIds);

      if (!combo) {
        return {
          success: false,
          bonusMultiplier: 1.0,
          totalCost: 0,
          effects: []
        };
      }

      // Process each gift in the combo
      let totalCost = 0;
      const effects = [];

      for (const giftId of combo.gifts) {
        const result = await this.sendAdvancedGift(senderId, recipientId, giftId, 1, {
          isCombo: true,
          comboGifts: giftIds
        });

        totalCost += result.totalCost;
        effects.push(...result.effects);
      }

      return {
        success: true,
        combo,
        bonusMultiplier: combo.bonusMultiplier,
        totalCost,
        effects
      };
    } catch (error) {
      logger.error('Error processing gift combo:', error);
      throw error;
    }
  }

  /**
   * Get gift recommendations (wrapper for personalized recommendations)
   */
  async getGiftRecommendations(
    userId: string,
    context: { recipientId?: string; budget?: number; occasion?: string }
  ): Promise<Array<{
    gift: DynamicGift;
    pricing: any;
    confidence: number;
    reason: string;
  }>> {
    try {
      if (context.recipientId) {
        // Specific recipient recommendations
        const recommendations = await this.getPersonalizedGiftRecommendations(
          userId,
          context.recipientId,
          { budget: context.budget }
        );

        return recommendations.map(rec => ({
          gift: rec.gift,
          pricing: rec.pricing,
          confidence: rec.confidence,
          reason: rec.reason
        }));
      } else {
        // General recommendations
        const packages = await this.getAvailableGiftPackages(userId);

        return packages
          .filter(pkg => pkg.isAvailable && pkg.pricing)
          .slice(0, 10)
          .map(pkg => ({
            gift: pkg.gift,
            pricing: pkg.pricing,
            confidence: 0.5,
            reason: 'Popular gift option'
          }));
      }
    } catch (error) {
      logger.error('Error getting gift recommendations:', error);
      return [];
    }
  }

  /**
   * Calculate gifting streak for a user
   */
  private async calculateGiftingStreak(userId: string): Promise<number> {
    const gifts = await CoinTransaction.find({
      userId,
      type: 'gift_sent'
    }).sort({ createdAt: -1 });

    if (gifts.length === 0) return 0;

    let streak = 1;
    let lastDate = new Date(gifts[0].createdAt).toDateString();

    for (let i = 1; i < gifts.length; i++) {
      const currentDate = new Date(gifts[i].createdAt).toDateString();
      const dayDiff = Math.floor(
        (new Date(lastDate).getTime() - new Date(currentDate).getTime()) / (24 * 60 * 60 * 1000)
      );

      if (dayDiff === 1) {
        streak++;
        lastDate = currentDate;
      } else if (dayDiff > 1) {
        break;
      }
    }

    return streak;
  }

  /**
   * Get reason why gift is unavailable
   */
  private getUnavailableReason(gift: DynamicGift, userId: string): string {
    if (gift.availability.isLimited) {
      if (gift.availability.expiryDate && gift.availability.expiryDate < new Date()) {
        return 'Gift has expired';
      }
      if (gift.availability.dailyLimit) {
        return 'Daily limit reached';
      }
      if (gift.availability.userLimit) {
        return 'User limit reached';
      }
    }

    if (gift.mechanics.requirement) {
      if (gift.mechanics.requirement.senderLevel) {
        return `Requires level ${gift.mechanics.requirement.senderLevel}`;
      }
    }

    return 'Currently unavailable';
  }
}

export const advancedGiftEconomy = AdvancedGiftEconomyService.getInstance();
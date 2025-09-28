import { EventEmitter } from 'events';
import mongoose from 'mongoose';

export interface StatusTier {
  tier: 'newcomer' | 'regular' | 'vip' | 'elite' | 'legend' | 'mythic' | 'godlike';
  numericLevel: number;
  requirements: {
    minimumPoints: number;
    minimumDays: number;
    minimumSpending: number;
    minimumGiftsGiven: number;
    minimumFollowers: number;
    minimumStreams?: number;
    specialAchievements?: string[];
  };
  privileges: {
    coins: {
      dailyBonus: number;
      purchaseBonus: number; // percentage
      giftMultiplier: number;
    };
    social: {
      customBadge: boolean;
      exclusiveEmotes: string[];
      prioritySupport: boolean;
      exclusiveChannels: string[];
      mentionHighlight: boolean;
    };
    streaming: {
      higherRevenue: number; // percentage
      customEffects: boolean;
      priorityDiscovery: boolean;
      exclusiveFeatures: string[];
    };
    economy: {
      betterRates: boolean;
      exclusiveMarketplace: boolean;
      premiumDeals: boolean;
      earlyAccess: boolean;
    };
  };
  visualIdentity: {
    badgeColor: string;
    badgeIcon: string;
    nameColor: string;
    chatBorder: string;
    profileFrame: string;
    exclusiveAnimations: string[];
  };
}

export interface ReputationScore {
  overall: number;
  breakdown: {
    generosity: number; // Gift giving behavior
    engagement: number; // Community participation
    loyalty: number; // Platform dedication
    influence: number; // Social impact
    reliability: number; // Consistency
    creativity: number; // Content quality
    leadership: number; // Community building
    sportsmanship: number; // Gaming behavior
  };
  modifiers: {
    recentActivity: number; // Recent engagement multiplier
    communityFeedback: number; // Peer ratings
    platformLoyalty: number; // Time-based bonus
    specialRecognition: number; // Admin/mod endorsements
  };
  history: {
    date: Date;
    score: number;
    reason: string;
    impact: number;
  }[];
}

export interface SocialHierarchy {
  userId: string;
  currentTier: StatusTier['tier'];
  points: number;
  reputation: ReputationScore;
  achievements: Achievement[];
  socialMetrics: {
    followers: number;
    following: number;
    totalGiftsGiven: number;
    totalGiftsReceived: number;
    streamsHosted: number;
    averageViewers: number;
    communityRating: number;
  };
  progression: {
    nextTier: StatusTier['tier'];
    progressToNext: number;
    timeToNext: number; // estimated days
    missingRequirements: string[];
  };
  privileges: StatusTier['privileges'];
  decay: {
    lastActivity: Date;
    decayRate: number;
    gracePeriod: number; // days before decay starts
  };
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: 'social' | 'gaming' | 'streaming' | 'economy' | 'special' | 'milestone';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
  requirements: {
    type: string;
    value: number | string;
    timeframe?: number;
  }[];
  rewards: {
    points: number;
    reputation: { [key: string]: number };
    coins: number;
    privileges?: string[];
    visualRewards?: string[];
  };
  unlockedAt?: Date;
  progress?: number;
  hidden: boolean; // Hidden until discovered
}

export interface SocialInfluence {
  userId: string;
  influenceScore: number;
  influenceAreas: {
    gaming: number;
    streaming: number;
    community: number;
    economy: number;
  };
  network: {
    directFollowers: number;
    indirectReach: number;
    engagementRate: number;
    viralCoefficient: number;
  };
  contentImpact: {
    postsShared: number;
    commentsGenerated: number;
    trendsStarted: string[];
    communityEvents: number;
  };
  leadershipMetrics: {
    communitiesLed: number;
    eventsOrganized: number;
    newUsersReferred: number;
    conflictsResolved: number;
  };
}

export interface StatusCompetition {
  id: string;
  name: string;
  type: 'daily' | 'weekly' | 'monthly' | 'seasonal' | 'special_event';
  category: 'points' | 'reputation' | 'generosity' | 'engagement' | 'influence';
  duration: {
    startDate: Date;
    endDate: Date;
  };
  participants: {
    userId: string;
    score: number;
    rank: number;
    progress: number;
  }[];
  rewards: {
    rank: number;
    points: number;
    coins: number;
    specialPrivileges: string[];
    exclusiveContent: string[];
    statusBoost: number;
  }[];
  mechanics: {
    scoringMethod: string;
    bonusMultipliers: { [key: string]: number };
    specialRules: string[];
  };
}

export interface StatusDecaySystem {
  decayRules: {
    tier: StatusTier['tier'];
    gracePeriod: number; // days
    decayRate: number; // points lost per day after grace period
    minimumActivity: {
      dailyLogin: boolean;
      weeklyEngagement: number; // minimum actions
      monthlySpending: number; // minimum coins spent
    };
  }[];
  preventionMechanics: {
    loyaltyShield: {
      duration: number; // days of protection
      cost: number; // coins to activate
      cooldown: number; // days between uses
    };
    activityBoost: {
      multiplier: number;
      duration: number; // hours
      triggerActions: string[];
    };
  };
}

class SocialStatusEngine extends EventEmitter {
  private static instance: SocialStatusEngine;
  private statusTiers: Map<string, StatusTier> = new Map();
  private userHierarchies: Map<string, SocialHierarchy> = new Map();
  private achievements: Map<string, Achievement> = new Map();
  private activeCompetitions: Map<string, StatusCompetition> = new Map();
  private influenceMetrics: Map<string, SocialInfluence> = new Map();
  private decaySystem: StatusDecaySystem;

  constructor() {
    super();
    this.initializeStatusTiers();
    this.initializeAchievements();
    this.setupDecaySystem();
    this.startPeriodicUpdates();
  }

  public static getInstance(): SocialStatusEngine {
    if (!SocialStatusEngine.instance) {
      SocialStatusEngine.instance = new SocialStatusEngine();
    }
    return SocialStatusEngine.instance;
  }

  private initializeStatusTiers(): void {
    const tiers: StatusTier[] = [
      {
        tier: 'newcomer',
        numericLevel: 1,
        requirements: {
          minimumPoints: 0,
          minimumDays: 0,
          minimumSpending: 0,
          minimumGiftsGiven: 0,
          minimumFollowers: 0
        },
        privileges: {
          coins: { dailyBonus: 10, purchaseBonus: 0, giftMultiplier: 1.0 },
          social: { customBadge: false, exclusiveEmotes: [], prioritySupport: false, exclusiveChannels: [], mentionHighlight: false },
          streaming: { higherRevenue: 0, customEffects: false, priorityDiscovery: false, exclusiveFeatures: [] },
          economy: { betterRates: false, exclusiveMarketplace: false, premiumDeals: false, earlyAccess: false }
        },
        visualIdentity: {
          badgeColor: '#808080',
          badgeIcon: '🌱',
          nameColor: '#333333',
          chatBorder: 'none',
          profileFrame: 'basic',
          exclusiveAnimations: []
        }
      },
      {
        tier: 'regular',
        numericLevel: 2,
        requirements: {
          minimumPoints: 1000,
          minimumDays: 7,
          minimumSpending: 100,
          minimumGiftsGiven: 5,
          minimumFollowers: 10
        },
        privileges: {
          coins: { dailyBonus: 25, purchaseBonus: 0.05, giftMultiplier: 1.1 },
          social: { customBadge: true, exclusiveEmotes: ['👋', '🎉'], prioritySupport: false, exclusiveChannels: ['general-plus'], mentionHighlight: true },
          streaming: { higherRevenue: 0.1, customEffects: false, priorityDiscovery: false, exclusiveFeatures: [] },
          economy: { betterRates: false, exclusiveMarketplace: false, premiumDeals: true, earlyAccess: false }
        },
        visualIdentity: {
          badgeColor: '#4CAF50',
          badgeIcon: '🌿',
          nameColor: '#2E7D32',
          chatBorder: '1px solid #4CAF50',
          profileFrame: 'green',
          exclusiveAnimations: ['pulse']
        }
      },
      {
        tier: 'vip',
        numericLevel: 3,
        requirements: {
          minimumPoints: 5000,
          minimumDays: 30,
          minimumSpending: 500,
          minimumGiftsGiven: 25,
          minimumFollowers: 50
        },
        privileges: {
          coins: { dailyBonus: 50, purchaseBonus: 0.1, giftMultiplier: 1.25 },
          social: { customBadge: true, exclusiveEmotes: ['💎', '⭐', '🔥'], prioritySupport: true, exclusiveChannels: ['vip-lounge'], mentionHighlight: true },
          streaming: { higherRevenue: 0.2, customEffects: true, priorityDiscovery: true, exclusiveFeatures: ['custom_overlays'] },
          economy: { betterRates: true, exclusiveMarketplace: false, premiumDeals: true, earlyAccess: true }
        },
        visualIdentity: {
          badgeColor: '#2196F3',
          badgeIcon: '💎',
          nameColor: '#1565C0',
          chatBorder: '2px solid #2196F3',
          profileFrame: 'diamond',
          exclusiveAnimations: ['pulse', 'glow']
        }
      },
      {
        tier: 'elite',
        numericLevel: 4,
        requirements: {
          minimumPoints: 15000,
          minimumDays: 90,
          minimumSpending: 2000,
          minimumGiftsGiven: 100,
          minimumFollowers: 200,
          minimumStreams: 10
        },
        privileges: {
          coins: { dailyBonus: 100, purchaseBonus: 0.15, giftMultiplier: 1.5 },
          social: { customBadge: true, exclusiveEmotes: ['👑', '⚡', '🌟', '💫'], prioritySupport: true, exclusiveChannels: ['elite-circle', 'beta-testing'], mentionHighlight: true },
          streaming: { higherRevenue: 0.35, customEffects: true, priorityDiscovery: true, exclusiveFeatures: ['custom_overlays', 'special_notifications'] },
          economy: { betterRates: true, exclusiveMarketplace: true, premiumDeals: true, earlyAccess: true }
        },
        visualIdentity: {
          badgeColor: '#9C27B0',
          badgeIcon: '👑',
          nameColor: '#6A1B9A',
          chatBorder: '3px solid #9C27B0',
          profileFrame: 'royal',
          exclusiveAnimations: ['pulse', 'glow', 'sparkle']
        }
      },
      {
        tier: 'legend',
        numericLevel: 5,
        requirements: {
          minimumPoints: 50000,
          minimumDays: 180,
          minimumSpending: 10000,
          minimumGiftsGiven: 500,
          minimumFollowers: 1000,
          minimumStreams: 50,
          specialAchievements: ['community_leader', 'viral_creator', 'whale_spender']
        },
        privileges: {
          coins: { dailyBonus: 200, purchaseBonus: 0.25, giftMultiplier: 2.0 },
          social: { customBadge: true, exclusiveEmotes: ['🏆', '🔱', '⚡', '💥', '🌈'], prioritySupport: true, exclusiveChannels: ['legend-hall', 'creator-studio'], mentionHighlight: true },
          streaming: { higherRevenue: 0.5, customEffects: true, priorityDiscovery: true, exclusiveFeatures: ['custom_overlays', 'special_notifications', 'priority_placement'] },
          economy: { betterRates: true, exclusiveMarketplace: true, premiumDeals: true, earlyAccess: true }
        },
        visualIdentity: {
          badgeColor: '#FF5722',
          badgeIcon: '🏆',
          nameColor: '#D84315',
          chatBorder: '4px solid #FF5722',
          profileFrame: 'legendary',
          exclusiveAnimations: ['pulse', 'glow', 'sparkle', 'rainbow']
        }
      },
      {
        tier: 'mythic',
        numericLevel: 6,
        requirements: {
          minimumPoints: 150000,
          minimumDays: 365,
          minimumSpending: 50000,
          minimumGiftsGiven: 2000,
          minimumFollowers: 5000,
          minimumStreams: 200,
          specialAchievements: ['platform_ambassador', 'community_pillar', 'mega_whale']
        },
        privileges: {
          coins: { dailyBonus: 500, purchaseBonus: 0.4, giftMultiplier: 3.0 },
          social: { customBadge: true, exclusiveEmotes: ['🌌', '⭐', '🔮', '👑', '💎'], prioritySupport: true, exclusiveChannels: ['mythic-realm', 'inner-circle'], mentionHighlight: true },
          streaming: { higherRevenue: 0.75, customEffects: true, priorityDiscovery: true, exclusiveFeatures: ['custom_overlays', 'special_notifications', 'priority_placement', 'featured_streams'] },
          economy: { betterRates: true, exclusiveMarketplace: true, premiumDeals: true, earlyAccess: true }
        },
        visualIdentity: {
          badgeColor: '#E91E63',
          badgeIcon: '🌌',
          nameColor: '#AD1457',
          chatBorder: '5px solid #E91E63',
          profileFrame: 'mythic',
          exclusiveAnimations: ['pulse', 'glow', 'sparkle', 'rainbow', 'cosmic']
        }
      },
      {
        tier: 'godlike',
        numericLevel: 7,
        requirements: {
          minimumPoints: 500000,
          minimumDays: 730,
          minimumSpending: 200000,
          minimumGiftsGiven: 10000,
          minimumFollowers: 25000,
          minimumStreams: 1000,
          specialAchievements: ['platform_legend', 'community_founder', 'ultimate_whale', 'viral_phenomenon']
        },
        privileges: {
          coins: { dailyBonus: 1000, purchaseBonus: 0.6, giftMultiplier: 5.0 },
          social: { customBadge: true, exclusiveEmotes: ['✨', '🌟', '💫', '🔥', '⚡'], prioritySupport: true, exclusiveChannels: ['divine-council'], mentionHighlight: true },
          streaming: { higherRevenue: 1.0, customEffects: true, priorityDiscovery: true, exclusiveFeatures: ['custom_overlays', 'special_notifications', 'priority_placement', 'featured_streams', 'platform_partnership'] },
          economy: { betterRates: true, exclusiveMarketplace: true, premiumDeals: true, earlyAccess: true }
        },
        visualIdentity: {
          badgeColor: '#FFD700',
          badgeIcon: '✨',
          nameColor: '#FF8F00',
          chatBorder: '6px solid #FFD700',
          profileFrame: 'divine',
          exclusiveAnimations: ['pulse', 'glow', 'sparkle', 'rainbow', 'cosmic', 'divine']
        }
      }
    ];

    tiers.forEach(tier => {
      this.statusTiers.set(tier.tier, tier);
    });
  }

  private initializeAchievements(): void {
    const achievements: Achievement[] = [
      {
        id: 'first_gift',
        name: 'Generous Heart',
        description: 'Send your first gift to a streamer',
        category: 'social',
        rarity: 'common',
        requirements: [{ type: 'gifts_sent', value: 1 }],
        rewards: { points: 100, reputation: { generosity: 50 }, coins: 25 },
        hidden: false
      },
      {
        id: 'gift_master',
        name: 'Gift Master',
        description: 'Send 100 gifts to streamers',
        category: 'social',
        rarity: 'rare',
        requirements: [{ type: 'gifts_sent', value: 100 }],
        rewards: { points: 2000, reputation: { generosity: 500, influence: 200 }, coins: 500, privileges: ['gift_multiplier_boost'] },
        hidden: false
      },
      {
        id: 'community_leader',
        name: 'Community Leader',
        description: 'Build a following of 1000+ users',
        category: 'social',
        rarity: 'epic',
        requirements: [{ type: 'followers', value: 1000 }],
        rewards: { points: 5000, reputation: { leadership: 1000, influence: 800 }, coins: 1000, privileges: ['community_channels'], visualRewards: ['leader_badge'] },
        hidden: false
      },
      {
        id: 'viral_creator',
        name: 'Viral Creator',
        description: 'Create content that reaches 10,000+ users',
        category: 'streaming',
        rarity: 'legendary',
        requirements: [{ type: 'content_reach', value: 10000 }],
        rewards: { points: 10000, reputation: { creativity: 1500, influence: 1000 }, coins: 2500, privileges: ['viral_boost'], visualRewards: ['viral_animation'] },
        hidden: false
      },
      {
        id: 'whale_spender',
        name: 'Whale Spender',
        description: 'Spend 10,000+ coins on the platform',
        category: 'economy',
        rarity: 'epic',
        requirements: [{ type: 'coins_spent', value: 10000 }],
        rewards: { points: 3000, reputation: { loyalty: 800, generosity: 600 }, coins: 500, privileges: ['whale_privileges'] },
        hidden: false
      },
      {
        id: 'platform_ambassador',
        name: 'Platform Ambassador',
        description: 'Refer 50+ new users to the platform',
        category: 'social',
        rarity: 'legendary',
        requirements: [{ type: 'referrals', value: 50 }],
        rewards: { points: 15000, reputation: { leadership: 2000, influence: 1500 }, coins: 5000, privileges: ['ambassador_perks'] },
        hidden: false
      },
      {
        id: 'streak_master',
        name: 'Dedication Master',
        description: 'Maintain a 100-day login streak',
        category: 'milestone',
        rarity: 'rare',
        requirements: [{ type: 'login_streak', value: 100 }],
        rewards: { points: 2500, reputation: { loyalty: 1000, reliability: 800 }, coins: 1000, privileges: ['streak_protection'] },
        hidden: false
      },
      {
        id: 'hidden_founder',
        name: 'Hidden Founder',
        description: 'Discover the secret founder room',
        category: 'special',
        rarity: 'mythic',
        requirements: [{ type: 'secret_discovery', value: 'founder_room' }],
        rewards: { points: 25000, reputation: { loyalty: 3000 }, coins: 10000, privileges: ['founder_access'], visualRewards: ['founder_crown'] },
        hidden: true
      }
    ];

    achievements.forEach(achievement => {
      this.achievements.set(achievement.id, achievement);
    });
  }

  private setupDecaySystem(): void {
    this.decaySystem = {
      decayRules: [
        {
          tier: 'regular',
          gracePeriod: 14,
          decayRate: 10,
          minimumActivity: { dailyLogin: false, weeklyEngagement: 5, monthlySpending: 0 }
        },
        {
          tier: 'vip',
          gracePeriod: 21,
          decayRate: 25,
          minimumActivity: { dailyLogin: false, weeklyEngagement: 10, monthlySpending: 50 }
        },
        {
          tier: 'elite',
          gracePeriod: 30,
          decayRate: 50,
          minimumActivity: { dailyLogin: true, weeklyEngagement: 20, monthlySpending: 200 }
        },
        {
          tier: 'legend',
          gracePeriod: 45,
          decayRate: 100,
          minimumActivity: { dailyLogin: true, weeklyEngagement: 35, monthlySpending: 500 }
        },
        {
          tier: 'mythic',
          gracePeriod: 60,
          decayRate: 200,
          minimumActivity: { dailyLogin: true, weeklyEngagement: 50, monthlySpending: 1000 }
        },
        {
          tier: 'godlike',
          gracePeriod: 90,
          decayRate: 300,
          minimumActivity: { dailyLogin: true, weeklyEngagement: 75, monthlySpending: 2500 }
        }
      ],
      preventionMechanics: {
        loyaltyShield: {
          duration: 30,
          cost: 1000,
          cooldown: 90
        },
        activityBoost: {
          multiplier: 2.0,
          duration: 24,
          triggerActions: ['gift_sent', 'stream_hosted', 'achievement_earned']
        }
      }
    };
  }

  public async getUserHierarchy(userId: string): Promise<SocialHierarchy> {
    if (!this.userHierarchies.has(userId)) {
      await this.initializeUserHierarchy(userId);
    }
    return this.userHierarchies.get(userId)!;
  }

  public async updateUserPoints(userId: string, points: number, reason: string): Promise<SocialHierarchy> {
    const hierarchy = await this.getUserHierarchy(userId);
    hierarchy.points += points;

    // Update reputation based on the reason
    this.updateReputation(hierarchy, reason, points);

    // Check for tier progression
    await this.checkTierProgression(hierarchy);

    // Check for achievement unlocks
    await this.checkAchievements(userId, hierarchy);

    this.emit('points_updated', {
      userId,
      points,
      reason,
      newTotal: hierarchy.points,
      tier: hierarchy.currentTier
    });

    return hierarchy;
  }

  public async processActivity(userId: string, activity: {
    type: string;
    data: any;
    value?: number;
  }): Promise<void> {
    const hierarchy = await this.getUserHierarchy(userId);

    // Update activity timestamp
    hierarchy.decay.lastActivity = new Date();

    // Calculate points based on activity
    const points = this.calculateActivityPoints(activity);

    if (points > 0) {
      await this.updateUserPoints(userId, points, activity.type);
    }

    // Update social metrics
    await this.updateSocialMetrics(userId, activity);

    // Update influence score
    await this.updateInfluenceScore(userId, activity);
  }

  public async grantAchievement(userId: string, achievementId: string): Promise<boolean> {
    const hierarchy = await this.getUserHierarchy(userId);
    const achievement = this.achievements.get(achievementId);

    if (!achievement || hierarchy.achievements.some(a => a.id === achievementId)) {
      return false;
    }

    // Add achievement to user
    achievement.unlockedAt = new Date();
    hierarchy.achievements.push(achievement);

    // Grant rewards
    hierarchy.points += achievement.rewards.points;
    hierarchy.reputation.overall += Object.values(achievement.rewards.reputation).reduce((sum, val) => sum + val, 0);

    // Update individual reputation aspects
    Object.entries(achievement.rewards.reputation).forEach(([aspect, value]) => {
      if (aspect in hierarchy.reputation.breakdown) {
        hierarchy.reputation.breakdown[aspect as keyof typeof hierarchy.reputation.breakdown] += value;
      }
    });

    this.emit('achievement_unlocked', {
      userId,
      achievement,
      rewards: achievement.rewards
    });

    return true;
  }

  public async createCompetition(competition: Omit<StatusCompetition, 'participants'>): Promise<StatusCompetition> {
    const fullCompetition: StatusCompetition = {
      ...competition,
      participants: []
    };

    this.activeCompetitions.set(competition.id, fullCompetition);

    this.emit('competition_created', {
      competitionId: competition.id,
      name: competition.name,
      type: competition.type,
      duration: competition.duration
    });

    return fullCompetition;
  }

  public async joinCompetition(userId: string, competitionId: string): Promise<boolean> {
    const competition = this.activeCompetitions.get(competitionId);
    const hierarchy = await this.getUserHierarchy(userId);

    if (!competition || competition.participants.some(p => p.userId === userId)) {
      return false;
    }

    competition.participants.push({
      userId,
      score: 0,
      rank: competition.participants.length + 1,
      progress: 0
    });

    this.emit('competition_joined', {
      userId,
      competitionId,
      participantCount: competition.participants.length
    });

    return true;
  }

  public getStatusTiers(): StatusTier[] {
    return Array.from(this.statusTiers.values());
  }

  public getAvailableAchievements(userId: string): Achievement[] {
    const hierarchy = this.userHierarchies.get(userId);
    const unlockedIds = hierarchy?.achievements.map(a => a.id) || [];

    return Array.from(this.achievements.values()).filter(achievement =>
      !achievement.hidden && !unlockedIds.includes(achievement.id)
    );
  }

  public async calculateInfluenceScore(userId: string): Promise<SocialInfluence> {
    const hierarchy = await this.getUserHierarchy(userId);
    const metrics = hierarchy.socialMetrics;

    const influenceScore = this.calculateOverallInfluence(metrics);

    const influence: SocialInfluence = {
      userId,
      influenceScore,
      influenceAreas: {
        gaming: this.calculateGamingInfluence(hierarchy),
        streaming: this.calculateStreamingInfluence(hierarchy),
        community: this.calculateCommunityInfluence(hierarchy),
        economy: this.calculateEconomyInfluence(hierarchy)
      },
      network: {
        directFollowers: metrics.followers,
        indirectReach: metrics.followers * 2.5, // estimated
        engagementRate: this.calculateEngagementRate(hierarchy),
        viralCoefficient: this.calculateViralCoefficient(hierarchy)
      },
      contentImpact: {
        postsShared: hierarchy.socialMetrics.totalGiftsGiven, // proxy metric
        commentsGenerated: metrics.communityRating * 10, // proxy metric
        trendsStarted: [],
        communityEvents: hierarchy.socialMetrics.streamsHosted
      },
      leadershipMetrics: {
        communitiesLed: 0, // would track actual communities
        eventsOrganized: 0, // would track events
        newUsersReferred: 0, // would integrate with viral growth engine
        conflictsResolved: 0 // would track moderation actions
      }
    };

    this.influenceMetrics.set(userId, influence);
    return influence;
  }

  public async predictStatusProgression(userId: string, timeframeDays: number): Promise<{
    currentTier: string;
    predictedTier: string;
    progressionProbability: number;
    recommendedActions: string[];
    estimatedTimeToNextTier: number;
  }> {
    const hierarchy = await this.getUserHierarchy(userId);
    const currentRate = this.calculateProgressionRate(hierarchy);

    const predictedPoints = hierarchy.points + (currentRate * timeframeDays);
    const predictedTier = this.calculateTierFromPoints(predictedPoints);

    return {
      currentTier: hierarchy.currentTier,
      predictedTier,
      progressionProbability: this.calculateProgressionProbability(hierarchy, predictedTier),
      recommendedActions: this.generateRecommendedActions(hierarchy),
      estimatedTimeToNextTier: hierarchy.progression.timeToNext
    };
  }

  private async initializeUserHierarchy(userId: string): Promise<void> {
    const newHierarchy: SocialHierarchy = {
      userId,
      currentTier: 'newcomer',
      points: 0,
      reputation: this.initializeReputation(),
      achievements: [],
      socialMetrics: {
        followers: 0,
        following: 0,
        totalGiftsGiven: 0,
        totalGiftsReceived: 0,
        streamsHosted: 0,
        averageViewers: 0,
        communityRating: 5.0
      },
      progression: {
        nextTier: 'regular',
        progressToNext: 0,
        timeToNext: 30,
        missingRequirements: []
      },
      privileges: this.statusTiers.get('newcomer')!.privileges,
      decay: {
        lastActivity: new Date(),
        decayRate: 0,
        gracePeriod: 0
      }
    };

    this.userHierarchies.set(userId, newHierarchy);
  }

  private initializeReputation(): ReputationScore {
    return {
      overall: 1000, // Starting neutral score
      breakdown: {
        generosity: 100,
        engagement: 100,
        loyalty: 100,
        influence: 100,
        reliability: 100,
        creativity: 100,
        leadership: 100,
        sportsmanship: 100
      },
      modifiers: {
        recentActivity: 1.0,
        communityFeedback: 1.0,
        platformLoyalty: 1.0,
        specialRecognition: 1.0
      },
      history: []
    };
  }

  private updateReputation(hierarchy: SocialHierarchy, reason: string, points: number): void {
    const reputationMapping: { [key: string]: keyof typeof hierarchy.reputation.breakdown } = {
      'gift_sent': 'generosity',
      'stream_hosted': 'creativity',
      'daily_login': 'reliability',
      'community_interaction': 'engagement',
      'referral_successful': 'influence',
      'event_participation': 'sportsmanship'
    };

    const aspect = reputationMapping[reason];
    if (aspect) {
      const reputationGain = Math.floor(points * 0.1);
      hierarchy.reputation.breakdown[aspect] += reputationGain;
      hierarchy.reputation.overall += reputationGain;

      hierarchy.reputation.history.push({
        date: new Date(),
        score: hierarchy.reputation.overall,
        reason,
        impact: reputationGain
      });

      // Keep only last 100 history entries
      if (hierarchy.reputation.history.length > 100) {
        hierarchy.reputation.history = hierarchy.reputation.history.slice(-100);
      }
    }
  }

  private async checkTierProgression(hierarchy: SocialHierarchy): Promise<void> {
    const tiers = Array.from(this.statusTiers.values()).sort((a, b) => a.numericLevel - b.numericLevel);
    const currentTierIndex = tiers.findIndex(t => t.tier === hierarchy.currentTier);

    if (currentTierIndex < tiers.length - 1) {
      const nextTier = tiers[currentTierIndex + 1];

      if (this.meetsRequirements(hierarchy, nextTier.requirements)) {
        const previousTier = hierarchy.currentTier;
        hierarchy.currentTier = nextTier.tier;
        hierarchy.privileges = nextTier.privileges;

        // Update progression info
        if (currentTierIndex + 2 < tiers.length) {
          const tierAfterNext = tiers[currentTierIndex + 2];
          hierarchy.progression.nextTier = tierAfterNext.tier;
          hierarchy.progression.missingRequirements = this.getMissingRequirements(hierarchy, tierAfterNext.requirements);
        }

        this.emit('tier_progression', {
          userId: hierarchy.userId,
          previousTier,
          newTier: hierarchy.currentTier,
          privileges: hierarchy.privileges
        });
      } else {
        hierarchy.progression.missingRequirements = this.getMissingRequirements(hierarchy, nextTier.requirements);
        hierarchy.progression.progressToNext = this.calculateProgressToNext(hierarchy, nextTier.requirements);
        hierarchy.progression.timeToNext = this.estimateTimeToNext(hierarchy, nextTier.requirements);
      }
    }
  }

  private meetsRequirements(hierarchy: SocialHierarchy, requirements: StatusTier['requirements']): boolean {
    const daysSinceJoin = Math.floor((Date.now() - new Date(hierarchy.decay.lastActivity).getTime()) / (1000 * 60 * 60 * 24));

    return hierarchy.points >= requirements.minimumPoints &&
           daysSinceJoin >= requirements.minimumDays &&
           hierarchy.socialMetrics.totalGiftsGiven >= requirements.minimumGiftsGiven &&
           hierarchy.socialMetrics.followers >= requirements.minimumFollowers &&
           (!requirements.minimumStreams || hierarchy.socialMetrics.streamsHosted >= requirements.minimumStreams) &&
           (!requirements.specialAchievements ||
            requirements.specialAchievements.every(achId =>
              hierarchy.achievements.some(ach => ach.id === achId)));
  }

  private getMissingRequirements(hierarchy: SocialHierarchy, requirements: StatusTier['requirements']): string[] {
    const missing: string[] = [];

    if (hierarchy.points < requirements.minimumPoints) {
      missing.push(`${requirements.minimumPoints - hierarchy.points} more points`);
    }

    if (hierarchy.socialMetrics.totalGiftsGiven < requirements.minimumGiftsGiven) {
      missing.push(`${requirements.minimumGiftsGiven - hierarchy.socialMetrics.totalGiftsGiven} more gifts to send`);
    }

    if (hierarchy.socialMetrics.followers < requirements.minimumFollowers) {
      missing.push(`${requirements.minimumFollowers - hierarchy.socialMetrics.followers} more followers`);
    }

    if (requirements.minimumStreams && hierarchy.socialMetrics.streamsHosted < requirements.minimumStreams) {
      missing.push(`${requirements.minimumStreams - hierarchy.socialMetrics.streamsHosted} more streams to host`);
    }

    return missing;
  }

  private calculateProgressToNext(hierarchy: SocialHierarchy, requirements: StatusTier['requirements']): number {
    const totalRequirements = 5; // Number of requirement categories
    let metRequirements = 0;

    if (hierarchy.points >= requirements.minimumPoints) metRequirements++;
    if (hierarchy.socialMetrics.totalGiftsGiven >= requirements.minimumGiftsGiven) metRequirements++;
    if (hierarchy.socialMetrics.followers >= requirements.minimumFollowers) metRequirements++;
    if (!requirements.minimumStreams || hierarchy.socialMetrics.streamsHosted >= requirements.minimumStreams) metRequirements++;
    if (!requirements.specialAchievements || requirements.specialAchievements.every(achId => hierarchy.achievements.some(ach => ach.id === achId))) metRequirements++;

    return (metRequirements / totalRequirements) * 100;
  }

  private estimateTimeToNext(hierarchy: SocialHierarchy, requirements: StatusTier['requirements']): number {
    const progressionRate = this.calculateProgressionRate(hierarchy);
    const pointsNeeded = Math.max(0, requirements.minimumPoints - hierarchy.points);

    if (progressionRate === 0) return 999; // Unknown/infinite time

    return Math.ceil(pointsNeeded / progressionRate);
  }

  private calculateProgressionRate(hierarchy: SocialHierarchy): number {
    // Calculate based on recent activity - simplified implementation
    const recentHistory = hierarchy.reputation.history.slice(-30); // Last 30 activities
    if (recentHistory.length === 0) return 0;

    const totalPoints = recentHistory.reduce((sum, h) => sum + h.impact, 0);
    const daySpan = Math.max(1, (Date.now() - recentHistory[0].date.getTime()) / (1000 * 60 * 60 * 24));

    return totalPoints / daySpan;
  }

  private calculateTierFromPoints(points: number): string {
    const tiers = Array.from(this.statusTiers.values()).sort((a, b) => b.numericLevel - a.numericLevel);

    for (const tier of tiers) {
      if (points >= tier.requirements.minimumPoints) {
        return tier.tier;
      }
    }

    return 'newcomer';
  }

  private calculateProgressionProbability(hierarchy: SocialHierarchy, predictedTier: string): number {
    const currentTierLevel = this.statusTiers.get(hierarchy.currentTier)!.numericLevel;
    const predictedTierLevel = this.statusTiers.get(predictedTier)!.numericLevel;

    if (predictedTierLevel <= currentTierLevel) return 0.9; // High probability if staying same or going down

    const levelDifference = predictedTierLevel - currentTierLevel;
    const baseProbability = Math.max(0.1, 0.8 - (levelDifference * 0.2));

    // Adjust based on recent activity
    const recentActivityMultiplier = hierarchy.reputation.modifiers.recentActivity;

    return Math.min(0.95, baseProbability * recentActivityMultiplier);
  }

  private generateRecommendedActions(hierarchy: SocialHierarchy): string[] {
    const recommendations: string[] = [];

    if (hierarchy.socialMetrics.totalGiftsGiven < 10) {
      recommendations.push('Send more gifts to streamers to boost generosity reputation');
    }

    if (hierarchy.socialMetrics.followers < 50) {
      recommendations.push('Engage more with the community to gain followers');
    }

    if (hierarchy.socialMetrics.streamsHosted === 0) {
      recommendations.push('Try hosting a stream to unlock streaming achievements');
    }

    if (hierarchy.achievements.length < 5) {
      recommendations.push('Focus on unlocking achievements for bonus points');
    }

    return recommendations.slice(0, 3); // Return top 3 recommendations
  }

  private calculateActivityPoints(activity: { type: string; data: any; value?: number }): number {
    const pointsMap: { [key: string]: number } = {
      'daily_login': 10,
      'gift_sent': 25,
      'stream_hosted': 100,
      'achievement_earned': 500,
      'referral_successful': 200,
      'community_interaction': 15,
      'content_shared': 20
    };

    const basePoints = pointsMap[activity.type] || 5;
    const multiplier = activity.value || 1;

    return Math.floor(basePoints * multiplier);
  }

  private async updateSocialMetrics(userId: string, activity: { type: string; data: any }): Promise<void> {
    const hierarchy = this.userHierarchies.get(userId);
    if (!hierarchy) return;

    switch (activity.type) {
      case 'gift_sent':
        hierarchy.socialMetrics.totalGiftsGiven++;
        break;
      case 'gift_received':
        hierarchy.socialMetrics.totalGiftsReceived++;
        break;
      case 'stream_hosted':
        hierarchy.socialMetrics.streamsHosted++;
        break;
      case 'follower_gained':
        hierarchy.socialMetrics.followers++;
        break;
      case 'following_added':
        hierarchy.socialMetrics.following++;
        break;
    }
  }

  private async updateInfluenceScore(userId: string, activity: { type: string; data: any }): Promise<void> {
    // Update influence metrics based on activity - would integrate with detailed analytics
  }

  private async checkAchievements(userId: string, hierarchy: SocialHierarchy): Promise<void> {
    const unlockedIds = hierarchy.achievements.map(a => a.id);

    for (const [id, achievement] of this.achievements) {
      if (!unlockedIds.includes(id)) {
        if (this.checkAchievementRequirements(hierarchy, achievement)) {
          await this.grantAchievement(userId, id);
        }
      }
    }
  }

  private checkAchievementRequirements(hierarchy: SocialHierarchy, achievement: Achievement): boolean {
    return achievement.requirements.every(req => {
      switch (req.type) {
        case 'gifts_sent':
          return hierarchy.socialMetrics.totalGiftsGiven >= Number(req.value);
        case 'followers':
          return hierarchy.socialMetrics.followers >= Number(req.value);
        case 'coins_spent':
          // Would need to track total spending
          return false;
        case 'login_streak':
          // Would need to track streaks
          return false;
        case 'content_reach':
          // Would need to track viral metrics
          return false;
        case 'referrals':
          // Would integrate with viral growth engine
          return false;
        default:
          return false;
      }
    });
  }

  private calculateOverallInfluence(metrics: SocialHierarchy['socialMetrics']): number {
    return (metrics.followers * 0.3) +
           (metrics.totalGiftsGiven * 0.2) +
           (metrics.streamsHosted * 0.25) +
           (metrics.averageViewers * 0.15) +
           (metrics.communityRating * 0.1);
  }

  private calculateGamingInfluence(hierarchy: SocialHierarchy): number {
    return hierarchy.reputation.breakdown.sportsmanship +
           (hierarchy.achievements.filter(a => a.category === 'gaming').length * 100);
  }

  private calculateStreamingInfluence(hierarchy: SocialHierarchy): number {
    return hierarchy.socialMetrics.streamsHosted * 10 +
           hierarchy.socialMetrics.averageViewers * 5;
  }

  private calculateCommunityInfluence(hierarchy: SocialHierarchy): number {
    return hierarchy.reputation.breakdown.leadership +
           hierarchy.reputation.breakdown.engagement +
           hierarchy.socialMetrics.followers;
  }

  private calculateEconomyInfluence(hierarchy: SocialHierarchy): number {
    return hierarchy.reputation.breakdown.generosity +
           (hierarchy.socialMetrics.totalGiftsGiven * 2);
  }

  private calculateEngagementRate(hierarchy: SocialHierarchy): number {
    const totalActivities = hierarchy.socialMetrics.totalGiftsGiven +
                           hierarchy.socialMetrics.streamsHosted +
                           hierarchy.achievements.length;

    return totalActivities / Math.max(1, hierarchy.socialMetrics.followers) * 100;
  }

  private calculateViralCoefficient(hierarchy: SocialHierarchy): number {
    // Simplified viral coefficient calculation
    return hierarchy.socialMetrics.followers > 0 ?
           Math.min(2.0, hierarchy.reputation.breakdown.influence / 500) : 0;
  }

  private startPeriodicUpdates(): void {
    // Update every 6 hours
    setInterval(() => {
      this.processDecay();
      this.updateCompetitions();
    }, 6 * 60 * 60 * 1000);
  }

  private processDecay(): void {
    for (const [userId, hierarchy] of this.userHierarchies) {
      const daysSinceActivity = Math.floor((Date.now() - hierarchy.decay.lastActivity.getTime()) / (1000 * 60 * 60 * 24));
      const tierDecayRule = this.decaySystem.decayRules.find(rule => rule.tier === hierarchy.currentTier);

      if (tierDecayRule && daysSinceActivity > tierDecayRule.gracePeriod) {
        const decayAmount = Math.floor((daysSinceActivity - tierDecayRule.gracePeriod) * tierDecayRule.decayRate);
        if (decayAmount > 0) {
          hierarchy.points = Math.max(0, hierarchy.points - decayAmount);
          this.emit('status_decay', { userId, pointsLost: decayAmount, tier: hierarchy.currentTier });
        }
      }
    }
  }

  private updateCompetitions(): void {
    const now = new Date();

    for (const [id, competition] of this.activeCompetitions) {
      if (now > competition.duration.endDate) {
        this.finalizeCompetition(id);
      } else {
        this.updateCompetitionRankings(competition);
      }
    }
  }

  private finalizeCompetition(competitionId: string): void {
    const competition = this.activeCompetitions.get(competitionId);
    if (!competition) return;

    // Distribute rewards to top performers
    competition.participants.sort((a, b) => b.score - a.score);

    competition.rewards.forEach((reward, index) => {
      if (index < competition.participants.length) {
        const participant = competition.participants[index];
        this.emit('competition_reward', {
          userId: participant.userId,
          competitionId,
          rank: index + 1,
          rewards: reward
        });
      }
    });

    this.activeCompetitions.delete(competitionId);

    this.emit('competition_completed', {
      competitionId,
      name: competition.name,
      winners: competition.participants.slice(0, 3)
    });
  }

  private updateCompetitionRankings(competition: StatusCompetition): void {
    competition.participants.sort((a, b) => b.score - a.score);
    competition.participants.forEach((participant, index) => {
      participant.rank = index + 1;
    });
  }
}

export default SocialStatusEngine;
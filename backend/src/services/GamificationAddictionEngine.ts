import { EventEmitter } from 'events';
import { logger } from '@/config/logger';
import { aiPersonalization } from './AIHyperPersonalizationEngine';
import { coinLedger } from './CoinLedgerService';
import { CoinTransaction } from '@/models/CoinTransaction';
import { CoinWallet } from '@/models/CoinWallet';

export interface AddictiveLoop {
  id: string;
  name: string;
  type: 'variable_reward' | 'social_validation' | 'progress_illusion' | 'fear_missing_out' | 'sunk_cost' | 'social_pressure';

  // Psychological triggers
  triggers: {
    dopamineRelease: number; // 0-1 intensity
    anticipationBuildup: number; // 0-1 intensity
    socialValidation: number; // 0-1 intensity
    statusThreat: number; // 0-1 intensity
    lossAversion: number; // 0-1 intensity
    collectibleUrge: number; // 0-1 intensity
  };

  // Behavior reinforcement schedule
  reinforcement: {
    schedule: 'fixed_ratio' | 'variable_ratio' | 'fixed_interval' | 'variable_interval' | 'random';
    ratio?: number; // For ratio-based schedules
    interval?: number; // For interval-based schedules (minutes)
    randomness: number; // 0-1 unpredictability factor
  };

  // Engagement mechanics
  mechanics: {
    progressBars: boolean;
    collectibles: boolean;
    streaks: boolean;
    leaderboards: boolean;
    achievements: boolean;
    limitedTime: boolean;
    exclusivity: boolean;
    socialSharing: boolean;
  };

  // Addiction indicators to monitor
  monitoringFlags: {
    maxDailyTriggers: number; // Safety limit
    coolingOffPeriod: number; // Minutes between triggers
    addictionWarningThreshold: number; // Daily trigger limit before warning
  };
}

export interface UserAddictionProfile {
  userId: string;

  // Addiction vulnerability assessment
  vulnerability: {
    impulsivityScore: number; // 0-1 (higher = more vulnerable)
    compulsivityScore: number; // 0-1 (higher = more vulnerable)
    socialValidationNeed: number; // 0-1 (higher = more vulnerable)
    fomoProneness: number; // 0-1 (higher = more vulnerable)
    rewardSensitivity: number; // 0-1 (higher = more vulnerable)
    lossAversionStrength: number; // 0-1 (higher = more vulnerable)
  };

  // Current addiction state
  currentState: {
    engagementHeat: number; // 0-100 current engagement intensity
    streakPressure: number; // 0-100 pressure to maintain streaks
    fomoLevel: number; // 0-100 current fear of missing out
    dopamineDepletion: number; // 0-100 how depleted reward system is
    socialPressure: number; // 0-100 social pressure level
    spendingUrge: number; // 0-100 current urge to spend
  };

  // Behavioral patterns
  behaviorPatterns: {
    sessionFrequency: number; // Sessions per day
    averageSessionLength: number; // Minutes
    bingeSessions: number; // Sessions > 2 hours in last 7 days
    midnight_usage: number; // Late night usage frequency
    compulsiveChecking: number; // App opens without purpose
    rewardSeeking: number; // Actions primarily driven by rewards
  };

  // Active loops and their effectiveness
  activeLoops: {
    [loopId: string]: {
      effectiveness: number; // 0-1 how well it works on this user
      triggerCount: number; // Today's trigger count
      lastTriggered: Date;
      resistanceLevel: number; // 0-1 user's resistance to this loop
    };
  };

  // Safety and ethics monitoring
  safetyMetrics: {
    dailySpending: number;
    weeklyScreenTime: number;
    sleepDisruption: boolean;
    socialIsolation: boolean;
    financialStress: boolean;
    addictionRiskLevel: 'low' | 'moderate' | 'high' | 'critical';
  };

  lastUpdated: Date;

  // Missing properties that the code expects
  engagementLevel: number;
  addictionRisk: number;
  lastActive: Date;
  dailyTriggers: number;
  streakCount: number;
  unlockedAchievements: string[];
  totalAchievements: number;
  lastDailyReward: Date;
  dailyRewardStreak: number;
  activityHistory: Array<{
    timestamp: Date;
    action: string;
    duration: number;
  }>;
  completedChallenges: string[];
  activeChallenges: string[];
  challengeProgress: Record<string, number>;
  level: number;
  experience: number;
  dailyStreak: number;
  weeklyStreak: number;
  monthlyStreak: number;
  longestStreak: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'mythical';

  // Psychological design
  psychology: {
    completionDifficulty: number; // 0-1 (balanced for maximum engagement)
    socialShowoffValue: number; // 0-1 (how much others will notice)
    progressVisibility: number; // 0-1 (how visible progress is)
    collectibleAppeal: number; // 0-1 (appeal to collectors)
  };

  // Requirements (designed to be addictive)
  requirements: {
    type: 'streak' | 'cumulative' | 'skill' | 'social' | 'spending' | 'time' | 'rare_event';
    target: number;
    timeframe?: 'daily' | 'weekly' | 'monthly' | 'lifetime';
    conditions?: string[];
  };

  // Rewards (designed to reinforce behavior)
  rewards: {
    coins: number;
    exclusiveItems: string[];
    statusSymbols: string[];
    socialBroadcast: boolean; // Announce to friends/followers
    rarityBoost: number; // Increases other rare item chances
  };

  // Series and progression
  series?: {
    seriesId: string;
    position: number; // Position in series
    nextAchievement?: string; // Creates anticipation
  };
}

export interface StreakSystem {
  type: 'login' | 'spending' | 'gaming' | 'gifting' | 'social' | 'viewing';
  currentStreak: number;
  longestStreak: number;
  lastActivity: Date;

  // Streak pressure mechanics
  pressureMechanics: {
    reminderFrequency: number; // Minutes between reminders as streak gets longer
    urgencyMultiplier: number; // Multiplies as deadline approaches
    recoveryWindow: number; // Grace period in minutes
    freezeTokens: number; // Tokens to freeze streak if missed
  };

  // Escalating rewards
  rewardEscalation: {
    [milestone: number]: {
      coins: number;
      multiplier: number;
      exclusiveReward?: string;
      socialAnnouncement?: boolean;
    };
  };

  // Streak loss psychology
  lossRecovery: {
    sympathyReward: number; // Coins given when streak breaks
    quickRecoveryBonus: number; // Bonus for immediate restart
    halvingMechanic: boolean; // Next milestone is half the lost streak
  };
}

export interface ProgressBar {
  id: string;
  name: string;
  type: 'experience' | 'achievement' | 'collection' | 'seasonal' | 'social';

  // Psychological manipulation through progress
  design: {
    segmentCount: number; // Number of progress segments
    fastStartBonus: boolean; // First few segments fill quickly
    nearMissAnxiety: boolean; // Deliberately slow near completion
    multiLayerProgress: boolean; // Progress bars within progress bars
    visuallyAppealingReward: string; // What they see they're working toward
  };

  // Current state
  current: number;
  maximum: number;
  segments: Array<{
    threshold: number;
    reward: string;
    claimed: boolean;
  }>;
}

export interface SocialPressureMechanic {
  type: 'leaderboard' | 'peer_comparison' | 'group_challenge' | 'status_symbol' | 'exclusivity';

  // Psychological pressure points
  pressurePoints: {
    rankingAnxiety: number; // 0-1 intensity
    peerComparison: number; // 0-1 intensity
    statusThreat: number; // 0-1 intensity
    exclusionFear: number; // 0-1 intensity
    performancePressure: number; // 0-1 intensity
  };

  // Current social context
  context: {
    userRank: number;
    totalUsers: number;
    peersAbove: string[]; // Friend IDs ahead of user
    peersBelow: string[]; // Friend IDs behind user
    rankingTrend: 'rising' | 'falling' | 'stable';
  };

  // Pressure escalation
  escalation: {
    personalizedMessages: string[]; // Tailored pressure messages
    urgencyTriggers: string[]; // Time-sensitive pressure
    socialShaming: boolean; // Publicly visible performance
    recoveryIncentives: string[]; // Ways to recover lost status
  };
}

/**
 * Gamification Addiction Engine
 * Uses advanced psychological principles to create highly engaging, addictive gameplay loops
 * Includes ethical safeguards and addiction monitoring
 */
export class GamificationAddictionEngine extends EventEmitter {
  private static instance: GamificationAddictionEngine;
  private addictiveLoops: Map<string, AddictiveLoop> = new Map();
  private userProfiles: Map<string, UserAddictionProfile> = new Map();
  private achievements: Map<string, Achievement> = new Map();
  private streakSystems: Map<string, Map<string, StreakSystem>> = new Map(); // userId -> streakType -> system
  private progressBars: Map<string, Map<string, ProgressBar>> = new Map(); // userId -> barId -> bar
  private socialPressure: Map<string, SocialPressureMechanic[]> = new Map();

  // Ethical safeguards
  private readonly ADDICTION_SAFEGUARDS = {
    MAX_DAILY_TRIGGERS: 50,
    COOLING_OFF_MINIMUM: 30, // minutes
    CRITICAL_ADDICTION_THRESHOLD: 80,
    MANDATORY_BREAK_DURATION: 240, // minutes (4 hours)
    SPENDING_VELOCITY_ALERT: 5000, // coins per hour
    BINGE_SESSION_THRESHOLD: 180 // minutes
  };

  private constructor() {
    super();
    this.initializeAddictiveLoops();
    this.initializeAchievements();
    this.startAddictionMonitoring();
    this.startBehavioralReinforcementEngine();
  }

  static getInstance(): GamificationAddictionEngine {
    if (!GamificationAddictionEngine.instance) {
      GamificationAddictionEngine.instance = new GamificationAddictionEngine();
    }
    return GamificationAddictionEngine.instance;
  }

  /**
   * Trigger an addictive loop for a user (with ethical safeguards)
   */
  async triggerAddictiveLoop(
    userId: string,
    loopId: string,
    context: {
      action: string;
      intensity?: number; // 0-1 override intensity
      skipSafetyChecks?: boolean; // Only for testing/admin
    }
  ): Promise<{
    triggered: boolean;
    effect: any;
    safetyBlock?: string;
    nextTriggerTime?: Date;
  }> {
    const loop = this.addictiveLoops.get(loopId);
    if (!loop) {
      throw new Error('Addictive loop not found');
    }

    const profile = await this.getUserAddictionProfile(userId);

    // Safety checks first (unless explicitly skipped)
    if (!context.skipSafetyChecks) {
      const safetyCheck = await this.performSafetyCheck(userId, loopId, profile);
      if (!safetyCheck.safe) {
        return {
          triggered: false,
          effect: null,
          safetyBlock: safetyCheck.reason,
          nextTriggerTime: safetyCheck.nextAllowedTime
        };
      }
    }

    // Calculate trigger effectiveness for this user
    const effectiveness = this.calculateLoopEffectiveness(loop, profile);

    // Generate the addictive effect
    const effect = await this.generateAddictiveEffect(userId, loop, effectiveness, context);

    // Update user's addiction profile
    await this.updateAddictionProfile(userId, loopId, effect);

    // Track the trigger for monitoring
    this.trackTriggerForEthics(userId, loopId, effect);

    this.emit('addictiveLoopTriggered', {
      userId,
      loopId,
      effect,
      effectiveness,
      timestamp: new Date()
    });

    return {
      triggered: true,
      effect,
      nextTriggerTime: new Date(Date.now() + (loop.monitoringFlags.coolingOffPeriod * 60000))
    };
  }

  /**
   * Get personalized achievements for user (designed to be addictive)
   */
  async getPersonalizedAchievements(userId: string): Promise<Array<{
    achievement: Achievement;
    progress: number;
    timeToCompletion: string;
    addictionHooks: string[];
    urgencyLevel: number;
  }>> {
    const profile = await this.getUserAddictionProfile(userId);
    const userAchievements = [];

    for (const achievement of this.achievements.values()) {
      const progress = await this.calculateAchievementProgress(userId, achievement);

      // Skip completed achievements
      if (progress >= 1.0) continue;

      // Calculate psychological hooks for this achievement
      const addictionHooks = this.calculateAchievementHooks(achievement, profile, progress);

      // Calculate urgency (near completion = high urgency)
      const urgencyLevel = this.calculateUrgencyLevel(progress, achievement);

      // Estimate time to completion (creates anticipation)
      const timeToCompletion = this.estimateCompletionTime(userId, achievement, progress);

      userAchievements.push({
        achievement,
        progress,
        timeToCompletion,
        addictionHooks,
        urgencyLevel
      });
    }

    // Sort by addiction potential and urgency
    userAchievements.sort((a, b) => {
      const scoreA = (a.urgencyLevel * 0.6) + (a.addictionHooks.length * 0.4);
      const scoreB = (b.urgencyLevel * 0.6) + (b.addictionHooks.length * 0.4);
      return scoreB - scoreA;
    });

    return userAchievements.slice(0, 12); // Limit to prevent overwhelm
  }

  /**
   * Update and manage user streaks (highly addictive mechanic)
   */
  async updateStreakSystem(
    userId: string,
    streakType: StreakSystem['type'],
    action: 'increment' | 'break' | 'freeze'
  ): Promise<{
    streak: StreakSystem;
    milestone?: any;
    pressureLevel: number;
    nextMilestone?: number;
    emergencyRecovery?: any;
  }> {
    let userStreaks = this.streakSystems.get(userId);
    if (!userStreaks) {
      userStreaks = new Map();
      this.streakSystems.set(userId, userStreaks);
    }

    let streak = userStreaks.get(streakType);
    if (!streak) {
      streak = this.initializeStreak(streakType);
      userStreaks.set(streakType, streak);
    }

    const oldStreak = streak.currentStreak;
    let milestone = null;
    let emergencyRecovery = null;

    switch (action) {
      case 'increment':
        streak.currentStreak += 1;
        streak.lastActivity = new Date();
        if (streak.currentStreak > streak.longestStreak) {
          streak.longestStreak = streak.currentStreak;
        }

        // Check for milestone rewards
        milestone = this.checkStreakMilestone(streak);
        break;

      case 'break':
        const brokenStreakLength = streak.currentStreak;
        streak.currentStreak = 0;
        streak.lastActivity = new Date();

        // Generate sympathetic recovery offer (keeps users engaged after failure)
        emergencyRecovery = this.generateEmergencyRecovery(userId, streakType, brokenStreakLength);
        break;

      case 'freeze':
        // Use freeze token (premium feature to maintain streaks)
        if (streak.pressureMechanics.freezeTokens > 0) {
          streak.pressureMechanics.freezeTokens -= 1;
          streak.lastActivity = new Date();
        }
        break;
    }

    // Calculate current pressure level
    const pressureLevel = this.calculateStreakPressureForStreak(streak);

    // Find next milestone for anticipation
    const nextMilestone = this.findNextMilestone(streak);

    this.emit('streakUpdated', {
      userId,
      streakType,
      action,
      oldStreak,
      newStreak: streak.currentStreak,
      pressureLevel,
      milestone,
      emergencyRecovery
    });

    return {
      streak,
      milestone,
      pressureLevel,
      nextMilestone,
      emergencyRecovery
    };
  }

  /**
   * Generate progress bars designed to be addictive
   */
  async generateAddictiveProgressBar(
    userId: string,
    type: ProgressBar['type'],
    context: any
  ): Promise<ProgressBar> {
    const profile = await this.getUserAddictionProfile(userId);

    // Design progress bar to exploit psychological vulnerabilities
    const progressBar: ProgressBar = {
      id: `progress_${type}_${Date.now()}`,
      name: this.generateProgressBarName(type, context),
      type,
      design: {
        segmentCount: this.calculateOptimalSegmentCount(profile, type),
        fastStartBonus: true, // Always give initial success
        nearMissAnxiety: profile.vulnerability.fomoProneness > 0.6, // Near-completion slow down
        multiLayerProgress: profile.vulnerability.compulsivityScore > 0.7,
        visuallyAppealingReward: this.selectVisuallyAppealingReward(profile, type)
      },
      current: 0,
      maximum: 100, // Will be adjusted based on design
      segments: []
    };

    // Generate segments with carefully designed reward schedule
    progressBar.segments = this.generateProgressSegments(progressBar, profile);

    // Store user's progress bar
    let userProgressBars = this.progressBars.get(userId);
    if (!userProgressBars) {
      userProgressBars = new Map();
      this.progressBars.set(userId, userProgressBars);
    }
    userProgressBars.set(progressBar.id, progressBar);

    return progressBar;
  }

  /**
   * Generate social pressure mechanics
   */
  async generateSocialPressure(
    userId: string,
    context: 'leaderboard' | 'peer_comparison' | 'group_challenge'
  ): Promise<SocialPressureMechanic> {
    const profile = await this.getUserAddictionProfile(userId);

    // Get user's social context
    const socialContext = await this.analyzeSocialContext(userId);

    const pressureMechanic: SocialPressureMechanic = {
      type: context,
      pressurePoints: {
        rankingAnxiety: profile.vulnerability.socialValidationNeed * 0.8,
        peerComparison: profile.vulnerability.socialValidationNeed * 0.9,
        statusThreat: profile.vulnerability.lossAversionStrength * 0.7,
        exclusionFear: profile.vulnerability.fomoProneness * 0.8,
        performancePressure: profile.vulnerability.compulsivityScore * 0.6
      },
      context: socialContext,
      escalation: {
        personalizedMessages: this.generatePressureMessages(profile, socialContext),
        urgencyTriggers: this.generateUrgencyTriggers(profile, context),
        socialShaming: profile.vulnerability.socialValidationNeed > 0.7,
        recoveryIncentives: this.generateRecoveryIncentives(profile, socialContext)
      }
    };

    // Store pressure mechanic
    const userPressureMechanics = this.socialPressure.get(userId) || [];
    userPressureMechanics.push(pressureMechanic);
    this.socialPressure.set(userId, userPressureMechanics);

    return pressureMechanic;
  }

  /**
   * Private implementation methods
   */
  private initializeAddictiveLoops(): void {
    const loops: AddictiveLoop[] = [
      {
        id: 'variable_reward_gaming',
        name: 'Variable Reward Gaming Loop',
        type: 'variable_reward',
        triggers: {
          dopamineRelease: 0.9,
          anticipationBuildup: 0.8,
          socialValidation: 0.3,
          statusThreat: 0.2,
          lossAversion: 0.6,
          collectibleUrge: 0.4
        },
        reinforcement: {
          schedule: 'variable_ratio',
          ratio: 3.5, // Average 3.5 actions per reward
          randomness: 0.7
        },
        mechanics: {
          progressBars: true,
          collectibles: true,
          streaks: true,
          leaderboards: false,
          achievements: true,
          limitedTime: false,
          exclusivity: false,
          socialSharing: true
        },
        monitoringFlags: {
          maxDailyTriggers: 30,
          coolingOffPeriod: 15,
          addictionWarningThreshold: 25
        }
      },
      {
        id: 'social_validation_gifting',
        name: 'Social Validation Gifting Loop',
        type: 'social_validation',
        triggers: {
          dopamineRelease: 0.7,
          anticipationBuildup: 0.6,
          socialValidation: 0.95,
          statusThreat: 0.4,
          lossAversion: 0.3,
          collectibleUrge: 0.2
        },
        reinforcement: {
          schedule: 'variable_interval',
          interval: 45, // Average 45 minutes
          randomness: 0.8
        },
        mechanics: {
          progressBars: false,
          collectibles: false,
          streaks: true,
          leaderboards: true,
          achievements: true,
          limitedTime: true,
          exclusivity: true,
          socialSharing: true
        },
        monitoringFlags: {
          maxDailyTriggers: 20,
          coolingOffPeriod: 30,
          addictionWarningThreshold: 15
        }
      },
      {
        id: 'fomo_limited_offers',
        name: 'FOMO Limited Offers Loop',
        type: 'fear_missing_out',
        triggers: {
          dopamineRelease: 0.6,
          anticipationBuildup: 0.9,
          socialValidation: 0.5,
          statusThreat: 0.8,
          lossAversion: 0.95,
          collectibleUrge: 0.9
        },
        reinforcement: {
          schedule: 'random',
          randomness: 0.95
        },
        mechanics: {
          progressBars: true,
          collectibles: true,
          streaks: false,
          leaderboards: false,
          achievements: false,
          limitedTime: true,
          exclusivity: true,
          socialSharing: false
        },
        monitoringFlags: {
          maxDailyTriggers: 8,
          coolingOffPeriod: 120,
          addictionWarningThreshold: 6
        }
      },
      {
        id: 'sunk_cost_progression',
        name: 'Sunk Cost Progression Loop',
        type: 'sunk_cost',
        triggers: {
          dopamineRelease: 0.5,
          anticipationBuildup: 0.7,
          socialValidation: 0.2,
          statusThreat: 0.6,
          lossAversion: 0.9,
          collectibleUrge: 0.7
        },
        reinforcement: {
          schedule: 'fixed_interval',
          interval: 720, // 12 hours
          randomness: 0.3
        },
        mechanics: {
          progressBars: true,
          collectibles: true,
          streaks: true,
          leaderboards: false,
          achievements: true,
          limitedTime: false,
          exclusivity: false,
          socialSharing: false
        },
        monitoringFlags: {
          maxDailyTriggers: 4,
          coolingOffPeriod: 360,
          addictionWarningThreshold: 3
        }
      }
    ];

    loops.forEach(loop => {
      this.addictiveLoops.set(loop.id, loop);
    });

    logger.info(`Initialized ${loops.length} addictive loops`);
  }

  private initializeAchievements(): void {
    const achievements: Achievement[] = [
      {
        id: 'first_gift',
        name: 'First Spark',
        description: 'Send your first gift and light up someone\'s day',
        tier: 'bronze',
        psychology: {
          completionDifficulty: 0.1, // Very easy first achievement
          socialShowoffValue: 0.3,
          progressVisibility: 0.9,
          collectibleAppeal: 0.7
        },
        requirements: {
          type: 'cumulative',
          target: 1,
          timeframe: 'lifetime'
        },
        rewards: {
          coins: 50,
          exclusiveItems: ['beginner_badge'],
          statusSymbols: ['gift_giver'],
          socialBroadcast: true,
          rarityBoost: 0.05
        }
      },
      {
        id: 'gift_streak_legend',
        name: 'Gift Streak Legend',
        description: 'Maintain a 30-day gifting streak',
        tier: 'mythical',
        psychology: {
          completionDifficulty: 0.85, // Very difficult, creates obsession
          socialShowoffValue: 0.95,
          progressVisibility: 1.0,
          collectibleAppeal: 0.9
        },
        requirements: {
          type: 'streak',
          target: 30,
          timeframe: 'daily'
        },
        rewards: {
          coins: 10000,
          exclusiveItems: ['legendary_halo', 'eternal_flame'],
          statusSymbols: ['streak_master'],
          socialBroadcast: true,
          rarityBoost: 0.5
        },
        series: {
          seriesId: 'gift_streaks',
          position: 5,
          nextAchievement: undefined // Final in series
        }
      },
      {
        id: 'whale_spender',
        name: 'Ocean\'s Generosity',
        description: 'Spend 100,000 coins in a single month',
        tier: 'diamond',
        psychology: {
          completionDifficulty: 0.9, // Very expensive, creates pressure
          socialShowoffValue: 0.8,
          progressVisibility: 0.7,
          collectibleAppeal: 0.6
        },
        requirements: {
          type: 'spending',
          target: 100000,
          timeframe: 'monthly'
        },
        rewards: {
          coins: 25000, // High reward to offset spending
          exclusiveItems: ['whale_crown', 'ocean_throne'],
          statusSymbols: ['mega_patron'],
          socialBroadcast: true,
          rarityBoost: 0.3
        }
      }
    ];

    achievements.forEach(achievement => {
      this.achievements.set(achievement.id, achievement);
    });

    logger.info(`Initialized ${achievements.length} achievements`);
  }

  private async getUserAddictionProfile(userId: string): Promise<UserAddictionProfile> {
    let profile = this.userProfiles.get(userId);

    if (!profile) {
      profile = await this.buildAddictionProfile(userId);
      this.userProfiles.set(userId, profile);
    }

    return profile;
  }

  private async buildAddictionProfile(userId: string): Promise<UserAddictionProfile> {
    // Get base psychological profile from AI personalization
    const aiProfile = await aiPersonalization.getUserProfile(userId);

    // Analyze transaction patterns for addiction indicators
    const transactions = await CoinTransaction.find({ userId }).limit(200).sort({ createdAt: -1 });

    const profile: UserAddictionProfile = {
      userId,
      vulnerability: {
        impulsivityScore: aiProfile.behaviorPatterns.impulsivityScore,
        compulsivityScore: this.calculateCompulsivity(transactions),
        socialValidationNeed: aiProfile.behaviorPatterns.socialConnectedness,
        fomoProneness: aiProfile.emotionalState.fomo,
        rewardSensitivity: this.calculateRewardSensitivity(transactions),
        lossAversionStrength: aiProfile.behaviorPatterns.riskTolerance // Inverse relationship
      },
      currentState: {
        engagementHeat: aiProfile.emotionalState.engagementLevel * 100,
        streakPressure: this.calculateStreakPressure(userId),
        fomoLevel: aiProfile.emotionalState.fomo * 100,
        dopamineDepletion: this.calculateDopamineDepletion(transactions),
        socialPressure: this.calculateSocialPressure(userId),
        spendingUrge: aiProfile.predictions.spendProbability * 100
      },
      behaviorPatterns: {
        sessionFrequency: this.calculateSessionFrequency(transactions),
        averageSessionLength: aiProfile.behaviorPatterns.sessionDuration,
        bingeSessions: this.calculateBingeSessions(transactions),
        midnight_usage: this.calculateMidnightUsage(transactions),
        compulsiveChecking: this.calculateCompulsiveChecking(transactions),
        rewardSeeking: this.calculateRewardSeeking(transactions)
      },
      activeLoops: {},
      safetyMetrics: {
        dailySpending: this.calculateDailySpending(transactions),
        weeklyScreenTime: 0, // Would integrate with app analytics
        sleepDisruption: this.detectSleepDisruption(transactions),
        socialIsolation: false, // Would need social graph analysis
        financialStress: this.detectFinancialStress(transactions),
        addictionRiskLevel: 'low' // Will be calculated
      },
      lastUpdated: new Date(),
      
      // Missing properties that the code expects
      engagementLevel: 50, // Default value
      addictionRisk: 0.5, // Will be calculated later
      lastActive: new Date(),
      dailyTriggers: 0,
      streakCount: 0,
      unlockedAchievements: [],
      totalAchievements: 0,
      lastDailyReward: new Date(),
      dailyRewardStreak: 0,
      activityHistory: [],
      completedChallenges: [],
      activeChallenges: [],
      challengeProgress: {},
      level: 1,
      experience: 0,
      dailyStreak: 0,
      weeklyStreak: 0,
      monthlyStreak: 0,
      longestStreak: 0
    };

    // Calculate overall addiction risk level
    profile.safetyMetrics.addictionRiskLevel = this.calculateAddictionRisk(profile);

    return profile;
  }

  private async performSafetyCheck(
    userId: string,
    loopId: string,
    profile: UserAddictionProfile
  ): Promise<{
    safe: boolean;
    reason?: string;
    nextAllowedTime?: Date;
  }> {
    const loop = this.addictiveLoops.get(loopId);
    if (!loop) return { safe: false, reason: 'Loop not found' };

    // Check daily trigger limits
    const activeLoop = profile.activeLoops[loopId];
    if (activeLoop && activeLoop.triggerCount >= loop.monitoringFlags.maxDailyTriggers) {
      return {
        safe: false,
        reason: 'Daily trigger limit exceeded',
        nextAllowedTime: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
      };
    }

    // Check cooling off period
    if (activeLoop && activeLoop.lastTriggered) {
      const timeSinceLastTrigger = Date.now() - activeLoop.lastTriggered.getTime();
      const coolingOffMs = loop.monitoringFlags.coolingOffPeriod * 60 * 1000;

      if (timeSinceLastTrigger < coolingOffMs) {
        return {
          safe: false,
          reason: 'Cooling off period active',
          nextAllowedTime: new Date(activeLoop.lastTriggered.getTime() + coolingOffMs)
        };
      }
    }

    // Check critical addiction level
    if (profile.safetyMetrics.addictionRiskLevel === 'critical') {
      return {
        safe: false,
        reason: 'Critical addiction risk level - mandatory break required',
        nextAllowedTime: new Date(Date.now() + this.ADDICTION_SAFEGUARDS.MANDATORY_BREAK_DURATION * 60000)
      };
    }

    // Check spending velocity
    if (profile.safetyMetrics.dailySpending > this.ADDICTION_SAFEGUARDS.SPENDING_VELOCITY_ALERT) {
      return {
        safe: false,
        reason: 'High spending velocity detected - cooling off required',
        nextAllowedTime: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
      };
    }

    return { safe: true };
  }

  private calculateLoopEffectiveness(loop: AddictiveLoop, profile: UserAddictionProfile): number {
    let effectiveness = 0.5; // Base effectiveness

    // Match loop triggers with user vulnerabilities
    effectiveness += loop.triggers.dopamineRelease * profile.vulnerability.rewardSensitivity * 0.3;
    effectiveness += loop.triggers.socialValidation * profile.vulnerability.socialValidationNeed * 0.25;
    effectiveness += loop.triggers.lossAversion * profile.vulnerability.lossAversionStrength * 0.2;
    effectiveness += loop.triggers.collectibleUrge * profile.vulnerability.compulsivityScore * 0.15;
    effectiveness += loop.triggers.statusThreat * profile.vulnerability.socialValidationNeed * 0.1;

    // Account for current state
    effectiveness *= (0.7 + (profile.currentState.engagementHeat / 100) * 0.3);

    // Account for resistance buildup
    const activeLoop = profile.activeLoops[loop.id];
    if (activeLoop) {
      effectiveness *= (1 - activeLoop.resistanceLevel * 0.3);
    }

    return Math.max(0.1, Math.min(1.0, effectiveness));
  }

  private async generateAddictiveEffect(
    userId: string,
    loop: AddictiveLoop,
    effectiveness: number,
    context: any
  ): Promise<any> {
    const profile = await this.getUserAddictionProfile(userId);

    const effect = {
      type: loop.type,
      intensity: effectiveness,
      duration: Math.floor(effectiveness * 300000), // Up to 5 minutes
      triggers: [],
      rewards: [],
      pressures: [],
      visuals: [],
      sounds: []
    };

    // Generate specific effects based on loop type
    switch (loop.type) {
      case 'variable_reward':
        effect.rewards = this.generateVariableRewards(effectiveness, profile);
        effect.visuals = ['slot_machine_effect', 'reward_burst'];
        effect.sounds = ['reward_chime', 'celebration'];
        break;

      case 'social_validation':
        effect.pressures = this.generateSocialValidationPressures(effectiveness, profile);
        effect.visuals = ['social_spotlight', 'peer_comparison'];
        effect.sounds = ['social_notification', 'achievement_unlock'];
        break;

      case 'fear_missing_out':
        effect.triggers = this.generateFOMOTriggers(effectiveness, profile);
        effect.visuals = ['countdown_timer', 'scarcity_indicator'];
        effect.sounds = ['urgency_alert', 'ticking_clock'];
        break;

      case 'sunk_cost':
        effect.pressures = this.generateSunkCostPressures(effectiveness, profile);
        effect.visuals = ['progress_bar_near_complete', 'investment_display'];
        effect.sounds = ['progress_notification'];
        break;
    }

    return effect;
  }

  private async updateAddictionProfile(userId: string, loopId: string, effect: any): Promise<void> {
    const profile = await this.getUserAddictionProfile(userId);

    // Initialize loop tracking if not exists
    if (!profile.activeLoops[loopId]) {
      profile.activeLoops[loopId] = {
        effectiveness: 0,
        triggerCount: 0,
        lastTriggered: new Date(),
        resistanceLevel: 0
      };
    }

    const activeLoop = profile.activeLoops[loopId];

    // Update loop statistics
    activeLoop.triggerCount += 1;
    activeLoop.lastTriggered = new Date();
    activeLoop.effectiveness = (activeLoop.effectiveness * 0.9) + (effect.intensity * 0.1); // Weighted average

    // Build resistance over time (prevents oversaturation)
    activeLoop.resistanceLevel = Math.min(0.8, activeLoop.resistanceLevel + 0.02);

    // Update current state based on effect
    profile.currentState.engagementHeat = Math.min(100, profile.currentState.engagementHeat + (effect.intensity * 10));
    profile.currentState.dopamineDepletion += effect.intensity * 5; // Dopamine gets depleted with use

    profile.lastUpdated = new Date();
    this.userProfiles.set(userId, profile);
  }

  // Helper methods for calculations (simplified implementations)
  private calculateCompulsivity(transactions: any[]): number {
    // Analyze transaction patterns for compulsive behavior
    let compulsivityScore = 0;

    // Rapid consecutive transactions
    let rapidTransactions = 0;
    for (let i = 1; i < transactions.length; i++) {
      const timeDiff = transactions[i - 1].createdAt.getTime() - transactions[i].createdAt.getTime();
      if (timeDiff < 60000) { // Less than 1 minute apart
        rapidTransactions++;
      }
    }
    compulsivityScore += Math.min(0.5, rapidTransactions / transactions.length);

    // Late night activity (compulsive behavior indicator)
    const lateNightTransactions = transactions.filter(tx => {
      const hour = new Date(tx.createdAt).getHours();
      return hour < 6 || hour > 23;
    }).length;
    compulsivityScore += Math.min(0.3, lateNightTransactions / transactions.length);

    return Math.min(1.0, compulsivityScore);
  }

  private calculateRewardSensitivity(transactions: any[]): number {
    // Analyze how responsive user is to rewards
    const rewardTransactions = transactions.filter(tx => tx.type === 'reward');
    if (rewardTransactions.length === 0) return 0.5;

    // Users who frequently claim rewards are more reward-sensitive
    const rewardRatio = rewardTransactions.length / transactions.length;
    return Math.min(1.0, rewardRatio * 2);
  }

  private calculateStreakPressure(userId: string): number {
    const userStreaks = this.streakSystems.get(userId);
    if (!userStreaks) return 0;

    let totalPressure = 0;
    let streakCount = 0;

    for (const streak of userStreaks.values()) {
      if (streak.currentStreak > 0) {
        const pressure = this.calculateStreakPressureForStreak(streak);
        totalPressure += pressure;
        streakCount++;
      }
    }

    return streakCount > 0 ? totalPressure / streakCount : 0;
  }

  private calculateStreakPressureForStreak(streak: StreakSystem): number {
    const timeSinceLastActivity = Date.now() - streak.lastActivity.getTime();
    const hoursSinceActivity = timeSinceLastActivity / (60 * 60 * 1000);

    // Pressure increases as time passes and streak gets longer
    let pressure = Math.min(100, streak.currentStreak * 2); // Base pressure from streak length

    if (hoursSinceActivity > 20) {
      pressure *= 2; // Double pressure if approaching 24-hour deadline
    }

    return pressure;
  }

  private calculateDopamineDepletion(transactions: any[]): number {
    // Analyze recent reward frequency to estimate dopamine depletion
    const recentRewards = transactions.filter(tx =>
      tx.type === 'reward' &&
      Date.now() - new Date(tx.createdAt).getTime() < 24 * 60 * 60 * 1000
    );

    // More recent rewards = more depletion
    return Math.min(100, recentRewards.length * 8);
  }

  // Additional helper methods would continue here...
  // This is a comprehensive foundation for the addiction engine

  private generateVariableRewards(effectiveness: number, profile: UserAddictionProfile): any[] {
    const rewards = [];

    // Random reward generation based on effectiveness
    if (Math.random() < effectiveness) {
      rewards.push({
        type: 'coins',
        amount: Math.floor(Math.random() * 100) + 10,
        rarity: 'common'
      });
    }

    if (Math.random() < effectiveness * 0.3) {
      rewards.push({
        type: 'achievement_progress',
        achievementId: 'random_selection',
        progress: Math.floor(Math.random() * 20) + 5
      });
    }

    return rewards;
  }

  private generateSocialValidationPressures(effectiveness: number, profile: UserAddictionProfile): any[] {
    return [
      {
        type: 'peer_comparison',
        message: 'Sarah just reached level 15! Can you catch up?',
        intensity: effectiveness * profile.vulnerability.socialValidationNeed
      }
    ];
  }

  private generateFOMOTriggers(effectiveness: number, profile: UserAddictionProfile): any[] {
    return [
      {
        type: 'limited_time',
        message: 'Special offer expires in 2 hours!',
        urgency: effectiveness * profile.vulnerability.fomoProneness
      }
    ];
  }

  private generateSunkCostPressures(effectiveness: number, profile: UserAddictionProfile): any[] {
    return [
      {
        type: 'progress_reminder',
        message: 'You\'re 85% complete! Don\'t lose your progress now!',
        pressure: effectiveness * profile.vulnerability.lossAversionStrength
      }
    ];
  }

  // Simplified implementations of other helper methods...
  private calculateSessionFrequency(transactions: any[]): number { return 5; }
  private calculateBingeSessions(transactions: any[]): number { return 2; }
  private calculateMidnightUsage(transactions: any[]): number { return 0.3; }
  private calculateCompulsiveChecking(transactions: any[]): number { return 0.4; }
  private calculateRewardSeeking(transactions: any[]): number { return 0.6; }
  private calculateDailySpending(transactions: any[]): number { return 500; }
  private detectSleepDisruption(transactions: any[]): boolean { return false; }
  private detectFinancialStress(transactions: any[]): boolean { return false; }
  private calculateSocialPressure(userId: string): number { return 30; }

  private calculateAddictionRisk(profile: UserAddictionProfile): 'low' | 'moderate' | 'high' | 'critical' {
    let riskScore = 0;

    // Vulnerability factors
    riskScore += profile.vulnerability.impulsivityScore * 20;
    riskScore += profile.vulnerability.compulsivityScore * 25;
    riskScore += profile.vulnerability.fomoProneness * 15;

    // Behavioral factors
    riskScore += profile.currentState.engagementHeat * 0.2;
    riskScore += profile.currentState.spendingUrge * 0.15;
    riskScore += profile.behaviorPatterns.bingeSessions * 5;

    if (riskScore > 80) return 'critical';
    if (riskScore > 60) return 'high';
    if (riskScore > 40) return 'moderate';
    return 'low';
  }

  // More helper methods for achievements, streaks, progress bars, etc. would continue...

  private trackTriggerForEthics(userId: string, loopId: string, effect: any): void {
    // Track for ethics monitoring and research
    this.emit('ethicsTracking', {
      userId,
      loopId,
      effectIntensity: effect.intensity,
      timestamp: new Date(),
      safeguardsActive: true
    });
  }

  // Background processes
  private startAddictionMonitoring(): void {
    // Monitor for addiction signs every 15 minutes
    setInterval(async () => {
      await this.monitorAddictionSigns();
    }, 900000);

    // Reset daily trigger counters at midnight
    setInterval(() => {
      this.resetDailyTriggerCounters();
    }, 86400000); // 24 hours
  }

  private startBehavioralReinforcementEngine(): void {
    // Continuously analyze user behavior and trigger appropriate loops
    setInterval(async () => {
      await this.analyzeBehaviorForTriggers();
    }, 300000); // 5 minutes
  }

  private async monitorAddictionSigns(): Promise<void> {
    for (const [userId, profile] of this.userProfiles.entries()) {
      if (profile.safetyMetrics.addictionRiskLevel === 'high' || profile.safetyMetrics.addictionRiskLevel === 'critical') {
        this.emit('addictionWarning', {
          userId,
          riskLevel: profile.safetyMetrics.addictionRiskLevel,
          metrics: profile.safetyMetrics,
          timestamp: new Date()
        });

        // Trigger intervention if critical
        if (profile.safetyMetrics.addictionRiskLevel === 'critical') {
          await this.triggerAddictionIntervention(userId, profile);
        }
      }
    }
  }

  private resetDailyTriggerCounters(): void {
    for (const profile of this.userProfiles.values()) {
      for (const loop of Object.values(profile.activeLoops)) {
        loop.triggerCount = 0;
      }
    }
  }

  private async analyzeBehaviorForTriggers(): Promise<void> {
    // This would analyze recent user behavior and automatically trigger appropriate loops
    // Implementation would be based on real-time behavior analysis
  }

  private async triggerAddictionIntervention(userId: string, profile: UserAddictionProfile): Promise<void> {
    // Implement intervention strategies for users at critical addiction risk
    this.emit('addictionIntervention', {
      userId,
      interventionType: 'mandatory_break',
      duration: this.ADDICTION_SAFEGUARDS.MANDATORY_BREAK_DURATION,
      timestamp: new Date()
    });
  }

  // Placeholder implementations for achievement and streak methods
  private async calculateAchievementProgress(userId: string, achievement: Achievement): Promise<number> {
    // Implementation would calculate actual progress based on user data
    return Math.random(); // Simplified
  }

  private calculateAchievementHooks(achievement: Achievement, profile: UserAddictionProfile, progress: number): string[] {
    const hooks = [];
    if (progress > 0.8) hooks.push('near_completion');
    if (achievement.psychology.socialShowoffValue > 0.7) hooks.push('social_bragging');
    if (achievement.tier === 'mythical') hooks.push('extreme_rarity');
    return hooks;
  }

  private calculateUrgencyLevel(progress: number, achievement: Achievement): number {
    return progress * 10 * achievement.psychology.completionDifficulty;
  }

  private estimateCompletionTime(userId: string, achievement: Achievement, progress: number): string {
    const remaining = 1 - progress;
    const estimatedHours = remaining * 24 * achievement.psychology.completionDifficulty;
    return `${Math.ceil(estimatedHours)} hours`;
  }

  private initializeStreak(streakType: StreakSystem['type']): StreakSystem {
    return {
      type: streakType,
      currentStreak: 0,
      longestStreak: 0,
      lastActivity: new Date(),
      pressureMechanics: {
        reminderFrequency: 60,
        urgencyMultiplier: 1.5,
        recoveryWindow: 120,
        freezeTokens: 3
      },
      rewardEscalation: {
        7: { coins: 500, multiplier: 1.1, socialAnnouncement: true },
        30: { coins: 5000, multiplier: 1.5, exclusiveReward: 'streak_master_badge' },
        100: { coins: 25000, multiplier: 2.0, exclusiveReward: 'legendary_streak_crown' }
      },
      lossRecovery: {
        sympathyReward: 100,
        quickRecoveryBonus: 200,
        halvingMechanic: true
      }
    };
  }

  private checkStreakMilestone(streak: StreakSystem): any {
    const milestone = streak.rewardEscalation[streak.currentStreak];
    return milestone || null;
  }

  private generateEmergencyRecovery(userId: string, streakType: string, brokenStreakLength: number): any {
    return {
      type: 'emergency_recovery',
      sympathyMessage: `We know losing a ${brokenStreakLength}-day streak hurts. Here's something to help!`,
      sympathyReward: Math.floor(brokenStreakLength * 10),
      quickRestartBonus: Math.floor(brokenStreakLength * 5),
      halvingTarget: Math.floor(brokenStreakLength / 2)
    };
  }

  private findNextMilestone(streak: StreakSystem): number {
    const milestones = Object.keys(streak.rewardEscalation).map(Number).sort((a, b) => a - b);
    return milestones.find(m => m > streak.currentStreak) || 0;
  }

  private calculateOptimalSegmentCount(profile: UserAddictionProfile, type: string): number {
    // More segments for compulsive users (more frequent rewards)
    const baseSegments = 10;
    const compulsivityBonus = profile.vulnerability.compulsivityScore * 5;
    return Math.floor(baseSegments + compulsivityBonus);
  }

  private generateProgressBarName(type: string, context: any): string {
    const names = {
      experience: 'Level Progress',
      achievement: 'Achievement Hunt',
      collection: 'Collection Master',
      seasonal: 'Festival Journey',
      social: 'Social Rising'
    };
    return names[type as keyof typeof names] || 'Progress';
  }

  private selectVisuallyAppealingReward(profile: UserAddictionProfile, type: string): string {
    if (profile.vulnerability.socialValidationNeed > 0.7) return 'social_status_symbol';
    if (profile.vulnerability.compulsivityScore > 0.7) return 'rare_collectible';
    return 'coin_reward';
  }

  private generateProgressSegments(progressBar: ProgressBar, profile: UserAddictionProfile): any[] {
    const segments = [];
    const segmentSize = 100 / progressBar.design.segmentCount;

    for (let i = 1; i <= progressBar.design.segmentCount; i++) {
      const threshold = Math.floor(segmentSize * i);
      const isEarly = i <= 3;
      const isNearEnd = i >= progressBar.design.segmentCount - 2;

      segments.push({
        threshold,
        reward: isEarly ? 'quick_start_reward' : isNearEnd ? 'completion_reward' : 'standard_reward',
        claimed: false
      });
    }

    return segments;
  }

  private async analyzeSocialContext(userId: string): Promise<any> {
    // Mock social context - in production would analyze real social graph
    return {
      userRank: Math.floor(Math.random() * 1000) + 1,
      totalUsers: 10000,
      peersAbove: ['friend1', 'friend2'],
      peersBelow: ['friend3', 'friend4'],
      rankingTrend: 'stable' as const
    };
  }

  private generatePressureMessages(profile: UserAddictionProfile, socialContext: any): string[] {
    const messages = [];

    if (socialContext.rankingTrend === 'falling') {
      messages.push(`You've dropped ${Math.floor(Math.random() * 10) + 1} positions! Time to catch up!`);
    }

    if (socialContext.peersAbove.length > 0) {
      messages.push(`${socialContext.peersAbove[0]} is just ahead of you. One more push!`);
    }

    return messages;
  }

  private generateUrgencyTriggers(profile: UserAddictionProfile, context: string): string[] {
    return [
      'Limited time ranking boost available!',
      'Your friends are pulling ahead!',
      'Competition ends in 2 hours!'
    ];
  }

  private generateRecoveryIncentives(profile: UserAddictionProfile, socialContext: any): string[] {
    return [
      'Double XP weekend to recover ranking',
      'Exclusive comeback bonus available',
      'Friend challenge to boost together'
    ];
  }

  // Public API methods for routes
  async getUserEngagementStatus(userId: string): Promise<any> {
    const profile = await this.getUserAddictionProfile(userId);
    return {
      userId,
      engagementLevel: profile.engagementLevel,
      addictionRisk: profile.addictionRisk,
      lastActive: profile.lastActive,
      dailyTriggers: profile.dailyTriggers,
      streakCount: profile.streakCount
    };
  }

  async getAchievementSystem(userId?: string): Promise<any> {
    const baseSystem = {
      achievements: Array.from(this.achievements.values()),
      categories: ['social', 'economic', 'engagement', 'milestone']
    };

    if (userId) {
      const profile = await this.getUserAddictionProfile(userId);
      return {
        ...baseSystem,
        userAchievements: profile.unlockedAchievements,
        totalUnlocked: profile.totalAchievements
      };
    }

    return baseSystem;
  }

  async unlockAchievement(userId: string, achievementId: string): Promise<any> {
    const achievement = this.achievements.get(achievementId);
    if (!achievement) {
      throw new Error('Achievement not found');
    }

    const profile = await this.getUserAddictionProfile(userId);
    profile.unlockedAchievements.push(achievementId);
    profile.totalAchievements++;

    return {
      unlocked: true,
      achievement,
      totalAchievements: profile.totalAchievements
    };
  }

  async getRewardSystem(userId?: string): Promise<any> {
    const baseSystem = {
      dailyRewards: true,
      streakRewards: true,
      achievementRewards: true,
      socialRewards: true
    };

    if (userId) {
      const profile = await this.getUserAddictionProfile(userId);
      return {
        ...baseSystem,
        userRewards: {
          dailyStreak: profile.dailyRewardStreak,
          lastClaimed: profile.lastDailyReward,
          availableRewards: this.calculateAvailableRewards(profile)
        }
      };
    }

    return baseSystem;
  }

  async claimDailyReward(userId: string): Promise<any> {
    const profile = await this.getUserAddictionProfile(userId);
    const today = new Date().toDateString();
    
    if (profile.lastDailyReward.toDateString() === today) {
      throw new Error('Daily reward already claimed');
    }

    profile.lastDailyReward = new Date();
    profile.dailyRewardStreak++;

    return {
      claimed: true,
      streak: profile.dailyRewardStreak,
      reward: 'coins',
      amount: 100
    };
  }

  async getStreakSystem(userId?: string): Promise<any> {
    const baseSystem = {
      dailyLogin: true,
      dailyReward: true,
      socialActivity: true,
      economicActivity: true
    };

    if (userId) {
      const profile = await this.getUserAddictionProfile(userId);
      return {
        ...baseSystem,
        userStreaks: {
          dailyStreak: profile.dailyStreak,
          weeklyStreak: profile.weeklyStreak,
          monthlyStreak: profile.monthlyStreak,
          longestStreak: profile.longestStreak,
          streakCount: profile.streakCount
        }
      };
    }

    return baseSystem;
  }

  async updateUserActivity(userId: string, activity: string): Promise<any> {
    const profile = await this.getUserAddictionProfile(userId);
    profile.lastActive = new Date();
    profile.activityHistory.push({
      action: activity,
      timestamp: new Date(),
      duration: 0
    });

    return {
      updated: true,
      lastActive: profile.lastActive
    };
  }

  async getLeaderboards(type?: string, period?: string): Promise<any> {
    return {
      global: [],
      friends: [],
      weekly: [],
      monthly: [],
      type,
      period
    };
  }

  async getChallenges(userId?: string): Promise<any> {
    const baseSystem = {
      daily: [],
      weekly: [],
      monthly: [],
      special: []
    };

    if (userId) {
      const profile = await this.getUserAddictionProfile(userId);
      return {
        ...baseSystem,
        userChallenges: {
          completed: profile.completedChallenges,
          active: profile.activeChallenges,
          progress: profile.challengeProgress
        }
      };
    }

    return baseSystem;
  }

  async completeChallenge(userId: string, challengeId: string, metadata?: any): Promise<any> {
    const profile = await this.getUserAddictionProfile(userId);
    profile.completedChallenges.push(challengeId);

    return {
      completed: true,
      challengeId,
      totalCompleted: profile.completedChallenges.length,
      metadata
    };
  }

  async getUserProgress(userId: string): Promise<any> {
    const profile = await this.getUserAddictionProfile(userId);
    return {
      userId,
      level: profile.level,
      experience: profile.experience,
      achievements: profile.unlockedAchievements.length,
      streaks: profile.streakCount,
      lastActive: profile.lastActive
    };
  }

  async getLevelSystem(userId?: string): Promise<any> {
    const baseSystem = {
      maxLevel: 100,
      experiencePerLevel: 1000,
      rewards: ['coins', 'badges', 'unlocks']
    };

    if (userId) {
      const profile = await this.getUserAddictionProfile(userId);
      return {
        ...baseSystem,
        userLevel: {
          level: profile.level,
          experience: profile.experience,
          nextLevelExp: (profile.level + 1) * 1000,
          progress: (profile.experience % 1000) / 1000
        }
      };
    }

    return baseSystem;
  }

  async getAddictionMetrics(userId?: string): Promise<any> {
    const baseMetrics = {
      totalUsers: this.userProfiles.size,
      averageEngagement: 0.5,
      addictionRiskDistribution: {
        low: 0.6,
        medium: 0.3,
        high: 0.1
      }
    };

    if (userId) {
      const profile = await this.getUserAddictionProfile(userId);
      return {
        ...baseMetrics,
        userMetrics: {
          addictionRisk: profile.addictionRisk,
          engagementHeat: profile.currentState.engagementHeat,
          sessionFrequency: profile.behaviorPatterns.sessionFrequency,
          averageSessionLength: profile.behaviorPatterns.averageSessionLength
        }
      };
    }

    return baseMetrics;
  }

  private calculateAvailableRewards(profile: UserAddictionProfile): any[] {
    // Mock calculation of available rewards
    return [
      { type: 'coins', amount: 100, available: true },
      { type: 'badge', name: 'Daily Streak', available: profile.dailyRewardStreak > 0 },
      { type: 'unlock', name: 'Premium Feature', available: profile.level >= 10 }
    ];
  }
}

export const gamificationEngine = GamificationAddictionEngine.getInstance();
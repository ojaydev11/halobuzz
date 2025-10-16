import { EventEmitter } from 'events';
import { logger } from '@/config/logger';
import { CoinWallet } from '@/models/CoinWallet';
import { CoinTransaction } from '@/models/CoinTransaction';
import { GameSession, Player } from './AdvancedGamesService';
import { globalGamesAPI } from './GlobalGamesAPIService';

export interface PlayerProfile {
  userId: string;
  playerType: 'newbie' | 'casual' | 'regular' | 'whale' | 'vip';
  skillLevel: number; // 1-100
  riskTolerance: number; // 1-100
  avgStake: number;
  totalSpent: number;
  winRate: number;
  playingSince: Date;
  lastActive: Date;
  preferredGames: string[];
  behaviorTags: string[];
}

export interface AIRecommendation {
  userId: string;
  gameRecommendations: {
    gameId: string;
    confidence: number; // 0-1
    reason: string;
    expectedWinRate: number;
    suggestedStake: number;
  }[];
  difficultyAdjustments: {
    gameId: string;
    adjustmentType: 'ai_handicap' | 'bonus_multiplier' | 'rng_bias';
    value: number;
    duration: number; // minutes
  }[];
  retentionStrategy: {
    strategy: 'win_streak' | 'loss_recovery' | 'engagement_boost' | 'whale_retention';
    actions: string[];
    targetMetrics: { [key: string]: number };
  };
}

export interface GameBalancingRule {
  id: string;
  name: string;
  condition: string; // JavaScript expression
  action: {
    type: 'adjust_rtp' | 'modify_ai' | 'bonus_round' | 'jackpot_boost';
    parameters: { [key: string]: any };
  };
  priority: number;
  isActive: boolean;
  createdBy: string;
}

/**
 * AI Game Orchestration Service
 * Manages difficulty tuning, whale retention, and fair play optimization
 */
export class AIGameOrchestrationService extends EventEmitter {
  private static instance: AIGameOrchestrationService;
  private playerProfiles: Map<string, PlayerProfile> = new Map();
  private activeAdjustments: Map<string, any[]> = new Map();
  private balancingRules: Map<string, GameBalancingRule> = new Map();
  private gameMetrics: Map<string, any> = new Map();

  // ML Models (simplified for demo - in production would use TensorFlow/PyTorch)
  private retentionModel: any = null;
  private churnPredictionModel: any = null;
  private difficultyModel: any = null;

  private constructor() {
    super();
    this.initializeBalancingRules();
    this.startAnalyticsEngine();
    this.startPlayerProfiling();
  }

  static getInstance(): AIGameOrchestrationService {
    if (!AIGameOrchestrationService.instance) {
      AIGameOrchestrationService.instance = new AIGameOrchestrationService();
    }
    return AIGameOrchestrationService.instance;
  }

  /**
   * Initialize default balancing rules
   */
  private initializeBalancingRules(): void {
    const rules: GameBalancingRule[] = [
      {
        id: 'whale_retention',
        name: 'Whale Retention Strategy',
        condition: 'player.playerType === "whale" && player.winRate < 0.3 && player.sessionsThisWeek > 10',
        action: {
          type: 'adjust_rtp',
          parameters: { rtpBoost: 0.05, duration: 120 } // 5% RTP boost for 2 hours
        },
        priority: 1,
        isActive: true,
        createdBy: 'system'
      },
      {
        id: 'newbie_protection',
        name: 'New Player Protection',
        condition: 'player.playerType === "newbie" && player.playingSince > Date.now() - 604800000', // 1 week
        action: {
          type: 'modify_ai',
          parameters: { difficultyReduction: 0.3, bonusFrequency: 1.5 }
        },
        priority: 2,
        isActive: true,
        createdBy: 'system'
      },
      {
        id: 'anti_addiction',
        name: 'Anti-Addiction Safeguard',
        condition: 'player.dailyLosses > player.avgStake * 50 && player.sessionsToday > 20',
        action: {
          type: 'bonus_round',
          parameters: { type: 'recovery_bonus', amount: 'player.dailyLosses * 0.2' }
        },
        priority: 3,
        isActive: true,
        createdBy: 'compliance'
      },
      {
        id: 'win_streak_control',
        name: 'Win Streak Control',
        condition: 'player.currentStreak > 8 && player.playerType !== "newbie"',
        action: {
          type: 'adjust_rtp',
          parameters: { rtpReduction: 0.03, duration: 60 } // Slightly reduce RTP for 1 hour
        },
        priority: 4,
        isActive: true,
        createdBy: 'system'
      },
      {
        id: 'whale_jackpot_boost',
        name: 'Whale Jackpot Opportunity',
        condition: 'player.playerType === "whale" && player.totalSpent > 100000 && Math.random() < 0.1',
        action: {
          type: 'jackpot_boost',
          parameters: { multiplier: 2.0, duration: 30 } // 2x jackpot chance for 30 minutes
        },
        priority: 1,
        isActive: true,
        createdBy: 'marketing'
      }
    ];

    rules.forEach(rule => {
      this.balancingRules.set(rule.id, rule);
    });

    logger.info(`Initialized ${rules.length} game balancing rules`);
  }

  /**
   * Analyze player and provide AI recommendations
   */
  async analyzePlayer(userId: string): Promise<AIRecommendation> {
    const profile = await this.getPlayerProfile(userId);
    if (!profile) {
      throw new Error('Player profile not found');
    }

    // Apply balancing rules
    const applicableRules = this.getApplicableRules(profile);

    // Generate game recommendations
    const gameRecommendations = await this.generateGameRecommendations(profile);

    // Determine difficulty adjustments
    const difficultyAdjustments = await this.calculateDifficultyAdjustments(profile, applicableRules);

    // Create retention strategy
    const retentionStrategy = await this.createRetentionStrategy(profile);

    const recommendation: AIRecommendation = {
      userId,
      gameRecommendations,
      difficultyAdjustments,
      retentionStrategy
    };

    // Store active adjustments
    this.activeAdjustments.set(userId, difficultyAdjustments);

    this.emit('playerAnalyzed', { userId, recommendation, profile });

    return recommendation;
  }

  /**
   * Get or create player profile
   */
  async getPlayerProfile(userId: string): Promise<PlayerProfile | null> {
    let profile = this.playerProfiles.get(userId);

    if (!profile) {
      profile = await this.buildPlayerProfile(userId);
      if (profile) {
        this.playerProfiles.set(userId, profile);
      }
    }

    return profile;
  }

  /**
   * Build comprehensive player profile from transaction history
   */
  private async buildPlayerProfile(userId: string): Promise<PlayerProfile | null> {
    try {
      const wallet = await CoinWallet.findOne({ userId });
      if (!wallet) {
        return null;
      }

      // Get transaction history
      const transactions = await CoinTransaction.find({
        userId,
        type: { $in: ['game_stake', 'game_win', 'game_loss'] },
        createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } // Last 90 days
      }).sort({ createdAt: -1 });

      if (transactions.length === 0) {
        // New player
        return {
          userId,
          playerType: 'newbie',
          skillLevel: 10,
          riskTolerance: 30,
          avgStake: 0,
          totalSpent: 0,
          winRate: 0,
          playingSince: new Date(),
          lastActive: new Date(),
          preferredGames: [],
          behaviorTags: ['new_player']
        };
      }

      // Analyze transactions
      const stakes = transactions.filter(t => t.type === 'game_stake');
      const wins = transactions.filter(t => t.type === 'game_win');

      const totalStaked = stakes.reduce((sum, t) => sum + t.amount, 0);
      const totalWon = wins.reduce((sum, t) => sum + t.amount, 0);
      const avgStake = stakes.length > 0 ? totalStaked / stakes.length : 0;
      const winRate = stakes.length > 0 ? wins.length / stakes.length : 0;

      // Determine player type
      let playerType: PlayerProfile['playerType'] = 'casual';
      if (totalStaked > 100000) playerType = 'whale';
      else if (totalStaked > 50000) playerType = 'vip';
      else if (totalStaked > 10000) playerType = 'regular';
      else if (Date.now() - transactions[transactions.length - 1].createdAt.getTime() < 7 * 24 * 60 * 60 * 1000) {
        playerType = 'newbie';
      }

      // Calculate skill level based on win rate and consistency
      const skillLevel = Math.min(100, Math.max(1, (winRate * 100) + (transactions.length / 10)));

      // Calculate risk tolerance based on stake patterns
      const stakeVariance = this.calculateVariance(stakes.map(t => t.amount));
      const riskTolerance = Math.min(100, Math.max(1, (stakeVariance / avgStake) * 50));

      // Find preferred games
      const gameFrequency: { [gameId: string]: number } = {};
      transactions.forEach(t => {
        const gameId = t.context?.gameId;
        if (gameId) {
          gameFrequency[gameId] = (gameFrequency[gameId] || 0) + 1;
        }
      });

      const preferredGames = Object.entries(gameFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([gameId]) => gameId);

      // Generate behavior tags
      const behaviorTags: string[] = [];
      if (winRate > 0.7) behaviorTags.push('high_performer');
      if (winRate < 0.3) behaviorTags.push('struggling');
      if (avgStake > 1000) behaviorTags.push('high_stakes');
      if (riskTolerance > 80) behaviorTags.push('risk_seeker');
      if (riskTolerance < 30) behaviorTags.push('conservative');
      if (playerType === 'whale') behaviorTags.push('vip_treatment');

      return {
        userId,
        playerType,
        skillLevel,
        riskTolerance,
        avgStake,
        totalSpent: totalStaked,
        winRate,
        playingSince: transactions[transactions.length - 1].createdAt,
        lastActive: transactions[0].createdAt,
        preferredGames,
        behaviorTags
      };

    } catch (error) {
      logger.error('Error building player profile:', error);
      return null;
    }
  }

  /**
   * Generate personalized game recommendations
   */
  private async generateGameRecommendations(profile: PlayerProfile): Promise<AIRecommendation['gameRecommendations']> {
    const allGames = await globalGamesAPI.getAvailableGames(profile.userId);
    const recommendations: AIRecommendation['gameRecommendations'] = [];

    for (const game of allGames) {
      let confidence = 0.1; // Base confidence
      let expectedWinRate = 0.4; // Base win rate
      let reason = 'General recommendation';

      // Boost confidence for preferred games
      if (profile.preferredGames.includes(game.gameId)) {
        confidence += 0.4;
        reason = 'Based on your playing history';
      }

      // Adjust for player type
      switch (profile.playerType) {
        case 'newbie':
          if (game.minStake <= 50 && game.category === 'skill') {
            confidence += 0.3;
            expectedWinRate += 0.1;
            reason = 'Great for learning';
          }
          break;
        case 'whale':
          if (game.maxStake >= 10000 && game.category === 'strategy') {
            confidence += 0.4;
            expectedWinRate += 0.05;
            reason = 'High-stakes strategy game';
          }
          break;
        case 'casual':
          if (game.category === 'skill' && game.minStake <= 100) {
            confidence += 0.2;
            reason = 'Casual-friendly game';
          }
          break;
      }

      // Adjust for skill level
      if (profile.skillLevel > 70 && game.category === 'strategy') {
        confidence += 0.2;
        expectedWinRate += 0.1;
        reason += ' (matched to your skill level)';
      }

      // Adjust for risk tolerance
      if (profile.riskTolerance > 70 && game.maxStake > 5000) {
        confidence += 0.15;
        reason += ' (high-risk, high-reward)';
      }

      const suggestedStake = Math.max(
        game.minStake,
        Math.min(game.maxStake, profile.avgStake * (profile.riskTolerance / 100))
      );

      if (confidence > 0.3) {
        recommendations.push({
          gameId: game.gameId,
          confidence: Math.min(0.99, confidence),
          reason,
          expectedWinRate,
          suggestedStake
        });
      }
    }

    return recommendations
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8); // Top 8 recommendations
  }

  /**
   * Calculate difficulty adjustments based on rules
   */
  private async calculateDifficultyAdjustments(
    profile: PlayerProfile,
    applicableRules: GameBalancingRule[]
  ): Promise<AIRecommendation['difficultyAdjustments']> {
    const adjustments: AIRecommendation['difficultyAdjustments'] = [];

    for (const rule of applicableRules) {
      switch (rule.action.type) {
        case 'adjust_rtp':
          adjustments.push({
            gameId: 'all', // Apply to all games
            adjustmentType: 'bonus_multiplier',
            value: rule.action.parameters.rtpBoost || -rule.action.parameters.rtpReduction || 0,
            duration: rule.action.parameters.duration || 60
          });
          break;

        case 'modify_ai':
          adjustments.push({
            gameId: 'ai_games',
            adjustmentType: 'ai_handicap',
            value: rule.action.parameters.difficultyReduction || 0,
            duration: rule.action.parameters.duration || 120
          });
          break;
      }
    }

    return adjustments;
  }

  /**
   * Create personalized retention strategy
   */
  private async createRetentionStrategy(profile: PlayerProfile): Promise<AIRecommendation['retentionStrategy']> {
    let strategy: AIRecommendation['retentionStrategy']['strategy'] = 'engagement_boost';
    const actions: string[] = [];
    const targetMetrics: { [key: string]: number } = {};

    // Determine strategy based on player profile
    if (profile.playerType === 'whale' && profile.winRate < 0.4) {
      strategy = 'whale_retention';
      actions.push('Provide VIP support', 'Offer exclusive games', 'Increase RTP temporarily');
      targetMetrics.winRate = 0.5;
      targetMetrics.retentionDays = 30;
    } else if (profile.winRate < 0.2) {
      strategy = 'loss_recovery';
      actions.push('Offer recovery bonus', 'Suggest lower-stake games', 'Provide playing tips');
      targetMetrics.winRate = 0.3;
      targetMetrics.sessionLength = 15; // minutes
    } else if (profile.skillLevel > 80) {
      strategy = 'engagement_boost';
      actions.push('Suggest challenging games', 'Invite to tournaments', 'Offer skill-based rewards');
      targetMetrics.skillGrowth = 5;
      targetMetrics.challengeAcceptance = 0.8;
    } else {
      strategy = 'win_streak';
      actions.push('Encourage consistent play', 'Offer daily bonuses', 'Set achievable goals');
      targetMetrics.consistency = 0.7;
      targetMetrics.dailyLogins = 20; // per month
    }

    return {
      strategy,
      actions,
      targetMetrics
    };
  }

  /**
   * Get applicable balancing rules for a player
   */
  private getApplicableRules(profile: PlayerProfile): GameBalancingRule[] {
    const applicable: GameBalancingRule[] = [];

    for (const rule of this.balancingRules.values()) {
      if (!rule.isActive) continue;

      try {
        // Evaluate condition (simplified - in production use a proper expression evaluator)
        const conditionResult = this.evaluateCondition(rule.condition, { player: profile });
        if (conditionResult) {
          applicable.push(rule);
        }
      } catch (error) {
        logger.warn(`Error evaluating rule ${rule.id}:`, error);
      }
    }

    return applicable.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Simple condition evaluator (replace with proper expression evaluator in production)
   */
  private evaluateCondition(condition: string, context: any): boolean {
    try {
      // This is a simplified evaluator - in production, use a secure expression evaluator
      const func = new Function('player', 'Date', 'Math', `return ${condition}`);
      return func(context.player, Date, Math);
    } catch (error) {
      return false;
    }
  }

  /**
   * Calculate variance of an array of numbers
   */
  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
    return squaredDiffs.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  /**
   * Apply real-time adjustments during gameplay
   */
  async applyGameAdjustments(userId: string, gameId: string, gameSession: GameSession): Promise<void> {
    const adjustments = this.activeAdjustments.get(userId);
    if (!adjustments) return;

    const gameAdjustments = adjustments.filter(adj =>
      adj.gameId === gameId || adj.gameId === 'all' ||
      (adj.gameId === 'ai_games' && gameId.includes('ai'))
    );

    for (const adjustment of gameAdjustments) {
      switch (adjustment.adjustmentType) {
        case 'bonus_multiplier':
          // Apply bonus multiplier to game session
          if (gameSession.gameState && typeof gameSession.gameState === 'object') {
            gameSession.gameState.bonusMultiplier = (gameSession.gameState.bonusMultiplier || 1.0) + adjustment.value;
          }
          break;

        case 'ai_handicap':
          // Apply AI difficulty adjustment
          if (gameSession.gameState && typeof gameSession.gameState === 'object') {
            gameSession.gameState.aiHandicap = adjustment.value;
          }
          break;

        case 'rng_bias':
          // Apply RNG bias (for fairness)
          if (gameSession.gameState && typeof gameSession.gameState === 'object') {
            gameSession.gameState.rngBias = adjustment.value;
          }
          break;
      }
    }

    logger.info(`Applied ${gameAdjustments.length} adjustments for user ${userId} in game ${gameId}`);
  }

  /**
   * Start analytics engine for continuous learning
   */
  private startAnalyticsEngine(): void {
    // Update player profiles every hour
    setInterval(async () => {
      const activeUsers = Array.from(this.playerProfiles.keys());
      for (const userId of activeUsers) {
        try {
          const updatedProfile = await this.buildPlayerProfile(userId);
          if (updatedProfile) {
            this.playerProfiles.set(userId, updatedProfile);
          }
        } catch (error) {
          logger.error(`Error updating profile for user ${userId}:`, error);
        }
      }
    }, 3600000); // 1 hour

    // Analyze game metrics every 15 minutes
    setInterval(async () => {
      await this.analyzeGameMetrics();
    }, 900000); // 15 minutes
  }

  /**
   * Start player profiling background process
   */
  private startPlayerProfiling(): void {
    // Profile new players every 5 minutes
    setInterval(async () => {
      try {
        const recentTransactions = await CoinTransaction.find({
          type: 'game_stake',
          createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
        }).distinct('userId');

        for (const userId of recentTransactions) {
          if (!this.playerProfiles.has(userId)) {
            const profile = await this.buildPlayerProfile(userId);
            if (profile) {
              this.playerProfiles.set(userId, profile);
              this.emit('newPlayerProfiled', { userId, profile });
            }
          }
        }
      } catch (error) {
        logger.error('Error in player profiling:', error);
      }
    }, 300000); // 5 minutes
  }

  /**
   * Analyze game metrics for balancing
   */
  private async analyzeGameMetrics(): Promise<void> {
    try {
      const analytics = await globalGamesAPI.getGameAnalytics();

      for (const gameData of analytics) {
        const gameId = gameData._id.gameId;

        // Check if game needs rebalancing
        if (gameData.rtp > 1.1 || gameData.rtp < 0.8) {
          logger.warn(`Game ${gameId} has unusual RTP: ${gameData.rtp}`);

          // Create automatic balancing rule
          const rule: GameBalancingRule = {
            id: `auto_balance_${gameId}_${Date.now()}`,
            name: `Auto Balance for ${gameId}`,
            condition: `player.gameId === '${gameId}'`,
            action: {
              type: 'adjust_rtp',
              parameters: {
                rtpAdjustment: gameData.rtp > 1.1 ? -0.05 : 0.05,
                duration: 180
              }
            },
            priority: 5,
            isActive: true,
            createdBy: 'auto_balancer'
          };

          this.balancingRules.set(rule.id, rule);
        }

        this.gameMetrics.set(gameId, gameData);
      }
    } catch (error) {
      logger.error('Error analyzing game metrics:', error);
    }
  }
}

export const aiGameOrchestration = AIGameOrchestrationService.getInstance();
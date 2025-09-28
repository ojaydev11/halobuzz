import { EventEmitter } from 'events';
import { logger } from '@/config/logger';
import { CoinTransaction } from '@/models/CoinTransaction';
import { CoinWallet } from '@/models/CoinWallet';

export interface UserBehaviorProfile {
  userId: string;

  // Core Demographics & Psychographics
  demographics: {
    age: number;
    country: string;
    timezone: string;
    language: string;
    deviceType: 'mobile' | 'desktop' | 'tablet';
    platform: 'ios' | 'android' | 'web';
  };

  // Behavioral Patterns (Real-time Learning)
  behaviorPatterns: {
    sessionDuration: number; // Average minutes per session
    dailyActiveHours: number[]; // Hours of day when most active (0-23)
    weeklyActivityPattern: number[]; // Days of week activity (0-6)
    attentionSpan: number; // Seconds before losing interest
    multitaskingTendency: number; // 0-1 (1 = high multitasker)
    impulsivityScore: number; // 0-1 (1 = highly impulsive)
    socialConnectedness: number; // 0-1 (1 = highly social)
    competitiveDrive: number; // 0-1 (1 = highly competitive)
    statusSeeking: number; // 0-1 (1 = status-driven)
    riskTolerance: number; // 0-1 (1 = high risk tolerance)
  };

  // Engagement Preferences (ML-driven)
  preferences: {
    contentTypes: { [type: string]: number }; // Weights for different content types
    gameCategories: { [category: string]: number }; // Game preference weights
    socialFeatures: { [feature: string]: number }; // Social feature preferences
    giftingBehavior: { [giftType: string]: number }; // Gift preference weights
    notificationSensitivity: number; // 0-1 (1 = loves notifications)
    visualStimulation: number; // 0-1 (1 = prefers rich visuals)
    audioPreferences: { [type: string]: number }; // Sound/music preferences
  };

  // Spending Psychology (Advanced Profiling)
  spendingPsychology: {
    spendingTier: 'minnow' | 'dolphin' | 'whale' | 'mega_whale';
    pricesensitivity: number; // 0-1 (1 = very price sensitive)
    bundlePreference: number; // 0-1 (1 = prefers bundles)
    urgencyResponsive: number; // 0-1 (1 = responds to urgency)
    socialProofInfluence: number; // 0-1 (1 = influenced by others)
    exclusivityDesire: number; // 0-1 (1 = wants exclusive items)
    giftingGenerosity: number; // 0-1 (1 = generous gifter)
    loyaltyProgramEngagement: number; // 0-1 (1 = loves loyalty programs)
  };

  // Emotional State Tracking (Real-time)
  emotionalState: {
    currentMood: 'excited' | 'happy' | 'neutral' | 'frustrated' | 'bored' | 'angry';
    engagementLevel: number; // 0-1 (real-time engagement)
    stressLevel: number; // 0-1 (behavioral stress indicators)
    satisfactionScore: number; // 0-1 (recent satisfaction)
    fomo: number; // 0-1 (fear of missing out level)
    confidenceLevel: number; // 0-1 (gaming confidence)
  };

  // Prediction Scores (ML Outputs)
  predictions: {
    churnRisk: number; // 0-1 (1 = high churn risk)
    spendProbability: number; // 0-1 (probability of spending today)
    viralPotential: number; // 0-1 (likelihood to share/invite)
    lifetimeValue: number; // Predicted LTV in coins
    nextBestAction: string; // AI-recommended next action
    optimalTiming: { [action: string]: number }; // Best times for different actions
  };

  // Learning Metadata
  lastUpdated: Date;
  dataPoints: number; // Number of interactions used for learning
  confidenceScore: number; // 0-1 (confidence in predictions)
  modelVersion: string;
}

export interface PersonalizationRecommendation {
  userId: string;
  type: 'content' | 'game' | 'gift' | 'offer' | 'notification' | 'social';
  priority: number; // 0-100 (100 = highest priority)

  recommendation: {
    action: string;
    content: any;
    timing: Date; // When to show
    context: string; // Where to show
    reason: string; // Why this recommendation
    expectedImpact: {
      engagement: number; // 0-1
      retention: number; // 0-1
      monetization: number; // 0-1
    };
  };

  // A/B Testing
  variant: string;
  experimentId?: string;

  // Performance Tracking
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;

  createdAt: Date;
  expiresAt: Date;
}

export interface BehaviorEvent {
  userId: string;
  eventType: string;
  eventData: any;
  timestamp: Date;
  sessionId: string;
  context: {
    page: string;
    feature: string;
    deviceInfo: any;
    geoLocation?: any;
  };
}

/**
 * AI Hyper-Personalization Engine
 * Real-time behavior prediction and dynamic content personalization
 * Uses advanced ML algorithms to predict user behavior and optimize engagement
 */
export class AIHyperPersonalizationEngine extends EventEmitter {
  private static instance: AIHyperPersonalizationEngine;
  private userProfiles: Map<string, UserBehaviorProfile> = new Map();
  private recommendations: Map<string, PersonalizationRecommendation[]> = new Map();
  private behaviorEvents: BehaviorEvent[] = [];

  // ML Models (simplified - in production use TensorFlow.js or external ML API)
  private models = {
    churnPrediction: null as any,
    spendingPrediction: null as any,
    engagementPredictor: null as any,
    contentRecommendation: null as any,
    emotionalStateDetector: null as any
  };

  // Real-time Learning Thresholds
  private readonly LEARNING_THRESHOLDS = {
    MIN_EVENTS_FOR_PREDICTION: 50,
    PROFILE_UPDATE_FREQUENCY: 300000, // 5 minutes
    RECOMMENDATION_REFRESH: 600000, // 10 minutes
    BEHAVIOR_ANALYSIS_WINDOW: 86400000, // 24 hours
    EMOTIONAL_STATE_WINDOW: 1800000 // 30 minutes
  };

  private constructor() {
    super();
    this.initializeMLModels();
    this.startRealTimeLearning();
    this.startRecommendationEngine();
    this.startEmotionalStateTracking();
  }

  static getInstance(): AIHyperPersonalizationEngine {
    if (!AIHyperPersonalizationEngine.instance) {
      AIHyperPersonalizationEngine.instance = new AIHyperPersonalizationEngine();
    }
    return AIHyperPersonalizationEngine.instance;
  }

  /**
   * Track user behavior event for real-time learning
   */
  async trackBehavior(event: BehaviorEvent): Promise<void> {
    // Add to behavior stream
    this.behaviorEvents.push(event);

    // Keep only recent events (memory management)
    const cutoff = Date.now() - this.LEARNING_THRESHOLDS.BEHAVIOR_ANALYSIS_WINDOW;
    this.behaviorEvents = this.behaviorEvents.filter(e => e.timestamp.getTime() > cutoff);

    // Real-time profile update for high-impact events
    if (this.isHighImpactEvent(event)) {
      await this.updateUserProfileRealTime(event.userId, event);
    }

    // Trigger real-time recommendations
    await this.generateRealTimeRecommendations(event.userId, event);

    this.emit('behaviorTracked', event);
  }

  /**
   * Get personalized recommendations for user
   */
  async getPersonalizedRecommendations(
    userId: string,
    context: 'homepage' | 'game' | 'stream' | 'wallet' | 'social' = 'homepage',
    limit: number = 10
  ): Promise<PersonalizationRecommendation[]> {
    let userRecommendations = this.recommendations.get(userId) || [];

    // Generate fresh recommendations if none exist or expired
    if (userRecommendations.length === 0 || this.areRecommendationsExpired(userRecommendations)) {
      userRecommendations = await this.generatePersonalizedRecommendations(userId);
      this.recommendations.set(userId, userRecommendations);
    }

    // Filter by context and sort by priority
    return userRecommendations
      .filter(rec => rec.recommendation.context === context || rec.recommendation.context === 'global')
      .sort((a, b) => b.priority - a.priority)
      .slice(0, limit);
  }

  /**
   * Predict user churn risk (0-1)
   */
  async predictChurnRisk(userId: string): Promise<number> {
    const profile = await this.getUserProfile(userId);

    // Advanced churn prediction algorithm
    let churnScore = 0;

    // Recent activity decline
    const recentActivity = await this.getRecentActivityScore(userId);
    churnScore += (1 - recentActivity) * 0.3;

    // Engagement pattern changes
    const engagementTrend = await this.getEngagementTrend(userId);
    churnScore += (1 - engagementTrend) * 0.25;

    // Spending pattern decline
    const spendingTrend = await this.getSpendingTrend(userId);
    churnScore += (1 - spendingTrend) * 0.2;

    // Social disconnection
    churnScore += (1 - profile.behaviorPatterns.socialConnectedness) * 0.15;

    // Frustration indicators
    churnScore += profile.emotionalState.stressLevel * 0.1;

    return Math.min(1, Math.max(0, churnScore));
  }

  /**
   * Predict spending probability for today
   */
  async predictSpendingProbability(userId: string): Promise<{
    probability: number;
    recommendedAmount: number;
    bestTiming: Date;
    triggers: string[];
  }> {
    const profile = await this.getUserProfile(userId);

    let spendProbability = 0.1; // Base probability

    // Historical spending patterns
    const spendingHistory = await this.getSpendingHistory(userId);
    if (spendingHistory.averageSpendingFrequency > 0) {
      spendProbability += Math.min(0.4, spendingHistory.averageSpendingFrequency / 7); // Weekly frequency
    }

    // Current engagement level
    spendProbability += profile.emotionalState.engagementLevel * 0.3;

    // Impulsivity + current mood
    if (profile.emotionalState.currentMood === 'excited') {
      spendProbability += profile.behaviorPatterns.impulsivityScore * 0.2;
    }

    // FOMO level
    spendProbability += profile.emotionalState.fomo * 0.15;

    // Time-based patterns
    const currentHour = new Date().getHours();
    const hourlySpendingPattern = await this.getHourlySpendingPattern(userId);
    spendProbability *= hourlySpendingPattern[currentHour] || 0.5;

    // Calculate recommended amount based on spending psychology
    const recommendedAmount = this.calculateOptimalSpendingAmount(profile, spendProbability);

    // Find best timing
    const bestTiming = this.findOptimalSpendingTime(profile);

    // Identify spending triggers
    const triggers = this.identifySpendingTriggers(profile);

    return {
      probability: Math.min(1, spendProbability),
      recommendedAmount,
      bestTiming,
      triggers
    };
  }

  /**
   * Generate predictive gift recommendations
   */
  async generateGiftRecommendations(userId: string): Promise<{
    gifts: Array<{
      giftId: string;
      recipientId: string;
      confidence: number;
      expectedResponse: 'positive' | 'neutral' | 'negative';
      timing: Date;
      context: string;
    }>;
    totalExpectedSpending: number;
  }> {
    const profile = await this.getUserProfile(userId);
    const recommendations = [];
    let totalExpectedSpending = 0;

    // Get user's social graph
    const socialGraph = await this.getUserSocialGraph(userId);

    for (const connection of socialGraph) {
      // Analyze relationship strength
      const relationshipScore = await this.calculateRelationshipScore(userId, connection.userId);

      if (relationshipScore > 0.3) { // Minimum relationship threshold
        // Get recipient's preferences
        const recipientProfile = await this.getUserProfile(connection.userId);

        // Predict gift success probability
        const giftPrediction = this.predictGiftSuccess(profile, recipientProfile, relationshipScore);

        if (giftPrediction.confidence > 0.6) {
          const optimalTiming = this.calculateOptimalGiftTiming(profile, recipientProfile);

          recommendations.push({
            giftId: giftPrediction.recommendedGift,
            recipientId: connection.userId,
            confidence: giftPrediction.confidence,
            expectedResponse: giftPrediction.expectedResponse,
            timing: optimalTiming,
            context: giftPrediction.context
          });

          totalExpectedSpending += giftPrediction.expectedCost;
        }
      }
    }

    // Sort by confidence and limit recommendations
    recommendations.sort((a, b) => b.confidence - a.confidence);

    return {
      gifts: recommendations.slice(0, 15), // Top 15 recommendations
      totalExpectedSpending
    };
  }

  /**
   * Get real-time user behavior profile
   */
  async getUserProfile(userId: string): Promise<UserBehaviorProfile> {
    let profile = this.userProfiles.get(userId);

    if (!profile) {
      profile = await this.buildInitialProfile(userId);
      this.userProfiles.set(userId, profile);
    }

    return profile;
  }

  /**
   * Update user profile with new behavioral data
   */
  async updateUserProfile(userId: string, updates: Partial<UserBehaviorProfile>): Promise<UserBehaviorProfile> {
    const currentProfile = await this.getUserProfile(userId);
    const updatedProfile = this.mergeProfileUpdates(currentProfile, updates);

    updatedProfile.lastUpdated = new Date();
    updatedProfile.dataPoints += 1;

    this.userProfiles.set(userId, updatedProfile);

    this.emit('profileUpdated', { userId, profile: updatedProfile });

    return updatedProfile;
  }

  /**
   * Private implementation methods
   */
  private async initializeMLModels(): Promise<void> {
    // In production, load actual ML models
    // For now, using simplified heuristic models
    this.models.churnPrediction = {
      predict: (features: number[]) => Math.random() * 0.3 // Mock model
    };

    this.models.spendingPrediction = {
      predict: (features: number[]) => Math.random() * 0.7 // Mock model
    };

    this.models.engagementPredictor = {
      predict: (features: number[]) => Math.random() * 0.9 // Mock model
    };

    logger.info('AI Hyper-Personalization models initialized');
  }

  private async buildInitialProfile(userId: string): Promise<UserBehaviorProfile> {
    // Get basic user data
    const wallet = await CoinWallet.findOne({ userId });
    const transactions = await CoinTransaction.find({ userId }).limit(100).sort({ createdAt: -1 });

    // Analyze behavioral patterns from transaction history
    const behaviorAnalysis = this.analyzeHistoricalBehavior(transactions);

    const profile: UserBehaviorProfile = {
      userId,
      demographics: {
        age: 25, // Would get from user data
        country: 'NP', // Would get from geo data
        timezone: 'Asia/Kathmandu',
        language: 'en',
        deviceType: 'mobile',
        platform: 'android'
      },
      behaviorPatterns: {
        sessionDuration: behaviorAnalysis.avgSessionDuration || 15,
        dailyActiveHours: behaviorAnalysis.activeHours || [19, 20, 21], // Evening hours
        weeklyActivityPattern: [0.6, 0.8, 0.9, 0.9, 0.9, 1.0, 0.8], // Weekends higher
        attentionSpan: behaviorAnalysis.attentionSpan || 120,
        multitaskingTendency: 0.5,
        impulsivityScore: behaviorAnalysis.impulsivity || 0.3,
        socialConnectedness: 0.6,
        competitiveDrive: 0.7,
        statusSeeking: 0.5,
        riskTolerance: behaviorAnalysis.riskTolerance || 0.4
      },
      preferences: {
        contentTypes: { 'live_streams': 0.8, 'games': 0.9, 'social': 0.6 },
        gameCategories: { 'battle-royale': 0.7, 'strategy': 0.5, 'casual': 0.6 },
        socialFeatures: { 'gifting': 0.8, 'chat': 0.7, 'leaderboards': 0.9 },
        giftingBehavior: { 'hearts': 0.9, 'roses': 0.7, 'diamonds': 0.3 },
        notificationSensitivity: 0.6,
        visualStimulation: 0.8,
        audioPreferences: { 'effects': 0.7, 'music': 0.5 }
      },
      spendingPsychology: {
        spendingTier: this.determineSpendingTier(wallet?.totalBalance || 0),
        pricesensitivity: 0.7,
        bundlePreference: 0.6,
        urgencyResponsive: 0.5,
        socialProofInfluence: 0.7,
        exclusivityDesire: 0.4,
        giftingGenerosity: behaviorAnalysis.giftingFrequency || 0.3,
        loyaltyProgramEngagement: 0.6
      },
      emotionalState: {
        currentMood: 'neutral',
        engagementLevel: 0.5,
        stressLevel: 0.2,
        satisfactionScore: 0.6,
        fomo: 0.3,
        confidenceLevel: 0.5
      },
      predictions: {
        churnRisk: 0.2,
        spendProbability: 0.3,
        viralPotential: 0.4,
        lifetimeValue: behaviorAnalysis.estimatedLTV || 5000,
        nextBestAction: 'show_popular_games',
        optimalTiming: {
          'gaming': 20, // 8 PM
          'gifting': 21, // 9 PM
          'shopping': 19 // 7 PM
        }
      },
      lastUpdated: new Date(),
      dataPoints: transactions.length,
      confidenceScore: Math.min(0.9, transactions.length / 100),
      modelVersion: '1.0.0'
    };

    return profile;
  }

  private analyzeHistoricalBehavior(transactions: any[]): any {
    if (transactions.length === 0) {
      return {};
    }

    // Session analysis
    const sessionTimes = this.extractSessionTimes(transactions);
    const avgSessionDuration = sessionTimes.reduce((sum, duration) => sum + duration, 0) / sessionTimes.length;

    // Activity hours
    const hourCounts = transactions.reduce((acc, tx) => {
      const hour = new Date(tx.createdAt).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as { [hour: number]: number });

    const activeHours = Object.entries(hourCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    // Impulsivity (quick consecutive transactions)
    let impulsiveTransactions = 0;
    for (let i = 1; i < transactions.length; i++) {
      const timeDiff = new Date(transactions[i-1].createdAt).getTime() - new Date(transactions[i].createdAt).getTime();
      if (timeDiff < 300000) { // Less than 5 minutes apart
        impulsiveTransactions++;
      }
    }
    const impulsivity = impulsiveTransactions / transactions.length;

    // Risk tolerance (based on game stakes)
    const gameTransactions = transactions.filter(tx => tx.type === 'game_stake');
    const avgStake = gameTransactions.length > 0
      ? gameTransactions.reduce((sum, tx) => sum + tx.amount, 0) / gameTransactions.length
      : 0;
    const riskTolerance = Math.min(1, avgStake / 1000); // Normalize to 1000 coins

    // Gifting behavior
    const giftTransactions = transactions.filter(tx => tx.type === 'gift_sent');
    const giftingFrequency = giftTransactions.length / Math.max(1, transactions.length);

    // LTV estimation
    const totalSpent = transactions
      .filter(tx => ['game_stake', 'gift_sent', 'og_purchase', 'premium_feature'].includes(tx.type))
      .reduce((sum, tx) => sum + tx.amount, 0);
    const estimatedLTV = totalSpent * 3; // Simple 3x multiplier

    return {
      avgSessionDuration,
      activeHours,
      impulsivity,
      riskTolerance,
      giftingFrequency,
      estimatedLTV,
      attentionSpan: Math.max(60, 300 - (impulsivity * 200)) // More impulsive = shorter attention
    };
  }

  private extractSessionTimes(transactions: any[]): number[] {
    // Group transactions by time windows to identify sessions
    const sessions = [];
    let currentSession = [];

    for (let i = 0; i < transactions.length; i++) {
      if (currentSession.length === 0) {
        currentSession.push(transactions[i]);
      } else {
        const lastTx = currentSession[currentSession.length - 1];
        const timeDiff = new Date(lastTx.createdAt).getTime() - new Date(transactions[i].createdAt).getTime();

        if (timeDiff < 1800000) { // Less than 30 minutes apart = same session
          currentSession.push(transactions[i]);
        } else {
          // End current session
          if (currentSession.length > 1) {
            const sessionDuration = (new Date(currentSession[0].createdAt).getTime() -
                                   new Date(currentSession[currentSession.length - 1].createdAt).getTime()) / 60000;
            sessions.push(sessionDuration);
          }
          currentSession = [transactions[i]];
        }
      }
    }

    return sessions.length > 0 ? sessions : [15]; // Default 15 minutes if no sessions detected
  }

  private determineSpendingTier(totalBalance: number): UserBehaviorProfile['spendingPsychology']['spendingTier'] {
    if (totalBalance > 100000) return 'mega_whale';
    if (totalBalance > 25000) return 'whale';
    if (totalBalance > 5000) return 'dolphin';
    return 'minnow';
  }

  private isHighImpactEvent(event: BehaviorEvent): boolean {
    const highImpactEvents = [
      'purchase_completed',
      'game_won',
      'gift_sent',
      'level_up',
      'achievement_unlocked',
      'social_interaction',
      'rage_quit',
      'app_crash'
    ];

    return highImpactEvents.includes(event.eventType);
  }

  private async updateUserProfileRealTime(userId: string, event: BehaviorEvent): Promise<void> {
    const profile = await this.getUserProfile(userId);

    // Update emotional state based on event
    switch (event.eventType) {
      case 'game_won':
        profile.emotionalState.currentMood = 'excited';
        profile.emotionalState.engagementLevel = Math.min(1, profile.emotionalState.engagementLevel + 0.2);
        profile.emotionalState.confidenceLevel = Math.min(1, profile.emotionalState.confidenceLevel + 0.1);
        break;
      case 'game_lost':
        profile.emotionalState.stressLevel = Math.min(1, profile.emotionalState.stressLevel + 0.1);
        if (profile.emotionalState.stressLevel > 0.7) {
          profile.emotionalState.currentMood = 'frustrated';
        }
        break;
      case 'gift_received':
        profile.emotionalState.currentMood = 'happy';
        profile.emotionalState.satisfactionScore = Math.min(1, profile.emotionalState.satisfactionScore + 0.1);
        break;
      case 'purchase_completed':
        profile.emotionalState.satisfactionScore = Math.min(1, profile.emotionalState.satisfactionScore + 0.15);
        profile.behaviorPatterns.impulsivityScore = Math.min(1, profile.behaviorPatterns.impulsivityScore + 0.05);
        break;
    }

    // Update predictions
    profile.predictions.churnRisk = await this.predictChurnRisk(userId);
    profile.predictions.spendProbability = (await this.predictSpendingProbability(userId)).probability;

    this.userProfiles.set(userId, profile);
  }

  private async generateRealTimeRecommendations(userId: string, event: BehaviorEvent): Promise<void> {
    const profile = await this.getUserProfile(userId);
    const newRecommendations: PersonalizationRecommendation[] = [];

    // Generate contextual recommendations based on the event
    switch (event.eventType) {
      case 'game_won':
        if (profile.emotionalState.currentMood === 'excited') {
          newRecommendations.push({
            userId,
            type: 'offer',
            priority: 90,
            recommendation: {
              action: 'show_celebration_gift_offer',
              content: {
                title: '🎉 Celebrate Your Win!',
                description: 'Send a victory gift to share your success',
                discountPercent: 20,
                urgencyTimer: 300 // 5 minutes
              },
              timing: new Date(),
              context: 'game',
              reason: 'User just won and is in excited mood - high conversion probability',
              expectedImpact: { engagement: 0.8, retention: 0.6, monetization: 0.9 }
            },
            variant: 'celebration_v1',
            impressions: 0,
            clicks: 0,
            conversions: 0,
            revenue: 0,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 300000) // 5 minutes
          });
        }
        break;

      case 'game_lost':
        if (profile.emotionalState.stressLevel > 0.5) {
          newRecommendations.push({
            userId,
            type: 'content',
            priority: 75,
            recommendation: {
              action: 'show_comfort_content',
              content: {
                message: 'Every champion has setbacks. Ready for your comeback?',
                action: 'practice_game',
                freeCoinsOffer: 50
              },
              timing: new Date(Date.now() + 30000), // 30 seconds delay
              context: 'game',
              reason: 'User showing stress after loss - prevent churn with comfort',
              expectedImpact: { engagement: 0.7, retention: 0.9, monetization: 0.3 }
            },
            variant: 'comfort_v1',
            impressions: 0,
            clicks: 0,
            conversions: 0,
            revenue: 0,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 600000) // 10 minutes
          });
        }
        break;
    }

    // Add to user's recommendations
    const existingRecommendations = this.recommendations.get(userId) || [];
    this.recommendations.set(userId, [...existingRecommendations, ...newRecommendations]);
  }

  private async generatePersonalizedRecommendations(userId: string): Promise<PersonalizationRecommendation[]> {
    const profile = await this.getUserProfile(userId);
    const recommendations: PersonalizationRecommendation[] = [];

    // Game recommendations based on preferences
    const gameRecommendations = this.generateGameRecommendations(profile);
    recommendations.push(...gameRecommendations);

    // Gift recommendations
    const giftRecommendations = await this.generateGiftRecommendationCards(profile);
    recommendations.push(...giftRecommendations);

    // Social recommendations
    const socialRecommendations = this.generateSocialRecommendations(profile);
    recommendations.push(...socialRecommendations);

    // Monetization recommendations
    const monetizationRecommendations = this.generateMonetizationRecommendations(profile);
    recommendations.push(...monetizationRecommendations);

    return recommendations.sort((a, b) => b.priority - a.priority);
  }

  private generateGameRecommendations(profile: UserBehaviorProfile): PersonalizationRecommendation[] {
    const recommendations: PersonalizationRecommendation[] = [];

    // Analyze game preferences and current mood
    Object.entries(profile.preferences.gameCategories).forEach(([category, weight]) => {
      if (weight > 0.6) {
        let priority = weight * 70;

        // Boost priority based on current mood
        if (profile.emotionalState.currentMood === 'excited' && category === 'battle-royale') {
          priority += 20;
        } else if (profile.emotionalState.currentMood === 'bored' && category === 'casual') {
          priority += 15;
        }

        recommendations.push({
          userId: profile.userId,
          type: 'game',
          priority,
          recommendation: {
            action: 'suggest_game_category',
            content: {
              category,
              games: [`${category}_game_1`, `${category}_game_2`],
              personalizedMessage: this.getPersonalizedGameMessage(category, profile)
            },
            timing: new Date(),
            context: 'homepage',
            reason: `High preference for ${category} games (${(weight * 100).toFixed(0)}%)`,
            expectedImpact: {
              engagement: weight * 0.8,
              retention: weight * 0.6,
              monetization: weight * profile.behaviorPatterns.impulsivityScore * 0.7
            }
          },
          variant: 'personalized_v1',
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 3600000) // 1 hour
        });
      }
    });

    return recommendations;
  }

  private async generateGiftRecommendationCards(profile: UserBehaviorProfile): Promise<PersonalizationRecommendation[]> {
    const recommendations: PersonalizationRecommendation[] = [];

    if (profile.spendingPsychology.giftingGenerosity > 0.4) {
      const giftPredictions = await this.generateGiftRecommendations(profile.userId);

      giftPredictions.gifts.slice(0, 3).forEach((gift, index) => {
        recommendations.push({
          userId: profile.userId,
          type: 'gift',
          priority: 85 - (index * 10),
          recommendation: {
            action: 'suggest_gift',
            content: {
              giftId: gift.giftId,
              recipientId: gift.recipientId,
              confidence: gift.confidence,
              personalizedMessage: `Perfect time to surprise them with ${gift.giftId}!`
            },
            timing: gift.timing,
            context: gift.context,
            reason: `High-confidence gift prediction (${(gift.confidence * 100).toFixed(0)}%)`,
            expectedImpact: {
              engagement: 0.7,
              retention: 0.5,
              monetization: gift.confidence * 0.9
            }
          },
          variant: 'prediction_v1',
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
          createdAt: new Date(),
          expiresAt: gift.timing
        });
      });
    }

    return recommendations;
  }

  private generateSocialRecommendations(profile: UserBehaviorProfile): PersonalizationRecommendation[] {
    const recommendations: PersonalizationRecommendation[] = [];

    if (profile.behaviorPatterns.socialConnectedness < 0.5 && profile.predictions.viralPotential > 0.6) {
      recommendations.push({
        userId: profile.userId,
        type: 'social',
        priority: 70,
        recommendation: {
          action: 'encourage_social_connection',
          content: {
            title: 'Connect & Conquer! 🚀',
            description: 'Find friends and earn bonus coins together',
            incentive: 'Get 100 bonus coins for each friend you invite',
            features: ['Friend finder', 'Social leaderboards', 'Group challenges']
          },
          timing: new Date(),
          context: 'social',
          reason: 'Low social connection but high viral potential',
          expectedImpact: { engagement: 0.8, retention: 0.9, monetization: 0.4 }
        },
        variant: 'social_boost_v1',
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000) // 24 hours
      });
    }

    return recommendations;
  }

  private generateMonetizationRecommendations(profile: UserBehaviorProfile): PersonalizationRecommendation[] {
    const recommendations: PersonalizationRecommendation[] = [];

    if (profile.predictions.spendProbability > 0.6) {
      // High spending probability - show premium offers
      recommendations.push({
        userId: profile.userId,
        type: 'offer',
        priority: 95,
        recommendation: {
          action: 'show_premium_offer',
          content: {
            title: profile.spendingPsychology.exclusivityDesire > 0.7 ?
              '🌟 Exclusive VIP Offer - Limited Time!' :
              '💎 Special Deal Just for You!',
            coinPackage: this.selectOptimalCoinPackage(profile),
            discount: profile.spendingPsychology.pricesensitivity > 0.6 ? 25 : 15,
            urgency: profile.spendingPsychology.urgencyResponsive > 0.5
          },
          timing: new Date(),
          context: 'wallet',
          reason: `High spending probability (${(profile.predictions.spendProbability * 100).toFixed(0)}%)`,
          expectedImpact: { engagement: 0.6, retention: 0.4, monetization: 0.95 }
        },
        variant: 'premium_offer_v1',
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 1800000) // 30 minutes
      });
    }

    return recommendations;
  }

  // Additional helper methods
  private getPersonalizedGameMessage(category: string, profile: UserBehaviorProfile): string {
    const messages = {
      'battle-royale': profile.emotionalState.currentMood === 'excited' ?
        'Your victory energy is perfect for battle!' :
        'Ready to dominate the battlefield?',
      'strategy': profile.behaviorPatterns.competitiveDrive > 0.7 ?
        'Your strategic mind craves a challenge!' :
        'Time to outsmart your opponents',
      'casual': profile.emotionalState.stressLevel > 0.5 ?
        'Perfect way to unwind and relax' :
        'Quick fun awaits!'
    };
    return messages[category as keyof typeof messages] || 'New adventures await!';
  }

  private selectOptimalCoinPackage(profile: UserBehaviorProfile): string {
    if (profile.spendingPsychology.spendingTier === 'whale' || profile.spendingPsychology.spendingTier === 'mega_whale') {
      return profile.spendingPsychology.bundlePreference > 0.6 ? 'mega_pack' : 'whale_pack';
    } else if (profile.spendingPsychology.spendingTier === 'dolphin') {
      return 'premium_pack';
    } else {
      return profile.spendingPsychology.pricesensitivity > 0.7 ? 'basic_pack' : 'popular_pack';
    }
  }

  // Prediction helper methods
  private async getRecentActivityScore(userId: string): Promise<number> {
    const recentEvents = this.behaviorEvents.filter(e =>
      e.userId === userId &&
      e.timestamp.getTime() > Date.now() - 86400000 // Last 24 hours
    );

    const daysBefore = this.behaviorEvents.filter(e =>
      e.userId === userId &&
      e.timestamp.getTime() > Date.now() - 172800000 && // 24-48 hours ago
      e.timestamp.getTime() <= Date.now() - 86400000
    );

    if (daysBefore.length === 0) return recentEvents.length > 0 ? 1 : 0;
    return Math.min(1, recentEvents.length / daysBefore.length);
  }

  private async getEngagementTrend(userId: string): Promise<number> {
    // Simplified engagement trend calculation
    const recentEngagement = this.behaviorEvents
      .filter(e => e.userId === userId && e.timestamp.getTime() > Date.now() - 604800000) // Last 7 days
      .length;

    const previousEngagement = this.behaviorEvents
      .filter(e => e.userId === userId &&
        e.timestamp.getTime() > Date.now() - 1209600000 && // 7-14 days ago
        e.timestamp.getTime() <= Date.now() - 604800000
      )
      .length;

    if (previousEngagement === 0) return recentEngagement > 0 ? 1 : 0;
    return Math.min(1, recentEngagement / previousEngagement);
  }

  private async getSpendingTrend(userId: string): Promise<number> {
    const recentSpending = await CoinTransaction.find({
      userId,
      type: { $in: ['game_stake', 'gift_sent', 'og_purchase', 'premium_feature'] },
      createdAt: { $gte: new Date(Date.now() - 604800000) } // Last 7 days
    });

    const previousSpending = await CoinTransaction.find({
      userId,
      type: { $in: ['game_stake', 'gift_sent', 'og_purchase', 'premium_feature'] },
      createdAt: {
        $gte: new Date(Date.now() - 1209600000), // 14 days ago
        $lte: new Date(Date.now() - 604800000) // 7 days ago
      }
    });

    const recentAmount = recentSpending.reduce((sum, tx) => sum + tx.amount, 0);
    const previousAmount = previousSpending.reduce((sum, tx) => sum + tx.amount, 0);

    if (previousAmount === 0) return recentAmount > 0 ? 1 : 0.5;
    return Math.min(1, recentAmount / previousAmount);
  }

  private areRecommendationsExpired(recommendations: PersonalizationRecommendation[]): boolean {
    const now = new Date();
    return recommendations.some(rec => rec.expiresAt <= now);
  }

  private mergeProfileUpdates(current: UserBehaviorProfile, updates: Partial<UserBehaviorProfile>): UserBehaviorProfile {
    // Deep merge logic for profile updates
    return {
      ...current,
      ...updates,
      behaviorPatterns: { ...current.behaviorPatterns, ...updates.behaviorPatterns },
      preferences: { ...current.preferences, ...updates.preferences },
      spendingPsychology: { ...current.spendingPsychology, ...updates.spendingPsychology },
      emotionalState: { ...current.emotionalState, ...updates.emotionalState },
      predictions: { ...current.predictions, ...updates.predictions }
    };
  }

  // Placeholder methods for complex calculations
  private async getSpendingHistory(userId: string): Promise<any> {
    const transactions = await CoinTransaction.find({
      userId,
      type: { $in: ['game_stake', 'gift_sent', 'og_purchase', 'premium_feature'] },
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    });

    const spendingDays = new Set(transactions.map(tx =>
      tx.createdAt.toDateString()
    )).size;

    return {
      averageSpendingFrequency: spendingDays / 30, // Days per month
      totalSpent: transactions.reduce((sum, tx) => sum + tx.amount, 0)
    };
  }

  private async getHourlySpendingPattern(userId: string): Promise<number[]> {
    const transactions = await CoinTransaction.find({
      userId,
      type: { $in: ['game_stake', 'gift_sent', 'og_purchase', 'premium_feature'] }
    });

    const hourlyCount = new Array(24).fill(0);
    transactions.forEach(tx => {
      const hour = new Date(tx.createdAt).getHours();
      hourlyCount[hour]++;
    });

    const maxCount = Math.max(...hourlyCount);
    return hourlyCount.map(count => maxCount > 0 ? count / maxCount : 0.5);
  }

  private calculateOptimalSpendingAmount(profile: UserBehaviorProfile, probability: number): number {
    const baseAmounts = {
      'minnow': 50,
      'dolphin': 200,
      'whale': 1000,
      'mega_whale': 5000
    };

    let amount = baseAmounts[profile.spendingPsychology.spendingTier];

    // Adjust based on probability and psychology
    amount *= probability;

    if (profile.spendingPsychology.bundlePreference > 0.7) {
      amount *= 1.5; // Suggest larger bundles
    }

    return Math.round(amount);
  }

  private findOptimalSpendingTime(profile: UserBehaviorProfile): Date {
    const now = new Date();
    const currentHour = now.getHours();

    // Find user's most active hour from their pattern
    const bestHour = profile.behaviorPatterns.dailyActiveHours
      .reduce((best, hour) =>
        profile.predictions.optimalTiming.shopping === hour ? hour : best,
        profile.behaviorPatterns.dailyActiveHours[0]
      );

    const optimalTime = new Date(now);

    if (currentHour < bestHour) {
      optimalTime.setHours(bestHour, 0, 0, 0);
    } else {
      optimalTime.setDate(optimalTime.getDate() + 1);
      optimalTime.setHours(bestHour, 0, 0, 0);
    }

    return optimalTime;
  }

  private identifySpendingTriggers(profile: UserBehaviorProfile): string[] {
    const triggers = [];

    if (profile.emotionalState.fomo > 0.6) triggers.push('limited_time_offers');
    if (profile.spendingPsychology.socialProofInfluence > 0.6) triggers.push('social_proof');
    if (profile.spendingPsychology.exclusivityDesire > 0.6) triggers.push('exclusive_items');
    if (profile.behaviorPatterns.impulsivityScore > 0.6) triggers.push('flash_sales');
    if (profile.behaviorPatterns.competitiveDrive > 0.7) triggers.push('leaderboard_position');

    return triggers;
  }

  // Social graph and relationship methods (simplified)
  private async getUserSocialGraph(userId: string): Promise<Array<{ userId: string; relationshipType: string }>> {
    // In production, this would query the social connections database
    return [
      { userId: 'friend1', relationshipType: 'friend' },
      { userId: 'friend2', relationshipType: 'frequent_interaction' },
      { userId: 'friend3', relationshipType: 'mutual_gifting' }
    ];
  }

  private async calculateRelationshipScore(userId: string, targetUserId: string): Promise<number> {
    // Complex relationship analysis would go here
    return Math.random() * 0.8 + 0.2; // Mock: 0.2 to 1.0
  }

  private predictGiftSuccess(
    senderProfile: UserBehaviorProfile,
    recipientProfile: UserBehaviorProfile,
    relationshipScore: number
  ): any {
    const confidence = relationshipScore * 0.7 +
                     senderProfile.spendingPsychology.giftingGenerosity * 0.3;

    const recommendedGift = this.selectOptimalGift(senderProfile, recipientProfile);

    return {
      confidence,
      recommendedGift,
      expectedResponse: confidence > 0.7 ? 'positive' : 'neutral',
      expectedCost: this.getGiftCost(recommendedGift),
      context: 'social'
    };
  }

  private selectOptimalGift(senderProfile: UserBehaviorProfile, recipientProfile: UserBehaviorProfile): string {
    // Gift selection algorithm based on both profiles
    const giftPreferences = Object.entries(recipientProfile.preferences.giftingBehavior)
      .sort(([,a], [,b]) => b - a);

    return giftPreferences[0][0]; // Return most preferred gift type
  }

  private getGiftCost(giftId: string): number {
    const costs: { [key: string]: number } = {
      'hearts': 5,
      'roses': 25,
      'diamonds': 500,
      'crowns': 1000
    };
    return costs[giftId] || 50;
  }

  private calculateOptimalGiftTiming(
    senderProfile: UserBehaviorProfile,
    recipientProfile: UserBehaviorProfile
  ): Date {
    // Find overlapping active hours
    const senderActiveHours = new Set(senderProfile.behaviorPatterns.dailyActiveHours);
    const recipientActiveHours = new Set(recipientProfile.behaviorPatterns.dailyActiveHours);

    const overlappingHours = Array.from(senderActiveHours).filter(hour => recipientActiveHours.has(hour));
    const optimalHour = overlappingHours[0] || senderProfile.behaviorPatterns.dailyActiveHours[0];

    const timing = new Date();
    timing.setHours(optimalHour, 0, 0, 0);

    if (timing <= new Date()) {
      timing.setDate(timing.getDate() + 1);
    }

    return timing;
  }

  // Background processes
  private startRealTimeLearning(): void {
    // Update profiles every 5 minutes
    setInterval(async () => {
      await this.processRecentBehavior();
    }, this.LEARNING_THRESHOLDS.PROFILE_UPDATE_FREQUENCY);

    // Clean up old behavior events
    setInterval(() => {
      const cutoff = Date.now() - this.LEARNING_THRESHOLDS.BEHAVIOR_ANALYSIS_WINDOW;
      this.behaviorEvents = this.behaviorEvents.filter(e => e.timestamp.getTime() > cutoff);
    }, 3600000); // Every hour
  }

  private startRecommendationEngine(): void {
    // Refresh recommendations every 10 minutes
    setInterval(async () => {
      await this.refreshExpiredRecommendations();
    }, this.LEARNING_THRESHOLDS.RECOMMENDATION_REFRESH);
  }

  private startEmotionalStateTracking(): void {
    // Update emotional states every 30 minutes
    setInterval(async () => {
      await this.updateEmotionalStates();
    }, this.LEARNING_THRESHOLDS.EMOTIONAL_STATE_WINDOW);
  }

  private async processRecentBehavior(): Promise<void> {
    const recentEvents = this.behaviorEvents.filter(e =>
      e.timestamp.getTime() > Date.now() - this.LEARNING_THRESHOLDS.PROFILE_UPDATE_FREQUENCY
    );

    const userEvents = recentEvents.reduce((acc, event) => {
      if (!acc[event.userId]) acc[event.userId] = [];
      acc[event.userId].push(event);
      return acc;
    }, {} as { [userId: string]: BehaviorEvent[] });

    for (const [userId, events] of Object.entries(userEvents)) {
      if (events.length >= 5) { // Minimum events for meaningful update
        await this.updateProfileFromEvents(userId, events);
      }
    }
  }

  private async updateProfileFromEvents(userId: string, events: BehaviorEvent[]): Promise<void> {
    const profile = await this.getUserProfile(userId);

    // Analyze event patterns and update profile accordingly
    const eventTypes = events.map(e => e.eventType);
    const uniqueEvents = new Set(eventTypes);

    // Update engagement level based on event diversity and frequency
    const engagementBoost = Math.min(0.1, uniqueEvents.size * 0.02);
    profile.emotionalState.engagementLevel = Math.min(1,
      profile.emotionalState.engagementLevel + engagementBoost
    );

    // Update confidence in predictions
    profile.confidenceScore = Math.min(0.95,
      profile.confidenceScore + (events.length * 0.01)
    );

    this.userProfiles.set(userId, profile);
  }

  private async refreshExpiredRecommendations(): Promise<void> {
    for (const [userId, recommendations] of Array.from(this.recommendations.entries())) {
      const validRecommendations = recommendations.filter(rec => rec.expiresAt > new Date());

      if (validRecommendations.length < recommendations.length / 2) {
        // More than half expired, generate fresh recommendations
        const freshRecommendations = await this.generatePersonalizedRecommendations(userId);
        this.recommendations.set(userId, [...validRecommendations, ...freshRecommendations]);
      }
    }
  }

  private async updateEmotionalStates(): Promise<void> {
    for (const profile of Array.from(this.userProfiles.values())) {
      // Decay emotional states over time (return to neutral)
      profile.emotionalState.engagementLevel *= 0.9;
      profile.emotionalState.stressLevel *= 0.8;
      profile.emotionalState.fomo *= 0.85;

      // Update mood based on recent activity
      const recentActivity = this.behaviorEvents.filter(e =>
        e.userId === profile.userId &&
        e.timestamp.getTime() > Date.now() - this.LEARNING_THRESHOLDS.EMOTIONAL_STATE_WINDOW
      );

      if (recentActivity.length === 0) {
        profile.emotionalState.currentMood = 'neutral';
      }

      this.userProfiles.set(profile.userId, profile);
    }
  }
}

export const aiPersonalization = AIHyperPersonalizationEngine.getInstance();
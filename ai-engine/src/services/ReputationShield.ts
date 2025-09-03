import { 
  ReputationEvent, 
  ReputationScore, 
  ServiceResponse 
} from '../models/types';
import logger from '../utils/logger';

export class ReputationShield {
  private static instance: ReputationShield;
  private reputationDatabase: Map<string, ReputationScore> = new Map();
  private eventDatabase: Map<string, ReputationEvent[]> = new Map();
  
  private scoreThresholds = {
    excellent: 80,
    good: 60,
    fair: 40,
    poor: 20,
    banned: 0
  };

  private decayRates = {
    positive: 0.1, // 10% decay per day
    negative: 0.05, // 5% decay per day
    neutral: 0.15 // 15% decay per day
  };

  private minimumActions = {
    ban: 3, // Minimum negative events for ban
    timeout: 2, // Minimum negative events for timeout
    warning: 1 // Minimum negative events for warning
  };

  private constructor() {
    this.initializeMockData();
    logger.info('ReputationShield initialized');
  }

  static getInstance(): ReputationShield {
    if (!ReputationShield.instance) {
      ReputationShield.instance = new ReputationShield();
    }
    return ReputationShield.instance;
  }

  /**
   * Add a reputation event and update user score
   */
  async addReputationEvent(event: ReputationEvent): Promise<ReputationScore> {
    try {
      logger.info('Adding reputation event', { 
        userId: event.userId, 
        eventType: event.eventType,
        score: event.score 
      });

      // Store event
      const userEvents = this.eventDatabase.get(event.userId) || [];
      userEvents.push(event);
      this.eventDatabase.set(event.userId, userEvents);

      // Update reputation score
      const updatedScore = await this.calculateReputationScore(event.userId);
      
      // Apply decay to old events
      await this.applyDecay(event.userId);

      logger.info('Reputation event added', { 
        userId: event.userId,
        newScore: updatedScore.score,
        level: updatedScore.level 
      });

      return updatedScore;
    } catch (error) {
      logger.error('Failed to add reputation event:', error);
      throw error;
    }
  }

  /**
   * Get current reputation score for user
   */
  async getReputationScore(userId: string): Promise<ReputationScore> {
    try {
      logger.info('Getting reputation score', { userId });

      let score = this.reputationDatabase.get(userId);
      
      if (!score) {
        // Initialize new user
        score = await this.initializeUserScore(userId);
      } else {
        // Apply decay and recalculate
        await this.applyDecay(userId);
        score = await this.calculateReputationScore(userId);
      }

      logger.info('Reputation score retrieved', { 
        userId,
        score: score.score,
        level: score.level 
      });

      return score;
    } catch (error) {
      logger.error('Failed to get reputation score:', error);
      throw error;
    }
  }

  /**
   * Check if user can perform specific actions
   */
  async checkUserPermissions(userId: string): Promise<ReputationScore['restrictions']> {
    try {
      const score = await this.getReputationScore(userId);
      
      logger.info('User permissions checked', { 
        userId,
        canStream: score.restrictions.canStream,
        canComment: score.restrictions.canComment,
        canGift: score.restrictions.canGift,
        canHost: score.restrictions.canHost 
      });

      return score.restrictions;
    } catch (error) {
      logger.error('Failed to check user permissions:', error);
      throw error;
    }
  }

  /**
   * Get reputation events for user
   */
  async getUserEvents(userId: string, limit: number = 50): Promise<ReputationEvent[]> {
    try {
      const events = this.eventDatabase.get(userId) || [];
      const sortedEvents = events
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, limit);

      logger.info('User events retrieved', { 
        userId,
        eventCount: sortedEvents.length 
      });

      return sortedEvents;
    } catch (error) {
      logger.error('Failed to get user events:', error);
      throw error;
    }
  }

  /**
   * Process bulk reputation events
   */
  async processBulkEvents(events: ReputationEvent[]): Promise<ServiceResponse<ReputationScore[]>> {
    const requestId = this.generateRequestId();
    
    try {
      logger.info('Processing bulk reputation events', { 
        requestId,
        eventCount: events.length 
      });

      const results: ReputationScore[] = [];
      const processedUsers = new Set<string>();

      for (const event of events) {
        const score = await this.addReputationEvent(event);
        
        if (!processedUsers.has(event.userId)) {
          results.push(score);
          processedUsers.add(event.userId);
        }
      }

      logger.info('Bulk events processed', { 
        requestId,
        processedUsers: processedUsers.size 
      });

      return {
        success: true,
        data: results,
        timestamp: Date.now(),
        requestId
      };
    } catch (error) {
      logger.error('Bulk events processing failed', { requestId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        requestId
      };
    }
  }

  /**
   * Calculate reputation score from events
   */
  private async calculateReputationScore(userId: string): Promise<ReputationScore> {
    const events = this.eventDatabase.get(userId) || [];
    
    if (events.length === 0) {
      return this.initializeUserScore(userId);
    }

    // Calculate weighted score
    let totalScore = 0;
    let totalWeight = 0;
    let positiveEvents = 0;
    let negativeEvents = 0;

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    for (const event of events) {
      const daysSince = (now - (event.timestamp || now)) / oneDay;
      const weight = Math.exp(-this.decayRates[event.eventType] * daysSince);
      
      totalScore += event.score * weight;
      totalWeight += weight;

      if (event.eventType === 'positive') positiveEvents++;
      else if (event.eventType === 'negative') negativeEvents++;
    }

    const finalScore = totalWeight > 0 ? totalScore / totalWeight : 50;
    const level = this.getScoreLevel(finalScore);
    const restrictions = this.calculateRestrictions(finalScore, negativeEvents);

    const reputationScore: ReputationScore = {
      userId,
      score: Math.max(0, Math.min(100, finalScore)),
      level,
      totalEvents: events.length,
      recentEvents: events.filter(e => (now - (e.timestamp || now)) < 7 * 24 * 60 * 60 * 1000).length,
      positiveEvents,
      negativeEvents,
      lastUpdated: now,
      restrictions
    };

    this.reputationDatabase.set(userId, reputationScore);
    return reputationScore;
  }

  /**
   * Apply decay to user's reputation events
   */
  private async applyDecay(userId: string): Promise<void> {
    const events = this.eventDatabase.get(userId) || [];
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    // Remove events older than 90 days
    const filteredEvents = events.filter(event => {
      const daysSince = (now - (event.timestamp || now)) / oneDay;
      return daysSince < 90;
    });

    if (filteredEvents.length !== events.length) {
      this.eventDatabase.set(userId, filteredEvents);
      logger.info('Applied decay to user events', { 
        userId,
        removedEvents: events.length - filteredEvents.length 
      });
    }
  }

  /**
   * Initialize new user score
   */
  private async initializeUserScore(userId: string): Promise<ReputationScore> {
    const initialScore: ReputationScore = {
      userId,
      score: 50, // Neutral starting score
      level: 'fair',
      totalEvents: 0,
      recentEvents: 0,
      positiveEvents: 0,
      negativeEvents: 0,
      lastUpdated: Date.now(),
      restrictions: {
        canStream: true,
        canComment: true,
        canGift: true,
        canHost: true
      }
    };

    this.reputationDatabase.set(userId, initialScore);
    return initialScore;
  }

  /**
   * Get score level based on numerical score
   */
  private getScoreLevel(score: number): ReputationScore['level'] {
    if (score >= this.scoreThresholds.excellent) return 'excellent';
    if (score >= this.scoreThresholds.good) return 'good';
    if (score >= this.scoreThresholds.fair) return 'fair';
    if (score >= this.scoreThresholds.poor) return 'poor';
    return 'banned';
  }

  /**
   * Calculate user restrictions based on score and negative events
   */
  private calculateRestrictions(score: number, negativeEvents: number): ReputationScore['restrictions'] {
    const restrictions = {
      canStream: true,
      canComment: true,
      canGift: true,
      canHost: true
    };

    // Apply restrictions based on score level
    if (score < this.scoreThresholds.poor) {
      restrictions.canStream = false;
      restrictions.canHost = false;
    }

    if (score < this.scoreThresholds.fair) {
      restrictions.canGift = false;
    }

    if (score < this.scoreThresholds.good) {
      restrictions.canComment = false;
    }

    // Apply restrictions based on negative event count
    if (negativeEvents >= this.minimumActions.ban) {
      restrictions.canStream = false;
      restrictions.canHost = false;
      restrictions.canComment = false;
      restrictions.canGift = false;
    } else if (negativeEvents >= this.minimumActions.timeout) {
      restrictions.canStream = false;
      restrictions.canHost = false;
    } else if (negativeEvents >= this.minimumActions.warning) {
      restrictions.canGift = false;
    }

    return restrictions;
  }

  /**
   * Initialize mock data for testing
   */
  private initializeMockData(): void {
    // Mock reputation events
    const mockEvents: ReputationEvent[] = [
      {
        userId: 'user_001',
        eventType: 'positive',
        score: 10,
        reason: 'Helpful community member',
        timestamp: Date.now() - 86400000, // 1 day ago
        source: 'engagement'
      },
      {
        userId: 'user_002',
        eventType: 'negative',
        score: -15,
        reason: 'Inappropriate content',
        timestamp: Date.now() - 172800000, // 2 days ago
        source: 'moderation'
      },
      {
        userId: 'user_003',
        eventType: 'positive',
        score: 5,
        reason: 'Regular streamer',
        timestamp: Date.now() - 43200000, // 12 hours ago
        source: 'engagement'
      }
    ];

    // Add mock events
    mockEvents.forEach(event => {
      const userEvents = this.eventDatabase.get(event.userId) || [];
      userEvents.push(event);
      this.eventDatabase.set(event.userId, userEvents);
    });

    // Initialize scores for mock users
    mockEvents.forEach(async event => {
      await this.calculateReputationScore(event.userId);
    });
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `rep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update score thresholds
   */
  updateScoreThresholds(thresholds: Partial<typeof this.scoreThresholds>): void {
    this.scoreThresholds = { ...this.scoreThresholds, ...thresholds };
    logger.info('Updated score thresholds', { thresholds: this.scoreThresholds });
  }

  /**
   * Update decay rates
   */
  updateDecayRates(rates: Partial<typeof this.decayRates>): void {
    this.decayRates = { ...this.decayRates, ...rates };
    logger.info('Updated decay rates', { rates: this.decayRates });
  }

  /**
   * Update minimum actions
   */
  updateMinimumActions(actions: Partial<typeof this.minimumActions>): void {
    this.minimumActions = { ...this.minimumActions, ...actions };
    logger.info('Updated minimum actions', { actions: this.minimumActions });
  }

  /**
   * Get current configuration
   */
  getConfiguration() {
    return {
      scoreThresholds: { ...this.scoreThresholds },
      decayRates: { ...this.decayRates },
      minimumActions: { ...this.minimumActions }
    };
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const totalUsers = this.reputationDatabase.size;
    const totalEvents = Array.from(this.eventDatabase.values())
      .reduce((sum, events) => sum + events.length, 0);
    
    const levelDistribution = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
      banned: 0
    };

    for (const score of this.reputationDatabase.values()) {
      levelDistribution[score.level as keyof typeof levelDistribution]++;
    }

    return {
      totalUsers,
      totalEvents,
      levelDistribution
    };
  }
}

import { ReputationShield } from '../services/ReputationShield';
import { ReputationEvent, ReputationScore } from '../models/types';

describe('ReputationShield', () => {
  let reputationShield: ReputationShield;

  beforeEach(() => {
    reputationShield = ReputationShield.getInstance();
  });

  describe('addReputationEvent', () => {
    it('should add a positive reputation event', async () => {
      const event: ReputationEvent = {
        userId: 'test-user-001',
        eventType: 'positive',
        score: 10,
        reason: 'Helpful community member',
        timestamp: Date.now(),
        source: 'engagement'
      };
      
      const result = await reputationShield.addReputationEvent(event);
      
      expect(result).toBeDefined();
      expect(result.userId).toBe(event.userId);
      expect(result.score).toBeGreaterThan(0);
      expect(result.level).toBeDefined();
      expect(result.totalEvents).toBeGreaterThan(0);
      expect(result.positiveEvents).toBeGreaterThan(0);
    });

    it('should add a negative reputation event', async () => {
      const event: ReputationEvent = {
        userId: 'test-user-002',
        eventType: 'negative',
        score: -15,
        reason: 'Inappropriate content',
        timestamp: Date.now(),
        source: 'moderation'
      };
      
      const result = await reputationShield.addReputationEvent(event);
      
      expect(result).toBeDefined();
      expect(result.userId).toBe(event.userId);
      expect(result.negativeEvents).toBeGreaterThan(0);
    });

    it('should add a neutral reputation event', async () => {
      const event: ReputationEvent = {
        userId: 'test-user-003',
        eventType: 'neutral',
        score: 0,
        reason: 'System event',
        timestamp: Date.now(),
        source: 'system'
      };
      
      const result = await reputationShield.addReputationEvent(event);
      
      expect(result).toBeDefined();
      expect(result.userId).toBe(event.userId);
    });
  });

  describe('getReputationScore', () => {
    it('should get reputation score for existing user', async () => {
      const userId = 'user_001';
      
      const result = await reputationShield.getReputationScore(userId);
      
      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('level');
      expect(result).toHaveProperty('totalEvents');
      expect(result).toHaveProperty('positiveEvents');
      expect(result).toHaveProperty('negativeEvents');
      expect(result).toHaveProperty('lastUpdated');
      expect(result).toHaveProperty('restrictions');
      expect(typeof result.score).toBe('number');
      expect(['excellent', 'good', 'fair', 'poor', 'banned']).toContain(result.level);
    });

    it('should initialize new user with default score', async () => {
      const userId = 'new-user-999';
      
      const result = await reputationShield.getReputationScore(userId);
      
      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.score).toBe(50); // Default neutral score
      expect(result.level).toBe('fair');
      expect(result.totalEvents).toBe(0);
      expect(result.positiveEvents).toBe(0);
      expect(result.negativeEvents).toBe(0);
    });
  });

  describe('checkUserPermissions', () => {
    it('should check permissions for user', async () => {
      const userId = 'user_001';
      
      const result = await reputationShield.checkUserPermissions(userId);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('canStream');
      expect(result).toHaveProperty('canComment');
      expect(result).toHaveProperty('canGift');
      expect(result).toHaveProperty('canHost');
      expect(typeof result.canStream).toBe('boolean');
      expect(typeof result.canComment).toBe('boolean');
      expect(typeof result.canGift).toBe('boolean');
      expect(typeof result.canHost).toBe('boolean');
    });
  });

  describe('getUserEvents', () => {
    it('should get user events with default limit', async () => {
      const userId = 'user_001';
      
      const result = await reputationShield.getUserEvents(userId);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      if (result.length > 0) {
        const event = result[0];
        expect(event).toHaveProperty('userId');
        expect(event).toHaveProperty('eventType');
        expect(event).toHaveProperty('score');
        expect(event).toHaveProperty('reason');
        expect(event).toHaveProperty('timestamp');
        expect(event).toHaveProperty('source');
        expect(event.userId).toBe(userId);
      }
    });

    it('should get user events with custom limit', async () => {
      const userId = 'user_001';
      const limit = 10;
      
      const result = await reputationShield.getUserEvents(userId, limit);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('processBulkEvents', () => {
    it('should process multiple reputation events', async () => {
      const events: ReputationEvent[] = [
        {
          userId: 'bulk-user-001',
          eventType: 'positive',
          score: 5,
          reason: 'First positive event',
          timestamp: Date.now(),
          source: 'engagement'
        },
        {
          userId: 'bulk-user-002',
          eventType: 'negative',
          score: -10,
          reason: 'First negative event',
          timestamp: Date.now(),
          source: 'moderation'
        }
      ];
      
      const result = await reputationShield.processBulkEvents(events);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBe(2);
    });
  });

  describe('configuration', () => {
    it('should get current configuration', () => {
      const config = reputationShield.getConfiguration();
      
      expect(config).toBeDefined();
      expect(config).toHaveProperty('scoreThresholds');
      expect(config).toHaveProperty('decayRates');
      expect(config).toHaveProperty('minimumActions');
      expect(config.scoreThresholds).toHaveProperty('excellent');
      expect(config.scoreThresholds).toHaveProperty('good');
      expect(config.scoreThresholds).toHaveProperty('fair');
      expect(config.scoreThresholds).toHaveProperty('poor');
      expect(config.scoreThresholds).toHaveProperty('banned');
      expect(config.decayRates).toHaveProperty('positive');
      expect(config.decayRates).toHaveProperty('negative');
      expect(config.decayRates).toHaveProperty('neutral');
      expect(config.minimumActions).toHaveProperty('ban');
      expect(config.minimumActions).toHaveProperty('timeout');
      expect(config.minimumActions).toHaveProperty('warning');
    });

    it('should update score thresholds', () => {
      const newThresholds = { excellent: 85 };
      
      reputationShield.updateScoreThresholds(newThresholds);
      const config = reputationShield.getConfiguration();
      
      expect(config.scoreThresholds.excellent).toBe(85);
    });

    it('should update decay rates', () => {
      const newRates = { positive: 0.15 };
      
      reputationShield.updateDecayRates(newRates);
      const config = reputationShield.getConfiguration();
      
      expect(config.decayRates.positive).toBe(0.15);
    });

    it('should update minimum actions', () => {
      const newActions = { ban: 4 };
      
      reputationShield.updateMinimumActions(newActions);
      const config = reputationShield.getConfiguration();
      
      expect(config.minimumActions.ban).toBe(4);
    });
  });

  describe('statistics', () => {
    it('should get system statistics', () => {
      const stats = reputationShield.getStatistics();
      
      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('totalUsers');
      expect(stats).toHaveProperty('totalEvents');
      expect(stats).toHaveProperty('levelDistribution');
      expect(typeof stats.totalUsers).toBe('number');
      expect(typeof stats.totalEvents).toBe('number');
      expect(stats.levelDistribution).toHaveProperty('excellent');
      expect(stats.levelDistribution).toHaveProperty('good');
      expect(stats.levelDistribution).toHaveProperty('fair');
      expect(stats.levelDistribution).toHaveProperty('poor');
      expect(stats.levelDistribution).toHaveProperty('banned');
    });
  });
});

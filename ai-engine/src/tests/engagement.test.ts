import { EngagementService } from '../services/EngagementService';
import { BoredomEvent, BoredomAnalysis, CohostCandidate, FestivalSkin } from '../models/types';

describe('EngagementService', () => {
  let engagementService: EngagementService;

  beforeEach(() => {
    engagementService = EngagementService.getInstance();
  });

  describe('boredom_detector', () => {
    it('should detect boredom from viewer events', async () => {
      const viewerEvents: BoredomEvent[] = [
        {
          viewerId: 'user1',
          timestamp: Date.now() - 60000,
          eventType: 'view',
          duration: 300
        },
        {
          viewerId: 'user2',
          timestamp: Date.now() - 30000,
          eventType: 'leave'
        },
        {
          viewerId: 'user3',
          timestamp: Date.now(),
          eventType: 'like'
        }
      ];
      
      const result = await engagementService.boredom_detector(viewerEvents);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('trend');
      expect(result).toHaveProperty('suggestions');
      expect(typeof result.score).toBe('number');
      expect(['increasing', 'decreasing', 'stable']).toContain(result.trend);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should handle empty events array', async () => {
      const result = await engagementService.boredom_detector([]);
      
      expect(result).toBeDefined();
      expect(result.score).toBe(0);
      expect(result.trend).toBe('stable');
      expect(result.suggestions).toContain('No events to analyze');
    });

    it('should suggest boost multiplier for high boredom', async () => {
      const highBoredomEvents: BoredomEvent[] = Array(20).fill(null).map((_, i) => ({
        viewerId: `user${i}`,
        timestamp: Date.now() - (i * 1000),
        eventType: 'leave'
      }));
      
      const result = await engagementService.boredom_detector(highBoredomEvents);
      
      expect(result).toBeDefined();
      expect(result.score).toBeGreaterThan(0);
      expect(result.boostMultiplier).toBeDefined();
    });
  });

  describe('cohost_suggester', () => {
    it('should suggest cohosts based on host ID and country', async () => {
      const hostId = 'host_001';
      const country = 'US';
      
      const result = await engagementService.cohost_suggester(hostId, country);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      
      if (result.length > 0) {
        const candidate = result[0];
        expect(candidate).toHaveProperty('hostId');
        expect(candidate).toHaveProperty('name');
        expect(candidate).toHaveProperty('avatar');
        expect(candidate).toHaveProperty('rating');
        expect(candidate).toHaveProperty('compatibility');
        expect(candidate).toHaveProperty('availability');
        expect(candidate).toHaveProperty('languages');
        expect(candidate).toHaveProperty('specialties');
        expect(typeof candidate.rating).toBe('number');
        expect(typeof candidate.compatibility).toBe('number');
        expect(typeof candidate.availability).toBe('boolean');
        expect(Array.isArray(candidate.languages)).toBe(true);
        expect(Array.isArray(candidate.specialties)).toBe(true);
      }
    });

    it('should filter out unavailable candidates', async () => {
      const hostId = 'host_001';
      const country = 'US';
      
      const result = await engagementService.cohost_suggester(hostId, country);
      
      result.forEach(candidate => {
        expect(candidate.availability).toBe(true);
      });
    });

    it('should not suggest the same host', async () => {
      const hostId = 'host_001';
      const country = 'US';
      
      const result = await engagementService.cohost_suggester(hostId, country);
      
      result.forEach(candidate => {
        expect(candidate.hostId).not.toBe(hostId);
      });
    });
  });

  describe('festival_skinner', () => {
    it('should return festival skin for valid country and date', async () => {
      const country = 'BR';
      const date = '2024-02-10'; // During carnival period
      
      const result = await engagementService.festival_skinner(country, date);
      
      expect(result).toBeDefined();
      if (result) {
        expect(result).toHaveProperty('skinId');
        expect(result).toHaveProperty('name');
        expect(result).toHaveProperty('description');
        expect(result).toHaveProperty('imageUrl');
        expect(result).toHaveProperty('giftSet');
        expect(result).toHaveProperty('active');
        expect(result).toHaveProperty('country');
        expect(result).toHaveProperty('startDate');
        expect(result).toHaveProperty('endDate');
        expect(result.active).toBe(true);
        expect(result.country).toBe(country);
        expect(result.giftSet).toHaveProperty('giftId');
        expect(result.giftSet).toHaveProperty('name');
        expect(result.giftSet).toHaveProperty('description');
        expect(result.giftSet).toHaveProperty('imageUrl');
        expect(result.giftSet).toHaveProperty('rarity');
        expect(result.giftSet).toHaveProperty('value');
      }
    });

    it('should return null for inactive festival', async () => {
      const country = 'US';
      const date = '2024-01-01'; // No festival on this date
      
      const result = await engagementService.festival_skinner(country, date);
      
      expect(result).toBeNull();
    });

    it('should return null for invalid country', async () => {
      const country = 'XX';
      const date = '2024-02-10';
      
      const result = await engagementService.festival_skinner(country, date);
      
      expect(result).toBeNull();
    });
  });

  describe('thresholds', () => {
    it('should get current boredom thresholds', () => {
      const thresholds = engagementService.getBoredomThresholds();
      
      expect(thresholds).toBeDefined();
      expect(thresholds).toHaveProperty('low');
      expect(thresholds).toHaveProperty('medium');
      expect(thresholds).toHaveProperty('high');
      expect(thresholds).toHaveProperty('critical');
      expect(typeof thresholds.low).toBe('number');
      expect(typeof thresholds.medium).toBe('number');
      expect(typeof thresholds.high).toBe('number');
      expect(typeof thresholds.critical).toBe('number');
    });

    it('should update boredom thresholds', () => {
      const newThresholds = { critical: 90 };
      
      engagementService.updateBoredomThresholds(newThresholds);
      const updatedThresholds = engagementService.getBoredomThresholds();
      
      expect(updatedThresholds.critical).toBe(90);
    });
  });
});

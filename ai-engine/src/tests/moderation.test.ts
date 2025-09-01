import { ModerationService } from '../services/ModerationService';
import { NSFWScanResult, AgeEstimateResult, ProfanityResult, PolicyAction } from '../models/types';

describe('ModerationService', () => {
  let moderationService: ModerationService;

  beforeEach(() => {
    moderationService = ModerationService.getInstance();
  });

  describe('nsfw_frame_scan', () => {
    it('should scan video frames for NSFW content', async () => {
      const mockFrames = [Buffer.from('mock-frame-1'), Buffer.from('mock-frame-2')];
      
      const result = await moderationService.nsfw_frame_scan(undefined, mockFrames);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      
      result.forEach(scanResult => {
        expect(scanResult).toHaveProperty('label');
        expect(scanResult).toHaveProperty('score');
        expect(scanResult).toHaveProperty('confidence');
        expect(typeof scanResult.score).toBe('number');
        expect(typeof scanResult.confidence).toBe('number');
      });
    });

    it('should handle video URL input', async () => {
      const videoUrl = 'https://example.com/video.mp4';
      
      const result = await moderationService.nsfw_frame_scan(videoUrl);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should throw error when no input provided', async () => {
      await expect(moderationService.nsfw_frame_scan()).rejects.toThrow();
    });
  });

  describe('age_estimate', () => {
    it('should estimate age from face frame', async () => {
      const faceFrame = Buffer.from('mock-face-frame');
      
      const result = await moderationService.age_estimate(faceFrame);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('ageEstimate');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('ageRange');
      expect(result.ageRange).toHaveProperty('min');
      expect(result.ageRange).toHaveProperty('max');
      expect(typeof result.ageEstimate).toBe('number');
      expect(typeof result.confidence).toBe('number');
    });
  });

  describe('asr_profanity', () => {
    it('should check audio for profanity', async () => {
      const audio = Buffer.from('mock-audio-data');
      
      const result = await moderationService.asr_profanity(audio);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('badnessScore');
      expect(result).toHaveProperty('detectedWords');
      expect(result).toHaveProperty('severity');
      expect(typeof result.badnessScore).toBe('number');
      expect(Array.isArray(result.detectedWords)).toBe(true);
      expect(['low', 'medium', 'high', 'critical']).toContain(result.severity);
    });
  });

  describe('policy_enforcer', () => {
    it('should enforce policies for text content', async () => {
      const textSubject = 'This is a test message';
      
      const result = await moderationService.policy_enforcer(textSubject);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('action');
      expect(result).toHaveProperty('reason');
      expect(result).toHaveProperty('confidence');
      expect(['warn', 'blur', 'ban', 'timeout', 'none']).toContain(result.action);
    });

    it('should enforce policies for NSFW results', async () => {
      const nsfwSubject = {
        nsfwResults: [
          { label: 'nsfw', score: 0.8, confidence: 0.9 }
        ]
      };
      
      const result = await moderationService.policy_enforcer(nsfwSubject);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('action');
    });

    it('should enforce policies for age results', async () => {
      const ageSubject = {
        ageResult: {
          ageEstimate: 12,
          confidence: 0.8,
          ageRange: { min: 10, max: 14 }
        }
      };
      
      const result = await moderationService.policy_enforcer(ageSubject);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('action');
    });
  });

  describe('thresholds', () => {
    it('should get current thresholds', () => {
      const thresholds = moderationService.getThresholds();
      
      expect(thresholds).toBeDefined();
      expect(thresholds).toHaveProperty('nsfw');
      expect(thresholds).toHaveProperty('age');
      expect(thresholds).toHaveProperty('profanity');
      expect(thresholds).toHaveProperty('toxicity');
    });

    it('should update thresholds', () => {
      const newThresholds = { nsfw: 0.8 };
      
      moderationService.updateThresholds(newThresholds);
      const updatedThresholds = moderationService.getThresholds();
      
      expect(updatedThresholds.nsfw).toBe(0.8);
    });
  });
});

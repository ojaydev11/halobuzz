import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AntiCheatService } from '../../services/AntiCheatService';
import { GameAction } from '../../types/games';

describe('Anti-Cheat System', () => {
  let antiCheat: AntiCheatService;

  beforeEach(() => {
    antiCheat = new AntiCheatService();
  });

  describe('Action Rate Limiting', () => {
    it('should detect impossible APM (actions per minute)', async () => {
      const userId = 'speedHacker';
      const actions: GameAction[] = [];
      
      // Simulate 120 actions in 1 second (7200 APM - impossible)
      const now = Date.now();
      for (let i = 0; i < 120; i++) {
        actions.push({
          userId,
          actionId: `action-${i}`,
          type: 'tap',
          timestamp: now + i * 8, // 8ms between actions
          data: {},
          validated: false
        });
      }
      
      const result = await antiCheat.validateActionSequence(actions);
      
      expect(result.suspicious).toBe(true);
      expect(result.reason).toContain('APM');
      expect(result.apm).toBeGreaterThan(6000);
    });

    it('should allow reasonable human APM', async () => {
      const userId = 'legitimatePlayer';
      const actions: GameAction[] = [];
      
      // Simulate 60 actions in 1 second (3600 APM - fast but possible)
      const now = Date.now();
      for (let i = 0; i < 60; i++) {
        actions.push({
          userId,
          actionId: `action-${i}`,
          type: 'tap',
          timestamp: now + i * 16, // ~60 FPS
          data: {},
          validated: false
        });
      }
      
      const result = await antiCheat.validateActionSequence(actions);
      
      expect(result.suspicious).toBe(false);
      expect(result.apm).toBeLessThan(4000);
    });

    it('should detect action spam (60+ actions per second)', async () => {
      const userId = 'spammer';
      const roomId = 'room-123';
      const now = Date.now();
      
      // Send 61 actions in 1 second
      const actions = Array.from({ length: 61 }, (_, i) => ({
        userId,
        roomId,
        type: 'action',
        data: { index: i },
        timestamp: now + i * 16
      }));
      
      const violations = await antiCheat.checkSpamProtection(userId, roomId, actions);
      
      expect(violations).toBeGreaterThan(0);
    });

    it('should not flag legitimate rapid gameplay', async () => {
      const userId = 'skillfulPlayer';
      const roomId = 'room-456';
      const now = Date.now();
      
      // Send 45 actions in 1 second (within 60/sec limit)
      const actions = Array.from({ length: 45 }, (_, i) => ({
        userId,
        roomId,
        type: 'action',
        data: { index: i },
        timestamp: now + i * 22
      }));
      
      const violations = await antiCheat.checkSpamProtection(userId, roomId, actions);
      
      expect(violations).toBe(0);
    });
  });

  describe('Accuracy Detection', () => {
    it('should flag impossible accuracy in trivia', async () => {
      const userId = 'triviaCheater';
      
      // 100% accuracy with instant answers (< 100ms reaction time)
      const triviaSession = {
        userId,
        gameId: 'trivia-royale',
        questions: [
          { answered: true, correct: true, time: 50 },
          { answered: true, correct: true, time: 60 },
          { answered: true, correct: true, time: 55 },
          { answered: true, correct: true, time: 45 },
          { answered: true, correct: true, time: 70 }
        ]
      };
      
      const result = await antiCheat.analyzeTriviaSession(triviaSession);
      
      expect(result.suspicious).toBe(true);
      expect(result.reason).toContain('impossible reaction time');
      expect(result.accuracy).toBe(1.0);
      expect(result.avgResponseTime).toBeLessThan(100);
    });

    it('should allow high accuracy with reasonable timing', async () => {
      const userId = 'smartPlayer';
      
      // 80% accuracy with human reaction times
      const triviaSession = {
        userId,
        gameId: 'trivia-royale',
        questions: [
          { answered: true, correct: true, time: 800 },
          { answered: true, correct: true, time: 1200 },
          { answered: true, correct: false, time: 900 },
          { answered: true, correct: true, time: 1500 },
          { answered: true, correct: true, time: 1100 }
        ]
      };
      
      const result = await antiCheat.analyzeTriviaSession(triviaSession);
      
      expect(result.suspicious).toBe(false);
      expect(result.accuracy).toBe(0.8);
      expect(result.avgResponseTime).toBeGreaterThan(500);
    });

    it('should detect pattern in coin flip wins', async () => {
      const userId = 'coinFlipper';
      
      // Unrealistic 15 wins in a row
      const coinFlipHistory = Array.from({ length: 15 }, (_, i) => ({
        userId,
        gameId: 'coin-flip',
        result: 'win',
        timestamp: Date.now() + i * 1000
      }));
      
      const result = await antiCheat.analyzeCoinFlipPattern(coinFlipHistory);
      
      expect(result.suspicious).toBe(true);
      expect(result.probability).toBeLessThan(0.0001); // 1 in 32,768
      expect(result.winStreak).toBe(15);
    });

    it('should allow normal coin flip variance', async () => {
      const userId = 'normalPlayer';
      
      // Realistic mix of wins/losses
      const coinFlipHistory = [
        { result: 'win' },
        { result: 'loss' },
        { result: 'win' },
        { result: 'win' },
        { result: 'loss' },
        { result: 'loss' },
        { result: 'win' },
        { result: 'loss' }
      ];
      
      const result = await antiCheat.analyzeCoinFlipPattern(coinFlipHistory);
      
      expect(result.suspicious).toBe(false);
      expect(result.winRate).toBeGreaterThan(0.3);
      expect(result.winRate).toBeLessThan(0.7);
    });
  });

  describe('Score Validation', () => {
    it('should reject score without valid signature', async () => {
      const scoreSubmission = {
        userId: 'hacker',
        sessionId: 'session-123',
        score: 1000000,
        signature: 'fake-signature'
      };
      
      const result = await antiCheat.validateScoreSignature(scoreSubmission);
      
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid signature');
    });

    it('should accept score with valid HMAC signature', async () => {
      const scoreData = {
        userId: 'player',
        sessionId: 'session-456',
        score: 5000,
        timestamp: Date.now()
      };
      
      // Generate valid signature
      const signature = await antiCheat.generateScoreSignature(scoreData);
      
      const result = await antiCheat.validateScoreSignature({
        ...scoreData,
        signature
      });
      
      expect(result.valid).toBe(true);
    });

    it('should detect modified score with reused signature', async () => {
      const originalScore = {
        userId: 'player',
        sessionId: 'session-789',
        score: 1000,
        timestamp: Date.now()
      };
      
      const validSignature = await antiCheat.generateScoreSignature(originalScore);
      
      // Attempt to modify score while keeping signature
      const modifiedScore = {
        ...originalScore,
        score: 10000, // Modified
        signature: validSignature
      };
      
      const result = await antiCheat.validateScoreSignature(modifiedScore);
      
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('tampered');
    });

    it('should reject replay of old score submission', async () => {
      const oldSubmission = {
        userId: 'player',
        sessionId: 'old-session',
        score: 5000,
        timestamp: Date.now() - 3600000 // 1 hour ago
      };
      
      const signature = await antiCheat.generateScoreSignature(oldSubmission);
      
      const result = await antiCheat.validateScoreSignature({
        ...oldSubmission,
        signature
      });
      
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('expired');
    });
  });

  describe('Anomaly Scoring', () => {
    it('should calculate composite suspicion score', async () => {
      const playerBehavior = {
        userId: 'suspectPlayer',
        apm: 5000, // Very high
        accuracy: 0.95, // Very high
        avgReactionTime: 120, // Very fast
        winRate: 0.75, // High
        consecutiveWins: 8 // Long streak
      };
      
      const anomalyScore = await antiCheat.calculateAnomalyScore(playerBehavior);
      
      expect(anomalyScore).toBeGreaterThan(0.7); // High suspicion
      expect(anomalyScore).toBeLessThanOrEqual(1.0);
    });

    it('should give low score to normal player behavior', async () => {
      const playerBehavior = {
        userId: 'normalPlayer',
        apm: 300, // Normal
        accuracy: 0.65, // Normal
        avgReactionTime: 800, // Normal
        winRate: 0.52, // Close to 50%
        consecutiveWins: 3 // Normal
      };
      
      const anomalyScore = await antiCheat.calculateAnomalyScore(playerBehavior);
      
      expect(anomalyScore).toBeLessThan(0.3); // Low suspicion
    });

    it('should trigger shadow ban at high suspicion threshold', async () => {
      const userId = 'flaggedPlayer';
      
      // Build up suspicion over multiple sessions
      for (let i = 0; i < 5; i++) {
        await antiCheat.recordSuspiciousActivity(userId, {
          type: 'impossible_apm',
          severity: 0.8,
          timestamp: Date.now()
        });
      }
      
      const status = await antiCheat.getPlayerStatus(userId);
      
      expect(status.shadowBanned).toBe(true);
      expect(status.suspicionScore).toBeGreaterThan(0.8);
    });

    it('should log audit trail for suspicious activity', async () => {
      const userId = 'auditPlayer';
      const activity = {
        type: 'score_tampering',
        sessionId: 'session-999',
        evidence: { modifiedScore: true },
        timestamp: Date.now()
      };
      
      await antiCheat.recordSuspiciousActivity(userId, activity);
      
      const audit = await antiCheat.getAuditTrail(userId);
      
      expect(audit).toHaveLength(1);
      expect(audit[0].type).toBe('score_tampering');
      expect(audit[0].evidence).toBeDefined();
    });
  });

  describe('Rate-Based Protection', () => {
    it('should throttle rapid session creation', async () => {
      const userId = 'rapidStarter';
      
      // Attempt to create 10 sessions in 1 second
      const attempts = Array.from({ length: 10 }, () => 
        antiCheat.checkSessionCreationRate(userId)
      );
      
      const results = await Promise.all(attempts);
      const blocked = results.filter(r => !r.allowed).length;
      
      expect(blocked).toBeGreaterThan(5); // Some should be blocked
    });

    it('should allow normal session creation rate', async () => {
      const userId = 'normalStarter';
      
      // Create sessions with reasonable delays
      const result1 = await antiCheat.checkSessionCreationRate(userId);
      await new Promise(resolve => setTimeout(resolve, 1000));
      const result2 = await antiCheat.checkSessionCreationRate(userId);
      
      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });
  });
});


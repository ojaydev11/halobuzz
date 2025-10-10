import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { TournamentService } from '../../services/TournamentService';
import { Tournament, TournamentEntry } from '../../types/tournament';

describe('Tournament System', () => {
  let tournamentService: TournamentService;

  beforeEach(() => {
    tournamentService = new TournamentService();
  });

  describe('Score Submission Idempotency', () => {
    it('should accept first score submission', async () => {
      const submission = {
        tournamentId: 'tournament-1',
        userId: 'player1',
        sessionId: 'session-123',
        score: 1000,
        signature: 'valid-sig'
      };
      
      const result = await tournamentService.submitScore(submission);
      
      expect(result.success).toBe(true);
      expect(result.newScore).toBe(1000);
    });

    it('should reject duplicate score submission (same sessionId)', async () => {
      const submission = {
        tournamentId: 'tournament-1',
        userId: 'player1',
        sessionId: 'session-123',
        score: 1000,
        signature: 'valid-sig'
      };
      
      // First submission
      await tournamentService.submitScore(submission);
      
      // Duplicate submission
      const result = await tournamentService.submitScore(submission);
      
      expect(result.success).toBe(false);
      expect(result.reason).toContain('duplicate');
    });

    it('should accept new score with different sessionId', async () => {
      const userId = 'player1';
      const tournamentId = 'tournament-1';
      
      // First score
      await tournamentService.submitScore({
        tournamentId,
        userId,
        sessionId: 'session-1',
        score: 1000,
        signature: 'sig-1'
      });
      
      // New session, higher score
      const result = await tournamentService.submitScore({
        tournamentId,
        userId,
        sessionId: 'session-2',
        score: 1500,
        signature: 'sig-2'
      });
      
      expect(result.success).toBe(true);
      expect(result.newScore).toBe(1500);
    });

    it('should keep best score when multiple submissions', async () => {
      const userId = 'player1';
      const tournamentId = 'tournament-1';
      
      await tournamentService.submitScore({
        tournamentId, userId,
        sessionId: 's1', score: 1000, signature: 'sig1'
      });
      
      await tournamentService.submitScore({
        tournamentId, userId,
        sessionId: 's2', score: 800, signature: 'sig2'
      });
      
      await tournamentService.submitScore({
        tournamentId, userId,
        sessionId: 's3', score: 1200, signature: 'sig3'
      });
      
      const entry = await tournamentService.getPlayerEntry(tournamentId, userId);
      
      expect(entry.bestScore).toBe(1200);
      expect(entry.sessionId).toBe('s3');
    });

    it('should use Redis to prevent duplicate submissions', async () => {
      const submission = {
        tournamentId: 't1',
        userId: 'p1',
        sessionId: 'unique-session',
        score: 500,
        signature: 'sig'
      };
      
      // First submission sets Redis key
      await tournamentService.submitScore(submission);
      
      // Check Redis key exists
      const exists = await tournamentService.checkSubmissionProcessed(
        submission.tournamentId,
        submission.sessionId
      );
      
      expect(exists).toBe(true);
    });

    it('should expire idempotency keys after tournament ends', async () => {
      const tournamentId = 'expiring-tournament';
      const sessionId = 'temp-session';
      
      await tournamentService.submitScore({
        tournamentId,
        userId: 'p1',
        sessionId,
        score: 100,
        signature: 'sig'
      });
      
      // End tournament
      await tournamentService.endTournament(tournamentId);
      
      // Wait for key expiration (mocked)
      jest.advanceTimersByTime(3600000); // 1 hour
      
      const exists = await tournamentService.checkSubmissionProcessed(
        tournamentId,
        sessionId
      );
      
      expect(exists).toBe(false);
    });
  });

  describe('Prize Distribution', () => {
    it('should distribute prizes to top 3 finishers', async () => {
      const tournamentId = 'prize-tournament';
      const entryFee = 100;
      const players = [
        { userId: 'p1', score: 1000 },
        { userId: 'p2', score: 900 },
        { userId: 'p3', score: 800 },
        { userId: 'p4', score: 700 }
      ];
      
      // Create tournament
      await tournamentService.createTournament({
        id: tournamentId,
        entryFee,
        prizeDistribution: [0.5, 0.3, 0.2] // 50%, 30%, 20%
      });
      
      // Players join and submit scores
      for (const player of players) {
        await tournamentService.joinTournament(tournamentId, player.userId, entryFee);
        await tournamentService.submitScore({
          tournamentId,
          userId: player.userId,
          sessionId: `session-${player.userId}`,
          score: player.score,
          signature: 'sig'
        });
      }
      
      // End tournament and distribute prizes
      const result = await tournamentService.endTournament(tournamentId);
      
      const totalPool = entryFee * players.length; // 400
      
      expect(result.prizes[0]).toEqual({
        userId: 'p1',
        rank: 1,
        prize: totalPool * 0.5 // 200
      });
      
      expect(result.prizes[1]).toEqual({
        userId: 'p2',
        rank: 2,
        prize: totalPool * 0.3 // 120
      });
      
      expect(result.prizes[2]).toEqual({
        userId: 'p3',
        rank: 3,
        prize: totalPool * 0.2 // 80
      });
    });

    it('should handle tie-breaking correctly', async () => {
      const tournamentId = 'tie-tournament';
      
      // Two players with same score
      await tournamentService.submitScore({
        tournamentId,
        userId: 'p1',
        sessionId: 's1',
        score: 1000,
        signature: 'sig1',
        timestamp: Date.now()
      });
      
      await tournamentService.submitScore({
        tournamentId,
        userId: 'p2',
        sessionId: 's2',
        score: 1000,
        signature: 'sig2',
        timestamp: Date.now() + 1000 // 1 second later
      });
      
      const leaderboard = await tournamentService.getLeaderboard(tournamentId);
      
      // Earlier submission wins tie
      expect(leaderboard[0].userId).toBe('p1');
      expect(leaderboard[1].userId).toBe('p2');
    });

    it('should not distribute more than prize pool', async () => {
      const tournamentId = 'capped-tournament';
      const entryFee = 50;
      
      await tournamentService.createTournament({
        id: tournamentId,
        entryFee,
        prizeDistribution: [0.5, 0.3, 0.2]
      });
      
      // 5 players join
      for (let i = 1; i <= 5; i++) {
        await tournamentService.joinTournament(tournamentId, `p${i}`, entryFee);
      }
      
      const result = await tournamentService.endTournament(tournamentId);
      
      const totalPrizes = result.prizes.reduce((sum, p) => sum + p.prize, 0);
      const totalPool = entryFee * 5; // 250
      
      expect(totalPrizes).toBe(totalPool);
    });

    it('should handle single player tournament', async () => {
      const tournamentId = 'solo-tournament';
      const entryFee = 100;
      
      await tournamentService.createTournament({
        id: tournamentId,
        entryFee,
        prizeDistribution: [1.0] // Winner takes all
      });
      
      await tournamentService.joinTournament(tournamentId, 'lonely-player', entryFee);
      await tournamentService.submitScore({
        tournamentId,
        userId: 'lonely-player',
        sessionId: 'only-session',
        score: 500,
        signature: 'sig'
      });
      
      const result = await tournamentService.endTournament(tournamentId);
      
      expect(result.prizes).toHaveLength(1);
      expect(result.prizes[0].prize).toBe(entryFee);
    });
  });

  describe('Leaderboard Caching', () => {
    it('should cache leaderboard in Redis', async () => {
      const tournamentId = 'cached-tournament';
      
      // Generate leaderboard
      const leaderboard = await tournamentService.getLeaderboard(tournamentId);
      
      // Check cache hit
      const cached = await tournamentService.getCachedLeaderboard(tournamentId);
      
      expect(cached).toEqual(leaderboard);
    });

    it('should invalidate cache on new score submission', async () => {
      const tournamentId = 'live-tournament';
      
      // Get initial leaderboard (cached)
      const lb1 = await tournamentService.getLeaderboard(tournamentId);
      
      // Submit new score
      await tournamentService.submitScore({
        tournamentId,
        userId: 'new-player',
        sessionId: 'new-session',
        score: 2000,
        signature: 'sig'
      });
      
      // Leaderboard should be regenerated
      const lb2 = await tournamentService.getLeaderboard(tournamentId);
      
      expect(lb2).not.toEqual(lb1);
      expect(lb2[0].userId).toBe('new-player');
    });

    it('should set appropriate TTL on cached leaderboard', async () => {
      const tournamentId = 't1';
      
      await tournamentService.getLeaderboard(tournamentId);
      
      const ttl = await tournamentService.getCacheTTL(tournamentId);
      
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(300); // Max 5 minutes
    });
  });

  describe('Tournament State Management', () => {
    it('should not allow joining after tournament starts', async () => {
      const tournamentId = 'started-tournament';
      
      await tournamentService.createTournament({
        id: tournamentId,
        startTime: Date.now() - 1000, // Already started
        status: 'active'
      });
      
      const result = await tournamentService.joinTournament(
        tournamentId,
        'late-player',
        100
      );
      
      expect(result.success).toBe(false);
      expect(result.reason).toContain('already started');
    });

    it('should not accept scores after tournament ends', async () => {
      const tournamentId = 'ended-tournament';
      
      await tournamentService.createTournament({
        id: tournamentId,
        endTime: Date.now() - 1000, // Already ended
        status: 'completed'
      });
      
      const result = await tournamentService.submitScore({
        tournamentId,
        userId: 'p1',
        sessionId: 's1',
        score: 1000,
        signature: 'sig'
      });
      
      expect(result.success).toBe(false);
      expect(result.reason).toContain('ended');
    });

    it('should track tournament capacity', async () => {
      const tournamentId = 'limited-tournament';
      
      await tournamentService.createTournament({
        id: tournamentId,
        maxPlayers: 100
      });
      
      // Fill tournament
      for (let i = 1; i <= 100; i++) {
        await tournamentService.joinTournament(tournamentId, `p${i}`, 50);
      }
      
      // 101st player should be rejected
      const result = await tournamentService.joinTournament(
        tournamentId,
        'p101',
        50
      );
      
      expect(result.success).toBe(false);
      expect(result.reason).toContain('full');
    });
  });
});


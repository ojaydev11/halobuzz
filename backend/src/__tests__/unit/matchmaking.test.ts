import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MatchmakingService } from '../../services/MatchmakingService';

describe('Matchmaking System', () => {
  let matchmaking: MatchmakingService;

  beforeEach(() => {
    matchmaking = new MatchmakingService();
  });

  describe('MMR-Based Matching', () => {
    it('should match players with similar MMR', async () => {
      const player1 = {
        userId: 'p1',
        username: 'Player1',
        mmr: 1500,
        gameId: 'buzz-arena',
        mode: 'ranked'
      };
      
      const player2 = {
        userId: 'p2',
        username: 'Player2',
        mmr: 1520, // Within range
        gameId: 'buzz-arena',
        mode: 'ranked'
      };
      
      await matchmaking.joinQueue(player1);
      await matchmaking.joinQueue(player2);
      
      const match = await matchmaking.findMatch(player1.userId);
      
      expect(match).toBeDefined();
      expect(match.players).toHaveLength(2);
      expect(Math.abs(match.players[0].mmr - match.players[1].mmr)).toBeLessThan(100);
    });

    it('should not match players with very different MMR', async () => {
      const noob = {
        userId: 'noob',
        mmr: 800,
        gameId: 'buzz-arena',
        mode: 'ranked'
      };
      
      const pro = {
        userId: 'pro',
        mmr: 2200, // Too far apart
        gameId: 'buzz-arena',
        mode: 'ranked'
      };
      
      await matchmaking.joinQueue(noob);
      await matchmaking.joinQueue(pro);
      
      const match = await matchmaking.findMatch(noob.userId);
      
      expect(match).toBeNull();
    });

    it('should expand MMR range over time', async () => {
      const patient = {
        userId: 'patient',
        mmr: 1500,
        gameId: 'game1',
        mode: 'ranked',
        queuedAt: Date.now() - 60000 // 1 minute ago
      };
      
      const distant = {
        userId: 'distant',
        mmr: 1700, // 200 MMR difference
        gameId: 'game1',
        mode: 'ranked'
      };
      
      await matchmaking.joinQueue(patient);
      await matchmaking.joinQueue(distant);
      
      // Initial range too narrow
      const match1 = await matchmaking.findMatch(patient.userId);
      expect(match1).toBeNull();
      
      // After 1 minute, range expands (100 → 200)
      const match2 = await matchmaking.findMatch(patient.userId, {
        expandedRange: true
      });
      
      expect(match2).toBeDefined();
    });

    it('should prioritize closer MMR matches', async () => {
      const seeker = {
        userId: 'seeker',
        mmr: 1500,
        gameId: 'g1',
        mode: 'ranked'
      };
      
      const close = {
        userId: 'close',
        mmr: 1510, // 10 MMR diff
        gameId: 'g1',
        mode: 'ranked'
      };
      
      const far = {
        userId: 'far',
        mmr: 1580, // 80 MMR diff
        gameId: 'g1',
        mode: 'ranked'
      };
      
      await matchmaking.joinQueue(seeker);
      await matchmaking.joinQueue(close);
      await matchmaking.joinQueue(far);
      
      const match = await matchmaking.findMatch(seeker.userId);
      
      expect(match.opponent.userId).toBe('close');
    });
  });

  describe('Queue Management', () => {
    it('should maintain separate queues per game', async () => {
      await matchmaking.joinQueue({
        userId: 'p1',
        gameId: 'game-A',
        mode: 'ranked'
      });
      
      await matchmaking.joinQueue({
        userId: 'p2',
        gameId: 'game-B',
        mode: 'ranked'
      });
      
      const queueA = await matchmaking.getQueueSize('game-A', 'ranked');
      const queueB = await matchmaking.getQueueSize('game-B', 'ranked');
      
      expect(queueA).toBe(1);
      expect(queueB).toBe(1);
    });

    it('should remove player from queue on match', async () => {
      const p1 = { userId: 'p1', gameId: 'g1', mode: 'ranked', mmr: 1500 };
      const p2 = { userId: 'p2', gameId: 'g1', mode: 'ranked', mmr: 1500 };
      
      await matchmaking.joinQueue(p1);
      await matchmaking.joinQueue(p2);
      
      const initialSize = await matchmaking.getQueueSize('g1', 'ranked');
      expect(initialSize).toBe(2);
      
      await matchmaking.findMatch(p1.userId);
      
      const finalSize = await matchmaking.getQueueSize('g1', 'ranked');
      expect(finalSize).toBe(0);
    });

    it('should allow manual queue leave', async () => {
      const player = { userId: 'p1', gameId: 'g1', mode: 'ranked' };
      
      await matchmaking.joinQueue(player);
      
      const result = await matchmaking.leaveQueue(player.userId, player.gameId);
      
      expect(result.success).toBe(true);
      
      const size = await matchmaking.getQueueSize('g1', 'ranked');
      expect(size).toBe(0);
    });

    it('should timeout players after waiting too long', async () => {
      const player = {
        userId: 'timeout',
        gameId: 'g1',
        mode: 'ranked',
        queuedAt: Date.now() - 600000 // 10 minutes ago
      };
      
      await matchmaking.joinQueue(player);
      
      // Run timeout cleanup
      await matchmaking.cleanupExpiredQueues();
      
      const size = await matchmaking.getQueueSize('g1', 'ranked');
      expect(size).toBe(0);
    });

    it('should return queue position', async () => {
      const game = 'g1';
      const mode = 'ranked';
      
      await matchmaking.joinQueue({ userId: 'p1', gameId: game, mode, mmr: 1500 });
      await matchmaking.joinQueue({ userId: 'p2', gameId: game, mode, mmr: 1500 });
      await matchmaking.joinQueue({ userId: 'p3', gameId: game, mode, mmr: 1500 });
      
      const position = await matchmaking.getQueuePosition('p2', game, mode);
      
      expect(position).toBe(2);
    });
  });

  describe('Match Quality', () => {
    it('should calculate match quality score', async () => {
      const player1 = { userId: 'p1', mmr: 1500 };
      const player2 = { userId: 'p2', mmr: 1505 };
      
      const quality = matchmaking.calculateMatchQuality(player1, player2);
      
      expect(quality).toBeGreaterThan(0.9); // Very close MMR = high quality
    });

    it('should penalize large MMR differences', async () => {
      const player1 = { userId: 'p1', mmr: 1500 };
      const player2 = { userId: 'p2', mmr: 1800 };
      
      const quality = matchmaking.calculateMatchQuality(player1, player2);
      
      expect(quality).toBeLessThan(0.5); // Large diff = low quality
    });

    it('should require minimum quality threshold', async () => {
      const lowMMR = { userId: 'low', mmr: 1000, gameId: 'g1', mode: 'ranked' };
      const highMMR = { userId: 'high', mmr: 2000, gameId: 'g1', mode: 'ranked' };
      
      await matchmaking.joinQueue(lowMMR);
      await matchmaking.joinQueue(highMMR);
      
      const match = await matchmaking.findMatch(lowMMR.userId, {
        minQuality: 0.7
      });
      
      expect(match).toBeNull(); // Quality too low, no match
    });
  });

  describe('Casual vs Ranked', () => {
    it('should ignore MMR in casual mode', async () => {
      const noob = { userId: 'noob', mmr: 800, gameId: 'g1', mode: 'casual' };
      const pro = { userId: 'pro', mmr: 2200, gameId: 'g1', mode: 'casual' };
      
      await matchmaking.joinQueue(noob);
      await matchmaking.joinQueue(pro);
      
      const match = await matchmaking.findMatch(noob.userId);
      
      expect(match).toBeDefined();
      expect(match.mode).toBe('casual');
    });

    it('should not match casual with ranked', async () => {
      const casual = { userId: 'casual', gameId: 'g1', mode: 'casual' };
      const ranked = { userId: 'ranked', gameId: 'g1', mode: 'ranked' };
      
      await matchmaking.joinQueue(casual);
      await matchmaking.joinQueue(ranked);
      
      const match = await matchmaking.findMatch(casual.userId);
      
      expect(match).toBeNull();
    });
  });

  describe('Tournament Matchmaking', () => {
    it('should match players in same tournament', async () => {
      const t1p1 = {
        userId: 'p1',
        gameId: 'g1',
        mode: 'tournament',
        tournamentId: 't1'
      };
      
      const t1p2 = {
        userId: 'p2',
        gameId: 'g1',
        mode: 'tournament',
        tournamentId: 't1'
      };
      
      const t2p1 = {
        userId: 'p3',
        gameId: 'g1',
        mode: 'tournament',
        tournamentId: 't2'
      };
      
      await matchmaking.joinQueue(t1p1);
      await matchmaking.joinQueue(t1p2);
      await matchmaking.joinQueue(t2p1);
      
      const match = await matchmaking.findMatch('p1');
      
      expect(match).toBeDefined();
      expect(match.players.every(p => p.tournamentId === 't1')).toBe(true);
    });

    it('should handle round-robin bracket matching', async () => {
      const tournamentId = 't-roundrobin';
      const players = Array.from({ length: 8 }, (_, i) => ({
        userId: `p${i + 1}`,
        gameId: 'g1',
        mode: 'tournament',
        tournamentId
      }));
      
      for (const player of players) {
        await matchmaking.joinQueue(player);
      }
      
      const matches = await matchmaking.createTournamentBracket(tournamentId);
      
      expect(matches).toHaveLength(4); // 8 players = 4 matches
      expect(new Set(matches.flatMap(m => m.players.map(p => p.userId))).size).toBe(8);
    });
  });

  describe('Performance & Scalability', () => {
    it('should handle high queue volumes', async () => {
      const startTime = Date.now();
      
      // Add 1000 players to queue
      const promises = Array.from({ length: 1000 }, (_, i) => 
        matchmaking.joinQueue({
          userId: `player-${i}`,
          gameId: 'popular-game',
          mode: 'casual',
          mmr: Math.floor(Math.random() * 2000) + 1000
        })
      );
      
      await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(5000); // Should complete in < 5 seconds
    });

    it('should efficiently query Redis for matches', async () => {
      // Add players
      await matchmaking.joinQueue({ userId: 'p1', gameId: 'g1', mode: 'ranked', mmr: 1500 });
      await matchmaking.joinQueue({ userId: 'p2', gameId: 'g1', mode: 'ranked', mmr: 1510 });
      
      const queryStart = Date.now();
      await matchmaking.findMatch('p1');
      const queryDuration = Date.now() - queryStart;
      
      expect(queryDuration).toBeLessThan(100); // Should be < 100ms
    });
  });
});


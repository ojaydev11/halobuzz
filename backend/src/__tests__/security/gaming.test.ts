import request from 'supertest';
import { app } from '../../index';

describe('Gaming Controls', () => {
  describe('Daily Spend/Loss Caps', () => {
    it('should enforce daily spending limits', async () => {
      // Simulate multiple gaming transactions that exceed daily limit
      const dailyLimit = 1000; // Example daily limit
      let totalSpent = 0;

      for (let i = 0; i < 5; i++) {
        const amount = 250; // Each transaction
        totalSpent += amount;

        const response = await request(app)
          .post('/api/v1/games/play')
          .set('Authorization', 'Bearer test-token')
          .send({
            gameType: 'battle',
            betAmount: amount
          });

        if (totalSpent > dailyLimit) {
          expect(response.status).toBe(429);
          expect(response.body.error).toContain('daily limit');
        } else {
          expect(response.status).toBe(200);
        }
      }
    });

    it('should enforce daily loss limits', async () => {
      const dailyLossLimit = 500; // Example daily loss limit
      let totalLosses = 0;

      for (let i = 0; i < 3; i++) {
        const betAmount = 200;
        const loss = betAmount; // Simulate losing the bet

        const response = await request(app)
          .post('/api/v1/games/play')
          .set('Authorization', 'Bearer test-token')
          .send({
            gameType: 'battle',
            betAmount: betAmount,
            result: 'loss'
          });

        totalLosses += loss;

        if (totalLosses > dailyLossLimit) {
          expect(response.status).toBe(429);
          expect(response.body.error).toContain('loss limit');
        } else {
          expect(response.status).toBe(200);
        }
      }
    });
  });

  describe('Session Caps and Cooldowns', () => {
    it('should enforce session time limits', async () => {
      // Simulate a long gaming session
      const sessionLimit = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
      
      const response = await request(app)
        .post('/api/v1/games/play')
        .set('Authorization', 'Bearer test-token')
        .set('x-session-duration', sessionLimit.toString())
        .send({
          gameType: 'battle',
          betAmount: 100
        })
        .expect(429);

      expect(response.body.error).toContain('session limit');
    });

    it('should enforce cooldown periods', async () => {
      // First game should succeed
      const response1 = await request(app)
        .post('/api/v1/games/play')
        .set('Authorization', 'Bearer test-token')
        .send({
          gameType: 'battle',
          betAmount: 100
        })
        .expect(200);

      expect(response1.body.success).toBe(true);

      // Immediate second game should be blocked by cooldown
      const response2 = await request(app)
        .post('/api/v1/games/play')
        .set('Authorization', 'Bearer test-token')
        .send({
          gameType: 'battle',
          betAmount: 100
        })
        .expect(429);

      expect(response2.body.error).toContain('cooldown');
    });
  });

  describe('Self-Exclusion', () => {
    it('should block gaming for self-excluded users', async () => {
      const response = await request(app)
        .post('/api/v1/games/play')
        .set('Authorization', 'Bearer self-excluded-token')
        .send({
          gameType: 'battle',
          betAmount: 100
        })
        .expect(403);

      expect(response.body.error).toContain('self-excluded');
    });

    it('should allow self-exclusion requests', async () => {
      const response = await request(app)
        .post('/api/v1/games/self-exclude')
        .set('Authorization', 'Bearer test-token')
        .send({
          duration: '1 month',
          reason: 'Personal choice'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Win Rate Bounds', () => {
    it('should enforce minimum win rate (35%)', async () => {
      // Simulate games with very low win rate
      const games = [];
      for (let i = 0; i < 100; i++) {
        games.push({ result: 'loss' }); // All losses
      }

      const response = await request(app)
        .post('/api/v1/games/play')
        .set('Authorization', 'Bearer test-token')
        .send({
          gameType: 'battle',
          betAmount: 100,
          gameHistory: games
        })
        .expect(400);

      expect(response.body.error).toContain('win rate');
    });

    it('should enforce maximum win rate (55%)', async () => {
      // Simulate games with very high win rate
      const games = [];
      for (let i = 0; i < 100; i++) {
        games.push({ result: 'win' }); // All wins
      }

      const response = await request(app)
        .post('/api/v1/games/play')
        .set('Authorization', 'Bearer test-token')
        .send({
          gameType: 'battle',
          betAmount: 100,
          gameHistory: games
        })
        .expect(400);

      expect(response.body.error).toContain('win rate');
    });

    it('should allow games within acceptable win rate bounds', async () => {
      // Simulate games with acceptable win rate (45%)
      const games = [];
      for (let i = 0; i < 100; i++) {
        games.push({ result: i < 45 ? 'win' : 'loss' });
      }

      const response = await request(app)
        .post('/api/v1/games/play')
        .set('Authorization', 'Bearer test-token')
        .send({
          gameType: 'battle',
          betAmount: 100,
          gameHistory: games
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Regional Restrictions', () => {
    it('should block games in restricted countries', async () => {
      const response = await request(app)
        .post('/api/v1/games/play')
        .set('Authorization', 'Bearer restricted-country-token')
        .set('x-user-country', 'RESTRICTED')
        .send({
          gameType: 'battle',
          betAmount: 100
        })
        .expect(403);

      expect(response.body.error).toContain('country');
    });

    it('should allow games in permitted countries', async () => {
      const response = await request(app)
        .post('/api/v1/games/play')
        .set('Authorization', 'Bearer permitted-country-token')
        .set('x-user-country', 'US')
        .send({
          gameType: 'battle',
          betAmount: 100
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Fairness Controls', () => {
    it('should use cryptographically secure randomness', async () => {
      const response = await request(app)
        .post('/api/v1/games/play')
        .set('Authorization', 'Bearer test-token')
        .send({
          gameType: 'battle',
          betAmount: 100
        })
        .expect(200);

      expect(response.body.randomSeed).toBeDefined();
      expect(response.body.randomSeed).toMatch(/^[0-9a-f]{64}$/); // 256-bit hex
    });

    it('should provide game outcome verification', async () => {
      const response = await request(app)
        .post('/api/v1/games/play')
        .set('Authorization', 'Bearer test-token')
        .send({
          gameType: 'battle',
          betAmount: 100
        })
        .expect(200);

      expect(response.body.outcome).toBeDefined();
      expect(response.body.verificationHash).toBeDefined();
      expect(response.body.verificationHash).toMatch(/^[0-9a-f]{64}$/);
    });
  });
});

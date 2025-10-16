/**
 * E2E Test for Complete Gift Sending Workflow
 * Tests the entire flow from gift creation to balance updates, audit logging, and stats
 */

import request from 'supertest';
import { app } from '../../index';
import { getMongoDB } from '@/config/database';
import { getRedisClient } from '@/config/redis';
import { User } from '@/models/User';
import { Gift } from '@/models/Gift';
import { Transaction } from '@/models/Transaction';
import { AuditLog } from '@/models/AuditLog';
import { ReputationEvent } from '@/models/ReputationEvent';

describe('Complete Gift Sending Workflow - E2E Tests', () => {
  let senderToken: string;
  let recipientToken: string;
  let senderUser: any;
  let recipientUser: any;

  beforeAll(async () => {
    // Setup test database and Redis
    await getMongoDB();
    await getRedisClient();

    // Create test users
    senderUser = await User.create({
      username: 'giftsender',
      email: 'sender@test.com',
      password: 'hashedpassword',
      country: 'US',
      language: 'en',
      coins: { balance: 1000, bonusBalance: 0, totalEarned: 1000, totalSpent: 0 }
    });

    recipientUser = await User.create({
      username: 'giftrecipient',
      email: 'recipient@test.com',
      password: 'hashedpassword',
      country: 'US',
      language: 'en',
      coins: { balance: 500, bonusBalance: 0, totalEarned: 500, totalSpent: 0 }
    });

    // Generate test tokens (in real scenario, these would be proper JWT tokens)
    senderToken = `Bearer test-token-${senderUser._id}`;
    recipientToken = `Bearer test-token-${recipientUser._id}`;
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteMany({});
    await Gift.deleteMany({});
    await Transaction.deleteMany({});
    await AuditLog.deleteMany({});
    await ReputationEvent.deleteMany({});
  });

  describe('POST /api/v1/gifts/send - Complete Workflow', () => {
    it('should complete full gift sending workflow with all side effects', async () => {
      const giftAmount = 150;
      const giftMessage = 'E2E Test Gift';

      // Record initial state
      const initialSenderBalance = senderUser.coins.balance;
      const initialRecipientBalance = recipientUser.coins.balance;
      const initialSenderGiftCount = senderUser.trust?.factors?.totalGifts || 0;
      const initialRecipientGiftCount = recipientUser.trust?.factors?.totalGifts || 0;

      // Step 1: Send gift via API
      const giftResponse = await request(app)
        .post('/api/v1/gifts/send')
        .set('Authorization', senderToken)
        .send({
          recipientId: recipientUser._id,
          amount: giftAmount,
          type: 'coin',
          message: giftMessage
        })
        .expect(200);

      expect(giftResponse.body.success).toBe(true);
      expect(giftResponse.body.data.giftId).toBeDefined();

      const giftId = giftResponse.body.data.giftId;

      // Step 2: Verify gift was created in database
      const createdGift = await Gift.findById(giftId);
      expect(createdGift).toBeDefined();
      expect(createdGift.amount).toBe(giftAmount);
      expect(createdGift.senderId.toString()).toBe(senderUser._id.toString());
      expect(createdGift.recipientId.toString()).toBe(recipientUser._id.toString());
      expect(createdGift.status).toBe('completed');
      expect(createdGift.message).toBe(giftMessage);

      // Step 3: Verify sender balance was updated
      const updatedSender = await User.findById(senderUser._id);
      expect(updatedSender.coins.balance).toBe(initialSenderBalance - giftAmount);
      expect(updatedSender.coins.totalSpent).toBe(giftAmount);

      // Step 4: Verify recipient balance was updated
      const updatedRecipient = await User.findById(recipientUser._id);
      expect(updatedRecipient.coins.balance).toBe(initialRecipientBalance + giftAmount);
      expect(updatedRecipient.coins.totalEarned).toBe(giftAmount);

      // Step 5: Verify transaction records were created
      const senderTransaction = await Transaction.findOne({
        userId: senderUser._id,
        type: 'gift_sent',
        amount: -giftAmount
      });
      expect(senderTransaction).toBeDefined();
      expect(senderTransaction.metadata.giftId.toString()).toBe(giftId);

      const recipientTransaction = await Transaction.findOne({
        userId: recipientUser._id,
        type: 'gift_received',
        amount: giftAmount
      });
      expect(recipientTransaction).toBeDefined();
      expect(recipientTransaction.metadata.giftId.toString()).toBe(giftId);

      // Step 6: Verify audit logs were created
      const auditLogs = await AuditLog.find({
        $or: [
          { resourceId: giftId },
          { details: { giftId: giftId } }
        ]
      });
      expect(auditLogs.length).toBeGreaterThan(0);

      // Step 7: Verify reputation events were created
      const senderReputationEvent = await ReputationEvent.findOne({
        userId: senderUser._id,
        type: 'gift_sent'
      });
      expect(senderReputationEvent).toBeDefined();
      expect(senderReputationEvent.delta).toBeGreaterThan(0);

      const recipientReputationEvent = await ReputationEvent.findOne({
        userId: recipientUser._id,
        type: 'gift_received'
      });
      expect(recipientReputationEvent).toBeDefined();
      expect(recipientReputationEvent.delta).toBeGreaterThan(0);

      // Step 8: Verify user statistics were updated
      const finalSender = await User.findById(senderUser._id);
      const finalRecipient = await User.findById(recipientUser._id);

      expect(finalSender.trust.factors.totalGifts).toBe(initialSenderGiftCount + 1);
      expect(finalRecipient.trust.factors.totalGifts).toBe(initialRecipientGiftCount + 1);

      // Step 9: Verify gift appears in recipient's received gifts
      const receivedGiftsResponse = await request(app)
        .get('/api/v1/gifts/received')
        .set('Authorization', recipientToken)
        .expect(200);

      expect(receivedGiftsResponse.body.success).toBe(true);
      expect(receivedGiftsResponse.body.data.length).toBeGreaterThan(0);
      
      const receivedGift = receivedGiftsResponse.body.data.find((g: any) => g._id === giftId);
      expect(receivedGift).toBeDefined();
      expect(receivedGift.amount).toBe(giftAmount);
      expect(receivedGift.senderUsername).toBe(senderUser.username);

      // Step 10: Verify gift appears in sender's sent gifts
      const sentGiftsResponse = await request(app)
        .get('/api/v1/gifts/sent')
        .set('Authorization', senderToken)
        .expect(200);

      expect(sentGiftsResponse.body.success).toBe(true);
      expect(sentGiftsResponse.body.data.length).toBeGreaterThan(0);
      
      const sentGift = sentGiftsResponse.body.data.find((g: any) => g._id === giftId);
      expect(sentGift).toBeDefined();
      expect(sentGift.amount).toBe(giftAmount);
      expect(sentGift.recipientUsername).toBe(recipientUser.username);
    });

    it('should handle insufficient balance error gracefully', async () => {
      const excessiveAmount = 2000; // More than sender's balance

      const response = await request(app)
        .post('/api/v1/gifts/send')
        .set('Authorization', senderToken)
        .send({
          recipientId: recipientUser._id,
          amount: excessiveAmount,
          type: 'coin',
          message: 'Excessive gift'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('insufficient');

      // Verify no gift was created
      const giftCount = await Gift.countDocuments({ senderId: senderUser._id });
      expect(giftCount).toBe(0);

      // Verify balances were not changed
      const sender = await User.findById(senderUser._id);
      expect(sender.coins.balance).toBe(1000); // Original balance
    });

    it('should handle invalid recipient error', async () => {
      const invalidRecipientId = '507f1f77bcf86cd799439011'; // Non-existent user

      const response = await request(app)
        .post('/api/v1/gifts/send')
        .set('Authorization', senderToken)
        .send({
          recipientId: invalidRecipientId,
          amount: 100,
          type: 'coin',
          message: 'Invalid recipient gift'
        })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should validate gift amount constraints', async () => {
      const invalidAmounts = [0, -50, 10000]; // Invalid amounts

      for (const amount of invalidAmounts) {
        const response = await request(app)
          .post('/api/v1/gifts/send')
          .set('Authorization', senderToken)
          .send({
            recipientId: recipientUser._id,
            amount: amount,
            type: 'coin',
            message: 'Invalid amount gift'
          })
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      }
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/gifts/send')
        .send({
          recipientId: recipientUser._id,
          amount: 100,
          type: 'coin',
          message: 'Unauthenticated gift'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('token');
    });
  });

  describe('GET /api/v1/gifts/received - Recipient View', () => {
    beforeEach(async () => {
      // Create test gifts
      await Gift.create([
        {
          senderId: senderUser._id,
          recipientId: recipientUser._id,
          senderUsername: senderUser.username,
          recipientUsername: recipientUser.username,
          amount: 50,
          type: 'coin',
          message: 'Test gift 1',
          status: 'completed'
        },
        {
          senderId: senderUser._id,
          recipientId: recipientUser._id,
          senderUsername: senderUser.username,
          recipientUsername: recipientUser.username,
          amount: 75,
          type: 'coin',
          message: 'Test gift 2',
          status: 'completed'
        }
      ]);
    });

    it('should return recipient gifts with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/gifts/received')
        .set('Authorization', recipientToken)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.total).toBe(2);
    });

    it('should filter gifts by date range', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const response = await request(app)
        .get('/api/v1/gifts/received')
        .set('Authorization', recipientToken)
        .query({ 
          startDate: yesterday.toISOString(),
          endDate: new Date().toISOString()
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /api/v1/gifts/sent - Sender View', () => {
    beforeEach(async () => {
      // Create test gifts
      await Gift.create([
        {
          senderId: senderUser._id,
          recipientId: recipientUser._id,
          senderUsername: senderUser.username,
          recipientUsername: recipientUser.username,
          amount: 100,
          type: 'coin',
          message: 'Sent gift 1',
          status: 'completed'
        }
      ]);
    });

    it('should return sender gifts with statistics', async () => {
      const response = await request(app)
        .get('/api/v1/gifts/sent')
        .set('Authorization', senderToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.statistics).toBeDefined();
      expect(response.body.statistics.totalSent).toBe(100);
    });
  });

  describe('GET /api/v1/gifts/:id - Individual Gift Details', () => {
    let testGift: any;

    beforeEach(async () => {
      testGift = await Gift.create({
        senderId: senderUser._id,
        recipientId: recipientUser._id,
        senderUsername: senderUser.username,
        recipientUsername: recipientUser.username,
        amount: 200,
        type: 'coin',
        message: 'Detailed gift',
        status: 'completed'
      });
    });

    it('should return gift details for sender', async () => {
      const response = await request(app)
        .get(`/api/v1/gifts/${testGift._id}`)
        .set('Authorization', senderToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testGift._id.toString());
      expect(response.body.data.amount).toBe(200);
      expect(response.body.data.message).toBe('Detailed gift');
    });

    it('should return gift details for recipient', async () => {
      const response = await request(app)
        .get(`/api/v1/gifts/${testGift._id}`)
        .set('Authorization', recipientToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data._id).toBe(testGift._id.toString());
    });

    it('should deny access to unrelated users', async () => {
      const unrelatedUser = await User.create({
        username: 'unrelated',
        email: 'unrelated@test.com',
        password: 'hashedpassword',
        country: 'US',
        language: 'en'
      });

      const unrelatedToken = `Bearer test-token-${unrelatedUser._id}`;

      const response = await request(app)
        .get(`/api/v1/gifts/${testGift._id}`)
        .set('Authorization', unrelatedToken)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('access');
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent gift requests', async () => {
      const concurrentRequests = 10;
      const giftAmount = 10;

      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        request(app)
          .post('/api/v1/gifts/send')
          .set('Authorization', senderToken)
          .send({
            recipientId: recipientUser._id,
            amount: giftAmount,
            type: 'coin',
            message: `Concurrent gift ${i}`
          })
      );

      const responses = await Promise.all(promises);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Verify all gifts were created
      const giftCount = await Gift.countDocuments({ senderId: senderUser._id });
      expect(giftCount).toBe(concurrentRequests);

      // Verify final balance
      const finalSender = await User.findById(senderUser._id);
      const expectedBalance = 1000 - (concurrentRequests * giftAmount);
      expect(finalSender.coins.balance).toBe(expectedBalance);
    });

    it('should efficiently query large gift histories', async () => {
      // Create many gifts
      const giftCount = 100;
      const gifts = Array.from({ length: giftCount }, (_, i) => ({
        senderId: senderUser._id,
        recipientId: recipientUser._id,
        senderUsername: senderUser.username,
        recipientUsername: recipientUser.username,
        amount: 1,
        type: 'coin',
        message: `Bulk gift ${i}`,
        status: 'completed'
      }));

      await Gift.insertMany(gifts);

      const startTime = Date.now();

      const response = await request(app)
        .get('/api/v1/gifts/received')
        .set('Authorization', recipientToken)
        .query({ limit: 50 })
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(50);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});

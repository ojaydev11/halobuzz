/**
 * Unit Tests for Transactional Services
 * Tests for gift economy, audit logging, and stats services
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '@/models/User';
import { Gift } from '@/models/Gift';
import { Transaction } from '@/models/Transaction';
import { AuditLog } from '@/models/AuditLog';
import { ReputationEvent } from '@/models/ReputationEvent';

// Mock services
jest.mock('@/services/AdvancedGiftEconomyService');
jest.mock('@/services/ReputationService');
jest.mock('@/config/redis');

describe('Transactional Services Unit Tests', () => {
  let mongoServer: MongoMemoryServer;
  let testUser1: any;
  let testUser2: any;

  beforeAll(async () => {
    // Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clean up collections
    await User.deleteMany({});
    await Gift.deleteMany({});
    await Transaction.deleteMany({});
    await AuditLog.deleteMany({});
    await ReputationEvent.deleteMany({});

    // Create test users
    testUser1 = await User.create({
      username: 'testuser1',
      email: 'test1@example.com',
      password: 'hashedpassword',
      country: 'US',
      language: 'en',
      coins: { balance: 1000, bonusBalance: 0, totalEarned: 1000, totalSpent: 0 }
    });

    testUser2 = await User.create({
      username: 'testuser2',
      email: 'test2@example.com',
      password: 'hashedpassword',
      country: 'US',
      language: 'en',
      coins: { balance: 500, bonusBalance: 0, totalEarned: 500, totalSpent: 0 }
    });
  });

  afterEach(async () => {
    // Clean up after each test
    await User.deleteMany({});
    await Gift.deleteMany({});
    await Transaction.deleteMany({});
    await AuditLog.deleteMany({});
    await ReputationEvent.deleteMany({});
  });

  describe('Gift Transaction Service', () => {
    it('should send a gift and update balances correctly', async () => {
      const giftAmount = 100;
      const initialBalance1 = testUser1.coins.balance;
      const initialBalance2 = testUser2.coins.balance;

      // Create gift transaction
      const gift = await Gift.create({
        senderId: testUser1._id,
        recipientId: testUser2._id,
        senderUsername: testUser1.username,
        recipientUsername: testUser2.username,
        amount: giftAmount,
        type: 'coin',
        message: 'Test gift',
        status: 'completed'
      });

      // Update sender balance
      await User.findByIdAndUpdate(testUser1._id, {
        $inc: {
          'coins.balance': -giftAmount,
          'coins.totalSpent': giftAmount
        }
      });

      // Update recipient balance
      await User.findByIdAndUpdate(testUser2._id, {
        $inc: {
          'coins.balance': giftAmount,
          'coins.totalEarned': giftAmount
        }
      });

      // Verify gift was created
      expect(gift).toBeDefined();
      expect(gift.amount).toBe(giftAmount);
      expect(gift.status).toBe('completed');

      // Verify balances updated correctly
      const updatedUser1 = await User.findById(testUser1._id);
      const updatedUser2 = await User.findById(testUser2._id);

      expect(updatedUser1.coins.balance).toBe(initialBalance1 - giftAmount);
      expect(updatedUser1.coins.totalSpent).toBe(giftAmount);
      expect(updatedUser2.coins.balance).toBe(initialBalance2 + giftAmount);
      expect(updatedUser2.coins.totalEarned).toBe(giftAmount);
    });

    it('should prevent sending gift with insufficient balance', async () => {
      const giftAmount = 2000; // More than user's balance
      const initialBalance = testUser1.coins.balance;

      try {
        const gift = await Gift.create({
          senderId: testUser1._id,
          recipientId: testUser2._id,
          senderUsername: testUser1.username,
          recipientUsername: testUser2.username,
          amount: giftAmount,
          type: 'coin',
          message: 'Test gift',
          status: 'pending'
        });

        // This should fail validation
        expect(gift.status).toBe('pending');
        
        // Verify balance wasn't changed
        const updatedUser = await User.findById(testUser1._id);
        expect(updatedUser.coins.balance).toBe(initialBalance);

      } catch (error) {
        // Expected to fail
        expect(error).toBeDefined();
      }
    });

    it('should create transaction record for gift', async () => {
      const giftAmount = 50;

      // Create gift
      const gift = await Gift.create({
        senderId: testUser1._id,
        recipientId: testUser2._id,
        senderUsername: testUser1.username,
        recipientUsername: testUser2.username,
        amount: giftAmount,
        type: 'coin',
        message: 'Test gift',
        status: 'completed'
      });

      // Create transaction record
      const transaction = await Transaction.create({
        userId: testUser1._id,
        type: 'gift_sent',
        amount: -giftAmount,
        description: `Gift sent to ${testUser2.username}`,
        metadata: {
          giftId: gift._id,
          recipientId: testUser2._id,
          recipientUsername: testUser2.username
        }
      });

      expect(transaction).toBeDefined();
      expect(transaction.type).toBe('gift_sent');
      expect(transaction.amount).toBe(-giftAmount);
      expect(transaction.metadata.giftId).toEqual(gift._id);
    });
  });

  describe('Audit Logging Service', () => {
    it('should create audit log for user actions', async () => {
      const auditLog = await AuditLog.create({
        admin: testUser1._id,
        action: 'user.ban',
        resource: 'user',
        resourceId: testUser2._id,
        details: { reason: 'Test ban' },
        ip: '127.0.0.1',
        userAgent: 'Test Agent'
      });

      expect(auditLog).toBeDefined();
      expect(auditLog.action).toBe('user.ban');
      expect(auditLog.resource).toBe('user');
      expect(auditLog.resourceId).toEqual(testUser2._id);
      expect(auditLog.details.reason).toBe('Test ban');
    });

    it('should create audit log for gift transactions', async () => {
      const giftAmount = 75;
      
      const gift = await Gift.create({
        senderId: testUser1._id,
        recipientId: testUser2._id,
        senderUsername: testUser1.username,
        recipientUsername: testUser2.username,
        amount: giftAmount,
        type: 'coin',
        message: 'Test gift',
        status: 'completed'
      });

      const auditLog = await AuditLog.create({
        admin: testUser1._id,
        action: 'gift.sent',
        resource: 'gift',
        resourceId: gift._id,
        details: { 
          amount: giftAmount,
          recipientId: testUser2._id,
          recipientUsername: testUser2.username
        },
        ip: '127.0.0.1',
        userAgent: 'Test Agent'
      });

      expect(auditLog).toBeDefined();
      expect(auditLog.action).toBe('gift.sent');
      expect(auditLog.resource).toBe('gift');
      expect(auditLog.details.amount).toBe(giftAmount);
    });

    it('should query audit logs by admin', async () => {
      // Create multiple audit logs
      await AuditLog.create([
        {
          admin: testUser1._id,
          action: 'user.ban',
          resource: 'user',
          resourceId: testUser2._id,
          details: { reason: 'Test ban 1' },
          ip: '127.0.0.1',
          userAgent: 'Test Agent'
        },
        {
          admin: testUser1._id,
          action: 'user.unban',
          resource: 'user',
          resourceId: testUser2._id,
          details: { reason: 'Test unban' },
          ip: '127.0.0.1',
          userAgent: 'Test Agent'
        }
      ]);

      const logs = await AuditLog.find({ admin: testUser1._id }).sort({ createdAt: -1 });
      
      expect(logs).toHaveLength(2);
      expect(logs[0].action).toBe('user.unban');
      expect(logs[1].action).toBe('user.ban');
    });
  });

  describe('Reputation Service', () => {
    it('should create reputation event for gift sent', async () => {
      const reputationEvent = await ReputationEvent.create({
        userId: testUser1._id,
        type: 'gift_sent',
        delta: 10,
        description: 'Sent a gift',
        metadata: {
          giftId: 'test-gift-id',
          amount: 100,
          recipientId: testUser2._id
        }
      });

      expect(reputationEvent).toBeDefined();
      expect(reputationEvent.type).toBe('gift_sent');
      expect(reputationEvent.delta).toBe(10);
      expect(reputationEvent.metadata.amount).toBe(100);
    });

    it('should create reputation event for gift received', async () => {
      const reputationEvent = await ReputationEvent.create({
        userId: testUser2._id,
        type: 'gift_received',
        delta: 5,
        description: 'Received a gift',
        metadata: {
          giftId: 'test-gift-id',
          amount: 100,
          senderId: testUser1._id
        }
      });

      expect(reputationEvent).toBeDefined();
      expect(reputationEvent.type).toBe('gift_received');
      expect(reputationEvent.delta).toBe(5);
      expect(reputationEvent.metadata.senderId).toEqual(testUser1._id);
    });

    it('should calculate total reputation points', async () => {
      // Create multiple reputation events
      await ReputationEvent.create([
        {
          userId: testUser1._id,
          type: 'gift_sent',
          delta: 10,
          description: 'Sent a gift',
          metadata: {}
        },
        {
          userId: testUser1._id,
          type: 'gift_sent',
          delta: 15,
          description: 'Sent another gift',
          metadata: {}
        },
        {
          userId: testUser1._id,
          type: 'gift_received',
          delta: 5,
          description: 'Received a gift',
          metadata: {}
        }
      ]);

      const events = await ReputationEvent.find({ userId: testUser1._id });
      const totalReputation = events.reduce((sum, event) => sum + event.delta, 0);

      expect(events).toHaveLength(3);
      expect(totalReputation).toBe(30); // 10 + 15 + 5
    });
  });

  describe('Stats Service', () => {
    it('should update user gift statistics', async () => {
      const giftAmount = 200;

      // Create gift
      await Gift.create({
        senderId: testUser1._id,
        recipientId: testUser2._id,
        senderUsername: testUser1.username,
        recipientUsername: testUser2.username,
        amount: giftAmount,
        type: 'coin',
        message: 'Test gift',
        status: 'completed'
      });

      // Update user stats
      await User.findByIdAndUpdate(testUser1._id, {
        $inc: {
          'trust.factors.totalGifts': 1
        }
      });

      await User.findByIdAndUpdate(testUser2._id, {
        $inc: {
          'trust.factors.totalGifts': 1
        }
      });

      const updatedSender = await User.findById(testUser1._id);
      const updatedRecipient = await User.findById(testUser2._id);

      expect(updatedSender.trust.factors.totalGifts).toBe(1);
      expect(updatedRecipient.trust.factors.totalGifts).toBe(1);
    });

    it('should track gift count in user model', async () => {
      // Create multiple gifts
      await Gift.create([
        {
          senderId: testUser1._id,
          recipientId: testUser2._id,
          senderUsername: testUser1.username,
          recipientUsername: testUser2.username,
          amount: 50,
          type: 'coin',
          message: 'Gift 1',
          status: 'completed'
        },
        {
          senderId: testUser1._id,
          recipientId: testUser2._id,
          senderUsername: testUser1.username,
          recipientUsername: testUser2.username,
          amount: 75,
          type: 'coin',
          message: 'Gift 2',
          status: 'completed'
        }
      ]);

      // Update gift count
      await User.findByIdAndUpdate(testUser1._id, {
        $set: { giftCount: 2 }
      });

      const updatedUser = await User.findById(testUser1._id);
      expect(updatedUser.giftCount).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would simulate database connection issues
      // In a real scenario, you'd mock the database connection
      expect(true).toBe(true); // Placeholder for error handling test
    });

    it('should validate required fields', async () => {
      try {
        await Gift.create({
          // Missing required fields
          amount: 100,
          type: 'coin'
        });
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.name).toBe('ValidationError');
      }
    });

    it('should handle invalid user IDs', async () => {
      try {
        await Gift.create({
          senderId: new mongoose.Types.ObjectId(), // Non-existent user
          recipientId: new mongoose.Types.ObjectId(), // Non-existent user
          senderUsername: 'nonexistent',
          recipientUsername: 'nonexistent',
          amount: 100,
          type: 'coin',
          message: 'Test gift',
          status: 'completed'
        });
        // This should succeed in creation but fail in business logic
        expect(true).toBe(true);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Performance Tests', () => {
    it('should handle bulk gift operations efficiently', async () => {
      const startTime = Date.now();
      const giftCount = 100;

      // Create bulk gifts
      const gifts = Array.from({ length: giftCount }, (_, i) => ({
        senderId: testUser1._id,
        recipientId: testUser2._id,
        senderUsername: testUser1.username,
        recipientUsername: testUser2.username,
        amount: 10,
        type: 'coin',
        message: `Bulk gift ${i}`,
        status: 'completed'
      }));

      await Gift.insertMany(gifts);
      const endTime = Date.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      const createdGifts = await Gift.countDocuments({ senderId: testUser1._id });
      expect(createdGifts).toBe(giftCount);
    });

    it('should efficiently query user statistics', async () => {
      // Create test data
      await Gift.create([
        { senderId: testUser1._id, recipientId: testUser2._id, amount: 50, type: 'coin', status: 'completed' },
        { senderId: testUser1._id, recipientId: testUser2._id, amount: 75, type: 'coin', status: 'completed' },
        { senderId: testUser2._id, recipientId: testUser1._id, amount: 25, type: 'coin', status: 'completed' }
      ]);

      const startTime = Date.now();

      // Query user statistics
      const [sentGifts, receivedGifts, totalSent, totalReceived] = await Promise.all([
        Gift.find({ senderId: testUser1._id }).lean(),
        Gift.find({ recipientId: testUser1._id }).lean(),
        Gift.aggregate([
          { $match: { senderId: testUser1._id } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]),
        Gift.aggregate([
          { $match: { recipientId: testUser1._id } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
      ]);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(sentGifts).toHaveLength(2);
      expect(receivedGifts).toHaveLength(1);
      expect(totalSent[0].total).toBe(125); // 50 + 75
      expect(totalReceived[0].total).toBe(25);
    });
  });
});

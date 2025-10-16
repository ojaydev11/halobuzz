/**
 * Comprehensive Payment Tests
 * Tests Stripe webhook idempotency, refund reconciliation, and edge cases
 */

import request from 'supertest';
import { app } from '../index';
import Stripe from 'stripe';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { getCache, setCache } from '../config/redis';
import mongoose from 'mongoose';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any
});

describe('Payment Webhook Tests', () => {
  let testUser: any;
  let testSession: mongoose.ClientSession;

  beforeAll(async () => {
    // Create test user
    testUser = new User({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      coins: { balance: 0, totalEarned: 0, totalSpent: 0 }
    });
    await testUser.save();

    // Start transaction for test isolation
    testSession = await mongoose.startSession();
  });

  afterAll(async () => {
    // Clean up test data
    await User.deleteOne({ _id: testUser._id });
    await Transaction.deleteMany({ userId: testUser._id });
    testSession.endSession();
  });

  beforeEach(async () => {
    // Reset user coins
    testUser.coins = { balance: 0, totalEarned: 0, totalSpent: 0 };
    await testUser.save();
  });

  describe('Webhook Idempotency', () => {
    it('should process webhook event only once', async () => {
      const mockEvent = createMockCheckoutEvent(testUser._id.toString(), '1000');
      
      // First request
      const response1 = await request(app)
        .post('/api/v1/webhooks/stripe')
        .set('stripe-signature', 'test-signature')
        .send(JSON.stringify(mockEvent));

      // Second request (should be idempotent)
      const response2 = await request(app)
        .post('/api/v1/webhooks/stripe')
        .set('stripe-signature', 'test-signature')
        .send(JSON.stringify(mockEvent));

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(response2.body.status).toBe('duplicate');

      // Verify only one transaction was created
      const transactions = await Transaction.find({ userId: testUser._id });
      expect(transactions).toHaveLength(1);
    });

    it('should handle duplicate events with different signatures', async () => {
      const mockEvent = createMockCheckoutEvent(testUser._id.toString(), '500');
      
      // Process with different signatures (simulating retry)
      await request(app)
        .post('/api/v1/webhooks/stripe')
        .set('stripe-signature', 'signature-1')
        .send(JSON.stringify(mockEvent));

      await request(app)
        .post('/api/v1/webhooks/stripe')
        .set('stripe-signature', 'signature-2')
        .send(JSON.stringify(mockEvent));

      // Verify only one transaction
      const transactions = await Transaction.find({ userId: testUser._id });
      expect(transactions).toHaveLength(1);
    });
  });

  describe('Refund Reconciliation', () => {
    it('should process refund and reconcile user balance', async () => {
      // First, create a successful payment
      const mockEvent = createMockCheckoutEvent(testUser._id.toString(), '1000');
      await processWebhookEvent(mockEvent);

      // Verify coins were added
      await testUser.refresh();
      expect(testUser.coins.balance).toBe(1000);

      // Now process refund
      const refundEvent = createMockRefundEvent(mockEvent.data.object.payment_intent);
      await processWebhookEvent(refundEvent);

      // Verify refund was processed
      await testUser.refresh();
      expect(testUser.coins.balance).toBe(0);

      // Verify refund transaction exists
      const refundTransaction = await Transaction.findOne({
        userId: testUser._id,
        type: 'refund'
      });
      expect(refundTransaction).toBeTruthy();
      expect(refundTransaction?.amount).toBe(-1000);
    });

    it('should handle partial refunds correctly', async () => {
      // Create payment
      const mockEvent = createMockCheckoutEvent(testUser._id.toString(), '1000');
      await processWebhookEvent(mockEvent);

      // Process partial refund
      const partialRefundEvent = createMockRefundEvent(
        mockEvent.data.object.payment_intent,
        500 // Partial refund amount
      );
      await processWebhookEvent(partialRefundEvent);

      // Verify partial refund
      await testUser.refresh();
      expect(testUser.coins.balance).toBe(500);

      const refundTransaction = await Transaction.findOne({
        userId: testUser._id,
        type: 'refund'
      });
      expect(refundTransaction?.amount).toBe(-500);
    });

    it('should handle refund when user has insufficient balance', async () => {
      // Create payment
      const mockEvent = createMockCheckoutEvent(testUser._id.toString(), '1000');
      await processWebhookEvent(mockEvent);

      // User spends some coins
      testUser.coins.balance = 200;
      await testUser.save();

      // Process full refund
      const refundEvent = createMockRefundEvent(mockEvent.data.object.payment_intent);
      await processWebhookEvent(refundEvent);

      // Verify balance doesn't go negative
      await testUser.refresh();
      expect(testUser.coins.balance).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle webhook for non-existent user', async () => {
      const mockEvent = createMockCheckoutEvent('507f1f77bcf86cd799439011', '1000');
      
      const response = await request(app)
        .post('/api/v1/webhooks/stripe')
        .set('stripe-signature', 'test-signature')
        .send(JSON.stringify(mockEvent));

      expect(response.status).toBe(500);
    });

    it('should handle invalid webhook signature', async () => {
      const mockEvent = createMockCheckoutEvent(testUser._id.toString(), '1000');
      
      const response = await request(app)
        .post('/api/v1/webhooks/stripe')
        .set('stripe-signature', 'invalid-signature')
        .send(JSON.stringify(mockEvent));

      expect(response.status).toBe(400);
    });

    it('should handle missing metadata in checkout session', async () => {
      const mockEvent = {
        id: 'evt_test',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test',
            payment_intent: 'pi_test',
            metadata: {} // Missing userId and coinsAmount
          }
        }
      };

      const response = await request(app)
        .post('/api/v1/webhooks/stripe')
        .set('stripe-signature', 'test-signature')
        .send(JSON.stringify(mockEvent));

      expect(response.status).toBe(500);
    });

    it('should handle refund for non-existent transaction', async () => {
      const refundEvent = createMockRefundEvent('pi_nonexistent');
      
      const response = await request(app)
        .post('/api/v1/webhooks/stripe')
        .set('stripe-signature', 'test-signature')
        .send(JSON.stringify(refundEvent));

      // Should not error, just log warning
      expect(response.status).toBe(200);
    });
  });

  describe('Concurrent Processing', () => {
    it('should handle concurrent webhook processing', async () => {
      const mockEvent = createMockCheckoutEvent(testUser._id.toString(), '1000');
      
      // Process multiple concurrent requests
      const promises = Array(5).fill(null).map(() =>
        request(app)
          .post('/api/v1/webhooks/stripe')
          .set('stripe-signature', 'test-signature')
          .send(JSON.stringify(mockEvent))
      );

      const responses = await Promise.all(promises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Only one should be successful, others should be duplicates
      const successCount = responses.filter(r => r.body.status === 'success').length;
      const duplicateCount = responses.filter(r => r.body.status === 'duplicate').length;
      
      expect(successCount).toBe(1);
      expect(duplicateCount).toBe(4);

      // Verify only one transaction was created
      const transactions = await Transaction.find({ userId: testUser._id });
      expect(transactions).toHaveLength(1);
    });
  });

  describe('Webhook Status API', () => {
    it('should return webhook event status', async () => {
      const mockEvent = createMockCheckoutEvent(testUser._id.toString(), '1000');
      
      // Process webhook
      await request(app)
        .post('/api/v1/webhooks/stripe')
        .set('stripe-signature', 'test-signature')
        .send(JSON.stringify(mockEvent));

      // Check status
      const response = await request(app)
        .get(`/api/v1/webhooks/stripe/status/${mockEvent.id}`);

      expect(response.status).toBe(200);
      expect(response.body.eventId).toBe(mockEvent.id);
      expect(response.body.processed).toBe(true);
    });

    it('should return 404 for non-existent event', async () => {
      const response = await request(app)
        .get('/api/v1/webhooks/stripe/status/nonexistent');

      expect(response.status).toBe(404);
    });
  });
});

// Helper functions
function createMockCheckoutEvent(userId: string, coinsAmount: string) {
  return {
    id: `evt_${Date.now()}`,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: `cs_${Date.now()}`,
        payment_intent: `pi_${Date.now()}`,
        amount_total: parseInt(coinsAmount) * 10, // $0.10 per coin
        metadata: {
          userId,
          coinsAmount,
          coinPackageId: 'coins_1000'
        }
      }
    }
  };
}

function createMockRefundEvent(paymentIntentId: string, refundAmount?: number) {
  return {
    id: `evt_refund_${Date.now()}`,
    type: 'charge.refunded',
    data: {
      object: {
        id: `ch_${Date.now()}`,
        payment_intent: paymentIntentId,
        amount_refunded: refundAmount ? refundAmount * 10 : 10000, // $100 or specified amount
        refunds: {
          data: [{
            id: `re_${Date.now()}`,
            amount: refundAmount ? refundAmount * 10 : 10000,
            reason: 'requested_by_customer'
          }]
        }
      }
    }
  };
}

async function processWebhookEvent(event: any) {
  // Mock webhook processing logic
  const eventKey = `webhook:stripe:${event.id}`;
  
  // Check idempotency
  const existingEvent = await getCache(eventKey);
  if (existingEvent) {
    return;
  }

  // Process based on event type
  if (event.type === 'checkout.session.completed') {
    await handleCheckoutCompleted(event.data.object);
  } else if (event.type === 'charge.refunded') {
    await handleChargeRefunded(event.data.object);
  }

  // Mark as processed
  await setCache(eventKey, { processed: true, processedAt: new Date() }, 86400);
}

async function handleCheckoutCompleted(session: any) {
  const userId = session.metadata?.userId;
  const coinsAmount = parseInt(session.metadata?.coinsAmount || '0');

  if (!userId || !coinsAmount) {
    throw new Error('Missing metadata');
  }

  // Check for duplicate
  const existingTransaction = await Transaction.findOne({
    'metadata.stripeSessionId': session.id
  });

  if (existingTransaction) {
    return;
  }

  // Update user
  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  user.coins.balance += coinsAmount;
  user.coins.totalEarned += coinsAmount;
  await user.save();

  // Create transaction
  const transaction = new Transaction({
    userId: user._id,
    type: 'recharge',
    amount: coinsAmount,
    currency: 'coins',
    status: 'completed',
    paymentMethod: 'stripe',
    transactionId: session.payment_intent,
    description: `Coin purchase: ${coinsAmount} coins`,
    metadata: {
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent
    }
  });

  await transaction.save();
}

async function handleChargeRefunded(charge: any) {
  const paymentIntentId = charge.payment_intent;

  // Find original transaction
  const originalTransaction = await Transaction.findOne({
    transactionId: paymentIntentId,
    type: 'recharge',
    status: 'completed'
  });

  if (!originalTransaction) {
    return;
  }

  // Check if refund already processed
  const existingRefund = await Transaction.findOne({
    'metadata.originalTransactionId': originalTransaction._id,
    'metadata.stripeChargeId': charge.id,
    type: 'refund'
  });

  if (existingRefund) {
    return;
  }

  const refundAmount = originalTransaction.amount;

  // Create refund transaction
  const refundTransaction = new Transaction({
    userId: originalTransaction.userId,
    type: 'refund',
    amount: -refundAmount,
    currency: 'coins',
    status: 'completed',
    paymentMethod: 'stripe',
    transactionId: charge.id,
    description: `Refund for transaction ${originalTransaction._id}`,
    metadata: {
      originalTransactionId: originalTransaction._id,
      stripeChargeId: charge.id,
      stripePaymentIntentId: paymentIntentId
    }
  });

  await refundTransaction.save();

  // Update user balance
  const user = await User.findById(originalTransaction.userId);
  if (user) {
    user.coins.balance = Math.max(0, user.coins.balance - refundAmount);
    user.coins.totalEarned = Math.max(0, user.coins.totalEarned - refundAmount);
    await user.save();
  }
}

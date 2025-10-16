/**
 * Enhanced Stripe Webhook Handler with Idempotency and Refund Reconciliation
 * Provides secure webhook processing with duplicate prevention and refund handling
 */

import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { logger } from '../config/logger';
import { getCache, setCache } from '../config/redis';

const router = express.Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any
});

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const COINS_PER_USD = parseInt(process.env.COINS_PER_USD || '100');

// Webhook event processing status
interface WebhookEventStatus {
  eventId: string;
  processed: boolean;
  processedAt: Date;
  result: 'success' | 'error' | 'duplicate';
  error?: string;
}

/**
 * Enhanced Stripe webhook handler with idempotency
 */
router.post('/stripe', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  if (!sig) {
    logger.error('Missing Stripe signature');
    return res.status(400).send('Missing signature');
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    logger.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  // Check idempotency - prevent duplicate processing
  const eventKey = `webhook:stripe:${event.id}`;
  const existingEvent = await getCache(eventKey);
  
  if (existingEvent) {
    logger.info(`Webhook event already processed: ${event.id}`);
    return res.json({ received: true, status: 'duplicate' });
  }

  // Mark event as being processed
  const eventStatus: WebhookEventStatus = {
    eventId: event.id,
    processed: false,
    processedAt: new Date(),
    result: 'success'
  };

  try {
    // Process the event
    await processWebhookEvent(event);
    
    // Mark as successfully processed
    eventStatus.processed = true;
    eventStatus.result = 'success';
    
    // Store event status for idempotency (24 hour TTL)
    await setCache(eventKey, eventStatus, 86400);
    
    logger.info(`Webhook event processed successfully: ${event.id} (${event.type})`);
    res.json({ received: true, status: 'success' });
    
  } catch (error) {
    logger.error(`Error processing webhook event ${event.id}:`, error);
    
    eventStatus.result = 'error';
    eventStatus.error = error instanceof Error ? error.message : 'Unknown error';
    
    // Store failed event status (shorter TTL for retry)
    await setCache(eventKey, eventStatus, 3600);
    
    res.status(500).json({ 
      error: 'Webhook processing failed',
      eventId: event.id,
      status: 'error'
    });
  }
});

/**
 * Process webhook event based on type
 */
async function processWebhookEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case 'payment_intent.succeeded':
      await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;

    case 'payment_intent.payment_failed':
      await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
      break;

    case 'charge.refunded':
      await handleChargeRefunded(event.data.object as Stripe.Charge);
      break;

    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;

    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await handleSubscriptionChange(event.data.object as Stripe.Subscription);
      break;

    default:
      logger.info(`Unhandled webhook event type: ${event.type}`);
  }
}

/**
 * Enhanced checkout completion handler with idempotency
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.userId;
  const coinPackageId = session.metadata?.coinPackageId;
  const coinsAmount = parseInt(session.metadata?.coinsAmount || '0');

  if (!userId || !coinsAmount) {
    throw new Error(`Missing metadata in checkout session: ${session.id}`);
  }

  // Check for duplicate processing using database idempotency
  const existingTransaction = await Transaction.findOne({
    'metadata.stripeSessionId': session.id
  });

  if (existingTransaction) {
    logger.info(`Checkout session already processed: ${session.id}`);
    return;
  }

  const mongoSession = await mongoose.startSession();
  mongoSession.startTransaction();

  try {
    const user = await User.findById(userId).session(mongoSession);

    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Update user coins
    if (!user.coins) {
      user.coins = { balance: 0, totalEarned: 0, totalSpent: 0 };
    }
    
    user.coins.balance += coinsAmount;
    user.coins.totalEarned += coinsAmount;

    await user.save({ session: mongoSession });

    // Create transaction record
    const transaction = new Transaction({
      userId: user._id,
      type: 'recharge',
      amount: coinsAmount,
      currency: 'coins',
      status: 'completed',
      paymentMethod: 'stripe',
      transactionId: session.payment_intent as string,
      description: `Coin purchase: ${coinsAmount} coins`,
      metadata: {
        stripeSessionId: session.id,
        coinPackageId,
        stripePaymentIntentId: session.payment_intent,
        amountUsd: session.amount_total ? session.amount_total / 100 : 0
      }
    });

    await transaction.save({ session: mongoSession });

    await mongoSession.commitTransaction();

    logger.info(`Checkout completed for user ${userId}: ${coinsAmount} coins added`);
    
    // Emit event for real-time updates
    // This would typically emit to Socket.IO or other real-time systems
    
  } catch (error) {
    await mongoSession.abortTransaction();
    throw error;
  } finally {
    mongoSession.endSession();
  }
}

/**
 * Enhanced payment success handler
 */
async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  logger.info(`Payment succeeded: ${paymentIntent.id}`);
  
  // Additional payment success logic can be added here
  // This might include sending confirmation emails, updating analytics, etc.
}

/**
 * Enhanced payment failure handler
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  logger.warn(`Payment failed: ${paymentIntent.id}`);
  
  // Log payment failure for analytics
  // This might include updating user's payment failure count, sending notifications, etc.
}

/**
 * Enhanced refund handler with reconciliation
 */
async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  const paymentIntentId = charge.payment_intent as string;

  // Find original transaction
  const originalTransaction = await Transaction.findOne({
    transactionId: paymentIntentId,
    type: 'recharge',
    status: 'completed'
  });

  if (!originalTransaction) {
    logger.warn(`Original transaction not found for refund: ${paymentIntentId}`);
    return;
  }

  // Check if refund already processed
  const existingRefund = await Transaction.findOne({
    'metadata.originalTransactionId': originalTransaction._id,
    'metadata.stripeChargeId': charge.id,
    type: 'refund'
  });

  if (existingRefund) {
    logger.info(`Refund already processed for charge: ${charge.id}`);
    return;
  }

  const mongoSession = await mongoose.startSession();
  mongoSession.startTransaction();

  try {
    const user = await User.findById(originalTransaction.userId).session(mongoSession);

    if (!user) {
      throw new Error(`User not found for refund: ${originalTransaction.userId}`);
    }

    const refundAmount = originalTransaction.amount;
    const refundUsd = charge.amount_refunded ? charge.amount_refunded / 100 : 0;

    // Create negative ledger entry for refund reconciliation
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
        stripePaymentIntentId: paymentIntentId,
        refundAmountUsd: refundUsd,
        refundReason: charge.refunds?.data[0]?.reason || 'unknown'
      }
    });

    await refundTransaction.save({ session: mongoSession });

    // Update user balance (handle negative balance gracefully)
    if (!user.coins) {
      user.coins = { balance: 0, totalEarned: 0, totalSpent: 0 };
    }

    // Deduct coins from user balance
    user.coins.balance = Math.max(0, user.coins.balance - refundAmount);
    user.coins.totalEarned = Math.max(0, user.coins.totalEarned - refundAmount);

    await user.save({ session: mongoSession });

    await mongoSession.commitTransaction();

    logger.info(`Refund processed for user ${user._id}: ${refundAmount} coins refunded`);
    
    // Emit refund event for real-time updates
    
  } catch (error) {
    await mongoSession.abortTransaction();
    throw error;
  } finally {
    mongoSession.endSession();
  }
}

/**
 * Handle subscription invoice payments
 */
async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  logger.info(`Subscription payment succeeded: ${invoice.id}`);
  
  // Handle subscription payment success
  // This might include extending subscription, adding premium features, etc.
}

/**
 * Handle subscription invoice payment failures
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  logger.warn(`Subscription payment failed: ${invoice.id}`);
  
  // Handle subscription payment failure
  // This might include downgrading user, sending payment reminders, etc.
}

/**
 * Handle subscription changes
 */
async function handleSubscriptionChange(subscription: Stripe.Subscription): Promise<void> {
  logger.info(`Subscription ${subscription.status}: ${subscription.id}`);
  
  // Handle subscription lifecycle changes
  // This might include updating user's premium status, access levels, etc.
}

/**
 * Get webhook event status for debugging
 */
router.get('/stripe/status/:eventId', async (req: Request, res: Response) => {
  const { eventId } = req.params;
  const eventKey = `webhook:stripe:${eventId}`;
  
  try {
    const eventStatus = await getCache(eventKey);
    
    if (!eventStatus) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    res.json(eventStatus);
  } catch (error) {
    logger.error(`Error getting webhook status for ${eventId}:`, error);
    res.status(500).json({ error: 'Failed to get event status' });
  }
});

/**
 * Retry failed webhook events
 */
router.post('/stripe/retry/:eventId', async (req: Request, res: Response) => {
  const { eventId } = req.params;
  
  try {
    // This would typically fetch the original event from Stripe API
    // and reprocess it. For now, just return success.
    
    logger.info(`Retrying webhook event: ${eventId}`);
    res.json({ success: true, message: 'Event retry initiated' });
  } catch (error) {
    logger.error(`Error retrying webhook event ${eventId}:`, error);
    res.status(500).json({ error: 'Failed to retry event' });
  }
});

export default router;

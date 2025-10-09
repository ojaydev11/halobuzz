import express, { Request, Response } from 'express';
import Stripe from 'stripe';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { logger } from '../config/logger';

const router = express.Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any
});

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const COINS_PER_USD = parseInt(process.env.COINS_PER_USD || '100');

/**
 * POST /api/v1/webhooks/stripe
 * Handle Stripe webhook events
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

  // Handle the event
  try {
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

      default:
        logger.info(`Unhandled webhook event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Handle successful checkout session
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const coinPackageId = session.metadata?.coinPackageId;
  const coinsAmount = parseInt(session.metadata?.coinsAmount || '0');

  if (!userId || !coinsAmount) {
    logger.error('Missing metadata in checkout session:', session.id);
    return;
  }

  // Check for duplicate processing using idempotency
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
      logger.error(`User not found: ${userId}`);
      await mongoSession.abortTransaction();
      return;
    }

    // Update user coins
    if (!user.coins) {
      user.coins = { balance: 0, bonusBalance: 0, totalEarned: 0, totalSpent: 0 };
    }

    user.coins.balance += coinsAmount;
    user.coins.totalEarned += coinsAmount;
    await user.save({ session: mongoSession });

    // Create transaction record
    const transaction = new Transaction({
      userId,
      type: 'recharge',
      amount: coinsAmount,
      currency: 'coins',
      status: 'completed',
      paymentMethod: 'stripe',
      transactionId: session.payment_intent as string,
      description: `Purchased ${coinsAmount} coins via Stripe`,
      metadata: {
        stripeSessionId: session.id,
        coinPackageId,
        amountPaid: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency
      },
      fees: 0,
      netAmount: coinsAmount
    });
    await transaction.save({ session: mongoSession });

    await mongoSession.commitTransaction();

    logger.info(`Coins credited: User ${userId} - ${coinsAmount} coins - Session ${session.id}`);
  } catch (error) {
    await mongoSession.abortTransaction();
    logger.error('Error processing checkout completion:', error);
    throw error;
  } finally {
    mongoSession.endSession();
  }
}

/**
 * Handle successful payment intent
 */
async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  logger.info(`Payment succeeded: ${paymentIntent.id} - Amount: ${paymentIntent.amount}`);

  // Additional processing if needed
  // Most coin crediting happens in checkout.session.completed
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  const userId = paymentIntent.metadata?.userId;

  logger.error(`Payment failed: ${paymentIntent.id} - User: ${userId}`);

  if (userId) {
    // Create failed transaction record for audit
    const transaction = new Transaction({
      userId,
      type: 'recharge',
      amount: 0,
      currency: 'coins',
      status: 'failed',
      paymentMethod: 'stripe',
      transactionId: paymentIntent.id,
      description: 'Stripe payment failed',
      metadata: {
        error: paymentIntent.last_payment_error?.message,
        failureCode: paymentIntent.last_payment_error?.code
      },
      fees: 0,
      netAmount: 0
    });
    await transaction.save();
  }
}

/**
 * Handle charge refund
 */
async function handleChargeRefunded(charge: Stripe.Charge) {
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

  const mongoSession = await mongoose.startSession();
  mongoSession.startTransaction();

  try {
    const user = await User.findById(originalTransaction.userId).session(mongoSession);

    if (!user) {
      logger.error(`User not found for refund: ${originalTransaction.userId}`);
      await mongoSession.abortTransaction();
      return;
    }

    const refundAmount = originalTransaction.amount;

    // Deduct coins from user (if they have enough)
    if (user.coins.balance >= refundAmount) {
      user.coins.balance -= refundAmount;
      user.coins.totalEarned -= refundAmount;
      await user.save({ session: mongoSession });
    } else {
      logger.warn(`User ${user._id} has insufficient balance for refund. Balance: ${user.coins.balance}, Refund: ${refundAmount}`);
    }

    // Create refund transaction record
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
        refundReason: charge.refunds?.data[0]?.reason
      },
      fees: 0,
      netAmount: -refundAmount
    });
    await refundTransaction.save({ session: mongoSession });

    await mongoSession.commitTransaction();

    logger.info(`Refund processed: User ${user._id} - ${refundAmount} coins - Charge ${charge.id}`);
  } catch (error) {
    await mongoSession.abortTransaction();
    logger.error('Error processing refund:', error);
    throw error;
  } finally {
    mongoSession.endSession();
  }
}

/**
 * GET /api/v1/webhooks/stripe/test
 * Test endpoint for webhook setup (dev only)
 */
if (process.env.NODE_ENV !== 'production') {
  router.get('/stripe/test', (req: Request, res: Response) => {
    res.json({
      message: 'Stripe webhook endpoint is accessible',
      webhookUrl: `${process.env.API_URL || 'http://localhost:4000'}/api/v1/webhooks/stripe`,
      configured: !!STRIPE_WEBHOOK_SECRET
    });
  });
}

export default router;

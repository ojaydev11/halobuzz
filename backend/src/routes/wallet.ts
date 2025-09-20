import express, { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import { paymentService } from '../services/PaymentService';
import { PricingService } from '../services/PricingService';
import { paymentVelocityService } from '../services/PaymentVelocityService';
import { fraudDetectionService } from '../services/FraudDetectionService';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { logger } from '../config/logger';
import { WebhookEvent } from '../models/WebhookEvent';

const router = express.Router();

// Get wallet info
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get recent transactions
    const recentTransactions = await Transaction.find({ userId }).sort({ createdAt: -1 }).limit(10);

    res.json({
      success: true,
      data: {
        wallet: {
          balance: user.coins?.balance || 0,
          bonusBalance: user.coins?.bonusBalance || 0,
          totalEarned: user.coins?.totalEarned || 0,
          totalSpent: user.coins?.totalSpent || 0
        },
        recentTransactions
      }
    });

  } catch (error) {
    logger.error('Get wallet failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get wallet info'
    });
  }
});

// Recharge wallet
router.post('/recharge', [
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Amount must be at least 1'),
  body('paymentMethod')
    .isIn(['esewa', 'khalti', 'stripe', 'paypal'])
    .withMessage('Valid payment method is required'),
  body('coins')
    .isInt({ min: 1 })
    .withMessage('Valid coin amount is required')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { amount, paymentMethod, coins } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Validate NP baseline pricing for NPR flows (eSewa/Khalti)
    if (['esewa', 'khalti'].includes(paymentMethod)) {
      try {
        PricingService.validateNepalBaseline(amount, coins);
      } catch (err: any) {
        return res.status(400).json({ success: false, error: err.message });
      }
    }

    // Check if user is whitelisted for fraud detection
    const isWhitelisted = await fraudDetectionService.isUserWhitelisted(userId);
    
    if (!isWhitelisted) {
      // Check velocity limits
      const velocityCheck = await paymentVelocityService.checkVelocityLimits(userId, amount, paymentMethod);
      if (!velocityCheck.allowed) {
        return res.status(429).json({
          success: false,
          error: velocityCheck.reason,
          retryAfter: velocityCheck.retryAfter
        });
      }

      // Check fraud detection
      const fraudCheck = await fraudDetectionService.checkPaymentFraud(
        userId,
        amount,
        paymentMethod,
        {
          ip: req.ip,
          deviceId: req.headers['x-device-id'],
          userAgent: req.headers['user-agent']
        }
      );

      if (fraudCheck.shouldBlock) {
        logger.warn('Payment blocked due to fraud detection', {
          userId,
          amount,
          paymentMethod,
          fraudScore: fraudCheck.score,
          factors: fraudCheck.factors
        });

        return res.status(403).json({
          success: false,
          error: 'Payment blocked due to security concerns. Please contact support.',
          fraudScore: fraudCheck.score
        });
      }

      if (fraudCheck.shouldReview) {
        logger.warn('Payment flagged for review', {
          userId,
          amount,
          paymentMethod,
          fraudScore: fraudCheck.score,
          factors: fraudCheck.factors
        });
      }
    }

    // Create transaction record
    let transaction = await paymentService.createTransaction(
      userId,
      amount,
      coins,
      paymentMethod,
      { coins, amount }
    );

    let paymentResult;

    // Process payment based on method
    switch (paymentMethod) {
      case 'esewa':
        paymentResult = await paymentService.createEsewaPayment(amount, userId, coins);
        if (paymentResult?.paymentUrl && paymentResult?.pid) {
          await Transaction.findByIdAndUpdate(transaction._id, {
            $set: {
              transactionId: paymentResult.pid,
              metadata: { ...(transaction as any).metadata, pid: paymentResult.pid }
            }
          });
        }
        break;
      case 'khalti':
        paymentResult = await paymentService.createKhaltiPayment(amount, userId, coins);
        if (paymentResult?.token) {
          await Transaction.findByIdAndUpdate(transaction._id, {
            $set: {
              transactionId: paymentResult.token,
              metadata: { ...(transaction as any).metadata, token: paymentResult.token }
            }
          });
        }
        break;
      case 'stripe':
        paymentResult = await paymentService.createStripePaymentIntent(amount, 'USD', {
          userId,
          amount: amount.toString(),
          coins: coins.toString()
        });
        if (paymentResult?.paymentIntentId) {
          await Transaction.findByIdAndUpdate(transaction._id, {
            $set: {
              transactionId: paymentResult.paymentIntentId
            }
          });
        }
        break;
      case 'paypal':
        paymentResult = await paymentService.createPayPalOrder(amount, userId, coins);
        if (paymentResult?.orderId) {
          await Transaction.findByIdAndUpdate(transaction._id, {
            $set: {
              transactionId: paymentResult.orderId,
              metadata: { ...(transaction as any).metadata, orderId: paymentResult.orderId }
            }
          });
        }
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid payment method'
        });
    }

    if (!paymentResult.success) {
      // Record failed payment attempt
      await paymentVelocityService.recordPaymentAttempt(userId, amount, paymentMethod, false);
      
      return res.status(400).json({
        success: false,
        error: paymentResult.error
      });
    }

    // Record successful payment attempt
    await paymentVelocityService.recordPaymentAttempt(userId, amount, paymentMethod, true);

    res.json({
      success: true,
      message: 'Payment initiated successfully',
      data: {
        transactionId: transaction._id,
        paymentUrl: paymentResult.paymentUrl || paymentResult.approvalUrl || null,
        clientSecret: paymentResult.clientSecret,
        token: paymentResult.token,
        orderId: paymentResult.orderId || null
      }
    });

  } catch (error) {
    logger.error('Recharge failed:', error);
    res.status(500).json({
      success: false,
      error: 'Recharge failed'
    });
  }
});

// Get transaction history
router.get('/transactions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { limit = 20, page = 1 } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const transactions = await Transaction.find({ userId }).sort({ createdAt: -1 }).limit(parseInt(limit as string));
    const total = await Transaction.countDocuments({ userId });

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });

  } catch (error) {
    logger.error('Get transaction history failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transaction history'
    });
  }
});

// Withdraw coins (creates a pending withdrawal request)
router.post('/withdraw', [
  body('amount')
    .isInt({ min: 100 })
    .withMessage('Minimum withdrawal is 100 coins'),
  body('method')
    .isIn(['bank', 'esewa', 'khalti', 'paypal'])
    .withMessage('Valid withdrawal method is required'),
  body('account')
    .optional()
    .isString()
    .isLength({ min: 3, max: 200 })
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const { amount, method, account } = req.body as { amount: number; method: string; account?: string };
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Ensure sufficient balance (exclude bonusBalance)
    const spendable = user.coins?.balance || 0;
    if (spendable < amount) {
      return res.status(400).json({ success: false, error: 'Insufficient balance' });
    }

    // Deduct immediately to reserve funds
    await User.findByIdAndUpdate(userId, {
      $inc: {
        'coins.balance': -amount,
        'coins.totalSpent': amount
      }
    });

    // Record withdrawal request
    const txn = new Transaction({
      userId,
      type: 'withdrawal',
      amount,
      currency: 'coins',
      status: 'pending',
      description: `Withdrawal request via ${method}`,
      metadata: { method, account },
      netAmount: amount
    });
    await txn.save();

    res.json({ success: true, message: 'Withdrawal request submitted', data: { transactionId: txn._id } });

  } catch (error) {
    logger.error('Withdrawal request failed:', error);
    res.status(500).json({ success: false, error: 'Withdrawal failed' });
  }
});

// eSewa webhook
router.post('/webhooks/esewa', express.raw({ type: '*/*' }), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const raw = req.body as Buffer;
    const text = raw.toString('utf8');
    let body: any;
    try {
      body = JSON.parse(text);
    } catch {
      body = Object.fromEntries(new URLSearchParams(text));
    }
    const { pid, rid } = body;

    if (!pid || !rid) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }

    // HMAC verification
    const signature = (req.headers['x-webhook-signature'] as string) || '';
    const secret = process.env.ESEWA_WEBHOOK_SECRET || process.env.ESEWA_SECRET_KEY;
    if (!secret) {
      return res.status(400).json({ success: false, error: 'Missing ESEWA webhook secret' });
    }
    const computed = crypto.createHmac('sha256', secret).update(text).digest('hex');
    if (computed !== signature) {
      return res.status(400).json({ success: false, error: 'Invalid signature' });
    }

    // Idempotency by rid
    const eventId = `esewa:${rid}`;
    const existing = await WebhookEvent.findOne({ eventId });
    if (existing) {
      return res.json({ success: true, message: 'Already processed' });
    }

    const result = await paymentService.verifyEsewaPayment(pid, rid);

    if (result.success) {
      await WebhookEvent.create({ eventId, source: 'esewa', signature, payloadHash: computed });
      res.json({ success: true, message: 'Payment verified successfully' });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    logger.error('eSewa webhook failed:', error);
    res.status(500).json({
      success: false,
      error: 'Webhook processing failed'
    });
  }
});

// Khalti webhook
router.post('/webhooks/khalti', express.raw({ type: '*/*' }), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const raw = req.body as Buffer;
    const text = raw.toString('utf8');
    let body: any;
    try {
      body = JSON.parse(text);
    } catch {
      body = Object.fromEntries(new URLSearchParams(text));
    }
    const { token } = body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Missing token'
      });
    }

    // HMAC verification
    const signature = (req.headers['x-webhook-signature'] as string) || '';
    const secret = process.env.KHALTI_WEBHOOK_SECRET || process.env.KHALTI_SECRET_KEY;
    if (!secret) {
      return res.status(400).json({ success: false, error: 'Missing KHALTI webhook secret' });
    }
    const computed = crypto.createHmac('sha256', secret).update(text).digest('hex');
    if (computed !== signature) {
      return res.status(400).json({ success: false, error: 'Invalid signature' });
    }

    // Idempotency by token
    const eventId = `khalti:${token}`;
    const existing = await WebhookEvent.findOne({ eventId });
    if (existing) {
      return res.json({ success: true, message: 'Already processed' });
    }

    const result = await paymentService.verifyKhaltiPayment(token);

    if (result.success) {
      await WebhookEvent.create({ eventId, source: 'khalti', signature, payloadHash: computed });
      res.json({ success: true, message: 'Payment verified successfully' });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }

  } catch (error) {
    logger.error('Khalti webhook failed:', error);
    res.status(500).json({
      success: false,
      error: 'Webhook processing failed'
    });
  }
});

// Stripe webhook
router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !endpointSecret) {
      return res.status(400).json({
        success: false,
        error: 'Missing signature or webhook secret'
      });
    }

    // Verify webhook signature
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: 'Invalid signature'
      });
    }

    // Idempotency by Stripe event id
    const eventId = `stripe:${event.id}`;
    const existing = await WebhookEvent.findOne({ eventId });
    if (existing) {
      return res.json({ success: true, message: 'Already processed' });
    }

    // Handle the event
    await paymentService.handleStripeWebhook(event);
    await WebhookEvent.create({ eventId, source: 'stripe' });
    res.json({ success: true, message: 'Webhook processed successfully' });

  } catch (error) {
    logger.error('Stripe webhook failed:', error);
    res.status(500).json({
      success: false,
      error: 'Webhook processing failed'
    });
  }
});

// Disabled: Bonus transfer to main balance (bonus is non-spendable)
router.post('/transfer-bonus', (req, res) => {
  return res.status(403).json({
    success: false,
    error: 'Bonus balance is non-transferable and cannot be used for recharges or withdrawals.'
  });
});

// Dev-only endpoint for testing (remove in production)
if (process.env.NODE_ENV === 'development') {
  router.post('/dev/credit', [
    body('coins')
      .isInt({ min: 1 })
      .withMessage('Valid coin amount is required')
  ], async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { coins } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Credit coins to user
      await User.findByIdAndUpdate(userId, {
        $inc: { 'coins.balance': coins }
      });

      // Create transaction record
      const transaction = new Transaction({
        userId,
        type: 'dev_credit',
        amount: coins,
        currency: 'coins',
        status: 'completed',
        description: 'Development credit',
        metadata: { devCredit: true },
        netAmount: coins
      });
      await transaction.save();

      res.json({
        success: true,
        message: 'Coins credited successfully',
        data: {
          creditedAmount: coins,
          newBalance: (user.coins?.balance || 0) + coins
        }
      });

    } catch (error) {
      logger.error('Dev credit failed:', error);
      res.status(500).json({
        success: false,
        error: 'Credit failed'
      });
    }
  });
}

export default router;

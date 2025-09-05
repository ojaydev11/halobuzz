import express, { Response, Request } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthenticatedRequest, authMiddleware } from '../../../middleware/auth';
import { paymentProcessor } from '../../../services/payment/PaymentProcessor';
import { PricingService } from '../../../services/PricingService';
import { User } from '../../../models/User';
import { Transaction } from '../../../models/Transaction';
import { logger } from '../../../config/logger';
import { rateLimiter } from '../../../middleware/rateLimiter';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Payment rate limiting: 3 requests per minute per IP
const paymentRateLimiter = rateLimiter({
  windowMs: 60000,
  max: 3,
  message: 'Too many payment requests. Please wait before trying again.',
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * POST /api/v1/wallet/topup/:provider
 * Initiate coin top-up
 */
router.post('/wallet/topup/:provider', [
  authMiddleware,
  paymentRateLimiter,
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Amount must be at least 1'),
  body('coins')
    .isInt({ min: 100 })
    .withMessage('Minimum 100 coins required'),
  body('currency')
    .optional()
    .isISO4217()
    .withMessage('Valid currency code required')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const { provider } = req.params;
    const { amount, coins, currency = 'NPR' } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    // Validate provider
    if (!['esewa', 'khalti', 'stripe'].includes(provider)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment provider'
      });
    }

    // Validate Nepal baseline pricing for NPR
    if (currency === 'NPR' && ['esewa', 'khalti'].includes(provider)) {
      try {
        PricingService.validateNepalBaseline(amount, coins);
      } catch (error: any) {
        return res.status(400).json({
          success: false,
          error: error.message
        });
      }
    }

    // Generate idempotency key
    const idempotencyKey = req.headers['idempotency-key'] as string || uuidv4();

    // Process payment
    const result = await paymentProcessor.processTopup(
      userId,
      provider,
      amount,
      coins,
      idempotencyKey
    );

    // Log successful initiation
    logger.info('Payment initiated', {
      userId,
      provider,
      amount,
      coins,
      idempotencyKey
    });

    res.status(200).json({
      success: true,
      message: 'Payment initiated successfully',
      data: result
    });

  } catch (error: any) {
    logger.error('Payment initiation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Payment processing failed'
    });
  }
});

/**
 * POST /api/v1/payments/:provider/webhook
 * Handle payment provider webhooks (idempotent)
 */
router.post('/payments/:provider/webhook', async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    
    // Get webhook event ID for idempotency
    let eventId: string;
    let signature: string | undefined;

    switch (provider) {
      case 'esewa':
        eventId = `esewa_${req.body.refId || req.body.oid}`;
        break;
      case 'khalti':
        eventId = `khalti_${req.body.pidx}`;
        break;
      case 'stripe':
        eventId = req.body.id;
        signature = req.headers['stripe-signature'] as string;
        break;
      default:
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid provider' 
        });
    }

    // Process webhook with idempotency
    await paymentProcessor.handleWebhook(
      provider,
      eventId,
      req.body,
      signature
    );

    // Always return 200 to acknowledge receipt
    res.status(200).json({ 
      success: true, 
      message: 'Webhook processed' 
    });

  } catch (error: any) {
    logger.error('Webhook processing failed:', error);
    
    // Return 200 to prevent retries for processing errors
    // Log the error for manual investigation
    res.status(200).json({ 
      success: false, 
      error: 'Webhook logged for processing' 
    });
  }
});

/**
 * GET /api/v1/wallet/balance
 * Get user wallet balance
 */
router.get('/wallet/balance', [
  authMiddleware
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    const user = await User.findById(userId).select('coins username');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get recent transactions
    const recentTransactions = await Transaction.find({ 
      userId,
      status: 'completed'
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('type amount currency description createdAt');

    res.status(200).json({
      success: true,
      data: {
        balance: user.coins?.balance || 0,
        bonusBalance: user.coins?.bonusBalance || 0,
        totalEarned: user.coins?.totalEarned || 0,
        totalSpent: user.coins?.totalSpent || 0,
        recentTransactions
      }
    });

  } catch (error: any) {
    logger.error('Failed to get wallet balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve wallet balance'
    });
  }
});

/**
 * POST /api/v1/wallet/spend
 * Record coin spending (internal use)
 */
router.post('/wallet/spend', [
  authMiddleware,
  body('amount')
    .isInt({ min: 1 })
    .withMessage('Amount must be positive'),
  body('type')
    .isIn(['gift', 'og_purchase', 'throne', 'game'])
    .withMessage('Valid spend type required'),
  body('description')
    .isString()
    .isLength({ max: 200 })
    .withMessage('Description required')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false, 
        errors: errors.array() 
      });
    }

    const userId = req.user?.userId;
    const { amount, type, description, targetId } = req.body;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    // Get user and check balance
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if ((user.coins?.balance || 0) < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance'
      });
    }

    // Deduct coins
    user.coins.balance -= amount;
    user.coins.totalSpent += amount;
    await user.save();

    // Create transaction record
    const transaction = new Transaction({
      userId,
      type,
      amount: -amount, // Negative for spending
      currency: 'COINS',
      status: 'completed',
      description,
      metadata: {
        targetId,
        balanceAfter: user.coins.balance
      }
    });
    await transaction.save();

    logger.info('Coins spent', {
      userId,
      amount,
      type,
      newBalance: user.coins.balance
    });

    res.status(200).json({
      success: true,
      message: 'Coins spent successfully',
      data: {
        newBalance: user.coins.balance,
        transactionId: transaction._id
      }
    });

  } catch (error: any) {
    logger.error('Failed to spend coins:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process spending'
    });
  }
});

/**
 * GET /api/v1/payments/bundles
 * Get available coin bundles with country pricing
 */
router.get('/payments/bundles', async (req: Request, res: Response) => {
  try {
    const { country = 'NP', currency = 'NPR' } = req.query;

    // Define base bundles
    const bundles = [
      { coins: 500, basePrice: 100 },
      { coins: 1000, basePrice: 190 }, // 5% discount
      { coins: 2500, basePrice: 450 }, // 10% discount
      { coins: 5000, basePrice: 850 }, // 15% discount
      { coins: 10000, basePrice: 1600 } // 20% discount
    ];

    // Apply currency conversion
    const convertedBundles = bundles.map(bundle => {
      let price = bundle.basePrice;
      let displayCurrency = currency;

      // Convert based on country/currency
      if (currency === 'USD') {
        price = Math.round(bundle.basePrice / 130 * 100) / 100; // NPR to USD
      } else if (currency === 'EUR') {
        price = Math.round(bundle.basePrice / 140 * 100) / 100; // NPR to EUR
      } else if (currency === 'INR') {
        price = Math.round(bundle.basePrice * 0.625 * 100) / 100; // NPR to INR
      }

      return {
        coins: bundle.coins,
        price,
        currency: displayCurrency,
        popular: bundle.coins === 1000, // Mark most popular
        bonus: bundle.coins >= 5000 ? Math.round(bundle.coins * 0.1) : 0 // 10% bonus for large purchases
      };
    });

    res.status(200).json({
      success: true,
      data: {
        bundles: convertedBundles,
        country,
        currency,
        minPurchase: 500,
        maxPurchase: 50000
      }
    });

  } catch (error: any) {
    logger.error('Failed to get bundles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get coin bundles'
    });
  }
});

export default router;
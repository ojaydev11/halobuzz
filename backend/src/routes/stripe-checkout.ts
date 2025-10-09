import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import Stripe from 'stripe';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../config/logger';

const router = express.Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any
});

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Coin packages configuration
const COIN_PACKAGES = [
  { id: 'coins_100', coins: 100, price: 0.99, currency: 'USD', title: 'Starter Pack' },
  { id: 'coins_500', coins: 550, price: 4.99, currency: 'USD', title: 'Popular Pack', bonus: 50 },
  { id: 'coins_1000', coins: 1150, price: 9.99, currency: 'USD', title: 'Value Pack', bonus: 150 },
  { id: 'coins_5000', coins: 6000, price: 39.99, currency: 'USD', title: 'Mega Pack', bonus: 1000 },
  { id: 'coins_10000', coins: 12500, price: 79.99, currency: 'USD', title: 'Ultimate Pack', bonus: 2500 }
];

/**
 * GET /api/v1/stripe/products
 * Get available coin packages
 */
router.get('/products', authMiddleware, async (req: any, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        packages: COIN_PACKAGES.map(pkg => ({
          id: pkg.id,
          coins: pkg.coins,
          price: pkg.price,
          currency: pkg.currency,
          title: pkg.title,
          bonus: pkg.bonus || 0,
          savings: pkg.bonus ? Math.round((pkg.bonus / pkg.coins) * 100) : 0
        }))
      }
    });
  } catch (error) {
    logger.error('Error fetching coin packages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch coin packages'
    });
  }
});

/**
 * POST /api/v1/stripe/create-checkout-session
 * Create Stripe checkout session for coin purchase
 */
router.post('/create-checkout-session', [
  authMiddleware,
  body('packageId').isString().withMessage('Package ID is required'),
  body('successUrl').optional().isURL(),
  body('cancelUrl').optional().isURL()
], async (req: any, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const userId = req.user?.userId;
    const { packageId, successUrl, cancelUrl } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Find package
    const coinPackage = COIN_PACKAGES.find(pkg => pkg.id === packageId);

    if (!coinPackage) {
      return res.status(404).json({
        success: false,
        error: 'Package not found'
      });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: coinPackage.currency.toLowerCase(),
            product_data: {
              name: `${coinPackage.title} - ${coinPackage.coins} Coins`,
              description: coinPackage.bonus
                ? `Get ${coinPackage.coins} coins (includes ${coinPackage.bonus} bonus coins!)`
                : `Get ${coinPackage.coins} coins`,
              images: ['https://halobuzz.com/assets/coin-icon.png'] // Replace with actual image
            },
            unit_amount: Math.round(coinPackage.price * 100) // Convert to cents
          },
          quantity: 1
        }
      ],
      mode: 'payment',
      success_url: successUrl || `${FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${FRONTEND_URL}/payment/cancel`,
      client_reference_id: userId,
      metadata: {
        userId,
        coinPackageId: coinPackage.id,
        coinsAmount: coinPackage.coins.toString()
      }
    });

    logger.info(`Checkout session created: ${session.id} - User: ${userId} - Package: ${packageId}`);

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url
      }
    });
  } catch (error) {
    logger.error('Error creating checkout session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create checkout session'
    });
  }
});

/**
 * GET /api/v1/stripe/session/:sessionId
 * Get checkout session details
 */
router.get('/session/:sessionId', authMiddleware, async (req: any, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Verify session belongs to user
    if (session.metadata?.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized access to session'
      });
    }

    res.json({
      success: true,
      data: {
        id: session.id,
        status: session.payment_status,
        amountTotal: session.amount_total ? session.amount_total / 100 : 0,
        currency: session.currency,
        customerEmail: session.customer_details?.email,
        metadata: session.metadata
      }
    });
  } catch (error) {
    logger.error('Error retrieving session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve session'
    });
  }
});

export default router;

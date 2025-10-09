import express from 'express';
import { authMiddleware } from '@/middleware/auth';
import IAPValidationService from '@/services/IAPValidationService';
import User from '@/models/User';
import Transaction from '@/models/Transaction';

const router = express.Router();

/**
 * Verify IAP receipt and credit coins/subscription
 * POST /api/v1/wallet/iap/verify
 */
router.post('/verify', authMiddleware, async (req, res) => {
  try {
    const { platform, productId, transactionId, purchaseToken, receipt, orderId } = req.body;
    const userId = (req as any).user.userId;

    // Validate required fields
    if (!platform || !productId || !transactionId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Missing required fields' },
      });
    }

    // Check for duplicate transaction
    const isDuplicate = await IAPValidationService.isDuplicateTransaction(transactionId);
    if (isDuplicate) {
      return res.status(400).json({
        success: false,
        error: { message: 'Transaction already processed' },
      });
    }

    let validationResult;

    // Validate receipt based on platform
    if (platform === 'ios') {
      if (!receipt) {
        return res.status(400).json({
          success: false,
          error: { message: 'Receipt required for iOS' },
        });
      }

      validationResult = await IAPValidationService.validateAppleReceipt({
        receipt,
        productId,
        transactionId,
      });
    } else if (platform === 'android') {
      if (!purchaseToken) {
        return res.status(400).json({
          success: false,
          error: { message: 'Purchase token required for Android' },
        });
      }

      const isSubscription = productId.includes('og.tier');

      validationResult = await IAPValidationService.validateGoogleReceipt({
        packageName: 'com.halobuzz.app',
        productId,
        purchaseToken,
        subscription: isSubscription,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid platform' },
      });
    }

    // Check validation result
    if (!validationResult.valid) {
      console.error('IAP validation failed:', validationResult.error);
      return res.status(400).json({
        success: false,
        error: { message: validationResult.error || 'Receipt validation failed' },
      });
    }

    // Process based on product type
    if (validationResult.coins) {
      // Coin purchase - credit coins to user's wallet
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: { message: 'User not found' },
        });
      }

      // Add coins to balance
      if (!user.wallet) {
        user.wallet = { balance: 0 };
      }
      user.wallet.balance = (user.wallet.balance || 0) + validationResult.coins;
      await user.save();

      // Create transaction record
      const transaction = new Transaction({
        userId,
        type: 'purchase',
        amount: validationResult.coins,
        balance: user.wallet.balance,
        description: `Purchased ${validationResult.coins} coins via IAP`,
        status: 'completed',
        metadata: {
          iap: {
            platform,
            productId,
            transactionId,
            orderId,
            validatedAt: new Date(),
          },
        },
      });
      await transaction.save();

      return res.json({
        success: true,
        data: {
          coins: validationResult.coins,
          balance: user.wallet.balance,
          transactionId,
        },
      });
    } else if (validationResult.tier) {
      // OG Tier subscription - update user's OG tier
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: { message: 'User not found' },
        });
      }

      // Update OG tier
      if (!user.ogMembership) {
        user.ogMembership = { tier: 0, joinedAt: new Date() };
      }
      user.ogMembership.tier = validationResult.tier;
      user.ogMembership.active = true;
      user.ogMembership.subscriptionId = transactionId;
      user.ogMembership.renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      await user.save();

      // Create transaction record
      const transaction = new Transaction({
        userId,
        type: 'subscription',
        amount: 0,
        balance: user.wallet?.balance || 0,
        description: `Subscribed to OG Tier ${validationResult.tier} via IAP`,
        status: 'completed',
        metadata: {
          iap: {
            platform,
            productId,
            transactionId,
            orderId,
            validatedAt: new Date(),
          },
          subscription: {
            tier: validationResult.tier,
            renewalDate: user.ogMembership.renewalDate,
          },
        },
      });
      await transaction.save();

      return res.json({
        success: true,
        data: {
          tier: validationResult.tier,
          renewalDate: user.ogMembership.renewalDate,
          transactionId,
        },
      });
    } else {
      return res.status(400).json({
        success: false,
        error: { message: 'Unknown product type' },
      });
    }
  } catch (error) {
    console.error('IAP verification error:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Internal server error' },
    });
  }
});

/**
 * Get IAP product details
 * GET /api/v1/wallet/iap/products
 */
router.get('/products', authMiddleware, async (req, res) => {
  try {
    const coinPackages = [
      { id: 'coins_100', coins: 100, price: 0.99, currency: 'USD', title: 'Starter Pack' },
      { id: 'coins_500', coins: 550, price: 4.99, currency: 'USD', title: 'Popular Pack', bonus: 50 },
      { id: 'coins_1000', coins: 1150, price: 9.99, currency: 'USD', title: 'Value Pack', bonus: 150 },
      { id: 'coins_5000', coins: 6000, price: 39.99, currency: 'USD', title: 'Mega Pack', bonus: 1000 },
      { id: 'coins_10000', coins: 12500, price: 79.99, currency: 'USD', title: 'Ultimate Pack', bonus: 2500 },
    ];

    const ogTiers = [
      { id: 'og_tier_1', tier: 1, price: 4.99, currency: 'USD', title: 'OG Tier 1 - Bronze' },
      { id: 'og_tier_2', tier: 2, price: 9.99, currency: 'USD', title: 'OG Tier 2 - Silver' },
      { id: 'og_tier_3', tier: 3, price: 19.99, currency: 'USD', title: 'OG Tier 3 - Gold' },
      { id: 'og_tier_4', tier: 4, price: 49.99, currency: 'USD', title: 'OG Tier 4 - Platinum' },
      { id: 'og_tier_5', tier: 5, price: 99.99, currency: 'USD', title: 'OG Tier 5 - Diamond' },
    ];

    return res.json({
      success: true,
      data: {
        coinPackages,
        ogTiers,
      },
    });
  } catch (error) {
    console.error('Get IAP products error:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Internal server error' },
    });
  }
});

export default router;

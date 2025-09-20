import express from 'express';
import { body, validationResult } from 'express-validator';
import { OGTier } from '../models/OGTier';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { reputationService } from '../services/ReputationService';
import { logger } from '../config/logger';
import dayjs from 'dayjs';

const router = express.Router();

// Get OG tiers
router.get('/tiers', async (req, res) => {
  try {
    const tiers = await OGTier.find({ isActive: true }).sort({ tier: 1 });

    res.json({
      success: true,
      data: {
        tiers: tiers.map(tier => ({
          id: tier._id,
          tier: tier.tier,
          name: tier.name,
          description: tier.description,
          priceUSD: tier.priceUSD,
          priceCoins: tier.priceCoins,
          duration: tier.duration,
          benefits: tier.benefits
        }))
      }
    });

  } catch (error) {
    logger.error('Get OG tiers failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get OG tiers'
    });
  }
});

// Get OG tier by ID
router.get('/tiers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const tier = await OGTier.findById(id);
    if (!tier) {
      return res.status(404).json({
        success: false,
        error: 'OG tier not found'
      });
    }

    res.json({
      success: true,
      data: {
        tier: {
          id: tier._id,
          tier: tier.tier,
          name: tier.name,
          description: tier.description,
          priceUSD: tier.priceUSD,
          priceCoins: tier.priceCoins,
          duration: tier.duration,
          benefits: tier.benefits
        }
      }
    });

  } catch (error) {
    logger.error('Get OG tier failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get OG tier'
    });
  }
});

// Subscribe to OG tier
router.post('/subscribe', [
  body('tierId')
    .isMongoId()
    .withMessage('Valid tier ID is required'),
  body('paymentMethod')
    .isIn(['coins', 'stripe'])
    .withMessage('Valid payment method is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { tierId, paymentMethod } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Validate OG tier
    const tier = await OGTier.findById(tierId);
    if (!tier) {
      return res.status(404).json({
        success: false,
        error: 'OG tier not found'
      });
    }

    if (!tier.isActive) {
      return res.status(400).json({
        success: false,
        error: 'OG tier is not available'
      });
    }

    // Check if user already has this tier or higher
    if (user.ogLevel >= tier.tier) {
      return res.status(400).json({
        success: false,
        error: 'You already have this tier or higher'
      });
    }

    let paymentResult;

    if (paymentMethod === 'coins') {
      // Check if user has enough coins
      if (user.coins?.balance < tier.priceCoins) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient coins'
        });
      }

      // Deduct coins
      await User.findByIdAndUpdate(userId, {
        $inc: { 
          'coins.balance': -tier.priceCoins,
          'coins.totalSpent': tier.priceCoins
        }
      });

      paymentResult = { success: true };
    } else if (paymentMethod === 'stripe') {
      // TODO: Implement Stripe payment
      return res.status(400).json({
        success: false,
        error: 'Stripe payment not implemented yet'
      });
    }

    if (!paymentResult?.success) {
      return res.status(400).json({
        success: false,
        error: 'Payment failed'
      });
    }

    // Calculate new expiry date
    const currentExpiry = user.ogExpiresAt && user.ogExpiresAt > new Date() 
      ? user.ogExpiresAt 
      : new Date();
    
    const newExpiry = new Date(currentExpiry.getTime() + tier.duration * 24 * 60 * 60 * 1000);

    // Update user's OG status
    await User.findByIdAndUpdate(userId, {
      ogLevel: tier.tier,
      ogExpiresAt: newExpiry
    });

    // Create transaction record
    const transaction = new Transaction({
      userId,
      type: 'og_subscription',
      amount: paymentMethod === 'coins' ? tier.priceCoins : tier.priceUSD,
      currency: paymentMethod === 'coins' ? 'coins' : 'USD',
      status: 'completed',
      paymentMethod: paymentMethod === 'stripe' ? 'stripe' : undefined,
      description: `OG Tier ${tier.tier} subscription`,
      metadata: {
        ogTier: tier.tier,
        tierName: tier.name,
        duration: tier.duration
      },
      netAmount: paymentMethod === 'coins' ? tier.priceCoins : tier.priceUSD
    });
    await transaction.save();

    // Apply reputation bonus
    await reputationService.applyReputationDelta(userId, 'og_subscription', {
      tier: tier.tier
    });

    res.json({
      success: true,
      message: 'OG subscription successful',
      data: {
        subscription: {
          tier: tier.tier,
          name: tier.name,
          expiresAt: newExpiry,
          benefits: tier.benefits
        },
        user: {
          newOgLevel: tier.tier,
          newOgExpiry: newExpiry
        }
      }
    });

  } catch (error) {
    logger.error('OG subscription failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to subscribe to OG tier'
    });
  }
});

// Get user's OG status
router.get('/status', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;

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

    // Get current tier details
    let currentTier = null;
    if (user.ogLevel > 0) {
      currentTier = await OGTier.findOne({ tier: user.ogLevel, isActive: true });
    }

    // Get next tier
    let nextTier = null;
    if (user.ogLevel < 5) {
      nextTier = await OGTier.findOne({ tier: { $gt: user.ogLevel }, isActive: true }).sort({ tier: 1 });
    }

    res.json({
      success: true,
      data: {
        ogStatus: {
          level: user.ogLevel,
          expiresAt: user.ogExpiresAt,
          isActive: user.ogExpiresAt ? new Date() < user.ogExpiresAt : false,
          currentTier: currentTier ? {
            id: currentTier._id,
            tier: currentTier.tier,
            name: currentTier.name,
            benefits: currentTier.benefits
          } : null,
          nextTier: nextTier ? {
            id: nextTier._id,
            tier: nextTier.tier,
            name: nextTier.name,
            priceUSD: nextTier.priceUSD,
            priceCoins: nextTier.priceCoins,
            benefits: nextTier.benefits
          } : null
        }
      }
    });

  } catch (error) {
    logger.error('Get OG status failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get OG status'
    });
  }
});

// Get OG benefits
router.get('/benefits', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;

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

    if (user.ogLevel === 0) {
      return res.json({
        success: true,
        data: {
          benefits: []
        }
      });
    }

    const tier = await OGTier.findOne({ tier: user.ogLevel, isActive: true });
    if (!tier) {
      return res.json({
        success: true,
        data: {
          benefits: []
        }
      });
    }

    res.json({
      success: true,
      data: {
        benefits: {
          dailyBonus: tier.benefits.dailyBonus,
          exclusiveGifts: tier.benefits.exclusiveGifts,
          chatPrivileges: tier.benefits.chatPrivileges,
          customEmojis: tier.benefits.customEmojis,
          profileBadge: tier.benefits.profileBadge,
          prioritySupport: tier.benefits.prioritySupport,
          adFree: tier.benefits.adFree,
          customUsername: tier.benefits.customUsername,
          streamSkins: tier.benefits.streamSkins,
          giftDiscount: tier.benefits.giftDiscount
        }
      }
    });

  } catch (error) {
    logger.error('Get OG benefits failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get OG benefits'
    });
  }
});

// Get OG leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const users = await User.find({ 
      ogLevel: { $gt: 0 },
      ogExpiresAt: { $gt: new Date() }
    })
      .sort({ ogLevel: -1, 'trust.score': -1 })
      .limit(parseInt(limit as string))
      .select('username avatar ogLevel ogExpiresAt trust.score');

    res.json({
      success: true,
      data: {
        leaderboard: users.map(user => ({
          id: user._id,
          username: user.username,
          avatar: user.avatar,
          ogLevel: user.ogLevel,
          ogExpiresAt: user.ogExpiresAt,
          trustScore: user.trust?.score || 0
        }))
      }
    });

  } catch (error) {
    logger.error('Get OG leaderboard failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get OG leaderboard'
    });
  }
});

export default router;

// Daily OG bonus claim (non-withdrawable bonus coins)
router.post('/daily-bonus/claim', async (req, res) => {
  try {
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (!user.ogLevel || !(user.ogExpiresAt && new Date() < user.ogExpiresAt)) {
      return res.status(400).json({ success: false, error: 'OG subscription inactive' });
    }

    const tier = await OGTier.findOne({ tier: user.ogLevel, isActive: true });
    if (!tier) {
      return res.status(400).json({ success: false, error: 'OG tier not found' });
    }

    // Enforce once per day claim; use Transaction as ledger
    const startOfDay = dayjs().startOf('day').toDate();
    const existing = await Transaction.findOne({
      userId,
      type: 'og_bonus',
      status: 'completed',
      createdAt: { $gte: startOfDay }
    });
    if (existing) {
      return res.status(429).json({ success: false, error: 'Daily bonus already claimed' });
    }

    // Credit bonusBalance only (non-withdrawable)
    await User.findByIdAndUpdate(userId, {
      $inc: { 'coins.bonusBalance': tier.benefits.dailyBonus }
    });

    // Record transaction
    const txn = new Transaction({
      userId,
      type: 'og_bonus',
      amount: tier.benefits.dailyBonus,
      currency: 'coins',
      status: 'completed',
      description: `OG daily bonus (Tier ${tier.tier})`,
      metadata: { ogTier: tier.tier },
      netAmount: tier.benefits.dailyBonus
    });
    await txn.save();

    res.json({
      success: true,
      data: { bonus: tier.benefits.dailyBonus }
    });

  } catch (error) {
    logger.error('OG daily bonus claim failed:', error);
    res.status(500).json({ success: false, error: 'Failed to claim daily bonus' });
  }
});

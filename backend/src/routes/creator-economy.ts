import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { creatorEconomyService } from '../services/CreatorEconomyService';
import { logger } from '../config/logger';

const router = express.Router();

// Get creator tier information
router.get('/tier/:userId', [
  query('userId')
    .isMongoId()
    .withMessage('Valid user ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { userId } = req.params;
    const tier = await creatorEconomyService.getCreatorTier(userId);

    res.json({
      success: true,
      data: {
        tier
      }
    });
  } catch (error) {
    logger.error('Failed to get creator tier:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get creator tier'
    });
  }
});

// Get creator statistics
router.get('/stats/:userId', [
  query('userId')
    .isMongoId()
    .withMessage('Valid user ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { userId } = req.params;
    const stats = await creatorEconomyService.getCreatorStats(userId);

    res.json({
      success: true,
      data: {
        stats
      }
    });
  } catch (error) {
    logger.error('Failed to get creator stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get creator stats'
    });
  }
});

// Create subscription tier
router.post('/subscription-tier', [
  body('creatorId')
    .isMongoId()
    .withMessage('Valid creator ID is required'),
  body('name')
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Tier name is required (1-50 characters)'),
  body('price')
    .isNumeric()
    .isFloat({ min: 0.99, max: 999.99 })
    .withMessage('Price must be between $0.99 and $999.99'),
  body('currency')
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage('Valid currency code is required'),
  body('benefits')
    .isArray()
    .withMessage('Benefits must be an array'),
  body('benefits.*')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Each benefit must be 1-100 characters'),
  body('duration')
    .isIn(['monthly', 'yearly'])
    .withMessage('Duration must be monthly or yearly')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { creatorId, name, price, currency, benefits, duration } = req.body;
    
    const subscriptionTier = await creatorEconomyService.createSubscriptionTier(creatorId, {
      name,
      price,
      currency,
      benefits,
      duration
    });

    res.status(201).json({
      success: true,
      data: {
        subscriptionTier
      }
    });
  } catch (error) {
    logger.error('Failed to create subscription tier:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create subscription tier'
    });
  }
});

// Process subscription payment
router.post('/subscription-payment', [
  body('subscriberId')
    .isMongoId()
    .withMessage('Valid subscriber ID is required'),
  body('creatorId')
    .isMongoId()
    .withMessage('Valid creator ID is required'),
  body('tierId')
    .isString()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Tier ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { subscriberId, creatorId, tierId } = req.body;
    
    const success = await creatorEconomyService.processSubscriptionPayment(
      subscriberId,
      creatorId,
      tierId
    );

    if (success) {
      res.json({
        success: true,
        message: 'Subscription payment processed successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to process subscription payment'
      });
    }
  } catch (error) {
    logger.error('Failed to process subscription payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process subscription payment'
    });
  }
});

// Create brand deal
router.post('/brand-deal', [
  body('creatorId')
    .isMongoId()
    .withMessage('Valid creator ID is required'),
  body('brandName')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Brand name is required (1-100 characters)'),
  body('dealType')
    .isIn(['sponsored_stream', 'product_placement', 'brand_ambassador'])
    .withMessage('Valid deal type is required'),
  body('amount')
    .isNumeric()
    .isFloat({ min: 10, max: 1000000 })
    .withMessage('Amount must be between $10 and $1,000,000'),
  body('currency')
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage('Valid currency code is required'),
  body('startDate')
    .isISO8601()
    .withMessage('Valid start date is required'),
  body('endDate')
    .isISO8601()
    .withMessage('Valid end date is required'),
  body('requirements')
    .isArray()
    .withMessage('Requirements must be an array'),
  body('deliverables')
    .isArray()
    .withMessage('Deliverables must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      creatorId,
      brandName,
      dealType,
      amount,
      currency,
      startDate,
      endDate,
      requirements,
      deliverables
    } = req.body;
    
    const brandDeal = await creatorEconomyService.createBrandDeal({
      creatorId,
      brandName,
      dealType,
      amount,
      currency,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      requirements,
      deliverables
    });

    res.status(201).json({
      success: true,
      data: {
        brandDeal
      }
    });
  } catch (error) {
    logger.error('Failed to create brand deal:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create brand deal'
    });
  }
});

// Process brand deal payment
router.post('/brand-deal-payment', [
  body('dealId')
    .isString()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Deal ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { dealId } = req.body;
    
    const success = await creatorEconomyService.processBrandDealPayment(dealId);

    if (success) {
      res.json({
        success: true,
        message: 'Brand deal payment processed successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to process brand deal payment'
      });
    }
  } catch (error) {
    logger.error('Failed to process brand deal payment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process brand deal payment'
    });
  }
});

// Get creator leaderboard
router.get('/leaderboard', [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { limit = 10 } = req.query;
    const leaderboard = await creatorEconomyService.getCreatorLeaderboard(parseInt(limit as string));

    res.json({
      success: true,
      data: {
        leaderboard,
        total: leaderboard.length
      }
    });
  } catch (error) {
    logger.error('Failed to get creator leaderboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get creator leaderboard'
    });
  }
});

// Get platform revenue statistics
router.get('/platform-revenue', async (req, res) => {
  try {
    const revenueStats = await creatorEconomyService.getPlatformRevenueStats();

    res.json({
      success: true,
      data: {
        revenueStats
      }
    });
  } catch (error) {
    logger.error('Failed to get platform revenue stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get platform revenue statistics'
    });
  }
});

// Get available subscription tiers
router.get('/subscription-tiers', async (req, res) => {
  try {
    // In production, fetch from database
    const subscriptionTiers = [
      {
        id: 'basic',
        name: 'Supporter',
        price: 4.99,
        currency: 'USD',
        benefits: [
          'Exclusive content access',
          'Supporter badge',
          'Priority chat',
          'Monthly Q&A session'
        ],
        duration: 'monthly',
        creatorRevenue: 3.49,
        platformFee: 1.50
      },
      {
        id: 'premium',
        name: 'VIP Supporter',
        price: 9.99,
        currency: 'USD',
        benefits: [
          'All Supporter benefits',
          'VIP badge',
          'Direct messaging',
          'Custom content requests',
          'Weekly live sessions'
        ],
        duration: 'monthly',
        creatorRevenue: 6.99,
        platformFee: 3.00
      },
      {
        id: 'ultimate',
        name: 'Ultimate Fan',
        price: 19.99,
        currency: 'USD',
        benefits: [
          'All VIP benefits',
          'Ultimate badge',
          'Personal shoutouts',
          'Exclusive merchandise',
          'Private group access',
          'Monthly 1-on-1 call'
        ],
        duration: 'monthly',
        creatorRevenue: 13.99,
        platformFee: 6.00
      }
    ];

    res.json({
      success: true,
      data: {
        subscriptionTiers
      }
    });
  } catch (error) {
    logger.error('Failed to get subscription tiers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get subscription tiers'
    });
  }
});

// Get creator tier benefits
router.get('/tier-benefits/:level', [
  query('level')
    .isInt({ min: 1, max: 5 })
    .withMessage('Tier level must be between 1 and 5')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { level } = req.params;
    
    // In production, fetch from database
    const tierBenefits = {
      1: {
        name: 'Rising Star',
        benefits: [
          'Basic analytics',
          'Standard support',
          'Gift receiving',
          'Basic customization'
        ],
        revenueShare: 70,
        platformFee: 30
      },
      2: {
        name: 'Popular Creator',
        benefits: [
          'Advanced analytics',
          'Priority support',
          'Custom badges',
          'Early access to features',
          'Creator tools'
        ],
        revenueShare: 75,
        platformFee: 25
      },
      3: {
        name: 'Influencer',
        benefits: [
          'Premium analytics',
          'Dedicated support',
          'Brand partnership opportunities',
          'Merchandise store',
          'Subscription tiers',
          'Advanced creator tools'
        ],
        revenueShare: 80,
        platformFee: 20
      },
      4: {
        name: 'Superstar',
        benefits: [
          'Enterprise analytics',
          'Personal account manager',
          'Exclusive brand deals',
          'Revenue sharing programs',
          'Platform partnership',
          'Custom features'
        ],
        revenueShare: 85,
        platformFee: 15
      },
      5: {
        name: 'Legend',
        benefits: [
          'White-label solutions',
          'Revenue sharing equity',
          'Platform advisory role',
          'Exclusive events',
          'Custom integrations',
          'Global expansion support'
        ],
        revenueShare: 90,
        platformFee: 10
      }
    };

    const benefits = tierBenefits[parseInt(level) as keyof typeof tierBenefits];

    if (!benefits) {
      return res.status(404).json({
        success: false,
        error: 'Tier level not found'
      });
    }

    res.json({
      success: true,
      data: {
        level: parseInt(level),
        benefits
      }
    });
  } catch (error) {
    logger.error('Failed to get tier benefits:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tier benefits'
    });
  }
});

export default router;

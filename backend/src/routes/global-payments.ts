import express from 'express';
import { body, validationResult } from 'express-validator';
import { logger } from '../config/logger';
import { AuthenticatedRequest } from '../middleware/auth';
import globalPaymentService from '../services/GlobalPaymentService';
import { User } from '../models/User';

const router = express.Router();

// Process global payment
router.post('/process', [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Valid amount is required'),
  body('currency')
    .isLength({ min: 3, max: 3 })
    .withMessage('Valid currency code is required'),
  body('paymentMethod')
    .notEmpty()
    .withMessage('Payment method is required'),
  body('customerInfo.email')
    .isEmail()
    .withMessage('Valid email is required'),
  body('customerInfo.address.line1')
    .notEmpty()
    .withMessage('Address line 1 is required'),
  body('customerInfo.address.city')
    .notEmpty()
    .withMessage('City is required'),
  body('customerInfo.address.postalCode')
    .notEmpty()
    .withMessage('Postal code is required'),
  body('customerInfo.address.country')
    .isLength({ min: 2, max: 2 })
    .withMessage('Valid country code is required')
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { amount, currency, paymentMethod, customerInfo, metadata = {} } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Process payment
    const result = await globalPaymentService.processPayment({
      userId,
      amount,
      currency: currency.toUpperCase(),
      paymentMethod,
      customerInfo,
      metadata: {
        ...metadata,
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      },
      fraudCheck: true
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        fraudScore: result.fraudScore
      });
    }

    logger.info(`Global payment processed: ${result.transactionId}`, {
      userId,
      amount,
      currency,
      paymentMethod,
      fraudScore: result.fraudScore
    });

    res.json({
      success: true,
      data: {
        transactionId: result.transactionId,
        paymentUrl: result.paymentUrl,
        clientSecret: result.clientSecret,
        requires3DSecure: result.requires3DSecure,
        fraudScore: result.fraudScore,
        metadata: result.metadata
      }
    });

  } catch (error) {
    logger.error('Error processing global payment:', error);
    res.status(500).json({
      success: false,
      error: 'Payment processing failed'
    });
  }
});

// Confirm 3D Secure payment
router.post('/confirm-3ds', [
  body('transactionId')
    .notEmpty()
    .withMessage('Transaction ID is required'),
  body('paymentIntentId')
    .notEmpty()
    .withMessage('Payment Intent ID is required')
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { transactionId, paymentIntentId } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    // Confirm 3D Secure payment with Stripe
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    try {
      const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        // Update transaction status
        const { Transaction } = require('../models/Transaction');
        await Transaction.findOneAndUpdate(
          { transactionId, userId },
          { 
            $set: { 
              status: 'completed',
              'metadata.paymentIntentStatus': paymentIntent.status,
              'metadata.confirmedAt': new Date()
            }
          }
        );

        // Update user balance
        const transaction = await Transaction.findOne({ transactionId, userId });
        if (transaction) {
          await User.findByIdAndUpdate(userId, {
            $inc: { 'coins.balance': transaction.metadata?.coins || 0 }
          });
        }

        logger.info(`3D Secure payment confirmed: ${transactionId}`);

        res.json({
          success: true,
          message: 'Payment confirmed successfully',
          data: {
            transactionId,
            status: paymentIntent.status,
            amount: paymentIntent.amount
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: `Payment failed: ${paymentIntent.status}`
        });
      }
    } catch (stripeError) {
      logger.error('Stripe confirmation error:', stripeError);
      res.status(400).json({
        success: false,
        error: 'Payment confirmation failed'
      });
    }

  } catch (error) {
    logger.error('Error confirming 3D Secure payment:', error);
    res.status(500).json({
      success: false,
      error: 'Payment confirmation failed'
    });
  }
});

// Get supported currencies
router.get('/currencies', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const currencies = globalPaymentService.getSupportedCurrencies();

    res.json({
      success: true,
      data: currencies
    });

  } catch (error) {
    logger.error('Error getting supported currencies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get currencies'
    });
  }
});

// Get exchange rates
router.get('/exchange-rates', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const exchangeRates = await globalPaymentService.getExchangeRates();
    const ratesObject = Object.fromEntries(exchangeRates);

    res.json({
      success: true,
      data: {
        baseCurrency: 'USD',
        rates: ratesObject,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Error getting exchange rates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get exchange rates'
    });
  }
});

// Convert currency
router.post('/convert', [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Valid amount is required'),
  body('fromCurrency')
    .isLength({ min: 3, max: 3 })
    .withMessage('Valid from currency code is required'),
  body('toCurrency')
    .isLength({ min: 3, max: 3 })
    .withMessage('Valid to currency code is required')
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { amount, fromCurrency, toCurrency } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const convertedAmount = globalPaymentService.convertCurrency(
      amount,
      fromCurrency.toUpperCase(),
      toCurrency.toUpperCase()
    );

    res.json({
      success: true,
      data: {
        originalAmount: amount,
        originalCurrency: fromCurrency.toUpperCase(),
        convertedAmount,
        targetCurrency: toCurrency.toUpperCase(),
        conversionRate: convertedAmount / amount
      }
    });

  } catch (error) {
    logger.error('Error converting currency:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Currency conversion failed'
    });
  }
});

// Get payment methods for currency
router.get('/payment-methods/:currency', async (req: AuthenticatedRequest, res) => {
  try {
    const { currency } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const currencies = globalPaymentService.getSupportedCurrencies();
    const currencyConfig = currencies.find(c => c.code === currency.toUpperCase());

    if (!currencyConfig) {
      return res.status(400).json({
        success: false,
        error: 'Currency not supported'
      });
    }

    res.json({
      success: true,
      data: {
        currency: currencyConfig.code,
        symbol: currencyConfig.symbol,
        supportedProviders: currencyConfig.supportedProviders,
        paymentMethods: currencyConfig.supportedProviders.map(provider => ({
          id: provider,
          name: provider.charAt(0).toUpperCase() + provider.slice(1),
          supported: true
        }))
      }
    });

  } catch (error) {
    logger.error('Error getting payment methods:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment methods'
    });
  }
});

// Validate payment data
router.post('/validate', [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Valid amount is required'),
  body('currency')
    .isLength({ min: 3, max: 3 })
    .withMessage('Valid currency code is required'),
  body('paymentMethod')
    .notEmpty()
    .withMessage('Payment method is required')
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { amount, currency, paymentMethod } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User authentication required'
      });
    }

    const currencies = globalPaymentService.getSupportedCurrencies();
    const currencyConfig = currencies.find(c => c.code === currency.toUpperCase());

    if (!currencyConfig) {
      return res.status(400).json({
        success: false,
        error: 'Currency not supported'
      });
    }

    if (!currencyConfig.supportedProviders.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        error: `Payment method ${paymentMethod} not supported for currency ${currency}`
      });
    }

    res.json({
      success: true,
      message: 'Payment data is valid',
      data: {
        amount,
        currency: currencyConfig.code,
        symbol: currencyConfig.symbol,
        paymentMethod,
        supported: true
      }
    });

  } catch (error) {
    logger.error('Error validating payment data:', error);
    res.status(500).json({
      success: false,
      error: 'Payment validation failed'
    });
  }
});

export default router;

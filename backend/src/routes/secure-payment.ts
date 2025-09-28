import * as express from 'express';
import { securePaymentService } from '../services/SecurePaymentService';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../config/logger';

interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
    email: string;
    username: string;
    isVerified: boolean;
    isAdmin: boolean;
    ogLevel: number;
    trustScore: number;
    mfaEnabled: boolean;
    lastLoginAt: Date;
  };
}

const router = express.Router();

/**
 * @route POST /secure-payment/process
 * @description Process secure payment with fraud detection
 * @access Private
 */
router.post('/process', authMiddleware, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { amount, currency, paymentMethod, description, metadata } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    if (!amount || !currency || !paymentMethod || !description) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: amount, currency, paymentMethod, description'
      });
    }

    const paymentRequest = {
      userId,
      amount: parseFloat(amount),
      currency,
      paymentMethod,
      description,
      metadata: {
        ...metadata,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: new Date()
      }
    };

    const result = await securePaymentService.processPayment(paymentRequest);

    logger.info('Payment processed', {
      userId,
      amount,
      paymentMethod,
      success: result.success,
      transactionId: result.transactionId
    });

    res.json(result);
  } catch (error: any) {
    logger.error('Payment processing error:', error);
    res.status(500).json({
      success: false,
      error: 'Payment processing failed'
    });
  }
});

/**
 * @route POST /secure-payment/verify
 * @description Verify payment completion
 * @access Private
 */
router.post('/verify', authMiddleware, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { transactionId, verificationData } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    if (!transactionId || !verificationData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: transactionId, verificationData'
      });
    }

    const result = await securePaymentService.verifyPayment(transactionId, verificationData);

    logger.info('Payment verified', {
      userId,
      transactionId,
      isValid: result.isValid,
      status: result.status
    });

    res.json({
      success: true,
      verification: result
    });
  } catch (error: any) {
    logger.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Payment verification failed'
    });
  }
});

/**
 * @route GET /secure-payment/limits
 * @description Get payment limits for user
 * @access Private
 */
router.get('/limits', authMiddleware, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Get user's daily spending
    const dailySpent = await securePaymentService.getUserDailySpending(userId);
    const maxDailyAmount = 10000; // $10,000 per day
    const maxTransactionAmount = 1000; // $1,000 per transaction

    res.json({
      success: true,
      limits: {
        maxDailyAmount,
        maxTransactionAmount,
        dailySpent,
        remainingDaily: maxDailyAmount - dailySpent
      }
    });
  } catch (error: any) {
    logger.error('Payment limits error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment limits'
    });
  }
});

/**
 * @route GET /secure-payment/history
 * @description Get user's payment history
 * @access Private
 */
router.get('/history', authMiddleware, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const userId = req.user?.id;
    const { limit = 50, offset = 0 } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const history = await securePaymentService.getUserPaymentHistory(userId);
    const paginatedHistory = history.slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      success: true,
      history: paginatedHistory,
      total: history.length,
      limit: Number(limit),
      offset: Number(offset)
    });
  } catch (error: any) {
    logger.error('Payment history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment history'
    });
  }
});

/**
 * @route POST /secure-payment/fraud-check
 * @description Check if payment request is fraudulent
 * @access Private
 */
router.post('/fraud-check', authMiddleware, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { amount, currency, paymentMethod, description, metadata } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const paymentRequest = {
      userId,
      amount: parseFloat(amount),
      currency,
      paymentMethod,
      description,
      metadata: {
        ...metadata,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }
    };

    const fraudCheck = await securePaymentService.detectFraud(paymentRequest);

    res.json({
      success: true,
      fraudCheck
    });
  } catch (error: any) {
    logger.error('Fraud check error:', error);
    res.status(500).json({
      success: false,
      error: 'Fraud check failed'
    });
  }
});

export default router;

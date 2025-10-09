import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../config/logger';

const router = express.Router();

// Payout status enum
enum PayoutStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Payout method enum
enum PayoutMethod {
  BANK_TRANSFER = 'bank_transfer',
  PAYPAL = 'paypal',
  STRIPE = 'stripe'
}

// Minimum payout amount in coins
const MIN_PAYOUT_AMOUNT = parseInt(process.env.MIN_PAYOUT_AMOUNT || '1000');
const COINS_PER_USD = parseInt(process.env.COINS_PER_USD || '100');
const PAYOUT_FEE_PCT = parseFloat(process.env.PAYOUT_FEE_PCT || '0.05'); // 5%

/**
 * POST /api/v1/payouts/request
 * Create a payout request
 */
router.post('/request', [
  authMiddleware,
  body('amount').isInt({ min: MIN_PAYOUT_AMOUNT }).withMessage(`Minimum payout is ${MIN_PAYOUT_AMOUNT} coins`),
  body('method').isIn(Object.values(PayoutMethod)).withMessage('Invalid payout method'),
  body('details').isObject().withMessage('Payout details required'),
  body('details.accountName').optional().isString(),
  body('details.accountNumber').optional().isString(),
  body('details.bankName').optional().isString(),
  body('details.email').optional().isEmail()
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
    const { amount, method, details } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check KYC status
    if (user.kycStatus !== 'verified') {
      return res.status(403).json({
        success: false,
        error: 'KYC verification required for payouts',
        kycStatus: user.kycStatus
      });
    }

    // Check available balance
    const availableBalance = user.coins?.balance || 0;
    if (availableBalance < amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
        required: amount,
        available: availableBalance
      });
    }

    // Calculate fees and net amount
    const fees = Math.ceil(amount * PAYOUT_FEE_PCT);
    const netAmount = amount - fees;
    const usdAmount = netAmount / COINS_PER_USD;

    // Use MongoDB transaction for atomicity
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Deduct coins from user balance
      user.coins.balance -= amount;
      user.coins.totalSpent += amount;
      await user.save({ session });

      // Create payout transaction
      const transaction = new Transaction({
        userId,
        type: 'withdrawal',
        amount: -amount, // Negative for withdrawal
        currency: 'coins',
        status: 'pending',
        paymentMethod: method,
        description: `Payout request via ${method}`,
        metadata: {
          payoutMethod: method,
          payoutDetails: details,
          usdAmount: usdAmount.toFixed(2),
          requestedAt: new Date()
        },
        fees,
        netAmount: -netAmount
      });
      await transaction.save({ session });

      await session.commitTransaction();

      // Log for admin review
      logger.info(`Payout requested: ${transaction._id} - User: ${user.username} - Amount: ${amount} coins ($${usdAmount.toFixed(2)})`);

      res.status(201).json({
        success: true,
        message: 'Payout request submitted successfully',
        payout: {
          id: transaction._id,
          amount,
          fees,
          netAmount,
          usdAmount: usdAmount.toFixed(2),
          method,
          status: 'pending',
          requestedAt: transaction.createdAt
        },
        newBalance: user.coins.balance
      });
    } catch (txError) {
      await session.abortTransaction();
      throw txError;
    } finally {
      session.endSession();
    }
  } catch (error) {
    logger.error('Failed to create payout request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create payout request'
    });
  }
});

/**
 * GET /api/v1/payouts
 * Get user's payout history
 */
router.get('/', authMiddleware, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { limit = 20, page = 1, status } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const query: any = {
      userId: new mongoose.Types.ObjectId(userId),
      type: 'withdrawal'
    };

    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [payouts, total] = await Promise.all([
      Transaction.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string))
        .lean(),
      Transaction.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        payouts: payouts.map(p => ({
          id: p._id,
          amount: Math.abs(p.amount),
          fees: p.fees,
          netAmount: Math.abs(p.netAmount),
          usdAmount: p.metadata?.usdAmount,
          method: p.paymentMethod,
          status: p.status,
          details: p.metadata?.payoutDetails,
          requestedAt: p.createdAt,
          processedAt: p.updatedAt
        })),
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get payout history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payout history'
    });
  }
});

/**
 * GET /api/v1/payouts/:id
 * Get payout details by ID
 */
router.get('/:id', authMiddleware, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const payout = await Transaction.findOne({
      _id: id,
      userId: new mongoose.Types.ObjectId(userId),
      type: 'withdrawal'
    }).lean();

    if (!payout) {
      return res.status(404).json({
        success: false,
        error: 'Payout not found'
      });
    }

    res.json({
      success: true,
      data: {
        payout: {
          id: payout._id,
          amount: Math.abs(payout.amount),
          fees: payout.fees,
          netAmount: Math.abs(payout.netAmount),
          usdAmount: payout.metadata?.usdAmount,
          method: payout.paymentMethod,
          status: payout.status,
          details: payout.metadata?.payoutDetails,
          requestedAt: payout.createdAt,
          processedAt: payout.updatedAt,
          description: payout.description
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get payout details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payout details'
    });
  }
});

/**
 * POST /api/v1/payouts/:id/cancel
 * Cancel a pending payout request
 */
router.post('/:id/cancel', authMiddleware, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const payout = await Transaction.findOne({
        _id: id,
        userId: new mongoose.Types.ObjectId(userId),
        type: 'withdrawal'
      }).session(session);

      if (!payout) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          error: 'Payout not found'
        });
      }

      if (payout.status !== 'pending') {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          error: `Cannot cancel payout with status: ${payout.status}`
        });
      }

      // Refund coins to user
      const user = await User.findById(userId).session(session);
      if (!user) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const refundAmount = Math.abs(payout.amount);
      user.coins.balance += refundAmount;
      user.coins.totalSpent -= refundAmount;
      await user.save({ session });

      // Update payout status
      payout.status = 'cancelled';
      await payout.save({ session });

      await session.commitTransaction();

      res.json({
        success: true,
        message: 'Payout cancelled successfully',
        refundedAmount: refundAmount,
        newBalance: user.coins.balance
      });
    } catch (txError) {
      await session.abortTransaction();
      throw txError;
    } finally {
      session.endSession();
    }
  } catch (error) {
    logger.error('Failed to cancel payout:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel payout'
    });
  }
});

// ============= ADMIN ENDPOINTS =============

/**
 * GET /api/v1/payouts/admin/pending
 * Get all pending payouts (admin only)
 */
router.get('/admin/pending', authMiddleware, async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { limit = 50, page = 1 } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Check if user is admin
    const user = await User.findById(userId).select('role');
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [payouts, total] = await Promise.all([
      Transaction.find({
        type: 'withdrawal',
        status: 'pending'
      })
        .sort({ createdAt: 1 }) // Oldest first
        .skip(skip)
        .limit(parseInt(limit as string))
        .populate('userId', 'username email kycStatus')
        .lean(),
      Transaction.countDocuments({ type: 'withdrawal', status: 'pending' })
    ]);

    res.json({
      success: true,
      data: {
        payouts: payouts.map(p => ({
          id: p._id,
          user: p.userId,
          amount: Math.abs(p.amount),
          fees: p.fees,
          netAmount: Math.abs(p.netAmount),
          usdAmount: p.metadata?.usdAmount,
          method: p.paymentMethod,
          details: p.metadata?.payoutDetails,
          requestedAt: p.createdAt
        })),
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get pending payouts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pending payouts'
    });
  }
});

/**
 * POST /api/v1/payouts/admin/:id/approve
 * Approve a payout request (admin only)
 */
router.post('/admin/:id/approve', [
  authMiddleware,
  body('transactionId').optional().isString(),
  body('notes').optional().isString().isLength({ max: 500 })
], async (req: any, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { transactionId, notes } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Check if user is admin
    const admin = await User.findById(userId).select('role username');
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const payout = await Transaction.findOne({
      _id: id,
      type: 'withdrawal'
    });

    if (!payout) {
      return res.status(404).json({
        success: false,
        error: 'Payout not found'
      });
    }

    if (payout.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Cannot approve payout with status: ${payout.status}`
      });
    }

    // Update payout status
    payout.status = 'approved';
    payout.metadata = {
      ...payout.metadata,
      approvedBy: admin.username,
      approvedAt: new Date(),
      transactionId,
      notes
    };
    await payout.save();

    logger.info(`Payout approved: ${payout._id} by admin ${admin.username}`);

    res.json({
      success: true,
      message: 'Payout approved successfully',
      payout: {
        id: payout._id,
        status: payout.status,
        approvedBy: admin.username,
        approvedAt: payout.metadata.approvedAt
      }
    });
  } catch (error) {
    logger.error('Failed to approve payout:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve payout'
    });
  }
});

/**
 * POST /api/v1/payouts/admin/:id/reject
 * Reject a payout request and refund coins (admin only)
 */
router.post('/admin/:id/reject', [
  authMiddleware,
  body('reason').isString().isLength({ min: 1, max: 500 }).withMessage('Rejection reason required')
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
    const { id } = req.params;
    const { reason } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Check if user is admin
    const admin = await User.findById(userId).select('role username');
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const payout = await Transaction.findOne({
        _id: id,
        type: 'withdrawal'
      }).session(session);

      if (!payout) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          error: 'Payout not found'
        });
      }

      if (payout.status !== 'pending') {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          error: `Cannot reject payout with status: ${payout.status}`
        });
      }

      // Refund coins to user
      const user = await User.findById(payout.userId).session(session);
      if (!user) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const refundAmount = Math.abs(payout.amount);
      user.coins.balance += refundAmount;
      user.coins.totalSpent -= refundAmount;
      await user.save({ session });

      // Update payout status
      payout.status = 'rejected';
      payout.metadata = {
        ...payout.metadata,
        rejectedBy: admin.username,
        rejectedAt: new Date(),
        rejectionReason: reason
      };
      await payout.save({ session });

      await session.commitTransaction();

      logger.info(`Payout rejected: ${payout._id} by admin ${admin.username} - Reason: ${reason}`);

      res.json({
        success: true,
        message: 'Payout rejected and coins refunded',
        payout: {
          id: payout._id,
          status: payout.status,
          rejectedBy: admin.username,
          rejectedAt: payout.metadata.rejectedAt,
          reason
        },
        refundedAmount: refundAmount
      });
    } catch (txError) {
      await session.abortTransaction();
      throw txError;
    } finally {
      session.endSession();
    }
  } catch (error) {
    logger.error('Failed to reject payout:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject payout'
    });
  }
});

export default router;

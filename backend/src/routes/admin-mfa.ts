/**
 * Admin MFA Routes
 * Provides MFA setup and verification for admin users
 */

import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { 
  setupAdminMFA, 
  completeMFASetup, 
  verifyAdminMFA,
  requireAdmin,
  requireSuperAdmin,
  requireMFA
} from '../middleware/enhancedAdminRBAC';
import { adminLimiter } from '../middleware/enhancedRateLimiting';
import { logger } from '../config/logger';

const router = express.Router();

/**
 * POST /admin/mfa/setup
 * Setup MFA for admin user
 */
router.post('/setup', [
  requireAdmin,
  adminLimiter,
  body('userId')
    .optional()
    .isMongoId()
    .withMessage('Valid user ID is required')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const adminSession = (req as any).adminSession;
    const targetUserId = req.body.userId || adminSession.userId;

    // Only super admin can setup MFA for other users
    if (targetUserId !== adminSession.userId && adminSession.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Only super admin can setup MFA for other users'
      });
    }

    const result = await setupAdminMFA(targetUserId);

    res.json({
      success: true,
      message: 'MFA setup initiated',
      data: {
        secret: result.secret,
        qrCode: result.qrCode
      }
    });

  } catch (error) {
    logger.error('MFA setup failed:', error);
    res.status(500).json({
      success: false,
      error: 'MFA setup failed'
    });
  }
});

/**
 * POST /admin/mfa/complete
 * Complete MFA setup
 */
router.post('/complete', [
  requireAdmin,
  adminLimiter,
  body('token')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Valid 6-digit token is required')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { token } = req.body;
    const adminSession = (req as any).adminSession;

    const success = await completeMFASetup(adminSession.userId, token);

    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token or setup expired'
      });
    }

    res.json({
      success: true,
      message: 'MFA setup completed successfully'
    });

  } catch (error) {
    logger.error('MFA completion failed:', error);
    res.status(500).json({
      success: false,
      error: 'MFA completion failed'
    });
  }
});

/**
 * POST /admin/mfa/verify
 * Verify MFA token
 */
router.post('/verify', [
  requireAdmin,
  adminLimiter,
  body('token')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Valid 6-digit token is required')
], verifyAdminMFA);

/**
 * POST /admin/mfa/disable
 * Disable MFA for admin user
 */
router.post('/disable', [
  requireSuperAdmin,
  requireMFA,
  adminLimiter,
  body('userId')
    .isMongoId()
    .withMessage('Valid user ID is required')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { userId } = req.body;
    const adminSession = (req as any).adminSession;

    // Update user to disable MFA
    await require('mongoose').model('User').findByIdAndUpdate(userId, {
      mfaEnabled: false,
      mfaSecret: null
    });

    // Revoke admin session if disabling own MFA
    if (userId === adminSession.userId) {
      await require('../middleware/enhancedAdminRBAC').revokeAdminSession(userId);
    }

    logger.info(`MFA disabled for admin user: ${userId} by ${adminSession.userId}`);

    res.json({
      success: true,
      message: 'MFA disabled successfully'
    });

  } catch (error) {
    logger.error('MFA disable failed:', error);
    res.status(500).json({
      success: false,
      error: 'MFA disable failed'
    });
  }
});

/**
 * GET /admin/mfa/status
 * Get MFA status for admin user
 */
router.get('/status', [
  requireAdmin,
  adminLimiter
], async (req: Request, res: Response) => {
  try {
    const adminSession = (req as any).adminSession;

    const user = await require('mongoose').model('User').findById(adminSession.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        mfaEnabled: user.mfaEnabled || false,
        mfaVerified: adminSession.mfaVerified || false,
        mfaVerifiedAt: adminSession.mfaVerifiedAt
      }
    });

  } catch (error) {
    logger.error('MFA status check failed:', error);
    res.status(500).json({
      success: false,
      error: 'MFA status check failed'
    });
  }
});

export default router;

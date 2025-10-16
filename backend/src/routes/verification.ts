/**
 * Enhanced Verification Routes
 * Provides email and SMS verification endpoints with rate limiting
 */

import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { verificationService } from '../services/enhancedVerificationService';
import { passwordResetLimiter } from '../middleware/enhancedRateLimiting';
import { logger } from '../config/logger';

const router = express.Router();

/**
 * POST /verify/email/generate
 * Generate email verification token
 */
router.post('/email/generate', [
  passwordResetLimiter,
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
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

    const { email, userId } = req.body;

    // Check if already verified
    const isVerified = await verificationService.isEmailVerified(email);
    if (isVerified) {
      return res.status(400).json({
        success: false,
        error: 'Email is already verified'
      });
    }

    const token = await verificationService.generateEmailVerificationToken(email, userId);

    res.json({
      success: true,
      message: 'Verification email sent',
      data: {
        token // In production, don't return token - send via email
      }
    });

  } catch (error) {
    logger.error('Email verification generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate verification email'
    });
  }
});

/**
 * POST /verify/email/confirm
 * Verify email token
 */
router.post('/email/confirm', [
  passwordResetLimiter,
  body('token')
    .notEmpty()
    .withMessage('Verification token is required')
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

    const result = await verificationService.verifyEmailToken(token);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Email verified successfully',
      data: {
        email: result.email,
        userId: result.userId
      }
    });

  } catch (error) {
    logger.error('Email verification failed:', error);
    res.status(500).json({
      success: false,
      error: 'Email verification failed'
    });
  }
});

/**
 * POST /verify/email/resend
 * Resend email verification
 */
router.post('/email/resend', [
  passwordResetLimiter,
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
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

    const { email, userId } = req.body;

    const result = await verificationService.resendEmailVerification(email, userId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Verification email resent successfully'
    });

  } catch (error) {
    logger.error('Email resend failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend verification email'
    });
  }
});

/**
 * POST /verify/sms/generate
 * Generate SMS verification code
 */
router.post('/sms/generate', [
  passwordResetLimiter,
  body('phoneNumber')
    .isMobilePhone('any')
    .withMessage('Valid phone number is required'),
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

    const { phoneNumber, userId } = req.body;

    // Check if already verified
    const isVerified = await verificationService.isPhoneVerified(phoneNumber);
    if (isVerified) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is already verified'
      });
    }

    const code = await verificationService.generateSMSVerificationCode(phoneNumber, userId);

    res.json({
      success: true,
      message: 'Verification code sent',
      data: {
        code // In production, don't return code - send via SMS
      }
    });

  } catch (error) {
    logger.error('SMS verification generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate verification code'
    });
  }
});

/**
 * POST /verify/sms/confirm
 * Verify SMS code
 */
router.post('/sms/confirm', [
  passwordResetLimiter,
  body('phoneNumber')
    .isMobilePhone('any')
    .withMessage('Valid phone number is required'),
  body('code')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Valid 6-digit code is required')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { phoneNumber, code } = req.body;

    const result = await verificationService.verifySMSCode(phoneNumber, code);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Phone number verified successfully',
      data: {
        userId: result.userId
      }
    });

  } catch (error) {
    logger.error('SMS verification failed:', error);
    res.status(500).json({
      success: false,
      error: 'SMS verification failed'
    });
  }
});

/**
 * POST /verify/sms/resend
 * Resend SMS verification code
 */
router.post('/sms/resend', [
  passwordResetLimiter,
  body('phoneNumber')
    .isMobilePhone('any')
    .withMessage('Valid phone number is required'),
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

    const { phoneNumber, userId } = req.body;

    const result = await verificationService.resendSMSVerification(phoneNumber, userId);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      message: 'Verification code resent successfully'
    });

  } catch (error) {
    logger.error('SMS resend failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend verification code'
    });
  }
});

/**
 * GET /verify/status
 * Check verification status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const { email, phoneNumber } = req.query;

    if (!email && !phoneNumber) {
      return res.status(400).json({
        success: false,
        error: 'Email or phone number is required'
      });
    }

    const status: any = {};

    if (email) {
      status.emailVerified = await verificationService.isEmailVerified(email as string);
    }

    if (phoneNumber) {
      status.phoneVerified = await verificationService.isPhoneVerified(phoneNumber as string);
    }

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Verification status check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check verification status'
    });
  }
});

export default router;

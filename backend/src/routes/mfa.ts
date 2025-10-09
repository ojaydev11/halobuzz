import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '@/models/User';
import { MFAService, CryptographicSecurity, SecureDesign, SecurityLogging } from '@/middleware/enhancedSecurity';
import { logger } from '@/config/logger';
import { getCache, setCache } from '@/config/redis';
import { authMiddleware } from '@/middleware/auth';
import { socialLimiter } from '@/middleware/security';
import QRCode from 'qrcode';

const router = Router();

// Apply authentication and rate limiting to all routes
router.use(authMiddleware);
router.use(socialLimiter);

/**
 * Multi-Factor Authentication Routes
 * Implements TOTP-based MFA with backup codes
 */

interface MFARequestUser {
  userId: string;
  email: string;
  mfaEnabled?: boolean;
}

interface MFARequest extends Request {
  user?: MFARequestUser;
}

// Enable MFA for user
router.post('/enable', async (req: MFARequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { password } = req.body as { password: string };
    const userId = req.user?.userId;

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

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid password'
      });
    }

    // Generate MFA secret
    const secret = MFAService.generateSecret();
    const qrCodeUrl = await QRCode.toDataURL(MFAService.getQRCodeUrl(user.email, secret));

    // Store secret temporarily (will be confirmed after verification)
    await setCache(`mfa_setup:${userId}`, secret, 300); // 5 minutes

    return res.json({
      success: true,
      data: {
        secret,
        qrCodeUrl,
        backupCodes: MFAService.generateBackupCodes()
      }
    });
  } catch (error) {
    logger.error('Error enabling MFA:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to enable MFA'
    });
  }
});

// Verify MFA setup
router.post('/verify-setup', async (req: MFARequest, res: Response) => {
  try {
    const { token, backupCode } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const secret = await getCache(`mfa_setup:${userId}`) as string | null;
    if (!secret) {
      return res.status(400).json({
        success: false,
        error: 'MFA setup session expired'
      });
    }

    let isValid = false;
    if (token) {
      isValid = MFAService.verifyToken(secret as string, token);
    } else if (backupCode) {
      isValid = MFAService.verifyBackupCode(backupCode);
    }

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification code'
      });
    }

    // Enable MFA for user
    await User.findByIdAndUpdate(userId, {
      mfaEnabled: true,
      mfaSecret: secret
    });

    // Clear temporary secret
    await setCache(`mfa_setup:${userId}`, '', 0);

    return res.json({
      success: true,
      message: 'MFA enabled successfully'
    });
  } catch (error) {
    logger.error('Error verifying MFA setup:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify MFA setup'
    });
  }
});

// Disable MFA
router.post('/disable', async (req: MFARequest, res: Response) => {
  try {
    const { password, token } = req.body;
    const userId = req.user?.userId;

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

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid password'
      });
    }

    // Verify MFA token if provided
    if (token && user.mfaSecret) {
      const isValidToken = MFAService.verifyToken(user.mfaSecret, token);
      if (!isValidToken) {
        return res.status(400).json({
          success: false,
          error: 'Invalid MFA token'
        });
      }
    }

    // Disable MFA
    await User.findByIdAndUpdate(userId, {
      mfaEnabled: false,
      mfaSecret: undefined
    });

    return res.json({
      success: true,
      message: 'MFA disabled successfully'
    });
  } catch (error) {
    logger.error('Error disabling MFA:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to disable MFA'
    });
  }
});

// Verify MFA token
router.post('/verify', async (req: MFARequest, res: Response) => {
  try {
    const { token } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const user = await User.findById(userId);
    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      return res.status(400).json({
        success: false,
        error: 'MFA not enabled'
      });
    }

    const isValid = MFAService.verifyToken(user.mfaSecret, token);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid MFA token'
      });
    }

    return res.json({
      success: true,
      message: 'MFA token verified successfully'
    });
  } catch (error) {
    logger.error('Error verifying MFA token:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify MFA token'
    });
  }
});

// Get MFA status
router.get('/status', async (req: MFARequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const user = await User.findById(userId).select('mfaEnabled');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    return res.json({
      success: true,
      data: {
        mfaEnabled: user.mfaEnabled || false
      }
    });
  } catch (error) {
    logger.error('Error getting MFA status:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get MFA status'
    });
  }
});

// Generate new backup codes
router.post('/backup-codes', async (req: MFARequest, res: Response) => {
  try {
    const { password } = req.body;
    const userId = req.user?.userId;

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

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid password'
      });
    }

    const backupCodes = MFAService.generateBackupCodes();

    return res.json({
      success: true,
      data: {
        backupCodes
      }
    });
  } catch (error) {
    logger.error('Error generating backup codes:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate backup codes'
    });
  }
});

export default router;
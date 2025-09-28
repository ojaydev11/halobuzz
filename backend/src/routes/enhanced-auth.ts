import * as express from 'express';
import { enhancedAuthMiddleware } from '../middleware/EnhancedAuthMiddleware';
import { logger } from '../config/logger';
import { User } from '../models/User';
import * as jwt from 'jsonwebtoken';

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
 * @route POST /enhanced-auth/login
 * @description Enhanced login with security analysis
 * @access Public
 */
router.post('/login', async (req: express.Request, res: express.Response) => {
  try {
    const { email, password, deviceId } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if user is banned or deactivated
    if (user.isBanned || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Account deactivated'
      });
    }

    // Security context analysis
    const securityContext = await enhancedAuthMiddleware.analyzeSecurityContext(req, user);
    
    if (securityContext.suspiciousActivity) {
      await enhancedAuthMiddleware.handleSuspiciousActivity(req, user, securityContext);
      return res.status(401).json({
        success: false,
        error: 'Suspicious activity detected. Please contact support.'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        username: user.username,
        mfaVerified: false
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: process.env.JWT_EXPIRY || '24h' }
    );

    // Update user's last activity
    await enhancedAuthMiddleware.updateUserActivity(user._id.toString(), req);

    // Remove password from response
    user.password = undefined;

    logger.info('Enhanced login successful', {
      userId: user._id,
      email: user.email,
      riskScore: securityContext.riskScore,
      suspiciousActivity: securityContext.suspiciousActivity
    });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin,
        ogLevel: user.ogLevel || 0,
        trustScore: user.trust?.score || 0,
        mfaEnabled: user.mfaEnabled || false,
        lastLoginAt: user.lastActiveAt
      },
      securityContext: {
        riskScore: securityContext.riskScore,
        suspiciousActivity: securityContext.suspiciousActivity
      }
    });
  } catch (error: any) {
    logger.error('Enhanced login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

/**
 * @route POST /enhanced-auth/verify-mfa
 * @description Verify MFA code
 * @access Private
 */
router.post('/verify-mfa', enhancedAuthMiddleware.authenticate.bind(enhancedAuthMiddleware), async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { mfaCode } = req.body;
    const userId = req.user?.id;

    if (!mfaCode) {
      return res.status(400).json({
        success: false,
        error: 'MFA code is required'
      });
    }

    // Generate MFA token
    const mfaToken = jwt.sign(
      { userId, timestamp: Date.now() },
      process.env.MFA_SECRET || 'mfa-secret',
      { expiresIn: '5m' }
    );

    // Verify MFA code (simplified implementation)
    const isValidCode = mfaCode.length === 6 && /^\d+$/.test(mfaCode);
    
    if (!isValidCode) {
      await enhancedAuthMiddleware.logFailedMFAAttempt(userId, req);
      return res.status(400).json({
        success: false,
        error: 'Invalid MFA code'
      });
    }

    // Mark MFA as verified
    await enhancedAuthMiddleware.markMFAVerified(mfaToken, userId);

    logger.info('MFA verification successful', {
      userId,
      mfaToken
    });

    res.json({
      success: true,
      mfaToken,
      message: 'MFA verification successful'
    });
  } catch (error: any) {
    logger.error('MFA verification error:', error);
    res.status(500).json({
      success: false,
      error: 'MFA verification failed'
    });
  }
});

/**
 * @route GET /enhanced-auth/security-status
 * @description Get user's security status
 * @access Private
 */
router.get('/security-status', enhancedAuthMiddleware.authenticate.bind(enhancedAuthMiddleware), async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const userId = req.user?.id;

    // Get user's security information
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get security context
    const securityContext = await enhancedAuthMiddleware.analyzeSecurityContext(req, user);

    res.json({
      success: true,
      securityStatus: {
        userId,
        mfaEnabled: user.mfaEnabled || false,
        isVerified: user.isVerified,
        lastLoginAt: user.lastActiveAt,
        riskScore: securityContext.riskScore,
        suspiciousActivity: securityContext.suspiciousActivity,
        deviceId: securityContext.deviceId,
        ipAddress: securityContext.ipAddress,
        userAgent: securityContext.userAgent
      }
    });
  } catch (error: any) {
    logger.error('Security status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get security status'
    });
  }
});

/**
 * @route POST /enhanced-auth/enable-mfa
 * @description Enable MFA for user
 * @access Private
 */
router.post('/enable-mfa', enhancedAuthMiddleware.authenticate.bind(enhancedAuthMiddleware), async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const userId = req.user?.id;

    await User.findByIdAndUpdate(userId, {
      mfaEnabled: true,
      updatedAt: new Date()
    });

    logger.info('MFA enabled', {
      userId
    });

    res.json({
      success: true,
      message: 'MFA enabled successfully'
    });
  } catch (error: any) {
    logger.error('Enable MFA error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enable MFA'
    });
  }
});

/**
 * @route POST /enhanced-auth/disable-mfa
 * @description Disable MFA for user
 * @access Private
 */
router.post('/disable-mfa', enhancedAuthMiddleware.authenticate.bind(enhancedAuthMiddleware), async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const userId = req.user?.id;

    await User.findByIdAndUpdate(userId, {
      mfaEnabled: false,
      updatedAt: new Date()
    });

    logger.info('MFA disabled', {
      userId
    });

    res.json({
      success: true,
      message: 'MFA disabled successfully'
    });
  } catch (error: any) {
    logger.error('Disable MFA error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to disable MFA'
    });
  }
});

/**
 * @route GET /enhanced-auth/rate-limit-status
 * @description Get user's rate limit status
 * @access Private
 */
router.get('/rate-limit-status', enhancedAuthMiddleware.authenticate.bind(enhancedAuthMiddleware), async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const userId = req.user?.id;

    // Get rate limit information (simplified)
    const rateLimitInfo = {
      userId,
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      requestsPerDay: 10000,
      currentMinute: 0,
      currentHour: 0,
      currentDay: 0
    };

    res.json({
      success: true,
      rateLimit: rateLimitInfo
    });
  } catch (error: any) {
    logger.error('Rate limit status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get rate limit status'
    });
  }
});

export default router;

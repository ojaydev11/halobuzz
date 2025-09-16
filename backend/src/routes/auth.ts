import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { AuthService } from '../services/authService';
import { User } from '../models/User';
import { logger } from '../config/logger';
import { AuthenticatedRequest } from '../middleware/auth';
import { InputValidator } from '../utils/inputValidator';

const router = express.Router();

// Register
router.post('/register', [
  body('username')
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-30 characters, alphanumeric and underscore only'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('phone')
    .optional()
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Valid phone number is required'),
  body('country')
    .isLength({ min: 2, max: 2 })
    .withMessage('Valid country code is required'),
  body('language')
    .isLength({ min: 2, max: 5 })
    .withMessage('Valid language code is required')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { username, email, password, phone, country, language } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }, { phone }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User already exists with this email, username, or phone'
      });
    }

    // Create user
    const user = new User({
      username,
      email,
      password,
      phone,
      country,
      language
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1h' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          country: user.country,
          language: user.language,
          isVerified: user.isVerified,
          kycStatus: user.kycStatus
        },
        token
      }
    });

  } catch (error) {
    logger.error('Registration failed:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

// Login
router.post('/login', [
  body('identifier')
    .notEmpty()
    .withMessage('Email, username, or phone is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { identifier, password } = req.body;

    // Find user by email, username, or phone with timeout handling
    let user;
    try {
      user = await User.findOne({
        $or: [
          { email: identifier },
          { username: identifier },
          { phone: identifier }
        ]
      }).maxTimeMS(5000); // 5 second timeout for user lookup
    } catch (dbError) {
      logger.error('Database error during user lookup:', dbError);
      return res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable. Please try again later.'
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if user is banned
    if (user.isBanned) {
      return res.status(403).json({
        success: false,
        error: 'Account is banned',
        banReason: user.banReason,
        banExpiresAt: user.banExpiresAt
      });
    }

    // Verify password with timeout handling
    let isValidPassword;
    try {
      isValidPassword = await user.comparePassword(password);
    } catch (dbError) {
      logger.error('Database error during password verification:', dbError);
      return res.status(503).json({
        success: false,
        error: 'Service temporarily unavailable. Please try again later.'
      });
    }

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Update last active with timeout handling
    try {
      user.lastActiveAt = new Date();
      await user.save();
    } catch (dbError) {
      logger.warn('Failed to update last active time:', dbError);
      // Continue with login even if this fails
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          country: user.country,
          language: user.language,
          isVerified: user.isVerified,
          kycStatus: user.kycStatus,
          ogLevel: user.ogLevel,
          coins: user.coins,
          trust: user.trust
        },
        token
      }
    });

  } catch (error) {
    logger.error('Login failed:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// KYC Submission
router.post('/kyc', [
  body('idCard')
    .notEmpty()
    .withMessage('ID card image is required'),
  body('selfie')
    .notEmpty()
    .withMessage('Selfie image is required')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { idCard, selfie } = req.body;
    const userId = (req as any).user?.userId; // From auth middleware

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

    // Update KYC documents
    user.kycDocuments = {
      idCard,
      selfie,
      verificationDate: new Date()
    };
    user.kycStatus = 'pending';
    await user.save();

    res.json({
      success: true,
      message: 'KYC documents submitted successfully',
      data: {
        kycStatus: user.kycStatus
      }
    });

  } catch (error) {
    logger.error('KYC submission failed:', error);
    res.status(500).json({
      success: false,
      error: 'KYC submission failed'
    });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const userId = (req as any).user?.userId; // From auth middleware

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          avatar: user.avatar,
          bio: user.bio,
          country: user.country,
          language: user.language,
          isVerified: user.isVerified,
          kycStatus: user.kycStatus,
          ogLevel: user.ogLevel,
          coins: user.coins,
          trust: user.trust,
          followers: user.followers,
          following: user.following,
          totalLikes: user.totalLikes,
          totalViews: user.totalViews,
          preferences: user.preferences,
          lastActiveAt: user.lastActiveAt,
          createdAt: user.createdAt
        }
      }
    });

  } catch (error) {
    logger.error('Get user profile failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile'
    });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token is required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    // Generate new token
    const newToken = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      data: {
        token: newToken
      }
    });

  } catch (error) {
    logger.error('Token refresh failed:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    // In a real implementation, you might want to blacklist the token
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout failed:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

export default router;

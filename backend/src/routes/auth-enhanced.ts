/**
 * Enhanced Authentication Routes with Session Management
 * Provides secure login/logout with session revocation support
 */

import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { SessionManager } from '../middleware/sessionManager';
import { User } from '../models/User';
import { logger } from '../config/logger';
import { AuthenticatedRequest } from '../middleware/auth';
import { InputValidator } from '../utils/inputValidator';
import { EmailService } from '../services/emailService';
import rateLimit from 'express-rate-limit';
import { getCache, setCache } from '../config/redis';

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 login attempts per window
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Enhanced login with session management
router.post('/login', [
  loginLimiter,
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
    const deviceId = req.header('X-Device-ID') || 'unknown';
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    // Find user by email, username, or phone
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { username: identifier },
        { phone: identifier }
      ]
    }).maxTimeMS(5000);

    if (!user) {
      logger.warn(`Login attempt with invalid identifier: ${identifier}`, {
        ip: ipAddress,
        userAgent: userAgent.substring(0, 100)
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if user is banned
    if (user.isBanned) {
      logger.warn(`Login attempt by banned user: ${user.email}`, {
        userId: user._id,
        ip: ipAddress,
        banReason: user.banReason
      });
      return res.status(403).json({
        success: false,
        error: 'Account is banned',
        banReason: user.banReason,
        banExpiresAt: user.banExpiresAt
      });
    }

    // Verify password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      logger.warn(`Invalid password attempt for user: ${user.email}`, {
        userId: user._id,
        ip: ipAddress
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Revoke all existing sessions for security
    await SessionManager.revokeAllUserSessions(user._id.toString(), 'New login');

    // Create new session
    const { accessToken, refreshToken, sessionId } = await SessionManager.createSession(
      user._id.toString(),
      user.email,
      user.role || 'user',
      deviceId,
      ipAddress,
      userAgent
    );

    // Update user's last login
    await User.findByIdAndUpdate(user._id, {
      lastLoginAt: new Date(),
      lastActiveAt: new Date()
    });

    logger.info(`User logged in successfully: ${user.email}`, {
      userId: user._id,
      sessionId,
      deviceId,
      ip: ipAddress
    });

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
          trust: user.trust,
          role: user.role
        },
        token: accessToken,
        refreshToken: refreshToken,
        sessionId: sessionId
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

// Enhanced logout with session revocation
router.post('/logout', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token required for logout'
      });
    }

    // Extract session ID from token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    if (decoded.sessionId) {
      // Revoke specific session
      await SessionManager.revokeSession(decoded.sessionId, 'User logout');
      
      logger.info(`Session revoked during logout: ${decoded.sessionId}`, {
        userId: decoded.userId
      });
    }

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

// Logout from all devices
router.post('/logout-all', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token required for logout'
      });
    }

    // Extract user ID from token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Revoke all sessions for user
    const revokedCount = await SessionManager.revokeAllUserSessions(decoded.userId, 'Logout all devices');
    
    logger.info(`All sessions revoked for user: ${decoded.userId}`, {
      userId: decoded.userId,
      revokedCount
    });

    res.json({
      success: true,
      message: 'Logged out from all devices',
      data: {
        revokedSessions: revokedCount
      }
    });

  } catch (error) {
    logger.error('Logout all failed:', error);
    res.status(500).json({
      success: false,
      error: 'Logout all failed'
    });
  }
});

// Refresh token with session rotation
router.post('/refresh', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const refreshToken = req.header('X-Refresh-Token');
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token required'
      });
    }

    // Verify refresh token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }

    // Refresh session and get new tokens
    const newTokens = await SessionManager.refreshSession(decoded.sessionId);
    
    if (!newTokens) {
      return res.status(401).json({
        success: false,
        error: 'Session expired or invalid'
      });
    }

    logger.info(`Tokens refreshed for session: ${decoded.sessionId}`, {
      userId: decoded.userId
    });

    res.json({
      success: true,
      data: {
        token: newTokens.accessToken,
        refreshToken: newTokens.refreshToken
      }
    });

  } catch (error) {
    logger.error('Token refresh failed:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid or expired refresh token'
    });
  }
});

// Get active sessions
router.get('/sessions', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token required'
      });
    }

    // Extract user ID from token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Get user's active sessions
    const sessions = await SessionManager.getUserSessions(decoded.userId);
    
    // Sanitize session data for response
    const sanitizedSessions = sessions.map(session => ({
      sessionId: session.sessionId,
      deviceId: session.deviceId,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      isCurrent: session.sessionId === decoded.sessionId
    }));

    res.json({
      success: true,
      data: {
        sessions: sanitizedSessions
      }
    });

  } catch (error) {
    logger.error('Get sessions failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sessions'
    });
  }
});

// Revoke specific session
router.delete('/sessions/:sessionId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token required'
      });
    }

    // Extract user ID from token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Verify user owns this session
    const sessions = await SessionManager.getUserSessions(decoded.userId);
    const sessionExists = sessions.some(s => s.sessionId === sessionId);
    
    if (!sessionExists) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Revoke session
    const revoked = await SessionManager.revokeSession(sessionId, 'Manual revocation');
    
    if (!revoked) {
      return res.status(500).json({
        success: false,
        error: 'Failed to revoke session'
      });
    }

    logger.info(`Session manually revoked: ${sessionId}`, {
      userId: decoded.userId,
      revokedBy: decoded.userId
    });

    res.json({
      success: true,
      message: 'Session revoked successfully'
    });

  } catch (error) {
    logger.error('Revoke session failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke session'
    });
  }
});

// Enhanced registration with session creation
router.post('/register', [
  authLimiter,
  body('username')
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('country')
    .optional()
    .isLength({ min: 2, max: 2 })
    .withMessage('Country must be a 2-letter code'),
  body('language')
    .optional()
    .isLength({ min: 2, max: 5 })
    .withMessage('Language must be a valid language code')
], async (req: AuthenticatedRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { username, email, password, country, language } = req.body;
    const deviceId = req.header('X-Device-ID') || 'unknown';
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: username.toLowerCase() }
      ]
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email or username already exists'
      });
    }

    // Create new user
    const user = new User({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      country: country || 'NP',
      language: language || 'en',
      isVerified: false,
      kycStatus: 'not_submitted',
      role: 'user'
    });

    await user.save();

    // Create session
    const { accessToken, refreshToken, sessionId } = await SessionManager.createSession(
      user._id.toString(),
      user.email,
      user.role,
      deviceId,
      ipAddress,
      userAgent
    );

    // Send verification email
    try {
      await EmailService.sendVerificationEmail(user.email, user._id.toString());
    } catch (emailError) {
      logger.warn('Failed to send verification email:', emailError);
    }

    logger.info(`User registered successfully: ${user.email}`, {
      userId: user._id,
      sessionId,
      deviceId,
      ip: ipAddress
    });

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
          kycStatus: user.kycStatus,
          role: user.role
        },
        token: accessToken,
        refreshToken: refreshToken,
        sessionId: sessionId
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

export default router;

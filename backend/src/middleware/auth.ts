import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { logger } from '../config/logger';
import { getCache, setCache } from '../config/redis';
import { AuthUser } from '../types/express';

// Authenticated Request type
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

// Re-export for backward compatibility
export type { AuthUser };

interface SessionData {
  userId: string;
  email: string;
  role: string;
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Main authentication middleware
 */
export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Access denied. No token provided.' 
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Check if user still exists and is not banned
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token. User not found.' 
      });
    }

    if (user.isBanned) {
      return res.status(403).json({ 
        success: false, 
        error: 'Account is banned.' 
      });
    }

    // Check session validity
    const sessionValid = await validateSession(decoded.userId, req);
    if (!sessionValid) {
      return res.status(401).json({ 
        success: false, 
        error: 'Session expired or invalid.' 
      });
    }

    // Update last active
    await User.findByIdAndUpdate(decoded.userId, {
      lastActiveAt: new Date()
    });

    req.user = {
      userId: user._id.toString(),
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      ogLevel: user.ogLevel || 0,
      isVerified: user.isVerified,
      isBanned: user.isBanned,
      isAdmin: user.isAdmin || user.role === 'admin',
      roles: user.role ? [user.role] : ['user'],
      mfaEnabled: user.mfaEnabled || false,
      mfaVerified: decoded.mfaVerified || false
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid token.' 
      });
    }
    
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ 
        success: false, 
        error: 'Token expired.' 
      });
    }

    return res.status(500).json({ 
      success: false, 
      error: 'Authentication failed.' 
    });
  }
};

/**
 * Refresh token middleware
 */
export const refreshTokenMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.header('X-Refresh-Token');
    
    if (!refreshToken) {
      return res.status(401).json({ 
        success: false, 
        error: 'Refresh token required.' 
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;
    
    // Check if refresh token is still valid
    const user = await User.findById(decoded.userId);
    if (!user || user.isBanned) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid refresh token.' 
      });
    }

    // Generate new access token
    const newAccessToken = jwt.sign(
      { userId: decoded.userId },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1h' }
    );

    res.set('X-New-Token', newAccessToken);
    next();
  } catch (error) {
    logger.error('Refresh token error:', error);
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid refresh token.' 
    });
  }
};

/**
 * MFA middleware
 */
export const mfaMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required.' 
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not found.' 
      });
    }

    // Check if MFA is enabled
    if (!user.mfaEnabled) {
      return next();
    }

    const mfaToken = req.header('X-TOTP-Token');
    if (!mfaToken) {
      return res.status(401).json({ 
        success: false, 
        error: 'MFA token required.' 
      });
    }

    // Verify TOTP token
    const speakeasy = require('speakeasy');
    const verified = speakeasy.totp.verify({
      secret: user.totpSecret!,
      encoding: 'base32',
      token: mfaToken,
      window: 2
    });

    if (!verified) {
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid MFA token.' 
      });
    }

    next();
  } catch (error) {
    logger.error('MFA verification error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'MFA verification failed.' 
    });
  }
};

/**
 * Admin middleware
 */
export const adminMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user || (!user.isAdmin && user.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required.'
      });
    }

    next();
  } catch (error) {
    logger.error('Admin middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authorization failed.'
    });
  }
};

/**
 * Device binding middleware
 */
export const deviceBindingMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required.' 
      });
    }

    const deviceId = req.header('X-Device-ID');
    if (!deviceId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Device ID required.' 
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: 'User not found.' 
      });
    }

    // Check if device is bound
    if (user.boundDevices && user.boundDevices.length > 0) {
      if (!user.boundDevices.includes(deviceId)) {
        return res.status(403).json({ 
          success: false, 
          error: 'Device not authorized.' 
        });
      }
    } else {
      // First time - bind device
      await User.findByIdAndUpdate(req.user.userId, {
        $addToSet: { boundDevices: deviceId }
      });
    }

    next();
  } catch (error) {
    logger.error('Device binding error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Device binding failed.' 
    });
  }
};

/**
 * Rate limiting middleware
 */
export const rateLimitMiddleware = (maxRequests: number = 100, windowMs: number = 900000) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = `rate_limit:${req.ip}:${req.path}`;
      const current = await getCache(key) as number | null;

      if (current && current >= maxRequests) {
        return res.status(429).json({
          success: false,
          error: 'Too many requests.'
        });
      }

      const count = current ? (current as number) + 1 : 1;
      await setCache(key, count, Math.ceil(windowMs / 1000));

      next();
    } catch (error) {
      logger.error('Rate limiting error:', error);
      next(); // Continue on error
    }
  };
};

/**
 * Validate session
 */
async function validateSession(userId: string, req: Request): Promise<boolean> {
  try {
    const sessionKey = `session:${userId}`;
    const session = await getCache(sessionKey) as SessionData;
    
    if (!session) {
      return false;
    }

    // Check if session is expired
    if (new Date() > new Date(session.expiresAt)) {
      await setCache(sessionKey, null, 0); // Delete expired session
      return false;
    }

    // Check device binding if enabled
    const deviceId = req.header('X-Device-ID');
    if (deviceId && session.deviceId !== deviceId) {
      return false;
    }

    // Check IP binding if enabled
    const ipAddress = req.ip || req.connection.remoteAddress;
    if (ipAddress && session.ipAddress !== ipAddress) {
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Session validation error:', error);
    return false;
  }
}

/**
 * Create session
 */
export async function createSession(userId: string, req: Request): Promise<string> {
  try {
    const sessionData: SessionData = {
      userId,
      email: '', // Will be populated
      role: 'user',
      deviceId: req.header('X-Device-ID') || '',
      ipAddress: req.ip || req.connection.remoteAddress || '',
      userAgent: req.header('User-Agent') || '',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    };

    const sessionKey = `session:${userId}`;
    await setCache(sessionKey, sessionData, 7 * 24 * 60 * 60); // 7 days

    return sessionKey;
  } catch (error) {
    logger.error('Session creation error:', error);
    throw error;
  }
}

/**
 * Destroy session
 */
export async function destroySession(userId: string): Promise<void> {
  try {
    const sessionKey = `session:${userId}`;
    await setCache(sessionKey, null, 0);
  } catch (error) {
    logger.error('Session destruction error:', error);
  }
}

/**
 * Alias for authMiddleware for backward compatibility
 */
export const authenticateToken = authMiddleware;
export const requireAuth = authMiddleware;

/**
 * Age verification middleware
 */
export const requireAgeVerification = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    // Check if user has verified their age
    const user = await User.findById(req.user.userId);
    if (!user || !user.ageVerified) {
      return res.status(403).json({
        success: false,
        error: 'Age verification required'
      });
    }

    next();
  } catch (error) {
    logger.error('Age verification error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};
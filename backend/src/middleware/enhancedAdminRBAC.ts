/**
 * Enhanced Admin RBAC with MFA
 * Provides comprehensive role-based access control with multi-factor authentication
 */

import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { logger } from '../config/logger';
import { getRedisClient } from '../config/redis';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

const redisClient = getRedisClient();

// Enhanced role hierarchy with more granular permissions
export const ENHANCED_ROLE_HIERARCHY = {
  'super_admin': 5,
  'admin': 4,
  'moderator': 3,
  'support': 2,
  'user': 1
} as const;

export const ENHANCED_PERMISSIONS = {
  // User management
  'users:read': ['support', 'moderator', 'admin', 'super_admin'],
  'users:write': ['moderator', 'admin', 'super_admin'],
  'users:delete': ['admin', 'super_admin'],
  'users:ban': ['moderator', 'admin', 'super_admin'],
  'users:unban': ['admin', 'super_admin'],
  
  // Admin management
  'admin:read': ['admin', 'super_admin'],
  'admin:write': ['admin', 'super_admin'],
  'admin:create': ['super_admin'],
  'admin:delete': ['super_admin'],
  'admin:promote': ['super_admin'],
  'admin:demote': ['super_admin'],
  
  // System management
  'system:read': ['admin', 'super_admin'],
  'system:write': ['super_admin'],
  'system:config': ['super_admin'],
  'system:maintenance': ['super_admin'],
  
  // Financial management
  'financial:read': ['admin', 'super_admin'],
  'financial:write': ['super_admin'],
  'financial:refund': ['admin', 'super_admin'],
  'financial:payout': ['super_admin'],
  
  // Content moderation
  'content:read': ['moderator', 'admin', 'super_admin'],
  'content:moderate': ['moderator', 'admin', 'super_admin'],
  'content:delete': ['admin', 'super_admin'],
  'content:ban': ['moderator', 'admin', 'super_admin'],
  
  // Analytics and reporting
  'analytics:read': ['admin', 'super_admin'],
  'analytics:export': ['super_admin'],
  'reports:generate': ['admin', 'super_admin'],
  
  // Security and audit
  'security:read': ['admin', 'super_admin'],
  'security:audit': ['super_admin'],
  'security:logs': ['admin', 'super_admin']
} as const;

interface AdminSession {
  userId: string;
  role: string;
  permissions: string[];
  mfaVerified: boolean;
  mfaVerifiedAt?: Date;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Enhanced admin authentication middleware
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check if user has admin role
    const adminRoles = ['admin', 'super_admin'];
    if (!adminRoles.includes(user.role)) {
      logger.warn(`Non-admin user attempted admin access: ${user.userId}`, {
        userId: user.userId,
        role: user.role,
        path: req.path,
        ip: req.ip
      });

      // Log unauthorized access attempt
      await AuditLog.create({
        userId: user.userId,
        action: 'unauthorized_admin_access',
        details: {
          path: req.path,
          method: req.method,
          userRole: user.role
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    // Check if admin session is valid
    const sessionKey = `admin_session:${user.userId}`;
    const sessionData = await redisClient.get(sessionKey);
    
    if (!sessionData) {
      return res.status(401).json({
        success: false,
        error: 'Admin session expired'
      });
    }

    const session: AdminSession = JSON.parse(sessionData);
    
    // Check session expiry
    if (new Date() > new Date(session.expiresAt)) {
      await redisClient.del(sessionKey);
      return res.status(401).json({
        success: false,
        error: 'Admin session expired'
      });
    }

    // Attach admin session to request
    (req as any).adminSession = session;
    next();

  } catch (error) {
    logger.error('Admin authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Admin authentication failed'
    });
  }
};

/**
 * Enhanced super admin authentication middleware
 */
export const requireSuperAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    
    if (!user || user.role !== 'super_admin') {
      logger.warn(`Non-super-admin user attempted super admin access: ${user?.userId}`, {
        userId: user?.userId,
        role: user?.role,
        path: req.path,
        ip: req.ip
      });

      // Log unauthorized access attempt
      if (user) {
        await AuditLog.create({
          userId: user.userId,
          action: 'unauthorized_super_admin_access',
          details: {
            path: req.path,
            method: req.method,
            userRole: user.role
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });
      }

      return res.status(403).json({
        success: false,
        error: 'Super admin access required'
      });
    }

    // Check MFA requirement for super admin
    const adminSession = (req as any).adminSession;
    if (!adminSession?.mfaVerified) {
      return res.status(403).json({
        success: false,
        error: 'MFA verification required for super admin access',
        requiresMFA: true
      });
    }

    next();

  } catch (error) {
    logger.error('Super admin authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Super admin authentication failed'
    });
  }
};

/**
 * Permission-based access control middleware
 */
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminSession = (req as any).adminSession;
      
      if (!adminSession) {
        return res.status(401).json({
          success: false,
          error: 'Admin session required'
        });
      }

      // Check if user has the required permission
      const allowedRoles = ENHANCED_PERMISSIONS[permission as keyof typeof ENHANCED_PERMISSIONS];
      if (!allowedRoles || !allowedRoles.includes(adminSession.role)) {
        logger.warn(`Insufficient permissions for ${permission}: ${adminSession.userId}`, {
          userId: adminSession.userId,
          role: adminSession.role,
          permission,
          path: req.path,
          ip: req.ip
        });

        // Log permission denied
        await AuditLog.create({
          userId: adminSession.userId,
          action: 'permission_denied',
          details: {
            permission,
            path: req.path,
            method: req.method,
            userRole: adminSession.role
          },
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });

        return res.status(403).json({
          success: false,
          error: `Permission '${permission}' required`
        });
      }

      next();

    } catch (error) {
      logger.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        error: 'Permission check failed'
      });
    }
  };
};

/**
 * MFA verification middleware
 */
export const requireMFA = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const adminSession = (req as any).adminSession;
    
    if (!adminSession) {
      return res.status(401).json({
        success: false,
        error: 'Admin session required'
      });
    }

    if (!adminSession.mfaVerified) {
      return res.status(403).json({
        success: false,
        error: 'MFA verification required',
        requiresMFA: true
      });
    }

    // Check MFA expiry (e.g., 30 minutes)
    const mfaExpiry = 30 * 60 * 1000; // 30 minutes
    if (adminSession.mfaVerifiedAt && 
        (Date.now() - new Date(adminSession.mfaVerifiedAt).getTime()) > mfaExpiry) {
      
      // MFA expired, require re-verification
      adminSession.mfaVerified = false;
      await redisClient.setex(
        `admin_session:${adminSession.userId}`,
        24 * 60 * 60, // 24 hours
        JSON.stringify(adminSession)
      );

      return res.status(403).json({
        success: false,
        error: 'MFA verification expired',
        requiresMFA: true
      });
    }

    next();

  } catch (error) {
    logger.error('MFA verification error:', error);
    res.status(500).json({
      success: false,
      error: 'MFA verification failed'
    });
  }
};

/**
 * Setup MFA for admin user
 */
export const setupAdminMFA = async (userId: string): Promise<{ secret: string; qrCode: string }> => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Generate MFA secret
    const secret = speakeasy.generateSecret({
      name: `HaloBuzz Admin (${user.email})`,
      issuer: 'HaloBuzz',
      length: 32
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    // Store secret temporarily (user needs to verify before saving)
    await redisClient.setex(
      `mfa_setup:${userId}`,
      10 * 60, // 10 minutes
      secret.base32
    );

    return {
      secret: secret.base32,
      qrCode
    };

  } catch (error) {
    logger.error('MFA setup failed:', error);
    throw error;
  }
};

/**
 * Verify MFA token
 */
export const verifyMFAToken = async (userId: string, token: string): Promise<boolean> => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.mfaSecret) {
      return false;
    }

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 2 // Allow 2 time steps (60 seconds) tolerance
    });

    return verified;

  } catch (error) {
    logger.error('MFA verification failed:', error);
    return false;
  }
};

/**
 * Complete MFA setup
 */
export const completeMFASetup = async (userId: string, token: string): Promise<boolean> => {
  try {
    // Get temporary secret
    const tempSecret = await redisClient.get(`mfa_setup:${userId}`);
    if (!tempSecret) {
      throw new Error('MFA setup session expired');
    }

    // Verify token with temporary secret
    const verified = speakeasy.totp.verify({
      secret: tempSecret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!verified) {
      return false;
    }

    // Save secret to user
    await User.findByIdAndUpdate(userId, {
      mfaSecret: tempSecret,
      mfaEnabled: true
    });

    // Clean up temporary secret
    await redisClient.del(`mfa_setup:${userId}`);

    logger.info(`MFA enabled for admin user: ${userId}`);
    return true;

  } catch (error) {
    logger.error('MFA setup completion failed:', error);
    return false;
  }
};

/**
 * Verify MFA and update admin session
 */
export const verifyAdminMFA = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;
    const adminSession = (req as any).adminSession;

    if (!adminSession) {
      return res.status(401).json({
        success: false,
        error: 'Admin session required'
      });
    }

    const verified = await verifyMFAToken(adminSession.userId, token);
    if (!verified) {
      return res.status(400).json({
        success: false,
        error: 'Invalid MFA token'
      });
    }

    // Update admin session with MFA verification
    adminSession.mfaVerified = true;
    adminSession.mfaVerifiedAt = new Date();

    await redisClient.setex(
      `admin_session:${adminSession.userId}`,
      24 * 60 * 60, // 24 hours
      JSON.stringify(adminSession)
    );

    // Log MFA verification
    await AuditLog.create({
      userId: adminSession.userId,
      action: 'mfa_verified',
      details: {
        path: req.path,
        method: req.method
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'MFA verified successfully'
    });

  } catch (error) {
    logger.error('MFA verification error:', error);
    res.status(500).json({
      success: false,
      error: 'MFA verification failed'
    });
  }
};

/**
 * Create admin session
 */
export const createAdminSession = async (
  userId: string,
  ipAddress: string,
  userAgent: string
): Promise<AdminSession> => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const sessionId = require('crypto').randomUUID();
    const session: AdminSession = {
      userId,
      role: user.role,
      permissions: ENHANCED_PERMISSIONS[`${user.role}:*` as keyof typeof ENHANCED_PERMISSIONS] || [],
      mfaVerified: false,
      sessionId,
      ipAddress,
      userAgent,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };

    await redisClient.setex(
      `admin_session:${userId}`,
      24 * 60 * 60, // 24 hours
      JSON.stringify(session)
    );

    logger.info(`Admin session created for user: ${userId}`);
    return session;

  } catch (error) {
    logger.error('Admin session creation failed:', error);
    throw error;
  }
};

/**
 * Revoke admin session
 */
export const revokeAdminSession = async (userId: string): Promise<void> => {
  try {
    await redisClient.del(`admin_session:${userId}`);
    logger.info(`Admin session revoked for user: ${userId}`);
  } catch (error) {
    logger.error('Admin session revocation failed:', error);
    throw error;
  }
};

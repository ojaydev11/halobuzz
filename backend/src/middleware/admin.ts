import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { setupLogger } from '@/config/logger';
import { User } from '@/models/User';
import { adminAuditService } from '@/services/AdminAuditService';
import { AuthUser } from '../types/express';

const logger = setupLogger();

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  session?: {
    csrfToken?: string;
    [key: string]: any;
  };
}

export const adminOnly = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Check admin email whitelist
    const adminEmailsEnv = process.env.ADMIN_EMAILS || '';
    const adminEmails = adminEmailsEnv
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);

    const isAdmin = adminEmails.includes((req.user.email || '').toLowerCase());

    if (!isAdmin) {
      logger.warn(`Admin access denied for user ${req.user.userId} (${req.user.email})`);
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    // Check if 2FA is required and verified
    if (process.env.ADMIN_TOTP_REQUIRED === 'true') {
      const totpToken = req.headers['x-totp-token'] as string;
      
      if (!totpToken) {
        res.status(403).json({ 
          error: '2FA required',
          message: 'TOTP token is required for admin access'
        });
        return;
      }

      // Verify TOTP token using speakeasy
      const user = await User.findById(req.user.userId).select('totpSecret');
      if (!user || !user.totpSecret) {
        res.status(403).json({ 
          error: '2FA not configured',
          message: 'TOTP not configured for this admin account'
        });
        return;
      }

      // Verify the TOTP token
      const isValidTOTP = speakeasy.totp.verify({
        secret: user.totpSecret,
        encoding: 'base32',
        token: totpToken,
        window: 2
      });

      if (!isValidTOTP) {
        logger.warn(`Invalid TOTP token for admin user ${req.user.userId}`);
        res.status(403).json({ 
          error: 'Invalid 2FA token',
          message: 'Invalid TOTP token provided'
        });
        return;
      }
    }

    // Mark user as admin for this request
    req.user.isAdmin = true;
    req.user.totpVerified = process.env.ADMIN_TOTP_REQUIRED === 'true';

    next();
  } catch (error) {
    logger.error('Admin RBAC error:', error);
    res.status(500).json({ error: 'RBAC error' });
  }
};

// CSRF protection for admin routes
export const requireCSRF = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    // Skip CSRF for GET requests
    if (req.method === 'GET') {
      next();
      return;
    }

    const csrfToken = req.headers['x-csrf-token'] as string;
    const sessionCSRFToken = req.session?.csrfToken;

    if (!csrfToken || !sessionCSRFToken) {
      res.status(403).json({ 
        error: 'CSRF token required',
        message: 'CSRF token is required for this operation'
      });
      return;
    }

    if (csrfToken !== sessionCSRFToken) {
      logger.warn(`CSRF token mismatch for admin user ${req.user?.userId}`);
      res.status(403).json({ 
        error: 'Invalid CSRF token',
        message: 'CSRF token does not match'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('CSRF validation error:', error);
    res.status(500).json({ error: 'CSRF validation error' });
  }
};

// Device binding middleware
export const requireDeviceBinding = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const deviceId = req.headers['x-device-id'] as string;
    
    if (!deviceId) {
      res.status(403).json({ 
        error: 'Device binding required',
        message: 'Device ID is required for admin access'
      });
      return;
    }

    // Check if device is bound to this admin user
    const user = await User.findById(req.user.userId).select('boundDevices');
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    if (process.env.ENABLE_DEVICE_BINDING === 'true') {
      if (!user.boundDevices || !user.boundDevices.includes(deviceId)) {
        res.status(403).json({ 
          error: 'Device not authorized',
          message: 'This device is not authorized for admin access'
        });
        return;
      }
    }

    next();
  } catch (error) {
    logger.error('Device binding error:', error);
    res.status(500).json({ error: 'Device binding error' });
  }
};

// IP pinning middleware (optional)
export const requireIPPinning = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (process.env.ENABLE_IP_PINNING === 'true') {
      const clientIP = req.ip;
      const allowedIPs = process.env.ADMIN_ALLOWED_IPS?.split(',') || [];

      if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
        logger.warn(`Admin access denied from IP ${clientIP} for user ${req.user.userId}`);
        res.status(403).json({ 
          error: 'IP not authorized',
          message: 'Access from this IP address is not authorized'
        });
        return;
      }
    }

    next();
  } catch (error) {
    logger.error('IP pinning error:', error);
    res.status(500).json({ error: 'IP pinning error' });
  }
};

// Admin audit middleware
export const auditAdminAction = (action: string, resource: string) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Check for suspicious activity
      const suspiciousCheck = await adminAuditService.checkSuspiciousActivity(
        req.user.userId,
        action,
        req
      );

      if (suspiciousCheck.suspicious) {
        logger.warn(`Suspicious admin activity detected: ${req.user.email} - ${suspiciousCheck.reason}`, {
          adminId: req.user.userId,
          action,
          resource,
          riskScore: suspiciousCheck.riskScore,
          ip: req.ip
        });

        // Log the suspicious activity
        await adminAuditService.logAction(
          req.user.userId,
          req.user.email,
          action,
          resource,
          req.params.id,
          { ...req.body, suspicious: true, riskScore: suspiciousCheck.riskScore },
          req,
          false,
          suspiciousCheck.reason
        );

        // Don't block the action, but log it for review
      }

      // Store original response methods
      const originalJson = res.json;
      const originalStatus = res.status;

      // Override response methods to capture the result
      res.status = function(code: number) {
        this.statusCode = code;
        return this;
      };

      res.json = function(data: any) {
        // Log the admin action
        const success = this.statusCode < 400;
        const error = success ? undefined : data.error || data.message;

        adminAuditService.logAction(
          req.user!.userId,
          req.user!.email,
          action,
          resource,
          req.params.id,
          req.body,
          req,
          success,
          error
        );

        // Call original method
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logger.error('Admin audit middleware error:', error);
      next();
    }
  };
};

// Admin session management middleware
export const manageAdminSession = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Check if this is a new session
    const sessionId = req.headers['x-session-id'] as string;
    if (!sessionId) {
      // Start new session
      const newSessionId = adminAuditService.startSession(req.user.userId, req.user.email, req);
      res.setHeader('X-Session-ID', newSessionId);
    }

    next();
  } catch (error) {
    logger.error('Admin session management error:', error);
    next();
  }
};



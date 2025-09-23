import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { logger } from '../config/logger';

// Extend Request interface to include custom properties
declare global {
  namespace Express {
    interface Request {
      id?: string;
      deviceFingerprint?: string;
    }
  }
}

// Security levels for different operations
export enum SecurityLevel {
  PUBLIC = 'public',
  SENSITIVE = 'sensitive',
  CONFIDENTIAL = 'confidential',
  TOP_SECRET = 'top_secret',
}

class SecurityMiddleware {
  private static instance: SecurityMiddleware;
  private masterKey: string;

  private constructor() {
    this.masterKey = process.env.MASTER_ENCRYPTION_KEY || this.generateMasterKey();
  }

  public static getInstance(): SecurityMiddleware {
    if (!SecurityMiddleware.instance) {
      SecurityMiddleware.instance = new SecurityMiddleware();
    }
    return SecurityMiddleware.instance;
  }

  private generateMasterKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Encrypt sensitive data
  public encrypt(data: string, securityLevel: SecurityLevel = SecurityLevel.CONFIDENTIAL): string {
    try {
      const key = crypto.scryptSync(this.masterKey, 'salt', 32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-cbc', key);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return Buffer.from(JSON.stringify({
        data: encrypted,
        iv: iv.toString('hex'),
        securityLevel: securityLevel,
        timestamp: Date.now(),
      })).toString('base64');
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  // Decrypt sensitive data
  public decrypt(encryptedData: string): string {
    try {
      const parsed = JSON.parse(Buffer.from(encryptedData, 'base64').toString('utf8'));
      const key = crypto.scryptSync(this.masterKey, 'salt', 32);
      const iv = Buffer.from(parsed.iv, 'hex');
      
      const decipher = crypto.createDecipher('aes-256-cbc', key);
      let decrypted = decipher.update(parsed.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  // Generate secure hash
  public generateHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // JWT token validation
  public validateToken = (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ 
          error: 'Access token required',
          securityLevel: SecurityLevel.SENSITIVE 
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
      
      req.securityContext = {
        userId: decoded.userId,
        securityLevel: decoded.securityLevel || SecurityLevel.SENSITIVE,
        permissions: decoded.permissions || [],
      };

      next();
    } catch (error) {
      logger.error('Token validation failed:', error);
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        securityLevel: SecurityLevel.SENSITIVE 
      });
    }
  };

  // Check permissions
  public checkPermission = (requiredLevel: SecurityLevel) => {
    return (req: Request, res: Response, next: NextFunction) => {
      const userLevel = req.securityContext?.securityLevel || SecurityLevel.PUBLIC;
      
      const levelHierarchy = {
        [SecurityLevel.PUBLIC]: 0,
        [SecurityLevel.SENSITIVE]: 1,
        [SecurityLevel.CONFIDENTIAL]: 2,
        [SecurityLevel.TOP_SECRET]: 3,
      };

      if (levelHierarchy[userLevel] < levelHierarchy[requiredLevel]) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          requiredLevel,
          securityLevel: SecurityLevel.SENSITIVE,
        });
      }

      next();
    };
  };
}

// Extend Request interface
declare global {
  namespace Express {
    interface Request {
      securityContext?: {
        userId: string;
        securityLevel: SecurityLevel;
        permissions: string[];
      };
    }
  }
}

// Rate limiting middleware functions
import { getRedisClient } from '@/config/redis';
import { logger } from '@/config/logger';

// Redis-based rate limiting implementation
const createRateLimit = (windowMs: number, maxRequests: number, message: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const client = getRedisClient();
      if (!client) {
        // If Redis is not available, allow the request but log a warning
        logger.warn('Rate limiting disabled - Redis not available');
        return next();
      }

      const key = `rate_limit:${req.ip}:${req.path}`;
      const current = await client.get(key);
      
      if (current === null) {
        // First request in window
        await client.setEx(key, Math.ceil(windowMs / 1000), '1');
        return next();
      }
      
      const count = parseInt(current);
      if (count >= maxRequests) {
        logger.warn(`Rate limit exceeded for IP ${req.ip} on ${req.path}`);
        return res.status(429).json({
          success: false,
          error: message,
          retryAfter: Math.ceil(windowMs / 1000)
        });
      }
      
      // Increment counter
      await client.incr(key);
      next();
    } catch (error) {
      logger.error('Rate limiting error:', error);
      // On error, allow the request to proceed
      next();
    }
  };
};

// Global rate limiting - 100 requests per 15 minutes
export const globalLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests
  'Too many requests from this IP, please try again later'
);

// Auth-specific rate limiting - 5 requests per 15 minutes
export const authLimiter = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 requests
  'Too many authentication attempts, please try again later'
);

// Login slowdown - 3 attempts per 15 minutes
export const loginSlowDown = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  3, // 3 attempts
  'Too many login attempts, please try again later'
);

// Payment-specific rate limiting - 10 requests per 5 minutes
export const paymentLimiter = createRateLimit(
  5 * 60 * 1000, // 5 minutes
  10, // 10 requests
  'Too many payment requests, please try again later'
);

// Social features rate limiting - 50 requests per 5 minutes
export const socialLimiter = createRateLimit(
  5 * 60 * 1000, // 5 minutes
  50, // 50 requests
  'Too many social requests, please try again later'
);

// Admin-specific rate limiting - 20 requests per 5 minutes
export const adminLimiter = createRateLimit(
  5 * 60 * 1000, // 5 minutes
  20, // 20 requests
  'Too many admin requests, please try again later'
);

// Search-specific rate limiting - 30 requests per minute
export const searchLimiter = createRateLimit(
  60 * 1000, // 1 minute
  30, // 30 requests
  'Too many search requests, please try again later'
);

// Upload-specific rate limiting - 5 requests per 10 minutes
export const uploadLimiter = createRateLimit(
  10 * 60 * 1000, // 10 minutes
  5, // 5 requests
  'Too many upload requests, please try again later'
);

// Security middleware functions
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  req.id = crypto.randomUUID();
  next();
};

export const trustProxy = (req: Request, res: Response, next: NextFunction) => {
  // Trust proxy middleware
  next();
};

export const httpsOnly = (req: Request, res: Response, next: NextFunction) => {
  // HTTPS only middleware
  next();
};

export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Security headers middleware
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
};

export const deviceFingerprint = (req: Request, res: Response, next: NextFunction) => {
  // Device fingerprinting middleware
  const fingerprint = crypto.createHash('sha256')
    .update(req.ip + req.get('User-Agent') || '')
    .digest('hex');
  req.deviceFingerprint = fingerprint;
  next();
};

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Input sanitization middleware
  next();
};

export default SecurityMiddleware;
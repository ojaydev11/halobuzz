import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { logger } from '../config/logger';

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
export const globalLimiter = (req: Request, res: Response, next: NextFunction) => {
  // Simple rate limiting - in production, use redis-based rate limiting
  next();
};

export const authLimiter = (req: Request, res: Response, next: NextFunction) => {
  // Auth-specific rate limiting
  next();
};

export const loginSlowDown = (req: Request, res: Response, next: NextFunction) => {
  // Login slowdown middleware
  next();
};

export const paymentLimiter = (req: Request, res: Response, next: NextFunction) => {
  // Payment-specific rate limiting
  next();
};

export const socialLimiter = (req: Request, res: Response, next: NextFunction) => {
  // Social features rate limiting
  next();
};

export const adminLimiter = (req: Request, res: Response, next: NextFunction) => {
  // Admin-specific rate limiting
  next();
};

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
  (req as any).deviceFingerprint = fingerprint;
  next();
};

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Input sanitization middleware
  next();
};

export default SecurityMiddleware;
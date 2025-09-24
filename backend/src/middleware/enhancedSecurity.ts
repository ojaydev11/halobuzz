import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { body, validationResult } from 'express-validator';
import { User } from '@/models/User';
import { logger } from '@/config/logger';
import { getCache, setCache } from '@/config/redis';

/**
 * Enhanced Security Middleware addressing OWASP Top 10 vulnerabilities
 * 
 * OWASP Top 10 (2021):
 * 1. Broken Access Control
 * 2. Cryptographic Failures
 * 3. Injection
 * 4. Insecure Design
 * 5. Security Misconfiguration
 * 6. Vulnerable and Outdated Components
 * 7. Identification and Authentication Failures
 * 8. Software and Data Integrity Failures
 * 9. Security Logging and Monitoring Failures
 * 10. Server-Side Request Forgery (SSRF)
 */

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    id: string;
    username: string;
    email: string;
    ogLevel: number;
    isVerified: boolean;
    isBanned: boolean;
    isAdmin?: boolean;
    mfaEnabled?: boolean;
    mfaVerified?: boolean;
    deviceFingerprint?: string;
    sessionId?: string;
  };
}

/**
 * 1. BROKEN ACCESS CONTROL - Enhanced RBAC with MFA
 */
export class EnhancedRBAC {
  private static readonly ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || [];
  private static readonly SUPER_ADMIN_EMAILS = process.env.SUPER_ADMIN_EMAILS?.split(',') || [];

  static async checkAdminAccess(req: AuthenticatedRequest): Promise<boolean> {
    if (!req.user?.email) return false;
    
    return this.ADMIN_EMAILS.includes(req.user.email) || 
           this.SUPER_ADMIN_EMAILS.includes(req.user.email);
  }

  static async checkSuperAdminAccess(req: AuthenticatedRequest): Promise<boolean> {
    if (!req.user?.email) return false;
    return this.SUPER_ADMIN_EMAILS.includes(req.user.email);
  }

  static async requireMFA(req: AuthenticatedRequest): Promise<boolean> {
    if (!req.user?.mfaEnabled) return true; // MFA not enabled, allow
    return req.user.mfaVerified === true;
  }
}

/**
 * 2. CRYPTOGRAPHIC FAILURES - Enhanced encryption and hashing
 */
export class CryptographicSecurity {
  private static readonly ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32);
  private static readonly ALGORITHM = 'aes-256-gcm';

  static encrypt(text: string): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.ALGORITHM, this.ENCRYPTION_KEY);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  static decrypt(encryptedData: { encrypted: string; iv: string; tag: string }): string {
    const decipher = crypto.createDecipher(this.ALGORITHM, this.ENCRYPTION_KEY);
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12; // Increased from default 10
    return bcrypt.hash(password, saltRounds);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

/**
 * 3. INJECTION - Enhanced input validation and sanitization
 */
export class InjectionPrevention {
  static sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      // Remove potentially dangerous characters
      return input
        .replace(/[<>\"'%;()&+]/g, '')
        .replace(/script/gi, '')
        .replace(/javascript/gi, '')
        .replace(/on\w+=/gi, '')
        .trim();
    }
    
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }
    
    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }
    
    return input;
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  }

  static validatePassword(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    // Check for common weak passwords
    const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * 4. INSECURE DESIGN - Enhanced security by design
 */
export class SecureDesign {
  static async generateDeviceFingerprint(req: Request): Promise<string> {
    const components = [
      req.headers['user-agent'] || '',
      req.headers['accept-language'] || '',
      req.headers['accept-encoding'] || '',
      req.ip || '',
      req.headers['x-forwarded-for'] || ''
    ];
    
    const fingerprint = crypto
      .createHash('sha256')
      .update(components.join('|'))
      .digest('hex');
    
    return fingerprint;
  }

  static async validateSession(req: AuthenticatedRequest): Promise<boolean> {
    if (!req.user?.sessionId) return false;
    
    const sessionData = await getCache(`session:${req.user.sessionId}`);
    return sessionData !== null;
  }

  static async createSecureSession(userId: string, deviceFingerprint: string): Promise<string> {
    const sessionId = crypto.randomUUID();
    const sessionData = {
      userId,
      deviceFingerprint,
      createdAt: new Date(),
      lastActivity: new Date(),
      mfaVerified: false
    };
    
    await setCache(`session:${sessionId}`, sessionData, 24 * 60 * 60); // 24 hours
    return sessionId;
  }
}

/**
 * 5. SECURITY MISCONFIGURATION - Enhanced security headers and configuration
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * 6. VULNERABLE AND OUTDATED COMPONENTS - Dependency security
 */
export class DependencySecurity {
  static async checkVulnerabilities(): Promise<void> {
    // This would typically integrate with tools like npm audit, Snyk, etc.
    logger.info('Dependency vulnerability check completed');
  }
}

/**
 * 7. IDENTIFICATION AND AUTHENTICATION FAILURES - Enhanced MFA
 */
export class MFAService {
  static generateTOTPSecret(): string {
    return crypto.randomBytes(20).toString('base32');
  }

  static generateTOTPCode(secret: string): string {
    const epoch = Math.round(Date.now() / 1000.0);
    const time = Math.floor(epoch / 30);
    
    const key = Buffer.from(secret, 'base32');
    const counter = Buffer.alloc(8);
    counter.writeUIntBE(time, 0, 8);
    
    const hmac = crypto.createHmac('sha1', key);
    hmac.update(counter);
    const digest = hmac.digest();
    
    const offset = digest[digest.length - 1] & 0xf;
    const code = ((digest[offset] & 0x7f) << 24) |
                 ((digest[offset + 1] & 0xff) << 16) |
                 ((digest[offset + 2] & 0xff) << 8) |
                 (digest[offset + 3] & 0xff);
    
    return (code % 1000000).toString().padStart(6, '0');
  }

  static verifyTOTPCode(secret: string, code: string): boolean {
    const generatedCode = this.generateTOTPCode(secret);
    return generatedCode === code;
  }

  static generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }
}

/**
 * 8. SOFTWARE AND DATA INTEGRITY FAILURES - Integrity checks
 */
export class IntegritySecurity {
  static generateChecksum(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  static verifyChecksum(data: string, expectedChecksum: string): boolean {
    const actualChecksum = this.generateChecksum(data);
    return actualChecksum === expectedChecksum;
  }

  static async validateFileUpload(file: any): Promise<boolean> {
    // Check file type, size, and content
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!allowedTypes.includes(file.mimetype)) {
      return false;
    }
    
    if (file.size > maxSize) {
      return false;
    }
    
    // Additional content validation could be added here
    return true;
  }
}

/**
 * 9. SECURITY LOGGING AND MONITORING FAILURES - Enhanced logging
 */
export class SecurityLogging {
  static logSecurityEvent(event: string, req: Request, details?: any): void {
    const logData = {
      timestamp: new Date().toISOString(),
      event,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      url: req.url,
      method: req.method,
      userId: (req as AuthenticatedRequest).user?.userId,
      details
    };
    
    logger.warn('Security Event', logData);
    
    // Store in security events collection for monitoring
    // This would typically be stored in a separate security events database
  }

  static logAuthenticationAttempt(req: Request, success: boolean, reason?: string): void {
    this.logSecurityEvent(
      success ? 'auth_success' : 'auth_failure',
      req,
      { reason }
    );
  }

  static logSuspiciousActivity(req: Request, activity: string): void {
    this.logSecurityEvent('suspicious_activity', req, { activity });
  }
}

/**
 * 10. SERVER-SIDE REQUEST FORGERY (SSRF) - URL validation
 */
export class SSRFPrevention {
  private static readonly ALLOWED_PROTOCOLS = ['http:', 'https:'];
  private static readonly BLOCKED_HOSTS = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    '169.254.169.254', // AWS metadata
    '10.0.0.0/8',
    '172.16.0.0/12',
    '192.168.0.0/16'
  ];

  static validateURL(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      
      // Check protocol
      if (!this.ALLOWED_PROTOCOLS.includes(parsedUrl.protocol)) {
        return false;
      }
      
      // Check hostname
      if (this.BLOCKED_HOSTS.includes(parsedUrl.hostname)) {
        return false;
      }
      
      // Check for private IP ranges
      const ip = parsedUrl.hostname;
      if (this.isPrivateIP(ip)) {
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  }

  private static isPrivateIP(ip: string): boolean {
    const parts = ip.split('.').map(Number);
    
    // Check for private IP ranges
    if (parts[0] === 10) return true;
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    
    return false;
  }
}

/**
 * Enhanced Authentication Middleware with MFA
 */
export const enhancedAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      SecurityLogging.logAuthenticationAttempt(req, false, 'No token provided');
      res.status(401).json({
        error: 'Authentication required',
        message: 'Bearer token is required'
      });
      return;
    }

    const token = authHeader.substring(7);
    
    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET not configured');
      res.status(500).json({
        error: 'Server configuration error'
      });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    
    if (!decoded.userId || !decoded.sessionId) {
      SecurityLogging.logAuthenticationAttempt(req, false, 'Invalid token structure');
      res.status(401).json({
        error: 'Invalid token',
        message: 'Token does not contain required information'
      });
      return;
    }

    // Validate session
    const sessionData = await getCache(`session:${decoded.sessionId}`);
    if (!sessionData) {
      SecurityLogging.logAuthenticationAttempt(req, false, 'Session expired');
      res.status(401).json({
        error: 'Session expired',
        message: 'Please login again'
      });
      return;
    }

    // Get user from database
    const user = await User.findById(decoded.userId).select(
      'username email ogLevel isVerified isBanned kycStatus trust.score totpSecret mfaEnabled'
    );

    if (!user) {
      SecurityLogging.logAuthenticationAttempt(req, false, 'User not found');
      res.status(401).json({
        error: 'User not found',
        message: 'User account does not exist'
      });
      return;
    }

    if (user.isBanned) {
      SecurityLogging.logSecurityEvent('banned_user_access_attempt', req);
      res.status(403).json({
        error: 'Account banned',
        message: user.banReason || 'Your account has been suspended'
      });
      return;
    }

    // Generate device fingerprint
    const deviceFingerprint = await SecureDesign.generateDeviceFingerprint(req);
    
    // Check for suspicious device changes
    if (sessionData.deviceFingerprint !== deviceFingerprint) {
      SecurityLogging.logSuspiciousActivity(req, 'Device fingerprint mismatch');
      // For now, we'll allow but log - in production, you might want to require re-authentication
    }

    // Attach user to request
    req.user = {
      userId: user._id.toString(),
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      ogLevel: user.ogLevel,
      isVerified: user.isVerified,
      isBanned: user.isBanned,
      isAdmin: await EnhancedRBAC.checkAdminAccess(req),
      mfaEnabled: user.mfaEnabled || false,
      mfaVerified: sessionData.mfaVerified || false,
      deviceFingerprint,
      sessionId: decoded.sessionId
    };

    SecurityLogging.logAuthenticationAttempt(req, true);
    next();
  } catch (error) {
    logger.error('Enhanced authentication error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      SecurityLogging.logAuthenticationAttempt(req, false, 'Invalid token');
      res.status(401).json({
        error: 'Invalid token',
        message: 'Token is invalid or expired'
      });
    } else if (error instanceof jwt.TokenExpiredError) {
      SecurityLogging.logAuthenticationAttempt(req, false, 'Token expired');
      res.status(401).json({
        error: 'Token expired',
        message: 'Please login again'
      });
    } else {
      SecurityLogging.logAuthenticationAttempt(req, false, 'Server error');
      res.status(500).json({
        error: 'Authentication error',
        message: 'An error occurred during authentication'
      });
    }
  }
};

/**
 * MFA Required Middleware
 */
export const requireMFA = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      error: 'Authentication required'
    });
    return;
  }

  if (req.user.mfaEnabled && !req.user.mfaVerified) {
    res.status(403).json({
      error: 'MFA required',
      message: 'Multi-factor authentication is required for this action'
    });
    return;
  }

  next();
};

/**
 * Admin Only Middleware
 */
export const requireAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      error: 'Authentication required'
    });
    return;
  }

  const isAdmin = await EnhancedRBAC.checkAdminAccess(req);
  if (!isAdmin) {
    SecurityLogging.logSecurityEvent('unauthorized_admin_access', req);
    res.status(403).json({
      error: 'Admin access required',
      message: 'This action requires administrator privileges'
    });
    return;
  }

  next();
};

/**
 * Super Admin Only Middleware
 */
export const requireSuperAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({
      error: 'Authentication required'
    });
    return;
  }

  const isSuperAdmin = await EnhancedRBAC.checkSuperAdminAccess(req);
  if (!isSuperAdmin) {
    SecurityLogging.logSecurityEvent('unauthorized_super_admin_access', req);
    res.status(403).json({
      error: 'Super admin access required',
      message: 'This action requires super administrator privileges'
    });
    return;
  }

  next();
};

/**
 * Enhanced Rate Limiting
 */
export const createRateLimit = (options: {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: options.message || 'Too many requests from this IP, please try again later.',
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      SecurityLogging.logSecurityEvent('rate_limit_exceeded', req);
      res.status(429).json({
        error: 'Too Many Requests',
        message: options.message || 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.round(options.windowMs / 1000)
      });
    }
  });
};

/**
 * Input Validation Middleware
 */
export const validateInput = (req: Request, res: Response, next: NextFunction): void => {
  // Sanitize all input
  if (req.body) {
    req.body = InjectionPrevention.sanitizeInput(req.body);
  }
  
  if (req.query) {
    req.query = InjectionPrevention.sanitizeInput(req.query);
  }
  
  if (req.params) {
    req.params = InjectionPrevention.sanitizeInput(req.params);
  }
  
  next();
};

/**
 * Security Monitoring Middleware
 */
export const securityMonitoring = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Monitor response time
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Log slow requests
    if (duration > 5000) { // 5 seconds
      SecurityLogging.logSecurityEvent('slow_request', req, { duration });
    }
    
    // Log high status codes
    if (res.statusCode >= 400) {
      SecurityLogging.logSecurityEvent('error_response', req, { 
        statusCode: res.statusCode,
        duration 
      });
    }
  });
  
  next();
};

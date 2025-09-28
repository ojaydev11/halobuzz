import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { User } from '../models/User';
import { getCache, setCache } from '../config/redis';

interface AuthenticatedRequest extends Request {
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
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
}

interface MFAToken {
  userId: string;
  token: string;
  expiresAt: Date;
  verified: boolean;
}

interface SecurityContext {
  userId: string;
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  riskScore: number;
  suspiciousActivity: boolean;
}

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  operator: string;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldown: number;
}

interface Alert {
  id: string;
  ruleId: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export class EnhancedAuthMiddleware {
  private readonly logger = logger;
  private readonly jwtSecret: string;
  private readonly mfaSecret: string;
  private readonly lockoutDuration: number = 15 * 60 * 1000; // 15 minutes
  private readonly maxRequests: number = 100; // Max requests per window
  private readonly windowMs: number = 60 * 60 * 1000; // 1 hour
  private alertRules: Map<string, AlertRule> = new Map();
  private alerts: Alert[] = [];

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
    this.mfaSecret = process.env.MFA_SECRET || 'mfa-secret';
    this.initializeAlertRules();
  }

  /**
   * Main authentication middleware
   */
  async authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const token = this.extractToken(req);
      if (!token) {
        return this.sendUnauthorized(res, 'No token provided');
      }

      const decoded = await this.verifyToken(token);
      if (!decoded) {
        return this.sendUnauthorized(res, 'Invalid token');
      }

      const user = await this.getUserById(decoded.userId);
      if (!user) {
        return this.sendUnauthorized(res, 'User not found');
      }

      if (user.isBanned) {
        return this.sendUnauthorized(res, 'Account deactivated');
      }

      if (user.mfaEnabled && !decoded.mfaVerified) {
        return this.sendMFARequired(res, 'MFA verification required');
      }

      const securityContext = await this.analyzeSecurityContext(req, user);
      if (securityContext.suspiciousActivity) {
        await this.handleSuspiciousActivity(req, user, securityContext);
        return this.sendUnauthorized(res, 'Suspicious activity detected');
      }

      await this.updateUserActivity(user.id, req);

      req.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        isVerified: user.isVerified,
        isAdmin: user.role === 'admin' || user.role === 'super_admin',
        ogLevel: user.ogLevel || 0,
        trustScore: user.trust?.score || 0,
        mfaEnabled: user.mfaEnabled || false,
        lastLoginAt: user.lastActiveAt
      };

      next();
    } catch (error) {
      this.logger.error('Authentication error:', error);
      return this.sendUnauthorized(res, 'Authentication failed');
    }
  }

  /**
   * Require admin access
   */
  async requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    if (!req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    next();
  }

  /**
   * Require super admin access
   */
  async requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    if (!req.user || req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Super admin access required'
      });
    }
    next();
  }

  /**
   * Verify MFA token
   */
  async verifyMFA(token: string): Promise<boolean> {
    try {
      const decoded = jwt.verify(token, this.mfaSecret) as any;
      const cached = await getCache(`mfa_token:${token}`);
      return cached && cached.verified;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate JWT token
   */
  generateToken(payload: any): string {
    return jwt.sign(payload, this.jwtSecret, { expiresIn: '24h' });
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<any> {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      return null;
    }
  }

  /**
   * Rate limiting middleware
   */
  async rateLimit(req: Request, res: Response, next: NextFunction) {
    try {
      const key = `rate_limit:${req.ip}:${req.path}`;
      const current = await getCache(key) || 0;

      if (current >= this.maxRequests) {
        return res.status(429).json({
          success: false,
          error: 'Too many requests'
        });
      }

      await setCache(key, current + 1, Math.ceil(this.windowMs / 1000));
      next();
    } catch (error) {
      this.logger.error('Rate limiting error:', error);
      next();
    }
  }

  /**
   * Initialize alert rules
   */
  private initializeAlertRules() {
    const defaultRules: AlertRule[] = [
      {
        id: 'high_cpu',
        name: 'High CPU Usage',
        metric: 'cpu.usage',
        operator: '>',
        threshold: 80,
        severity: 'high',
        enabled: true,
        cooldown: 5
      },
      {
        id: 'high_memory',
        name: 'High Memory Usage',
        metric: 'memory.percentage',
        operator: '>',
        threshold: 85,
        severity: 'high',
        enabled: true,
        cooldown: 5
      },
      {
        id: 'high_disk',
        name: 'High Disk Usage',
        metric: 'disk.percentage',
        operator: '>',
        threshold: 90,
        severity: 'critical',
        enabled: true,
        cooldown: 10
      }
    ];

    defaultRules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });
  }

  /**
   * Extract token from request
   */
  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    return null;
  }

  /**
   * Get user by ID
   */
  private async getUserById(userId: string) {
    return await User.findById(userId).select('-password');
  }

  /**
   * Analyze security context
   */
  private async analyzeSecurityContext(req: Request, user: any): Promise<SecurityContext> {
    const deviceId = req.headers['x-device-id'] as string || 'unknown';
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    let riskScore = 0;
    let suspiciousActivity = false;

    // Check for unusual IP address
    const lastKnownIPs = await this.getUserLastKnownIPs(user.id);
    if (!lastKnownIPs.includes(ipAddress)) {
      riskScore += 20;
    }

    // Check for unusual device
    const lastKnownDevices = await this.getUserLastKnownDevices(user.id);
    if (!lastKnownDevices.includes(deviceId)) {
      riskScore += 15;
    }

    // Check for rapid requests
    const recentRequests = await this.getUserRecentRequests(user.id);
    if (recentRequests > 100) { // More than 100 requests in last hour
      riskScore += 25;
    }

    // Check for suspicious user agent
    if (this.isSuspiciousUserAgent(userAgent)) {
      riskScore += 30;
    }

    // Check for failed login attempts
    const failedAttempts = await this.getUserFailedAttempts(user.id);
    if (failedAttempts > 3) {
      riskScore += 40;
    }

    suspiciousActivity = riskScore >= 50;

    return {
      userId: user.id,
      deviceId,
      ipAddress,
      userAgent,
      timestamp: new Date(),
      riskScore,
      suspiciousActivity
    };
  }

  /**
   * Handle suspicious activity
   */
  private async handleSuspiciousActivity(req: Request, user: any, context: SecurityContext) {
    await setCache(`suspicious_activity:${user.id}:${Date.now()}`, {
      context,
      request: {
        path: req.path,
        method: req.method,
        headers: req.headers
      }
    }, 86400); // 24 hours

    // Log security event
    this.logger.warn('Suspicious activity detected', {
      userId: user.id,
      username: user.username,
      context
    });

    // Optionally lock account temporarily
    if (context.riskScore >= 80) {
      await this.temporarilyLockAccount(user.id);
    }
  }

  /**
   * Update user activity
   */
  private async updateUserActivity(userId: string, req: Request) {
    await User.findByIdAndUpdate(userId, {
      lastActiveAt: new Date(),
      lastLoginIP: req.ip,
      lastLoginDevice: req.headers['x-device-id']
    });
  }

  /**
   * Get user's last known IPs
   */
  private async getUserLastKnownIPs(userId: string): Promise<string[]> {
    const user = await User.findById(userId).select('lastLoginIP');
    return user?.lastLoginIP ? [user.lastLoginIP] : [];
  }

  /**
   * Get user's last known devices
   */
  private async getUserLastKnownDevices(userId: string): Promise<string[]> {
    const user = await User.findById(userId).select('lastLoginDevice');
    return user?.lastLoginDevice ? [user.lastLoginDevice] : [];
  }

  /**
   * Get user's recent requests
   */
  private async getUserRecentRequests(userId: string): Promise<number> {
    const key = `user_requests:${userId}`;
    return await getCache(key) || 0;
  }

  /**
   * Check if user agent is suspicious
   */
  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  /**
   * Get user's failed login attempts
   */
  private async getUserFailedAttempts(userId: string): Promise<number> {
    const key = `failed_attempts:${userId}`;
    return await getCache(key) || 0;
  }

  /**
   * Temporarily lock account
   */
  private async temporarilyLockAccount(userId: string) {
    await setCache(`account_locked:${userId}`, true, Math.ceil(this.lockoutDuration / 1000));
  }

  /**
   * Log failed MFA attempt
   */
  private async logFailedMFAAttempt(userId: string, req: Request) {
    await setCache(`mfa_failed:${userId}:${Date.now()}`, {
      userId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date()
    }, 3600); // 1 hour
  }

  /**
   * Mark MFA as verified
   */
  private async markMFAVerified(token: string, userId: string) {
    await setCache(`mfa_token:${token}`, {
      userId,
      token,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      verified: true
    }, 300); // 5 minutes
  }

  /**
   * Send unauthorized response
   */
  private sendUnauthorized(res: Response, message: string) {
    return res.status(401).json({
      success: false,
      error: message
    });
  }

  /**
   * Send MFA required response
   */
  private sendMFARequired(res: Response, message: string) {
    return res.status(202).json({
      success: false,
      error: message,
      requiresMFA: true
    });
  }
}

export const enhancedAuthMiddleware = new EnhancedAuthMiddleware();
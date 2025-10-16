/**
 * Enhanced Rate Limiting System
 * Provides comprehensive rate limiting with Redis backend and granular controls
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { getCache, setCache } from '../config/redis';
import { logger } from '../config/logger';
import crypto from 'crypto';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
}

interface RateLimitRule {
  name: string;
  config: RateLimitConfig;
  endpoints?: string[];
  methods?: string[];
  userTypes?: string[];
}

/**
 * Enhanced rate limiter with Redis backend
 */
export class EnhancedRateLimiter {
  private static instance: EnhancedRateLimiter;
  private rules: Map<string, RateLimitRule> = new Map();

  private constructor() {
    this.initializeDefaultRules();
  }

  static getInstance(): EnhancedRateLimiter {
    if (!EnhancedRateLimiter.instance) {
      EnhancedRateLimiter.instance = new EnhancedRateLimiter();
    }
    return EnhancedRateLimiter.instance;
  }

  /**
   * Create a rate limiter middleware
   */
  createLimiter(ruleName: string): (req: Request, res: Response, next: NextFunction) => void {
    const rule = this.rules.get(ruleName);
    if (!rule) {
      throw new Error(`Rate limit rule '${ruleName}' not found`);
    }

    return rateLimit({
      ...rule.config,
      store: new RedisStore(),
      keyGenerator: rule.config.keyGenerator || this.defaultKeyGenerator,
      skip: rule.config.skip || this.defaultSkip,
      handler: this.rateLimitHandler
    });
  }

  /**
   * Check rate limit manually
   */
  async checkRateLimit(
    key: string, 
    windowMs: number, 
    max: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
    try {
      const now = Date.now();
      const windowStart = Math.floor(now / windowMs) * windowMs;
      const redisKey = `rate_limit:${key}:${windowStart}`;
      
      const current = await getCache(redisKey) || 0;
      const remaining = Math.max(0, max - current);
      
      if (current >= max) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: new Date(windowStart + windowMs)
        };
      }

      // Increment counter
      await setCache(redisKey, current + 1, Math.ceil(windowMs / 1000));
      
      return {
        allowed: true,
        remaining: remaining - 1,
        resetTime: new Date(windowStart + windowMs)
      };
    } catch (error) {
      logger.error('Rate limit check failed:', error);
      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        remaining: max,
        resetTime: new Date(Date.now() + windowMs)
      };
    }
  }

  /**
   * Reset rate limit for a key
   */
  async resetRateLimit(key: string, windowMs: number): Promise<void> {
    try {
      const now = Date.now();
      const windowStart = Math.floor(now / windowMs) * windowMs;
      const redisKey = `rate_limit:${key}:${windowStart}`;
      
      await setCache(redisKey, 0, Math.ceil(windowMs / 1000));
    } catch (error) {
      logger.error('Rate limit reset failed:', error);
    }
  }

  /**
   * Get rate limit status for a key
   */
  async getRateLimitStatus(key: string, windowMs: number, max: number): Promise<any> {
    try {
      const now = Date.now();
      const windowStart = Math.floor(now / windowMs) * windowMs;
      const redisKey = `rate_limit:${key}:${windowStart}`;
      
      const current = await getCache(redisKey) || 0;
      const remaining = Math.max(0, max - current);
      
      return {
        current,
        remaining,
        max,
        resetTime: new Date(windowStart + windowMs),
        windowMs
      };
    } catch (error) {
      logger.error('Rate limit status check failed:', error);
      return null;
    }
  }

  /**
   * Default key generator
   */
  private defaultKeyGenerator = (req: Request): string => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userId = (req as any).user?.userId || 'anonymous';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    // Create a hash of the key components
    const keyData = `${ip}:${userId}:${userAgent}`;
    return crypto.createHash('sha256').update(keyData).digest('hex').substring(0, 16);
  };

  /**
   * Default skip function
   */
  private defaultSkip = (req: Request): boolean => {
    // Skip rate limiting for health checks
    if (req.path === '/healthz' || req.path.includes('/monitoring/health')) {
      return true;
    }
    
    // Skip for admin users in development
    if (process.env.NODE_ENV === 'development' && (req as any).user?.role === 'admin') {
      return true;
    }
    
    return false;
  };

  /**
   * Rate limit handler
   */
  private rateLimitHandler = (req: Request, res: Response): void => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userId = (req as any).user?.userId || 'anonymous';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    logger.warn('Rate limit exceeded', {
      ip,
      userId,
      userAgent,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    res.status(429).json({
      success: false,
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: res.get('Retry-After')
    });
  };

  /**
   * Initialize default rate limiting rules
   */
  private initializeDefaultRules(): void {
    // Global rate limiting
    this.addRule('global', {
      name: 'Global Rate Limit',
      config: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000, // 1000 requests per window
        message: 'Too many requests from this IP',
        standardHeaders: true,
        legacyHeaders: false
      }
    });

    // Authentication rate limiting
    this.addRule('auth', {
      name: 'Authentication Rate Limit',
      config: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // 5 auth attempts per window
        message: 'Too many authentication attempts',
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true
      }
    });

    // Login rate limiting (more restrictive)
    this.addRule('login', {
      name: 'Login Rate Limit',
      config: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 3, // 3 login attempts per window
        message: 'Too many login attempts',
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true
      }
    });

    // Password reset rate limiting
    this.addRule('password-reset', {
      name: 'Password Reset Rate Limit',
      config: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 3, // 3 password reset attempts per hour
        message: 'Too many password reset attempts',
        standardHeaders: true,
        legacyHeaders: false
      }
    });

    // Payment rate limiting
    this.addRule('payment', {
      name: 'Payment Rate Limit',
      config: {
        windowMs: 5 * 60 * 1000, // 5 minutes
        max: 10, // 10 payment attempts per 5 minutes
        message: 'Too many payment attempts',
        standardHeaders: true,
        legacyHeaders: false
      }
    });

    // File upload rate limiting
    this.addRule('upload', {
      name: 'File Upload Rate Limit',
      config: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10, // 10 uploads per 15 minutes
        message: 'Too many file uploads',
        standardHeaders: true,
        legacyHeaders: false
      }
    });

    // Social operations rate limiting
    this.addRule('social', {
      name: 'Social Operations Rate Limit',
      config: {
        windowMs: 60 * 1000, // 1 minute
        max: 60, // 60 social operations per minute
        message: 'Too many social operations',
        standardHeaders: true,
        legacyHeaders: false
      }
    });

    // Gaming operations rate limiting
    this.addRule('gaming', {
      name: 'Gaming Operations Rate Limit',
      config: {
        windowMs: 60 * 1000, // 1 minute
        max: 100, // 100 gaming operations per minute
        message: 'Too many gaming operations',
        standardHeaders: true,
        legacyHeaders: false
      }
    });

    // Admin operations rate limiting
    this.addRule('admin', {
      name: 'Admin Operations Rate Limit',
      config: {
        windowMs: 60 * 1000, // 1 minute
        max: 200, // 200 admin operations per minute
        message: 'Too many admin operations',
        standardHeaders: true,
        legacyHeaders: false
      }
    });

    // API key rate limiting (for external integrations)
    this.addRule('api-key', {
      name: 'API Key Rate Limit',
      config: {
        windowMs: 60 * 1000, // 1 minute
        max: 1000, // 1000 requests per minute
        message: 'API key rate limit exceeded',
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: (req: Request) => {
          const apiKey = req.header('X-API-Key') || 'unknown';
          return `api_key:${apiKey}`;
        }
      }
    });
  }

  /**
   * Add a new rate limiting rule
   */
  addRule(name: string, rule: RateLimitRule): void {
    this.rules.set(name, rule);
  }

  /**
   * Get all rate limiting rules
   */
  getRules(): RateLimitRule[] {
    return Array.from(this.rules.values());
  }
}

/**
 * Redis store for rate limiting
 */
class RedisStore {
  async increment(key: string, windowMs: number): Promise<{ totalHits: number; timeRemaining: number }> {
    try {
      const now = Date.now();
      const windowStart = Math.floor(now / windowMs) * windowMs;
      const redisKey = `rate_limit:${key}:${windowStart}`;
      
      const current = await getCache(redisKey) || 0;
      const newValue = current + 1;
      
      await setCache(redisKey, newValue, Math.ceil(windowMs / 1000));
      
      return {
        totalHits: newValue,
        timeRemaining: Math.ceil((windowStart + windowMs - now) / 1000)
      };
    } catch (error) {
      logger.error('Redis store increment failed:', error);
      // Fail open
      return { totalHits: 1, timeRemaining: Math.ceil(windowMs / 1000) };
    }
  }

  async decrement(key: string, windowMs: number): Promise<void> {
    try {
      const now = Date.now();
      const windowStart = Math.floor(now / windowMs) * windowMs;
      const redisKey = `rate_limit:${key}:${windowStart}`;
      
      const current = await getCache(redisKey) || 0;
      if (current > 0) {
        await setCache(redisKey, current - 1, Math.ceil(windowMs / 1000));
      }
    } catch (error) {
      logger.error('Redis store decrement failed:', error);
    }
  }

  async resetKey(key: string, windowMs: number): Promise<void> {
    try {
      const now = Date.now();
      const windowStart = Math.floor(now / windowMs) * windowMs;
      const redisKey = `rate_limit:${key}:${windowStart}`;
      
      await setCache(redisKey, 0, Math.ceil(windowMs / 1000));
    } catch (error) {
      logger.error('Redis store reset failed:', error);
    }
  }
}

// Export singleton instance
export const enhancedRateLimiter = EnhancedRateLimiter.getInstance();

// Export individual rate limiters
export const globalLimiter = enhancedRateLimiter.createLimiter('global');
export const authLimiter = enhancedRateLimiter.createLimiter('auth');
export const loginLimiter = enhancedRateLimiter.createLimiter('login');
export const passwordResetLimiter = enhancedRateLimiter.createLimiter('password-reset');
export const paymentLimiter = enhancedRateLimiter.createLimiter('payment');
export const uploadLimiter = enhancedRateLimiter.createLimiter('upload');
export const socialLimiter = enhancedRateLimiter.createLimiter('social');
export const gamingLimiter = enhancedRateLimiter.createLimiter('gaming');
export const adminLimiter = enhancedRateLimiter.createLimiter('admin');
export const apiKeyLimiter = enhancedRateLimiter.createLimiter('api-key');

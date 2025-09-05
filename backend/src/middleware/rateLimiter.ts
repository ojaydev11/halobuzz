import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import { logger } from '../config/logger';

// Create Redis client for rate limiting
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
  logger.error('Redis client error for rate limiting:', err);
});

// Connect Redis client
(async () => {
  try {
    await redisClient.connect();
    logger.info('Redis connected for rate limiting');
  } catch (error) {
    logger.error('Failed to connect Redis for rate limiting:', error);
  }
})();

/**
 * Create rate limiter with custom configuration
 */
export function rateLimiter(options: {
  windowMs?: number;
  max?: number;
  message?: string;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
} = {}): RateLimitRequestHandler {
  const {
    windowMs = 60000, // 1 minute default
    max = 60, // 60 requests per window default
    message = 'Too many requests from this IP, please try again later.',
    standardHeaders = true,
    legacyHeaders = false,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator
  } = options;

  return rateLimit({
    store: new RedisStore({
      client: redisClient as any,
      prefix: 'rl:',
    }),
    windowMs,
    max,
    message,
    standardHeaders,
    legacyHeaders,
    skipSuccessfulRequests,
    skipFailedRequests,
    keyGenerator: keyGenerator || ((req) => {
      // Use IP + user ID for authenticated requests
      const userId = (req as any).user?.userId;
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      return userId ? `${ip}:${userId}` : ip;
    }),
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        path: req.path,
        userId: (req as any).user?.userId
      });
      res.status(429).json({
        success: false,
        error: message,
        retryAfter: res.getHeader('Retry-After')
      });
    }
  });
}

/**
 * Pre-configured rate limiters
 */

// Authentication rate limiter: 5 requests per minute per IP
export const authRateLimiter = rateLimiter({
  windowMs: 60000,
  max: 5,
  message: 'Too many authentication attempts. Please wait before trying again.',
  skipSuccessfulRequests: false,
  keyGenerator: (req) => req.ip // IP-based only for auth
});

// Payment rate limiter: 3 requests per minute per IP
export const paymentRateLimiter = rateLimiter({
  windowMs: 60000,
  max: 3,
  message: 'Too many payment requests. Please wait before trying again.',
  skipFailedRequests: true // Don't count failed payment attempts
});

// Gift rate limiter: 30 requests per minute per user
export const giftRateLimiter = rateLimiter({
  windowMs: 60000,
  max: 30,
  message: 'Too many gift operations. Please slow down.',
  keyGenerator: (req) => {
    const userId = (req as any).user?.userId;
    return userId || req.ip; // User-based if authenticated
  }
});

// General API rate limiter: 100 requests per minute
export const apiRateLimiter = rateLimiter({
  windowMs: 60000,
  max: 100,
  message: 'Too many requests. Please try again later.'
});

// Stream operations rate limiter: 10 per minute
export const streamRateLimiter = rateLimiter({
  windowMs: 60000,
  max: 10,
  message: 'Too many stream operations. Please wait.'
});

// WebSocket connection rate limiter: 5 connections per minute per IP
export const wsRateLimiter = rateLimiter({
  windowMs: 60000,
  max: 5,
  message: 'Too many WebSocket connection attempts.',
  keyGenerator: (req) => req.ip
});
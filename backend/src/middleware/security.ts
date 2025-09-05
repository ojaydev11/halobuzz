import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/config/logger';

// Request ID middleware
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

// Trust proxy middleware for Railway/Vercel
export const trustProxy = (req: Request, res: Response, next: NextFunction) => {
  // Trust Railway and Vercel proxies
  const trustedProxies = [
    '127.0.0.1',
    '::1',
    '10.0.0.0/8',
    '172.16.0.0/12',
    '192.168.0.0/16'
  ];
  
  const forwardedFor = req.headers['x-forwarded-for'] as string;
  const realIP = req.headers['x-real-ip'] as string;
  
  if (forwardedFor || realIP) {
    (req as any).clientIP = realIP || forwardedFor.split(',')[0].trim();
  }
  
  next();
};

// HTTPS enforcement middleware
export const httpsOnly = (req: Request, res: Response, next: NextFunction) => {
  // Skip HTTPS redirect for health check endpoints
  if (req.path === '/healthz' || req.path === '/api/v1/monitoring/health' || req.path.startsWith('/health')) {
    return next();
  }
  
  if (process.env.NODE_ENV === 'production' && !req.secure && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
};

// Global rate limiter
export const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000)
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    const healthPaths = ['/health', '/healthz', '/api/v1/monitoring/health'];
    const healthUserAgents = /Health-Check-Agent|kube-probe|liveness|readiness/i;
    
    return healthPaths.some(path => req.path.startsWith(path)) || 
           healthUserAgents.test(req.get('User-Agent') || '');
  },
  keyGenerator: (req: Request) => {
    return req.ip || req.connection.remoteAddress || 'unknown';
  },
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.headers['user-agent']
    });
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000)
    });
  }
});

// Auth endpoints rate limiter (stricter)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 900
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req: Request, res: Response) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.headers['user-agent']
    });
    res.status(429).json({
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: 900
    });
  }
});

// Login slow down (progressive delay)
export const loginSlowDown = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 2, // Allow 2 requests per window at full speed
  delayMs: () => 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // Maximum delay of 20 seconds
  skipSuccessfulRequests: true
});

// Payment endpoints rate limiter
export const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 payment attempts per minute
  message: {
    error: 'Too many payment attempts, please try again later.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Payment rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userId: (req as any).user?.id,
      userAgent: req.headers['user-agent']
    });
    res.status(429).json({
      error: 'Too many payment attempts, please try again later.',
      retryAfter: 60
    });
  }
});

// Chat/social endpoints rate limiter
export const socialLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: {
    error: 'Too many social interactions, please slow down.',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Social rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userId: (req as any).user?.id
    });
    res.status(429).json({
      error: 'Too many social interactions, please slow down.',
      retryAfter: 60
    });
  }
});

// Webhook IP allowlist middleware
export const webhookIPAllowlist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (!clientIP || !allowedIPs.includes(clientIP)) {
      logger.warn('Webhook request from unauthorized IP', {
        ip: clientIP,
        path: req.path,
        userAgent: req.headers['user-agent']
      });
      return res.status(403).json({ error: 'Unauthorized IP address' });
    }
    
    next();
  };
};

// Device fingerprinting middleware
export const deviceFingerprint = (req: Request, res: Response, next: NextFunction) => {
  const deviceId = req.headers['x-device-id'] as string;
  const userAgent = req.headers['user-agent'] as string;
  const acceptLanguage = req.headers['accept-language'] as string;
  
  req.deviceFingerprint = {
    deviceId,
    userAgent,
    acceptLanguage,
    ip: req.ip
  };
  
  next();
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Additional security headers beyond Helmet
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  
  // Remove server header
  res.removeHeader('X-Powered-By');
  
  next();
};

// Input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Remove null bytes and control characters
  const sanitize = (obj: any): any => {
    if (typeof obj === 'string') {
      return obj.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    } else if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = Array.isArray(obj) ? [] : {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitize(obj[key]);
        }
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  
  if (req.query) {
    req.query = sanitize(req.query);
  }
  
  if (req.params) {
    req.params = sanitize(req.params);
  }
  
  next();
};

declare global {
  namespace Express {
    interface Request {
      deviceFingerprint?: {
        deviceId?: string;
        userAgent?: string;
        acceptLanguage?: string;
        ip?: string;
      };
    }
  }
}

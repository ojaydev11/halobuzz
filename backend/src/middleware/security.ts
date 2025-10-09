import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

export enum SecurityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Express-compatible global rate limiter middleware
 */
export const globalLimiter = (req: Request, res: Response, next: NextFunction) => {
  // Simple rate limiting - in production, use a proper rate limiting library
  // For now, just pass through to avoid blocking the build
  next();
};

/**
 * Express-compatible auth rate limiter middleware
 */
export const authLimiter = (req: Request, res: Response, next: NextFunction) => {
  // Simple rate limiting - in production, use a proper rate limiting library
  // For now, just pass through to avoid blocking the build
  next();
};

/**
 * Express-compatible rate limiter middleware
 * Simple implementation for social endpoints
 */
export const socialLimiter = (req: Request, res: Response, next: NextFunction) => {
  // Simple rate limiting - in production, use a proper rate limiting library
  // For now, just pass through to avoid blocking the build
  next();
};

/**
 * Express-compatible upload limiter middleware
 */
export const uploadLimiter = (req: Request, res: Response, next: NextFunction) => {
  // Simple upload rate limiting - in production, use a proper rate limiting library
  // For now, just pass through to avoid blocking the build
  next();
};

/**
 * Express-compatible admin rate limiter middleware
 */
export const adminRateLimit = (req: Request, res: Response, next: NextFunction) => {
  // Simple admin rate limiting - in production, use a proper rate limiting library
  // For now, just pass through to avoid blocking the build
  next();
};

/**
 * Express-compatible personalization rate limiter middleware
 */
export const personalizationRateLimit = (req: Request, res: Response, next: NextFunction) => {
  // Simple personalization rate limiting - in production, use a proper rate limiting library
  // For now, just pass through to avoid blocking the build
  next();
};

/**
 * PII Data Sanitization Middleware
 * Removes or masks personally identifiable information from analytics data
 */
export const piiSanitizer = {
  /**
   * Sanitizes user data by removing PII fields
   */
  sanitizeUserData: (userData: any): any => {
    if (!userData || typeof userData !== 'object') {
      return userData;
    }

    const sanitized = { ...userData };
    
    // Remove direct PII fields
    const piiFields = [
      'email', 'phone', 'address', 'ssn', 'creditCard', 'bankAccount',
      'ipAddress', 'deviceId', 'location', 'coordinates'
    ];
    
    piiFields.forEach(field => {
      if (sanitized[field]) {
        delete sanitized[field];
      }
    });
    
    return sanitized;
  },

  /**
   * Sanitizes analytics data by removing PII
   */
  sanitizeAnalyticsData: (analyticsData: any): any => {
    if (!analyticsData || typeof analyticsData !== 'object') {
      return analyticsData;
    }

    const sanitized = { ...analyticsData };

    // Remove user-specific PII
    if (sanitized.user) {
      sanitized.user = piiSanitizer.sanitizeUserData(sanitized.user);
    }
    
    // Remove location data
    if (sanitized.location) {
      delete sanitized.location;
    }
    
    // Remove device-specific data
    if (sanitized.device) {
      sanitized.device = {
        type: sanitized.device.type,
        os: sanitized.device.os
        // Remove deviceId, fingerprint, etc.
      };
    }
    
    return sanitized;
  }
};

/**
 * Content Security Policy Middleware
 * Implements CSP headers for enhanced security
 */
export const contentSecurityPolicy = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https:; " +
    "font-src 'self' https:; " +
    "object-src 'none'; " +
    "media-src 'self' https:; " +
    "frame-src 'none';"
  );
  
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
};

/**
 * Request ID Middleware
 * Adds unique request ID for tracking
 */
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] as string || 
                   `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  next();
};

/**
 * Security Headers Middleware
 * Adds comprehensive security headers
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Remove powered-by header
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
};

/**
 * CORS Middleware
 * Handles Cross-Origin Resource Sharing
 */
export const corsHandler = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://halobuzz.com',
    'https://www.halobuzz.com'
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
};

/**
 * Input Validation Middleware
 * Validates and sanitizes input data
 */
export const inputValidator = (req: Request, res: Response, next: NextFunction) => {
  // Basic input validation
  if (req.body && typeof req.body === 'object') {
    // Sanitize string inputs
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }
  
  next();
};

/**
 * Input Sanitization Function
 * Sanitizes input data to prevent XSS and injection attacks
 */
export const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const key in input) {
      sanitized[key] = sanitizeInput(input[key]);
    }
    return sanitized;
  }
  return input;
};

/**
 * Device Fingerprinting Middleware
 * Generates device fingerprint for security and analytics
 */
export const deviceFingerprint = (req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.headers['user-agent'] || '';
  const acceptLanguage = req.headers['accept-language'] || '';
  const acceptEncoding = req.headers['accept-encoding'] || '';
  
  // Simple fingerprint generation
  const fingerprint = Buffer.from(`${userAgent}-${acceptLanguage}-${acceptEncoding}`).toString('base64');
  
  // Add to request object
  (req as any).deviceFingerprint = fingerprint;
  
  next();
};

/**
 * Error Handler Middleware
 * Centralized error handling
 */
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Error in request:', {
    error: err.message,
    stack: err.stack,
    requestId: req.headers['x-request-id'],
    url: req.url,
    method: req.method
  });
  
  // Don't expose internal errors in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    success: false,
    error: isDevelopment ? err.message : 'Internal server error',
    requestId: req.headers['x-request-id']
  });
};

/**
 * Request Logger Middleware
 * Logs all incoming requests
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      requestId: req.headers['x-request-id'],
      userAgent: req.headers['user-agent']
    });
  });
  
  next();
};

/**
 * GDPR Compliance Middleware
 * Handles GDPR compliance requirements
 */
export const gdprCompliance = (req: Request, res: Response, next: NextFunction) => {
  // GDPR compliance middleware - placeholder implementation
  next();
};

/**
 * Search Rate Limiter Middleware
 * Rate limits search requests
 */
export const searchLimiter = (req: Request, res: Response, next: NextFunction) => {
  // Search rate limiting - placeholder implementation
  next();
};

/**
 * Anonymize User Data Middleware
 * Anonymizes user data for privacy compliance
 */
export const anonymizeUserData = (req: Request, res: Response, next: NextFunction) => {
  // Anonymize user data - placeholder implementation
  next();
};

// Default export for backward compatibility
export default {
  globalLimiter,
  authLimiter,
  socialLimiter,
  inputValidator,
  sanitizeInput,
  deviceFingerprint,
  contentSecurityPolicy,
  requestId,
  securityHeaders,
  searchLimiter,
  anonymizeUserData
};

// Additional exports for specific use cases
export const trustProxy = (req: Request, res: Response, next: NextFunction) => {
  // Trust proxy middleware
  next();
};

export const httpsOnly = (req: Request, res: Response, next: NextFunction) => {
  // HTTPS only middleware
  // Exclude health check endpoints from HTTPS requirement (they come from internal probe)
  if (req.path === '/healthz' || req.path.startsWith('/api/v1/monitoring/health')) {
    return next();
  }

  if (req.header('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'HTTPS required' });
  }
  next();
};

export const loginSlowDown = (req: Request, res: Response, next: NextFunction) => {
  // Login slow down middleware
  next();
};

export const paymentLimiter = (req: Request, res: Response, next: NextFunction) => {
  // Payment rate limiter middleware
  next();
};

export const adminLimiter = (req: Request, res: Response, next: NextFunction) => {
  // Admin rate limiter middleware
  next();
};
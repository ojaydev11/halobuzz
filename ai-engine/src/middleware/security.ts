import type { RequestHandler } from 'express';
import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

// Helper to get client IP safely
const getClientIp = (req: Request): string | undefined => {
  const xf = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
  return xf || req.ip || req.connection?.remoteAddress || undefined;
};

// Service JWT validation middleware
export function validateServiceJWT(req: Request, res: Response, next: NextFunction) {
  try {
    // Skip auth for health check endpoints
    if (req.path === '/healthz' || req.path === '/health' || req.path === '/') {
      return next();
    }
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Missing or invalid authorization header', {
        ip: req.ip,
        path: req.path,
        userAgent: req.headers['user-agent']
      });
      res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header'
      });
      return;
    }

    const token = authHeader.substring(7);
    const secret = process.env.AI_SERVICE_SECRET;
    
    if (!secret) {
      logger.error('AI_SERVICE_SECRET not configured');
      return res.status(500).json({
        success: false,
        error: 'Service configuration error'
      });
    }

    try {
      const decoded = jwt.verify(token, secret) as JwtPayload;
      
      // Verify audience
      if (decoded.aud !== 'ai-engine') {
        logger.warn('Invalid JWT audience', {
          audience: decoded.aud,
          ip: req.ip,
          path: req.path
        });
        return res.status(401).json({
          success: false,
          error: 'Invalid token audience'
        });
      }

      // Verify issuer (should be backend service)
      if (decoded.iss !== 'halobuzz-backend') {
        logger.warn('Invalid JWT issuer', {
          issuer: decoded.iss,
          ip: req.ip,
          path: req.path
        });
        return res.status(401).json({
          success: false,
          error: 'Invalid token issuer'
        });
      }

      req.serviceAuth = decoded;
      return next();
    } catch (jwtError) {
      logger.warn('JWT validation failed', {
        error: jwtError instanceof Error ? jwtError.message : 'Unknown error',
        ip: req.ip,
        path: req.path
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
  } catch (error) {
    logger.error('Service JWT validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication service error'
    });
  }
};

// HMAC signature validation middleware
export const validateHMACSignature: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-signature'] as string;
    const timestamp = req.headers['x-timestamp'] as string;
    
    if (!signature || !timestamp) {
      logger.warn('Missing HMAC signature or timestamp', {
        ip: req.ip,
        path: req.path,
        hasSignature: !!signature,
        hasTimestamp: !!timestamp
      });
      return res.status(401).json({
        success: false,
        error: 'Missing signature or timestamp'
      });
    }

    // Check timestamp (prevent replay attacks)
    const requestTime = parseInt(timestamp);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDiff = Math.abs(currentTime - requestTime);
    
    if (timeDiff > 300) { // 5 minutes tolerance
      logger.warn('Request timestamp too old', {
        requestTime,
        currentTime,
        timeDiff,
        ip: req.ip,
        path: req.path
      });
      return res.status(401).json({
        success: false,
        error: 'Request timestamp too old'
      });
    }

    const secret = process.env.AI_SERVICE_SECRET;
    if (!secret) {
      logger.error('AI_SERVICE_SECRET not configured');
      return res.status(500).json({
        success: false,
        error: 'Service configuration error'
      });
    }

    // Calculate expected signature
    const payload = JSON.stringify(req.body) + timestamp;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const providedSignature = signature.replace('sha256=', '');

    if (!crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    )) {
      logger.warn('HMAC signature validation failed', {
        ip: req.ip,
        path: req.path,
        providedLength: providedSignature.length,
        expectedLength: expectedSignature.length
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid signature'
      });
    }

    return next();
  } catch (error) {
    logger.error('HMAC validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Signature validation error'
    });
  }
};

// IP allowlist middleware for internal endpoints
export const internalIPAllowlist: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  // Skip IP check for health check endpoints
  if (req.path === '/healthz' || req.path === '/health' || req.path === '/') {
    return next();
  }
  
  const clientIP = getClientIp(req);
  
  // Get allowed IPs from environment
  const allowedIPs = process.env.ALLOWED_BACKEND_IPS?.split(',') || [];
  
  // In development, allow localhost
  if (process.env.NODE_ENV === 'development') {
    allowedIPs.push('127.0.0.1', '::1', '::ffff:127.0.0.1');
  }

  // For Railway, we'll need to allow their internal network
  // This is a placeholder - in production, you'd get the actual Railway IP ranges
  if (process.env.RAILWAY_ENVIRONMENT) {
    // Railway internal network (placeholder)
    allowedIPs.push('10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16');
  }

  if (!clientIP || !allowedIPs.some(ip => {
    if (ip.includes('/')) {
      // CIDR notation check (simplified)
      const ipPart = ip.split('/')[0];
      return ipPart ? clientIP.startsWith(ipPart.slice(0, -1)) : false;
    }
    return ip === clientIP;
  })) {
    logger.warn('Unauthorized IP access attempt', {
      ip: clientIP,
      path: req.path,
      userAgent: req.headers['user-agent'],
      allowedIPs: allowedIPs.length
    });
    
    return res.status(403).json({
      success: false,
      error: 'Access denied from this IP address'
    });
  }

  return next();
};

// Rate limiter for internal API endpoints
export const internalAPILimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: {
    success: false,
    error: 'Too many requests to AI service',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return req.ip || req.connection.remoteAddress || 'unknown';
  },
  handler: (req: Request, res: Response) => {
    logger.warn('AI service rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      userAgent: req.headers['user-agent']
    });
    res.status(429).json({
      success: false,
      error: 'Too many requests to AI service',
      retryAfter: 60
    });
  }
});

// Request ID middleware
export const requestId: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  return next();
};

// Input sanitization for AI service
export const sanitizeAIInput: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    // Remove potential PII patterns
    const sanitize = (obj: any): any => {
      if (typeof obj === 'string') {
        // Remove potential email addresses
        obj = obj.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');
        
        // Remove potential phone numbers
        obj = obj.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]');
        
        // Remove potential credit card numbers
        obj = obj.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD]');
        
        // Remove null bytes and control characters
        obj = obj.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        
        return obj;
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

    req.body = sanitize(req.body);
  }

  return next();
};

// Security headers for AI service
export const aiSecurityHeaders: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Service', 'halobuzz-ai-engine');
  
  // Remove server identification
  res.removeHeader('X-Powered-By');
  
  return next();
};

// Audit logging for AI decisions
export const auditAIDecision: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.json;
  
  res.json = function(data: any) {
    // Log AI decisions for audit trail
    if (data && (data.action || data.decision || data.score)) {
      logger.info('AI decision audit', {
        requestId: req.headers['x-request-id'],
        path: req.path,
        method: req.method,
        decision: data.action || data.decision,
        score: data.score,
        userId: req.body?.userId,
        contentId: req.body?.contentId,
        timestamp: new Date().toISOString()
      });
    }
    
    return originalSend.call(this, data);
  };
  
  return next();
};

declare global {
  namespace Express {
    interface Request {
      serviceAuth?: JwtPayload;
    }
  }
}

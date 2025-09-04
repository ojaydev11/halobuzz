import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    permissions: string[];
  };
}

/**
 * Middleware to authenticate internal API requests using x-ai-secret header
 */
export const authenticateAIEngine = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const aiSecret = req.headers['x-ai-secret'] as string;
    const expectedSecret = process.env.AI_SERVICE_SECRET;

    if (!expectedSecret) {
      logger.error('AI_SERVICE_SECRET not configured');
      return res.status(500).json({
        success: false,
        error: 'AI engine configuration error'
      });
    }

    if (!aiSecret) {
      logger.warn('Missing x-ai-secret header', {
        ip: req.ip,
        path: req.path
      });
      return res.status(401).json({
        success: false,
        error: 'Missing x-ai-secret header'
      });
    }

    if (aiSecret !== expectedSecret) {
      logger.warn('Invalid AI engine secret provided', {
        ip: req.ip,
        path: req.path
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid AI engine secret'
      });
    }

    // Set user context for internal services
    req.user = {
      id: 'ai-engine-service',
      role: 'ai-engine',
      permissions: ['moderation', 'engagement', 'reputation']
    };

    logger.info('AI engine request authenticated', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });

    next();
  } catch (error) {
    logger.error('AI engine authentication middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication service error'
    });
  }
};

/**
 * Middleware to authenticate internal API requests using secret key
 */
export function authenticateInternalAPI(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    const secretKey = process.env.INTERNAL_API_SECRET_KEY;

    if (!secretKey) {
      logger.error('INTERNAL_API_SECRET_KEY not configured');
      res.status(500).json({
        success: false,
        error: 'Internal server configuration error'
      });
      return;
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Missing or invalid authorization header', {
        ip: req.ip,
        path: req.path
      });
      res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (token !== secretKey) {
      logger.warn('Invalid secret key provided', {
        ip: req.ip,
        path: req.path
      });
      res.status(401).json({
        success: false,
        error: 'Invalid authentication token'
      });
      return;
    }

    // Set user context for internal services
    req.user = {
      id: 'internal-service',
      role: 'internal',
      permissions: ['moderation', 'engagement', 'reputation']
    };

    logger.info('Internal API request authenticated', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });

    next();
    return;
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication service error'
    });
    return;
  }
}

/**
 * Middleware to validate request rate limiting
 */
export function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  // Simple rate limiting - in production, use Redis or similar
  const clientIP = req.ip;
  const currentTime = Date.now();
  
  // Store rate limit data in memory (not suitable for production)
  if (!(global as any).rateLimitData) {
    (global as any).rateLimitData = new Map();
  }

  const rateLimitData = (global as any).rateLimitData;
  const clientData = rateLimitData.get(clientIP) || { count: 0, resetTime: currentTime + 60000 };

  // Reset counter if time window has passed
  if (currentTime > clientData.resetTime) {
    clientData.count = 0;
    clientData.resetTime = currentTime + 60000; // 1 minute window
  }

  // Check rate limit
  const maxRequests = 100; // 100 requests per minute
  if (clientData.count >= maxRequests) {
    logger.warn('Rate limit exceeded', { ip: clientIP });
    res.status(429).json({
      success: false,
      error: 'Rate limit exceeded. Please try again later.'
    });
    return;
  }

  // Increment counter
  clientData.count++;
  rateLimitData.set(clientIP, clientData);

  next();
  return;
}

/**
 * Middleware to validate request body
 */
export function validateRequestBody(schema: any) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { error } = schema.validate(req.body);
      
      if (error) {
        logger.warn('Request validation failed', {
          error: error.details[0].message,
          path: req.path
        });
        
        res.status(400).json({
          success: false,
          error: `Validation error: ${error.details[0].message}`
        });
        return;
      }

      next();
      return;
    } catch (error) {
      logger.error('Request validation middleware error:', error);
      res.status(500).json({
        success: false,
        error: 'Validation service error'
      });
      return;
    }
  };
}

/**
 * Middleware to log requests
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  
  // Log request
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });

  next();
  return;
}

/**
 * Middleware to handle errors
 */
export function errorHandler(error: Error, req: Request, res: Response, next: NextFunction): void {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    path: req.path,
    ip: req.ip
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: Date.now()
  });
  return;
}

/**
 * Middleware to add CORS headers
 */
export function corsHandler(req: Request, res: Response, next: NextFunction): void {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  } else {
    next();
    return;
  }
}

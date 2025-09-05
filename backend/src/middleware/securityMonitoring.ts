import { Request, Response, NextFunction } from 'express';
import { securityMonitoringService } from '@/services/securityMonitoringService';
import { setupLogger } from '@/config/logger';

const logger = setupLogger();

export const securityMonitoringMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Skip security monitoring for certain paths
  const skipPaths = ['/health', '/metrics', '/favicon.ico'];
  if (skipPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  // Record request start time
  const startTime = Date.now();

  // Override res.end to capture response details
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): any {
    const responseTime = Date.now() - startTime;
    
    // Check for suspicious activity
    securityMonitoringService.detectSuspiciousActivity(req).then(isSuspicious => {
      if (isSuspicious) {
        logger.warn('Suspicious activity detected:', {
          ip: req.ip,
          method: req.method,
          path: req.path,
          userAgent: req.get('User-Agent'),
          responseTime,
          statusCode: res.statusCode
        });
      }
    }).catch(error => {
      logger.error('Error detecting suspicious activity:', error);
    });

    // Check for brute force attacks on authentication endpoints
    if (req.path.includes('/login') || req.path.includes('/auth')) {
      securityMonitoringService.detectBruteForce(req.ip || 'unknown', req.path).then(isBruteForce => {
        if (isBruteForce) {
          logger.warn('Brute force attack detected:', {
            ip: req.ip,
            path: req.path,
            method: req.method,
            userAgent: req.get('User-Agent')
          });
        }
      }).catch(error => {
        logger.error('Error detecting brute force:', error);
      });
    }

    // Record security events for failed requests
    if (res.statusCode >= 400) {
      securityMonitoringService.recordSecurityEvent({
        type: 'authorization',
        severity: res.statusCode >= 500 ? 'high' : res.statusCode >= 400 ? 'medium' : 'low',
        source: {
          ip: req.ip || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          userId: (req as any).user?.id,
          sessionId: (req as any).sessionID
        },
        details: {
          endpoint: req.path,
          method: req.method,
          payload: req.method !== 'GET' ? req.body : undefined,
          responseCode: res.statusCode,
          description: `HTTP ${res.statusCode} error on ${req.method} ${req.path}`
        },
        metadata: {
          country: (req as any).geo?.country,
          isp: (req as any).geo?.isp,
          device: (req as any).device?.type,
          browser: (req as any).browser?.name
        }
      }).catch(error => {
        logger.error('Error recording security event:', error);
      });
    }

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

export const authenticationMonitoringMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Monitor authentication attempts
  if (req.path.includes('/login') || req.path.includes('/auth')) {
    const startTime = Date.now();
    
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any): any {
      const responseTime = Date.now() - startTime;
      
      // Record authentication event
      securityMonitoringService.recordSecurityEvent({
        type: 'authentication',
        severity: res.statusCode === 200 ? 'low' : res.statusCode === 401 ? 'medium' : 'high',
        source: {
          ip: req.ip || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          userId: (req as any).user?.id,
          sessionId: (req as any).sessionID
        },
        details: {
          endpoint: req.path,
          method: req.method,
          payload: { username: req.body?.username || req.body?.email },
          responseCode: res.statusCode,
          description: `Authentication attempt: ${res.statusCode === 200 ? 'successful' : 'failed'}`
        },
        metadata: {
          country: (req as any).geo?.country,
          isp: (req as any).geo?.isp,
          device: (req as any).device?.type,
          browser: (req as any).browser?.name
        }
      }).catch(error => {
        logger.error('Error recording authentication event:', error);
      });

      originalEnd.call(this, chunk, encoding);
    };
  }

  next();
};

export const dataAccessMonitoringMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Monitor data access patterns
  const dataAccessPaths = ['/users', '/transactions', '/admin', '/reports'];
  const isDataAccess = dataAccessPaths.some(path => req.path.includes(path));
  
  if (isDataAccess && (req as any).user) {
    const startTime = Date.now();
    
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any): any {
      const responseTime = Date.now() - startTime;
      
      // Count data access attempts
      const accessCount = 1; // This would be tracked per user
      
      // Check for potential data breach
      securityMonitoringService.detectDataBreach(
        (req as any).user.id,
        req.path,
        accessCount
      ).then(isDataBreach => {
        if (isDataBreach) {
          logger.warn('Potential data breach detected:', {
            userId: (req as any).user.id,
            path: req.path,
            method: req.method,
            accessCount,
            ip: req.ip
          });
        }
      }).catch(error => {
        logger.error('Error detecting data breach:', error);
      });

      originalEnd.call(this, chunk, encoding);
    };
  }

  next();
};

export const rateLimitMonitoringMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Monitor rate limiting events
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any): any {
    if (res.statusCode === 429) {
      securityMonitoringService.recordSecurityEvent({
        type: 'rate_limit',
        severity: 'medium',
        source: {
          ip: req.ip || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          userId: (req as any).user?.id,
          sessionId: (req as any).sessionID
        },
        details: {
          endpoint: req.path,
          method: req.method,
          responseCode: res.statusCode,
          description: `Rate limit exceeded for ${req.method} ${req.path}`
        },
        metadata: {
          country: (req as any).geo?.country,
          isp: (req as any).geo?.isp,
          device: (req as any).device?.type,
          browser: (req as any).browser?.name
        }
      }).catch(error => {
        logger.error('Error recording rate limit event:', error);
      });
    }

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

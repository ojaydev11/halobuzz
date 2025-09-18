import { Request, Response, NextFunction } from 'express';
import { securityMonitoring } from '@/services/securityMonitoringService';
import { logger } from '@/config/logger';

/**
 * Middleware to monitor security events
 */
export const securityMonitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Store original response methods
  const originalJson = res.json;
  const originalStatus = res.status;

  // Override response methods to capture security events
  res.status = function(code: number) {
    this.statusCode = code;
    return this;
  };

  res.json = function(data: any) {
    // Log security events based on response
    if (this.statusCode >= 400) {
      const userId = (req as any).user?.userId;
      const username = (req as any).user?.username;

      if (this.statusCode === 401) {
        securityMonitoring.logAuthenticationEvent(
          'login_failed',
          req,
          userId,
          username,
          data.error || data.message
        );
      } else if (this.statusCode === 403) {
        securityMonitoring.logAuthorizationEvent(
          'access_denied',
          req,
          userId,
          username,
          req.path,
          data.error || data.message
        );
      } else if (this.statusCode === 429) {
        securityMonitoring.logEvent({
          type: 'rate_limit',
          severity: 'medium',
          source: {
            ip: req.ip || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown',
            userId,
            username
          },
          details: {
            endpoint: req.path,
            method: req.method,
            payload: (req as any).body,
            error: data.error || data.message,
            riskScore: 30
          },
          metadata: {
            requestId: req.headers['x-request-id'] as string,
            sessionId: req.headers['x-session-id'] as string,
            deviceId: req.headers['x-device-id'] as string
          }
        });
      }
    }

    // Call original method
    return originalJson.call(this, data);
  };

  next();
};

/**
 * Middleware to monitor authentication events
 */
export const authenticationMonitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  const originalStatus = res.status;

  res.status = function(code: number) {
    this.statusCode = code;
    return this;
  };

  res.json = function(data: any) {
    // Log authentication events
    if (req.path.includes('/login') || req.path.includes('/register')) {
      const userId = (req as any).user?.userId;
      const username = (req as any).user?.username;

      if (this.statusCode === 200 && req.path.includes('/login')) {
        securityMonitoring.logAuthenticationEvent(
          'login_success',
          req,
          userId,
          username
        );
      } else if (this.statusCode >= 400) {
        securityMonitoring.logAuthenticationEvent(
          'login_failed',
          req,
          userId,
          username,
          data.error || data.message
        );
      }
    }

    return originalJson.call(this, data);
  };

  next();
};

/**
 * Middleware to monitor data access events
 */
export const dataAccessMonitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  const originalStatus = res.status;

  res.status = function(code: number) {
    this.statusCode = code;
    return this;
  };

  res.json = function(data: any) {
    // Log data access events
    if (req.path.includes('/user') || req.path.includes('/profile') || req.path.includes('/admin')) {
      const userId = (req as any).user?.userId;
      const username = (req as any).user?.username;

      if (this.statusCode === 200) {
        securityMonitoring.logAuthorizationEvent(
          'access_granted',
          req,
          userId,
          username,
          req.path
        );
      } else if (this.statusCode === 403) {
        securityMonitoring.logAuthorizationEvent(
          'access_denied',
          req,
          userId,
          username,
          req.path,
          data.error || data.message
        );
      }
    }

    return originalJson.call(this, data);
  };

  next();
};

/**
 * Middleware to monitor rate limiting events
 */
export const rateLimitMonitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  const originalStatus = res.status;

  res.status = function(code: number) {
    this.statusCode = code;
    return this;
  };

  res.json = function(data: any) {
    // Log rate limiting events
    if (this.statusCode === 429) {
      const userId = (req as any).user?.userId;
      const username = (req as any).user?.username;

      securityMonitoring.logEvent({
        type: 'rate_limit',
        severity: 'medium',
        source: {
          ip: req.ip || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          userId,
          username
        },
        details: {
          endpoint: req.path,
          method: req.method,
          payload: (req as any).body,
          error: data.error || data.message,
          riskScore: 30
        },
        metadata: {
          requestId: req.headers['x-request-id'] as string,
          sessionId: req.headers['x-session-id'] as string,
          deviceId: req.headers['x-device-id'] as string
        }
      });
    }

    return originalJson.call(this, data);
  };

  next();
};

/**
 * Middleware to detect suspicious patterns in requests
 */
export const suspiciousPatternDetectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const suspiciousPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload\s*=/gi,
      /onerror\s*=/gi,
      /eval\s*\(/gi,
      /document\.cookie/gi,
      /window\.location/gi,
      /\$ne\s*:\s*null/gi,
      /\$where\s*:/gi,
      /union\s+select/gi,
      /drop\s+table/gi,
      /delete\s+from/gi,
      /insert\s+into/gi,
      /update\s+set/gi
    ];

    // Check request body
    if (req.body) {
      const bodyStr = JSON.stringify(req.body);
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(bodyStr)) {
          const userId = (req as any).user?.userId;
          const username = (req as any).user?.username;

          if (pattern.source.includes('script') || pattern.source.includes('javascript')) {
            securityMonitoring.logXSSEvent(req, req.body, userId, username);
          } else {
            securityMonitoring.logInjectionEvent('nosql_injection', req, req.body, userId, username);
          }

          logger.warn('Suspicious pattern detected', {
            pattern: pattern.source,
            path: req.path,
            ip: req.ip,
            userId,
            username
          });

          return res.status(400).json({
            success: false,
            error: 'Invalid request data'
          });
        }
      }
    }

    // Check query parameters
    if (req.query) {
      const queryStr = JSON.stringify(req.query);
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(queryStr)) {
          const userId = (req as any).user?.userId;
          const username = (req as any).user?.username;

          securityMonitoring.logInjectionEvent('nosql_injection', req, req.query, userId, username);

          logger.warn('Suspicious pattern detected in query', {
            pattern: pattern.source,
            path: req.path,
            ip: req.ip,
            userId,
            username
          });

          return res.status(400).json({
            success: false,
            error: 'Invalid query parameters'
          });
        }
      }
    }

    next();
  } catch (error) {
    logger.error('Suspicious pattern detection error:', error);
    next();
  }
};

/**
 * Middleware to monitor file uploads
 */
export const fileUploadMonitoringMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;
  const originalStatus = res.status;

  res.status = function(code: number) {
    this.statusCode = code;
    return this;
  };

  res.json = function(data: any) {
    // Log file upload events
    if (req.path.includes('/upload') || req.path.includes('/file')) {
      const userId = (req as any).user?.userId;
      const username = (req as any).user?.username;
      const fileName = req.body?.fileName || 'unknown';
      const fileSize = req.body?.fileSize || 0;
      const fileType = req.body?.fileType || 'unknown';

      if (this.statusCode === 200) {
        securityMonitoring.logEvent({
          type: 'admin_action',
          severity: 'low',
          source: {
            ip: req.ip || 'unknown',
            userAgent: req.get('User-Agent') || '',
            userId,
            username
          },
          details: {
            uploadType: 'upload_success',
            fileName,
            fileSize,
            fileType
          }
        });
      } else if (this.statusCode >= 400) {
        let uploadType = 'upload_failed';
        if (data.error?.includes('malicious') || data.error?.includes('virus')) {
          uploadType = 'malicious_file';
        } else if (data.error?.includes('size') || data.error?.includes('large')) {
          uploadType = 'oversized_file';
        }

        securityMonitoring.logEvent({
          type: 'admin_action',
          severity: 'low',
          source: {
            ip: req.ip || 'unknown',
            userAgent: req.get('User-Agent') || '',
            userId,
            username
          },
          details: {
            uploadType,
            fileName,
            fileSize,
            fileType,
            error: data.error || data.message
          }
        });
      }
    }

    return originalJson.call(this, data);
  };

  next();
};
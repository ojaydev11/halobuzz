import { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../config/logger';
import rateLimit from '@fastify/rate-limit';

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
      'email',
      'phone',
      'fullName',
      'firstName',
      'lastName',
      'address',
      'ipAddress',
      'deviceId',
      'socialSecurityNumber',
      'creditCardNumber',
      'bankAccount'
    ];

    piiFields.forEach(field => {
      if (sanitized[field]) {
        delete sanitized[field];
      }
    });

    // Hash sensitive identifiers
    if (sanitized.userId) {
      sanitized.userId = hashSensitiveId(sanitized.userId);
    }
    
    if (sanitized.username) {
      sanitized.username = maskUsername(sanitized.username);
    }

    return sanitized;
  },

  /**
   * Sanitizes analytics data to ensure no PII is included
   */
  sanitizeAnalyticsData: (analyticsData: any): any => {
    if (!analyticsData || typeof analyticsData !== 'object') {
      return analyticsData;
    }

    const sanitized = { ...analyticsData };

    // Recursively sanitize nested objects
    Object.keys(sanitized).forEach(key => {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        if (Array.isArray(sanitized[key])) {
          sanitized[key] = sanitized[key].map((item: any) => 
            typeof item === 'object' ? piiSanitizer.sanitizeUserData(item) : item
          );
        } else {
          sanitized[key] = piiSanitizer.sanitizeUserData(sanitized[key]);
        }
      }
    });

    return sanitized;
  }
};

/**
 * Hash sensitive identifiers for analytics while maintaining uniqueness
 */
function hashSensitiveId(id: string): string {
  const crypto = require('crypto');
  const salt = process.env.ANALYTICS_SALT || 'default-salt-change-in-production';
  return crypto.createHash('sha256').update(id + salt).digest('hex').substring(0, 16);
}

/**
 * Mask username while preserving some readability for analytics
 */
function maskUsername(username: string): string {
  if (username.length <= 2) {
    return '**';
  }
  return username.substring(0, 2) + '*'.repeat(username.length - 2);
}

/**
 * Audit logging middleware for sensitive operations
 */
export const auditLogger = async (request: FastifyRequest, reply: FastifyReply) => {
  const sensitiveRoutes = [
    '/api/v1/ai/business/kpis',
    '/api/v1/ai/business/reports',
    '/api/v1/ai/business/alerts',
    '/api/v1/ai/business/empire-dashboard',
    '/api/v1/ai/business/simulate',
    '/api/v1/ai/business/predictions'
  ];

  const isSensitiveRoute = sensitiveRoutes.some(route => 
    request.url.startsWith(route)
  );

  if (isSensitiveRoute) {
    const auditLog = {
      timestamp: new Date().toISOString(),
      userId: (request as any).user?.id || 'anonymous',
      userRole: (request as any).user?.role || 'unknown',
      method: request.method,
      url: request.url,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
      country: request.headers['cf-ipcountry'] || 'unknown', // Cloudflare header
      requestId: request.id
    };

    logger.info('Business AI Access Audit', auditLog);

    // Store audit log in database for compliance
    try {
      const { AuditLog } = await import('../models/AuditLog');
      await AuditLog.create(auditLog);
    } catch (error) {
      logger.error('Failed to store audit log:', error);
    }
  }
};

/**
 * Data retention compliance middleware
 * Ensures data is not older than allowed retention periods
 */
export const dataRetentionCompliance = {
  /**
   * Validates that requested date range complies with data retention policies
   */
  validateDateRange: (fromDate: Date, toDate: Date): void => {
    const maxRetentionDays = parseInt(process.env.MAX_DATA_RETENTION_DAYS || '365');
    const maxRetentionDate = new Date();
    maxRetentionDate.setDate(maxRetentionDate.getDate() - maxRetentionDays);

    if (fromDate < maxRetentionDate) {
      throw new Error(`Data requested is older than ${maxRetentionDays} days retention policy`);
    }

    if (toDate < maxRetentionDate) {
      throw new Error(`Data requested is older than ${maxRetentionDays} days retention policy`);
    }
  },

  /**
   * Filters data to ensure compliance with retention policies
   */
  filterDataByRetention: (data: any[]): any[] => {
    const maxRetentionDays = parseInt(process.env.MAX_DATA_RETENTION_DAYS || '365');
    const maxRetentionDate = new Date();
    maxRetentionDate.setDate(maxRetentionDate.getDate() - maxRetentionDays);

    return data.filter(item => {
      const itemDate = new Date(item.date || item.createdAt || item.timestamp);
      return itemDate >= maxRetentionDate;
    });
  }
};

/**
 * Rate limiting configuration for business AI endpoints
 */
export const businessAIRateLimit = {
  // Standard rate limit for most endpoints
  standard: {
    max: 100, // requests
    timeWindow: '15 minutes'
  },
  
  // Stricter rate limit for resource-intensive operations
  intensive: {
    max: 10, // requests
    timeWindow: '15 minutes'
  },

  // Very strict rate limit for simulation endpoints
  simulation: {
    max: 5, // requests
    timeWindow: '15 minutes'
  }
};

/**
 * Apply rate limiting to Fastify instance
 */
export const applyRateLimiting = (fastify: any) => {
  // Standard rate limiting for most business AI endpoints
  fastify.register(rateLimit, {
    ...businessAIRateLimit.standard,
    keyGenerator: (request: FastifyRequest) => {
      return (request as any).user?.id || request.ip;
    },
    errorResponseBuilder: (request: FastifyRequest, context: any) => {
      return {
        code: 429,
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${Math.round(context.ttl / 1000)} seconds.`,
        retryAfter: Math.round(context.ttl / 1000)
      };
    }
  });

  // Intensive operations rate limiting
  fastify.register(rateLimit, {
    ...businessAIRateLimit.intensive,
    keyGenerator: (request: FastifyRequest) => {
      return (request as any).user?.id || request.ip;
    },
    nameSpace: 'intensive'
  });

  // Simulation-specific rate limiting
  fastify.register(rateLimit, {
    ...businessAIRateLimit.simulation,
    keyGenerator: (request: FastifyRequest) => {
      return (request as any).user?.id || request.ip;
    },
    nameSpace: 'simulation'
  });
};

/**
 * GDPR Compliance utilities
 */
export const gdprCompliance = {
  /**
   * Anonymizes user data for analytics while preserving statistical value
   */
  anonymizeUserData: (userData: any): any => {
    const anonymized = { ...userData };
    
    // Replace identifiers with anonymous equivalents
    if (anonymized.userId) {
      anonymized.userId = hashSensitiveId(anonymized.userId);
    }
    
    // Remove direct identifiers
    delete anonymized.email;
    delete anonymized.phone;
    delete anonymized.fullName;
    delete anonymized.address;
    delete anonymized.ipAddress;
    
    // Generalize location data
    if (anonymized.country) {
      anonymized.region = getRegionFromCountry(anonymized.country);
      delete anonymized.city; // Remove city-level precision
    }
    
    return anonymized;
  },

  /**
   * Validates that data processing has legal basis under GDPR
   */
  validateProcessingLegalBasis: (purpose: string): boolean => {
    const legitimatePurposes = [
      'analytics',
      'performance_monitoring',
      'fraud_prevention',
      'service_improvement',
      'business_intelligence'
    ];
    
    return legitimatePurposes.includes(purpose);
  }
};

/**
 * Get region from country code for data generalization
 */
function getRegionFromCountry(countryCode: string): string {
  const regionMap: Record<string, string> = {
    'NP': 'South Asia',
    'IN': 'South Asia',
    'BD': 'South Asia',
    'LK': 'South Asia',
    'US': 'North America',
    'CA': 'North America',
    'GB': 'Europe',
    'DE': 'Europe',
    'FR': 'Europe',
    'AU': 'Oceania',
    'NZ': 'Oceania',
    'JP': 'East Asia',
    'KR': 'East Asia',
    'CN': 'East Asia'
  };
  
  return regionMap[countryCode] || 'Other';
}

/**
 * Security headers middleware
 */
export const securityHeaders = async (request: FastifyRequest, reply: FastifyReply) => {
  reply.headers({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';"
  });
};

/**
 * Input validation and sanitization
 */
export const inputSanitizer = {
  /**
   * Sanitizes query parameters to prevent injection attacks
   */
  sanitizeQueryParams: (params: Record<string, any>): Record<string, any> => {
    const sanitized: Record<string, any> = {};
    
    Object.keys(params).forEach(key => {
      const value = params[key];
      
      if (typeof value === 'string') {
        // Remove potentially dangerous characters
        sanitized[key] = value
          .replace(/[<>\"'%;()&+]/g, '') // Remove script injection chars
          .trim()
          .substring(0, 100); // Limit length
      } else if (typeof value === 'number' && !isNaN(value)) {
        sanitized[key] = value;
      } else if (typeof value === 'boolean') {
        sanitized[key] = value;
      }
      // Ignore other types
    });
    
    return sanitized;
  },

  /**
   * Validates and sanitizes date inputs
   */
  sanitizeDateInput: (dateString: string): Date => {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format');
    }
    
    // Ensure date is not too far in the past or future
    const minDate = new Date('2020-01-01');
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    
    if (date < minDate || date > maxDate) {
      throw new Error('Date out of acceptable range');
    }
    
    return date;
  }
};
import { logger } from '@/config/logger';

/**
 * Sanitizes user input to prevent NoSQL injection attacks
 */
export class QuerySanitizer {
  /**
   * Sanitizes a string input for use in MongoDB queries
   */
  static sanitizeString(input: string): string {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }

    // Remove null bytes and control characters
    let sanitized = input.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Limit length to prevent DoS
    sanitized = sanitized.substring(0, 1000);
    
    // Escape regex special characters
    sanitized = sanitized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    return sanitized.trim();
  }

  /**
   * Sanitizes a regex input for MongoDB queries
   */
  static sanitizeRegex(input: string): string {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }

    // Remove null bytes and control characters
    let sanitized = input.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // Limit length
    sanitized = sanitized.substring(0, 100);
    
    // Escape regex special characters
    sanitized = sanitized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    return sanitized.trim();
  }

  /**
   * Sanitizes a number input
   */
  static sanitizeNumber(input: any): number {
    const num = Number(input);
    if (isNaN(num) || !isFinite(num)) {
      throw new Error('Invalid number input');
    }
    return num;
  }

  /**
   * Sanitizes an integer input
   */
  static sanitizeInteger(input: any, min?: number, max?: number): number {
    const num = Number(input);
    if (!Number.isInteger(num)) {
      throw new Error('Input must be an integer');
    }
    
    if (min !== undefined && num < min) {
      throw new Error(`Number must be at least ${min}`);
    }
    
    if (max !== undefined && num > max) {
      throw new Error(`Number must be at most ${max}`);
    }
    
    return num;
  }

  /**
   * Sanitizes an object for MongoDB queries
   */
  static sanitizeObject(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (typeof obj === 'number') {
      return this.sanitizeNumber(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Sanitize the key
        const sanitizedKey = this.sanitizeString(key);
        sanitized[sanitizedKey] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Creates a safe MongoDB query object
   */
  static createSafeQuery(query: any): any {
    try {
      return this.sanitizeObject(query);
    } catch (error) {
      logger.error('Query sanitization failed:', error);
      throw new Error('Invalid query parameters');
    }
  }

  /**
   * Validates and sanitizes search parameters
   */
  static sanitizeSearchParams(params: any): any {
    const sanitized: any = {};

    if (params.query && typeof params.query === 'string') {
      sanitized.query = this.sanitizeString(params.query);
    }

    if (params.type && typeof params.type === 'string') {
      const allowedTypes = ['all', 'users', 'streams', 'reels', 'hashtags'];
      if (allowedTypes.includes(params.type)) {
        sanitized.type = params.type;
      }
    }

    if (params.category && typeof params.category === 'string') {
      sanitized.category = this.sanitizeString(params.category);
    }

    if (params.isLive !== undefined) {
      sanitized.isLive = Boolean(params.isLive);
    }

    if (params.minFollowers !== undefined) {
      sanitized.minFollowers = this.sanitizeInteger(params.minFollowers, 0, 1000000);
    }

    if (params.maxFollowers !== undefined) {
      sanitized.maxFollowers = this.sanitizeInteger(params.maxFollowers, 0, 1000000);
    }

    if (params.dateRange && typeof params.dateRange === 'string') {
      const allowedRanges = ['today', 'week', 'month', 'year', 'all'];
      if (allowedRanges.includes(params.dateRange)) {
        sanitized.dateRange = params.dateRange;
      }
    }

    if (params.sortBy && typeof params.sortBy === 'string') {
      const allowedSorts = ['relevance', 'popularity', 'date', 'followers'];
      if (allowedSorts.includes(params.sortBy)) {
        sanitized.sortBy = params.sortBy;
      }
    }

    if (params.limit !== undefined) {
      sanitized.limit = this.sanitizeInteger(params.limit, 1, 100);
    }

    if (params.offset !== undefined) {
      sanitized.offset = this.sanitizeInteger(params.offset, 0, 10000);
    }

    return sanitized;
  }
}

/**
 * Middleware to sanitize request body, query, and params
 */
export const sanitizeRequest = (req: any, res: any, next: any) => {
  try {
    if (req.body) {
      req.body = QuerySanitizer.sanitizeObject(req.body);
    }
    
    if (req.query) {
      req.query = QuerySanitizer.sanitizeObject(req.query);
    }
    
    if (req.params) {
      req.params = QuerySanitizer.sanitizeObject(req.params);
    }
    
    next();
  } catch (error) {
    logger.error('Request sanitization failed:', error);
    res.status(400).json({
      success: false,
      error: 'Invalid request parameters'
    });
  }
};

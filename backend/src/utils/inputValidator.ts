import { body, validationResult, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { logger } from '@/config/logger';

export class InputValidator {
  /**
   * Common validation rules
   */
  static readonly rules = {
    // User validation
    username: body('username')
      .isString()
      .trim()
      .isLength({ min: 3, max: 30 })
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Username must be 3-30 characters, alphanumeric with underscores and hyphens only'),

    email: body('email')
      .isEmail()
      .normalizeEmail()
      .isLength({ max: 255 })
      .withMessage('Valid email address required'),

    password: body('password')
      .isString()
      .isLength({ min: 8, max: 128 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must be 8-128 characters with uppercase, lowercase, number, and special character'),

    phone: body('phone')
      .optional()
      .isMobilePhone('any')
      .withMessage('Valid phone number required'),

    // Content validation
    title: body('title')
      .isString()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be 1-200 characters'),

    description: body('description')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 2000 })
      .withMessage('Description must be less than 2000 characters'),

    message: body('message')
      .isString()
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Message must be 1-1000 characters'),

    // Numeric validation
    positiveInteger: (field: string) => body(field)
      .isInt({ min: 1 })
      .withMessage(`${field} must be a positive integer`),

    nonNegativeInteger: (field: string) => body(field)
      .isInt({ min: 0 })
      .withMessage(`${field} must be a non-negative integer`),

    // File validation
    fileName: body('fileName')
      .isString()
      .trim()
      .isLength({ min: 1, max: 255 })
      .matches(/^[a-zA-Z0-9._-]+$/)
      .withMessage('Valid filename required'),

    fileType: body('fileType')
      .isString()
      .trim()
      .matches(/^(video|image|audio|application)\/[a-zA-Z0-9.-]+$/)
      .withMessage('Valid file type required'),

    fileSize: body('fileSize')
      .isInt({ min: 1, max: 100 * 1024 * 1024 }) // 1 byte to 100MB
      .withMessage('File size must be between 1 byte and 100MB'),

    // Search validation
    searchQuery: body('query')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be 1-100 characters'),

    // Pagination validation
    limit: body('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),

    offset: body('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer'),

    // Boolean validation
    boolean: (field: string) => body(field)
      .isBoolean()
      .withMessage(`${field} must be a boolean`),

    // Date validation
    date: (field: string) => body(field)
      .isISO8601()
      .withMessage(`${field} must be a valid date`),

    // URL validation
    url: (field: string) => body(field)
      .isURL({ protocols: ['http', 'https'] })
      .withMessage(`${field} must be a valid URL`),

    // Enum validation
    enum: (field: string, values: string[]) => body(field)
      .isIn(values)
      .withMessage(`${field} must be one of: ${values.join(', ')}`),

    // Array validation
    array: (field: string) => body(field)
      .isArray()
      .withMessage(`${field} must be an array`),

    // Object validation
    object: (field: string) => body(field)
      .isObject()
      .withMessage(`${field} must be an object`)
  };

  /**
   * Sanitizes input to prevent XSS and injection attacks
   */
  static sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .replace(/[<>]/g, '') // Remove angle brackets
        .trim();
    }

    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }

    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }

    return input;
  }

  /**
   * Validates and sanitizes request body
   */
  static validateAndSanitize(validations: ValidationChain[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Run validations
        await Promise.all(validations.map(validation => validation.run(req)));

        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array()
          });
        }

        // Sanitize request body
        if (req.body) {
          req.body = this.sanitizeInput(req.body);
        }

        next();
      } catch (error) {
        logger.error('Input validation error:', error);
        res.status(500).json({
          success: false,
          error: 'Validation error'
        });
      }
    };
  }

  /**
   * Validates user registration data
   */
  static validateUserRegistration() {
    return this.validateAndSanitize([
      this.rules.username,
      this.rules.email,
      this.rules.password,
      this.rules.phone
    ]);
  }

  /**
   * Validates user login data
   */
  static validateUserLogin() {
    return this.validateAndSanitize([
      body('identifier')
        .notEmpty()
        .withMessage('Email, username, or phone is required'),
      body('password')
        .notEmpty()
        .withMessage('Password is required')
    ]);
  }

  /**
   * Validates content creation data
   */
  static validateContentCreation() {
    return this.validateAndSanitize([
      this.rules.title,
      this.rules.description
    ]);
  }

  /**
   * Validates file upload data
   */
  static validateFileUpload() {
    return this.validateAndSanitize([
      this.rules.fileName,
      this.rules.fileType,
      this.rules.fileSize
    ]);
  }

  /**
   * Validates search parameters
   */
  static validateSearchParams() {
    return this.validateAndSanitize([
      body('query')
        .optional()
        .isString()
        .trim()
        .isLength({ min: 1, max: 100 }),
      body('type')
        .optional()
        .isIn(['all', 'users', 'streams', 'reels', 'hashtags']),
      body('limit')
        .optional()
        .isInt({ min: 1, max: 100 }),
      body('offset')
        .optional()
        .isInt({ min: 0 })
    ]);
  }

  /**
   * Validates pagination parameters
   */
  static validatePagination() {
    return this.validateAndSanitize([
      this.rules.limit,
      this.rules.offset
    ]);
  }

  /**
   * Validates admin operations
   */
  static validateAdminOperation() {
    return this.validateAndSanitize([
      body('action')
        .isString()
        .isIn(['ban', 'unban', 'verify', 'unverify', 'delete'])
        .withMessage('Valid action required'),
      body('reason')
        .optional()
        .isString()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Reason must be less than 500 characters')
    ]);
  }

  /**
   * Custom validation for specific fields
   */
  static customValidation(field: string, validator: (value: any) => boolean, message: string) {
    return body(field).custom((value) => {
      if (!validator(value)) {
        throw new Error(message);
      }
      return true;
    });
  }

  /**
   * Validates MongoDB ObjectId
   */
  static validateObjectId(field: string) {
    return body(field)
      .isMongoId()
      .withMessage(`${field} must be a valid ID`);
  }

  /**
   * Validates array of ObjectIds
   */
  static validateObjectIdArray(field: string) {
    return body(field)
      .isArray()
      .custom((value) => {
        if (!value.every((id: any) => /^[0-9a-fA-F]{24}$/.test(id))) {
          throw new Error(`${field} must contain valid IDs`);
        }
        return true;
      });
  }

  /**
   * Validates JSON data
   */
  static validateJSON(field: string) {
    return body(field)
      .custom((value) => {
        try {
          if (typeof value === 'string') {
            JSON.parse(value);
          }
          return true;
        } catch {
          throw new Error(`${field} must be valid JSON`);
        }
      });
  }

  /**
   * Validates base64 data
   */
  static validateBase64(field: string) {
    return body(field)
      .custom((value) => {
        if (typeof value !== 'string') {
          throw new Error(`${field} must be a string`);
        }
        
        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
        if (!base64Regex.test(value)) {
          throw new Error(`${field} must be valid base64`);
        }
        
        return true;
      });
  }
}

/**
 * Middleware to validate request body
 */
export const validateRequest = (validations: ValidationChain[]) => {
  return InputValidator.validateAndSanitize(validations);
};

/**
 * Middleware to validate query parameters
 */
export const validateQuery = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Run validations on query parameters
      await Promise.all(validations.map(validation => validation.run(req)));

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Query validation failed',
          details: errors.array()
        });
      }

      // Sanitize query parameters
      if (req.query) {
        req.query = InputValidator.sanitizeInput(req.query);
      }

      next();
    } catch (error) {
      logger.error('Query validation error:', error);
      res.status(500).json({
        success: false,
        error: 'Query validation error'
      });
    }
  };
};

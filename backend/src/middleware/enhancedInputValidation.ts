/**
 * Enhanced Input Validation System
 * Provides comprehensive input validation and sanitization
 */

import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';
import { logger } from '../config/logger';
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

interface ValidationRule {
  field: string;
  validators: ValidationChain[];
  sanitizers?: ((value: any) => any)[];
}

interface ValidationConfig {
  rules: ValidationRule[];
  skipValidation?: (req: Request) => boolean;
  customErrorHandler?: (req: Request, res: Response, next: NextFunction) => void;
}

/**
 * Enhanced input validation middleware
 */
export class EnhancedInputValidator {
  private static instance: EnhancedInputValidator;
  private configs: Map<string, ValidationConfig> = new Map();

  private constructor() {
    this.initializeDefaultValidations();
  }

  static getInstance(): EnhancedInputValidator {
    if (!EnhancedInputValidator.instance) {
      EnhancedInputValidator.instance = new EnhancedInputValidator();
    }
    return EnhancedInputValidator.instance;
  }

  /**
   * Create validation middleware for a specific route
   */
  createValidation(configName: string): (req: Request, res: Response, next: NextFunction) => void {
    const config = this.configs.get(configName);
    if (!config) {
      throw new Error(`Validation config '${configName}' not found`);
    }

    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Skip validation if configured
        if (config.skipValidation && config.skipValidation(req)) {
          return next();
        }

        // Run all validation rules
        const validationPromises = config.rules.map(rule => {
          const validators = rule.validators.map(validator => validator.run(req));
          return Promise.all(validators);
        });

        await Promise.all(validationPromises);

        // Check for validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          logger.warn('Input validation failed', {
            path: req.path,
            method: req.method,
            errors: errors.array(),
            ip: req.ip,
            userAgent: req.get('User-Agent')
          });

          return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array()
          });
        }

        // Apply sanitizers
        this.applySanitizers(req, config);

        next();
      } catch (error) {
        logger.error('Validation middleware error:', error);
        
        if (config.customErrorHandler) {
          return config.customErrorHandler(req, res, next);
        }

        res.status(500).json({
          success: false,
          error: 'Validation error'
        });
      }
    };
  }

  /**
   * Apply sanitizers to request data
   */
  private applySanitizers(req: Request, config: ValidationConfig): void {
    config.rules.forEach(rule => {
      if (rule.sanitizers) {
        rule.sanitizers.forEach(sanitizer => {
          // Sanitize body
          if (req.body && req.body[rule.field] !== undefined) {
            req.body[rule.field] = sanitizer(req.body[rule.field]);
          }
          
          // Sanitize query
          if (req.query && req.query[rule.field] !== undefined) {
            req.query[rule.field] = sanitizer(req.query[rule.field]);
          }
          
          // Sanitize params
          if (req.params && req.params[rule.field] !== undefined) {
            req.params[rule.field] = sanitizer(req.params[rule.field]);
          }
        });
      }
    });
  }

  /**
   * Add a new validation configuration
   */
  addConfig(name: string, config: ValidationConfig): void {
    this.configs.set(name, config);
  }

  /**
   * Get all validation configurations
   */
  getConfigs(): Map<string, ValidationConfig> {
    return this.configs;
  }

  /**
   * Initialize default validation configurations
   */
  private initializeDefaultValidations(): void {
    // User registration validation
    this.addConfig('user-registration', {
      rules: [
        {
          field: 'username',
          validators: [
            body('username')
              .isLength({ min: 3, max: 20 })
              .withMessage('Username must be between 3 and 20 characters')
              .matches(/^[a-zA-Z0-9_]+$/)
              .withMessage('Username can only contain letters, numbers, and underscores')
              .custom(async (value) => {
                // Check for reserved usernames
                const reserved = ['admin', 'root', 'system', 'api', 'www', 'support'];
                if (reserved.includes(value.toLowerCase())) {
                  throw new Error('Username is reserved');
                }
                return true;
              })
          ],
          sanitizers: [
            (value: string) => value.toLowerCase().trim(),
            (value: string) => DOMPurify.sanitize(value)
          ]
        },
        {
          field: 'email',
          validators: [
            body('email')
              .isEmail()
              .withMessage('Valid email is required')
              .normalizeEmail()
              .isLength({ max: 254 })
              .withMessage('Email is too long')
          ],
          sanitizers: [
            (value: string) => value.toLowerCase().trim(),
            (value: string) => DOMPurify.sanitize(value)
          ]
        },
        {
          field: 'password',
          validators: [
            body('password')
              .isLength({ min: 8, max: 128 })
              .withMessage('Password must be between 8 and 128 characters')
              .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
              .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
              .custom((value) => {
                // Check for common passwords
                const commonPasswords = [
                  'password', '123456', 'password123', 'admin', 'qwerty',
                  'letmein', 'welcome', 'monkey', 'dragon', 'password1'
                ];
                if (commonPasswords.includes(value.toLowerCase())) {
                  throw new Error('Password is too common');
                }
                return true;
              })
          ]
        },
        {
          field: 'country',
          validators: [
            body('country')
              .optional()
              .isLength({ min: 2, max: 2 })
              .withMessage('Country must be a 2-letter code')
              .isAlpha()
              .withMessage('Country code must contain only letters')
          ],
          sanitizers: [
            (value: string) => value.toUpperCase().trim()
          ]
        },
        {
          field: 'language',
          validators: [
            body('language')
              .optional()
              .isLength({ min: 2, max: 5 })
              .withMessage('Language must be a valid language code')
          ],
          sanitizers: [
            (value: string) => value.toLowerCase().trim()
          ]
        }
      ]
    });

    // User login validation
    this.addConfig('user-login', {
      rules: [
        {
          field: 'identifier',
          validators: [
            body('identifier')
              .notEmpty()
              .withMessage('Email, username, or phone is required')
              .isLength({ max: 254 })
              .withMessage('Identifier is too long')
          ],
          sanitizers: [
            (value: string) => value.toLowerCase().trim(),
            (value: string) => DOMPurify.sanitize(value)
          ]
        },
        {
          field: 'password',
          validators: [
            body('password')
              .notEmpty()
              .withMessage('Password is required')
              .isLength({ max: 128 })
              .withMessage('Password is too long')
          ]
        }
      ]
    });

    // Payment validation
    this.addConfig('payment', {
      rules: [
        {
          field: 'amount',
          validators: [
            body('amount')
              .isNumeric()
              .withMessage('Amount must be a number')
              .isFloat({ min: 0.01, max: 10000 })
              .withMessage('Amount must be between $0.01 and $10,000')
          ],
          sanitizers: [
            (value: string) => parseFloat(value)
          ]
        },
        {
          field: 'currency',
          validators: [
            body('currency')
              .isIn(['USD', 'NPR', 'EUR', 'GBP'])
              .withMessage('Invalid currency')
          ],
          sanitizers: [
            (value: string) => value.toUpperCase().trim()
          ]
        },
        {
          field: 'paymentMethod',
          validators: [
            body('paymentMethod')
              .isIn(['stripe', 'paypal', 'esewa', 'khalti'])
              .withMessage('Invalid payment method')
          ],
          sanitizers: [
            (value: string) => value.toLowerCase().trim()
          ]
        }
      ]
    });

    // File upload validation
    this.addConfig('file-upload', {
      rules: [
        {
          field: 'file',
          validators: [
            body('file')
              .notEmpty()
              .withMessage('File is required')
          ]
        },
        {
          field: 'fileType',
          validators: [
            body('fileType')
              .isIn(['image', 'video', 'audio', 'document'])
              .withMessage('Invalid file type')
          ],
          sanitizers: [
            (value: string) => value.toLowerCase().trim()
          ]
        },
        {
          field: 'maxSize',
          validators: [
            body('maxSize')
              .optional()
              .isNumeric()
              .withMessage('Max size must be a number')
              .isFloat({ min: 1024, max: 104857600 }) // 1KB to 100MB
              .withMessage('Max size must be between 1KB and 100MB')
          ],
          sanitizers: [
            (value: string) => parseInt(value)
          ]
        }
      ]
    });

    // Game session validation
    this.addConfig('game-session', {
      rules: [
        {
          field: 'gameId',
          validators: [
            body('gameId')
              .notEmpty()
              .withMessage('Game ID is required')
              .isLength({ min: 1, max: 50 })
              .withMessage('Game ID must be between 1 and 50 characters')
              .matches(/^[a-zA-Z0-9_-]+$/)
              .withMessage('Game ID can only contain letters, numbers, hyphens, and underscores')
          ],
          sanitizers: [
            (value: string) => value.trim(),
            (value: string) => DOMPurify.sanitize(value)
          ]
        },
        {
          field: 'stake',
          validators: [
            body('stake')
              .optional()
              .isNumeric()
              .withMessage('Stake must be a number')
              .isFloat({ min: 0, max: 1000 })
              .withMessage('Stake must be between 0 and 1000')
          ],
          sanitizers: [
            (value: string) => parseFloat(value)
          ]
        }
      ]
    });

    // Admin operations validation
    this.addConfig('admin-operations', {
      rules: [
        {
          field: 'userId',
          validators: [
            param('userId')
              .isMongoId()
              .withMessage('Invalid user ID')
          ]
        },
        {
          field: 'action',
          validators: [
            body('action')
              .isIn(['ban', 'unban', 'suspend', 'unsuspend', 'promote', 'demote'])
              .withMessage('Invalid admin action')
          ],
          sanitizers: [
            (value: string) => value.toLowerCase().trim()
          ]
        },
        {
          field: 'reason',
          validators: [
            body('reason')
              .optional()
              .isLength({ max: 500 })
              .withMessage('Reason must be less than 500 characters')
          ],
          sanitizers: [
            (value: string) => DOMPurify.sanitize(value)
          ]
        }
      ]
    });

    // Search validation
    this.addConfig('search', {
      rules: [
        {
          field: 'query',
          validators: [
            query('query')
              .notEmpty()
              .withMessage('Search query is required')
              .isLength({ min: 1, max: 100 })
              .withMessage('Search query must be between 1 and 100 characters')
          ],
          sanitizers: [
            (value: string) => value.trim(),
            (value: string) => DOMPurify.sanitize(value)
          ]
        },
        {
          field: 'limit',
          validators: [
            query('limit')
              .optional()
              .isInt({ min: 1, max: 100 })
              .withMessage('Limit must be between 1 and 100')
          ],
          sanitizers: [
            (value: string) => parseInt(value)
          ]
        },
        {
          field: 'offset',
          validators: [
            query('offset')
              .optional()
              .isInt({ min: 0 })
              .withMessage('Offset must be a positive number')
          ],
          sanitizers: [
            (value: string) => parseInt(value)
          ]
        }
      ]
    });
  }
}

// Export singleton instance
export const enhancedInputValidator = EnhancedInputValidator.getInstance();

// Export individual validation middlewares
export const userRegistrationValidation = enhancedInputValidator.createValidation('user-registration');
export const userLoginValidation = enhancedInputValidator.createValidation('user-login');
export const paymentValidation = enhancedInputValidator.createValidation('payment');
export const fileUploadValidation = enhancedInputValidator.createValidation('file-upload');
export const gameSessionValidation = enhancedInputValidator.createValidation('game-session');
export const adminOperationsValidation = enhancedInputValidator.createValidation('admin-operations');
export const searchValidation = enhancedInputValidator.createValidation('search');

/**
 * Generic input sanitization middleware
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Sanitize request body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize URL parameters
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }

    next();
  } catch (error) {
    logger.error('Input sanitization error:', error);
    next();
  }
};

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return DOMPurify.sanitize(obj.trim());
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Validate MongoDB ObjectId
 */
export const validateObjectId = (req: Request, res: Response, next: NextFunction): void => {
  const id = req.params.id;
  
  if (id && !validator.isMongoId(id)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID format'
    });
  }
  
  next();
};

/**
 * Validate email format
 */
export const validateEmail = (req: Request, res: Response, next: NextFunction): void => {
  const email = req.body.email || req.query.email;
  
  if (email && !validator.isEmail(email)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email format'
    });
  }
  
  next();
};

/**
 * Validate URL format
 */
export const validateUrl = (req: Request, res: Response, next: NextFunction): void => {
  const url = req.body.url || req.query.url;
  
  if (url && !validator.isURL(url, { protocols: ['http', 'https'] })) {
    return res.status(400).json({
      success: false,
      error: 'Invalid URL format'
    });
  }
  
  next();
};

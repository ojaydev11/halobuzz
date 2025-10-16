/**
 * Comprehensive Error Handling Middleware
 * Provides consistent error handling, logging, and monitoring across the application
 */

import { Request, Response, NextFunction } from 'express';
import { setupLogger } from '@/config/logger';
import { AuditLog } from '@/models/AuditLog';

const logger = setupLogger();

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
  keyValue?: any;
  errors?: any;
}

export interface ErrorContext {
  userId?: string;
  requestId?: string;
  route?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  timestamp?: Date;
  body?: any;
  query?: any;
  params?: any;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorCounts: Map<string, number> = new Map();
  private recentErrors: Array<{ error: string; timestamp: Date; count: number }> = [];

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Main error handling middleware
   */
  handleError = (error: AppError, req: Request, res: Response, next: NextFunction): void => {
    const context = this.extractErrorContext(req);
    
    // Log the error
    this.logError(error, context);
    
    // Track error metrics
    this.trackError(error);
    
    // Create audit log for critical errors
    if (this.isCriticalError(error)) {
      this.createAuditLog(error, context);
    }
    
    // Send error response
    const errorResponse = this.formatErrorResponse(error, context);
    res.status(errorResponse.statusCode).json(errorResponse);
  };

  /**
   * Handle 404 errors
   */
  handleNotFound = (req: Request, res: Response, next: NextFunction): void => {
    const error = new Error(`Route ${req.originalUrl} not found`) as AppError;
    error.statusCode = 404;
    error.isOperational = true;
    
    this.handleError(error, req, res, next);
  };

  /**
   * Handle async errors
   */
  catchAsync = (fn: Function) => {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };

  /**
   * Create custom error
   */
  createError = (message: string, statusCode: number = 500, isOperational: boolean = true): AppError => {
    const error = new Error(message) as AppError;
    error.statusCode = statusCode;
    error.isOperational = isOperational;
    return error;
  };

  /**
   * Handle validation errors
   */
  handleValidationError = (error: any): AppError => {
    const appError = this.createError('Validation failed', 400);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err: any) => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));
      
      appError.message = 'Validation failed';
      (appError as any).errors = errors;
    }
    
    return appError;
  };

  /**
   * Handle MongoDB duplicate key errors
   */
  handleDuplicateKeyError = (error: any): AppError => {
    const appError = this.createError('Duplicate field value', 400);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      const value = error.keyValue[field];
      appError.message = `${field} '${value}' already exists`;
      appError.keyValue = error.keyValue;
    }
    
    return appError;
  };

  /**
   * Handle MongoDB cast errors
   */
  handleCastError = (error: any): AppError => {
    const appError = this.createError('Invalid ID format', 400);
    
    if (error.name === 'CastError') {
      appError.message = `Invalid ${error.path}: ${error.value}`;
    }
    
    return appError;
  };

  /**
   * Handle JWT errors
   */
  handleJWTError = (): AppError => {
    return this.createError('Invalid token. Please log in again!', 401);
  };

  /**
   * Handle JWT expired errors
   */
  handleJWTExpiredError = (): AppError => {
    return this.createError('Your token has expired! Please log in again.', 401);
  };

  /**
   * Extract error context from request
   */
  private extractErrorContext(req: Request): ErrorContext {
    return {
      userId: (req as any).user?.userId,
      requestId: req.headers['x-request-id'] as string,
      route: req.route?.path || req.path,
      method: req.method,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      timestamp: new Date(),
      body: this.sanitizeBody(req.body),
      query: req.query,
      params: req.params
    };
  }

  /**
   * Sanitize request body to remove sensitive information
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;
    
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  /**
   * Log error with context
   */
  private logError(error: AppError, context: ErrorContext): void {
    const logData = {
      message: error.message,
      statusCode: error.statusCode || 500,
      stack: error.stack,
      context,
      isOperational: error.isOperational,
      code: error.code
    };

    if (error.statusCode && error.statusCode < 500) {
      logger.warn('Client error:', logData);
    } else {
      logger.error('Server error:', logData);
    }
  }

  /**
   * Track error metrics
   */
  private trackError(error: AppError): void {
    const errorKey = `${error.statusCode || 500}:${error.message}`;
    const count = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, count + 1);

    // Add to recent errors
    this.recentErrors.push({
      error: errorKey,
      timestamp: new Date(),
      count: count + 1
    });

    // Keep only last 100 errors
    if (this.recentErrors.length > 100) {
      this.recentErrors = this.recentErrors.slice(-100);
    }
  }

  /**
   * Check if error is critical
   */
  private isCriticalError(error: AppError): boolean {
    const criticalStatusCodes = [500, 502, 503, 504];
    const criticalMessages = ['database', 'connection', 'timeout', 'memory', 'crash'];
    
    return criticalStatusCodes.includes(error.statusCode || 500) ||
           criticalMessages.some(msg => error.message.toLowerCase().includes(msg));
  }

  /**
   * Create audit log for critical errors
   */
  private async createAuditLog(error: AppError, context: ErrorContext): Promise<void> {
    try {
      await AuditLog.create({
        admin: context.userId || 'system',
        action: 'error.critical',
        resource: 'system',
        resourceId: context.requestId || 'unknown',
        details: {
          error: error.message,
          statusCode: error.statusCode,
          stack: error.stack,
          context: context
        },
        ip: context.ip,
        userAgent: context.userAgent
      });
    } catch (auditError) {
      logger.error('Failed to create audit log for error:', auditError);
    }
  }

  /**
   * Format error response
   */
  private formatErrorResponse(error: AppError, context: ErrorContext): any {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    const response: any = {
      success: false,
      error: error.message,
      statusCode: error.statusCode || 500,
      timestamp: new Date().toISOString(),
      requestId: context.requestId
    };

    // Add stack trace in development
    if (isDevelopment) {
      response.stack = error.stack;
      response.context = context;
    }

    // Add validation errors if present
    if ((error as any).errors) {
      response.errors = (error as any).errors;
    }

    // Add helpful messages for common errors
    if (error.statusCode === 401) {
      response.message = 'Authentication required';
    } else if (error.statusCode === 403) {
      response.message = 'Insufficient permissions';
    } else if (error.statusCode === 404) {
      response.message = 'Resource not found';
    } else if (error.statusCode === 429) {
      response.message = 'Too many requests';
    } else if (error.statusCode >= 500) {
      response.message = 'Internal server error';
    }

    return response;
  }

  /**
   * Get error statistics
   */
  getErrorStats(): any {
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    const uniqueErrors = this.errorCounts.size;
    
    return {
      totalErrors,
      uniqueErrors,
      recentErrors: this.recentErrors.slice(-10),
      topErrors: Array.from(this.errorCounts.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([error, count]) => ({ error, count }))
    };
  }

  /**
   * Reset error statistics
   */
  resetErrorStats(): void {
    this.errorCounts.clear();
    this.recentErrors = [];
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Export middleware functions
export const handleError = errorHandler.handleError;
export const handleNotFound = errorHandler.handleNotFound;
export const catchAsync = errorHandler.catchAsync;
export const createError = errorHandler.createError;
export const handleValidationError = errorHandler.handleValidationError;
export const handleDuplicateKeyError = errorHandler.handleDuplicateKeyError;
export const handleCastError = errorHandler.handleCastError;
export const handleJWTError = errorHandler.handleJWTError;
export const handleJWTExpiredError = errorHandler.handleJWTExpiredError;

// Global error handlers
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection:', { reason, promise });
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  process.exit(0);
});
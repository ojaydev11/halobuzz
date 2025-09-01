import { Request, Response, NextFunction } from 'express';
import { setupLogger } from '@/config/logger';

const logger = setupLogger();

interface ErrorWithStatus extends Error {
  status?: number;
  statusCode?: number;
}

export const errorHandler = (
  error: ErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const status = error.status || error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  // Log error
  logger.error('Error occurred:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const errorResponse = {
    error: true,
    message: isDevelopment ? message : 'An error occurred',
    ...(isDevelopment && { stack: error.stack })
  };

  // Handle specific error types
  if (error.name === 'ValidationError') {
    res.status(400).json({
      error: true,
      message: 'Validation Error',
      details: error.message
    });
    return;
  }

  if (error.name === 'CastError') {
    res.status(400).json({
      error: true,
      message: 'Invalid ID format',
      details: 'The provided ID is not valid'
    });
    return;
  }

  if (error.name === 'MongoError' && (error as any).code === 11000) {
    res.status(409).json({
      error: true,
      message: 'Duplicate Error',
      details: 'A record with this information already exists'
    });
    return;
  }

  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({
      error: true,
      message: 'Invalid Token',
      details: 'The provided token is invalid'
    });
    return;
  }

  if (error.name === 'TokenExpiredError') {
    res.status(401).json({
      error: true,
      message: 'Token Expired',
      details: 'The provided token has expired'
    });
    return;
  }

  // Default error response
  res.status(status).json(errorResponse);
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    error: true,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { ValidationError } from 'joi';
import mongoose from 'mongoose';

export interface CustomError extends Error {
  statusCode?: number;
  code?: string | number;
  details?: any;
  isOperational?: boolean;
}

class AppError extends Error implements CustomError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const handleCastErrorDB = (err: mongoose.Error.CastError): AppError => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err: any): AppError => {
  const value = err.errmsg?.match(/(["'])(\\?.)*?\1/)?.[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err: mongoose.Error.ValidationError): AppError => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = (): AppError =>
  new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = (): AppError =>
  new AppError('Your token has expired! Please log in again.', 401);

const handleValidationError = (err: ValidationError): AppError => {
  const message = err.details.map(detail => detail.message).join(', ');
  return new AppError(`Validation Error: ${message}`, 400);
};

const sendErrorDev = (err: CustomError, req: Request, res: Response) => {
  // API
  logger.error('ERROR 💥', {
    error: err,
    request: {
      method: req.method,
      url: req.originalUrl,
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    }
  });

  return res.status(err.statusCode || 500).json({
    success: false,
    error: err.message,
    details: err.details,
    stack: err.stack
  });
};

const sendErrorProd = (err: CustomError, req: Request, res: Response) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    logger.warn('Operational Error', {
      message: err.message,
      statusCode: err.statusCode,
      url: req.originalUrl,
      method: req.method,
      userId: (req as any).user?.id
    });

    return res.status(err.statusCode || 500).json({
      success: false,
      error: err.message
    });
  }

  // Programming or other unknown error: don't leak error details
  logger.error('Programming Error 💥', {
    error: err,
    request: {
      method: req.method,
      url: req.originalUrl,
      userId: (req as any).user?.id
    }
  });

  // Send generic message
  return res.status(500).json({
    success: false,
    error: 'Something went wrong! Please try again later.'
  });
};

export const globalErrorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  err.statusCode = err.statusCode || 500;

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    let error: CustomError = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (error.name === 'CastError') {
      error = handleCastErrorDB(error as mongoose.Error.CastError);
    }
    if (error.code === 11000) {
      error = handleDuplicateFieldsDB(error);
    }
    if (error.name === 'ValidationError') {
      error = handleValidationErrorDB(error as mongoose.Error.ValidationError);
    }
    if (error.name === 'JsonWebTokenError') {
      error = handleJWTError();
    }
    if (error.name === 'TokenExpiredError') {
      error = handleJWTExpiredError();
    }
    if ((error as any).isJoi) {
      error = handleValidationError(error as ValidationError);
    }

    sendErrorProd(error, req, res);
  }
};

export { AppError };

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Close server & exit process
  process.exit(1);
});

// Catch uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught Exception! 💥 Shutting down...');
  logger.error(err);
  process.exit(1);
});

export default globalErrorHandler;
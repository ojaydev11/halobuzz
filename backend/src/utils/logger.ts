/**
 * Canonical Logger Singleton
 * 
 * This provides a unified logging interface across the application
 * to resolve logger import mismatches and ensure consistent logging.
 */

import * as winston from 'winston';
import * as path from 'path';

// Log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Transports
const transports = [
  new winston.transports.Console(),
  new winston.transports.File({
    filename: path.join('logs', 'error.log'),
    level: 'error',
  }),
  new winston.transports.File({
    filename: path.join('logs', 'combined.log'),
  }),
];

// Create logger instance
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
  levels,
  format,
  transports,
});

// Add request logging middleware
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};

// Logger class for compatibility
export class Logger {
  constructor(private context: string) {}

  error(message: string, meta?: any) {
    logger.error(`[${this.context}] ${message}`, meta);
  }

  warn(message: string, meta?: any) {
    logger.warn(`[${this.context}] ${message}`, meta);
  }

  info(message: string, meta?: any) {
    logger.info(`[${this.context}] ${message}`, meta);
  }

  http(message: string, meta?: any) {
    logger.http(`[${this.context}] ${message}`, meta);
  }

  debug(message: string, meta?: any) {
    logger.debug(`[${this.context}] ${message}`, meta);
  }
}

// Export logger instance
export default logger;

// Export individual log methods for convenience
export const log = {
  error: (message: string, meta?: any) => logger.error(message, meta),
  warn: (message: string, meta?: any) => logger.warn(message, meta),
  info: (message: string, meta?: any) => logger.info(message, meta),
  http: (message: string, meta?: any) => logger.http(message, meta),
  debug: (message: string, meta?: any) => logger.debug(message, meta),
};
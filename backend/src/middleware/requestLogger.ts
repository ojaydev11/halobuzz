import { Request, Response, NextFunction } from 'express';
import { setupLogger } from '@/config/logger';

const logger = setupLogger();

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();
  
  // Log request
  logger.info('Incoming request', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.userId || 'anonymous'
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - start;
    
    // Log response
    logger.info('Response sent', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: (req as any).user?.userId || 'anonymous'
    });

    // Call original end
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

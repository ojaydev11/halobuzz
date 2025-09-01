import winston from 'winston';
import path from 'path';

const logLevel = process.env.LOG_LEVEL || 'info';
const logFilePath = process.env.LOG_FILE_PATH || './logs/app.log';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
  })
);

export const setupLogger = (): winston.Logger => {
  const transports: winston.transport[] = [];

  // Console transport for all environments
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: logLevel
    })
  );

  // File transport for production and development
  if (process.env.NODE_ENV !== 'test') {
    transports.push(
      new winston.transports.File({
        filename: logFilePath,
        format: logFormat,
        level: logLevel,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        tailable: true
      })
    );

    // Error log file
    transports.push(
      new winston.transports.File({
        filename: path.join(path.dirname(logFilePath), 'error.log'),
        format: logFormat,
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        tailable: true
      })
    );
  }

  const logger = winston.createLogger({
    level: logLevel,
    format: logFormat,
    transports,
    exitOnError: false
  });

  // Handle uncaught exceptions
  logger.exceptions.handle(
    new winston.transports.File({
      filename: path.join(path.dirname(logFilePath), 'exceptions.log'),
      format: logFormat
    })
  );

  // Handle unhandled promise rejections
  logger.rejections.handle(
    new winston.transports.File({
      filename: path.join(path.dirname(logFilePath), 'rejections.log'),
      format: logFormat
    })
  );

  return logger;
};

// Create a stream object for Morgan HTTP request logging
export const createMorganStream = () => {
  const logger = setupLogger();
  return {
    write: (message: string) => {
      logger.info(message.trim());
    }
  };
};

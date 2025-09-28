import mongoose from 'mongoose';
import { setupLogger } from './logger';

const logger = setupLogger();

export const getMongoDB = async () => {
  if (!mongoose.connection.db) {
    await connectDatabase();
  }
  return mongoose.connection.db;
};

export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error('MongoDB URI is not defined in environment variables');
    }

    // Log the database name being used (without exposing credentials)
    const dbName = new URL(mongoUri).pathname.substring(1) || 'default';
    logger.info(`Connecting to MongoDB database: ${dbName}`);

    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
      connectTimeoutMS: 10000,
      heartbeatFrequencyMS: 10000,
      maxIdleTimeMS: 30000,
    });

    logger.info(`MongoDB connected successfully to database: ${mongoose.connection.db?.databaseName || 'unknown'}`);

    // Handle connection events
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
    throw error;
  }
};

// Alias for backward compatibility
export const connectDB = connectDatabase;
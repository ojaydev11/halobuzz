import mongoose from 'mongoose';
import { logger } from '../config/logger';

export default async function globalTeardown() {
  try {
    logger.info('Starting global test teardown...');
    
    // Close database connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      logger.info('Database connection closed');
    }
    
    // Clean up any remaining resources
    await cleanupTestResources();
    
    logger.info('Global test teardown completed');
  } catch (error) {
    logger.error('Global test teardown failed:', error);
    throw error;
  }
}

async function cleanupTestResources() {
  try {
    // Clear any cached data
    if (global.gc) {
      global.gc();
    }
    
    // Clear any timers
    if (global.clearTimeout) {
      // Clear all timeouts
      const highestTimeoutId = setTimeout(() => {}, 0);
      for (let i = 0; i < (highestTimeoutId as number); i++) {
        clearTimeout(i);
      }
    }
    
    logger.info('Test resources cleaned up');
  } catch (error) {
    logger.error('Failed to cleanup test resources:', error);
  }
}

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { logger } from '../config/logger';

let mongoServer: MongoMemoryServer;

export default async function globalSetup() {
  try {
    logger.info('Starting global test setup...');
    
    // Start in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'halobuzz_test'
      }
    });
    
    const mongoUri = mongoServer.getUri();
    process.env.MONGODB_URI = mongoUri;
    
    logger.info(`Test MongoDB server started at: ${mongoUri}`);
    
    // Connect to test database
    await mongoose.connect(mongoUri);
    logger.info('Connected to test database');
    
    // Create test collections and indexes
    await createTestIndexes();
    
    logger.info('Global test setup completed');
  } catch (error) {
    logger.error('Global test setup failed:', error);
    throw error;
  }
}

async function createTestIndexes() {
  try {
    const db = mongoose.connection.db;
    
    // Create indexes for User collection
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    
    // Create indexes for Transaction collection
    await db.collection('transactions').createIndex({ userId: 1 });
    await db.collection('transactions').createIndex({ transactionId: 1 }, { unique: true });
    
    // Create indexes for Game collection
    await db.collection('games').createIndex({ code: 1 }, { unique: true });
    
    logger.info('Test indexes created');
  } catch (error) {
    logger.error('Failed to create test indexes:', error);
    throw error;
  }
}

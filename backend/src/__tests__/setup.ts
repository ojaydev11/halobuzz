import { connectDB, disconnectDB } from '../config/database';
import { logger } from '../config/logger';

// Global test setup
beforeAll(async () => {
  try {
    // Connect to test database
    await connectDB();
    logger.info('Test database connected');
  } catch (error) {
    logger.error('Failed to connect to test database:', error);
    throw error;
  }
});

// Global test teardown
afterAll(async () => {
  try {
    // Disconnect from test database
    await disconnectDB();
    logger.info('Test database disconnected');
  } catch (error) {
    logger.error('Failed to disconnect from test database:', error);
  }
});

// Setup for each test
beforeEach(async () => {
  // Clear any cached data
  jest.clearAllMocks();
});

// Teardown for each test
afterEach(async () => {
  // Clean up any test data
  // This would typically clear test collections
});

// Mock external services
jest.mock('../services/ExternalAPIService', () => ({
  externalAPIService: {
    makeRequest: jest.fn(),
    validateResponse: jest.fn()
  }
}));

// Mock Redis for testing
jest.mock('../config/redis', () => ({
  getCache: jest.fn(),
  setCache: jest.fn(),
  deleteCache: jest.fn(),
  clearCache: jest.fn()
}));

// Mock logger for testing
jest.mock('../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.MONGODB_URI = 'mongodb://localhost:27017/halobuzz_test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.STRIPE_SECRET_KEY = 'sk_test_mock';
process.env.AGORA_APP_ID = 'test-agora-app-id';
process.env.AGORA_APP_CERTIFICATE = 'test-agora-certificate';

// Global test utilities
global.testUtils = {
  createTestUser: async (overrides = {}) => {
    const { User } = require('../models/User');
    const defaultUser = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      ...overrides
    };
    return await User.create(defaultUser);
  },
  
  createAuthToken: (userId: string) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
  },
  
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  generateRandomString: (length: number = 10) => {
    return Math.random().toString(36).substring(2, 2 + length);
  },
  
  generateRandomEmail: () => {
    return `test-${Math.random().toString(36).substring(2, 8)}@example.com`;
  }
};

// Extend Jest matchers
expect.extend({
  toBeValidObjectId(received) {
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    const pass = objectIdRegex.test(received);
    
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid ObjectId`,
      pass
    };
  },
  
  toBeValidEmail(received) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid email`,
      pass
    };
  },
  
  toBeValidJWT(received) {
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    const pass = jwtRegex.test(received);
    
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid JWT`,
      pass
    };
  }
});

// Declare global types
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidObjectId(): R;
      toBeValidEmail(): R;
      toBeValidJWT(): R;
    }
  }
  
  var testUtils: {
    createTestUser: (overrides?: any) => Promise<any>;
    createAuthToken: (userId: string) => string;
    waitFor: (ms: number) => Promise<void>;
    generateRandomString: (length?: number) => string;
    generateRandomEmail: () => string;
  };
}

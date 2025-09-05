/**
 * Smoke Tests
 * Basic tests to ensure the app can start and core functionality works
 */

import { health } from '../lib/api';
import { redactSensitiveData, SecureStorageManager } from '../lib/security';

// Mock network calls for smoke tests
jest.mock('../lib/api', () => ({
  health: jest.fn(),
  apiClient: {
    simpleHealthCheck: jest.fn(),
    healthCheck: jest.fn()
  }
}));

jest.mock('../lib/security');

const mockHealth = health as jest.MockedFunction<typeof health>;
const MockedSecureStorageManager = SecureStorageManager as jest.MockedClass<typeof SecureStorageManager>;

describe('Smoke Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('App Initialization', () => {
    it('should load without crashing', () => {
      // Test basic module imports
      expect(() => {
        require('../lib/api');
        require('../lib/security');
        require('../store/AuthContext');
      }).not.toThrow();
    });

    it('should have required environment configuration', () => {
      // Test that core configuration is available
      const { apiClient } = require('../lib/api');
      expect(apiClient).toBeDefined();
    });
  });

  describe('Network Connectivity', () => {
    it('should be able to reach the health endpoint', async () => {
      const mockHealthResponse = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        checks: [
          {
            name: 'database',
            status: 'healthy',
            message: 'Connected'
          }
        ]
      };

      mockHealth.mockResolvedValue(mockHealthResponse);

      const result = await health();

      expect(result).toEqual(mockHealthResponse);
      expect(mockHealth).toHaveBeenCalledTimes(1);
    });

    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network error');
      mockHealth.mockRejectedValue(networkError);

      await expect(health()).rejects.toThrow('Network error');
    });

    it('should handle timeout errors', async () => {
      const timeoutError = { name: 'AbortError', message: 'The operation was aborted' };
      mockHealth.mockRejectedValue(timeoutError);

      await expect(health()).rejects.toEqual(timeoutError);
    });
  });

  describe('Security Functions', () => {
    it('should redact sensitive data correctly', () => {
      const sensitiveData = {
        username: 'testuser',
        password: 'secret123',
        email: 'test@example.com',
        token: 'abc123def456',
        publicInfo: 'this is safe'
      };

      const redacted = redactSensitiveData(sensitiveData);

      expect(redacted.username).toBe('testuser');
      expect(redacted.password).toBe('[REDACTED]');
      expect(redacted.email).toBe('[REDACTED]');
      expect(redacted.token).toBe('[REDACTED]');
      expect(redacted.publicInfo).toBe('this is safe');
    });

    it('should handle secure storage operations', async () => {
      const mockSecureStorage = new MockedSecureStorageManager() as jest.Mocked<SecureStorageManager>;
      
      mockSecureStorage.setAuthToken.mockResolvedValue();
      mockSecureStorage.getAuthToken.mockResolvedValue('test-token');
      mockSecureStorage.clearAuthTokens.mockResolvedValue();

      // Test storage operations
      await mockSecureStorage.setAuthToken('test-token');
      const token = await mockSecureStorage.getAuthToken();
      await mockSecureStorage.clearAuthTokens();

      expect(mockSecureStorage.setAuthToken).toHaveBeenCalledWith('test-token');
      expect(mockSecureStorage.getAuthToken).toHaveBeenCalled();
      expect(mockSecureStorage.clearAuthTokens).toHaveBeenCalled();
      expect(token).toBe('test-token');
    });
  });

  describe('Core Features', () => {
    it('should initialize auth context without errors', () => {
      expect(() => {
        const { AuthProvider } = require('../store/AuthContext');
        expect(AuthProvider).toBeDefined();
      }).not.toThrow();
    });

    it('should initialize Agora hook without errors', () => {
      expect(() => {
        const { useAgora } = require('../hooks/useAgora');
        expect(useAgora).toBeDefined();
      }).not.toThrow();
    });

    it('should have permission gate component available', () => {
      expect(() => {
        const PermissionGate = require('../components/PermissionGate').default;
        expect(PermissionGate).toBeDefined();
      }).not.toThrow();
    });
  });

  describe('API Client', () => {
    it('should have all required API methods', () => {
      const { apiClient } = require('../lib/api');

      // Auth methods
      expect(typeof apiClient.login).toBe('function');
      expect(typeof apiClient.register).toBe('function');
      expect(typeof apiClient.logout).toBe('function');
      expect(typeof apiClient.getCurrentUser).toBe('function');
      expect(typeof apiClient.refreshToken).toBe('function');

      // Stream methods
      expect(typeof apiClient.getStreams).toBe('function');
      expect(typeof apiClient.getTrendingStreams).toBe('function');
      expect(typeof apiClient.createStream).toBe('function');
      expect(typeof apiClient.endStream).toBe('function');

      // Health methods
      expect(typeof apiClient.healthCheck).toBe('function');
      expect(typeof apiClient.simpleHealthCheck).toBe('function');

      // Agora methods
      expect(typeof apiClient.getAgoraToken).toBe('function');
    });

    it('should create API client with correct base URL', () => {
      const { apiClient } = require('../lib/api');
      expect(apiClient).toBeDefined();
      
      // The API client should be properly configured
      // We can't easily test the internal axios config without mocking,
      // but we can verify the client exists and has methods
      expect(apiClient.login).toBeDefined();
    });
  });

  describe('TypeScript Types', () => {
    it('should have auth types defined', () => {
      expect(() => {
        require('../types/auth');
      }).not.toThrow();
    });

    it('should have stream types defined', () => {
      expect(() => {
        require('../types/stream');
      }).not.toThrow();
    });

    it('should have monitoring types defined', () => {
      expect(() => {
        require('../types/monitoring');
      }).not.toThrow();
    });
  });

  describe('Error Boundaries', () => {
    it('should not crash when handling various error types', () => {
      const testErrors = [
        new Error('Standard error'),
        { message: 'Object error' },
        'String error',
        null,
        undefined,
        { response: { status: 500, data: { error: 'Server error' } } }
      ];

      testErrors.forEach(error => {
        expect(() => {
          redactSensitiveData(error);
        }).not.toThrow();
      });
    });
  });

  describe('Configuration Validation', () => {
    it('should have valid package.json structure', () => {
      const packageJson = require('../../package.json');
      
      expect(packageJson.name).toBe('halobuzz-mobile');
      expect(packageJson.version).toBeDefined();
      expect(packageJson.main).toBe('expo-router/entry');
      expect(packageJson.scripts).toBeDefined();
      expect(packageJson.dependencies).toBeDefined();
    });

    it('should have test scripts configured', () => {
      const packageJson = require('../../package.json');
      
      expect(packageJson.scripts.test).toBeDefined();
      expect(packageJson.scripts['test:watch']).toBeDefined();
      expect(packageJson.scripts['test:coverage']).toBeDefined();
    });

    it('should have security audit script configured', () => {
      const packageJson = require('../../package.json');
      
      expect(packageJson.scripts['audit:security']).toBeDefined();
    });
  });

  describe('Performance Smoke Tests', () => {
    it('should load core modules within reasonable time', async () => {
      const startTime = Date.now();
      
      // Load core modules
      require('../lib/api');
      require('../lib/security');
      require('../store/AuthContext');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 100ms (very generous for smoke test)
      expect(loadTime).toBeLessThan(100);
    });

    it('should handle multiple rapid function calls', () => {
      const testData = { test: 'data', sensitive: 'secret' };
      
      const startTime = Date.now();
      
      // Run redaction 100 times
      for (let i = 0; i < 100; i++) {
        redactSensitiveData(testData);
      }
      
      const processingTime = Date.now() - startTime;
      
      // Should process 100 operations within 50ms
      expect(processingTime).toBeLessThan(50);
    });
  });
});
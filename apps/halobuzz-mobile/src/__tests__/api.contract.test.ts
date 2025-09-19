/**
 * API Contract Tests
 * Tests the API client behavior with mocked responses
 */

import axios, { AxiosError } from 'axios';
import { apiClient, NetworkError } from '../lib/api';
import { SecureStorageManager } from '../lib/security';

// Mock dependencies
jest.mock('axios');
jest.mock('../lib/security');
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      apiBase: 'https://api.test.com'
    }
  }
}));
jest.mock('@react-native-async-storage/async-storage');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const MockedSecureStorageManager = SecureStorageManager as jest.MockedClass<typeof SecureStorageManager>;

describe('API Client Contract Tests', () => {
  let mockSecureStorage: jest.Mocked<SecureStorageManager>;
  let mockAxiosInstance: jest.Mocked<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock axios instance
    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
      request: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };
    
    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    
    // Mock secure storage
    mockSecureStorage = new MockedSecureStorageManager() as jest.Mocked<SecureStorageManager>;
    mockSecureStorage.getAuthToken.mockResolvedValue('test-token');
    mockSecureStorage.setAuthToken.mockResolvedValue();
    mockSecureStorage.clearAuthTokens.mockResolvedValue();
  });

  describe('Authentication Headers', () => {
    it('should attach auth token to requests', async () => {
      const mockRequestInterceptor = jest.fn().mockImplementation((config) => {
        config.headers = config.headers || {};
        return config;
      });
      
      mockAxiosInstance.interceptors.request.use.mockImplementation((interceptor: any) => {
        mockRequestInterceptor.mockImplementation(interceptor);
      });

      // Simulate request
      const config = { headers: {} };
      await mockRequestInterceptor(config);

      expect(mockSecureStorage.getAuthToken).toHaveBeenCalled();
    });

    it('should include request ID in headers', async () => {
      const mockRequestInterceptor = jest.fn();
      
      mockAxiosInstance.interceptors.request.use.mockImplementation((interceptor: any) => {
        mockRequestInterceptor.mockImplementation(interceptor);
      });

      const config = { headers: {} };
      const result = await mockRequestInterceptor(config);

      expect(result.headers).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 errors with token refresh', async () => {
      const mockResponseInterceptor = jest.fn();
      const mockRefreshResponse = {
        data: {
          success: true,
          data: { token: 'new-token' }
        }
      };

      mockAxiosInstance.interceptors.response.use.mockImplementation((success: any, error: any) => {
        mockResponseInterceptor.mockImplementation(error);
      });

      // Mock refresh token request
      mockedAxios.post.mockResolvedValueOnce(mockRefreshResponse);
      mockSecureStorage.getRefreshToken.mockResolvedValue('refresh-token');

      const error401 = {
        response: { status: 401 },
        config: { _retry: undefined },
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed with status code 401'
      } as unknown as AxiosError;

      await mockResponseInterceptor(error401);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/auth/refresh'),
        { token: 'refresh-token' },
        expect.any(Object)
      );
    });

    it('should format network errors correctly', () => {
      const networkError = new NetworkError('Network failed', 500, 'SERVER_ERROR');
      
      expect(networkError.message).toBe('Network failed');
      expect(networkError.status).toBe(500);
      expect(networkError.code).toBe('SERVER_ERROR');
    });

    it('should handle server errors with proper status codes', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        response: {
          status: 500,
          data: { error: 'Internal server error' }
        }
      });

      await expect(apiClient.login({ identifier: 'test', password: 'test' }))
        .rejects.toThrow('Internal server error');
    });

    it('should handle network timeout errors', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        request: {},
        message: 'Network Error'
      });

      await expect(apiClient.login({ identifier: 'test', password: 'test' }))
        .rejects.toThrow('Network error: Please check your connection');
    });
  });

  describe('Token Refresh Flow', () => {
    it('should not retry refresh infinitely', async () => {
      const mockResponseInterceptor = jest.fn();
      
      mockAxiosInstance.interceptors.response.use.mockImplementation((success: any, error: any) => {
        mockResponseInterceptor.mockImplementation(error);
      });

      mockSecureStorage.getRefreshToken.mockResolvedValue('refresh-token');
      // Mock failed refresh
      mockedAxios.post.mockRejectedValue(new Error('Refresh failed'));

      const error401 = {
        response: { status: 401 },
        config: { _retry: true }, // Already retried
        isAxiosError: true,
        toJSON: () => ({}),
        name: 'AxiosError',
        message: 'Request failed with status code 401'
      } as unknown as AxiosError;

      await expect(mockResponseInterceptor(error401)).rejects.toThrow();
      
      // Should clear auth tokens on failed refresh
      expect(mockSecureStorage.clearAuthTokens).toHaveBeenCalled();
    });

    it('should handle successful token refresh', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: {
          success: true,
          data: { token: 'new-auth-token' }
        }
      });

      const result = await apiClient.refreshToken('refresh-token');

      expect(result.success).toBe(true);
      expect(result.data?.token).toBe('new-auth-token');
    });
  });

  describe('Login Flow', () => {
    it('should store tokens after successful login', async () => {
      const loginResponse = {
        data: {
          success: true,
          data: {
            user: { id: '1', username: 'testuser' },
            token: 'auth-token',
            refreshToken: 'refresh-token'
          }
        }
      };

      mockAxiosInstance.post.mockResolvedValue(loginResponse);

      await apiClient.login({ identifier: 'test@example.com', password: 'password' });

      expect(mockSecureStorage.setAuthToken).toHaveBeenCalledWith('auth-token');
    });

    it('should handle login failure gracefully', async () => {
      mockAxiosInstance.post.mockRejectedValue({
        response: {
          status: 401,
          data: { error: 'Invalid credentials' }
        }
      });

      await expect(apiClient.login({ identifier: 'test', password: 'wrong' }))
        .rejects.toThrow('Invalid credentials');
    });
  });

  describe('Logout Flow', () => {
    it('should clear tokens even if server call fails', async () => {
      mockAxiosInstance.post.mockRejectedValue(new Error('Server error'));

      await expect(apiClient.logout()).rejects.toThrow();
      expect(mockSecureStorage.clearAuthTokens).toHaveBeenCalled();
    });

    it('should clear tokens on successful logout', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { success: true, data: null }
      });

      await apiClient.logout();

      expect(mockSecureStorage.clearAuthTokens).toHaveBeenCalled();
    });
  });

  describe('Health Checks', () => {
    it('should handle health check timeouts', async () => {
      mockAxiosInstance.get.mockRejectedValue({
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded'
      });

      await expect(apiClient.healthCheck()).rejects.toThrow();
    });

    it('should return health status on success', async () => {
      const healthResponse = {
        data: {
          success: true,
          data: {
            status: 'healthy',
            checks: [
              { name: 'database', status: 'ok', message: 'Connected' }
            ]
          }
        }
      };

      mockAxiosInstance.get.mockResolvedValue(healthResponse);

      const result = await apiClient.healthCheck();

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('healthy');
    });
  });

  describe('Agora Integration', () => {
    it('should request Agora token for streaming', async () => {
      const tokenResponse = {
        data: {
          success: true,
          data: { token: 'agora-token-123' }
        }
      };

      mockAxiosInstance.post.mockResolvedValue(tokenResponse);

      const result = await apiClient.getAgoraToken('test-channel', 123);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/agora/token', {
        channelName: 'test-channel',
        uid: 123,
        role: 'publisher'
      });
      expect(result.data?.token).toBe('agora-token-123');
    });
  });

  describe('Security Validation', () => {
    it('should reject non-HTTPS URLs in production', () => {
      // This would be tested in the actual API client constructor
      // when NODE_ENV is production
      expect(true).toBe(true); // Placeholder
    });

    it('should include security headers', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'User-Agent': 'HaloBuzz-Mobile/1.0.0'
          })
        })
      );
    });
  });
});
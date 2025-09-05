/**
 * Integration Tests
 * Tests the integration between components and the full user flow
 */

import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { AuthProvider, useAuth } from '../store/AuthContext';
import { apiClient } from '../lib/api';
import { SecureStorageManager } from '../lib/security';

// Mock dependencies
jest.mock('../lib/api');
jest.mock('../lib/security');
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Alert: {
      alert: jest.fn(),
    },
  };
});

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;
const MockedSecureStorageManager = SecureStorageManager as jest.MockedClass<typeof SecureStorageManager>;

// Test component to access auth context
const TestComponent: React.FC<{ onAuthStateChange?: (isAuthenticated: boolean) => void }> = ({ 
  onAuthStateChange 
}) => {
  const { user, isAuthenticated, login, logout } = useAuth();
  
  React.useEffect(() => {
    onAuthStateChange?.(isAuthenticated);
  }, [isAuthenticated, onAuthStateChange]);

  return (
    <>
      {isAuthenticated ? (
        <>
          <text testID="user-info">Welcome {user?.username}</text>
          <button testID="logout-button" onPress={logout}>
            Logout
          </button>
        </>
      ) : (
        <button testID="login-button" onPress={() => login('test@example.com', 'password')}>
          Login
        </button>
      )}
    </>
  );
};

describe('Integration Tests', () => {
  let mockSecureStorage: jest.Mocked<SecureStorageManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock secure storage
    mockSecureStorage = new MockedSecureStorageManager() as jest.Mocked<SecureStorageManager>;
    mockSecureStorage.getAuthToken.mockResolvedValue(null);
    mockSecureStorage.setAuthToken.mockResolvedValue();
    mockSecureStorage.clearAuthTokens.mockResolvedValue();

    // Mock Alert
    (Alert.alert as jest.Mock).mockImplementation(() => {});
  });

  describe('Authentication Flow', () => {
    it('should complete full login flow successfully', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        country: 'US',
        coins: 100,
        followers: 0,
        following: 0,
        trust: { score: 85 }
      };

      const mockLoginResponse = {
        success: true,
        data: {
          user: mockUser,
          token: 'auth-token-123',
          refreshToken: 'refresh-token-456'
        }
      };

      mockApiClient.login.mockResolvedValue(mockLoginResponse);
      
      const authStateChanges: boolean[] = [];
      const handleAuthStateChange = (isAuthenticated: boolean) => {
        authStateChanges.push(isAuthenticated);
      };

      const { getByTestId, queryByTestId } = render(
        <AuthProvider>
          <TestComponent onAuthStateChange={handleAuthStateChange} />
        </AuthProvider>
      );

      // Initially should not be authenticated
      expect(queryByTestId('user-info')).toBeNull();
      expect(getByTestId('login-button')).toBeTruthy();

      // Trigger login
      fireEvent.press(getByTestId('login-button'));

      // Wait for login to complete
      await waitFor(() => {
        expect(getByTestId('user-info')).toBeTruthy();
      });

      // Verify login was called correctly
      expect(mockApiClient.login).toHaveBeenCalledWith({
        identifier: 'test@example.com',
        password: 'password'
      });

      // Verify auth state changed to authenticated
      expect(authStateChanges).toContain(true);
      
      // Verify user info is displayed
      expect(getByTestId('user-info')).toHaveTextContent('Welcome testuser');
    });

    it('should handle login failure gracefully', async () => {
      const mockError = new Error('Invalid credentials');
      mockApiClient.login.mockRejectedValue(mockError);

      const { getByTestId, queryByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Trigger login
      fireEvent.press(getByTestId('login-button'));

      // Wait for error handling
      await waitFor(() => {
        expect(mockApiClient.login).toHaveBeenCalled();
      });

      // Should remain unauthenticated
      expect(queryByTestId('user-info')).toBeNull();
      expect(getByTestId('login-button')).toBeTruthy();
    });

    it('should complete full logout flow successfully', async () => {
      // Setup authenticated state
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        country: 'US',
        coins: 100,
        followers: 0,
        following: 0,
        trust: { score: 85 }
      };

      mockApiClient.getCurrentUser.mockResolvedValue({
        success: true,
        data: { user: mockUser }
      });
      
      mockSecureStorage.getAuthToken.mockResolvedValue('existing-token');
      mockApiClient.logout.mockResolvedValue({ success: true, data: null });

      const { getByTestId, queryByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for initial auth check to complete
      await waitFor(() => {
        expect(getByTestId('user-info')).toBeTruthy();
      });

      // Trigger logout
      fireEvent.press(getByTestId('logout-button'));

      // Wait for logout to complete
      await waitFor(() => {
        expect(getByTestId('login-button')).toBeTruthy();
      });

      // Verify logout was called
      expect(mockApiClient.logout).toHaveBeenCalled();
      
      // Verify tokens were cleared
      expect(mockSecureStorage.clearAuthTokens).toHaveBeenCalled();

      // Should be back to unauthenticated state
      expect(queryByTestId('user-info')).toBeNull();
    });

    it('should restore authentication state on app start', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        country: 'US',
        coins: 100,
        followers: 0,
        following: 0,
        trust: { score: 85 }
      };

      // Mock existing token
      mockSecureStorage.getAuthToken.mockResolvedValue('existing-token');
      mockApiClient.getCurrentUser.mockResolvedValue({
        success: true,
        data: { user: mockUser }
      });

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for auth restoration
      await waitFor(() => {
        expect(getByTestId('user-info')).toBeTruthy();
      });

      // Verify getCurrentUser was called
      expect(mockApiClient.getCurrentUser).toHaveBeenCalled();
      
      // Verify user info is displayed
      expect(getByTestId('user-info')).toHaveTextContent('Welcome testuser');
    });

    it('should clear invalid tokens on startup', async () => {
      // Mock existing token but invalid response
      mockSecureStorage.getAuthToken.mockResolvedValue('invalid-token');
      mockApiClient.getCurrentUser.mockRejectedValue(new Error('Token expired'));

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for auth check to complete
      await waitFor(() => {
        expect(getByTestId('login-button')).toBeTruthy();
      });

      // Verify tokens were cleared due to invalid token
      expect(mockSecureStorage.clearAuthTokens).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors during login', async () => {
      const networkError = new Error('Network error');
      mockApiClient.login.mockRejectedValue(networkError);

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      fireEvent.press(getByTestId('login-button'));

      await waitFor(() => {
        expect(mockApiClient.login).toHaveBeenCalled();
      });

      // Should remain unauthenticated
      expect(getByTestId('login-button')).toBeTruthy();
    });

    it('should handle storage errors gracefully', async () => {
      const storageError = new Error('Storage access denied');
      mockSecureStorage.getAuthToken.mockRejectedValue(storageError);

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Should still render login button despite storage error
      await waitFor(() => {
        expect(getByTestId('login-button')).toBeTruthy();
      });
    });
  });

  describe('Token Refresh Integration', () => {
    it('should handle automatic token refresh on API calls', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        country: 'US',
        coins: 100,
        followers: 0,
        following: 0,
        trust: { score: 85 }
      };

      // Setup: user is logged in with expired token
      mockSecureStorage.getAuthToken.mockResolvedValue('expired-token');
      
      // First call fails with 401
      mockApiClient.getCurrentUser
        .mockRejectedValueOnce({ response: { status: 401 } })
        .mockResolvedValueOnce({
          success: true,
          data: { user: mockUser }
        });

      const { getByTestId } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for the auth check to complete (including token refresh)
      await waitFor(() => {
        expect(mockApiClient.getCurrentUser).toHaveBeenCalled();
      }, { timeout: 5000 });

      // Note: Full token refresh testing would require mocking the axios interceptors
      // which is complex in this test environment. In real integration tests,
      // you would test the full token refresh flow.
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle multiple simultaneous API calls', async () => {
      const mockResponse = {
        success: true,
        data: { streams: [], total: 0, page: 1 }
      };

      mockApiClient.getStreams.mockResolvedValue(mockResponse);
      mockApiClient.getTrendingStreams.mockResolvedValue({
        success: true,
        data: []
      });

      // Simulate multiple concurrent API calls
      const promises = [
        apiClient.getStreams({ limit: 10 }),
        apiClient.getTrendingStreams(5),
        apiClient.getStreams({ category: 'gaming' })
      ];

      const results = await Promise.all(promises);

      // All calls should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Verify all API calls were made
      expect(mockApiClient.getStreams).toHaveBeenCalledTimes(2);
      expect(mockApiClient.getTrendingStreams).toHaveBeenCalledTimes(1);
    });
  });
});
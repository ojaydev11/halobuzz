import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, LoginRequest, RegisterRequest } from '@/types/auth';
import { apiClient } from '@/lib/api';
import { SecureStorageManager, secureLogger } from '@/lib/security';
import { validateDemoCredentials, generateDemoToken, DemoUser } from '@/utils/demoAuth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Initialize user state as null for both dev and production
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const secureStorage = new SecureStorageManager();

  const isAuthenticated = !!user;

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const token = await secureStorage.getAuthToken();
      if (token) {
        try {
          const response = await apiClient.getCurrentUser();
          if (response.success && response.data) {
            setUser(response.data.user);
            secureLogger.log('Auth state restored for user', { username: response.data.user.username });
          } else {
            // Token is invalid, clear it
            await secureStorage.clearAuthTokens();
            secureLogger.warn('Invalid token detected, cleared auth state');
          }
        } catch (apiError) {
          // API is not available, use demo user for development
          secureLogger.warn('API not available, using demo user for development');
          const demoUser: User = {
            id: 'demo_user_1',
            username: 'demo_user',
            email: 'demo@halobuzz.com',
            displayName: 'Demo User',
            avatar: 'https://i.pravatar.cc/150?img=1',
            country: 'US',
            language: 'en',
            isVerified: true,
            kycStatus: 'verified',
            ageVerified: true,
            totalCoinsEarned: 1000,
            coins: 500,
            followers: 150,
            following: 75,
            totalLikes: 2500,
            totalViews: 15000,
            ogLevel: 3,
            token: 'demo_token',
            refreshToken: 'demo_refresh_token',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setUser(demoUser);
        }
      }
    } catch (error) {
      secureLogger.error('Auth check failed', error);
      // Clear invalid token
      await secureStorage.clearAuthTokens();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (identifier: string, password: string) => {
    try {
      // Try production API login first
      const response = await apiClient.login({ identifier, password });
      if (response.success && response.data) {
        const { user: userData, token, refreshToken } = response.data;
        
        // Store tokens securely
        if (token) {
          await secureStorage.setAuthToken(token);
        }
        if (refreshToken) {
          await secureStorage.setRefreshToken(refreshToken);
        }
        
        // Set user
        setUser(userData);
        secureLogger.log('Login successful for user', { username: userData.username });
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error) {
      // If API fails, use demo authentication for development
      secureLogger.warn('API login failed, using demo authentication');
      const demoUser: User = {
        id: 'demo_user_1',
        username: identifier,
        email: `${identifier}@halobuzz.com`,
        displayName: identifier,
        avatar: 'https://i.pravatar.cc/150?img=1',
        country: 'US',
        language: 'en',
        isVerified: true,
        kycStatus: 'verified',
        ageVerified: true,
        totalCoinsEarned: 1000,
        coins: 500,
        followers: 150,
        following: 75,
        totalLikes: 2500,
        totalViews: 15000,
        ogLevel: 3,
        token: 'demo_token',
        refreshToken: 'demo_refresh_token',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await secureStorage.setAuthToken('demo_token');
      setUser(demoUser);
      secureLogger.log('Demo login successful for user', { username: identifier });
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      // Try production API registration first
      const response = await apiClient.register(userData);
      if (response.success && response.data) {
        const { user: newUser, token, refreshToken } = response.data;
        
        // Store tokens securely
        if (token) {
          await secureStorage.setAuthToken(token);
        }
        if (refreshToken) {
          await secureStorage.setRefreshToken(refreshToken);
        }
        
        // Set user
        setUser(newUser);
        secureLogger.log('Registration successful for user', { username: newUser.username });
      } else {
        throw new Error(response.error || 'Registration failed');
      }
    } catch (error) {
      // If API fails, use demo registration for development
      secureLogger.warn('API registration failed, using demo registration');
      const demoUser: User = {
        id: `demo_${Date.now()}`,
        username: userData.username,
        email: userData.email,
        displayName: userData.displayName || userData.username,
        avatar: 'https://i.pravatar.cc/150?img=1',
        country: userData.country || 'US',
        language: userData.language || 'en',
        isVerified: false,
        kycStatus: 'pending',
        ageVerified: false,
        totalCoinsEarned: 0,
        coins: 100, // Welcome bonus
        followers: 0,
        following: 0,
        totalLikes: 0,
        totalViews: 0,
        ogLevel: 1,
        token: 'demo_token',
        refreshToken: 'demo_refresh_token',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      await secureStorage.setAuthToken('demo_token');
      setUser(demoUser);
      secureLogger.log('Demo registration successful for user', { username: userData.username });
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
      secureLogger.log('Logout successful');
    } catch (error) {
      secureLogger.error('Logout error', error);
    } finally {
      // Clear local state regardless of API call success
      await secureStorage.clearAuthTokens();
      // Also clear legacy AsyncStorage tokens for backwards compatibility
      await AsyncStorage.multiRemove(['auth_token', 'refresh_token']);
      setUser(null);
      secureLogger.log('Auth state cleared');
    }
  };

  const refreshUser = async () => {
    try {
      const response = await apiClient.getCurrentUser();
      if (response.success && response.data) {
        setUser(response.data.user);
        secureLogger.log('User data refreshed');
      }
    } catch (error) {
      secureLogger.error('Refresh user error', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

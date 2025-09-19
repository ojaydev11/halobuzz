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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const secureStorage = new SecureStorageManager();

  const isAuthenticated = !!user;

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      // Skip auth check for development to prevent loading issues
      if (__DEV__) {
        console.log('Skipping auth check in development mode');
        // Set a demo user for development
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
        setIsLoading(false);
        return;
      }
      
      const token = await secureStorage.getAuthToken();
      if (token) {
        const response = await apiClient.getCurrentUser();
        if (response.success && response.data) {
          setUser(response.data.user);
          secureLogger.log('Auth state restored for user', { username: response.data.user.username });
        } else {
          // Token is invalid, clear it
          await secureStorage.clearAuthTokens();
          secureLogger.warn('Invalid token detected, cleared auth state');
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
      // Use demo authentication in development mode
      if (__DEV__) {
        const demoUser = validateDemoCredentials(identifier, password);
        if (demoUser) {
          const token = generateDemoToken(demoUser);
          await secureStorage.setAuthToken(token);
          
          // Convert DemoUser to User type
          const user: User = {
            id: demoUser.id,
            username: demoUser.username,
            email: demoUser.email,
            displayName: demoUser.displayName,
            avatar: demoUser.avatar,
            country: demoUser.country,
            language: demoUser.language,
            isVerified: demoUser.isVerified,
            kycStatus: demoUser.kycStatus,
            ageVerified: demoUser.ageVerified,
            totalCoinsEarned: demoUser.totalCoinsEarned,
            coins: demoUser.coins,
            followers: demoUser.followers,
            following: demoUser.following,
            totalLikes: demoUser.totalLikes,
            totalViews: demoUser.totalViews,
            ogLevel: demoUser.ogLevel
          };
          
          setUser(user);
          secureLogger.log('Demo login successful for user', { username: user.username });
          return;
        } else {
          throw new Error('Invalid demo credentials. Try: demo_user/Demo123! or test_user/Test123! or admin_demo/Admin123!');
        }
      }
      
      // Production API login
      const response = await apiClient.login({ identifier, password });
      if (response.success && response.data) {
        const { user: userData, token, refreshToken } = response.data;
        
        // Store tokens securely - this is handled by the API client now
        // but we keep this for backwards compatibility and explicit storage
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
      secureLogger.error('Login error', error);
      throw error;
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      // In development mode, simulate successful registration
      if (__DEV__) {
        // Create a demo user from registration data
        const demoUser: DemoUser = {
          id: `demo_${Date.now()}`,
          username: userData.username,
          email: userData.email,
          displayName: userData.displayName || userData.username,
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
          ogLevel: 1
        };
        
        const token = generateDemoToken(demoUser);
        await secureStorage.setAuthToken(token);
        
        // Convert DemoUser to User type
        const user: User = {
          id: demoUser.id,
          username: demoUser.username,
          email: demoUser.email,
          displayName: demoUser.displayName,
          avatar: demoUser.avatar,
          country: demoUser.country,
          language: demoUser.language,
          isVerified: demoUser.isVerified,
          kycStatus: demoUser.kycStatus,
          ageVerified: demoUser.ageVerified,
          totalCoinsEarned: demoUser.totalCoinsEarned,
          coins: demoUser.coins,
          followers: demoUser.followers,
          following: demoUser.following,
          totalLikes: demoUser.totalLikes,
          totalViews: demoUser.totalViews,
          ogLevel: demoUser.ogLevel
        };
        
        setUser(user);
        secureLogger.log('Demo registration successful for user', { username: user.username });
        return;
      }
      
      // Production API registration
      const response = await apiClient.register(userData);
      if (response.success && response.data) {
        const { user: newUser, token, refreshToken } = response.data;
        
        // Store tokens securely - this is handled by the API client now
        // but we keep this for backwards compatibility and explicit storage
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
      secureLogger.error('Registration error', error);
      throw error;
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

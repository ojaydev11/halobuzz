import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, LoginRequest, RegisterRequest } from '@/types/auth';
import { apiClient } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        const response = await apiClient.getCurrentUser();
        if (response.success && response.data) {
          setUser(response.data.user);
        } else {
          // Token is invalid, clear it
          await AsyncStorage.removeItem('auth_token');
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear invalid token
      await AsyncStorage.removeItem('auth_token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (identifier: string, password: string) => {
    try {
      const response = await apiClient.login({ identifier, password });
      if (response.success && response.data) {
        const { user: userData, token } = response.data;
        
        // Store token
        await AsyncStorage.setItem('auth_token', token);
        
        // Set user
        setUser(userData);
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      const response = await apiClient.register(userData);
      if (response.success && response.data) {
        const { user: newUser, token } = response.data;
        
        // Store token
        await AsyncStorage.setItem('auth_token', token);
        
        // Set user
        setUser(newUser);
      } else {
        throw new Error(response.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state regardless of API call success
      await AsyncStorage.multiRemove(['auth_token', 'refresh_token']);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await apiClient.getCurrentUser();
      if (response.success && response.data) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error('Refresh user error:', error);
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

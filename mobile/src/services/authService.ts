import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = 'http://localhost:3001/api';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
  phone?: string;
  country: string;
}

interface AuthResponse {
  user: {
    id: string;
    username: string;
    email: string;
    phone: string | null;
    avatar: string | null;
    ogTier: number;
    isVerified: boolean;
  };
  token: string;
}

class AuthService {
  private token: string | null = null;

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials);
      const { user, token } = response.data;
      
      await this.storeToken(token);
      this.token = token;
      
      return { user, token };
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Login failed. Please check your credentials.');
    }
  }

  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, userData);
      const { user, token } = response.data;
      
      await this.storeToken(token);
      this.token = token;
      
      return { user, token };
    } catch (error) {
      console.error('Registration error:', error);
      throw new Error('Registration failed. Please try again.');
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.token) {
        await axios.post(`${API_BASE_URL}/auth/logout`, {}, {
          headers: { Authorization: `Bearer ${this.token}` }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await this.removeToken();
      this.token = null;
    }
  }

  async checkAuthStatus(): Promise<AuthResponse> {
    try {
      const token = await this.getStoredToken();
      if (!token) {
        throw new Error('No token found');
      }

      const response = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const { user } = response.data;
      this.token = token;
      
      return { user, token };
    } catch (error) {
      console.error('Auth status check error:', error);
      await this.removeToken();
      throw new Error('Authentication failed');
    }
  }

  async refreshToken(): Promise<string> {
    try {
      const token = await this.getStoredToken();
      if (!token) {
        throw new Error('No token found');
      }

      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const { token: newToken } = response.data;
      await this.storeToken(newToken);
      this.token = newToken;
      
      return newToken;
    } catch (error) {
      console.error('Token refresh error:', error);
      await this.removeToken();
      throw new Error('Token refresh failed');
    }
  }

  async updateProfile(profileData: Partial<AuthResponse['user']>): Promise<AuthResponse['user']> {
    try {
      const token = await this.getStoredToken();
      if (!token) {
        throw new Error('No token found');
      }

      const response = await axios.put(`${API_BASE_URL}/auth/profile`, profileData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      return response.data.user;
    } catch (error) {
      console.error('Profile update error:', error);
      throw new Error('Profile update failed');
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const token = await this.getStoredToken();
      if (!token) {
        throw new Error('No token found');
      }

      await axios.put(`${API_BASE_URL}/auth/password`, {
        currentPassword,
        newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Password change error:', error);
      throw new Error('Password change failed');
    }
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email });
    } catch (error) {
      console.error('Forgot password error:', error);
      throw new Error('Password reset request failed');
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      await axios.post(`${API_BASE_URL}/auth/reset-password`, {
        token,
        newPassword
      });
    } catch (error) {
      console.error('Password reset error:', error);
      throw new Error('Password reset failed');
    }
  }

  async verifyEmail(token: string): Promise<void> {
    try {
      await axios.post(`${API_BASE_URL}/auth/verify-email`, { token });
    } catch (error) {
      console.error('Email verification error:', error);
      throw new Error('Email verification failed');
    }
  }

  async resendVerificationEmail(email: string): Promise<void> {
    try {
      await axios.post(`${API_BASE_URL}/auth/resend-verification`, { email });
    } catch (error) {
      console.error('Resend verification error:', error);
      throw new Error('Verification email resend failed');
    }
  }

  // Token management
  private async storeToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync('auth_token', token);
    } catch (error) {
      console.error('Token storage error:', error);
    }
  }

  private async getStoredToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('auth_token');
    } catch (error) {
      console.error('Token retrieval error:', error);
      return null;
    }
  }

  private async removeToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync('auth_token');
    } catch (error) {
      console.error('Token removal error:', error);
    }
  }

  // Utility methods
  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  // API request interceptor
  setupAxiosInterceptors() {
    axios.interceptors.request.use(
      async (config) => {
        const token = this.token || await this.getStoredToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            const newToken = await this.refreshToken();
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axios(originalRequest);
          } catch (refreshError) {
            await this.logout();
            throw refreshError;
          }
        }
        
        return Promise.reject(error);
      }
    );
  }
}

export const authService = new AuthService();

// Setup axios interceptors
authService.setupAxiosInterceptors();

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { SecureStorageManager } from '@/lib/security';
import { NetworkError } from './api';
import ApiErrorHandler from './apiErrorHandler';

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export class ApiClient {
  private client: AxiosInstance;
  private secureStorage: SecureStorageManager;
  private retryCount = 0;
  private maxRetries = 3;

  constructor(baseURL: string) {
    this.secureStorage = new SecureStorageManager();
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        // Add auth token if available
        const token = await this.secureStorage.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request timestamp
        config.metadata = { startTime: Date.now() };

        return config;
      },
      (error) => {
        return Promise.reject(this.createNetworkError(error));
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log response time
        const endTime = Date.now();
        const startTime = response.config.metadata?.startTime;
        if (startTime) {
          console.log(`API ${response.config.method?.toUpperCase()} ${response.config.url} - ${endTime - startTime}ms`);
        }

        return response;
      },
      async (error) => {
        const networkError = this.createNetworkError(error);
        
        // Handle token refresh for 401 errors
        if (error.response?.status === 401 && this.retryCount < this.maxRetries) {
          const refreshed = await this.refreshToken();
          if (refreshed) {
            this.retryCount++;
            return this.client.request(error.config);
          }
        }

        // Reset retry count on successful request
        this.retryCount = 0;

        return Promise.reject(networkError);
      }
    );
  }

  private createNetworkError(error: any): NetworkError {
    if (error.response) {
      // Server responded with error status
      return new NetworkError(
        error.response.data?.message || error.message || 'Server error',
        error.response.status,
        error.response.data?.code || 'SERVER_ERROR',
        error.response.data
      );
    } else if (error.request) {
      // Network error
      return new NetworkError(
        'Network error. Please check your connection.',
        0,
        'NETWORK_ERROR',
        { originalError: error.message }
      );
    } else {
      // Other error
      return new NetworkError(
        error.message || 'An unexpected error occurred',
        0,
        'UNKNOWN_ERROR',
        { originalError: error }
      );
    }
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const refreshToken = await this.secureStorage.getRefreshToken();
      if (!refreshToken) {
        return false;
      }

      const response = await this.client.post('/auth/refresh', {
        refreshToken,
      });

      if (response.data.success && response.data.data.token) {
        await this.secureStorage.setAuthToken(response.data.data.token);
        if (response.data.data.refreshToken) {
          await this.secureStorage.setRefreshToken(response.data.data.refreshToken);
        }
        return true;
      }

      return false;
    } catch (error) {
      // Clear invalid tokens
      await this.secureStorage.clearAuthTokens();
      return false;
    }
  }

  // HTTP Methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get(url, config);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message,
      };
    } catch (error) {
      throw this.createNetworkError(error);
    }
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post(url, data, config);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message,
      };
    } catch (error) {
      throw this.createNetworkError(error);
    }
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.put(url, data, config);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message,
      };
    } catch (error) {
      throw this.createNetworkError(error);
    }
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.delete(url, config);
      return {
        success: true,
        data: response.data.data || response.data,
        message: response.data.message,
      };
    } catch (error) {
      throw this.createNetworkError(error);
    }
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string; checks?: any[] }>> {
    return this.get('/health');
  }

  async simpleHealthCheck(): Promise<ApiResponse<{ status: string }>> {
    return this.get('/health/simple');
  }

  // Authentication methods
  async login(email: string, password: string): Promise<ApiResponse<{ user: any; token: string; refreshToken: string }>> {
    return this.post('/auth/login', { email, password });
  }

  async register(userData: any): Promise<ApiResponse<{ user: any; token: string; refreshToken: string }>> {
    return this.post('/auth/register', userData);
  }

  async logout(): Promise<ApiResponse<{ success: boolean }>> {
    try {
      await this.post('/auth/logout');
    } finally {
      await this.secureStorage.clearAuthTokens();
    }
    return { success: true, data: { success: true } };
  }

  // Stream methods
  async getStreams(page: number = 1, limit: number = 20): Promise<ApiResponse<PaginatedResponse<any>>> {
    return this.get(`/streams?page=${page}&limit=${limit}`);
  }

  async createStream(streamData: any): Promise<ApiResponse<any>> {
    return this.post('/streams', streamData);
  }

  async getAgoraToken(channelName: string): Promise<ApiResponse<{ token: string }>> {
    return this.post('/agora/token', { channelName });
  }

  // User methods
  async getUserProfile(userId: string): Promise<ApiResponse<any>> {
    return this.get(`/users/${userId}`);
  }

  async updateProfile(userData: any): Promise<ApiResponse<any>> {
    return this.put('/users/profile', userData);
  }

  // Utility methods
  setBaseURL(baseURL: string) {
    this.client.defaults.baseURL = baseURL;
  }

  setTimeout(timeout: number) {
    this.client.defaults.timeout = timeout;
  }
}

// Extend AxiosRequestConfig to include metadata
declare module 'axios' {
  interface AxiosRequestConfig {
    metadata?: {
      startTime: number;
    };
  }
}

export default ApiClient;

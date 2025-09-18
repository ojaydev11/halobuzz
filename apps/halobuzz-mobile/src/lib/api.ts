import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, InternalAxiosRequestConfig } from 'axios';

// Extend the InternalAxiosRequestConfig to include our custom properties
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiResponse, AuthResponse, LoginRequest, RegisterRequest, User } from '@/types/auth';
import { StreamsResponse, CreateStreamRequest, Stream } from '@/types/stream';
import { toast } from './toast';

// Get API configuration from environment
const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://halo-api-production.up.railway.app";
const API_PREFIX = process.env.EXPO_PUBLIC_API_PREFIX ?? "/api/v1";

// Ensure API base URL is HTTPS for production
if (!API_BASE.startsWith('https://')) {
  throw new Error('API base URL must use HTTPS for security');
}

interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

class NetworkError extends Error {
  status?: number;
  code?: string;
  
  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'NetworkError';
    this.status = status;
    this.code = code;
  }
}

class ApiClient {
  private client: AxiosInstance;
  private refreshTokenPromise: Promise<string | null> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE}${API_PREFIX}`,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'HaloBuzz-Mobile/1.0.0',
      },
      timeout: 15000,
      validateStatus: (status) => status < 500,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        try {
          // Add auth token
          const token = await AsyncStorage.getItem('auth_token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          
          // Add request ID for tracking
          config.headers['X-Request-ID'] = this.generateRequestId();
          
          // Log full URL in development
          if (__DEV__) {
            const fullUrl = `${config.baseURL}${config.url}`;
            console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${fullUrl}`);
          }
          
          return config;
        } catch (error) {
          console.error('Request interceptor error:', error);
          return config;
        }
      },
      (error) => {
        console.error('Request setup error:', error);
        return Promise.reject(this.formatError(error));
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        if (__DEV__) {
          console.log(`✅ API Response: ${response.status} ${response.config.url}`);
        }
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config;
        
        if (__DEV__) {
          console.error(`❌ API Error: ${error.response?.status} ${originalRequest?.url}`, 
            error.response?.data
          );
        }

        // Handle 401 Unauthorized - token refresh
        if (error.response?.status === 401 && originalRequest && !(originalRequest as CustomAxiosRequestConfig)._retry) {
          (originalRequest as CustomAxiosRequestConfig)._retry = true;
          
          try {
            if (!this.refreshTokenPromise) {
              this.refreshTokenPromise = this.handleTokenRefresh();
            }
            
            const newToken = await this.refreshTokenPromise;
            this.refreshTokenPromise = null;
            
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.client.request(originalRequest);
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            await this.clearAuth();
          }
        }
        
        // Show user-friendly error messages
        if (error.response?.status === 404) {
          toast.showApiError({
            status: 404,
            message: 'Server route not found — check API base/prefix in .env'
          });
        }
        
        return Promise.reject(this.formatError(error));
      }
    );
  }
  
  private generateRequestId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  
  private async handleTokenRefresh(): Promise<string | null> {
    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (!refreshToken) {
        return null;
      }
      
      // Use direct route instead of discovery
      const response = await this.client.post('/auth/refresh', { token: refreshToken });
      
      if (response.data?.success && response.data?.data?.token) {
        const newToken = response.data.data.token;
        await AsyncStorage.setItem('auth_token', newToken);
        return newToken;
      }
      
      return null;
    } catch (error) {
      console.error('Refresh token request failed:', error);
      return null;
    }
  }
  
  private async clearAuth(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(['auth_token', 'refresh_token']);
    } catch (error) {
      console.error('Failed to clear auth tokens:', error);
    }
  }
  
  private formatError(error: any): NetworkError {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error || 
                     error.response.data?.message || 
                     `Server error: ${status}`;
      return new NetworkError(message, status, error.response.data?.code);
    } else if (error.request) {
      return new NetworkError('Network error: Please check your connection', 0, 'NETWORK_ERROR');
    } else {
      return new NetworkError(error.message || 'An unexpected error occurred', 0, 'UNKNOWN_ERROR');
    }
  }

  // Auth endpoints with direct routes
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      if (__DEV__) {
        console.log('Login attempt:', { identifier: credentials.identifier });
        console.log('API Base:', API_BASE);
        console.log('API Prefix:', API_PREFIX);
      }
      
      // Use direct route instead of discovery
      const response = await this.client.post('/auth/login', credentials);
      
      if (response.data?.success && response.data?.data?.token) {
        await AsyncStorage.setItem('auth_token', response.data.data.token);
        if (response.data.data.refreshToken) {
          await AsyncStorage.setItem('refresh_token', response.data.data.refreshToken);
        }
      }
      
      return response.data;
    } catch (error) {
      if (__DEV__) {
        console.error('Login error details:', error);
        if (error instanceof Error && 'response' in error) {
          const axiosError = error as AxiosError;
          console.error('Response data:', axiosError.response?.data);
          console.error('Response status:', axiosError.response?.status);
        }
      }
      const networkError = this.formatError(error);
      toast.showApiError(networkError);
      throw networkError;
    }
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      if (__DEV__) {
        console.log('Register attempt:', { username: userData.username, email: userData.email });
        console.log('API Base:', API_BASE);
        console.log('API Prefix:', API_PREFIX);
      }
      
      // Use direct route instead of discovery
      const response = await this.client.post('/auth/register', userData);
      
      if (response.data?.success && response.data?.data?.token) {
        await AsyncStorage.setItem('auth_token', response.data.data.token);
        if (response.data.data.refreshToken) {
          await AsyncStorage.setItem('refresh_token', response.data.data.refreshToken);
        }
      }
      
      return response.data;
    } catch (error) {
      if (__DEV__) {
        console.error('Register error details:', error);
        if (error instanceof Error && 'response' in error) {
          const axiosError = error as AxiosError;
          console.error('Response data:', axiosError.response?.data);
          console.error('Response status:', axiosError.response?.status);
        }
      }
      const networkError = this.formatError(error);
      toast.showApiError(networkError);
      throw networkError;
    }
  }

  async getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
    try {
      // Use direct route
      const response = await this.client.get('/auth/me');
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      toast.showApiError(networkError);
      throw networkError;
    }
  }

  async refreshToken(token: string): Promise<ApiResponse<{ token: string }>> {
    try {
      const response = await this.client.post('/auth/refresh', { token });
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async logout(): Promise<ApiResponse<null>> {
    try {
      const response = await this.client.post('/auth/logout');
      await this.clearAuth();
      return response.data;
    } catch (error) {
      await this.clearAuth();
      throw this.formatError(error);
    }
  }

  // Stream endpoints
  async getStreams(params?: {
    category?: string;
    country?: string;
    limit?: number;
    page?: number;
    sortBy?: string;
  }): Promise<ApiResponse<StreamsResponse>> {
    try {
      const response = await this.client.get('/streams', { params });
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      toast.showApiError(networkError);
      throw networkError;
    }
  }

  async getTrendingStreams(limit: number = 10): Promise<ApiResponse<Stream[]>> {
    try {
      const response = await this.client.get('/streams/trending', { params: { limit } });
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      toast.showApiError(networkError);
      throw networkError;
    }
  }

  async getStreamById(id: string): Promise<ApiResponse<{ stream: Stream }>> {
    try {
      const response = await this.client.get(`/streams/${id}`);
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      toast.showApiError(networkError);
      throw networkError;
    }
  }

  async createStream(streamData: CreateStreamRequest): Promise<ApiResponse<{ stream: Stream }>> {
    try {
      const response = await this.client.post('/streams', streamData);
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      toast.showApiError(networkError);
      throw networkError;
    }
  }

  async endStream(id: string): Promise<ApiResponse<{ stream: Stream }>> {
    try {
      const response = await this.client.post(`/streams/${id}/end`);
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      toast.showApiError(networkError);
      throw networkError;
    }
  }

  async getUserStreams(userId: string, params?: {
    limit?: number;
    page?: number;
  }): Promise<ApiResponse<StreamsResponse>> {
    try {
      const response = await this.client.get(`/streams/user/${userId}`, { params });
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      toast.showApiError(networkError);
      throw networkError;
    }
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string; checks?: any[] }>> {
    try {
      const response = await this.client.get('/monitoring/health', {
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      toast.showApiError(networkError);
      throw networkError;
    }
  }

  // Simple health check
  async simpleHealthCheck(): Promise<ApiResponse<{ status: string }>> {
    try {
      const response = await this.client.get('/health', {
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      throw networkError;
    }
  }

  // Stream interactions
  async likeStream(streamId: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const response = await this.client.post(`/streams/${streamId}/like`);
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      toast.showApiError(networkError);
      throw networkError;
    }
  }

  // User interactions
  async followUser(userId: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const response = await this.client.post(`/users/${userId}/follow`);
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      toast.showApiError(networkError);
      throw networkError;
    }
  }

  // Generic HTTP methods
  async get(url: string, config?: AxiosRequestConfig): Promise<any> {
    try {
      const response = await this.client.get(url, config);
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      throw networkError;
    }
  }

  async post(url: string, data?: any, config?: AxiosRequestConfig): Promise<any> {
    try {
      const response = await this.client.post(url, data, config);
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      throw networkError;
    }
  }

  // Get Agora RTC token for live streaming
  async getAgoraToken(channelName: string, uid: number = 0): Promise<ApiResponse<{ token: string }>> {
    try {
      const response = await this.client.post('/agora/token', {
        channelName,
        uid,
        role: 'publisher'
      });
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      toast.showApiError(networkError);
      throw networkError;
    }
  }

  // Utility method to clear route cache (no longer needed with direct routes)
  async clearRouteCache(): Promise<void> {
    // No longer needed since we use direct routes
  }

  // Get discovered routes for debugging (no longer needed with direct routes)
  getDiscoveredRoutes(): any {
    return {};
  }

  // Search functionality
  async search(query: string, filters: {
    type?: 'all' | 'users' | 'streams' | 'reels' | 'hashtags';
    category?: string;
    isLive?: boolean;
    minFollowers?: number;
    maxFollowers?: number;
    dateRange?: 'today' | 'week' | 'month' | 'year' | 'all';
    sortBy?: 'relevance' | 'popularity' | 'date' | 'followers';
    limit?: number;
    offset?: number;
  } = {}): Promise<ApiResponse<any>> {
    try {
      const params = new URLSearchParams();
      params.append('q', query);
      
      if (filters.type) params.append('type', filters.type);
      if (filters.category) params.append('category', filters.category);
      if (filters.isLive !== undefined) params.append('isLive', filters.isLive.toString());
      if (filters.minFollowers) params.append('minFollowers', filters.minFollowers.toString());
      if (filters.maxFollowers) params.append('maxFollowers', filters.maxFollowers.toString());
      if (filters.dateRange) params.append('dateRange', filters.dateRange);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());

      const response = await this.client.get(`/search?${params.toString()}`);
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      throw networkError;
    }
  }

  async getSearchSuggestions(query: string, limit: number = 5): Promise<ApiResponse<{ suggestions: string[] }>> {
    try {
      const response = await this.client.get(`/search/suggestions?q=${encodeURIComponent(query)}&limit=${limit}`);
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      throw networkError;
    }
  }

  async getTrendingHashtags(limit: number = 10): Promise<ApiResponse<{ hashtags: Array<{ tag: string; count: number; trending: boolean }> }>> {
    try {
      const response = await this.client.get(`/search/trending/hashtags?limit=${limit}`);
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      throw networkError;
    }
  }

  async searchUsers(query: string, filters: {
    minFollowers?: number;
    maxFollowers?: number;
    sortBy?: 'relevance' | 'popularity' | 'followers';
    limit?: number;
    offset?: number;
  } = {}): Promise<ApiResponse<{ users: any[] }>> {
    try {
      const params = new URLSearchParams();
      params.append('q', query);
      
      if (filters.minFollowers) params.append('minFollowers', filters.minFollowers.toString());
      if (filters.maxFollowers) params.append('maxFollowers', filters.maxFollowers.toString());
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());

      const response = await this.client.get(`/search/users?${params.toString()}`);
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      throw networkError;
    }
  }

  async searchStreams(query: string, filters: {
    category?: string;
    isLive?: boolean;
    sortBy?: 'relevance' | 'popularity' | 'date';
    limit?: number;
    offset?: number;
  } = {}): Promise<ApiResponse<{ streams: any[] }>> {
    try {
      const params = new URLSearchParams();
      params.append('q', query);
      
      if (filters.category) params.append('category', filters.category);
      if (filters.isLive !== undefined) params.append('isLive', filters.isLive.toString());
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());

      const response = await this.client.get(`/search/streams?${params.toString()}`);
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      throw networkError;
    }
  }

  async searchReels(query: string, filters: {
    category?: string;
    dateRange?: 'today' | 'week' | 'month' | 'year' | 'all';
    sortBy?: 'relevance' | 'popularity' | 'date';
    limit?: number;
    offset?: number;
  } = {}): Promise<ApiResponse<{ reels: any[] }>> {
    try {
      const params = new URLSearchParams();
      params.append('q', query);
      
      if (filters.category) params.append('category', filters.category);
      if (filters.dateRange) params.append('dateRange', filters.dateRange);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.offset) params.append('offset', filters.offset.toString());

      const response = await this.client.get(`/search/reels?${params.toString()}`);
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      throw networkError;
    }
  }
}

export const apiClient = new ApiClient();

// Simplified axios instance export
export const api = axios.create({
  baseURL: `${API_BASE}${API_PREFIX}`,
  headers: { 'Content-Type': 'application/json' },
});

// (Dev only) print what we're using so we can see it in Metro logs:
if (__DEV__) {
  console.log("API baseURL:", api.defaults.baseURL);
}

api.interceptors.request.use((config) => {
  if (__DEV__) {
    const base = config.baseURL?.replace(/\/+$/,'') ?? '';
    const path = (config.url ?? '').replace(/^\/+/, '');
    console.log("API Request:", (config.method||"GET").toUpperCase(), `${base}/${path}`);
  }
  return config;
});

export default apiClient;

// Export health check function
export const health = {
  check: () => apiClient.healthCheck(),
  simpleCheck: () => apiClient.simpleHealthCheck()
};

// Export types for error handling
export { NetworkError, type ApiError };
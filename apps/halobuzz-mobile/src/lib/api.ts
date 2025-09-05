import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiResponse, AuthResponse, LoginRequest, RegisterRequest, User } from '@/types/auth';
import { StreamsResponse, CreateStreamRequest, Stream } from '@/types/stream';
import { routeDiscovery } from './routeDiscovery';
import { toast } from './toast';

// Get API configuration from environment
const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://p01--halo-api--6jbmvhzxwv4y.code.run";
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
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          originalRequest._retry = true;
          
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
      
      // Use route discovery for refresh endpoint
      const refreshRoute = await routeDiscovery.discoverRoute(
        API_BASE,
        'auth',
        'refresh',
        'POST',
        { token: refreshToken },
        API_PREFIX
      );
      
      const response = await axios.post(`${API_BASE}${refreshRoute}`, 
        { token: refreshToken },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        }
      );
      
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

  // Auth endpoints with route discovery
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      if (__DEV__) {
        console.log('Login attempt:', { identifier: credentials.identifier });
      }
      
      // Discover login route
      const loginRoute = await routeDiscovery.discoverRoute(
        API_BASE,
        'auth',
        'login',
        'POST',
        credentials,
        API_PREFIX
      );
      
      const response = await this.client.post(loginRoute, credentials);
      
      if (response.data?.success && response.data?.data?.token) {
        await AsyncStorage.setItem('auth_token', response.data.data.token);
        if (response.data.data.refreshToken) {
          await AsyncStorage.setItem('refresh_token', response.data.data.refreshToken);
        }
      }
      
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      toast.showApiError(networkError);
      throw networkError;
    }
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      if (__DEV__) {
        console.log('Register attempt:', { username: userData.username, email: userData.email });
      }
      
      // Discover register route
      const registerRoute = await routeDiscovery.discoverRoute(
        API_BASE,
        'auth',
        'register',
        'POST',
        userData,
        API_PREFIX
      );
      
      const response = await this.client.post(registerRoute, userData);
      
      if (response.data?.success && response.data?.data?.token) {
        await AsyncStorage.setItem('auth_token', response.data.data.token);
        if (response.data.data.refreshToken) {
          await AsyncStorage.setItem('refresh_token', response.data.data.refreshToken);
        }
      }
      
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      toast.showApiError(networkError);
      throw networkError;
    }
  }

  async getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
    try {
      // Use discovered route or fallback
      const meRoute = routeDiscovery.getRoute(API_BASE, 'auth', 'me', 'GET');
      const response = await this.client.get(meRoute);
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      toast.showApiError(networkError);
      throw networkError;
    }
  }

  async refreshToken(token: string): Promise<ApiResponse<{ token: string }>> {
    try {
      const refreshRoute = routeDiscovery.getRoute(API_BASE, 'auth', 'refresh', 'POST');
      const response = await this.client.post(refreshRoute, { token });
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async logout(): Promise<ApiResponse<null>> {
    try {
      const logoutRoute = routeDiscovery.getRoute(API_BASE, 'auth', 'logout', 'POST');
      const response = await this.client.post(logoutRoute);
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
      const streamsRoute = routeDiscovery.getRoute(API_BASE, 'streams', 'list', 'GET');
      const response = await this.client.get(streamsRoute, { params });
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      toast.showApiError(networkError);
      throw networkError;
    }
  }

  async getTrendingStreams(limit: number = 10): Promise<ApiResponse<Stream[]>> {
    try {
      const trendingRoute = routeDiscovery.getRoute(API_BASE, 'streams', 'trending', 'GET');
      const response = await this.client.get(trendingRoute, { params: { limit } });
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      toast.showApiError(networkError);
      throw networkError;
    }
  }

  async getStreamById(id: string): Promise<ApiResponse<{ stream: Stream }>> {
    try {
      const streamsRoute = routeDiscovery.getRoute(API_BASE, 'streams', 'get', 'GET');
      const response = await this.client.get(`${streamsRoute}/${id}`);
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      toast.showApiError(networkError);
      throw networkError;
    }
  }

  async createStream(streamData: CreateStreamRequest): Promise<ApiResponse<{ stream: Stream }>> {
    try {
      const streamsRoute = routeDiscovery.getRoute(API_BASE, 'streams', 'create', 'POST');
      const response = await this.client.post(streamsRoute, streamData);
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      toast.showApiError(networkError);
      throw networkError;
    }
  }

  async endStream(id: string): Promise<ApiResponse<{ stream: Stream }>> {
    try {
      const streamsRoute = routeDiscovery.getRoute(API_BASE, 'streams', 'get', 'POST');
      const response = await this.client.post(`${streamsRoute}/${id}/end`);
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
      const streamsRoute = routeDiscovery.getRoute(API_BASE, 'streams', 'list', 'GET');
      const response = await this.client.get(`${streamsRoute}/user/${userId}`, { params });
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      toast.showApiError(networkError);
      throw networkError;
    }
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string }>> {
    try {
      const healthRoute = routeDiscovery.getRoute(API_BASE, 'health', 'check', 'GET');
      const response = await this.client.get(healthRoute, {
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      toast.showApiError(networkError);
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

  // Utility method to clear route cache
  async clearRouteCache(): Promise<void> {
    await routeDiscovery.clearCache();
  }

  // Get discovered routes for debugging
  getDiscoveredRoutes(): any {
    return routeDiscovery.getDiscoveredRoutes();
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

// Export types for error handling
export { NetworkError, type ApiError };
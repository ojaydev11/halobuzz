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
import { getConfig } from '@/config/development';

// Get configuration based on environment
const config = getConfig();

// Get API configuration from environment - DEVELOPMENT MODE SUPPORT
const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? config.API_BASE_URL;
const rawPrefix = process.env.EXPO_PUBLIC_API_PREFIX ?? config.API_PREFIX;
const API_PREFIX = rawPrefix && rawPrefix.trim().length > 0 ? rawPrefix : config.API_PREFIX;
// DEVELOPMENT MODE - Use local server when available
const USE_MOCK_AUTH = config.USE_MOCK_DATA;

// Ensure API base URL is HTTPS for production, HTTP for development
const isDevelopment = __DEV__ || config.DEV_MODE;
if (!isDevelopment && !API_BASE.startsWith('https://')) {
  throw new Error('API base URL must use HTTPS for production security');
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
      timeout: config.NETWORK_TIMEOUT,
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
          if (config.DEBUG_NETWORK) {
            const fullUrl = `${config.baseURL}${config.url}`;
            console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${fullUrl}`);
            console.log(`📡 Development Mode: ${isDevelopment ? 'ON' : 'OFF'}`);
            console.log(`🔗 API Base: ${API_BASE}`);
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
        if (config.DEBUG_NETWORK) {
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
          if (config.DEBUG_NETWORK) {
            console.warn('🔍 404 Error - Server route not found. Check if backend is running and API routes are correct.');
            console.warn(`🔗 Trying to reach: ${API_BASE}${API_PREFIX}`);
            console.warn(`📱 Development Mode: ${isDevelopment ? 'ON' : 'OFF'}`);
          }
        } else if (error.code === 'ECONNREFUSED' || error.code === 'NETWORK_ERROR') {
          if (config.DEBUG_NETWORK) {
            console.warn('🌐 Network Error - Backend server may not be running. Using offline mode.');
            console.warn(`🔗 Server: ${API_BASE}${API_PREFIX}`);
            console.warn('💡 Tip: Start your backend server or use offline mode');
          }
        } else if (error.code === 'TIMEOUT') {
          if (config.DEBUG_NETWORK) {
            console.warn('⏱️ Request Timeout - Server is taking too long to respond.');
            console.warn(`⏰ Timeout: ${config.NETWORK_TIMEOUT}ms`);
          }
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
      const networkError = this.formatError(error);
      throw networkError;
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

  async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await this.client.post('/auth/forgot-password', { email });
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      toast.showApiError(networkError);
      throw networkError;
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await this.client.post('/auth/reset-password', { 
        token, 
        password: newPassword 
      });
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      toast.showApiError(networkError);
      throw networkError;
    }
  }

  async verifyEmail(token: string): Promise<ApiResponse<{ message: string }>> {
    try {
      const response = await this.client.post('/auth/verify-email', { token });
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      toast.showApiError(networkError);
      throw networkError;
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
      const response = await this.client.get('/health', {
        timeout: 5000
      });
      return response.data;
    } catch (error) {
      console.log('Health check failed, using fallback');
      // Return a fallback health status instead of throwing
      return {
        success: true,
        data: {
          status: 'degraded',
          checks: [
            { service: 'api', status: 'ok' },
            { service: 'database', status: 'unknown' },
            { service: 'redis', status: 'unknown' }
          ]
        }
      };
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
      console.log('Simple health check failed, using fallback');
      // Return a fallback health status instead of throwing
      return {
        success: true,
        data: { status: 'degraded' }
      };
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

  async unfollowUser(userId: string): Promise<ApiResponse<{ success: boolean }>> {
    try {
      const response = await this.client.post(`/users/${userId}/unfollow`);
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      toast.showApiError(networkError);
      throw networkError;
    }
  }

  async getUserProfile(userId: string): Promise<ApiResponse<{ 
    user: any;
    followers?: number;
    following?: number;
    totalLikes?: number;
    totalStreams?: number;
    isFollowing?: boolean;
    isLiked?: boolean;
  }>> {
    try {
      const response = await this.client.get(`/users/${userId}`);
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      toast.showApiError(networkError);
      throw networkError;
    }
  }

  async put(url: string, data?: any, config?: AxiosRequestConfig): Promise<any> {
    try {
      const response = await this.client.put(url, data, config);
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
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

  async getWallet(): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get('/wallet');
      return response.data;
    } catch (error) {
      const networkError = this.formatError(error);
      toast.showApiError(networkError);
      throw networkError;
    }
  }

  // Advanced Games API endpoints
  async getAdvancedGames(): Promise<any> {
    try {
      const response = await this.client.get('/advanced-games/list');
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async joinGame(gameId: string, sessionId: string): Promise<any> {
    try {
      const response = await this.client.post(`/advanced-games/${gameId}/join`, { sessionId });
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async leaveGame(gameId: string, sessionId: string): Promise<any> {
    try {
      const response = await this.client.post(`/advanced-games/${gameId}/leave`, { sessionId });
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async getGameSessions(gameId: string): Promise<any> {
    try {
      const response = await this.client.get(`/advanced-games/${gameId}/sessions`);
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async submitGameAction(gameId: string, sessionId: string, action: any): Promise<any> {
    try {
      const response = await this.client.post(`/advanced-games/${gameId}/action`, { sessionId, action });
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  // AI Opponents API endpoints
  async getAIOpponents(): Promise<any> {
    try {
      const response = await this.client.get('/ai-opponents/list');
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async challengeAI(opponentId: string, gameType: string): Promise<any> {
    try {
      const response = await this.client.post('/ai-opponents/challenge', { opponentId, gameType });
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async getAIMatchHistory(): Promise<any> {
    try {
      const response = await this.client.get('/ai-opponents/match-history');
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  // Social API endpoints
  async getFriends(): Promise<any> {
    try {
      const response = await this.client.get('/social/friends');
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async sendFriendRequest(userId: string): Promise<any> {
    try {
      const response = await this.client.post('/social/friends/request', { userId });
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async acceptFriendRequest(requestId: string): Promise<any> {
    try {
      const response = await this.client.post(`/social/friends/accept/${requestId}`);
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async getGuilds(): Promise<any> {
    try {
      const response = await this.client.get('/social/guilds');
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async joinGuild(guildId: string): Promise<any> {
    try {
      const response = await this.client.post(`/social/guilds/join/${guildId}`);
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async createGuild(guildData: any): Promise<any> {
    try {
      const response = await this.client.post('/social/guilds/create', guildData);
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async sendGameInvite(userId: string, gameType: string): Promise<any> {
    try {
      const response = await this.client.post('/social/invites/send', { userId, gameType });
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async getGameInvites(): Promise<any> {
    try {
      const response = await this.client.get('/social/invites');
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  // Tournaments API endpoints
  async getTournaments(): Promise<any> {
    try {
      const response = await this.client.get('/tournaments');
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async joinTournament(tournamentId: string): Promise<any> {
    try {
      const response = await this.client.post(`/tournaments/${tournamentId}/join`);
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async getTournamentStatus(tournamentId: string): Promise<any> {
    try {
      const response = await this.client.get(`/tournaments/${tournamentId}/status`);
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  // Leaderboards API endpoints
  async getLeaderboards(gameType?: string, period?: string): Promise<any> {
    try {
      const params: any = {};
      if (gameType) params.gameType = gameType;
      if (period) params.period = period;
      const response = await this.client.get('/leaderboards', { params });
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async getUserRank(gameType?: string): Promise<any> {
    try {
      const params: any = {};
      if (gameType) params.gameType = gameType;
      const response = await this.client.get('/leaderboards/user-rank', { params });
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  // Achievements API endpoints
  async getAchievements(): Promise<any> {
    try {
      const response = await this.client.get('/achievements');
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async getUserAchievements(): Promise<any> {
    try {
      const response = await this.client.get('/achievements/user');
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async claimAchievement(achievementId: string): Promise<any> {
    try {
      const response = await this.client.post(`/achievements/${achievementId}/claim`);
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  // Monetization API endpoints
  async getCurrencyBalance(): Promise<any> {
    try {
      const response = await this.client.get('/monetization/currency/balance');
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async getInventory(): Promise<any> {
    try {
      const response = await this.client.get('/monetization/inventory');
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async getIAPProducts(): Promise<any> {
    try {
      const response = await this.client.get('/monetization/products');
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async getFeaturedProducts(): Promise<any> {
    try {
      const response = await this.client.get('/monetization/products/featured');
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async processPurchase(productId: string, receiptData?: any): Promise<any> {
    try {
      const response = await this.client.post('/monetization/purchase', { productId, receiptData });
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async getBattlePasses(): Promise<any> {
    try {
      const response = await this.client.get('/monetization/battle-pass');
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async getBattlePassProgress(battlePassId: string): Promise<any> {
    try {
      const response = await this.client.get(`/monetization/battle-pass/${battlePassId}/progress`);
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async purchaseBattlePass(battlePassId: string, useGems: boolean = false): Promise<any> {
    try {
      const response = await this.client.post(`/monetization/battle-pass/${battlePassId}/purchase`, { useGems });
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async claimBattlePassReward(battlePassId: string, tier: number): Promise<any> {
    try {
      const response = await this.client.post(`/monetization/battle-pass/${battlePassId}/claim/${tier}`);
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async getLootBoxes(): Promise<any> {
    try {
      const response = await this.client.get('/monetization/loot-boxes');
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async openLootBox(lootBoxId: string): Promise<any> {
    try {
      const response = await this.client.post(`/monetization/loot-boxes/${lootBoxId}/open`);
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async getDailyRewards(): Promise<any> {
    try {
      const response = await this.client.get('/monetization/daily-rewards');
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async claimDailyReward(day: number): Promise<any> {
    try {
      const response = await this.client.post(`/monetization/daily-rewards/${day}/claim`);
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async addCurrency(currency: any, source: string = 'reward'): Promise<any> {
    try {
      const response = await this.client.post('/monetization/currency/add', { currency, source });
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  // Admin Moderation API endpoints
  async getModerationFlags(params?: any): Promise<any> {
    try {
      const response = await this.client.get('/admin/moderation/flags', { params });
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async getModerationStats(): Promise<any> {
    try {
      const response = await this.client.get('/admin/moderation/stats');
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async processModerationFlag(flagData: any): Promise<any> {
    try {
      const response = await this.client.post('/admin/moderation/process-flag', flagData);
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async assignModerationFlag(flagId: string, moderatorId: string): Promise<any> {
    try {
      const response = await this.client.post(`/admin/moderation/assign/${flagId}`, { moderatorId });
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async updateAutoModerationSettings(settings: any): Promise<any> {
    try {
      const response = await this.client.put('/admin/settings/auto-moderation', settings);
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async getBannedUsers(params?: any): Promise<any> {
    try {
      const response = await this.client.get('/admin/users/banned', { params });
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async unbanUser(userId: string): Promise<any> {
    try {
      const response = await this.client.post(`/admin/users/${userId}/unban`);
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async getModerationAuditLog(params?: any): Promise<any> {
    try {
      const response = await this.client.get('/admin/moderation/audit-log', { params });
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async getContentReports(params?: any): Promise<any> {
    try {
      const response = await this.client.get('/admin/content/reports', { params });
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async reportContent(reportData: any): Promise<any> {
    try {
      const response = await this.client.post('/reports/create', reportData);
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async getSystemStats(): Promise<any> {
    try {
      const response = await this.client.get('/admin/stats/system');
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async getAnalyticsDashboard(): Promise<any> {
    try {
      const response = await this.client.get('/admin/analytics/dashboard');
      return response.data;
    } catch (error) {
      throw this.formatError(error);
    }
  }

  async createModerationAction(actionData: any): Promise<any> {
    try {
      const response = await this.client.post('/admin/moderation/actions', actionData);
      return response.data;
    } catch (error) {
      throw this.formatError(error);
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

// Export health check functions
export const healthCheck = () => apiClient.healthCheck();
export const simpleHealthCheck = () => apiClient.simpleHealthCheck();

// Export types for error handling
export { NetworkError, type ApiError };
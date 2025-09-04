import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiResponse, AuthResponse, LoginRequest, RegisterRequest, User } from '@/types/auth';
import { StreamsResponse, CreateStreamRequest, Stream } from '@/types/stream';
import { HealthStatus } from '@/types/monitoring';

const API_BASE = 
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Constants.expoConfig?.extra as any)?.apiBaseUrl ??
  (Constants.expoConfig?.extra as any)?.apiBase ??
  'https://halobuzz-api-proxy.ojayshah123.workers.dev/';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired, try to refresh
          try {
            const refreshToken = await AsyncStorage.getItem('refresh_token');
            if (refreshToken) {
              const response = await this.refreshToken(refreshToken);
              if (response.success) {
                await AsyncStorage.setItem('auth_token', response.data.token);
                // Retry the original request
                return this.client.request(error.config);
              }
            }
          } catch (refreshError) {
            // Refresh failed, clear tokens and redirect to login
            await AsyncStorage.multiRemove(['auth_token', 'refresh_token']);
            // You might want to emit an event here to trigger logout
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await this.client.post('/auth/login', credentials);
    return response.data;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await this.client.post('/auth/register', userData);
    return response.data;
  }

  async getCurrentUser(): Promise<ApiResponse<{ user: User }>> {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  async refreshToken(token: string): Promise<ApiResponse<{ token: string }>> {
    const response = await this.client.post('/auth/refresh', { token });
    return response.data;
  }

  async logout(): Promise<ApiResponse<null>> {
    const response = await this.client.post('/auth/logout');
    return response.data;
  }

  // Stream endpoints
  async getStreams(params?: {
    category?: string;
    country?: string;
    limit?: number;
    page?: number;
    sortBy?: string;
  }): Promise<ApiResponse<StreamsResponse>> {
    const response = await this.client.get('/streams', { params });
    return response.data;
  }

  async getTrendingStreams(limit: number = 10): Promise<ApiResponse<Stream[]>> {
    const response = await this.client.get('/streams/trending', { params: { limit } });
    return response.data;
  }

  async getStreamById(id: string): Promise<ApiResponse<{ stream: Stream }>> {
    const response = await this.client.get(`/streams/${id}`);
    return response.data;
  }

  async createStream(streamData: CreateStreamRequest): Promise<ApiResponse<{ stream: Stream }>> {
    const response = await this.client.post('/streams', streamData);
    return response.data;
  }

  async endStream(id: string): Promise<ApiResponse<{ stream: Stream }>> {
    const response = await this.client.post(`/streams/${id}/end`);
    return response.data;
  }

  async getUserStreams(userId: string, params?: {
    limit?: number;
    page?: number;
  }): Promise<ApiResponse<StreamsResponse>> {
    const response = await this.client.get(`/streams/user/${userId}`, { params });
    return response.data;
  }

  // Health check - comprehensive monitoring endpoint
  async healthCheck(): Promise<ApiResponse<HealthStatus>> {
    const response = await this.client.get('/api/v1/monitoring/health');
    return response.data;
  }

  // Simple health check for basic connectivity
  async simpleHealthCheck(): Promise<ApiResponse<{ status: string }>> {
    const response = await this.client.get('/healthz');
    return response.data;
  }
}

export const apiClient = new ApiClient();
export default apiClient;

// Simple health check function for smoke testing
export async function health() {
  const r = await fetch(`${API_BASE}api/v1/monitoring/health`);
  if (!r.ok) throw new Error(`Health failed: ${r.status}`);
  return r.json();
}

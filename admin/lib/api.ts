import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { apiConfig, endpoints } from './api-config';

class AdminAPIClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: apiConfig.baseURL,
      timeout: apiConfig.timeout,
      headers: apiConfig.headers,
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication methods
  async login(identifier: string, password: string): Promise<any> {
    const response = await this.client.post(endpoints.auth.login, {
      identifier,
      password,
    });
    
    if (response.data.success) {
      this.token = response.data.data.token;
      if (this.token) {
        localStorage.setItem('admin_token', this.token);
      }
    }
    
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.client.post(endpoints.auth.logout);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.token = null;
      localStorage.removeItem('admin_token');
    }
  }

  setToken(token: string): void {
    this.token = token;
    localStorage.setItem('admin_token', token);
  }

  getToken(): string | null {
    return this.token || localStorage.getItem('admin_token');
  }

  // Admin dashboard data methods
  async getDashboardStats(): Promise<any> {
    const response = await this.client.get(endpoints.admin.stats);
    return response.data;
  }

  async getUsers(params?: any): Promise<any> {
    const response = await this.client.get(endpoints.admin.users, { params });
    return response.data;
  }

  async getUserById(id: string): Promise<any> {
    const response = await this.client.get(`${endpoints.admin.users}/${id}`);
    return response.data;
  }

  async updateUser(id: string, data: any): Promise<any> {
    const response = await this.client.put(`${endpoints.admin.users}/${id}`, data);
    return response.data;
  }

  async banUser(id: string, reason: string): Promise<any> {
    const response = await this.client.post(`${endpoints.admin.users}/${id}/ban`, {
      reason,
    });
    return response.data;
  }

  async getTransactions(params?: any): Promise<any> {
    const response = await this.client.get(endpoints.admin.transactions, { params });
    return response.data;
  }

  async getModerationStats(): Promise<any> {
    const response = await this.client.get(`${endpoints.admin.moderation}/stats`);
    return response.data;
  }

  async getModerationFlags(): Promise<any> {
    const response = await this.client.get(`${endpoints.admin.moderation}/flags`);
    return response.data;
  }

  async updateModerationFlag(id: string, status: string): Promise<any> {
    const response = await this.client.put(`${endpoints.admin.moderation}/flags/${id}`, {
      status,
    });
    return response.data;
  }

  async getPricing(): Promise<any> {
    const response = await this.client.get(endpoints.admin.pricing);
    return response.data;
  }

  async updatePricing(data: any): Promise<any> {
    const response = await this.client.put(endpoints.admin.pricing, data);
    return response.data;
  }

  async getFestivals(): Promise<any> {
    const response = await this.client.get(endpoints.admin.festivals);
    return response.data;
  }

  async createFestival(data: any): Promise<any> {
    const response = await this.client.post(endpoints.admin.festivals, data);
    return response.data;
  }

  async updateFestival(id: string, data: any): Promise<any> {
    const response = await this.client.put(`${endpoints.admin.festivals}/${id}`, data);
    return response.data;
  }

  async toggleFestival(id: string): Promise<any> {
    const response = await this.client.post(`${endpoints.admin.festivals}/${id}/toggle`);
    return response.data;
  }

  async getGifts(): Promise<any> {
    const response = await this.client.get(endpoints.admin.gifts);
    return response.data;
  }

  async createGift(data: any): Promise<any> {
    const response = await this.client.post(endpoints.admin.gifts, data);
    return response.data;
  }

  async updateGift(id: string, data: any): Promise<any> {
    const response = await this.client.put(`${endpoints.admin.gifts}/${id}`, data);
    return response.data;
  }

  // Health check methods
  async checkAPIHealth(): Promise<any> {
    const response = await this.client.get(endpoints.health.api);
    return response.data;
  }

  async checkAIHealth(): Promise<any> {
    const response = await axios.get(`${apiConfig.aiEngineURL}${endpoints.health.ai}`);
    return response.data;
  }

  // Generic HTTP methods for API routes
  async get(url: string, config?: any): Promise<any> {
    const response = await this.client.get(url, config);
    return response;
  }

  async post(url: string, data?: any, config?: any): Promise<any> {
    const response = await this.client.post(url, data, config);
    return response;
  }

  async put(url: string, data?: any, config?: any): Promise<any> {
    const response = await this.client.put(url, data, config);
    return response;
  }

  async delete(url: string, config?: any): Promise<any> {
    const response = await this.client.delete(url, config);
    return response;
  }

  async patch(url: string, data?: any, config?: any): Promise<any> {
    const response = await this.client.patch(url, data, config);
    return response;
  }

  // Real-time data methods
  async getRealtimeAnalytics(): Promise<any> {
    const response = await this.client.get(endpoints.realtime.analytics);
    return response.data;
  }

  async getRealtimeNotifications(): Promise<any> {
    const response = await this.client.get(endpoints.realtime.notifications);
    return response.data;
  }

  async getRealtimeSystem(): Promise<any> {
    const response = await this.client.get(endpoints.realtime.system);
    return response.data;
  }
}

// Create singleton instance
const adminAPI = new AdminAPIClient();

// Initialize token from localStorage
const savedToken = localStorage.getItem('admin_token');
if (savedToken) {
  adminAPI.setToken(savedToken);
}

export default adminAPI;
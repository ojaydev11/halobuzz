// API Configuration for HaloBuzz Admin Dashboard
// Connects to the backend API with real-time data support

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://p01--halo-api--6jbmvhzxwv4y.code.run';
const AI_ENGINE_URL = process.env.NEXT_PUBLIC_AI_ENGINE_URL || 'https://haloai--halobuzz-ai--6jbmvhzxwv4y.code.run';

export const apiConfig = {
  baseURL: API_BASE_URL,
  aiEngineURL: AI_ENGINE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// Real-time WebSocket configuration
export const wsConfig = {
  url: API_BASE_URL.replace('https://', 'wss://').replace('http://', 'ws://'),
  reconnectInterval: 5000,
  maxReconnectAttempts: 10,
};

// API Endpoints
export const endpoints = {
  // Authentication
  auth: {
    login: '/api/v1/auth/login',
    logout: '/api/v1/auth/logout',
    register: '/api/v1/auth/register',
    refresh: '/api/v1/auth/refresh',
    me: '/api/v1/auth/me',
  },
  
  // Admin endpoints
  admin: {
    stats: '/api/v1/admin/stats',
    users: '/api/v1/admin/users',
    transactions: '/api/v1/admin/transactions',
    moderation: '/api/v1/admin/moderation',
    pricing: '/api/v1/admin/pricing',
    festivals: '/api/v1/admin/festivals',
    gifts: '/api/v1/admin/gifts',
  },
  
  // Real-time data
  realtime: {
    analytics: '/api/v1/realtime/analytics',
    notifications: '/api/v1/realtime/notifications',
    system: '/api/v1/realtime/system',
  },
  
  // Health checks
  health: {
    api: '/api/v1/health',
    ai: '/healthz',
  },
};

// Real-time event types
export const realtimeEvents = {
  USER_REGISTRATION: 'user_registration',
  USER_LOGIN: 'user_login',
  GAME_PLAY: 'game_play',
  TRANSACTION: 'transaction',
  MODERATION_FLAG: 'moderation_flag',
  SYSTEM_ALERT: 'system_alert',
  ANALYTICS_UPDATE: 'analytics_update',
};

export default apiConfig;

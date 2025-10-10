import apiClient from './client';

/**
 * Admin API Services
 * All backend API calls for the admin dashboard
 */

// ========================================
// USERS & CREATORS
// ========================================

export interface User {
  _id: string;
  username: string;
  displayName?: string;
  email: string;
  phone?: string;
  avatar?: string;
  country: string;
  isVerified: boolean;
  isBanned: boolean;
  banReason?: string;
  banExpiresAt?: Date;
  kycStatus: 'pending' | 'verified' | 'rejected';
  role?: string;
  followers: number;
  following: number;
  ogLevel: number;
  coins: {
    balance: number;
    bonusBalance: number;
    totalEarned: number;
    totalSpent: number;
  };
  trust: {
    score: number;
    level: 'low' | 'medium' | 'high' | 'verified';
  };
  createdAt: Date;
  lastActiveAt: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pages: number;
}

export const usersAPI = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    kycStatus?: string;
    isBanned?: boolean;
    sortBy?: string;
  }) =>
    apiClient.get<PaginatedResponse<User>>('/admin/users', { params }),

  getById: (id: string) =>
    apiClient.get<User>(`/admin/users/${id}`),

  ban: (id: string, reason: string, expiresAt?: Date) =>
    apiClient.post(`/admin/users/${id}/ban`, { reason, expiresAt }),

  unban: (id: string) =>
    apiClient.post(`/admin/users/${id}/unban`),

  approveKYC: (id: string) =>
    apiClient.post(`/admin/users/${id}/kyc/approve`),

  rejectKYC: (id: string, reason: string) =>
    apiClient.post(`/admin/users/${id}/kyc/reject`, { reason }),

  updateRole: (id: string, role: string) =>
    apiClient.put(`/admin/users/${id}/role`, { role }),
};

// ========================================
// ECONOMY & PAYMENTS
// ========================================

export interface CoinTransaction {
  _id: string;
  user: string;
  type: string;
  amount: number;
  balance: number;
  description: string;
  metadata?: any;
  createdAt: Date;
}

export interface Payout {
  _id: string;
  user: User;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  method: string;
  accountDetails: any;
  createdAt: Date;
}

export const economyAPI = {
  getTransactions: (params?: {
    page?: number;
    limit?: number;
    userId?: string;
    type?: string;
  }) =>
    apiClient.get<PaginatedResponse<CoinTransaction>>('/admin/economy/transactions', { params }),

  getPayouts: (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) =>
    apiClient.get<PaginatedResponse<Payout>>('/admin/economy/payouts', { params }),

  approvePayout: (id: string) =>
    apiClient.post(`/admin/economy/payouts/${id}/approve`),

  rejectPayout: (id: string, reason: string) =>
    apiClient.post(`/admin/economy/payouts/${id}/reject`, { reason }),
};

// ========================================
// LIVE STREAMS & REELS
// ========================================

export interface LiveStream {
  _id: string;
  host: User;
  title: string;
  status: 'live' | 'ended';
  viewers: number;
  totalGifts: number;
  duration: number;
  createdAt: Date;
}

export interface Reel {
  _id: string;
  creator: User;
  caption: string;
  views: number;
  likes: number;
  isFlagged: boolean;
  createdAt: Date;
}

export const liveAPI = {
  getSessions: (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) =>
    apiClient.get<PaginatedResponse<LiveStream>>('/admin/live/sessions', { params }),

  forceEnd: (id: string, reason: string) =>
    apiClient.post(`/admin/live/sessions/${id}/force-end`, { reason }),

  getReels: (params?: {
    page?: number;
    limit?: number;
    isFlagged?: boolean;
  }) =>
    apiClient.get<PaginatedResponse<Reel>>('/admin/reels', { params }),

  takedownReel: (id: string, reason: string) =>
    apiClient.post(`/admin/reels/${id}/takedown`, { reason }),
};

// ========================================
// GAMES & TOURNAMENTS
// ========================================

export interface Tournament {
  _id: string;
  name: string;
  game: string;
  startDate: Date;
  endDate: Date;
  entryFee: number;
  prizePool: number;
  participants: number;
  status: 'upcoming' | 'active' | 'completed';
  createdAt: Date;
}

export interface GameSession {
  _id: string;
  game: string;
  players: User[];
  stakes: number;
  winner?: string;
  status: 'active' | 'completed';
  createdAt: Date;
}

export const gamesAPI = {
  getTournaments: (params?: {
    page?: number;
    limit?: number;
    status?: string;
  }) =>
    apiClient.get<PaginatedResponse<Tournament>>('/admin/tournaments', { params }),

  getSessions: (params?: {
    page?: number;
    limit?: number;
    game?: string;
  }) =>
    apiClient.get<PaginatedResponse<GameSession>>('/admin/games/sessions', { params }),
};

// ========================================
// MODERATION
// ========================================

export interface ModerationFlag {
  _id: string;
  type: 'user' | 'content' | 'stream';
  target: any;
  reporter: User;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  mlScore?: number;
  createdAt: Date;
}

export const moderationAPI = {
  getFlags: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
  }) =>
    apiClient.get<PaginatedResponse<ModerationFlag>>('/admin/moderation/flags', { params }),

  resolveFlag: (id: string, action: string, reason: string) =>
    apiClient.post(`/admin/moderation/flags/${id}/resolve`, { action, reason }),
};

// ========================================
// ANALYTICS (for Overview Dashboard)
// ========================================

export interface DashboardStats {
  users: {
    total: number;
    active7d: number;
    verified: number;
    growth7d: number;
  };
  economy: {
    revenue30d: number;
    coinsCirculating: number;
    avgTransactionSize: number;
    growth30d: number;
  };
  platform: {
    liveSessions: number;
    gameSessions24h: number;
    reelsCreated24h: number;
    flagsPending: number;
  };
  infrastructure?: {
    apiResponseTimeP95: number;
    uptime30d: number;
    dbLoad: number;
    redisHitRate: number;
  };
}

export const analyticsAPI = {
  getDashboardStats: () =>
    apiClient.get<DashboardStats>('/admin/analytics/dashboard'),
};

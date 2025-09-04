export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  country: string;
  language: string;
  isVerified: boolean;
  kycStatus: 'pending' | 'approved' | 'rejected' | 'none';
  ogLevel: number;
  coins: number;
  trust: {
    score: number;
    factors: {
      totalStreams: number;
      totalViews: number;
      totalLikes: number;
      totalGifts: number;
    };
  };
  followers: number;
  following: number;
  totalLikes: number;
  totalViews: number;
  preferences: {
    notifications: boolean;
    privacy: 'public' | 'private';
  };
  lastActiveAt: string;
  createdAt: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  phone?: string;
  country: string;
  language: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

import { apiClient } from '@/lib/api';

export interface WalletData {
  wallet: {
    balance: number;
    bonusBalance: number;
    totalEarned: number;
    totalSpent: number;
  };
  recentTransactions: any[];
}

export interface CreatorStats {
  totalViews: number;
  totalLikes: number;
  totalFollowers: number;
  totalEarnings: number;
  streamsCount: number;
  reelsCount: number;
  avgViewDuration: number;
  engagementRate: number;
}

export interface NFT {
  id: string;
  name: string;
  description: string;
  image: string;
  creator: {
    id: string;
    username: string;
    avatar?: string;
    isVerified: boolean;
  };
  price: number;
  currency: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  category: string;
  createdAt: string;
  isAuction?: boolean;
  auctionEndsAt?: string;
  currentBid?: number;
  bidCount?: number;
}

export interface NewUser {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  country: string;
  joinedAt: string;
  isVerified: boolean;
  ogLevel: number;
  followers: number;
  bio?: string;
}

class HaloBuzzAPIService {
  // Wallet API
  async getWallet() {
    try {
      return await apiClient.get('/wallet');
    } catch (error) {
      console.error('Failed to get wallet data:', error);
      throw error;
    }
  }

  async rechargeWallet(request: any) {
    try {
      return await apiClient.post('/wallet/recharge', request);
    } catch (error) {
      console.error('Failed to recharge wallet:', error);
      throw error;
    }
  }

  // Creator Studio API
  async getCreatorStats() {
    try {
      return await apiClient.get('/creator/stats');
    } catch (error) {
      console.error('Failed to get creator stats:', error);
      throw error;
    }
  }

  // NFT API
  async getNFTs(category?: string, sortBy?: string) {
    try {
      const params = new URLSearchParams();
      if (category && category !== 'all') params.append('category', category);
      if (sortBy) params.append('sortBy', sortBy);
      
      return await apiClient.get(`/nft/search?${params.toString()}`);
    } catch (error) {
      console.error('Failed to get NFTs:', error);
      throw error;
    }
  }

  async purchaseNFT(nftId: string) {
    try {
      return await apiClient.post('/nft/purchase', { nftId });
    } catch (error) {
      console.error('Failed to purchase NFT:', error);
      throw error;
    }
  }

  // New Users API
  async getNewUsers(filter: string = 'all') {
    try {
      return await apiClient.get(`/users/new?filter=${filter}`);
    } catch (error) {
      console.error('Failed to get new users:', error);
      throw error;
    }
  }

  async followUser(userId: string) {
    try {
      return await apiClient.post('/users/follow', { userId });
    } catch (error) {
      console.error('Failed to follow user:', error);
      throw error;
    }
  }

  // Settings API
  async getUserSettings() {
    try {
      return await apiClient.get('/user/settings');
    } catch (error) {
      console.error('Failed to get user settings:', error);
      throw error;
    }
  }

  async updateUserSettings(settings: any) {
    try {
      return await apiClient.put('/user/settings', settings);
    } catch (error) {
      console.error('Failed to update user settings:', error);
      throw error;
    }
  }

  // Content API
  async getMyStreams() {
    try {
      return await apiClient.get('/streams/my');
    } catch (error) {
      console.error('Failed to get my streams:', error);
      throw error;
    }
  }

  async getMyContent() {
    try {
      return await apiClient.get('/reels/my');
    } catch (error) {
      console.error('Failed to get my content:', error);
      throw error;
    }
  }

  // Search API
  async searchUsers(query: string) {
    try {
      return await apiClient.get(`/search?q=${query}&type=users`);
    } catch (error) {
      console.error('Failed to search users:', error);
      throw error;
    }
  }
}

export const haloBuzzAPI = new HaloBuzzAPIService();

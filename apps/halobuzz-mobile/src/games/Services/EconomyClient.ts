/**
 * Economy Client Service
 * Handles coin staking, rewards, and boost status
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://p01--halo-api--6jbmvhzxwv4y.code.run';
const API_PREFIX = '/api/v1';

export interface StakeCoinsResponse {
  success: boolean;
  newBalance: number;
  transactionId: string;
}

export interface RewardCoinsResponse {
  success: boolean;
  newBalance: number;
  rewardAmount: number;
  transactionId: string;
}

export interface BoostStatus {
  active: boolean;
  multiplier: number;
  expiresAt?: string;
  boostType?: string;
}

class EconomyClient {
  private static instance: EconomyClient;

  private constructor() {}

  static getInstance(): EconomyClient {
    if (!EconomyClient.instance) {
      EconomyClient.instance = new EconomyClient();
    }
    return EconomyClient.instance;
  }

  private async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('userToken');
    } catch (error) {
      console.error('Failed to get auth token:', error);
      return null;
    }
  }

  private async getHeaders() {
    const token = await this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /**
   * Stake coins for a game entry
   */
  async stakeCoins(amount: number, gameId: string, sessionId?: string): Promise<StakeCoinsResponse> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.post(
        `${API_BASE}${API_PREFIX}/coins/stake`,
        {
          amount,
          gameId,
          sessionId,
        },
        { headers }
      );

      if (response.data.success) {
        return {
          success: true,
          newBalance: response.data.data.newBalance,
          transactionId: response.data.data.transactionId,
        };
      }

      throw new Error(response.data.error || 'Stake failed');
    } catch (error: any) {
      console.error('Stake coins error:', error);
      throw new Error(error.response?.data?.error || 'Failed to stake coins');
    }
  }

  /**
   * Reward coins after game completion
   */
  async rewardCoins(amount: number, gameId: string, sessionId: string, metadata?: any): Promise<RewardCoinsResponse> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.post(
        `${API_BASE}${API_PREFIX}/coins/reward`,
        {
          amount,
          gameId,
          sessionId,
          metadata,
        },
        { headers }
      );

      if (response.data.success) {
        return {
          success: true,
          newBalance: response.data.data.newBalance,
          rewardAmount: response.data.data.rewardAmount,
          transactionId: response.data.data.transactionId,
        };
      }

      throw new Error(response.data.error || 'Reward failed');
    } catch (error: any) {
      console.error('Reward coins error:', error);
      throw new Error(error.response?.data?.error || 'Failed to reward coins');
    }
  }

  /**
   * Get current boost status
   */
  async getBoostStatus(): Promise<BoostStatus> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(`${API_BASE}${API_PREFIX}/coins/boost-status`, { headers });

      if (response.data.success) {
        const { active, multiplier, expiresAt, boostType } = response.data.data;
        return {
          active,
          multiplier,
          expiresAt,
          boostType,
        };
      }

      return { active: false, multiplier: 1 };
    } catch (error: any) {
      console.error('Get boost status error:', error);
      return { active: false, multiplier: 1 };
    }
  }

  /**
   * Get user coin balance
   */
  async getBalance(): Promise<number> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(`${API_BASE}${API_PREFIX}/users/me`, { headers });

      if (response.data.success) {
        return response.data.data.coins?.balance || 0;
      }

      return 0;
    } catch (error: any) {
      console.error('Get balance error:', error);
      return 0;
    }
  }

  /**
   * Purchase coins (IAP integration)
   */
  async purchaseCoins(packageId: string, receipt: string): Promise<{ success: boolean; newBalance: number }> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.post(
        `${API_BASE}${API_PREFIX}/coins/purchase`,
        {
          packageId,
          receipt,
        },
        { headers }
      );

      if (response.data.success) {
        return {
          success: true,
          newBalance: response.data.data.newBalance,
        };
      }

      throw new Error(response.data.error || 'Purchase failed');
    } catch (error: any) {
      console.error('Purchase coins error:', error);
      throw new Error(error.response?.data?.error || 'Failed to purchase coins');
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(limit: number = 20): Promise<any[]> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(`${API_BASE}${API_PREFIX}/coins/transactions?limit=${limit}`, { headers });

      if (response.data.success) {
        return response.data.data.transactions || [];
      }

      return [];
    } catch (error: any) {
      console.error('Get transaction history error:', error);
      return [];
    }
  }
}

export const economyClient = EconomyClient.getInstance();
export default economyClient;


/**
 * Tournament Client Service
 * Handles tournament operations: list, join, submit scores, leaderboards
 */

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import crypto from 'crypto-js';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://p01--halo-api--6jbmvhzxwv4y.code.run';
const API_PREFIX = '/api/v1';

export interface Tournament {
  id: string;
  name: string;
  gameId: string;
  entryFee: number;
  prizePool: number;
  maxPlayers: number;
  currentPlayers: number;
  startTime: string;
  endTime: string;
  status: 'upcoming' | 'active' | 'ended';
  prizeDistribution: number[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar?: string;
  score: number;
  timestamp: string;
  prize?: number;
}

export interface SubmitScoreResponse {
  success: boolean;
  rank: number;
  score: number;
  isNewHighScore: boolean;
}

class TournamentClient {
  private static instance: TournamentClient;

  private constructor() {}

  static getInstance(): TournamentClient {
    if (!TournamentClient.instance) {
      TournamentClient.instance = new TournamentClient();
    }
    return TournamentClient.instance;
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
   * Generate HMAC signature for score submission
   */
  private generateSignature(sessionId: string, score: number, secret: string): string {
    const message = `${sessionId}:${score}`;
    return crypto.HmacSHA256(message, secret).toString();
  }

  /**
   * List active tournaments
   */
  async listActiveTournaments(gameId?: string): Promise<Tournament[]> {
    try {
      const headers = await this.getHeaders();
      const url = gameId
        ? `${API_BASE}${API_PREFIX}/tournaments/active?gameId=${gameId}`
        : `${API_BASE}${API_PREFIX}/tournaments/active`;

      const response = await axios.get(url, { headers });

      if (response.data.success) {
        return response.data.data.tournaments || [];
      }

      return [];
    } catch (error: any) {
      console.error('List tournaments error:', error);
      return [];
    }
  }

  /**
   * Get tournament details
   */
  async getTournamentDetails(tournamentId: string): Promise<Tournament | null> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(`${API_BASE}${API_PREFIX}/tournaments/${tournamentId}`, { headers });

      if (response.data.success) {
        return response.data.data.tournament;
      }

      return null;
    } catch (error: any) {
      console.error('Get tournament details error:', error);
      return null;
    }
  }

  /**
   * Join a tournament
   */
  async joinTournament(tournamentId: string, entryFee: number): Promise<{ success: boolean; message?: string }> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.post(
        `${API_BASE}${API_PREFIX}/tournaments/join`,
        {
          tournamentId,
          entryFee,
        },
        { headers }
      );

      if (response.data.success) {
        return {
          success: true,
          message: response.data.message,
        };
      }

      throw new Error(response.data.error || 'Failed to join tournament');
    } catch (error: any) {
      console.error('Join tournament error:', error);
      return {
        success: false,
        message: error.response?.data?.error || 'Failed to join tournament',
      };
    }
  }

  /**
   * Submit score to tournament (idempotent with signature)
   */
  async submitScore(
    tournamentId: string,
    sessionId: string,
    score: number,
    metadata?: any
  ): Promise<SubmitScoreResponse> {
    try {
      const headers = await this.getHeaders();
      
      // Generate signature (in production, this should use server-provided secret)
      const signature = this.generateSignature(sessionId, score, 'game-secret-key');

      const response = await axios.post(
        `${API_BASE}${API_PREFIX}/tournaments/submit-score`,
        {
          tournamentId,
          sessionId,
          score,
          signature,
          metadata,
          timestamp: Date.now(),
        },
        { headers }
      );

      if (response.data.success) {
        return {
          success: true,
          rank: response.data.data.rank,
          score: response.data.data.score,
          isNewHighScore: response.data.data.isNewHighScore || false,
        };
      }

      throw new Error(response.data.error || 'Failed to submit score');
    } catch (error: any) {
      console.error('Submit score error:', error);
      throw new Error(error.response?.data?.error || 'Failed to submit score');
    }
  }

  /**
   * Get tournament leaderboard
   */
  async getLeaderboard(tournamentId: string, limit: number = 100): Promise<LeaderboardEntry[]> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(
        `${API_BASE}${API_PREFIX}/tournaments/${tournamentId}/leaderboard?limit=${limit}`,
        { headers }
      );

      if (response.data.success) {
        return response.data.data.leaderboard || [];
      }

      return [];
    } catch (error: any) {
      console.error('Get leaderboard error:', error);
      return [];
    }
  }

  /**
   * Get user's tournament history
   */
  async getUserTournamentHistory(limit: number = 20): Promise<any[]> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(`${API_BASE}${API_PREFIX}/tournaments/history?limit=${limit}`, { headers });

      if (response.data.success) {
        return response.data.data.tournaments || [];
      }

      return [];
    } catch (error: any) {
      console.error('Get tournament history error:', error);
      return [];
    }
  }

  /**
   * Get user's rank in tournament
   */
  async getUserRank(tournamentId: string): Promise<{ rank: number; score: number } | null> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(`${API_BASE}${API_PREFIX}/tournaments/${tournamentId}/my-rank`, { headers });

      if (response.data.success) {
        return {
          rank: response.data.data.rank,
          score: response.data.data.score,
        };
      }

      return null;
    } catch (error: any) {
      console.error('Get user rank error:', error);
      return null;
    }
  }

  /**
   * Leave a tournament (before it starts)
   */
  async leaveTournament(tournamentId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.post(
        `${API_BASE}${API_PREFIX}/tournaments/${tournamentId}/leave`,
        {},
        { headers }
      );

      if (response.data.success) {
        return {
          success: true,
          message: response.data.message,
        };
      }

      throw new Error(response.data.error || 'Failed to leave tournament');
    } catch (error: any) {
      console.error('Leave tournament error:', error);
      return {
        success: false,
        message: error.response?.data?.error || 'Failed to leave tournament',
      };
    }
  }
}

export const tournamentClient = TournamentClient.getInstance();
export default tournamentClient;


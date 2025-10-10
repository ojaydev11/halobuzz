/**
 * Games E-Sports API Client
 * Handles all backend communication for games
 */

import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://p01--halo-api--6jbmvhzxwv4y.code.run';
const API_PREFIX = process.env.EXPO_PUBLIC_API_PREFIX || '/api/v1';

interface StartSessionRequest {
  gameId: string;
  entryFee: number;
  mode: 'solo' | 'multiplayer' | 'tournament';
}

interface StartSessionResponse {
  success: boolean;
  data: {
    sessionId: string;
    playerId: string;
    gameId: string;
    entryFee: number;
    mode: string;
    startTime: string;
  };
}

interface EndSessionRequest {
  sessionId: string;
  score: number;
  metadata?: any;
  fpsMetrics?: {
    avgFPS: number;
    minFPS: number;
    maxFPS: number;
    p95FPS: number;
  };
  actionLog?: any[];
}

interface EndSessionResponse {
  success: boolean;
  data: {
    session: any;
    reward: number;
    platformRake: number;
    result: 'win' | 'loss' | 'draw';
    newBalance: number;
  };
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  score: number;
  gamesPlayed: number;
  winRate: number;
}

interface PlayerStats {
  gameId: string;
  gamesPlayed: number;
  averageScore: number;
  highScore: number;
  totalWagered: number;
  totalWon: number;
  netProfit: number;
  winRate: number;
}

class GamesAPIService {
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
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  /**
   * Start a game session
   */
  async startSession(
    gameId: string,
    entryFee: number,
    mode: 'solo' | 'multiplayer' | 'tournament' = 'solo'
  ): Promise<StartSessionResponse> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.post<StartSessionResponse>(
        `${API_BASE}${API_PREFIX}/games-esports/session/start`,
        { gameId, entryFee, mode } as StartSessionRequest,
        { headers }
      );
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to start game session');
      throw error;
    }
  }

  /**
   * End a game session and submit score
   */
  async endSession(
    sessionId: string,
    score: number,
    metadata?: any,
    fpsMetrics?: EndSessionRequest['fpsMetrics'],
    actionLog?: any[]
  ): Promise<EndSessionResponse> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.post<EndSessionResponse>(
        `${API_BASE}${API_PREFIX}/games-esports/session/end`,
        {
          sessionId,
          score,
          metadata,
          fpsMetrics,
          actionLog,
        } as EndSessionRequest,
        { headers }
      );
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to end game session');
      throw error;
    }
  }

  /**
   * Get session details
   */
  async getSession(sessionId: string): Promise<any> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(
        `${API_BASE}${API_PREFIX}/games-esports/session/${sessionId}`,
        { headers }
      );
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to get session details');
      throw error;
    }
  }

  /**
   * Get player's recent sessions
   */
  async getPlayerSessions(limit: number = 10): Promise<any> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(
        `${API_BASE}${API_PREFIX}/games-esports/sessions/player?limit=${limit}`,
        { headers }
      );
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to get player sessions');
      throw error;
    }
  }

  /**
   * Get player statistics for a game
   */
  async getPlayerStats(gameId: string): Promise<PlayerStats> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(
        `${API_BASE}${API_PREFIX}/games-esports/stats/player/${gameId}`,
        { headers }
      );
      return response.data.data;
    } catch (error) {
      this.handleError(error, 'Failed to get player stats');
      throw error;
    }
  }

  /**
   * Get game leaderboard
   */
  async getLeaderboard(
    gameId: string,
    timeframe: 'daily' | 'weekly' | 'monthly' | 'all-time' = 'all-time',
    limit: number = 100
  ): Promise<LeaderboardEntry[]> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(
        `${API_BASE}${API_PREFIX}/games-esports/leaderboard/${gameId}?timeframe=${timeframe}&limit=${limit}`,
        { headers }
      );
      return response.data.data.leaderboard;
    } catch (error) {
      this.handleError(error, 'Failed to get leaderboard');
      throw error;
    }
  }

  /**
   * Get player trust score
   */
  async getTrustScore(userId: string): Promise<number> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(
        `${API_BASE}${API_PREFIX}/games-esports/anti-cheat/trust-score/${userId}`,
        { headers }
      );
      return response.data.data.trustScore;
    } catch (error) {
      this.handleError(error, 'Failed to get trust score');
      throw error;
    }
  }

  /**
   * Get player MMR rating
   */
  async getMMR(gameId: string): Promise<any> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(
        `${API_BASE}${API_PREFIX}/mmr/${gameId}/player`,
        { headers }
      );
      return response.data.data;
    } catch (error) {
      this.handleError(error, 'Failed to get MMR');
      throw error;
    }
  }

  /**
   * Find opponent for matchmaking
   */
  async findOpponent(gameId: string): Promise<any> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(
        `${API_BASE}${API_PREFIX}/mmr/${gameId}/find-opponent`,
        { headers }
      );
      return response.data.data;
    } catch (error) {
      this.handleError(error, 'Failed to find opponent');
      throw error;
    }
  }

  /**
   * Get MMR leaderboard
   */
  async getMMRLeaderboard(gameId: string, limit: number = 100): Promise<any> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(
        `${API_BASE}${API_PREFIX}/mmr/${gameId}/leaderboard?limit=${limit}`,
        { headers }
      );
      return response.data.data.leaderboard;
    } catch (error) {
      this.handleError(error, 'Failed to get MMR leaderboard');
      throw error;
    }
  }

  private handleError(error: unknown, context: string): void {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;
      if (axiosError.response) {
        console.error(`${context}:`, axiosError.response.data);

        // Handle specific error codes
        if (axiosError.response.status === 401) {
          // Token expired or invalid
          console.error('Authentication failed. Please log in again.');
        } else if (axiosError.response.status === 403) {
          // Insufficient balance or permissions
          console.error('Insufficient balance or permissions.');
        } else if (axiosError.response.status === 429) {
          // Rate limited
          console.error('Too many requests. Please slow down.');
        }
      } else if (axiosError.request) {
        console.error(`${context}: Network error`);
      } else {
        console.error(`${context}:`, axiosError.message);
      }
    } else {
      console.error(`${context}:`, error);
    }
  }
}

export const gamesAPI = new GamesAPIService();
export default gamesAPI;

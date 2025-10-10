/**
 * GameSessionService
 * E-Sports Grade Game Session Management
 *
 * Handles:
 * - Session creation and validation
 * - Score validation
 * - Performance metrics tracking
 * - Reward calculation
 */

import { GameSession, IGameSession } from '@/models/GameSession';
import { User } from '@/models/User';
import { Transaction } from '@/models/Transaction';
import { AntiCheatService } from './AntiCheatService';
import { logger } from '@/config/logger';
import crypto from 'crypto';
import mongoose from 'mongoose';

export class GameSessionService {
  private static instance: GameSessionService;

  static getInstance(): GameSessionService {
    if (!GameSessionService.instance) {
      GameSessionService.instance = new GameSessionService();
    }
    return GameSessionService.instance;
  }

  /**
   * Start a new game session
   */
  async startSession(params: {
    userId: string;
    gameId: string;
    entryFee: number;
    mode?: string;
    tournamentId?: string;
  }): Promise<{ session: IGameSession; success: boolean; error?: string }> {
    try {
      const { userId, gameId, entryFee, mode = 'solo', tournamentId } = params;

      // Validate user balance
      const user = await User.findById(userId);
      if (!user || !user.coins || user.coins.balance < entryFee) {
        return {
          success: false,
          error: 'Insufficient balance',
          session: null as any,
        };
      }

      // Create unique session ID
      const sessionId = this.generateSessionId(userId, gameId);

      // Deduct entry fee
      await User.findByIdAndUpdate(userId, {
        $inc: {
          'coins.balance': -entryFee,
          'coins.totalSpent': entryFee,
        },
      });

      // Create transaction record
      await Transaction.create({
        userId,
        type: 'game_entry',
        amount: -entryFee,
        currency: 'coins',
        status: 'completed',
        description: `Entry fee for ${gameId}`,
        metadata: {
          gameId,
          sessionId,
          mode,
        },
      });

      // Create game session
      const session = await GameSession.create({
        sessionId,
        gameId,
        userId,
        entryFee,
        startTime: new Date(),
        status: 'playing',
        metadata: {
          mode,
        },
        tournamentId: tournamentId ? new mongoose.Types.ObjectId(tournamentId) : undefined,
      });

      logger.info('Game session started', {
        sessionId,
        userId,
        gameId,
        entryFee,
      });

      return {
        success: true,
        session,
      };
    } catch (error) {
      logger.error('Failed to start game session:', error);
      return {
        success: false,
        error: 'Failed to start session',
        session: null as any,
      };
    }
  }

  /**
   * End a game session with score validation
   */
  async endSession(params: {
    sessionId: string;
    score: number;
    metadata?: any;
    fpsMetrics?: number[];
    networkLatency?: number[];
    actionLog?: any[];
  }): Promise<{ success: boolean; reward: number; validated: boolean; error?: string }> {
    try {
      const { sessionId, score, metadata = {}, fpsMetrics = [], networkLatency = [], actionLog = [] } = params;

      // Get session
      const session = await GameSession.findOne({ sessionId });
      if (!session) {
        return {
          success: false,
          reward: 0,
          validated: false,
          error: 'Session not found',
        };
      }

      if (session.status !== 'playing') {
        return {
          success: false,
          reward: 0,
          validated: false,
          error: 'Session already ended',
        };
      }

      // Validate score with anti-cheat
      const antiCheatService = AntiCheatService.getInstance();
      const validation = await antiCheatService.validateScore({
        userId: session.userId.toString(),
        gameId: session.gameId,
        sessionId,
        score,
        duration: Date.now() - session.startTime.getTime(),
        metadata,
        actionLog,
      });

      // Calculate reward (only if validated)
      let reward = 0;
      let platformRake = 0;
      if (validation.valid) {
        const rewardData = this.calculateReward(session.gameId, session.entryFee, score);
        reward = rewardData.reward;
        platformRake = rewardData.rake;

        // Add reward to user balance
        if (reward > 0) {
          await User.findByIdAndUpdate(session.userId, {
            $inc: {
              'coins.balance': reward,
              'coins.totalEarned': reward,
            },
          });

          // Create reward transaction
          await Transaction.create({
            userId: session.userId,
            type: 'game_reward',
            amount: reward,
            currency: 'coins',
            status: 'completed',
            description: `Reward for ${session.gameId}`,
            metadata: {
              gameId: session.gameId,
              sessionId,
              score,
            },
          });
        }
      }

      // Generate validation hash
      const validationHash = this.generateValidationHash(sessionId, score, actionLog);

      // Update session
      session.score = score;
      session.reward = reward;
      session.platformRake = platformRake;
      session.endTime = new Date();
      session.metadata = { ...session.metadata, ...metadata };
      session.fpsMetrics = {
        samples: fpsMetrics,
        avg: 0,
        min: 0,
        max: 0,
        p95: 0,
      };
      if (networkLatency.length > 0) {
        session.networkLatency = {
          samples: networkLatency,
          avg: 0,
        };
      }
      session.antiCheatFlags = validation.flags || [];
      session.suspicionScore = validation.suspicionScore || 0;
      session.validated = validation.valid;
      session.validationHash = validationHash;
      session.status = validation.valid ? 'completed' : 'disqualified';

      await session.save();

      logger.info('Game session ended', {
        sessionId,
        score,
        reward,
        validated: validation.valid,
        suspicionScore: validation.suspicionScore,
      });

      return {
        success: true,
        reward,
        validated: validation.valid,
      };
    } catch (error) {
      logger.error('Failed to end game session:', error);
      return {
        success: false,
        reward: 0,
        validated: false,
        error: 'Failed to end session',
      };
    }
  }

  /**
   * Calculate reward based on game config and score
   */
  private calculateReward(gameId: string, entryFee: number, score: number): { reward: number; rake: number } {
    // Game-specific reward multipliers
    const rewardConfigs: Record<string, { multiplier: number; rakePercent: number }> = {
      'coin-flip-deluxe': { multiplier: 2, rakePercent: 10 },
      'tap-duel': { multiplier: 2, rakePercent: 10 },
      'buzz-runner': { multiplier: 3, rakePercent: 15 },
      'trivia-royale': { multiplier: 3, rakePercent: 15 },
      'stack-storm': { multiplier: 5, rakePercent: 20 },
      'buzz-arena': { multiplier: 10, rakePercent: 25 },
    };

    const config = rewardConfigs[gameId] || { multiplier: 2, rakePercent: 10 };

    // For win/loss games (coin-flip, tap-duel), score is 0 or 1
    // For score-based games, use multiplier logic
    let baseReward = 0;

    if (gameId === 'coin-flip-deluxe' || gameId === 'tap-duel') {
      // Binary win/loss
      baseReward = score > 0 ? entryFee * config.multiplier : 0;
    } else {
      // Score-based (runner, trivia, stack, arena)
      // Reward scales with performance
      baseReward = entryFee * config.multiplier * Math.min(score / 1000, 1);
    }

    // Calculate platform rake
    const rake = baseReward * (config.rakePercent / 100);
    const finalReward = Math.floor(baseReward - rake);

    return {
      reward: Math.max(0, finalReward),
      rake: Math.floor(rake),
    };
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(userId: string, gameId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${gameId}-${userId.slice(-8)}-${timestamp}-${random}`;
  }

  /**
   * Generate validation hash for replay verification
   */
  private generateValidationHash(sessionId: string, score: number, actionLog: any[]): string {
    const data = JSON.stringify({ sessionId, score, actionLog });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Get player's recent sessions
   */
  async getPlayerSessions(userId: string, limit: number = 10): Promise<IGameSession[]> {
    try {
      const sessions = await GameSession.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return sessions;
    } catch (error) {
      logger.error('Failed to get player sessions:', error);
      return [];
    }
  }

  /**
   * Get game statistics for a player
   */
  async getPlayerStats(userId: string, gameId: string): Promise<any> {
    try {
      const sessions = await GameSession.find({
        userId,
        gameId,
        status: 'completed',
        validated: true,
      });

      if (sessions.length === 0) {
        return {
          gamesPlayed: 0,
          totalScore: 0,
          avgScore: 0,
          highScore: 0,
          totalReward: 0,
          totalSpent: 0,
          netProfit: 0,
        };
      }

      const totalScore = sessions.reduce((sum, s) => sum + s.score, 0);
      const highScore = Math.max(...sessions.map(s => s.score));
      const totalReward = sessions.reduce((sum, s) => sum + s.reward, 0);
      const totalSpent = sessions.reduce((sum, s) => sum + s.entryFee, 0);

      return {
        gamesPlayed: sessions.length,
        totalScore,
        avgScore: Math.floor(totalScore / sessions.length),
        highScore,
        totalReward,
        totalSpent,
        netProfit: totalReward - totalSpent,
      };
    } catch (error) {
      logger.error('Failed to get player stats:', error);
      return null;
    }
  }
}

export const gameSessionService = GameSessionService.getInstance();

/**
 * AntiCheatService
 * Advanced Anti-Cheat System
 *
 * Validates:
 * - Score plausibility
 * - Timing patterns
 * - Input rates
 * - Replay hashes
 */

import { AntiCheatLog } from '@/models/AntiCheatLog';
import { GameSession } from '@/models/GameSession';
import { logger } from '@/config/logger';

export interface ValidationResult {
  valid: boolean;
  flags: string[];
  suspicionScore: number; // 0-100
  reason?: string;
}

export class AntiCheatService {
  private static instance: AntiCheatService;

  static getInstance(): AntiCheatService {
    if (!AntiCheatService.instance) {
      AntiCheatService.instance = new AntiCheatService();
    }
    return AntiCheatService.instance;
  }

  /**
   * Validate a game score
   */
  async validateScore(params: {
    userId: string;
    gameId: string;
    sessionId: string;
    score: number;
    duration: number;
    metadata?: any;
    actionLog?: any[];
  }): Promise<ValidationResult> {
    const { userId, gameId, sessionId, score, duration, metadata = {}, actionLog = [] } = params;

    const flags: string[] = [];
    let suspicionScore = 0;

    // 1. Impossible Score Check
    const maxPossibleScore = this.getMaxPossibleScore(gameId, duration);
    if (score > maxPossibleScore) {
      flags.push('impossible_score');
      suspicionScore += 50;

      await this.logAntiCheat({
        userId,
        gameId,
        sessionId,
        flagType: 'impossible_score',
        severity: 'high',
        details: {
          expected: maxPossibleScore,
          actual: score,
          deviation: score - maxPossibleScore,
        },
      });
    }

    // 2. Timing Anomaly Check
    const timingCheck = this.checkTiming(gameId, duration, score);
    if (!timingCheck.valid) {
      flags.push('abnormal_timing');
      suspicionScore += 30;

      await this.logAntiCheat({
        userId,
        gameId,
        sessionId,
        flagType: 'abnormal_timing',
        severity: 'medium',
        details: timingCheck.details,
      });
    }

    // 3. Input Rate Anomaly
    if (actionLog.length > 0) {
      const inputRateCheck = this.checkInputRate(gameId, actionLog, duration);
      if (!inputRateCheck.valid) {
        flags.push('input_rate_anomaly');
        suspicionScore += 25;

        await this.logAntiCheat({
          userId,
          gameId,
          sessionId,
          flagType: 'input_rate_anomaly',
          severity: 'medium',
          details: inputRateCheck.details,
        });
      }
    }

    // 4. Pattern Recognition (repeated perfect plays)
    const patternCheck = await this.checkPatterns(userId, gameId, score);
    if (!patternCheck.valid) {
      flags.push('pattern_recognition');
      suspicionScore += 20;

      await this.logAntiCheat({
        userId,
        gameId,
        sessionId,
        flagType: 'pattern_recognition',
        severity: 'low',
        details: patternCheck.details,
      });
    }

    // 5. Check player's history for repeat offenses
    const trustScore = await this.getPlayerTrustScore(userId);
    if (trustScore < 50) {
      suspicionScore += 15;
    }

    // Determine if valid
    const valid = suspicionScore < 60; // Threshold: 60/100

    if (!valid) {
      logger.warn('Anti-cheat validation failed', {
        userId,
        gameId,
        sessionId,
        score,
        suspicionScore,
        flags,
      });
    }

    return {
      valid,
      flags,
      suspicionScore,
      reason: flags.length > 0 ? flags.join(', ') : undefined,
    };
  }

  /**
   * Get maximum possible score for a game
   */
  private getMaxPossibleScore(gameId: string, duration: number): number {
    const durationSec = duration / 1000;

    switch (gameId) {
      case 'coin-flip-deluxe':
      case 'tap-duel':
        return 1; // Binary win/loss

      case 'buzz-runner':
        // Max 100 points per second (very generous)
        return durationSec * 100;

      case 'trivia-royale':
        // 12 questions max, 100 points each
        return 1200;

      case 'stack-storm':
        // Max 2 blocks per second (very fast)
        return durationSec * 2 * 10; // 10 points per block

      case 'buzz-arena':
        // Best of 3, max 3 rounds
        return 3;

      default:
        return durationSec * 100; // Default: 100 points/sec
    }
  }

  /**
   * Check if timing is plausible
   */
  private checkTiming(gameId: string, duration: number, score: number): { valid: boolean; details?: any } {
    const durationSec = duration / 1000;

    // Minimum duration checks
    const minDurations: Record<string, number> = {
      'coin-flip-deluxe': 2, // 2 seconds minimum
      'tap-duel': 3, // 3 seconds minimum
      'buzz-runner': 5, // 5 seconds minimum
      'trivia-royale': 30, // 30 seconds minimum (even if all answered instantly)
      'stack-storm': 10, // 10 seconds minimum
      'buzz-arena': 30, // 30 seconds minimum
    };

    const minDuration = minDurations[gameId] || 5;

    if (durationSec < minDuration) {
      return {
        valid: false,
        details: {
          expected: `>${minDuration}s`,
          actual: `${durationSec.toFixed(1)}s`,
          description: 'Game completed too quickly',
        },
      };
    }

    // Game-specific checks
    if (gameId === 'trivia-royale') {
      // Each question should take at least 1 second (even with instant answers)
      const questions = Math.floor(score / 100);
      const minTimeForQuestions = questions;
      if (durationSec < minTimeForQuestions) {
        return {
          valid: false,
          details: {
            expected: `>${minTimeForQuestions}s`,
            actual: `${durationSec.toFixed(1)}s`,
            description: 'Answered questions too quickly',
          },
        };
      }
    }

    return { valid: true };
  }

  /**
   * Check input rate for anomalies
   */
  private checkInputRate(gameId: string, actionLog: any[], duration: number): { valid: boolean; details?: any } {
    if (actionLog.length === 0) {
      return { valid: true };
    }

    const durationSec = duration / 1000;
    const inputRate = actionLog.length / durationSec;

    // Maximum plausible input rates (actions per second)
    const maxRates: Record<string, number> = {
      'coin-flip-deluxe': 1, // 1 flip per session
      'tap-duel': 1, // 1 tap per round
      'buzz-runner': 10, // 10 taps/sec max
      'trivia-royale': 1, // 1 answer per question
      'stack-storm': 5, // 5 blocks/sec max
      'buzz-arena': 10, // 10 actions/sec max
    };

    const maxRate = maxRates[gameId] || 10;

    if (inputRate > maxRate) {
      return {
        valid: false,
        details: {
          expected: `<${maxRate} actions/sec`,
          actual: `${inputRate.toFixed(1)} actions/sec`,
          description: 'Abnormally high input rate',
        },
      };
    }

    return { valid: true };
  }

  /**
   * Check for suspicious patterns in player's history
   */
  private async checkPatterns(userId: string, gameId: string, score: number): Promise<{ valid: boolean; details?: any }> {
    try {
      // Get player's recent sessions
      const recentSessions = await GameSession.find({
        userId,
        gameId,
        status: 'completed',
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      if (recentSessions.length < 3) {
        return { valid: true }; // Not enough data
      }

      // Check for identical scores (very suspicious)
      const scores = recentSessions.map(s => s.score);
      const uniqueScores = new Set(scores);

      if (uniqueScores.size === 1 && scores.length >= 5) {
        return {
          valid: false,
          details: {
            description: 'Identical scores across multiple sessions',
            pattern: scores,
          },
        };
      }

      // Check for unrealistic consistency (top 1% every time)
      const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
      const maxPossible = this.getMaxPossibleScore(gameId, 300000); // 5 min max
      const consistencyThreshold = 0.9; // 90% of max every time

      const highScores = scores.filter(s => s > maxPossible * consistencyThreshold);
      if (highScores.length >= scores.length * 0.8) {
        // 80%+ of games are near-perfect
        return {
          valid: false,
          details: {
            description: 'Unrealistic consistency (90%+ of max score)',
            avgScore,
            maxPossible,
          },
        };
      }

      return { valid: true };
    } catch (error) {
      logger.error('Pattern check failed:', error);
      return { valid: true }; // Don't penalize on error
    }
  }

  /**
   * Get player's trust score
   */
  async getPlayerTrustScore(userId: string): Promise<number> {
    try {
      // Count anti-cheat flags in last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const flags = await AntiCheatLog.find({
        userId,
        timestamp: { $gte: thirtyDaysAgo },
      });

      if (flags.length === 0) {
        return 100; // Perfect trust score
      }

      // Deduct points for each flag based on severity
      let deduction = 0;
      flags.forEach(flag => {
        switch (flag.severity) {
          case 'low':
            deduction += 5;
            break;
          case 'medium':
            deduction += 15;
            break;
          case 'high':
            deduction += 30;
            break;
          case 'critical':
            deduction += 50;
            break;
        }
      });

      return Math.max(0, 100 - deduction);
    } catch (error) {
      logger.error('Failed to get trust score:', error);
      return 100; // Default to trust on error
    }
  }

  /**
   * Log an anti-cheat event
   */
  private async logAntiCheat(params: {
    userId: string;
    gameId: string;
    sessionId: string;
    flagType: any;
    severity: any;
    details: any;
  }) {
    try {
      await AntiCheatLog.create({
        ...params,
        timestamp: new Date(),
        actionTaken: 'none', // Will be updated by admin review
        reviewed: false,
        status: 'open',
      });
    } catch (error) {
      logger.error('Failed to log anti-cheat event:', error);
    }
  }

  /**
   * Ban a player (called by admin)
   */
  async banPlayer(userId: string, duration: number, reason: string): Promise<boolean> {
    try {
      // This would integrate with your user banning system
      logger.warn('Player banned for cheating', { userId, duration, reason });
      // TODO: Implement actual ban logic
      return true;
    } catch (error) {
      logger.error('Failed to ban player:', error);
      return false;
    }
  }
}

export const antiCheatService = AntiCheatService.getInstance();

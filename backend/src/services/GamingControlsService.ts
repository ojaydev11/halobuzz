import { User } from '../models/User';
import { Game } from '../models/Game';
import { Transaction } from '../models/Transaction';
import { logger } from '../config/logger';

export interface GamingLimits {
  dailySpendLimit: number;
  weeklySpendLimit: number;
  monthlySpendLimit: number;
  sessionTimeLimit: number; // in minutes
  cooldownPeriod: number; // in minutes
  maxConcurrentGames: number;
}

export interface GamingSession {
  userId: string;
  sessionStart: Date;
  totalSpent: number;
  gamesPlayed: number;
  lastGameTime: Date;
}

export class GamingControlsService {
  private static instance: GamingControlsService;
  private activeSessions: Map<string, GamingSession> = new Map();
  private defaultLimits: GamingLimits = {
    dailySpendLimit: 1000, // coins
    weeklySpendLimit: 5000, // coins
    monthlySpendLimit: 20000, // coins
    sessionTimeLimit: 120, // 2 hours
    cooldownPeriod: 15, // 15 minutes
    maxConcurrentGames: 3
  };

  public static getInstance(): GamingControlsService {
    if (!GamingControlsService.instance) {
      GamingControlsService.instance = new GamingControlsService();
    }
    return GamingControlsService.instance;
  }

  /**
   * Check if user can play a game based on gaming controls
   */
  async canPlayGame(userId: string, gameId: string, betAmount: number): Promise<{
    allowed: boolean;
    reason?: string;
    limits?: GamingLimits;
  }> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { allowed: false, reason: 'User not found' };
      }

      // Check age verification
      if (!user.dateOfBirth) {
        return { allowed: false, reason: 'Age verification required' };
      }

      const age = this.calculateAge(user.dateOfBirth);
      if (age < 18) {
        return { allowed: false, reason: 'Must be 18+ to play games' };
      }

      // Check KYC status for high-value games
      if (betAmount > 100 && user.kycStatus !== 'verified') {
        return { allowed: false, reason: 'KYC verification required for high-value games' };
      }

      // Check daily spending limit
      const dailySpent = await this.getDailySpending(userId);
      if (dailySpent + betAmount > this.defaultLimits.dailySpendLimit) {
        return { 
          allowed: false, 
          reason: 'Daily spending limit exceeded',
          limits: this.defaultLimits
        };
      }

      // Check weekly spending limit
      const weeklySpent = await this.getWeeklySpending(userId);
      if (weeklySpent + betAmount > this.defaultLimits.weeklySpendLimit) {
        return { 
          allowed: false, 
          reason: 'Weekly spending limit exceeded',
          limits: this.defaultLimits
        };
      }

      // Check monthly spending limit
      const monthlySpent = await this.getMonthlySpending(userId);
      if (monthlySpent + betAmount > this.defaultLimits.monthlySpendLimit) {
        return { 
          allowed: false, 
          reason: 'Monthly spending limit exceeded',
          limits: this.defaultLimits
        };
      }

      // Check session limits
      const session = this.activeSessions.get(userId);
      if (session) {
        const sessionDuration = (Date.now() - session.sessionStart.getTime()) / (1000 * 60);
        if (sessionDuration > this.defaultLimits.sessionTimeLimit) {
          return { 
            allowed: false, 
            reason: 'Session time limit exceeded',
            limits: this.defaultLimits
          };
        }

        // Check cooldown period
        const timeSinceLastGame = (Date.now() - session.lastGameTime.getTime()) / (1000 * 60);
        if (timeSinceLastGame < this.defaultLimits.cooldownPeriod) {
          return { 
            allowed: false, 
            reason: `Please wait ${Math.ceil(this.defaultLimits.cooldownPeriod - timeSinceLastGame)} minutes before next game`,
            limits: this.defaultLimits
          };
        }

        // Check concurrent games limit
        if (session.gamesPlayed >= this.defaultLimits.maxConcurrentGames) {
          return { 
            allowed: false, 
            reason: 'Maximum concurrent games limit reached',
            limits: this.defaultLimits
          };
        }
      }

      // Check game-specific limits
      const game = await Game.findById(gameId);
      if (game) {
        // Enforce AI win rate bounds (35-55%)
        if (game.aiWinRate < 35 || game.aiWinRate > 55) {
          return { allowed: false, reason: 'Invalid game configuration' };
        }

        // Check if game is active
        if (!game.isActive) {
          return { allowed: false, reason: 'Game is not available' };
        }
      }

      return { allowed: true, limits: this.defaultLimits };
    } catch (error) {
      logger.error('Gaming controls check failed:', error);
      return { allowed: false, reason: 'Internal error' };
    }
  }

  /**
   * Start a gaming session for a user
   */
  startSession(userId: string): void {
    const session: GamingSession = {
      userId,
      sessionStart: new Date(),
      totalSpent: 0,
      gamesPlayed: 0,
      lastGameTime: new Date()
    };
    this.activeSessions.set(userId, session);
  }

  /**
   * Update session after a game
   */
  updateSession(userId: string, betAmount: number): void {
    const session = this.activeSessions.get(userId);
    if (session) {
      session.totalSpent += betAmount;
      session.gamesPlayed++;
      session.lastGameTime = new Date();
    }
  }

  /**
   * End a gaming session
   */
  endSession(userId: string): void {
    this.activeSessions.delete(userId);
  }

  /**
   * Get user's daily spending
   */
  private async getDailySpending(userId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const transactions = await Transaction.find({
      userId,
      type: 'game_won',
      createdAt: { $gte: startOfDay }
    });

    return transactions.reduce((sum, tx) => sum + (tx.metadata?.betAmount || 0), 0);
  }

  /**
   * Get user's weekly spending
   */
  private async getWeeklySpending(userId: string): Promise<number> {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const transactions = await Transaction.find({
      userId,
      type: 'game_won',
      createdAt: { $gte: startOfWeek }
    });

    return transactions.reduce((sum, tx) => sum + (tx.metadata?.betAmount || 0), 0);
  }

  /**
   * Get user's monthly spending
   */
  private async getMonthlySpending(userId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const transactions = await Transaction.find({
      userId,
      type: 'game_won',
      createdAt: { $gte: startOfMonth }
    });

    return transactions.reduce((sum, tx) => sum + (tx.metadata?.betAmount || 0), 0);
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Get gaming limits for a user
   */
  getLimits(): GamingLimits {
    return { ...this.defaultLimits };
  }

  /**
   * Update gaming limits (admin only)
   */
  updateLimits(newLimits: Partial<GamingLimits>): void {
    this.defaultLimits = { ...this.defaultLimits, ...newLimits };
    logger.info('Gaming limits updated:', newLimits);
  }

  /**
   * Get active sessions (admin only)
   */
  getActiveSessions(): GamingSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Force end a user's session (admin only)
   */
  forceEndSession(userId: string): boolean {
    return this.activeSessions.delete(userId);
  }
}

export const gamingControlsService = GamingControlsService.getInstance();

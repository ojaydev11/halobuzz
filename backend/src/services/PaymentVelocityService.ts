import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import logger from '../utils/logger';
import { getCache, setCache } from '../config/redis';

interface VelocityLimits {
  maxPaymentsPerHour: number;
  maxPaymentsPerDay: number;
  maxAmountPerHour: number;
  maxAmountPerDay: number;
  cooldownMinutes: number;
}

interface PaymentAttempt {
  timestamp: number;
  amount: number;
  method: string;
  success: boolean;
}

class PaymentVelocityService {
  private readonly DEFAULT_LIMITS: VelocityLimits = {
    maxPaymentsPerHour: 5,
    maxPaymentsPerDay: 20,
    maxAmountPerHour: 1000, // in base currency (USD/NPR)
    maxAmountPerDay: 5000,
    cooldownMinutes: 5
  };

  private readonly CACHE_TTL = 24 * 60 * 60; // 24 hours

  async checkVelocityLimits(
    userId: string,
    amount: number,
    paymentMethod: string
  ): Promise<{ allowed: boolean; reason?: string; retryAfter?: number }> {
    try {
      const limits = await this.getUserLimits(userId);
      const attempts = await this.getUserPaymentAttempts(userId);

      // Check hourly limits
      const hourAgo = Date.now() - 60 * 60 * 1000;
      const recentAttempts = attempts.filter(a => a.timestamp > hourAgo);
      const recentAmount = recentAttempts.reduce((sum, a) => sum + a.amount, 0);

      if (recentAttempts.length >= limits.maxPaymentsPerHour) {
        const oldestAttempt = Math.min(...recentAttempts.map(a => a.timestamp));
        const retryAfter = Math.ceil((oldestAttempt + 60 * 60 * 1000 - Date.now()) / 1000);
        return {
          allowed: false,
          reason: `Hourly payment limit exceeded (${limits.maxPaymentsPerHour} payments/hour)`,
          retryAfter
        };
      }

      if (recentAmount + amount > limits.maxAmountPerHour) {
        const retryAfter = Math.ceil((hourAgo + 60 * 60 * 1000 - Date.now()) / 1000);
        return {
          allowed: false,
          reason: `Hourly amount limit exceeded (${limits.maxAmountPerHour} ${this.getCurrency(paymentMethod)}/hour)`,
          retryAfter
        };
      }

      // Check daily limits
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const dailyAttempts = attempts.filter(a => a.timestamp > dayAgo);
      const dailyAmount = dailyAttempts.reduce((sum, a) => sum + a.amount, 0);

      if (dailyAttempts.length >= limits.maxPaymentsPerDay) {
        const oldestAttempt = Math.min(...dailyAttempts.map(a => a.timestamp));
        const retryAfter = Math.ceil((oldestAttempt + 24 * 60 * 60 * 1000 - Date.now()) / 1000);
        return {
          allowed: false,
          reason: `Daily payment limit exceeded (${limits.maxPaymentsPerDay} payments/day)`,
          retryAfter
        };
      }

      if (dailyAmount + amount > limits.maxAmountPerDay) {
        const retryAfter = Math.ceil((dayAgo + 24 * 60 * 60 * 1000 - Date.now()) / 1000);
        return {
          allowed: false,
          reason: `Daily amount limit exceeded (${limits.maxAmountPerDay} ${this.getCurrency(paymentMethod)}/day)`,
          retryAfter
        };
      }

      // Check cooldown
      const lastAttempt = attempts[attempts.length - 1];
      if (lastAttempt && lastAttempt.timestamp > Date.now() - limits.cooldownMinutes * 60 * 1000) {
        const retryAfter = Math.ceil((lastAttempt.timestamp + limits.cooldownMinutes * 60 * 1000 - Date.now()) / 1000);
        return {
          allowed: false,
          reason: `Payment cooldown active (${limits.cooldownMinutes} minutes between payments)`,
          retryAfter
        };
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Payment velocity check failed:', error);
      // Fail open for availability, but log the error
      return { allowed: true };
    }
  }

  async recordPaymentAttempt(
    userId: string,
    amount: number,
    paymentMethod: string,
    success: boolean
  ): Promise<void> {
    try {
      const attempt: PaymentAttempt = {
        timestamp: Date.now(),
        amount,
        method: paymentMethod,
        success
      };

      const attempts = await this.getUserPaymentAttempts(userId);
      attempts.push(attempt);

      // Keep only last 24 hours of attempts
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const filteredAttempts = attempts.filter(a => a.timestamp > dayAgo);

      await setCache(
        `payment_attempts:${userId}`,
        filteredAttempts,
        this.CACHE_TTL
      );

      // Log suspicious activity
      if (!success) {
        await this.logSuspiciousActivity(userId, amount, paymentMethod, 'payment_failed');
      }

      // Check for rapid failures (potential fraud)
      const recentFailures = filteredAttempts.filter(
        a => !a.success && a.timestamp > Date.now() - 60 * 60 * 1000
      );
      if (recentFailures.length >= 3) {
        await this.logSuspiciousActivity(userId, amount, paymentMethod, 'rapid_failures');
      }
    } catch (error) {
      logger.error('Failed to record payment attempt:', error);
    }
  }

  async getUserLimits(userId: string): Promise<VelocityLimits> {
    try {
      // Check if user has custom limits (VIP, high-trust users)
      const user = await User.findById(userId).select('trust.score ogLevel');
      if (!user) {
        return this.DEFAULT_LIMITS;
      }

      // Adjust limits based on trust score and OG level
      const trustMultiplier = Math.min(2, 1 + (user.trust?.score || 0) / 100);
      const ogMultiplier = Math.min(3, 1 + (user.ogLevel || 0) * 0.5);

      return {
        maxPaymentsPerHour: Math.floor(this.DEFAULT_LIMITS.maxPaymentsPerHour * trustMultiplier),
        maxPaymentsPerDay: Math.floor(this.DEFAULT_LIMITS.maxPaymentsPerDay * trustMultiplier),
        maxAmountPerHour: Math.floor(this.DEFAULT_LIMITS.maxAmountPerHour * ogMultiplier),
        maxAmountPerDay: Math.floor(this.DEFAULT_LIMITS.maxAmountPerDay * ogMultiplier),
        cooldownMinutes: Math.max(1, Math.floor(this.DEFAULT_LIMITS.cooldownMinutes / trustMultiplier))
      };
    } catch (error) {
      logger.error('Failed to get user limits:', error);
      return this.DEFAULT_LIMITS;
    }
  }

  async getUserPaymentAttempts(userId: string): Promise<PaymentAttempt[]> {
    try {
      const attempts = await getCache<PaymentAttempt[]>(`payment_attempts:${userId}`);
      return attempts || [];
    } catch (error) {
      logger.error('Failed to get user payment attempts:', error);
      return [];
    }
  }

  async getDailySpending(userId: string): Promise<number> {
    try {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const transactions = await Transaction.find({
        userId,
        type: 'recharge',
        status: 'completed',
        createdAt: { $gte: dayAgo }
      });

      return transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    } catch (error) {
      logger.error('Failed to get daily spending:', error);
      return 0;
    }
  }

  async enforceDailySpendingLimit(userId: string, amount: number): Promise<boolean> {
    try {
      const dailySpending = await this.getDailySpending(userId);
      const limits = await this.getUserLimits(userId);

      return dailySpending + amount <= limits.maxAmountPerDay;
    } catch (error) {
      logger.error('Failed to check daily spending limit:', error);
      return true; // Fail open
    }
  }

  private async logSuspiciousActivity(
    userId: string,
    amount: number,
    paymentMethod: string,
    reason: string
  ): Promise<void> {
    try {
      logger.warn('Suspicious payment activity detected', {
        userId,
        amount,
        paymentMethod,
        reason,
        timestamp: new Date().toISOString(),
        ip: 'unknown' // Would be passed from request context
      });

      // In a real implementation, this would:
      // 1. Store in a fraud detection database
      // 2. Send alerts to security team
      // 3. Potentially flag the user for manual review
    } catch (error) {
      logger.error('Failed to log suspicious activity:', error);
    }
  }

  private getCurrency(paymentMethod: string): string {
    switch (paymentMethod) {
      case 'esewa':
      case 'khalti':
        return 'NPR';
      case 'stripe':
        return 'USD';
      default:
        return 'USD';
    }
  }

  // Admin methods for managing limits
  async setUserLimits(userId: string, limits: Partial<VelocityLimits>): Promise<void> {
    try {
      await setCache(`user_limits:${userId}`, limits, this.CACHE_TTL);
      logger.info(`Custom payment limits set for user ${userId}`, limits);
    } catch (error) {
      logger.error('Failed to set user limits:', error);
      throw error;
    }
  }

  async resetUserAttempts(userId: string): Promise<void> {
    try {
      await setCache(`payment_attempts:${userId}`, [], this.CACHE_TTL);
      logger.info(`Payment attempts reset for user ${userId}`);
    } catch (error) {
      logger.error('Failed to reset user attempts:', error);
      throw error;
    }
  }
}

export const paymentVelocityService = new PaymentVelocityService();

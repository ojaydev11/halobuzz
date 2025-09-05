import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { logger } from '../config/logger';
import { getCache, setCache } from '../config/redis';

interface FraudScore {
  score: number; // 0-100, higher = more suspicious
  factors: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface FraudCheckResult {
  isFraud: boolean;
  score: number;
  factors: string[];
  riskLevel: string;
  shouldBlock: boolean;
  shouldReview: boolean;
}

class FraudDetectionService {
  private readonly FRAUD_THRESHOLDS = {
    low: 30,
    medium: 50,
    high: 70,
    critical: 90
  };

  private readonly CACHE_TTL = 60 * 60; // 1 hour

  async checkPaymentFraud(
    userId: string,
    amount: number,
    paymentMethod: string,
    metadata: any = {}
  ): Promise<FraudCheckResult> {
    try {
      const fraudScore = await this.calculateFraudScore(userId, amount, paymentMethod, metadata);
      
      const result: FraudCheckResult = {
        isFraud: fraudScore.score >= this.FRAUD_THRESHOLDS.high,
        score: fraudScore.score,
        factors: fraudScore.factors,
        riskLevel: fraudScore.riskLevel,
        shouldBlock: fraudScore.score >= this.FRAUD_THRESHOLDS.critical,
        shouldReview: fraudScore.score >= this.FRAUD_THRESHOLDS.medium
      };

      // Log high-risk transactions
      if (result.shouldReview) {
        await this.logFraudAlert(userId, amount, paymentMethod, result);
      }

      return result;
    } catch (error) {
      logger.error('Fraud detection failed:', error);
      // Fail open for availability
      return {
        isFraud: false,
        score: 0,
        factors: ['fraud_check_failed'],
        riskLevel: 'low',
        shouldBlock: false,
        shouldReview: false
      };
    }
  }

  private async calculateFraudScore(
    userId: string,
    amount: number,
    paymentMethod: string,
    metadata: any
  ): Promise<FraudScore> {
    const factors: string[] = [];
    let score = 0;

    // Check user account age and activity
    const user = await User.findById(userId).select('createdAt lastActiveAt trust.score');
    if (user) {
      const accountAge = Date.now() - user.createdAt.getTime();
      const daysSinceCreation = accountAge / (1000 * 60 * 60 * 24);

      if (daysSinceCreation < 1) {
        score += 25;
        factors.push('new_account');
      } else if (daysSinceCreation < 7) {
        score += 15;
        factors.push('recent_account');
      }

      // Check trust score
      if (user.trust?.score < 30) {
        score += 20;
        factors.push('low_trust_score');
      }

      // Check last activity
      if (user.lastActiveAt) {
        const daysSinceActivity = (Date.now() - user.lastActiveAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceActivity > 30) {
          score += 15;
          factors.push('inactive_account');
        }
      }
    }

    // Check transaction patterns
    const recentTransactions = await this.getRecentTransactions(userId, 24); // Last 24 hours
    const recentAmount = recentTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);

    if (recentAmount > 1000) {
      score += 20;
      factors.push('high_recent_spending');
    }

    if (recentTransactions.length > 10) {
      score += 15;
      factors.push('high_transaction_frequency');
    }

    // Check for unusual amounts
    if (amount > 5000) {
      score += 25;
      factors.push('unusually_high_amount');
    }

    // Check for round numbers (potential test transactions)
    if (amount % 100 === 0 && amount > 100) {
      score += 10;
      factors.push('round_number_amount');
    }

    // Check payment method patterns
    const methodTransactions = recentTransactions.filter(tx => tx.paymentMethod === paymentMethod);
    if (methodTransactions.length > 5) {
      score += 15;
      factors.push('repeated_payment_method');
    }

    // Check for velocity patterns
    const velocityScore = await this.checkVelocityPatterns(userId, amount, paymentMethod);
    score += velocityScore.score;
    factors.push(...velocityScore.factors);

    // Check for geographic anomalies (if IP data available)
    if (metadata.ip) {
      const geoScore = await this.checkGeographicAnomalies(userId, metadata.ip);
      score += geoScore.score;
      factors.push(...geoScore.factors);
    }

    // Check for device anomalies
    if (metadata.deviceId) {
      const deviceScore = await this.checkDeviceAnomalies(userId, metadata.deviceId);
      score += deviceScore.score;
      factors.push(...deviceScore.factors);
    }

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (score >= this.FRAUD_THRESHOLDS.critical) {
      riskLevel = 'critical';
    } else if (score >= this.FRAUD_THRESHOLDS.high) {
      riskLevel = 'high';
    } else if (score >= this.FRAUD_THRESHOLDS.medium) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    return {
      score: Math.min(100, score),
      factors,
      riskLevel
    };
  }

  private async checkVelocityPatterns(
    userId: string,
    amount: number,
    paymentMethod: string
  ): Promise<{ score: number; factors: string[] }> {
    const factors: string[] = [];
    let score = 0;

    try {
      // Check for rapid successive payments
      const recentTransactions = await this.getRecentTransactions(userId, 1); // Last hour
      if (recentTransactions.length >= 3) {
        score += 20;
        factors.push('rapid_successive_payments');
      }

      // Check for increasing amounts (potential testing)
      const amounts = recentTransactions.map(tx => tx.amount || 0).sort((a, b) => a - b);
      if (amounts.length >= 3) {
        const isIncreasing = amounts.every((amount, index) => 
          index === 0 || amount >= amounts[index - 1]
        );
        if (isIncreasing) {
          score += 15;
          factors.push('increasing_amount_pattern');
        }
      }

      return { score, factors };
    } catch (error) {
      logger.error('Velocity pattern check failed:', error);
      return { score: 0, factors: [] };
    }
  }

  private async checkGeographicAnomalies(
    userId: string,
    ip: string
  ): Promise<{ score: number; factors: string[] }> {
    const factors: string[] = [];
    let score = 0;

    try {
      // Get user's typical location
      const userLocation = await getCache<string>(`user_location:${userId}`);
      
      if (userLocation) {
        // In a real implementation, you would:
        // 1. Look up the IP's location
        // 2. Compare with user's typical location
        // 3. Check for VPN/proxy usage
        // 4. Check for high-risk countries
        
        // For now, we'll do a simple check
        if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
          score += 10;
          factors.push('private_ip_address');
        }
      }

      return { score, factors };
    } catch (error) {
      logger.error('Geographic anomaly check failed:', error);
      return { score: 0, factors: [] };
    }
  }

  private async checkDeviceAnomalies(
    userId: string,
    deviceId: string
  ): Promise<{ score: number; factors: string[] }> {
    const factors: string[] = [];
    let score = 0;

    try {
      // Check if this is a new device
      const knownDevices = await getCache<string[]>(`user_devices:${userId}`) || [];
      
      if (!knownDevices.includes(deviceId)) {
        score += 15;
        factors.push('new_device');
        
        // Add to known devices
        knownDevices.push(deviceId);
        await setCache(`user_devices:${userId}`, knownDevices, this.CACHE_TTL);
      }

      // Check for multiple devices in short time
      const recentDevices = await getCache<string[]>(`recent_devices:${userId}`) || [];
      if (recentDevices.length > 3) {
        score += 20;
        factors.push('multiple_devices');
      }

      return { score, factors };
    } catch (error) {
      logger.error('Device anomaly check failed:', error);
      return { score: 0, factors: [] };
    }
  }

  private async getRecentTransactions(userId: string, hours: number): Promise<any[]> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      return await Transaction.find({
        userId,
        createdAt: { $gte: since }
      }).sort({ createdAt: -1 });
    } catch (error) {
      logger.error('Failed to get recent transactions:', error);
      return [];
    }
  }

  private async logFraudAlert(
    userId: string,
    amount: number,
    paymentMethod: string,
    result: FraudCheckResult
  ): Promise<void> {
    try {
      logger.warn('Fraud alert triggered', {
        userId,
        amount,
        paymentMethod,
        fraudScore: result.score,
        riskLevel: result.riskLevel,
        factors: result.factors,
        timestamp: new Date().toISOString()
      });

      // Store in fraud detection database
      await setCache(
        `fraud_alert:${userId}:${Date.now()}`,
        {
          userId,
          amount,
          paymentMethod,
          score: result.score,
          riskLevel: result.riskLevel,
          factors: result.factors,
          timestamp: new Date().toISOString()
        },
        this.CACHE_TTL
      );
    } catch (error) {
      logger.error('Failed to log fraud alert:', error);
    }
  }

  // Admin methods
  async getFraudHistory(userId: string): Promise<any[]> {
    try {
      const alerts = await getCache<any[]>(`fraud_alert:${userId}:*`);
      return alerts || [];
    } catch (error) {
      logger.error('Failed to get fraud history:', error);
      return [];
    }
  }

  async whitelistUser(userId: string, reason: string): Promise<void> {
    try {
      await setCache(`fraud_whitelist:${userId}`, {
        reason,
        timestamp: new Date().toISOString()
      }, this.CACHE_TTL);
      
      logger.info(`User ${userId} whitelisted for fraud detection`, { reason });
    } catch (error) {
      logger.error('Failed to whitelist user:', error);
      throw error;
    }
  }

  async isUserWhitelisted(userId: string): Promise<boolean> {
    try {
      const whitelist = await getCache(`fraud_whitelist:${userId}`);
      return !!whitelist;
    } catch (error) {
      logger.error('Failed to check user whitelist:', error);
      return false;
    }
  }
}

export const fraudDetectionService = new FraudDetectionService();

import { logger } from '../config/logger';
import mongoose from 'mongoose';
import { User } from '@/models/User';

// Fraud detection schemas
const fraudEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deviceId: { type: String },
  ip: { type: String, required: true },
  eventType: { 
    type: String, 
    required: true,
    enum: ['payment_attempt', 'payment_success', 'payment_failure', 'chargeback', 'dispute']
  },
  amount: { type: Number },
  currency: { type: String, default: 'USD' },
  paymentMethod: { type: String },
  riskScore: { type: Number, min: 0, max: 100 },
  riskFactors: [{ type: String }],
  blocked: { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now }
});

const deviceFingerprintSchema = new mongoose.Schema({
  deviceId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  firstSeen: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now },
  userAgent: { type: String },
  acceptLanguage: { type: String },
  screenResolution: { type: String },
  timezone: { type: String },
  ipHistory: [{ 
    ip: String, 
    timestamp: { type: Date, default: Date.now },
    country: String,
    city: String
  }],
  trustScore: { type: Number, min: 0, max: 100, default: 50 },
  flagged: { type: Boolean, default: false },
  flagReason: { type: String }
});

const velocityControlSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deviceId: { type: String },
  ip: { type: String },
  controlType: { 
    type: String, 
    required: true,
    enum: ['hourly_recharges', 'daily_coins', 'hourly_failures', 'daily_losses']
  },
  count: { type: Number, default: 0 },
  amount: { type: Number, default: 0 },
  windowStart: { type: Date, required: true },
  windowEnd: { type: Date, required: true },
  blocked: { type: Boolean, default: false }
});

const transactionReviewSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  paymentMethod: { type: String },
  riskScore: { type: Number, required: true },
  riskFactors: [{ type: String }],
  status: { 
    type: String, 
    required: true,
    enum: ['pending', 'approved', 'denied', 'escalated'],
    default: 'pending'
  },
  reviewedBy: { type: String },
  reviewedAt: { type: Date },
  reviewNotes: { type: String },
  autoBlocked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const FraudEvent = mongoose.model('FraudEvent', fraudEventSchema);
const DeviceFingerprint = mongoose.model('DeviceFingerprint', deviceFingerprintSchema);
const VelocityControl = mongoose.model('VelocityControl', velocityControlSchema);
const TransactionReview = mongoose.model('TransactionReview', transactionReviewSchema);

interface VelocityLimits {
  maxRechargesHr: number;
  maxCoinsPerDay: number;
  maxFailuresHr: number;
  maxLossesPerDay: number;
}

interface RiskAssessment {
  score: number;
  factors: string[];
  blocked: boolean;
  requiresReview: boolean;
}

class PaymentFraudService {
  private readonly DEFAULT_VELOCITY_LIMITS: VelocityLimits = {
    maxRechargesHr: 10,
    maxCoinsPerDay: 10000,
    maxFailuresHr: 5,
    maxLossesPerDay: 5000
  };

  private readonly HIGH_RISK_THRESHOLD = 70;
  private readonly REVIEW_THRESHOLD = 50;

  async assessPaymentRisk(
    userId: string,
    deviceId: string | undefined,
    ip: string,
    amount: number,
    paymentMethod: string
  ): Promise<RiskAssessment> {
    try {
      const riskFactors: string[] = [];
      let riskScore = 0;

      // Check velocity limits
      const velocityCheck = await this.checkVelocityLimits(userId, deviceId, ip, amount);
      if (velocityCheck.blocked) {
        return {
          score: 100,
          factors: velocityCheck.violations,
          blocked: true,
          requiresReview: false
        };
      }
      riskFactors.push(...velocityCheck.violations);
      riskScore += velocityCheck.violations.length * 15;

      // Check device trust score
      if (deviceId) {
        const deviceTrust = await this.getDeviceTrustScore(deviceId);
        if (deviceTrust < 30) {
          riskFactors.push('low_device_trust');
          riskScore += 25;
        }
      } else {
        riskFactors.push('no_device_id');
        riskScore += 20;
      }

      // Check user payment history
      const userRisk = await this.assessUserRisk(userId);
      riskScore += userRisk.score;
      riskFactors.push(...userRisk.factors);

      // Check amount-based risk
      if (amount > 1000) {
        riskFactors.push('high_amount');
        riskScore += 15;
      }
      if (amount > 5000) {
        riskFactors.push('very_high_amount');
        riskScore += 25;
      }

      // Check IP reputation (simplified)
      const ipRisk = await this.assessIPRisk(ip);
      riskScore += ipRisk.score;
      riskFactors.push(...ipRisk.factors);

      // Cap risk score at 100
      riskScore = Math.min(riskScore, 100);

      const blocked = riskScore >= this.HIGH_RISK_THRESHOLD;
      const requiresReview = riskScore >= this.REVIEW_THRESHOLD && !blocked;

      return {
        score: riskScore,
        factors: riskFactors,
        blocked,
        requiresReview
      };
    } catch (error) {
      logger.error('Error assessing payment risk:', error);
      // Fail safe - require review for unknown errors
      return {
        score: this.REVIEW_THRESHOLD,
        factors: ['assessment_error'],
        blocked: false,
        requiresReview: true
      };
    }
  }

  async recordPaymentEvent(
    userId: string,
    deviceId: string | undefined,
    ip: string,
    eventType: 'payment_attempt' | 'payment_success' | 'payment_failure' | 'chargeback' | 'dispute',
    amount?: number,
    paymentMethod?: string,
    riskScore?: number,
    blocked = false
  ): Promise<void> {
    try {
      await FraudEvent.create({
        userId,
        deviceId,
        ip,
        eventType,
        amount,
        paymentMethod,
        riskScore,
        blocked,
        riskFactors: []
      });

      // Update device fingerprint
      if (deviceId) {
        await this.updateDeviceFingerprint(deviceId, userId, ip);
      }

      // Update velocity controls
      await this.updateVelocityControls(userId, deviceId, ip, eventType, amount || 0);

      logger.info('Payment event recorded', {
        userId,
        deviceId,
        eventType,
        amount,
        riskScore,
        blocked
      });
    } catch (error) {
      logger.error('Error recording payment event:', error);
    }
  }

  async checkVelocityLimits(
    userId: string,
    deviceId: string | undefined,
    ip: string,
    amount: number
  ): Promise<{ blocked: boolean; violations: string[] }> {
    const violations: string[] = [];
    const now = new Date();

    try {
      // Check hourly recharge attempts
      const hourlyRecharges = await VelocityControl.countDocuments({
        userId,
        controlType: 'hourly_recharges',
        windowStart: { $lte: now },
        windowEnd: { $gt: now }
      });

      if (hourlyRecharges >= this.DEFAULT_VELOCITY_LIMITS.maxRechargesHr) {
        violations.push('max_hourly_recharges_exceeded');
      }

      // Check daily coin purchases
      const dailyCoins = await VelocityControl.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(userId),
            controlType: 'daily_coins',
            windowStart: { $lte: now },
            windowEnd: { $gt: now }
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' }
          }
        }
      ]);

      const totalDailyCoins = dailyCoins[0]?.totalAmount || 0;
      if (totalDailyCoins + amount > this.DEFAULT_VELOCITY_LIMITS.maxCoinsPerDay) {
        violations.push('max_daily_coins_exceeded');
      }

      // Check hourly failures
      const hourlyFailures = await VelocityControl.countDocuments({
        $or: [{ userId }, { deviceId }, { ip }],
        controlType: 'hourly_failures',
        windowStart: { $lte: now },
        windowEnd: { $gt: now }
      });

      if (hourlyFailures >= this.DEFAULT_VELOCITY_LIMITS.maxFailuresHr) {
        violations.push('max_hourly_failures_exceeded');
      }

      return {
        blocked: violations.length > 0,
        violations
      };
    } catch (error) {
      logger.error('Error checking velocity limits:', error);
      return { blocked: false, violations: [] };
    }
  }

  async getDeviceTrustScore(deviceId: string): Promise<number> {
    try {
      const device = await DeviceFingerprint.findOne({ deviceId });
      return device?.trustScore || 50; // Default neutral trust
    } catch (error) {
      logger.error('Error getting device trust score:', error);
      return 50;
    }
  }

  async updateDeviceFingerprint(
    deviceId: string,
    userId: string,
    ip: string,
    userAgent?: string,
    acceptLanguage?: string
  ): Promise<void> {
    try {
      const now = new Date();
      
      await DeviceFingerprint.findOneAndUpdate(
        { deviceId },
        {
          $set: {
            userId,
            lastSeen: now,
            userAgent,
            acceptLanguage
          },
          $push: {
            ipHistory: {
              $each: [{ ip, timestamp: now }],
              $slice: -10 // Keep only last 10 IPs
            }
          },
          $setOnInsert: {
            firstSeen: now,
            trustScore: 50
          }
        },
        { upsert: true }
      );
    } catch (error) {
      logger.error('Error updating device fingerprint:', error);
    }
  }

  async assessUserRisk(userId: string): Promise<{ score: number; factors: string[] }> {
    try {
      const factors: string[] = [];
      let score = 0;

      // Check for recent chargebacks/disputes
      const recentDisputes = await FraudEvent.countDocuments({
        userId,
        eventType: { $in: ['chargeback', 'dispute'] },
        timestamp: { $gt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // 30 days
      });

      if (recentDisputes > 0) {
        factors.push('recent_disputes');
        score += recentDisputes * 30;
      }

      // Check failure rate
      const recentAttempts = await FraudEvent.countDocuments({
        userId,
        eventType: 'payment_attempt',
        timestamp: { $gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // 7 days
      });

      const recentFailures = await FraudEvent.countDocuments({
        userId,
        eventType: 'payment_failure',
        timestamp: { $gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // 7 days
      });

      if (recentAttempts > 0) {
        const failureRate = recentFailures / recentAttempts;
        if (failureRate > 0.5) {
          factors.push('high_failure_rate');
          score += 20;
        }
      }

      // Check account age
      const user = await User.findById(userId);
      if (user) {
        const accountAge = Date.now() - user.createdAt.getTime();
        const daysSinceCreation = accountAge / (24 * 60 * 60 * 1000);
        
        if (daysSinceCreation < 1) {
          factors.push('new_account');
          score += 25;
        } else if (daysSinceCreation < 7) {
          factors.push('young_account');
          score += 15;
        }
      }

      return { score: Math.min(score, 100), factors };
    } catch (error) {
      logger.error('Error assessing user risk:', error);
      return { score: 0, factors: [] };
    }
  }

  async assessIPRisk(ip: string): Promise<{ score: number; factors: string[] }> {
    // Simplified IP risk assessment
    // In production, this would integrate with IP reputation services
    const factors: string[] = [];
    let score = 0;

    try {
      // Check for recent failures from this IP
      const recentFailures = await FraudEvent.countDocuments({
        ip,
        eventType: 'payment_failure',
        timestamp: { $gt: new Date(Date.now() - 60 * 60 * 1000) } // 1 hour
      });

      if (recentFailures > 3) {
        factors.push('ip_recent_failures');
        score += 20;
      }

      // Check for multiple users from same IP
      const uniqueUsers = await FraudEvent.distinct('userId', {
        ip,
        timestamp: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // 24 hours
      });

      if (uniqueUsers.length > 5) {
        factors.push('ip_multiple_users');
        score += 15;
      }

      return { score: Math.min(score, 50), factors };
    } catch (error) {
      logger.error('Error assessing IP risk:', error);
      return { score: 0, factors: [] };
    }
  }

  async updateVelocityControls(
    userId: string,
    deviceId: string | undefined,
    ip: string,
    eventType: string,
    amount: number
  ): Promise<void> {
    try {
      const now = new Date();
      
      if (eventType === 'payment_attempt') {
        // Update hourly recharge attempts
        const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
        const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

        await VelocityControl.findOneAndUpdate(
          {
            userId,
            controlType: 'hourly_recharges',
            windowStart: hourStart,
            windowEnd: hourEnd
          },
          {
            $inc: { count: 1 },
            $setOnInsert: {
              userId,
              deviceId,
              ip,
              controlType: 'hourly_recharges',
              windowStart: hourStart,
              windowEnd: hourEnd
            }
          },
          { upsert: true }
        );
      }

      if (eventType === 'payment_success') {
        // Update daily coin purchases
        const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

        await VelocityControl.findOneAndUpdate(
          {
            userId,
            controlType: 'daily_coins',
            windowStart: dayStart,
            windowEnd: dayEnd
          },
          {
            $inc: { count: 1, amount: amount },
            $setOnInsert: {
              userId,
              deviceId,
              ip,
              controlType: 'daily_coins',
              windowStart: dayStart,
              windowEnd: dayEnd
            }
          },
          { upsert: true }
        );
      }

      if (eventType === 'payment_failure') {
        // Update hourly failures
        const hourStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
        const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

        await VelocityControl.findOneAndUpdate(
          {
            $or: [{ userId }, { deviceId }, { ip }],
            controlType: 'hourly_failures',
            windowStart: hourStart,
            windowEnd: hourEnd
          },
          {
            $inc: { count: 1 },
            $setOnInsert: {
              userId,
              deviceId,
              ip,
              controlType: 'hourly_failures',
              windowStart: hourStart,
              windowEnd: hourEnd
            }
          },
          { upsert: true }
        );
      }
    } catch (error) {
      logger.error('Error updating velocity controls:', error);
    }
  }

  async createReviewTransaction(
    transactionId: string,
    userId: string,
    amount: number,
    paymentMethod: string,
    riskScore: number,
    riskFactors: string[]
  ): Promise<void> {
    try {
      await TransactionReview.create({
        transactionId,
        userId,
        amount,
        paymentMethod,
        riskScore,
        riskFactors,
        status: 'pending',
        autoBlocked: riskScore >= this.HIGH_RISK_THRESHOLD
      });

      logger.info('Transaction queued for review', {
        transactionId,
        userId,
        amount,
        riskScore
      });
    } catch (error) {
      logger.error('Error creating review transaction:', error);
    }
  }

  async getPendingReviews(): Promise<any[]> {
    try {
      return await TransactionReview.find({ status: 'pending' })
        .populate('userId', 'username email')
        .sort({ createdAt: -1 });
    } catch (error) {
      logger.error('Error getting pending reviews:', error);
      return [];
    }
  }

  async reviewTransaction(
    transactionId: string,
    status: 'approved' | 'denied',
    reviewedBy: string,
    notes?: string
  ): Promise<void> {
    try {
      await TransactionReview.findOneAndUpdate(
        { transactionId },
        {
          status,
          reviewedBy,
          reviewedAt: new Date(),
          reviewNotes: notes
        }
      );

      logger.info('Transaction reviewed', {
        transactionId,
        status,
        reviewedBy
      });
    } catch (error) {
      logger.error('Error reviewing transaction:', error);
    }
  }
}

export const paymentFraudService = new PaymentFraudService();
export { FraudEvent, DeviceFingerprint, VelocityControl, TransactionReview };

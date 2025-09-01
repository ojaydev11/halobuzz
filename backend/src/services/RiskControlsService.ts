import { logger } from '@/config/logger';
import mongoose from 'mongoose';
import { User } from '@/models/User';

// Risk control schemas
const riskControlConfigSchema = new mongoose.Schema({
  country: { type: String, required: true },
  gamesEnabled: { type: Boolean, default: false },
  dailyLossLimit: { type: Number, default: 1000 },
  dailySpendLimit: { type: Number, default: 2000 },
  sessionTimeLimit: { type: Number, default: 3600 }, // seconds
  cooldownPeriod: { type: Number, default: 900 }, // seconds
  realityCheckInterval: { type: Number, default: 1800 }, // seconds
  selfExclusionMaxDays: { type: Number, default: 365 },
  lastModified: { type: Date, default: Date.now },
  modifiedBy: { type: String, default: 'system' }
});

const userRiskProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  riskLevel: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'whale'], 
    default: 'low' 
  },
  totalSpent: { type: Number, default: 0 },
  totalLosses: { type: Number, default: 0 },
  dailySpent: { type: Number, default: 0 },
  dailyLosses: { type: Number, default: 0 },
  lastSpendDate: { type: Date },
  lastLossDate: { type: Date },
  sessionStartTime: { type: Date },
  sessionDuration: { type: Number, default: 0 }, // seconds
  isInSession: { type: Boolean, default: false },
  lastRealityCheck: { type: Date },
  realityCheckCount: { type: Number, default: 0 },
  selfExclusionEnd: { type: Date },
  selfExclusionReason: { type: String },
  adminExclusionEnd: { type: Date },
  adminExclusionReason: { type: String },
  customLimits: {
    dailyLossLimit: { type: Number },
    dailySpendLimit: { type: Number },
    sessionTimeLimit: { type: Number }
  },
  warningsIssued: { type: Number, default: 0 },
  lastWarning: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const sessionHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sessionStart: { type: Date, required: true },
  sessionEnd: { type: Date },
  duration: { type: Number }, // seconds
  spent: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  gamesPlayed: { type: Number, default: 0 },
  realityChecksShown: { type: Number, default: 0 },
  forcedBreak: { type: Boolean, default: false },
  selfEnded: { type: Boolean, default: false }
});

const responsibleGamingActionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  actionType: {
    type: String,
    required: true,
    enum: [
      'self_exclusion',
      'admin_exclusion', 
      'limit_set',
      'limit_exceeded',
      'reality_check',
      'forced_break',
      'warning_issued',
      'session_timeout'
    ]
  },
  details: { type: mongoose.Schema.Types.Mixed },
  triggeredBy: { type: String }, // 'user', 'system', 'admin'
  timestamp: { type: Date, default: Date.now }
});

const RiskControlConfig = mongoose.model('RiskControlConfig', riskControlConfigSchema);
const UserRiskProfile = mongoose.model('UserRiskProfile', userRiskProfileSchema);
const SessionHistory = mongoose.model('SessionHistory', sessionHistorySchema);
const ResponsibleGamingAction = mongoose.model('ResponsibleGamingAction', responsibleGamingActionSchema);

interface RiskAssessment {
  allowed: boolean;
  reason?: string;
  warningMessage?: string;
  requiresBreak?: boolean;
  cooldownUntil?: Date;
  limitsExceeded?: string[];
}

interface SessionStatus {
  isActive: boolean;
  startTime?: Date;
  duration: number;
  timeRemaining?: number;
  requiresBreak: boolean;
  nextRealityCheck?: Date;
}

class RiskControlsService {
  private readonly DEFAULT_COUNTRY_CONFIG = {
    gamesEnabled: false, // Default disabled for safety
    dailyLossLimit: 500,
    dailySpendLimit: 1000,
    sessionTimeLimit: 3600, // 1 hour
    cooldownPeriod: 900, // 15 minutes
    realityCheckInterval: 1800, // 30 minutes
    selfExclusionMaxDays: 365
  };

  private readonly WHALE_THRESHOLDS = {
    dailySpend: 1000,
    weeklySpend: 5000,
    monthlySpend: 15000
  };

  async initializeCountryConfig(country: string): Promise<void> {
    try {
      await RiskControlConfig.findOneAndUpdate(
        { country },
        {
          country,
          ...this.DEFAULT_COUNTRY_CONFIG
        },
        { upsert: true, setDefaultsOnInsert: true }
      );

      logger.info(`Risk control config initialized for country: ${country}`);
    } catch (error) {
      logger.error(`Error initializing country config for ${country}:`, error);
    }
  }

  async isGamesEnabledForCountry(country: string): Promise<boolean> {
    try {
      const config = await RiskControlConfig.findOne({ country });
      return config?.gamesEnabled || false;
    } catch (error) {
      logger.error(`Error checking games enabled for country ${country}:`, error);
      return false; // Fail safe - disable games if uncertain
    }
  }

  async assessUserRisk(userId: string, amount: number, action: 'spend' | 'loss'): Promise<RiskAssessment> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { allowed: false, reason: 'user_not_found' };
      }

      // Check age verification
      if (!user.ageVerified || user.age < 18) {
        return { allowed: false, reason: 'age_verification_required' };
      }

      // Get user's country config
      const countryConfig = await RiskControlConfig.findOne({ country: user.country });
      if (!countryConfig?.gamesEnabled) {
        return { allowed: false, reason: 'games_disabled_in_country' };
      }

      // Get or create user risk profile
      let riskProfile = await UserRiskProfile.findOne({ userId });
      if (!riskProfile) {
        riskProfile = await UserRiskProfile.create({ userId });
      }

      // Check self-exclusion
      if (riskProfile.selfExclusionEnd && riskProfile.selfExclusionEnd > new Date()) {
        return {
          allowed: false,
          reason: 'self_excluded',
          cooldownUntil: riskProfile.selfExclusionEnd
        };
      }

      // Check admin exclusion
      if (riskProfile.adminExclusionEnd && riskProfile.adminExclusionEnd > new Date()) {
        return {
          allowed: false,
          reason: 'admin_excluded',
          cooldownUntil: riskProfile.adminExclusionEnd
        };
      }

      // Check daily limits
      const today = new Date();
      const isNewDay = !riskProfile.lastSpendDate || 
        riskProfile.lastSpendDate.toDateString() !== today.toDateString();

      if (isNewDay) {
        // Reset daily counters
        riskProfile.dailySpent = 0;
        riskProfile.dailyLosses = 0;
        riskProfile.lastSpendDate = today;
      }

      const limitsExceeded: string[] = [];
      
      // Check daily spend limit
      const dailySpendLimit = riskProfile.customLimits?.dailySpendLimit || countryConfig.dailySpendLimit;
      if (action === 'spend' && riskProfile.dailySpent + amount > dailySpendLimit) {
        limitsExceeded.push('daily_spend_limit');
      }

      // Check daily loss limit
      const dailyLossLimit = riskProfile.customLimits?.dailyLossLimit || countryConfig.dailyLossLimit;
      if (action === 'loss' && riskProfile.dailyLosses + amount > dailyLossLimit) {
        limitsExceeded.push('daily_loss_limit');
      }

      // Check session time limit
      const sessionCheck = await this.checkSessionLimits(userId, countryConfig);
      if (!sessionCheck.allowed) {
        return sessionCheck;
      }

      if (limitsExceeded.length > 0) {
        return {
          allowed: false,
          reason: 'limits_exceeded',
          limitsExceeded
        };
      }

      // Check for whale status and additional protections
      const whaleCheck = await this.checkWhaleProtections(userId, amount, action);
      if (!whaleCheck.allowed) {
        return whaleCheck;
      }

      return { allowed: true };

    } catch (error) {
      logger.error('Error assessing user risk:', error);
      return { allowed: false, reason: 'system_error' };
    }
  }

  async checkSessionLimits(userId: string, countryConfig: any): Promise<RiskAssessment> {
    try {
      const riskProfile = await UserRiskProfile.findOne({ userId });
      if (!riskProfile) {
        return { allowed: true };
      }

      const now = new Date();
      
      // Check if user is in an active session
      if (riskProfile.isInSession && riskProfile.sessionStartTime) {
        const sessionDuration = Math.floor((now.getTime() - riskProfile.sessionStartTime.getTime()) / 1000);
        const sessionLimit = riskProfile.customLimits?.sessionTimeLimit || countryConfig.sessionTimeLimit;

        if (sessionDuration >= sessionLimit) {
          // Force session end and cooldown
          await this.endUserSession(userId, true);
          
          const cooldownEnd = new Date(now.getTime() + (countryConfig.cooldownPeriod * 1000));
          
          return {
            allowed: false,
            reason: 'session_time_exceeded',
            requiresBreak: true,
            cooldownUntil: cooldownEnd,
            warningMessage: `You have reached your session time limit. Please take a ${Math.ceil(countryConfig.cooldownPeriod / 60)} minute break.`
          };
        }

        // Check for reality check
        const timeSinceRealityCheck = riskProfile.lastRealityCheck ? 
          Math.floor((now.getTime() - riskProfile.lastRealityCheck.getTime()) / 1000) : 
          sessionDuration;

        if (timeSinceRealityCheck >= countryConfig.realityCheckInterval) {
          await this.triggerRealityCheck(userId);
        }
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Error checking session limits:', error);
      return { allowed: true }; // Fail open for session checks
    }
  }

  async checkWhaleProtections(userId: string, amount: number, action: string): Promise<RiskAssessment> {
    try {
      const riskProfile = await UserRiskProfile.findOne({ userId });
      if (!riskProfile) {
        return { allowed: true };
      }

      // Check if user qualifies as whale
      const isWhale = riskProfile.dailySpent >= this.WHALE_THRESHOLDS.dailySpend ||
                     riskProfile.riskLevel === 'whale';

      if (isWhale) {
        // Additional protections for high spenders
        const recentWarnings = await ResponsibleGamingAction.countDocuments({
          userId,
          actionType: 'warning_issued',
          timestamp: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        });

        if (recentWarnings >= 3) {
          return {
            allowed: false,
            reason: 'too_many_warnings',
            warningMessage: 'You have received multiple warnings today. Please consider taking a break.'
          };
        }

        // Mandatory reality check for large amounts
        if (amount > 500) {
          await this.triggerRealityCheck(userId);
          return {
            allowed: true,
            warningMessage: 'High amount detected. Please gamble responsibly.'
          };
        }
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Error checking whale protections:', error);
      return { allowed: true };
    }
  }

  async recordSpend(userId: string, amount: number): Promise<void> {
    try {
      const today = new Date();
      
      await UserRiskProfile.findOneAndUpdate(
        { userId },
        {
          $inc: { 
            totalSpent: amount,
            dailySpent: amount
          },
          $set: { 
            lastSpendDate: today,
            updatedAt: today
          }
        },
        { upsert: true }
      );

      // Update risk level based on spending patterns
      await this.updateRiskLevel(userId);

      logger.info('Spend recorded', { userId, amount });
    } catch (error) {
      logger.error('Error recording spend:', error);
    }
  }

  async recordLoss(userId: string, amount: number): Promise<void> {
    try {
      const today = new Date();
      
      await UserRiskProfile.findOneAndUpdate(
        { userId },
        {
          $inc: { 
            totalLosses: amount,
            dailyLosses: amount
          },
          $set: { 
            lastLossDate: today,
            updatedAt: today
          }
        },
        { upsert: true }
      );

      await this.updateRiskLevel(userId);

      logger.info('Loss recorded', { userId, amount });
    } catch (error) {
      logger.error('Error recording loss:', error);
    }
  }

  async startUserSession(userId: string): Promise<void> {
    try {
      const now = new Date();
      
      await UserRiskProfile.findOneAndUpdate(
        { userId },
        {
          $set: {
            sessionStartTime: now,
            isInSession: true,
            sessionDuration: 0,
            lastRealityCheck: now
          }
        },
        { upsert: true }
      );

      await SessionHistory.create({
        userId,
        sessionStart: now
      });

      logger.info('User session started', { userId });
    } catch (error) {
      logger.error('Error starting user session:', error);
    }
  }

  async endUserSession(userId: string, forced = false): Promise<void> {
    try {
      const riskProfile = await UserRiskProfile.findOne({ userId });
      if (!riskProfile || !riskProfile.isInSession) {
        return;
      }

      const now = new Date();
      const sessionDuration = riskProfile.sessionStartTime ? 
        Math.floor((now.getTime() - riskProfile.sessionStartTime.getTime()) / 1000) : 0;

      // Update risk profile
      await UserRiskProfile.findOneAndUpdate(
        { userId },
        {
          $set: {
            isInSession: false,
            sessionDuration: 0
          },
          $unset: {
            sessionStartTime: 1
          }
        }
      );

      // Update session history
      await SessionHistory.findOneAndUpdate(
        { 
          userId,
          sessionEnd: { $exists: false }
        },
        {
          $set: {
            sessionEnd: now,
            duration: sessionDuration,
            forcedBreak: forced,
            selfEnded: !forced
          }
        }
      );

      if (forced) {
        await ResponsibleGamingAction.create({
          userId,
          actionType: 'session_timeout',
          details: { duration: sessionDuration },
          triggeredBy: 'system'
        });
      }

      logger.info('User session ended', { userId, duration: sessionDuration, forced });
    } catch (error) {
      logger.error('Error ending user session:', error);
    }
  }

  async triggerRealityCheck(userId: string): Promise<void> {
    try {
      const now = new Date();
      
      await UserRiskProfile.findOneAndUpdate(
        { userId },
        {
          $set: { lastRealityCheck: now },
          $inc: { realityCheckCount: 1 }
        }
      );

      await ResponsibleGamingAction.create({
        userId,
        actionType: 'reality_check',
        details: { timestamp: now },
        triggeredBy: 'system'
      });

      logger.info('Reality check triggered', { userId });
    } catch (error) {
      logger.error('Error triggering reality check:', error);
    }
  }

  async setSelfExclusion(userId: string, days: number, reason?: string): Promise<boolean> {
    try {
      const exclusionEnd = new Date(Date.now() + (days * 24 * 60 * 60 * 1000));
      
      await UserRiskProfile.findOneAndUpdate(
        { userId },
        {
          $set: {
            selfExclusionEnd: exclusionEnd,
            selfExclusionReason: reason,
            isInSession: false
          },
          $unset: {
            sessionStartTime: 1
          }
        },
        { upsert: true }
      );

      await ResponsibleGamingAction.create({
        userId,
        actionType: 'self_exclusion',
        details: { days, reason, exclusionEnd },
        triggeredBy: 'user'
      });

      // End any active session
      await this.endUserSession(userId, true);

      logger.info('Self-exclusion set', { userId, days, exclusionEnd });
      return true;
    } catch (error) {
      logger.error('Error setting self-exclusion:', error);
      return false;
    }
  }

  async setAdminExclusion(userId: string, days: number, reason: string, adminId: string): Promise<boolean> {
    try {
      const exclusionEnd = new Date(Date.now() + (days * 24 * 60 * 60 * 1000));
      
      await UserRiskProfile.findOneAndUpdate(
        { userId },
        {
          $set: {
            adminExclusionEnd: exclusionEnd,
            adminExclusionReason: reason,
            isInSession: false
          },
          $unset: {
            sessionStartTime: 1
          }
        },
        { upsert: true }
      );

      await ResponsibleGamingAction.create({
        userId,
        actionType: 'admin_exclusion',
        details: { days, reason, exclusionEnd, adminId },
        triggeredBy: 'admin'
      });

      await this.endUserSession(userId, true);

      logger.info('Admin exclusion set', { userId, days, exclusionEnd, adminId });
      return true;
    } catch (error) {
      logger.error('Error setting admin exclusion:', error);
      return false;
    }
  }

  async updateRiskLevel(userId: string): Promise<void> {
    try {
      const riskProfile = await UserRiskProfile.findOne({ userId });
      if (!riskProfile) return;

      let newRiskLevel = 'low';

      if (riskProfile.dailySpent >= this.WHALE_THRESHOLDS.dailySpend) {
        newRiskLevel = 'whale';
      } else if (riskProfile.dailySpent >= 500) {
        newRiskLevel = 'high';
      } else if (riskProfile.dailySpent >= 200) {
        newRiskLevel = 'medium';
      }

      if (riskProfile.riskLevel !== newRiskLevel) {
        await UserRiskProfile.findOneAndUpdate(
          { userId },
          { $set: { riskLevel: newRiskLevel } }
        );

        logger.info('Risk level updated', { userId, oldLevel: riskProfile.riskLevel, newLevel: newRiskLevel });
      }
    } catch (error) {
      logger.error('Error updating risk level:', error);
    }
  }

  async getSessionStatus(userId: string): Promise<SessionStatus> {
    try {
      const riskProfile = await UserRiskProfile.findOne({ userId });
      if (!riskProfile || !riskProfile.isInSession) {
        return {
          isActive: false,
          duration: 0,
          requiresBreak: false
        };
      }

      const now = new Date();
      const duration = riskProfile.sessionStartTime ? 
        Math.floor((now.getTime() - riskProfile.sessionStartTime.getTime()) / 1000) : 0;

      const user = await User.findById(userId);
      const countryConfig = await RiskControlConfig.findOne({ country: user?.country });
      const sessionLimit = riskProfile.customLimits?.sessionTimeLimit || 
                          countryConfig?.sessionTimeLimit || 3600;

      const timeRemaining = Math.max(0, sessionLimit - duration);
      const requiresBreak = timeRemaining <= 0;

      const nextRealityCheck = riskProfile.lastRealityCheck ? 
        new Date(riskProfile.lastRealityCheck.getTime() + (countryConfig?.realityCheckInterval || 1800) * 1000) :
        undefined;

      return {
        isActive: true,
        startTime: riskProfile.sessionStartTime,
        duration,
        timeRemaining,
        requiresBreak,
        nextRealityCheck
      };
    } catch (error) {
      logger.error('Error getting session status:', error);
      return {
        isActive: false,
        duration: 0,
        requiresBreak: false
      };
    }
  }

  async getUserRiskProfile(userId: string): Promise<any> {
    try {
      return await UserRiskProfile.findOne({ userId }).populate('userId', 'username email country');
    } catch (error) {
      logger.error('Error getting user risk profile:', error);
      return null;
    }
  }

  async getHighRiskUsers(): Promise<any[]> {
    try {
      return await UserRiskProfile.find({ 
        riskLevel: { $in: ['high', 'whale'] } 
      }).populate('userId', 'username email country');
    } catch (error) {
      logger.error('Error getting high risk users:', error);
      return [];
    }
  }
}

export const riskControlsService = new RiskControlsService();
export { RiskControlConfig, UserRiskProfile, SessionHistory, ResponsibleGamingAction };

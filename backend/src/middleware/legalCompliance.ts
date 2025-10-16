/**
 * Legal Compliance and Age Verification System
 * Provides age verification, legal toggles, and compliance features
 */

import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { logger } from '../config/logger';
import { getRedisClient } from '../config/redis';

const redisClient = getRedisClient();

interface LegalConfig {
  minimumAge: number;
  requireAgeVerification: boolean;
  requireParentalConsent: boolean;
  restrictAdultContent: boolean;
  enableDataRetention: boolean;
  enableGDPRCompliance: boolean;
  enableCCPACompliance: boolean;
  enableCOPPACompliance: boolean;
}

interface AgeVerificationData {
  userId: string;
  verifiedAge: number;
  verificationMethod: 'self_declared' | 'document_upload' | 'third_party';
  verifiedAt: Date;
  expiresAt?: Date;
  status: 'pending' | 'verified' | 'rejected' | 'expired';
}

export class LegalComplianceService {
  private static instance: LegalComplianceService;
  private config: LegalConfig;

  private constructor() {
    this.config = {
      minimumAge: parseInt(process.env.MINIMUM_AGE || '13'),
      requireAgeVerification: process.env.REQUIRE_AGE_VERIFICATION === 'true',
      requireParentalConsent: process.env.REQUIRE_PARENTAL_CONSENT === 'true',
      restrictAdultContent: process.env.RESTRICT_ADULT_CONTENT === 'true',
      enableDataRetention: process.env.ENABLE_DATA_RETENTION === 'true',
      enableGDPRCompliance: process.env.ENABLE_GDPR_COMPLIANCE === 'true',
      enableCCPACompliance: process.env.ENABLE_CCPA_COMPLIANCE === 'true',
      enableCOPPACompliance: process.env.ENABLE_COPPA_COMPLIANCE === 'true'
    };
  }

  static getInstance(): LegalComplianceService {
    if (!LegalComplianceService.instance) {
      LegalComplianceService.instance = new LegalComplianceService();
    }
    return LegalComplianceService.instance;
  }

  /**
   * Verify user age
   */
  async verifyAge(userId: string, declaredAge: number, verificationMethod: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if age meets minimum requirement
      if (declaredAge < this.config.minimumAge) {
        return { success: false, error: `Minimum age requirement is ${this.config.minimumAge} years` };
      }

      // Check if parental consent is required for minors
      if (declaredAge < 18 && this.config.requireParentalConsent) {
        return { success: false, error: 'Parental consent required for users under 18' };
      }

      // Store age verification data
      const verificationData: AgeVerificationData = {
        userId,
        verifiedAge: declaredAge,
        verificationMethod: verificationMethod as any,
        verifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        status: 'verified'
      };

      await redisClient.setex(
        `age_verification:${userId}`,
        365 * 24 * 60 * 60, // 1 year
        JSON.stringify(verificationData)
      );

      // Update user record
      await User.findByIdAndUpdate(userId, {
        ageVerified: true,
        verifiedAge: declaredAge,
        ageVerificationMethod: verificationMethod,
        ageVerifiedAt: new Date()
      });

      logger.info(`Age verification completed for user ${userId}: ${declaredAge} years`);
      return { success: true };

    } catch (error) {
      logger.error('Age verification failed:', error);
      return { success: false, error: 'Age verification failed' };
    }
  }

  /**
   * Check if user can access adult content
   */
  async canAccessAdultContent(userId: string): Promise<boolean> {
    try {
      if (!this.config.restrictAdultContent) {
        return true;
      }

      const verificationDataStr = await redisClient.get(`age_verification:${userId}`);
      if (!verificationDataStr) {
        return false;
      }

      const verificationData: AgeVerificationData = JSON.parse(verificationDataStr);
      return verificationData.verifiedAge >= 18 && verificationData.status === 'verified';

    } catch (error) {
      logger.error('Adult content access check failed:', error);
      return false;
    }
  }

  /**
   * Check if user meets age requirements
   */
  async meetsAgeRequirements(userId: string): Promise<boolean> {
    try {
      if (!this.config.requireAgeVerification) {
        return true;
      }

      const verificationDataStr = await redisClient.get(`age_verification:${userId}`);
      if (!verificationDataStr) {
        return false;
      }

      const verificationData: AgeVerificationData = JSON.parse(verificationDataStr);
      return verificationData.verifiedAge >= this.config.minimumAge && verificationData.status === 'verified';

    } catch (error) {
      logger.error('Age requirements check failed:', error);
      return false;
    }
  }

  /**
   * Get user's age verification status
   */
  async getAgeVerificationStatus(userId: string): Promise<AgeVerificationData | null> {
    try {
      const verificationDataStr = await redisClient.get(`age_verification:${userId}`);
      if (!verificationDataStr) {
        return null;
      }

      return JSON.parse(verificationDataStr);

    } catch (error) {
      logger.error('Age verification status check failed:', error);
      return null;
    }
  }

  /**
   * Handle GDPR data deletion request
   */
  async handleGDPRDeletion(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.config.enableGDPRCompliance) {
        return { success: false, error: 'GDPR compliance not enabled' };
      }

      // Delete user data
      await User.findByIdAndDelete(userId);

      // Delete age verification data
      await redisClient.del(`age_verification:${userId}`);

      // Delete other user-related data
      await redisClient.del(`user_sessions:${userId}`);
      await redisClient.del(`user_preferences:${userId}`);

      logger.info(`GDPR deletion completed for user ${userId}`);
      return { success: true };

    } catch (error) {
      logger.error('GDPR deletion failed:', error);
      return { success: false, error: 'GDPR deletion failed' };
    }
  }

  /**
   * Handle CCPA data access request
   */
  async handleCCPAAccess(userId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      if (!this.config.enableCCPACompliance) {
        return { success: false, error: 'CCPA compliance not enabled' };
      }

      const user = await User.findById(userId).select('-password -totpSecret -mfaSecret');
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const ageVerification = await this.getAgeVerificationStatus(userId);

      const userData = {
        personalInformation: {
          username: user.username,
          email: user.email,
          phone: user.phone,
          country: user.country,
          language: user.language,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt
        },
        ageVerification,
        preferences: {
          notifications: user.notificationPreferences,
          privacy: user.privacySettings
        }
      };

      return { success: true, data: userData };

    } catch (error) {
      logger.error('CCPA access request failed:', error);
      return { success: false, error: 'CCPA access request failed' };
    }
  }

  /**
   * Handle COPPA compliance for users under 13
   */
  async handleCOPPACompliance(userId: string, parentalConsent: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.config.enableCOPPACompliance) {
        return { success: false, error: 'COPPA compliance not enabled' };
      }

      const verificationData = await this.getAgeVerificationStatus(userId);
      if (!verificationData || verificationData.verifiedAge >= 13) {
        return { success: false, error: 'COPPA compliance only applies to users under 13' };
      }

      if (!parentalConsent) {
        return { success: false, error: 'Parental consent required for users under 13' };
      }

      // Store parental consent
      await redisClient.setex(
        `parental_consent:${userId}`,
        365 * 24 * 60 * 60, // 1 year
        JSON.stringify({
          userId,
          consentGiven: true,
          consentedAt: new Date(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        })
      );

      logger.info(`COPPA parental consent recorded for user ${userId}`);
      return { success: true };

    } catch (error) {
      logger.error('COPPA compliance handling failed:', error);
      return { success: false, error: 'COPPA compliance handling failed' };
    }
  }

  /**
   * Get legal configuration
   */
  getLegalConfig(): LegalConfig {
    return { ...this.config };
  }

  /**
   * Update legal configuration
   */
  updateLegalConfig(newConfig: Partial<LegalConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Legal configuration updated', newConfig);
  }
}

// Export singleton instance
export const legalComplianceService = LegalComplianceService.getInstance();

/**
 * Age verification middleware
 */
export const requireAgeVerification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const meetsRequirements = await legalComplianceService.meetsAgeRequirements(user.userId);
    if (!meetsRequirements) {
      return res.status(403).json({
        success: false,
        error: 'Age verification required',
        requiresAgeVerification: true
      });
    }

    next();

  } catch (error) {
    logger.error('Age verification middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Age verification check failed'
    });
  }
};

/**
 * Adult content access middleware
 */
export const requireAdultContentAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const canAccess = await legalComplianceService.canAccessAdultContent(user.userId);
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        error: 'Adult content access restricted',
        requiresAgeVerification: true
      });
    }

    next();

  } catch (error) {
    logger.error('Adult content access middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Adult content access check failed'
    });
  }
};

/**
 * Legal compliance middleware
 */
export const requireLegalCompliance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Check age requirements
    const meetsAgeRequirements = await legalComplianceService.meetsAgeRequirements(user.userId);
    if (!meetsAgeRequirements) {
      return res.status(403).json({
        success: false,
        error: 'Age verification required',
        requiresAgeVerification: true
      });
    }

    // Check COPPA compliance for users under 13
    const verificationData = await legalComplianceService.getAgeVerificationStatus(user.userId);
    if (verificationData && verificationData.verifiedAge < 13) {
      const parentalConsent = await redisClient.get(`parental_consent:${user.userId}`);
      if (!parentalConsent) {
        return res.status(403).json({
          success: false,
          error: 'Parental consent required for users under 13',
          requiresParentalConsent: true
        });
      }
    }

    next();

  } catch (error) {
    logger.error('Legal compliance middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'Legal compliance check failed'
    });
  }
};

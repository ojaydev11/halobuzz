import { User } from '../models/User';
import { setupLogger } from '../config/logger';

const logger = setupLogger();
import { featureFlags } from '../config/flags';

interface AgeVerificationResult {
  isVerified: boolean;
  age: number | null;
  isAdult: boolean;
  reason?: string;
}

interface KycVerificationResult {
  isVerified: boolean;
  status: 'pending' | 'verified' | 'rejected';
  reason?: string;
}

class AgeKycService {
  private readonly MINIMUM_AGE = 18;
  private readonly KYC_REQUIRED_COUNTRIES = ['NP', 'IN', 'US', 'UK', 'AU'];

  async verifyAge(userId: string): Promise<AgeVerificationResult> {
    try {
      const user = await User.findById(userId).select('dateOfBirth');
      
      if (!user) {
        return {
          isVerified: false,
          age: null,
          isAdult: false,
          reason: 'User not found'
        };
      }

      if (!user.dateOfBirth) {
        return {
          isVerified: false,
          age: null,
          isAdult: false,
          reason: 'Date of birth not provided'
        };
      }

      const age = this.calculateAge(user.dateOfBirth);
      const isAdult = age >= this.MINIMUM_AGE;

      return {
        isVerified: true,
        age,
        isAdult,
        reason: isAdult ? undefined : 'User is under 18'
      };
    } catch (error) {
      logger.error('Age verification failed:', error);
      return {
        isVerified: false,
        age: null,
        isAdult: false,
        reason: 'Age verification failed'
      };
    }
  }

  async verifyKyc(userId: string): Promise<KycVerificationResult> {
    try {
      const user = await User.findById(userId).select('kycStatus kycDocuments country');
      
      if (!user) {
        return {
          isVerified: false,
          status: 'rejected',
          reason: 'User not found'
        };
      }

      // Check if KYC is required for this user's country
      const isKycRequired = await this.isKycRequiredForCountry(user.country);
      
      if (!isKycRequired) {
        return {
          isVerified: true,
          status: 'verified',
          reason: 'KYC not required for this country'
        };
      }

      // Check KYC status
      if (user.kycStatus === 'verified') {
        return {
          isVerified: true,
          status: 'verified'
        };
      }

      if (user.kycStatus === 'rejected') {
        return {
          isVerified: false,
          status: 'rejected',
          reason: 'KYC verification was rejected'
        };
      }

      if (user.kycStatus === 'pending') {
        return {
          isVerified: false,
          status: 'pending',
          reason: 'KYC verification is pending'
        };
      }

      return {
        isVerified: false,
        status: 'pending',
        reason: 'KYC verification required'
      };
    } catch (error) {
      logger.error('KYC verification failed:', error);
      return {
        isVerified: false,
        status: 'rejected',
        reason: 'KYC verification failed'
      };
    }
  }

  async canAccessLiveStreaming(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Check age verification
      const ageResult = await this.verifyAge(userId);
      if (!ageResult.isAdult) {
        return {
          allowed: false,
          reason: 'You must be 18 or older to access live streaming'
        };
      }

      // Check KYC verification
      const kycResult = await this.verifyKyc(userId);
      if (!kycResult.isVerified) {
        return {
          allowed: false,
          reason: 'KYC verification is required for live streaming'
        };
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Live streaming access check failed:', error);
      return {
        allowed: false,
        reason: 'Access verification failed'
      };
    }
  }

  async canMakePayments(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Check age verification
      const ageResult = await this.verifyAge(userId);
      if (!ageResult.isAdult) {
        return {
          allowed: false,
          reason: 'You must be 18 or older to make payments'
        };
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Payment access check failed:', error);
      return {
        allowed: false,
        reason: 'Access verification failed'
      };
    }
  }

  async canPlayGames(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Check age verification
      const ageResult = await this.verifyAge(userId);
      if (!ageResult.isAdult) {
        return {
          allowed: false,
          reason: 'You must be 18 or older to play games'
        };
      }

      // Check if games are enabled globally
      const gamesEnabled = await featureFlags.isGamesEnabled();
      if (!gamesEnabled) {
        return {
          allowed: false,
          reason: 'Games are currently disabled'
        };
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Game access check failed:', error);
      return {
        allowed: false,
        reason: 'Access verification failed'
      };
    }
  }

  async canAccessRestrictedContent(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Check age verification
      const ageResult = await this.verifyAge(userId);
      if (!ageResult.isAdult) {
        return {
          allowed: false,
          reason: 'You must be 18 or older to access this content'
        };
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Restricted content access check failed:', error);
      return {
        allowed: false,
        reason: 'Access verification failed'
      };
    }
  }

  async submitKycDocuments(
    userId: string,
    documents: {
      idCard: string;
      selfie: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Update KYC documents
      user.kycDocuments = {
        idCard: documents.idCard,
        selfie: documents.selfie,
        verificationDate: new Date()
      };
      user.kycStatus = 'pending';

      await user.save();

      logger.info('KYC documents submitted', {
        userId,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: 'KYC documents submitted successfully. Verification is pending.'
      };
    } catch (error) {
      logger.error('KYC document submission failed:', error);
      return {
        success: false,
        message: 'Failed to submit KYC documents'
      };
    }
  }

  async approveKyc(userId: string, adminId: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      user.kycStatus = 'verified';
      user.trust.factors.kycVerified = true;
      
      // Update trust score
      user.trust.score = Math.min(100, user.trust.score + 20);
      if (user.trust.score >= 80) {
        user.trust.level = 'verified';
      }

      await user.save();

      logger.info('KYC approved', {
        userId,
        adminId,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: 'KYC verification approved'
      };
    } catch (error) {
      logger.error('KYC approval failed:', error);
      return {
        success: false,
        message: 'Failed to approve KYC'
      };
    }
  }

  async rejectKyc(userId: string, reason: string, adminId: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      user.kycStatus = 'rejected';
      user.kycDocuments = undefined; // Clear documents for privacy

      await user.save();

      logger.info('KYC rejected', {
        userId,
        adminId,
        reason,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        message: 'KYC verification rejected'
      };
    } catch (error) {
      logger.error('KYC rejection failed:', error);
      return {
        success: false,
        message: 'Failed to reject KYC'
      };
    }
  }

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

  private async isKycRequiredForCountry(country: string): Promise<boolean> {
    try {
      // Check feature flag for KYC requirement
      const kycRequired = await featureFlags.isKycRequiredForHosts();
      
      if (!kycRequired) {
        return false;
      }

      // Check if country is in the required list
      return this.KYC_REQUIRED_COUNTRIES.includes(country);
    } catch (error) {
      logger.error('Failed to check KYC requirement for country:', error);
      return true; // Default to requiring KYC for safety
    }
  }

  // Admin methods
  async getPendingKycSubmissions(): Promise<any[]> {
    try {
      const users = await User.find({
        kycStatus: 'pending',
        kycDocuments: { $exists: true }
      }).select('username email kycDocuments kycStatus createdAt');

      return users.map(user => ({
        userId: user._id,
        username: user.username,
        email: user.email,
        submittedAt: user.kycDocuments?.verificationDate,
        createdAt: user.createdAt
      }));
    } catch (error) {
      logger.error('Failed to get pending KYC submissions:', error);
      return [];
    }
  }

  async getKycStatistics(): Promise<any> {
    try {
      const stats = await User.aggregate([
        {
          $group: {
            _id: '$kycStatus',
            count: { $sum: 1 }
          }
        }
      ]);

      const result = {
        pending: 0,
        verified: 0,
        rejected: 0,
        total: 0
      };

      stats.forEach(stat => {
        result[stat._id as keyof typeof result] = stat.count;
        result.total += stat.count;
      });

      return result;
    } catch (error) {
      logger.error('Failed to get KYC statistics:', error);
      return {
        pending: 0,
        verified: 0,
        rejected: 0,
        total: 0
      };
    }
  }
}

export const ageKycService = new AgeKycService();

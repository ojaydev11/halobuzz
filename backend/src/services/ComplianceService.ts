import logger from '../utils/logger';
import mongoose from 'mongoose';
import { User } from '@/models/User';
import { featureFlags } from '@/config/flags';

// KYC verification schema
const kycVerificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  status: {
    type: String,
    enum: ['pending', 'under_review', 'approved', 'rejected', 'expired'],
    default: 'pending'
  },
  submissionDate: { type: Date, default: Date.now },
  reviewDate: { type: Date },
  expiryDate: { type: Date },
  reviewedBy: { type: String },
  
  // Document information
  documentType: {
    type: String,
    enum: ['passport', 'driving_license', 'national_id', 'citizenship_certificate'],
    required: true
  },
  documentNumber: { type: String, required: true },
  documentCountry: { type: String, required: true },
  documentExpiryDate: { type: Date },
  
  // Personal information
  fullName: { type: String, required: true },
  dateOfBirth: { type: Date, required: true },
  nationality: { type: String, required: true },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String },
    postalCode: { type: String, required: true },
    country: { type: String, required: true }
  },
  
  // Verification details
  documentImageUrl: { type: String }, // S3 URL for document image
  selfieImageUrl: { type: String }, // S3 URL for selfie verification
  verificationScore: { type: Number, min: 0, max: 100 },
  verificationProvider: { type: String }, // e.g., 'manual', 'jumio', 'onfido'
  
  // Compliance flags
  sanctionsCheck: { type: Boolean, default: false },
  pepsCheck: { type: Boolean, default: false }, // Politically Exposed Persons
  adverseMediaCheck: { type: Boolean, default: false },
  
  // Rejection/failure reasons
  rejectionReason: { type: String },
  rejectionDetails: { type: String },
  
  // Retry information
  retryCount: { type: Number, default: 0 },
  lastRetryDate: { type: Date },
  maxRetries: { type: Number, default: 3 },
  
  // Metadata
  ipAddress: { type: String },
  userAgent: { type: String },
  deviceId: { type: String },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const ageVerificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  verificationMethod: {
    type: String,
    enum: ['document', 'credit_card', 'bank_account', 'manual'],
    required: true
  },
  verificationDate: { type: Date, default: Date.now },
  dateOfBirth: { type: Date, required: true },
  age: { type: Number, required: true },
  isVerified: { type: Boolean, default: false },
  verificationScore: { type: Number, min: 0, max: 100 },
  
  // Document-based verification
  documentType: { type: String },
  documentNumber: { type: String },
  documentImageUrl: { type: String },
  
  // Additional verification data
  verificationProvider: { type: String },
  verificationReference: { type: String },
  
  // Compliance tracking
  parentalConsentRequired: { type: Boolean, default: false },
  parentalConsentProvided: { type: Boolean, default: false },
  parentalContactEmail: { type: String },
  
  // Geo-compliance
  verificationCountry: { type: String, required: true },
  localComplianceCheck: { type: Boolean, default: false },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const complianceActionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  actionType: {
    type: String,
    required: true,
    enum: [
      'age_gate_block',
      'kyc_required',
      'kyc_approved',
      'kyc_rejected',
      'account_restricted',
      'account_suspended',
      'content_blocked',
      'feature_disabled',
      'parental_notification',
      'minor_flagged'
    ]
  },
  reason: { type: String, required: true },
  details: { type: mongoose.Schema.Types.Mixed },
  triggeredBy: { type: String }, // 'system', 'admin', 'user'
  triggeredByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  // Geographic context
  country: { type: String },
  region: { type: String },
  applicableLaws: [{ type: String }],
  
  // Resolution
  resolved: { type: Boolean, default: false },
  resolvedAt: { type: Date },
  resolvedBy: { type: String },
  resolutionNotes: { type: String },
  
  timestamp: { type: Date, default: Date.now }
});

const countryComplianceSchema = new mongoose.Schema({
  country: { type: String, required: true, unique: true },
  
  // Age requirements
  minimumAge: { type: Number, default: 18 },
  parentalConsentAge: { type: Number, default: 13 },
  
  // Feature restrictions
  liveStreamingMinAge: { type: Number, default: 18 },
  gamesMinAge: { type: Number, default: 18 },
  paymentMinAge: { type: Number, default: 18 },
  
  // KYC requirements
  kycRequiredForHosts: { type: Boolean, default: true },
  kycRequiredAmount: { type: Number, default: 100 }, // USD equivalent
  
  // Content restrictions
  strictContentModeration: { type: Boolean, default: true },
  prohibitedContent: [{ type: String }],
  
  // Legal compliance
  applicableLaws: [{ type: String }],
  dataRetentionDays: { type: Number, default: 365 },
  rightToErasure: { type: Boolean, default: true },
  
  // Notification requirements
  parentalNotificationRequired: { type: Boolean, default: true },
  authorityReportingRequired: { type: Boolean, default: false },
  
  lastUpdated: { type: Date, default: Date.now },
  updatedBy: { type: String, default: 'system' }
});

const KYCVerification = mongoose.model('KYCVerification', kycVerificationSchema);
const AgeVerification = mongoose.model('AgeVerification', ageVerificationSchema);
const ComplianceAction = mongoose.model('ComplianceAction', complianceActionSchema);
const CountryCompliance = mongoose.model('CountryCompliance', countryComplianceSchema);

interface ComplianceCheck {
  allowed: boolean;
  reason?: string;
  requiredActions?: string[];
  warnings?: string[];
}

class ComplianceService {
  private readonly NEPAL_COMPLIANCE = {
    minimumAge: 18,
    kycRequiredForHosts: true,
    strictContentModeration: true,
    applicableLaws: [
      'Electronic Transactions Act 2063',
      'Consumer Protection Act 2075',
      'Information Technology Policy 2057'
    ]
  };

  async initializeCountryCompliance(): Promise<void> {
    try {
      // Initialize Nepal-specific compliance
      await CountryCompliance.findOneAndUpdate(
        { country: 'NP' },
        {
          country: 'NP',
          ...this.NEPAL_COMPLIANCE,
          dataRetentionDays: 1095, // 3 years for Nepal
          authorityReportingRequired: true
        },
        { upsert: true, setDefaultsOnInsert: true }
      );

      // Initialize other common countries
      const countries = [
        { code: 'US', minimumAge: 18, kycRequiredAmount: 600 },
        { code: 'UK', minimumAge: 18, kycRequiredAmount: 500 },
        { code: 'IN', minimumAge: 18, kycRequiredAmount: 200 },
        { code: 'AU', minimumAge: 18, kycRequiredAmount: 500 }
      ];

      for (const country of countries) {
        await CountryCompliance.findOneAndUpdate(
          { country: country.code },
          {
            country: country.code,
            minimumAge: country.minimumAge,
            kycRequiredAmount: country.kycRequiredAmount,
            kycRequiredForHosts: true,
            strictContentModeration: true
          },
          { upsert: true, setDefaultsOnInsert: true }
        );
      }

      logger.info('Country compliance configurations initialized');
    } catch (error) {
      logger.error('Error initializing country compliance:', error);
    }
  }

  async checkAgeCompliance(userId: string, action: string): Promise<ComplianceCheck> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { allowed: false, reason: 'user_not_found' };
      }

      // Check if age verification is globally required
      if (await featureFlags.isAgeVerificationRequired()) {
        const ageVerification = await AgeVerification.findOne({ userId });
        
        if (!ageVerification || !ageVerification.isVerified) {
          await this.recordComplianceAction(userId, 'age_gate_block', 'Age verification required', {
            action,
            country: user.country
          });
          
          return {
            allowed: false,
            reason: 'age_verification_required',
            requiredActions: ['complete_age_verification']
          };
        }

        // Check minimum age for specific actions
        const countryCompliance = await CountryCompliance.findOne({ country: user.country });
        const minimumAge = countryCompliance?.minimumAge || 18;
        
        if (ageVerification.age < minimumAge) {
          await this.recordComplianceAction(userId, 'minor_flagged', 'User under minimum age', {
            action,
            userAge: ageVerification.age,
            minimumAge,
            country: user.country
          });
          
          return {
            allowed: false,
            reason: 'under_minimum_age',
            requiredActions: ['wait_until_of_age']
          };
        }

        // Action-specific age checks
        if (action === 'live_streaming') {
          const streamingMinAge = countryCompliance?.liveStreamingMinAge || 18;
          if (ageVerification.age < streamingMinAge) {
            return {
              allowed: false,
              reason: 'under_streaming_age',
              requiredActions: ['wait_until_streaming_age']
            };
          }
        }

        if (action === 'games' || action === 'gambling') {
          const gamesMinAge = countryCompliance?.gamesMinAge || 18;
          if (ageVerification.age < gamesMinAge) {
            return {
              allowed: false,
              reason: 'under_games_age',
              requiredActions: ['wait_until_games_age']
            };
          }
        }

        if (action === 'payment') {
          const paymentMinAge = countryCompliance?.paymentMinAge || 18;
          if (ageVerification.age < paymentMinAge) {
            return {
              allowed: false,
              reason: 'under_payment_age',
              requiredActions: ['wait_until_payment_age']
            };
          }
        }
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Error checking age compliance:', error);
      return { allowed: false, reason: 'compliance_check_error' };
    }
  }

  async checkKYCRequirement(userId: string, action?: string): Promise<ComplianceCheck> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { allowed: false, reason: 'user_not_found' };
      }

      // Check if KYC is required for hosts
      if (action === 'start_live_stream' && await featureFlags.isKycRequiredForHosts()) {
        const kycVerification = await KYCVerification.findOne({ userId });
        
        if (!kycVerification || kycVerification.status !== 'approved') {
          await this.recordComplianceAction(userId, 'kyc_required', 'KYC verification required for live streaming', {
            action,
            country: user.country
          });
          
          return {
            allowed: false,
            reason: 'kyc_required_for_hosts',
            requiredActions: ['complete_kyc_verification']
          };
        }

        // Check if KYC is expired
        if (kycVerification.expiryDate && kycVerification.expiryDate < new Date()) {
          return {
            allowed: false,
            reason: 'kyc_expired',
            requiredActions: ['renew_kyc_verification']
          };
        }
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Error checking KYC requirement:', error);
      return { allowed: false, reason: 'kyc_check_error' };
    }
  }

  async submitKYCVerification(
    userId: string,
    kycData: {
      documentType: string;
      documentNumber: string;
      documentCountry: string;
      documentExpiryDate?: Date;
      fullName: string;
      dateOfBirth: Date;
      nationality: string;
      address: any;
      documentImageUrl?: string;
      selfieImageUrl?: string;
    },
    metadata: {
      ipAddress?: string;
      userAgent?: string;
      deviceId?: string;
    }
  ): Promise<{ success: boolean; kycId?: string; error?: string }> {
    try {
      // Check if user already has pending/approved KYC
      const existingKYC = await KYCVerification.findOne({ userId });
      if (existingKYC && ['pending', 'under_review', 'approved'].includes(existingKYC.status)) {
        return {
          success: false,
          error: `KYC already ${existingKYC.status}`
        };
      }

      // Check retry limits
      if (existingKYC && existingKYC.retryCount >= existingKYC.maxRetries) {
        const daysSinceLastRetry = existingKYC.lastRetryDate ? 
          Math.floor((Date.now() - existingKYC.lastRetryDate.getTime()) / (24 * 60 * 60 * 1000)) : 0;
        
        if (daysSinceLastRetry < 30) { // 30-day cooldown
          return {
            success: false,
            error: 'Maximum retry attempts exceeded. Please wait 30 days before resubmitting.'
          };
        }
      }

      // Calculate age from date of birth
      const age = Math.floor((Date.now() - kycData.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 18) {
        return {
          success: false,
          error: 'Must be at least 18 years old to complete KYC verification'
        };
      }

      // Create or update KYC verification
      const kycVerification = await KYCVerification.findOneAndUpdate(
        { userId },
        {
          ...kycData,
          status: 'pending',
          submissionDate: new Date(),
          retryCount: existingKYC ? existingKYC.retryCount + 1 : 0,
          lastRetryDate: new Date(),
          ...metadata,
          updatedAt: new Date()
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      await this.recordComplianceAction(userId, 'kyc_required', 'KYC verification submitted', {
        kycId: kycVerification._id,
        documentType: kycData.documentType,
        retryCount: kycVerification.retryCount
      });

      logger.info('KYC verification submitted', {
        userId,
        kycId: kycVerification._id,
        documentType: kycData.documentType,
        retryCount: kycVerification.retryCount
      });

      return {
        success: true,
        kycId: kycVerification._id.toString()
      };
    } catch (error) {
      logger.error('Error submitting KYC verification:', error);
      return {
        success: false,
        error: 'Failed to submit KYC verification'
      };
    }
  }

  async processKYCReview(
    kycId: string,
    decision: 'approved' | 'rejected',
    reviewedBy: string,
    notes?: string,
    rejectionReason?: string
  ): Promise<boolean> {
    try {
      const kyc = await KYCVerification.findById(kycId);
      if (!kyc) {
        logger.error('KYC verification not found', { kycId });
        return false;
      }

      const updateData: any = {
        status: decision,
        reviewDate: new Date(),
        reviewedBy,
        updatedAt: new Date()
      };

      if (decision === 'approved') {
        updateData.expiryDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
      } else {
        updateData.rejectionReason = rejectionReason;
        updateData.rejectionDetails = notes;
      }

      await KYCVerification.findByIdAndUpdate(kycId, updateData);

      await this.recordComplianceAction(kyc.userId.toString(), 
        decision === 'approved' ? 'kyc_approved' : 'kyc_rejected',
        `KYC verification ${decision}`,
        {
          kycId,
          reviewedBy,
          rejectionReason,
          notes
        },
        'admin',
        reviewedBy
      );

      logger.info('KYC verification reviewed', {
        kycId,
        userId: kyc.userId,
        decision,
        reviewedBy
      });

      return true;
    } catch (error) {
      logger.error('Error processing KYC review:', error);
      return false;
    }
  }

  async recordComplianceAction(
    userId: string,
    actionType: string,
    reason: string,
    details?: any,
    triggeredBy: string = 'system',
    triggeredByUserId?: string
  ): Promise<void> {
    try {
      const user = await User.findById(userId);
      
      await ComplianceAction.create({
        userId,
        actionType,
        reason,
        details,
        triggeredBy,
        triggeredByUserId,
        country: user?.country,
        timestamp: new Date()
      });

      logger.info('Compliance action recorded', {
        userId,
        actionType,
        reason,
        triggeredBy
      });
    } catch (error) {
      logger.error('Error recording compliance action:', error);
    }
  }

  async getMinorUsers(): Promise<any[]> {
    try {
      const minorVerifications = await AgeVerification.find({ age: { $lt: 18 } })
        .populate('userId', 'username email country createdAt');
      
      return minorVerifications;
    } catch (error) {
      logger.error('Error getting minor users:', error);
      return [];
    }
  }

  async getPendingKYCVerifications(): Promise<any[]> {
    try {
      return await KYCVerification.find({ status: { $in: ['pending', 'under_review'] } })
        .populate('userId', 'username email country')
        .sort({ submissionDate: -1 });
    } catch (error) {
      logger.error('Error getting pending KYC verifications:', error);
      return [];
    }
  }

  async getComplianceReport(country?: string, startDate?: Date, endDate?: Date): Promise<any> {
    try {
      const matchCriteria: any = {};
      
      if (country) {
        matchCriteria.country = country;
      }
      
      if (startDate || endDate) {
        matchCriteria.timestamp = {};
        if (startDate) matchCriteria.timestamp.$gte = startDate;
        if (endDate) matchCriteria.timestamp.$lte = endDate;
      }

      const report = await ComplianceAction.aggregate([
        { $match: matchCriteria },
        {
          $group: {
            _id: {
              actionType: '$actionType',
              country: '$country'
            },
            count: { $sum: 1 },
            latestAction: { $max: '$timestamp' }
          }
        },
        {
          $group: {
            _id: '$_id.country',
            actions: {
              $push: {
                actionType: '$_id.actionType',
                count: '$count',
                latestAction: '$latestAction'
              }
            },
            totalActions: { $sum: '$count' }
          }
        }
      ]);

      return report;
    } catch (error) {
      logger.error('Error generating compliance report:', error);
      return [];
    }
  }
}

export const complianceService = new ComplianceService();
export { KYCVerification, AgeVerification, ComplianceAction, CountryCompliance };

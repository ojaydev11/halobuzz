import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { LiveStream } from '../models/LiveStream';
import { Message } from '../models/Message';
import { logger } from '../config/logger';
import { getCache, setCache } from '../config/redis';

interface ConsentRecord {
  userId: string;
  consentType: string;
  granted: boolean;
  timestamp: Date;
  version: string;
  ipAddress: string;
  userAgent: string;
}

interface DataExport {
  userId: string;
  personalData: any;
  transactions: any[];
  streams: any[];
  messages: any[];
  analytics: any[];
  consentHistory: ConsentRecord[];
  exportDate: Date;
}

export class GDPRService {
  private readonly logger = logger;

  /**
   * Record user consent
   */
  async recordConsent(
    userId: string, 
    consentType: string, 
    granted: boolean, 
    req: any
  ): Promise<void> {
    try {
      const consentRecord: ConsentRecord = {
        userId,
        consentType,
        granted,
        timestamp: new Date(),
        version: '1.0',
        ipAddress: req.ip || req.connection.remoteAddress || '',
        userAgent: req.header('User-Agent') || ''
      };

      // Store consent in database
      await User.findByIdAndUpdate(userId, {
        $push: {
          consentHistory: consentRecord
        }
      });

      // Update user consent status
      const updateField = `consent.${consentType}`;
      await User.findByIdAndUpdate(userId, {
        $set: {
          [updateField]: granted,
          'consent.lastUpdated': new Date()
        }
      });

      this.logger.info(`Consent recorded for user ${userId}: ${consentType} = ${granted}`);
    } catch (error) {
      this.logger.error('Error recording consent:', error);
      throw error;
    }
  }

  /**
   * Export all user data
   */
  async exportUserData(userId: string): Promise<DataExport> {
    try {
      // Get user data
      const user = await User.findById(userId).select('-password -totpSecret');
      if (!user) {
        throw new Error('User not found');
      }

      // Get transactions
      const transactions = await Transaction.find({ userId })
        .sort({ createdAt: -1 })
        .limit(1000); // Limit to prevent huge exports

      // Get streams
      const streams = await LiveStream.find({ hostId: userId })
        .sort({ createdAt: -1 })
        .limit(1000);

      // Get messages
      const messages = await Message.find({ senderId: userId })
        .sort({ createdAt: -1 })
        .limit(1000);

      // Get analytics data
      const analytics = await this.getUserAnalytics(userId);

      const dataExport: DataExport = {
        userId,
        personalData: user.toJSON(),
        transactions: transactions.map(t => t.toJSON()),
        streams: streams.map(s => s.toJSON()),
        messages: messages.map(m => m.toJSON()),
        analytics,
        consentHistory: (user as any).consentHistory || [],
        exportDate: new Date()
      };

      // Store export record
      await this.storeDataExport(userId, dataExport);

      return dataExport;
    } catch (error) {
      this.logger.error('Error exporting user data:', error);
      throw error;
    }
  }

  /**
   * Delete user data (Right to be forgotten)
   */
  async deleteUserData(userId: string): Promise<void> {
    try {
      // Anonymize user data instead of hard delete
      await User.findByIdAndUpdate(userId, {
        $set: {
          email: `deleted_${Date.now()}@deleted.com`,
          username: `deleted_user_${Date.now()}`,
          phone: null,
          profilePicture: null,
          bio: 'Account deleted',
          isDeleted: true,
          deletedAt: new Date()
        },
        $unset: {
          password: 1,
          totpSecret: 1,
          boundDevices: 1,
          consentHistory: 1
        }
      });

      // Anonymize transactions
      await Transaction.updateMany(
        { userId },
        {
          $set: {
            'metadata.anonymized': true,
            'metadata.originalUserId': userId
          }
        }
      );

      // Anonymize streams
      await LiveStream.updateMany(
        { hostId: userId },
        {
          $set: {
            title: 'Deleted Stream',
            description: 'Stream deleted by user',
            isDeleted: true,
            deletedAt: new Date()
          }
        }
      );

      // Anonymize messages
      await Message.updateMany(
        { senderId: userId },
        {
          $set: {
            content: 'Message deleted',
            isDeleted: true,
            deletedAt: new Date()
          }
        }
      );

      this.logger.info(`User data deleted/anonymized for user: ${userId}`);
    } catch (error) {
      this.logger.error('Error deleting user data:', error);
      throw error;
    }
  }

  /**
   * Update user data
   */
  async updateUserData(userId: string, data: any): Promise<void> {
    try {
      // Validate data
      const allowedFields = [
        'username', 'bio', 'profilePicture', 'country', 'language',
        'notificationSettings', 'privacySettings'
      ];

      const updateData: any = {};
      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          updateData[field] = data[field];
        }
      }

      await User.findByIdAndUpdate(userId, updateData);

      this.logger.info(`User data updated for user: ${userId}`);
    } catch (error) {
      this.logger.error('Error updating user data:', error);
      throw error;
    }
  }

  /**
   * Get consent status
   */
  async getConsentStatus(userId: string): Promise<any> {
    try {
      const user = await User.findById(userId).select('consent consentHistory');
      if (!user) {
        throw new Error('User not found');
      }

      return {
        currentConsent: (user as any).consent || {},
        consentHistory: (user as any).consentHistory || [],
        lastUpdated: (user as any).consent?.lastUpdated || null
      };
    } catch (error) {
      this.logger.error('Error getting consent status:', error);
      throw error;
    }
  }

  /**
   * Validate data processing consent
   */
  async validateConsent(userId: string, dataType: string): Promise<boolean> {
    try {
      const user = await User.findById(userId).select('consent');
      if (!user) {
        return false;
      }

      const consent = (user as any).consent || {};
      return consent[dataType] === true;
    } catch (error) {
      this.logger.error('Error validating consent:', error);
      return false;
    }
  }

  /**
   * Get user analytics data
   */
  private async getUserAnalytics(userId: string): Promise<any[]> {
    try {
      // This would typically query an analytics service
      // For now, return empty array
      return [];
    } catch (error) {
      this.logger.error('Error getting user analytics:', error);
      return [];
    }
  }

  /**
   * Store data export record
   */
  private async storeDataExport(userId: string, dataExport: DataExport): Promise<void> {
    try {
      // Store in cache for quick access
      const exportKey = `data_export:${userId}:${Date.now()}`;
      await setCache(exportKey, dataExport, 7 * 24 * 60 * 60); // 7 days

      // Could also store in database for audit purposes
    } catch (error) {
      this.logger.error('Error storing data export:', error);
    }
  }

  /**
   * Generate privacy policy
   */
  generatePrivacyPolicy(): string {
    return `
# HaloBuzz Privacy Policy

## Data Collection
We collect the following types of data:
- Account information (email, username, profile picture)
- Usage data (streams, messages, transactions)
- Device information (device ID, IP address, user agent)
- Analytics data (app usage, performance metrics)

## Data Usage
Your data is used to:
- Provide and improve our services
- Process payments and transactions
- Ensure platform safety and security
- Comply with legal requirements

## Data Sharing
We do not sell your personal data. We may share data with:
- Payment processors (for transaction processing)
- Cloud service providers (for hosting)
- Legal authorities (when required by law)

## Your Rights
Under GDPR, you have the right to:
- Access your data
- Correct inaccurate data
- Delete your data
- Restrict processing
- Data portability
- Object to processing

## Contact
For privacy-related inquiries, contact: privacy@halobuzz.com

Last updated: ${new Date().toISOString()}
    `.trim();
  }

  /**
   * Generate terms of service
   */
  generateTermsOfService(): string {
    return `
# HaloBuzz Terms of Service

## Acceptance of Terms
By using HaloBuzz, you agree to these terms.

## User Responsibilities
- You must be at least 13 years old
- You must not share inappropriate content
- You must not engage in fraudulent activities
- You must respect other users

## Platform Rules
- No harassment or bullying
- No spam or advertising
- No illegal activities
- No impersonation

## Content Policy
- No adult content
- No violence or gore
- No hate speech
- No copyright infringement

## Account Termination
We may terminate accounts that violate these terms.

## Limitation of Liability
HaloBuzz is not liable for user-generated content or third-party services.

## Changes to Terms
We may update these terms with notice to users.

Last updated: ${new Date().toISOString()}
    `.trim();
  }

  /**
   * Audit data processing
   */
  async auditDataProcessing(): Promise<any> {
    try {
      const auditReport = {
        timestamp: new Date(),
        totalUsers: await User.countDocuments(),
        activeUsers: await User.countDocuments({ lastActiveAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
        usersWithConsent: await User.countDocuments({ 'consent.marketing': true }),
        dataExports: await this.getDataExportCount(),
        dataDeletions: await this.getDataDeletionCount()
      };

      return auditReport;
    } catch (error) {
      this.logger.error('Error auditing data processing:', error);
      throw error;
    }
  }

  private async getDataExportCount(): Promise<number> {
    // This would typically query a data export log
    return 0;
  }

  private async getDataDeletionCount(): Promise<number> {
    // This would typically query a data deletion log
    return 0;
  }
}

export const gdprService = new GDPRService();

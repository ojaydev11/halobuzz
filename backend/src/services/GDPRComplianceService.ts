import { logger } from '../config/logger';
import { getCache, setCache } from '../config/redis';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import crypto from 'crypto';

// GDPR compliance interfaces
interface ConsentRecord {
  userId: string;
  consentType: 'marketing' | 'analytics' | 'cookies' | 'data_processing' | 'third_party';
  granted: boolean;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  version: string;
  expiresAt?: Date;
}

interface DataExport {
  userId: string;
  requestId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: Date;
  completedAt?: Date;
  downloadUrl?: string;
  expiresAt: Date;
  dataTypes: string[];
  fileSize?: number;
}

interface DataDeletion {
  userId: string;
  requestId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedAt: Date;
  completedAt?: Date;
  deletionTypes: string[];
  retentionPeriod?: number; // days
}

interface PrivacySettings {
  userId: string;
  dataProcessing: {
    marketing: boolean;
    analytics: boolean;
    personalization: boolean;
    thirdPartySharing: boolean;
  };
  communication: {
    email: boolean;
    sms: boolean;
    push: boolean;
    inApp: boolean;
  };
  visibility: {
    profilePublic: boolean;
    showOnlineStatus: boolean;
    showActivity: boolean;
  };
  dataRetention: {
    accountData: number; // days
    activityLogs: number; // days
    transactionHistory: number; // days
  };
}

class GDPRComplianceService {
  private consentRecords: Map<string, ConsentRecord[]> = new Map();
  private dataExports: Map<string, DataExport> = new Map();
  private dataDeletions: Map<string, DataDeletion> = new Map();
  private privacySettings: Map<string, PrivacySettings> = new Map();

  constructor() {
    this.initializeDefaultSettings();
  }

  // Initialize default privacy settings
  private initializeDefaultSettings(): void {
    // This would typically load from database or configuration
  }

  // Record user consent
  async recordConsent(
    userId: string,
    consentType: ConsentRecord['consentType'],
    granted: boolean,
    ipAddress: string,
    userAgent: string,
    version: string = '1.0'
  ): Promise<{
    success: boolean;
    consentId?: string;
    error?: string;
  }> {
    try {
      const consentId = this.generateConsentId();
      const consent: ConsentRecord = {
        userId,
        consentType,
        granted,
        timestamp: new Date(),
        ipAddress,
        userAgent,
        version,
        expiresAt: granted ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) : undefined // 1 year
      };

      // Store consent record
      const userConsents = this.consentRecords.get(userId) || [];
      userConsents.push(consent);
      this.consentRecords.set(userId, userConsents);

      // Cache consent
      await setCache(`consent:${userId}:${consentType}`, consent, 86400 * 365); // 1 year

      // Update privacy settings
      await this.updatePrivacySettings(userId, consentType, granted);

      logger.info(`Consent recorded: ${consentId}`, {
        userId,
        consentType,
        granted,
        version
      });

      return { success: true, consentId };

    } catch (error) {
      logger.error('Error recording consent:', error);
      return { success: false, error: 'Failed to record consent' };
    }
  }

  // Check user consent
  async checkConsent(
    userId: string,
    consentType: ConsentRecord['consentType']
  ): Promise<{
    granted: boolean;
    consent?: ConsentRecord;
    expiresAt?: Date;
  }> {
    try {
      // Check cache first
      const cached = await getCache(`consent:${userId}:${consentType}`);
      if (cached) {
        return {
          granted: cached.granted,
          consent: cached,
          expiresAt: cached.expiresAt
        };
      }

      // Check stored consents
      const userConsents = this.consentRecords.get(userId) || [];
      const latestConsent = userConsents
        .filter(c => c.consentType === consentType)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

      if (latestConsent) {
        // Check if consent is still valid
        if (latestConsent.expiresAt && latestConsent.expiresAt < new Date()) {
          return { granted: false };
        }

        return {
          granted: latestConsent.granted,
          consent: latestConsent,
          expiresAt: latestConsent.expiresAt
        };
      }

      return { granted: false };

    } catch (error) {
      logger.error('Error checking consent:', error);
      return { granted: false };
    }
  }

  // Request data export
  async requestDataExport(
    userId: string,
    dataTypes: string[] = ['profile', 'transactions', 'activity', 'preferences']
  ): Promise<{
    success: boolean;
    requestId?: string;
    estimatedTime?: string;
    error?: string;
  }> {
    try {
      const requestId = this.generateRequestId();
      const dataExport: DataExport = {
        userId,
        requestId,
        status: 'pending',
        requestedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        dataTypes
      };

      this.dataExports.set(requestId, dataExport);

      // Cache request
      await setCache(`data_export:${requestId}`, dataExport, 86400 * 7);

      // Process export asynchronously
      this.processDataExport(requestId).catch(error => {
        logger.error('Error processing data export:', error);
      });

      logger.info(`Data export requested: ${requestId}`, {
        userId,
        dataTypes
      });

      return {
        success: true,
        requestId,
        estimatedTime: '24-48 hours'
      };

    } catch (error) {
      logger.error('Error requesting data export:', error);
      return { success: false, error: 'Failed to request data export' };
    }
  }

  // Process data export
  private async processDataExport(requestId: string): Promise<void> {
    try {
      const dataExport = this.dataExports.get(requestId);
      if (!dataExport) {
        return;
      }

      // Update status to processing
      dataExport.status = 'processing';
      await setCache(`data_export:${requestId}`, dataExport, 86400 * 7);

      // Collect user data
      const userData = await this.collectUserData(dataExport.userId, dataExport.dataTypes);

      // Generate export file
      const exportData = {
        exportId: requestId,
        userId: dataExport.userId,
        requestedAt: dataExport.requestedAt,
        completedAt: new Date(),
        data: userData
      };

      // In production, this would generate and upload a file
      const downloadUrl = `https://api.halobuzz.com/exports/${requestId}.json`;
      const fileSize = JSON.stringify(exportData).length;

      // Update export record
      dataExport.status = 'completed';
      dataExport.completedAt = new Date();
      dataExport.downloadUrl = downloadUrl;
      dataExport.fileSize = fileSize;

      await setCache(`data_export:${requestId}`, dataExport, 86400 * 7);

      logger.info(`Data export completed: ${requestId}`, {
        userId: dataExport.userId,
        fileSize
      });

    } catch (error) {
      logger.error('Error processing data export:', error);
      
      const dataExport = this.dataExports.get(requestId);
      if (dataExport) {
        dataExport.status = 'failed';
        await setCache(`data_export:${requestId}`, dataExport, 86400 * 7);
      }
    }
  }

  // Collect user data
  private async collectUserData(userId: string, dataTypes: string[]): Promise<any> {
    try {
      const userData: any = {};

      // Get user profile
      if (dataTypes.includes('profile')) {
        const user = await User.findById(userId).select('-password -tokens');
        userData.profile = user;
      }

      // Get transactions
      if (dataTypes.includes('transactions')) {
        const transactions = await Transaction.find({ userId });
        userData.transactions = transactions;
      }

      // Get activity logs (mock)
      if (dataTypes.includes('activity')) {
        userData.activity = {
          loginHistory: [],
          streamingHistory: [],
          gameHistory: [],
          chatHistory: []
        };
      }

      // Get preferences
      if (dataTypes.includes('preferences')) {
        const privacySettings = this.privacySettings.get(userId);
        userData.preferences = {
          privacy: privacySettings,
          notifications: {},
          language: 'en',
          timezone: 'UTC'
        };
      }

      return userData;

    } catch (error) {
      logger.error('Error collecting user data:', error);
      return {};
    }
  }

  // Request data deletion
  async requestDataDeletion(
    userId: string,
    deletionTypes: string[] = ['profile', 'transactions', 'activity']
  ): Promise<{
    success: boolean;
    requestId?: string;
    estimatedTime?: string;
    error?: string;
  }> {
    try {
      const requestId = this.generateRequestId();
      const dataDeletion: DataDeletion = {
        userId,
        requestId,
        status: 'pending',
        requestedAt: new Date(),
        deletionTypes,
        retentionPeriod: 30 // 30 days retention period
      };

      this.dataDeletions.set(requestId, dataDeletion);

      // Cache request
      await setCache(`data_deletion:${requestId}`, dataDeletion, 86400 * 30);

      // Process deletion asynchronously
      this.processDataDeletion(requestId).catch(error => {
        logger.error('Error processing data deletion:', error);
      });

      logger.info(`Data deletion requested: ${requestId}`, {
        userId,
        deletionTypes
      });

      return {
        success: true,
        requestId,
        estimatedTime: '7-30 days'
      };

    } catch (error) {
      logger.error('Error requesting data deletion:', error);
      return { success: false, error: 'Failed to request data deletion' };
    }
  }

  // Process data deletion
  private async processDataDeletion(requestId: string): Promise<void> {
    try {
      const dataDeletion = this.dataDeletions.get(requestId);
      if (!dataDeletion) {
        return;
      }

      // Update status to processing
      dataDeletion.status = 'processing';
      await setCache(`data_deletion:${requestId}`, dataDeletion, 86400 * 30);

      // Anonymize user data instead of complete deletion (for legal compliance)
      await this.anonymizeUserData(dataDeletion.userId, dataDeletion.deletionTypes);

      // Update deletion record
      dataDeletion.status = 'completed';
      dataDeletion.completedAt = new Date();

      await setCache(`data_deletion:${requestId}`, dataDeletion, 86400 * 30);

      logger.info(`Data deletion completed: ${requestId}`, {
        userId: dataDeletion.userId
      });

    } catch (error) {
      logger.error('Error processing data deletion:', error);
      
      const dataDeletion = this.dataDeletions.get(requestId);
      if (dataDeletion) {
        dataDeletion.status = 'failed';
        await setCache(`data_deletion:${requestId}`, dataDeletion, 86400 * 30);
      }
    }
  }

  // Anonymize user data
  private async anonymizeUserData(userId: string, deletionTypes: string[]): Promise<void> {
    try {
      // Anonymize user profile
      if (deletionTypes.includes('profile')) {
        await User.findByIdAndUpdate(userId, {
          $set: {
            username: `deleted_user_${crypto.randomBytes(8).toString('hex')}`,
            email: `deleted_${crypto.randomBytes(8).toString('hex')}@deleted.com`,
            firstName: 'Deleted',
            lastName: 'User',
            phone: null,
            avatar: null,
            bio: null,
            isDeleted: true,
            deletedAt: new Date()
          }
        });
      }

      // Anonymize transactions
      if (deletionTypes.includes('transactions')) {
        await Transaction.updateMany(
          { userId },
          {
            $set: {
              userId: `deleted_${crypto.randomBytes(8).toString('hex')}`,
              metadata: { anonymized: true, originalUserId: userId }
            }
          }
        );
      }

      // Clear consent records
      this.consentRecords.delete(userId);
      this.privacySettings.delete(userId);

      logger.info(`User data anonymized: ${userId}`, {
        deletionTypes
      });

    } catch (error) {
      logger.error('Error anonymizing user data:', error);
      throw error;
    }
  }

  // Update privacy settings
  private async updatePrivacySettings(
    userId: string,
    consentType: ConsentRecord['consentType'],
    granted: boolean
  ): Promise<void> {
    try {
      let settings = this.privacySettings.get(userId);
      if (!settings) {
        settings = {
          userId,
          dataProcessing: {
            marketing: false,
            analytics: false,
            personalization: false,
            thirdPartySharing: false
          },
          communication: {
            email: false,
            sms: false,
            push: false,
            inApp: false
          },
          visibility: {
            profilePublic: false,
            showOnlineStatus: false,
            showActivity: false
          },
          dataRetention: {
            accountData: 365,
            activityLogs: 90,
            transactionHistory: 2555 // 7 years for tax purposes
          }
        };
      }

      // Update settings based on consent
      switch (consentType) {
        case 'marketing':
          settings.dataProcessing.marketing = granted;
          settings.communication.email = granted;
          settings.communication.sms = granted;
          break;
        case 'analytics':
          settings.dataProcessing.analytics = granted;
          break;
        case 'data_processing':
          settings.dataProcessing.personalization = granted;
          break;
        case 'third_party':
          settings.dataProcessing.thirdPartySharing = granted;
          break;
      }

      this.privacySettings.set(userId, settings);
      await setCache(`privacy_settings:${userId}`, settings, 86400);

    } catch (error) {
      logger.error('Error updating privacy settings:', error);
    }
  }

  // Get privacy settings
  async getPrivacySettings(userId: string): Promise<PrivacySettings | null> {
    try {
      // Check cache first
      const cached = await getCache(`privacy_settings:${userId}`);
      if (cached) {
        return cached;
      }

      const settings = this.privacySettings.get(userId);
      if (settings) {
        await setCache(`privacy_settings:${userId}`, settings, 86400);
      }

      return settings || null;
    } catch (error) {
      logger.error('Error getting privacy settings:', error);
      return null;
    }
  }

  // Generate consent ID
  private generateConsentId(): string {
    return `consent_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  // Generate request ID
  private generateRequestId(): string {
    return `req_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  // Get compliance statistics
  async getComplianceStatistics(): Promise<{
    totalConsents: number;
    activeConsents: number;
    pendingExports: number;
    pendingDeletions: number;
    complianceRate: number;
  }> {
    try {
      const totalConsents = Array.from(this.consentRecords.values()).flat().length;
      const activeConsents = Array.from(this.consentRecords.values())
        .flat()
        .filter(c => c.granted && (!c.expiresAt || c.expiresAt > new Date())).length;
      
      const pendingExports = Array.from(this.dataExports.values())
        .filter(e => e.status === 'pending' || e.status === 'processing').length;
      
      const pendingDeletions = Array.from(this.dataDeletions.values())
        .filter(d => d.status === 'pending' || d.status === 'processing').length;

      const complianceRate = totalConsents > 0 ? (activeConsents / totalConsents) * 100 : 0;

      return {
        totalConsents,
        activeConsents,
        pendingExports,
        pendingDeletions,
        complianceRate: Math.round(complianceRate * 100) / 100
      };
    } catch (error) {
      logger.error('Error getting compliance statistics:', error);
      return {
        totalConsents: 0,
        activeConsents: 0,
        pendingExports: 0,
        pendingDeletions: 0,
        complianceRate: 0
      };
    }
  }
}

// Export singleton instance
export const gdprComplianceService = new GDPRComplianceService();
export default gdprComplianceService;

import { logger } from '../config/logger';
import { AuditLog } from '../models/AuditLog';
import { AnalyticsDailyKPI } from '../analytics/models/AnalyticsDailyKPI';
import { AnalyticsAlert } from '../analytics/models/AnalyticsAlert';
import { piiSanitizer, gdprCompliance } from '../middleware/security';

export interface ComplianceReport {
  period: { from: Date; to: Date };
  summary: {
    totalDataRequests: number;
    gdprApplicableRequests: number;
    dataRetentionCompliant: boolean;
    securityIncidents: number;
    uniqueUsersAccessed: number;
  };
  recommendations: string[];
}

export class ComplianceService {
  constructor() {
    logger.info('ComplianceService initialized');
  }

  /**
   * Generates a comprehensive compliance report
   */
  public async generateComplianceReport(fromDate: Date, toDate: Date): Promise<ComplianceReport> {
    logger.info(`Generating compliance report from ${fromDate.toISOString()} to ${toDate.toISOString()}`);

    try {
      const auditData = await AuditLog.getComplianceReport(fromDate, toDate);
      const securityEvents = await AuditLog.getSecurityEvents(fromDate, toDate);
      
      const report: ComplianceReport = {
        period: { from: fromDate, to: toDate },
        summary: {
          totalDataRequests: auditData[0]?.totalRequests || 0,
          gdprApplicableRequests: auditData[0]?.gdprApplicableRequests || 0,
          dataRetentionCompliant: await this.checkDataRetentionCompliance(),
          securityIncidents: securityEvents.length,
          uniqueUsersAccessed: auditData[0]?.uniqueUserCount || 0
        },
        recommendations: await this.generateRecommendations(auditData[0], securityEvents)
      };

      logger.info('Compliance report generated successfully');
      return report;
    } catch (error) {
      logger.error('Error generating compliance report:', error);
      throw error;
    }
  }

  /**
   * Performs data retention cleanup
   */
  public async performDataRetentionCleanup(): Promise<{ cleaned: number; errors: string[] }> {
    logger.info('Starting data retention cleanup');

    const maxRetentionDays = parseInt(process.env.MAX_DATA_RETENTION_DAYS || '365');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxRetentionDays);

    let totalCleaned = 0;
    const errors: string[] = [];

    try {
      const kpiResult = await AnalyticsDailyKPI.deleteMany({
        date: { $lt: cutoffDate }
      });
      totalCleaned += kpiResult.deletedCount || 0;

      const alertResult = await AnalyticsAlert.deleteMany({
        createdAt: { $lt: cutoffDate },
        status: { $in: ['resolved', 'closed'] }
      });
      totalCleaned += alertResult.deletedCount || 0;

    } catch (error) {
      const errorMsg = `Data retention cleanup error: ${error.message}`;
      errors.push(errorMsg);
      logger.error(errorMsg, error);
    }

    logger.info(`Data retention cleanup completed. Total records cleaned: ${totalCleaned}`);
    return { cleaned: totalCleaned, errors };
  }

  /**
   * Validates data processing legal basis
   */
  public validateProcessingLegalBasis(purpose: string, dataType: string, userConsent?: boolean): boolean {
    const legitimateInterests = {
      'analytics': ['aggregated_metrics', 'performance_data'],
      'fraud_prevention': ['transaction_data', 'user_behavior'],
      'service_improvement': ['usage_patterns', 'feature_adoption'],
      'business_intelligence': ['revenue_data', 'engagement_metrics']
    };

    const consentRequired = ['personal_data', 'behavioral_tracking', 'marketing_data'];

    if (!legitimateInterests[purpose]) return false;
    if (!legitimateInterests[purpose].includes(dataType)) return false;
    if (consentRequired.includes(dataType) && !userConsent) return false;

      return true;
  }

  /**
   * Anonymizes user data for analytics
   */
  public anonymizeUserDataForAnalytics(userData: any): any {
    return piiSanitizer.sanitizeUserData(userData);
  }

  /**
   * Sanitizes data to remove PII
   */
  public sanitizeDataForAnalytics(data: any): any {
    return piiSanitizer.sanitizeAnalyticsData(data);
  }

  private async generateRecommendations(auditData: any, securityEvents: any[]): Promise<string[]> {
    const recommendations: string[] = [];

    if (securityEvents.length > 10) {
      recommendations.push('High number of security events detected. Review access controls.');
    }

    if (auditData?.successRate < 95) {
      recommendations.push('API success rate below 95%. Investigate recurring errors.');
    }

    if (auditData?.gdprApplicableRequests > auditData?.totalRequests * 0.1) {
      recommendations.push('Significant GDPR traffic. Ensure proper legal basis and consent.');
    }

    if (!await this.checkDataRetentionCompliance()) {
      recommendations.push('Data retention policy compliance needed. Schedule cleanup.');
    }

    return recommendations;
  }

  private async checkDataRetentionCompliance(): Promise<boolean> {
    const maxRetentionDays = parseInt(process.env.MAX_DATA_RETENTION_DAYS || '365');
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxRetentionDays);

    const oldKpiData = await AnalyticsDailyKPI.countDocuments({
      date: { $lt: cutoffDate }
    });

    const oldAlertData = await AnalyticsAlert.countDocuments({
      createdAt: { $lt: cutoffDate },
      status: { $in: ['resolved', 'closed'] }
    });

    return oldKpiData === 0 && oldAlertData === 0;
  }
}
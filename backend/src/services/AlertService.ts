import { logger } from '../config/logger';
import { AnalyticsAlert } from '../analytics/models/AnalyticsAlert';
import { AnalyticsDailyKPI } from '../analytics/models/AnalyticsDailyKPI';
import { RootCauseAnalyzer } from '../analytics/services/rootCause';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';

export interface AlertOptions {
  since?: Date;
  status?: string;
  severity?: string;
}

export interface AlertResolution {
  resolvedBy: string;
  resolution?: string;
  actionTaken?: string;
}

export interface AlertConfig {
  revenueDropThreshold: number; // percentage
  payerRateDropThreshold: number; // percentage
  abuseSpikeThreshold: number; // count
  infraErrorThreshold: number; // count
  churnSpikeThreshold: number; // percentage
  engagementDropThreshold: number; // percentage
}

export class AlertService {
  private config: AlertConfig;
  private rootCauseAnalyzer: RootCauseAnalyzer;

  constructor() {
    this.config = {
      revenueDropThreshold: parseFloat(process.env.ALERT_DROP_PCT || '15'),
      payerRateDropThreshold: parseFloat(process.env.ALERT_PAYER_DROP_PCT || '10'),
      abuseSpikeThreshold: parseInt(process.env.ALERT_ABUSE_THRESHOLD || '50'),
      infraErrorThreshold: parseInt(process.env.ALERT_INFRA_THRESHOLD || '100'),
      churnSpikeThreshold: parseFloat(process.env.ALERT_CHURN_THRESHOLD || '20'),
      engagementDropThreshold: parseFloat(process.env.ALERT_ENGAGEMENT_DROP_PCT || '15')
    };
    this.rootCauseAnalyzer = new RootCauseAnalyzer();
  }

  /**
   * Check for alerts and create new ones if thresholds are exceeded
   */
  async checkAlerts(): Promise<void> {
    try {
      logger.info('Checking for alerts');

      const alerts = await Promise.all([
        this.checkRevenueDrop(),
        this.checkPayerRateDrop(),
        this.checkAbuseSpike(),
        this.checkInfraErrors(),
        this.checkChurnSpike(),
        this.checkEngagementDrop()
      ]);

      const newAlerts = alerts.filter(alert => alert !== null);
      
      if (newAlerts.length > 0) {
        logger.info(`Created ${newAlerts.length} new alerts`);
        await this.sendNotifications(newAlerts);
      } else {
        logger.info('No new alerts detected');
      }

    } catch (error) {
      logger.error('Failed to check alerts:', error);
      throw error;
    }
  }

  /**
   * Get alerts based on filters
   */
  async getAlerts(options: AlertOptions): Promise<any[]> {
    try {
      const filter: any = {};

      if (options.since) {
        filter.createdAt = { $gte: options.since };
      }

      if (options.status) {
        filter.status = options.status;
      }

      if (options.severity) {
        filter.severity = options.severity;
      }

      const alerts = await AnalyticsAlert.find(filter)
        .sort({ createdAt: -1 })
        .limit(100)
        .populate('resolution.resolvedBy', 'username email');

      return alerts;

    } catch (error) {
      logger.error('Failed to get alerts:', error);
      throw error;
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, resolution: AlertResolution): Promise<any> {
    try {
      logger.info('Acknowledging alert', { alertId, resolvedBy: resolution.resolvedBy });

      const alert = await AnalyticsAlert.findOneAndUpdate(
        { alertId },
        {
          status: 'acknowledged',
          resolution: {
            resolvedBy: new mongoose.Types.ObjectId(resolution.resolvedBy),
            resolvedAt: new Date(),
            resolution: resolution.resolution,
            actionTaken: resolution.actionTaken
          }
        },
        { new: true }
      );

      if (!alert) {
        throw new Error('Alert not found');
      }

      return alert;

    } catch (error) {
      logger.error('Failed to acknowledge alert:', error);
      throw error;
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolution: AlertResolution): Promise<any> {
    try {
      logger.info('Resolving alert', { alertId, resolvedBy: resolution.resolvedBy });

      const alert = await AnalyticsAlert.findOneAndUpdate(
        { alertId },
        {
          status: 'resolved',
          resolution: {
            resolvedBy: new mongoose.Types.ObjectId(resolution.resolvedBy),
            resolvedAt: new Date(),
            resolution: resolution.resolution,
            actionTaken: resolution.actionTaken
          }
        },
        { new: true }
      );

      if (!alert) {
        throw new Error('Alert not found');
      }

      return alert;

    } catch (error) {
      logger.error('Failed to resolve alert:', error);
      throw error;
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<any> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [
        activeAlerts,
        criticalAlerts,
        recentAlerts,
        systemMetrics
      ] = await Promise.all([
        AnalyticsAlert.countDocuments({ status: 'active' }),
        AnalyticsAlert.countDocuments({ status: 'active', severity: 'critical' }),
        AnalyticsAlert.countDocuments({ createdAt: { $gte: oneHourAgo } }),
        this.getSystemMetrics()
      ]);

      const healthScore = this.calculateHealthScore({
        activeAlerts,
        criticalAlerts,
        recentAlerts,
        systemMetrics
      });

      return {
        status: healthScore > 80 ? 'healthy' : healthScore > 60 ? 'warning' : 'critical',
        healthScore,
        metrics: {
          activeAlerts,
          criticalAlerts,
          recentAlerts,
          systemMetrics
        },
        lastChecked: now.toISOString()
      };

    } catch (error) {
      logger.error('Failed to get system health:', error);
      throw error;
    }
  }

  /**
   * Check for revenue drop
   */
  private async checkRevenueDrop(): Promise<any> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get today's revenue
      const todayRevenue = await this.getDailyRevenue(today);
      
      // Get 7-day average revenue
      const weekAvgRevenue = await this.getAverageRevenue(weekAgo, yesterday);

      if (todayRevenue === 0 || weekAvgRevenue === 0) {
        return null;
      }

      const dropPercentage = ((weekAvgRevenue - todayRevenue) / weekAvgRevenue) * 100;

      if (dropPercentage > this.config.revenueDropThreshold) {
        return await this.createAlert({
          type: 'revenue_drop',
          severity: dropPercentage > 30 ? 'critical' : dropPercentage > 20 ? 'high' : 'medium',
          title: 'Revenue Drop Detected',
          description: `Revenue dropped by ${dropPercentage.toFixed(2)}% compared to 7-day average`,
          metric: 'revenue.total',
          currentValue: todayRevenue,
          thresholdValue: weekAvgRevenue,
          deviation: dropPercentage,
          timeWindow: '1day',
          affectedRevenue: weekAvgRevenue - todayRevenue,
          config: {
            threshold: this.config.revenueDropThreshold,
            comparisonPeriod: '7day_avg',
            notificationChannels: ['email', 'slack'],
            autoResolve: false,
            escalationLevel: 1
          }
        });
      }

      return null;

    } catch (error) {
      logger.error('Failed to check revenue drop:', error);
      return null;
    }
  }

  /**
   * Check for payer rate drop
   */
  private async checkPayerRateDrop(): Promise<any> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get today's payer rate
      const todayPayerRate = await this.getDailyPayerRate(today);
      
      // Get 7-day average payer rate
      const weekAvgPayerRate = await this.getAveragePayerRate(weekAgo, yesterday);

      if (todayPayerRate === 0 || weekAvgPayerRate === 0) {
        return null;
      }

      const dropPercentage = ((weekAvgPayerRate - todayPayerRate) / weekAvgPayerRate) * 100;

      if (dropPercentage > this.config.payerRateDropThreshold) {
        return await this.createAlert({
          type: 'payer_rate_drop',
          severity: dropPercentage > 20 ? 'high' : 'medium',
          title: 'Payer Rate Drop Detected',
          description: `Payer rate dropped by ${dropPercentage.toFixed(2)}% compared to 7-day average`,
          metric: 'monetization.payerRate',
          currentValue: todayPayerRate,
          thresholdValue: weekAvgPayerRate,
          deviation: dropPercentage,
          timeWindow: '1day',
          config: {
            threshold: this.config.payerRateDropThreshold,
            comparisonPeriod: '7day_avg',
            notificationChannels: ['email'],
            autoResolve: false,
            escalationLevel: 1
          }
        });
      }

      return null;

    } catch (error) {
      logger.error('Failed to check payer rate drop:', error);
      return null;
    }
  }

  /**
   * Check for abuse spike
   */
  private async checkAbuseSpike(): Promise<any> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const abuseCount = await this.getAbuseCount(oneHourAgo, now);

      if (abuseCount > this.config.abuseSpikeThreshold) {
        return await this.createAlert({
          type: 'abuse_spike',
          severity: abuseCount > 100 ? 'critical' : 'high',
          title: 'Abuse Spike Detected',
          description: `${abuseCount} abuse incidents detected in the last hour`,
          metric: 'safety.flaggedContent',
          currentValue: abuseCount,
          thresholdValue: this.config.abuseSpikeThreshold,
          deviation: ((abuseCount - this.config.abuseSpikeThreshold) / this.config.abuseSpikeThreshold) * 100,
          timeWindow: '1hour',
          config: {
            threshold: this.config.abuseSpikeThreshold,
            comparisonPeriod: 'previous_hour',
            notificationChannels: ['email', 'slack'],
            autoResolve: true,
            escalationLevel: 2
          }
        });
      }

      return null;

    } catch (error) {
      logger.error('Failed to check abuse spike:', error);
      return null;
    }
  }

  /**
   * Check for infrastructure errors
   */
  private async checkInfraErrors(): Promise<any> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const errorCount = await this.getInfraErrorCount(oneHourAgo, now);

      if (errorCount > this.config.infraErrorThreshold) {
        return await this.createAlert({
          type: 'infra_error',
          severity: errorCount > 500 ? 'critical' : 'high',
          title: 'Infrastructure Error Spike',
          description: `${errorCount} infrastructure errors detected in the last hour`,
          metric: 'system.errors',
          currentValue: errorCount,
          thresholdValue: this.config.infraErrorThreshold,
          deviation: ((errorCount - this.config.infraErrorThreshold) / this.config.infraErrorThreshold) * 100,
          timeWindow: '1hour',
          config: {
            threshold: this.config.infraErrorThreshold,
            comparisonPeriod: 'previous_hour',
            notificationChannels: ['email', 'slack', 'webhook'],
            autoResolve: true,
            escalationLevel: 3
          }
        });
      }

      return null;

    } catch (error) {
      logger.error('Failed to check infra errors:', error);
      return null;
    }
  }

  /**
   * Check for churn spike
   */
  private async checkChurnSpike(): Promise<any> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const todayChurnRate = await this.getDailyChurnRate(today);
      const weekAvgChurnRate = await this.getAverageChurnRate(weekAgo, yesterday);

      if (todayChurnRate === 0 || weekAvgChurnRate === 0) {
        return null;
      }

      const spikePercentage = ((todayChurnRate - weekAvgChurnRate) / weekAvgChurnRate) * 100;

      if (spikePercentage > this.config.churnSpikeThreshold) {
        return await this.createAlert({
          type: 'churn_spike',
          severity: spikePercentage > 50 ? 'critical' : 'high',
          title: 'Churn Spike Detected',
          description: `Churn rate increased by ${spikePercentage.toFixed(2)}% compared to 7-day average`,
          metric: 'retention.churnRate',
          currentValue: todayChurnRate,
          thresholdValue: weekAvgChurnRate,
          deviation: spikePercentage,
          timeWindow: '1day',
          config: {
            threshold: this.config.churnSpikeThreshold,
            comparisonPeriod: '7day_avg',
            notificationChannels: ['email'],
            autoResolve: false,
            escalationLevel: 2
          }
        });
      }

      return null;

    } catch (error) {
      logger.error('Failed to check churn spike:', error);
      return null;
    }
  }

  /**
   * Check for engagement drop
   */
  private async checkEngagementDrop(): Promise<any> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const todayEngagement = await this.getDailyEngagement(today);
      const weekAvgEngagement = await this.getAverageEngagement(weekAgo, yesterday);

      if (todayEngagement === 0 || weekAvgEngagement === 0) {
        return null;
      }

      const dropPercentage = ((weekAvgEngagement - todayEngagement) / weekAvgEngagement) * 100;

      if (dropPercentage > this.config.engagementDropThreshold) {
        return await this.createAlert({
          type: 'engagement_drop',
          severity: dropPercentage > 25 ? 'high' : 'medium',
          title: 'Engagement Drop Detected',
          description: `Engagement dropped by ${dropPercentage.toFixed(2)}% compared to 7-day average`,
          metric: 'engagement.dau',
          currentValue: todayEngagement,
          thresholdValue: weekAvgEngagement,
          deviation: dropPercentage,
          timeWindow: '1day',
          config: {
            threshold: this.config.engagementDropThreshold,
            comparisonPeriod: '7day_avg',
            notificationChannels: ['email'],
            autoResolve: false,
            escalationLevel: 1
          }
        });
      }

      return null;

    } catch (error) {
      logger.error('Failed to check engagement drop:', error);
      return null;
    }
  }

  /**
   * Create a new alert
   */
  private async createAlert(alertData: any): Promise<any> {
    try {
      // Perform root cause analysis
      const rootCauseAnalysis = await this.rootCauseAnalyzer.analyzeRootCause({
        type: alertData.type,
        metric: alertData.metric,
        currentValue: alertData.currentValue,
        thresholdValue: alertData.thresholdValue,
        deviation: alertData.deviation,
        timeWindow: alertData.timeWindow,
        country: alertData.country
      });

      const alert = new AnalyticsAlert({
        alertId: uuidv4(),
        ...alertData,
        notifications: [],
        relatedData: {
          kpiSnapshot: {},
          affectedEntities: [],
          trends: {},
          rootCause: rootCauseAnalysis
        }
      });

      await alert.save();
      logger.info('Created new alert with root cause analysis', { 
        alertId: alert.alertId, 
        type: alert.type,
        cause: rootCauseAnalysis.cause 
      });

      return alert;

    } catch (error) {
      logger.error('Failed to create alert:', error);
      return null;
    }
  }

  /**
   * Send notifications for new alerts
   */
  private async sendNotifications(alerts: any[]): Promise<void> {
    try {
      for (const alert of alerts) {
        await this.sendAlertNotification(alert);
      }
    } catch (error) {
      logger.error('Failed to send notifications:', error);
    }
  }

  /**
   * Send notification for a single alert
   */
  private async sendAlertNotification(alert: any): Promise<void> {
    try {
      const notificationChannels = alert.config.notificationChannels || ['email'];

      for (const channel of notificationChannels) {
        await this.sendNotification(alert, channel);
      }

    } catch (error) {
      logger.error('Failed to send alert notification:', error);
    }
  }

  /**
   * Send notification via specific channel
   */
  private async sendNotification(alert: any, channel: string): Promise<void> {
    try {
      const notification = {
        channel,
        sentAt: new Date(),
        status: 'sent' as const,
        response: ''
      };

      // Update alert with notification record
      await AnalyticsAlert.findOneAndUpdate(
        { alertId: alert.alertId },
        { $push: { notifications: notification } }
      );

      // In production, you would actually send the notification here
      // For now, just log it
      logger.info(`Notification sent via ${channel}`, {
        alertId: alert.alertId,
        type: alert.type,
        severity: alert.severity
      });

    } catch (error) {
      logger.error(`Failed to send notification via ${channel}:`, error);
    }
  }

  // Helper methods for getting metrics
  private async getDailyRevenue(date: Date): Promise<number> {
    const kpi = await AnalyticsDailyKPI.findOne({ date, country: 'ALL' });
    return kpi?.revenue.total || 0;
  }

  private async getAverageRevenue(from: Date, to: Date): Promise<number> {
    const kpis = await AnalyticsDailyKPI.find({
      date: { $gte: from, $lte: to },
      country: 'ALL'
    });

    if (kpis.length === 0) return 0;
    
    const totalRevenue = kpis.reduce((sum, kpi) => sum + kpi.revenue.total, 0);
    return totalRevenue / kpis.length;
  }

  private async getDailyPayerRate(date: Date): Promise<number> {
    const kpi = await AnalyticsDailyKPI.findOne({ date, country: 'ALL' });
    return kpi?.monetization.payerRate || 0;
  }

  private async getAveragePayerRate(from: Date, to: Date): Promise<number> {
    const kpis = await AnalyticsDailyKPI.find({
      date: { $gte: from, $lte: to },
      country: 'ALL'
    });

    if (kpis.length === 0) return 0;
    
    const totalPayerRate = kpis.reduce((sum, kpi) => sum + kpi.monetization.payerRate, 0);
    return totalPayerRate / kpis.length;
  }

  private async getAbuseCount(from: Date, to: Date): Promise<number> {
    const kpis = await AnalyticsDailyKPI.find({
      date: { $gte: from, $lte: to },
      country: 'ALL'
    });

    return kpis.reduce((sum, kpi) => sum + kpi.safety.flaggedContent, 0);
  }

  private async getInfraErrorCount(from: Date, to: Date): Promise<number> {
    // This would typically query your error logs
    // For now, return a mock value
    return 0;
  }

  private async getDailyChurnRate(date: Date): Promise<number> {
    // This would typically query your retention data
    // For now, return a mock value
    return 0;
  }

  private async getAverageChurnRate(from: Date, to: Date): Promise<number> {
    // This would typically query your retention data
    // For now, return a mock value
    return 0;
  }

  private async getDailyEngagement(date: Date): Promise<number> {
    const kpi = await AnalyticsDailyKPI.findOne({ date, country: 'ALL' });
    return kpi?.engagement.dau || 0;
  }

  private async getAverageEngagement(from: Date, to: Date): Promise<number> {
    const kpis = await AnalyticsDailyKPI.find({
      date: { $gte: from, $lte: to },
      country: 'ALL'
    });

    if (kpis.length === 0) return 0;
    
    const totalEngagement = kpis.reduce((sum, kpi) => sum + kpi.engagement.dau, 0);
    return totalEngagement / kpis.length;
  }

  private async getSystemMetrics(): Promise<any> {
    // This would typically query your system metrics
    // For now, return mock data
    return {
      cpuUsage: 45,
      memoryUsage: 60,
      diskUsage: 30,
      responseTime: 150
    };
  }

  private calculateHealthScore(metrics: any): number {
    let score = 100;

    // Deduct points for alerts
    score -= metrics.activeAlerts * 5;
    score -= metrics.criticalAlerts * 15;
    score -= metrics.recentAlerts * 2;

    // Deduct points for system issues
    if (metrics.systemMetrics.cpuUsage > 80) score -= 10;
    if (metrics.systemMetrics.memoryUsage > 90) score -= 15;
    if (metrics.systemMetrics.diskUsage > 95) score -= 20;
    if (metrics.systemMetrics.responseTime > 1000) score -= 10;

    return Math.max(0, Math.min(100, score));
  }
}

export default AlertService;

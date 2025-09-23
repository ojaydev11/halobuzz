import * as cron from 'node-cron';
import { logger } from '../../config/logger';
import DailyRollupETL from '../etl/dailyRollup';
import { AlertService } from '../../services/AlertService';
import { ReportGeneratorService } from '../../services/ReportGeneratorService';
import { PredictiveAnalyticsService } from '../../services/PredictiveAnalyticsService';

export class AnalyticsScheduler {
  private alertService: AlertService;
  private reportService: ReportGeneratorService;
  private predictiveService: PredictiveAnalyticsService;
  private isRunning: boolean = false;

  constructor() {
    this.alertService = new AlertService();
    this.reportService = new ReportGeneratorService();
    this.predictiveService = new PredictiveAnalyticsService();
  }

  /**
   * Start all scheduled jobs
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Analytics scheduler is already running');
      return;
    }

    logger.info('Starting analytics scheduler');

    // Daily rollup at 3:00 AM Sydney time
    this.scheduleDailyRollup();

    // Weekly report generation at 4:00 AM Monday Sydney time
    this.scheduleWeeklyReport();

    // Alert checking every 15 minutes
    this.scheduleAlertChecking();

    // Forecast generation daily at 2:00 AM Sydney time
    this.scheduleForecastGeneration();

    // Monthly cohort analysis at 5:00 AM first day of month Sydney time
    this.scheduleCohortAnalysis();

    this.isRunning = true;
    logger.info('Analytics scheduler started successfully');
  }

  /**
   * Stop all scheduled jobs
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('Analytics scheduler is not running');
      return;
    }

    logger.info('Stopping analytics scheduler');
    cron.getTasks().forEach(task => task.destroy());
    this.isRunning = false;
    logger.info('Analytics scheduler stopped');
  }

  /**
   * Schedule daily rollup ETL job
   */
  private scheduleDailyRollup(): void {
    // Run at 3:00 AM Sydney time (UTC+10/11)
    // Using 17:00 UTC (previous day) for Sydney time
    cron.schedule('0 17 * * *', async () => {
      try {
        logger.info('Starting daily rollup ETL job');
        
        const dailyETL = new DailyRollupETL({
          country: 'ALL'
        });

        await dailyETL.execute();
        
        logger.info('Daily rollup ETL job completed successfully');
      } catch (error) {
        logger.error('Daily rollup ETL job failed:', error);
      }
    }, {
      scheduled: true,
      timezone: 'Australia/Sydney'
    });

    logger.info('Daily rollup ETL job scheduled for 3:00 AM Sydney time');
  }

  /**
   * Schedule weekly report generation
   */
  private scheduleWeeklyReport(): void {
    // Run at 4:00 AM Monday Sydney time
    // Using 18:00 UTC Sunday for Sydney time
    cron.schedule('0 18 * * 0', async () => {
      try {
        logger.info('Starting weekly report generation');

        const report = await this.reportService.generateReport({
          period: 'weekly',
          format: 'pdf',
          country: 'ALL',
          includeCharts: true,
          userId: 'system'
        });

        // Save report to storage
        await this.saveReport(report, 'weekly', 'pdf');
        
        // Send notification if configured
        await this.sendReportNotification('weekly', 'pdf');

        logger.info('Weekly report generation completed successfully');
      } catch (error) {
        logger.error('Weekly report generation failed:', error);
      }
    }, {
      scheduled: true,
      timezone: 'Australia/Sydney'
    });

    logger.info('Weekly report generation scheduled for 4:00 AM Monday Sydney time');
  }

  /**
   * Schedule alert checking
   */
  private scheduleAlertChecking(): void {
    // Run every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
      try {
        logger.info('Starting alert checking');
        
        await this.alertService.checkAlerts();
        
        logger.info('Alert checking completed');
      } catch (error) {
        logger.error('Alert checking failed:', error);
      }
    }, {
      scheduled: true,
      timezone: 'Australia/Sydney'
    });

    logger.info('Alert checking scheduled every 15 minutes');
  }

  /**
   * Schedule forecast generation
   */
  private scheduleForecastGeneration(): void {
    // Run at 2:00 AM Sydney time
    // Using 16:00 UTC (previous day) for Sydney time
    cron.schedule('0 16 * * *', async () => {
      try {
        logger.info('Starting forecast generation');

        const metrics = ['revenue', 'dau', 'engagement', 'streams', 'gifts'];
        const horizons = [7, 14, 30];

        for (const metric of metrics) {
          for (const horizon of horizons) {
            try {
              await this.predictiveService.generatePrediction({
                metric,
                horizonDays: horizon,
                segments: {},
                userId: 'system'
              });
            } catch (error) {
              logger.error(`Failed to generate forecast for ${metric} (${horizon} days):`, error);
            }
          }
        }
        
        logger.info('Forecast generation completed successfully');
      } catch (error) {
        logger.error('Forecast generation failed:', error);
      }
    }, {
      scheduled: true,
      timezone: 'Australia/Sydney'
    });

    logger.info('Forecast generation scheduled for 2:00 AM Sydney time');
  }

  /**
   * Schedule cohort analysis
   */
  private scheduleCohortAnalysis(): void {
    // Run at 5:00 AM first day of month Sydney time
    // Using 19:00 UTC last day of previous month for Sydney time
    cron.schedule('0 19 1 * *', async () => {
      try {
        logger.info('Starting monthly cohort analysis');

        await this.generateCohortAnalysis();
        
        logger.info('Monthly cohort analysis completed successfully');
      } catch (error) {
        logger.error('Monthly cohort analysis failed:', error);
      }
    }, {
      scheduled: true,
      timezone: 'Australia/Sydney'
    });

    logger.info('Monthly cohort analysis scheduled for 5:00 AM first day of month Sydney time');
  }

  /**
   * Generate cohort analysis
   */
  private async generateCohortAnalysis(): Promise<void> {
    try {
      const { AnalyticsCohort } = await import('../models/AnalyticsCohort');
      const { User } = await import('../../models/User');
      const { LiveStream } = await import('../../models/LiveStream');
      const { Transaction } = await import('../../models/Transaction');

      const now = new Date();
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get users who signed up in the last month
      const newUsers = await User.find({
        createdAt: { $gte: oneMonthAgo, $lt: now }
      });

      // Group by week
      const weeklyCohorts = this.groupUsersByWeek(newUsers);
      const monthlyCohorts = this.groupUsersByMonth(newUsers);

      // Process weekly cohorts
      for (const [weekStart, users] of weeklyCohorts) {
        await this.processCohort(users, weekStart, 'week');
      }

      // Process monthly cohorts
      for (const [monthStart, users] of monthlyCohorts) {
        await this.processCohort(users, monthStart, 'month');
      }

    } catch (error) {
      logger.error('Failed to generate cohort analysis:', error);
      throw error;
    }
  }

  /**
   * Group users by week
   */
  private groupUsersByWeek(users: any[]): Map<Date, any[]> {
    const weeklyGroups = new Map<Date, any[]>();

    users.forEach(user => {
      const weekStart = this.getWeekStart(user.createdAt);
      if (!weeklyGroups.has(weekStart)) {
        weeklyGroups.set(weekStart, []);
      }
      weeklyGroups.get(weekStart)!.push(user);
    });

    return weeklyGroups;
  }

  /**
   * Group users by month
   */
  private groupUsersByMonth(users: any[]): Map<Date, any[]> {
    const monthlyGroups = new Map<Date, any[]>();

    users.forEach(user => {
      const monthStart = this.getMonthStart(user.createdAt);
      if (!monthlyGroups.has(monthStart)) {
        monthlyGroups.set(monthStart, []);
      }
      monthlyGroups.get(monthStart)!.push(user);
    });

    return monthlyGroups;
  }

  /**
   * Get week start date
   */
  private getWeekStart(date: Date): Date {
    const weekStart = new Date(date);
    const dayOfWeek = weekStart.getDay();
    weekStart.setDate(weekStart.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  }

  /**
   * Get month start date
   */
  private getMonthStart(date: Date): Date {
    const monthStart = new Date(date);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    return monthStart;
  }

  /**
   * Process a cohort
   */
  private async processCohort(users: any[], cohortDate: Date, granularity: 'week' | 'month'): Promise<void> {
    try {
      const { AnalyticsCohort } = await import('../models/AnalyticsCohort');
      const { LiveStream } = await import('../../models/LiveStream');
      const { Transaction } = await import('../../models/Transaction');

      const userIds = users.map(user => user._id);
      const cohortSize = users.length;

      // Calculate retention metrics
      const retention = await this.calculateRetention(userIds, cohortDate);

      // Calculate revenue metrics
      const revenue = await this.calculateCohortRevenue(userIds, cohortDate);

      // Calculate engagement metrics
      const engagement = await this.calculateCohortEngagement(userIds, cohortDate);

      // Calculate churn metrics
      const churn = await this.calculateCohortChurn(userIds, cohortDate);

      // Calculate creator metrics
      const creators = await this.calculateCohortCreators(userIds, cohortDate);

      const cohortData = {
        cohortDate,
        granularity,
        country: 'ALL',
        cohortSize,
        retention,
        revenue,
        engagement,
        churn,
        creators
      };

      await AnalyticsCohort.findOneAndUpdate(
        { cohortDate, granularity, country: 'ALL' },
        cohortData,
        { upsert: true, new: true }
      );

      logger.info(`Processed ${granularity} cohort`, { 
        cohortDate, 
        cohortSize,
        retention: retention.d7 
      });

    } catch (error) {
      logger.error('Failed to process cohort:', error);
      throw error;
    }
  }

  /**
   * Calculate retention metrics for a cohort
   */
  private async calculateRetention(userIds: string[], cohortDate: Date): Promise<any> {
    const now = new Date();
    const daysSinceCohort = Math.floor((now.getTime() - cohortDate.getTime()) / (1000 * 60 * 60 * 24));

    const retention = {
      d1: 0,
      d3: 0,
      d7: 0,
      d14: 0,
      d30: 0,
      d60: 0,
      d90: 0
    };

    // Calculate D1 retention
    if (daysSinceCohort >= 1) {
      const d1Date = new Date(cohortDate.getTime() + 24 * 60 * 60 * 1000);
      const activeUsers = await this.countActiveUsers(userIds, d1Date, d1Date);
      retention.d1 = (activeUsers / userIds.length) * 100;
    }

    // Calculate D7 retention
    if (daysSinceCohort >= 7) {
      const d7Date = new Date(cohortDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      const activeUsers = await this.countActiveUsers(userIds, d7Date, d7Date);
      retention.d7 = (activeUsers / userIds.length) * 100;
    }

    // Calculate D30 retention
    if (daysSinceCohort >= 30) {
      const d30Date = new Date(cohortDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      const activeUsers = await this.countActiveUsers(userIds, d30Date, d30Date);
      retention.d30 = (activeUsers / userIds.length) * 100;
    }

    return retention;
  }

  /**
   * Count active users in a date range
   */
  private async countActiveUsers(userIds: string[], from: Date, to: Date): Promise<number> {
    const { User } = await import('../../models/User');
    
    return await User.countDocuments({
      _id: { $in: userIds },
      lastActiveAt: { $gte: from, $lte: to }
    });
  }

  /**
   * Calculate cohort revenue metrics
   */
  private async calculateCohortRevenue(userIds: string[], cohortDate: Date): Promise<any> {
    const { Transaction } = await import('../../models/Transaction');

    const revenueData = await Transaction.aggregate([
      {
        $match: {
          userId: { $in: userIds },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$netAmount' },
          avgRevenuePerUser: { $avg: '$netAmount' }
        }
      }
    ]);

    const result = revenueData[0] || { totalRevenue: 0, avgRevenuePerUser: 0 };

    return {
      totalRevenue: result.totalRevenue,
      avgRevenuePerUser: result.avgRevenuePerUser,
      revenueByPeriod: {
        week1: 0, // TODO: Calculate by period
        week2: 0,
        week3: 0,
        week4: 0,
        month2: 0,
        month3: 0
      }
    };
  }

  /**
   * Calculate cohort engagement metrics
   */
  private async calculateCohortEngagement(userIds: string[], cohortDate: Date): Promise<any> {
    const { LiveStream } = await import('../../models/LiveStream');

    const engagementData = await LiveStream.aggregate([
      {
        $match: {
          hostId: { $in: userIds }
        }
      },
      {
        $group: {
          _id: '$hostId',
          streams: { $sum: 1 },
          totalViewers: { $sum: '$totalViewers' },
          totalGifts: { $sum: '$totalGifts' }
        }
      },
      {
        $group: {
          _id: null,
          avgStreamsPerUser: { $avg: '$streams' },
          avgViewersPerUser: { $avg: '$totalViewers' },
          avgGiftsSentPerUser: { $avg: '$totalGifts' },
          avgGiftsReceivedPerUser: { $avg: '$totalGifts' },
          avgGamePlaysPerUser: { $avg: 0 } // TODO: Calculate from game data
        }
      }
    ]);

    const result = engagementData[0] || {
      avgStreamsPerUser: 0,
      avgViewersPerUser: 0,
      avgGiftsSentPerUser: 0,
      avgGiftsReceivedPerUser: 0,
      avgGamePlaysPerUser: 0
    };

    return {
      avgSessionsPerUser: result.avgStreamsPerUser,
      avgStreamsPerUser: result.avgStreamsPerUser,
      avgGiftsSentPerUser: result.avgGiftsSentPerUser,
      avgGiftsReceivedPerUser: result.avgGiftsReceivedPerUser,
      avgGamePlaysPerUser: result.avgGamePlaysPerUser
    };
  }

  /**
   * Calculate cohort churn metrics
   */
  private async calculateCohortChurn(userIds: string[], cohortDate: Date): Promise<any> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const churnedUsers = await this.countActiveUsers(userIds, new Date(0), thirtyDaysAgo);
    const churnRate = (churnedUsers / userIds.length) * 100;

    return {
      churnedUsers,
      churnRate,
      avgLifetimeDays: 0, // TODO: Calculate average lifetime
      churnRiskScore: Math.min(100, churnRate * 2) // Simple risk score
    };
  }

  /**
   * Calculate cohort creator metrics
   */
  private async calculateCohortCreators(userIds: string[], cohortDate: Date): Promise<any> {
    const { LiveStream } = await import('../../models/LiveStream');

    const creators = await LiveStream.distinct('hostId', {
      hostId: { $in: userIds }
    });

    const creatorConversionRate = (creators.length / userIds.length) * 100;

    return {
      creatorsInCohort: creators.length,
      creatorConversionRate,
      avgCreatorRevenue: 0, // TODO: Calculate average creator revenue
      topCreatorRevenue: 0 // TODO: Calculate top creator revenue
    };
  }

  /**
   * Save report to storage
   */
  private async saveReport(report: Buffer, period: string, format: string): Promise<void> {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const filename = `report-${period}-${Date.now()}.${format}`;
      const filepath = path.join(process.env.REPORTS_STORAGE_DIR || './storage/reports', String(year), month, filename);
      
      // Ensure directory exists
      const dir = path.dirname(filepath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(filepath, report);
      
      logger.info(`Report saved to ${filepath}`);
    } catch (error) {
      logger.error('Failed to save report:', error);
    }
  }

  /**
   * Send report notification
   */
  private async sendReportNotification(period: string, format: string): Promise<void> {
    try {
      const webhookUrl = process.env.ADMIN_WEBHOOK_URL;
      if (!webhookUrl) {
        logger.info('No webhook URL configured, skipping notification');
        return;
      }

      const axios = await import('axios');
      
      await axios.default.post(webhookUrl, {
        text: `HaloBuzz ${period} report generated successfully`,
        attachments: [{
          color: 'good',
          fields: [{
            title: 'Report Details',
            value: `Period: ${period}\nFormat: ${format}\nGenerated: ${new Date().toISOString()}`,
            short: false
          }]
        }]
      });

      logger.info(`Report notification sent for ${period} ${format} report`);
    } catch (error) {
      logger.error('Failed to send report notification:', error);
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): any {
    return {
      isRunning: this.isRunning,
      scheduledJobs: cron.getTasks().length,
      timezone: 'Australia/Sydney',
      jobs: [
        {
          name: 'Daily Rollup ETL',
          schedule: '0 17 * * *',
          description: 'Daily analytics data rollup at 3:00 AM Sydney time'
        },
        {
          name: 'Weekly Report Generation',
          schedule: '0 18 * * 0',
          description: 'Weekly report generation at 4:00 AM Monday Sydney time'
        },
        {
          name: 'Alert Checking',
          schedule: '*/15 * * * *',
          description: 'Alert checking every 15 minutes'
        },
        {
          name: 'Forecast Generation',
          schedule: '0 16 * * *',
          description: 'Daily forecast generation at 2:00 AM Sydney time'
        },
        {
          name: 'Cohort Analysis',
          schedule: '0 19 1 * *',
          description: 'Monthly cohort analysis at 5:00 AM first day of month Sydney time'
        }
      ]
    };
  }
}

export default AnalyticsScheduler;

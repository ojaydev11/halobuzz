import { logger } from '../../config/logger';
import { DailyRollupETL } from './dailyRollup';
import { User } from '../../models/User';
import { LiveStream } from '../../models/LiveStream';
import { Transaction } from '../../models/Transaction';

export interface BackfillOptions {
  startDate?: Date;
  endDate?: Date;
  country?: string;
  batchSize?: number;
  dryRun?: boolean;
}

export class RebuildBackfillETL {
  private startDate: Date;
  private endDate: Date;
  private country: string;
  private batchSize: number;
  private dryRun: boolean;

  constructor(options: BackfillOptions = {}) {
    this.startDate = options.startDate || this.getFirstEventDate();
    this.endDate = options.endDate || this.getYesterday();
    this.country = options.country || 'ALL';
    this.batchSize = options.batchSize || 7; // Process 7 days at a time
    this.dryRun = options.dryRun || false;
  }

  private getFirstEventDate(): Date {
    // This would typically query the earliest event date from your data
    // For now, we'll use a reasonable default
    const firstDate = new Date();
    firstDate.setDate(firstDate.getDate() - 365); // 1 year ago
    firstDate.setHours(0, 0, 0, 0);
    return firstDate;
  }

  private getYesterday(): Date {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);
    return yesterday;
  }

  async execute(): Promise<void> {
    try {
      logger.info('Starting rebuild backfill ETL', {
        startDate: this.startDate,
        endDate: this.endDate,
        country: this.country,
        batchSize: this.batchSize,
        dryRun: this.dryRun
      });

      if (this.dryRun) {
        await this.dryRunAnalysis();
        return;
      }

      // Clear existing analytics data for the date range
      await this.clearExistingData();

      // Process data in batches
      const totalDays = Math.ceil((this.endDate.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24));
      const totalBatches = Math.ceil(totalDays / this.batchSize);

      logger.info(`Processing ${totalDays} days in ${totalBatches} batches`);

      for (let batch = 0; batch < totalBatches; batch++) {
        const batchStart = this.getBatchStartDate(batch);
        const batchEnd = this.getBatchEndDate(batchStart);

        logger.info(`Processing batch ${batch + 1}/${totalBatches}`, {
          batchStart,
          batchEnd
        });

        await this.processBatch(batchStart, batchEnd);

        // Add delay between batches to prevent overwhelming the database
        if (batch < totalBatches - 1) {
          await this.delay(1000); // 1 second delay
        }
      }

      logger.info('Rebuild backfill ETL completed successfully', {
        startDate: this.startDate,
        endDate: this.endDate,
        country: this.country,
        totalDays,
        totalBatches
      });

    } catch (error) {
      logger.error('Rebuild backfill ETL failed:', error);
      throw error;
    }
  }

  private async dryRunAnalysis(): Promise<void> {
    logger.info('Performing dry run analysis');

    // Analyze data availability
    const userCount = await User.countDocuments({
      createdAt: { $gte: this.startDate, $lte: this.endDate },
      ...(this.country !== 'ALL' && { country: this.country })
    });

    const streamCount = await LiveStream.countDocuments({
      createdAt: { $gte: this.startDate, $lte: this.endDate },
      ...(this.country !== 'ALL' && { country: this.country })
    });

    const transactionCount = await Transaction.countDocuments({
      createdAt: { $gte: this.startDate, $lte: this.endDate },
      ...(this.country !== 'ALL' && { country: this.country })
    });

    const totalDays = Math.ceil((this.endDate.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const totalBatches = Math.ceil(totalDays / this.batchSize);

    logger.info('Dry run analysis completed', {
      dateRange: { start: this.startDate, end: this.endDate },
      totalDays,
      totalBatches,
      dataAvailability: {
        users: userCount,
        streams: streamCount,
        transactions: transactionCount
      },
      estimatedProcessingTime: `${totalBatches * 2} minutes` // Rough estimate
    });
  }

  private async clearExistingData(): Promise<void> {
    logger.info('Clearing existing analytics data', {
      startDate: this.startDate,
      endDate: this.endDate,
      country: this.country
    });

    const { AnalyticsDailyKPI } = await import('../models/AnalyticsDailyKPI');
    const { AnalyticsFunnel } = await import('../models/AnalyticsFunnel');
    const { AnalyticsHostPerformance } = await import('../models/AnalyticsHostPerformance');

    const deleteConditions = {
      date: { $gte: this.startDate, $lte: this.endDate },
      ...(this.country !== 'ALL' && { country: this.country })
    };

    const [kpiDeleted, funnelDeleted, hostDeleted] = await Promise.all([
      AnalyticsDailyKPI.deleteMany(deleteConditions),
      AnalyticsFunnel.deleteMany(deleteConditions),
      AnalyticsHostPerformance.deleteMany(deleteConditions)
    ]);

    logger.info('Existing analytics data cleared', {
      kpiRecordsDeleted: kpiDeleted.deletedCount,
      funnelRecordsDeleted: funnelDeleted.deletedCount,
      hostRecordsDeleted: hostDeleted.deletedCount
    });
  }

  private getBatchStartDate(batchIndex: number): Date {
    const batchStart = new Date(this.startDate);
    batchStart.setDate(batchStart.getDate() + (batchIndex * this.batchSize));
    batchStart.setHours(0, 0, 0, 0);
    return batchStart;
  }

  private getBatchEndDate(batchStart: Date): Date {
    const batchEnd = new Date(batchStart);
    batchEnd.setDate(batchEnd.getDate() + this.batchSize - 1);
    batchEnd.setHours(23, 59, 59, 999);
    
    // Don't exceed the overall end date
    if (batchEnd > this.endDate) {
      batchEnd.setTime(this.endDate.getTime());
    }
    
    return batchEnd;
  }

  private async processBatch(batchStart: Date, batchEnd: Date): Promise<void> {
    const currentDate = new Date(batchStart);
    
    while (currentDate <= batchEnd) {
      try {
        const dailyETL = new DailyRollupETL({
          targetDate: new Date(currentDate),
          country: this.country,
          forceRebuild: true
        });

        await dailyETL.execute();

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);

      } catch (error) {
        logger.error(`Failed to process date ${currentDate.toISOString()}:`, error);
        
        // Continue with next date instead of failing the entire batch
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Utility method to get data quality metrics
  async getDataQualityMetrics(): Promise<any> {
    logger.info('Analyzing data quality metrics');

    const metrics = {
      dateRange: {
        start: this.startDate,
        end: this.endDate,
        totalDays: Math.ceil((this.endDate.getTime() - this.startDate.getTime()) / (1000 * 60 * 60 * 24))
      },
      dataAvailability: {
        users: await User.countDocuments({
          createdAt: { $gte: this.startDate, $lte: this.endDate },
          ...(this.country !== 'ALL' && { country: this.country })
        }),
        streams: await LiveStream.countDocuments({
          createdAt: { $gte: this.startDate, $lte: this.endDate },
          ...(this.country !== 'ALL' && { country: this.country })
        }),
        transactions: await Transaction.countDocuments({
          createdAt: { $gte: this.startDate, $lte: this.endDate },
          ...(this.country !== 'ALL' && { country: this.country })
        })
      },
      dataQuality: {
        usersWithMissingData: await this.countUsersWithMissingData(),
        streamsWithMissingData: await this.countStreamsWithMissingData(),
        transactionsWithMissingData: await this.countTransactionsWithMissingData()
      }
    };

    logger.info('Data quality metrics calculated', metrics);
    return metrics;
  }

  private async countUsersWithMissingData(): Promise<number> {
    return await User.countDocuments({
      createdAt: { $gte: this.startDate, $lte: this.endDate },
      $or: [
        { country: { $exists: false } },
        { country: null },
        { country: '' }
      ],
      ...(this.country !== 'ALL' && { country: this.country })
    });
  }

  private async countStreamsWithMissingData(): Promise<number> {
    return await LiveStream.countDocuments({
      createdAt: { $gte: this.startDate, $lte: this.endDate },
      $or: [
        { country: { $exists: false } },
        { country: null },
        { country: '' },
        { duration: { $exists: false } },
        { duration: null }
      ],
      ...(this.country !== 'ALL' && { country: this.country })
    });
  }

  private async countTransactionsWithMissingData(): Promise<number> {
    return await Transaction.countDocuments({
      createdAt: { $gte: this.startDate, $lte: this.endDate },
      $or: [
        { amount: { $exists: false } },
        { amount: null },
        { status: { $exists: false } },
        { status: null }
      ],
      ...(this.country !== 'ALL' && { country: this.country })
    });
  }
}

export default RebuildBackfillETL;

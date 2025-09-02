import cron from 'node-cron';
import { logger } from '../config/logger';
import { ogDailyBonusJob } from './ogDailyBonus';
import { throneExpiryJob } from './throneExpiry';
import { festivalActivationJob } from './festivalActivation';
import { cronSecurityService } from '../services/CronSecurityService';

export class CronScheduler {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  start() {
    try {
      // OG Daily Bonus Payout Job (at 00:05 Australia/Sydney)
      const ogBonusTask = cron.schedule('5 0 * * *', async () => {
        await this.executeSecureJob('ogDailyBonus', ogDailyBonusJob);
      }, {
        scheduled: true,
        timezone: 'Australia/Sydney'
      });
      this.jobs.set('ogDailyBonus', ogBonusTask);

      // Throne Expiry Job (every 5 minutes)
      const throneExpiryTask = cron.schedule('*/5 * * * *', async () => {
        await this.executeSecureJob('throneExpiry', throneExpiryJob);
      }, {
        scheduled: true,
        timezone: 'UTC'
      });
      this.jobs.set('throneExpiry', throneExpiryTask);

      // Festival Activation Job (every hour)
      const festivalActivationTask = cron.schedule('0 * * * *', async () => {
        await this.executeSecureJob('festivalActivation', festivalActivationJob);
      }, {
        scheduled: true,
        timezone: 'UTC'
      });
      this.jobs.set('festivalActivation', festivalActivationTask);

      // Stream Ranking Update Job (every 10 minutes)
      const streamRankingTask = cron.schedule('*/10 * * * *', async () => {
        await this.executeSecureJob('streamRanking', () => this.updateStreamRankings());
      }, {
        scheduled: true,
        timezone: 'UTC'
      });
      this.jobs.set('streamRanking', streamRankingTask);

      // User Trust Score Update Job (every 30 minutes)
      const trustScoreTask = cron.schedule('*/30 * * * *', async () => {
        await this.executeSecureJob('trustScore', () => this.updateUserTrustScores());
      }, {
        scheduled: true,
        timezone: 'UTC'
      });
      this.jobs.set('trustScore', trustScoreTask);

      logger.info('All cron jobs started successfully');
    } catch (error) {
      logger.error('Failed to start cron jobs:', error);
      throw error;
    }
  }

  stop() {
    try {
      this.jobs.forEach((job, name) => {
        job.stop();
        logger.info(`Stopped cron job: ${name}`);
      });
      this.jobs.clear();
      logger.info('All cron jobs stopped');
    } catch (error) {
      logger.error('Failed to stop cron jobs:', error);
      throw error;
    }
  }

  private async updateStreamRankings() {
    try {
      const { rankingService } = await import('../services/RankingService');
      await rankingService.calculateAllStreamRankings();
      logger.info('Stream rankings updated successfully');
    } catch (error) {
      logger.error('Failed to update stream rankings:', error);
    }
  }

  private async updateUserTrustScores() {
    try {
      const { reputationService } = await import('../services/ReputationService');
      const { User } = await import('../models/User');
      
      const users = await User.find({ 'trust.score': { $exists: true } });
      for (const user of users) {
        await reputationService.updateUserTrustScore(user._id.toString());
      }
      logger.info(`Updated trust scores for ${users.length} users`);
    } catch (error) {
      logger.error('Failed to update user trust scores:', error);
    }
  }

  /**
   * Execute a job with security controls
   */
  private async executeSecureJob(jobName: string, jobFunction: () => Promise<void>): Promise<void> {
    const executionCheck = await cronSecurityService.canExecuteJob(jobName);
    if (!executionCheck.allowed) {
      logger.warn(`Cron job ${jobName} execution blocked: ${executionCheck.reason}`);
      return;
    }

    const { executionId, config } = await cronSecurityService.startJobExecution(jobName);
    
    try {
      logger.info(`Starting secure cron job execution: ${jobName} (${executionId})`);
      
      // Set execution timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Job execution timeout after ${config.maxExecutionTime}ms`));
        }, config.maxExecutionTime);
      });

      // Execute job with timeout
      await Promise.race([
        jobFunction(),
        timeoutPromise
      ]);

      await cronSecurityService.completeJobExecution(jobName, executionId, true);
      logger.info(`Cron job ${jobName} completed successfully`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await cronSecurityService.completeJobExecution(jobName, executionId, false, errorMessage);
      logger.error(`Cron job ${jobName} failed:`, error);
      
      // Retry logic could be implemented here based on config
      if (config.retryAttempts > 0) {
        logger.info(`Retrying cron job ${jobName} in ${config.retryDelay}ms`);
        setTimeout(() => {
          this.executeSecureJob(jobName, jobFunction);
        }, config.retryDelay);
      }
    }
  }

  getJobStatus() {
    const status = {} as any;
    this.jobs.forEach((job, name) => {
      status[name] = {
        running: (job as any).running,
        nextDate: (job as any).nextDate(),
        lastDate: (job as any).lastDate()
      };
    });
    return status;
  }
}

export const cronScheduler = new CronScheduler();

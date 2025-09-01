import cron from 'node-cron';
import { logger } from '../config/logger';
import { ogDailyBonusJob } from './ogDailyBonus';
import { throneExpiryJob } from './throneExpiry';
import { festivalActivationJob } from './festivalActivation';

export class CronScheduler {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  start() {
    try {
      // OG Daily Bonus Payout Job (at 00:05 Australia/Sydney)
      const ogBonusTask = cron.schedule('5 0 * * *', async () => {
        logger.info('Starting OG daily bonus payout job');
        await ogDailyBonusJob();
      }, {
        scheduled: true,
        timezone: 'Australia/Sydney'
      });
      this.jobs.set('ogDailyBonus', ogBonusTask);

      // Throne Expiry Job (every 5 minutes)
      const throneExpiryTask = cron.schedule('*/5 * * * *', async () => {
        logger.info('Starting throne expiry check job');
        await throneExpiryJob();
      }, {
        scheduled: true,
        timezone: 'Asia/Kathmandu'
      });
      this.jobs.set('throneExpiry', throneExpiryTask);

      // Festival Activation Job (every hour)
      const festivalActivationTask = cron.schedule('0 * * * *', async () => {
        logger.info('Starting festival activation check job');
        await festivalActivationJob();
      }, {
        scheduled: true,
        timezone: 'Asia/Kathmandu'
      });
      this.jobs.set('festivalActivation', festivalActivationTask);

      // Stream Ranking Update Job (every 10 minutes)
      const streamRankingTask = cron.schedule('*/10 * * * *', async () => {
        logger.info('Starting stream ranking update job');
        await this.updateStreamRankings();
      }, {
        scheduled: true,
        timezone: 'Asia/Kathmandu'
      });
      this.jobs.set('streamRanking', streamRankingTask);

      // User Trust Score Update Job (every 30 minutes)
      const trustScoreTask = cron.schedule('*/30 * * * *', async () => {
        logger.info('Starting user trust score update job');
        await this.updateUserTrustScores();
      }, {
        scheduled: true,
        timezone: 'Asia/Kathmandu'
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

  getJobStatus() {
    const status = {} as any;
    this.jobs.forEach((job, name) => {
      status[name] = {
        running: job.running,
        nextDate: job.nextDate(),
        lastDate: job.lastDate()
      };
    });
    return status;
  }
}

export const cronScheduler = new CronScheduler();

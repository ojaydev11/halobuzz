import cron from 'node-cron';
import { globalExpansionService } from '../services/GlobalExpansionService';
import { logger } from '../config/logger';

// Update exchange rates every 6 hours
const exchangeRateUpdateJob = cron.schedule('0 */6 * * *', async () => {
  try {
    logger.info('Starting scheduled exchange rate update');
    await globalExpansionService.updateExchangeRates();
    logger.info('Scheduled exchange rate update completed');
  } catch (error) {
    logger.error('Scheduled exchange rate update failed:', error);
  }
}, {
  scheduled: false,
  timezone: 'UTC'
});

export function startExchangeRateUpdates() {
  exchangeRateUpdateJob.start();
  logger.info('Exchange rate update cron job started');
}

export function stopExchangeRateUpdates() {
  exchangeRateUpdateJob.stop();
  logger.info('Exchange rate update cron job stopped');
}

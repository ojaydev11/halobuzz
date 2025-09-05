import { User } from '../models/User';
import { OGTier } from '../models/OGTier';
import { Transaction } from '../models/Transaction';
import { logger } from '../config/logger';

export async function ogDailyBonusJob() {
  try {
    logger.info('Starting OG daily bonus payout job');

    // Get all active OG users
    const activeOGUsers = await User.find({
      ogLevel: { $gt: 0 },
      ogExpiresAt: { $gt: new Date() }
    });

    logger.info(`Found ${activeOGUsers.length} active OG users`);

    let totalBonusPaid = 0;
    let successCount = 0;
    let errorCount = 0;

    for (const user of activeOGUsers) {
      try {
        // Get OG tier details
        const ogTier = await OGTier.findOne({ tier: user.ogLevel, isActive: true });
        if (!ogTier) {
          logger.warn(`OG tier ${user.ogLevel} not found for user ${user._id}`);
          continue;
        }

        // Compute dailyBonus = floor(priceCoins * 0.6 / durationDays)
        const priceCoins = ogTier.priceCoins;
        const durationDays = ogTier.duration;
        const dailyBonus = Math.floor(priceCoins * 0.6 / durationDays);

        if (dailyBonus <= 0) {
          logger.info(`No daily bonus for OG tier ${user.ogLevel}`);
          continue;
        }

        // Check if user already received bonus today (idempotency per day)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const existingBonus = await Transaction.findOne({
          userId: user._id,
          type: 'og_bonus',
          createdAt: { $gte: today, $lt: tomorrow }
        });

        if (existingBonus) {
          logger.info(`User ${user._id} already received daily bonus today`);
          continue;
        }

        // Credit bonus to user's bonus balance ONLY
        await User.findByIdAndUpdate(user._id, {
          $inc: { 'coins.bonusBalance': dailyBonus }
        });

        // Create transaction record for audit
        const transaction = new Transaction({
          userId: user._id,
          type: 'og_bonus',
          amount: dailyBonus,
          currency: 'coins',
          status: 'completed',
          description: `OG Tier ${user.ogLevel} daily bonus`,
          metadata: {
            ogTier: user.ogLevel,
            bonusType: 'daily'
          },
          netAmount: dailyBonus
        });
        await transaction.save();

        totalBonusPaid += dailyBonus;
        successCount++;

        logger.info(`Daily bonus paid to user ${user._id}: ${dailyBonus} coins (OG Tier ${user.ogLevel})`);

      } catch (error) {
        errorCount++;
        logger.error(`Failed to process daily bonus for user ${user._id}:`, error);
      }
    }

    logger.info(`OG daily bonus job completed: ${successCount} successful, ${errorCount} errors, total paid: ${totalBonusPaid} coins`);

  } catch (error) {
    logger.error('OG daily bonus job failed:', error);
    throw error;
  }
}

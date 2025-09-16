import { User, IUser } from '../models/User';
import { LiveStream } from '../models/LiveStream';
import { Gift } from '../models/Gift';
import { Transaction } from '../models/Transaction';
import { logger } from '../config/logger';
import { emitGift, emitSystem } from '../realtime/emitters';
import crypto from 'crypto';

interface GiftBotConfig {
  enabled: boolean;
  minInterval: number; // seconds
  maxInterval: number;
  minGiftValue: number; // coins
  maxGiftValue: number;
  boostMultiplier: number; // For OG levels
}

interface WhaleInfo {
  userId: string;
  username: string;
  totalSpent: number;
  ogLevel: number;
  isWhale: boolean;
  spendingRank: number;
}

export class OGFeaturesService {
  private static instance: OGFeaturesService;
  private giftBotTimers = new Map<string, NodeJS.Timeout>();
  private stealthEntries = new Set<string>();
  private whaleThreshold = 10000; // coins

  private giftBotConfigs: { [key: number]: GiftBotConfig } = {
    1: { // OG1 - Fresh OG
      enabled: true,
      minInterval: 120,
      maxInterval: 300,
      minGiftValue: 10,
      maxGiftValue: 50,
      boostMultiplier: 1
    },
    2: { // OG2 - Rising OG
      enabled: true,
      minInterval: 90,
      maxInterval: 240,
      minGiftValue: 20,
      maxGiftValue: 100,
      boostMultiplier: 1.5
    },
    3: { // OG3 - Elite OG
      enabled: true,
      minInterval: 60,
      maxInterval: 180,
      minGiftValue: 50,
      maxGiftValue: 200,
      boostMultiplier: 2
    },
    4: { // OG4 - Supreme OG
      enabled: true,
      minInterval: 45,
      maxInterval: 120,
      minGiftValue: 100,
      maxGiftValue: 500,
      boostMultiplier: 3
    },
    5: { // OG5 - Immortal OG
      enabled: true,
      minInterval: 30,
      maxInterval: 90,
      minGiftValue: 200,
      maxGiftValue: 1000,
      boostMultiplier: 5
    }
  };

  private constructor() {
    logger.info('OG Features Service initialized');
  }

  static getInstance(): OGFeaturesService {
    if (!OGFeaturesService.instance) {
      OGFeaturesService.instance = new OGFeaturesService();
    }
    return OGFeaturesService.instance;
  }

  /**
   * Start Gift Bot for OG users
   */
  async startGiftBot(userId: string, streamId: string): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user || user.ogLevel < 1) {
        throw new Error('Gift bot requires OG membership');
      }

      const stream = await LiveStream.findById(streamId);
      if (!stream || stream.status !== 'live') {
        throw new Error('Stream is not active');
      }

      const config = this.giftBotConfigs[user.ogLevel];
      if (!config || !config.enabled) {
        throw new Error('Gift bot not available for this OG level');
      }

      // Clear existing timer if any
      this.stopGiftBot(streamId);

      // Schedule gift bot
      const scheduleNextGift = async () => {
        try {
          // Random interval between min and max
          const interval = config.minInterval + Math.random() * (config.maxInterval - config.minInterval);
          
          this.giftBotTimers.set(streamId, setTimeout(async () => {
            // Send automated gift
            const giftValue = Math.floor(
              config.minGiftValue + Math.random() * (config.maxGiftValue - config.minGiftValue)
            );
            
            // Get random gift within value range
            const availableGifts = await Gift.find({
              isActive: true,
              priceCoins: { $gte: giftValue * 0.8, $lte: giftValue * 1.2 }
            });

            if (availableGifts.length > 0) {
              const randomGift = availableGifts[Math.floor(Math.random() * availableGifts.length)];
              
              // Create bot gift transaction
              const transaction = new Transaction({
                userId,
                type: 'gift_sent',
                amount: randomGift.priceCoins,
                description: `Gift Bot: ${randomGift.name}`,
                metadata: {
                  giftId: randomGift._id,
                  streamId,
                  isBot: true,
                  ogLevel: user.ogLevel
                }
              });
              await transaction.save();

              // Emit gift event
              emitGift('gift_sent', {
                streamId,
                gift: {
                  id: randomGift._id,
                  name: randomGift.name,
                  icon: randomGift.icon,
                  animation: randomGift.animation,
                  value: randomGift.priceCoins
                },
                sender: {
                  id: userId,
                  username: `${user.username} (Bot)`,
                  ogLevel: user.ogLevel,
                  isBot: true
                }
              });

              logger.info(`Gift bot sent gift: ${randomGift.name} to stream ${streamId}`);
            }

            // Schedule next gift
            scheduleNextGift();
          }, interval * 1000));
        } catch (error) {
          logger.error('Gift bot error:', error);
          this.stopGiftBot(streamId);
        }
      };

      // Start the gift bot
      scheduleNextGift();
      
      logger.info(`Gift bot started for stream ${streamId} with OG level ${user.ogLevel}`);
    } catch (error) {
      logger.error('Failed to start gift bot:', error);
      throw error;
    }
  }

  /**
   * Stop Gift Bot
   */
  stopGiftBot(streamId: string): void {
    const timer = this.giftBotTimers.get(streamId);
    if (timer) {
      clearTimeout(timer);
      this.giftBotTimers.delete(streamId);
      logger.info(`Gift bot stopped for stream ${streamId}`);
    }
  }

  /**
   * Enable Stealth Entry for OG users
   */
  async enableStealthEntry(userId: string, streamId: string): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      if (!user || user.ogLevel < 2) {
        throw new Error('Stealth entry requires OG2 or higher');
      }

      const key = `${userId}:${streamId}`;
      this.stealthEntries.add(key);

      // Don't emit join notification for stealth entry
      logger.info(`Stealth entry enabled for user ${userId} in stream ${streamId}`);
      return true;
    } catch (error) {
      logger.error('Failed to enable stealth entry:', error);
      throw error;
    }
  }

  /**
   * Check if user has stealth entry
   */
  hasStealthEntry(userId: string, streamId: string): boolean {
    const key = `${userId}:${streamId}`;
    return this.stealthEntries.has(key);
  }

  /**
   * Whale Radar - Detect high-value users entering stream
   */
  async detectWhale(userId: string, streamId: string): Promise<WhaleInfo | null> {
    try {
      const user = await User.findById(userId);
      if (!user) return null;

      // Get user's spending history
      const totalSpent = await Transaction.aggregate([
        {
          $match: {
            userId: user._id,
            type: { $in: ['gift_sent', 'subscription', 'throne_purchase'] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      const spentAmount = totalSpent[0]?.total || 0;
      const isWhale = spentAmount >= this.whaleThreshold;

      // Get spending rank
      const rankResult = await User.aggregate([
        {
          $lookup: {
            from: 'transactions',
            localField: '_id',
            foreignField: 'userId',
            as: 'transactions'
          }
        },
        {
          $project: {
            userId: '$_id',
            totalSpent: {
              $sum: {
                $filter: {
                  input: '$transactions',
                  cond: { $in: ['$$this.type', ['gift_sent', 'subscription', 'throne_purchase']] }
                }
              }
            }
          }
        },
        { $sort: { totalSpent: -1 } },
        { $group: { _id: null, users: { $push: '$userId' } } }
      ]);

      const rank = rankResult[0]?.users.indexOf(user._id) + 1 || 0;

      const whaleInfo: WhaleInfo = {
        userId: user._id.toString(),
        username: user.username,
        totalSpent: spentAmount,
        ogLevel: user.ogLevel,
        isWhale,
        spendingRank: rank
      };

      // Notify stream host if whale detected (only for OG3+ hosts)
      if (isWhale) {
        const stream = await LiveStream.findById(streamId).populate('hostId');
        if (stream && (stream.hostId as any).ogLevel >= 3) {
          emitSystem('whale_detected', {
            streamId,
            whale: {
              username: user.username,
              ogLevel: user.ogLevel,
              rank
            }
          });
        }
      }

      return whaleInfo;
    } catch (error) {
      logger.error('Whale detection failed:', error);
      return null;
    }
  }

  /**
   * Ghost Mode - Make user invisible in viewer list
   */
  async enableGhostMode(userId: string, streamId: string): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      if (!user || user.ogLevel < 4) {
        throw new Error('Ghost mode requires OG4 or higher');
      }

      // Add to ghost viewers list (not shown in public viewer list)
      const stream = await LiveStream.findById(streamId);
      if (!stream) {
        throw new Error('Stream not found');
      }

      // Store ghost viewers separately
      if (!stream.ghostViewers) {
        stream.ghostViewers = [];
      }
      
      if (!stream.ghostViewers.includes(userId)) {
        stream.ghostViewers.push(userId);
        await stream.save();
      }

      logger.info(`Ghost mode enabled for user ${userId} in stream ${streamId}`);
      return true;
    } catch (error) {
      logger.error('Failed to enable ghost mode:', error);
      throw error;
    }
  }

  /**
   * AI Sidekick - Automated engagement assistant for OG5
   */
  async activateAISidekick(userId: string, streamId: string): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user || user.ogLevel < 5) {
        throw new Error('AI Sidekick requires OG5 membership');
      }

      // AI features for engagement
      const features = {
        autoGreeting: true,
        smartResponses: true,
        giftSuggestions: true,
        moodAnalysis: true,
        trendingAlerts: true
      };

      // Store AI sidekick configuration
      await User.findByIdAndUpdate(userId, {
        'ogFeatures.aiSidekick': {
          enabled: true,
          streamId,
          features,
          activatedAt: new Date()
        }
      });

      // Start AI monitoring
      emitSystem('ai_sidekick_activated', {
        userId,
        streamId,
        features
      });

      logger.info(`AI Sidekick activated for user ${userId} in stream ${streamId}`);
    } catch (error) {
      logger.error('Failed to activate AI Sidekick:', error);
      throw error;
    }
  }

  /**
   * Get OG benefits for a user
   */
  async getOGBenefits(userId: string): Promise<any> {
    try {
      const user = await User.findById(userId);
      if (!user || user.ogLevel < 1) {
        return null;
      }

      const benefits = {
        level: user.ogLevel,
        features: {
          giftBot: user.ogLevel >= 1,
          stealthEntry: user.ogLevel >= 2,
          whaleRadar: user.ogLevel >= 3,
          ghostMode: user.ogLevel >= 4,
          aiSidekick: user.ogLevel >= 5,
          dailyBonus: this.calculateDailyBonus(user.ogLevel),
          prioritySupport: user.ogLevel >= 2,
          exclusiveGifts: user.ogLevel >= 3,
          customBadge: user.ogLevel >= 1,
          advancedAnalytics: user.ogLevel >= 4,
          betaFeatures: user.ogLevel >= 5
        },
        expiresAt: user.ogExpiresAt
      };

      return benefits;
    } catch (error) {
      logger.error('Failed to get OG benefits:', error);
      throw error;
    }
  }

  /**
   * Calculate daily bonus based on OG level
   */
  private calculateDailyBonus(ogLevel: number): number {
    const bonuses = {
      1: 50,   // 50 coins daily
      2: 100,  // 100 coins daily
      3: 200,  // 200 coins daily
      4: 500,  // 500 coins daily
      5: 1000  // 1000 coins daily
    };
    return bonuses[ogLevel] || 0;
  }

  /**
   * Claim daily OG bonus
   */
  async claimDailyBonus(userId: string): Promise<number> {
    try {
      const user = await User.findById(userId);
      if (!user || user.ogLevel < 1) {
        throw new Error('OG membership required for daily bonus');
      }

      // Check if already claimed today
      const lastClaim = user.ogFeatures?.lastDailyBonus;
      if (lastClaim) {
        const now = new Date();
        const lastClaimDate = new Date(lastClaim);
        if (
          lastClaimDate.getDate() === now.getDate() &&
          lastClaimDate.getMonth() === now.getMonth() &&
          lastClaimDate.getFullYear() === now.getFullYear()
        ) {
          throw new Error('Daily bonus already claimed today');
        }
      }

      const bonusAmount = this.calculateDailyBonus(user.ogLevel);

      // Add bonus coins
      user.coins.bonusBalance += bonusAmount;
      user.ogFeatures = {
        ...user.ogFeatures,
        lastDailyBonus: new Date()
      };
      await user.save();

      // Create transaction record
      const transaction = new Transaction({
        userId,
        type: 'daily_bonus',
        amount: bonusAmount,
        description: `OG${user.ogLevel} Daily Bonus`,
        metadata: {
          ogLevel: user.ogLevel,
          bonusType: 'daily'
        }
      });
      await transaction.save();

      logger.info(`Daily bonus claimed: ${bonusAmount} coins for user ${userId}`);
      return bonusAmount;
    } catch (error) {
      logger.error('Failed to claim daily bonus:', error);
      throw error;
    }
  }
}

export const ogFeaturesService = OGFeaturesService.getInstance();
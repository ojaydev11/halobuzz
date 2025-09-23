import { logger } from '../../config/logger';
import { AnalyticsDailyKPI } from '../models/AnalyticsDailyKPI';
import { AnalyticsFunnel } from '../models/AnalyticsFunnel';
import { AnalyticsHostPerformance } from '../models/AnalyticsHostPerformance';
import { User } from '../../models/User';
import { LiveStream } from '../../models/LiveStream';
import { Transaction } from '../../models/Transaction';
import { Gift } from '../../models/Gift';
import { GameStake } from '../../models/GameStake';
import { Message } from '../../models/Message';
import { ModerationFlag } from '../../models/ModerationFlag';
import { appMapper } from '../services/appMapper';
import mongoose from 'mongoose';

export interface DailyRollupOptions {
  targetDate?: Date;
  country?: string;
  forceRebuild?: boolean;
  appId?: string;
}

export class DailyRollupETL {
  private targetDate: Date;
  private country: string;
  private forceRebuild: boolean;
  private appId: string;

  constructor(options: DailyRollupOptions = {}) {
    this.targetDate = options.targetDate || this.getYesterday();
    this.country = options.country || 'ALL';
    this.forceRebuild = options.forceRebuild || false;
    this.appId = options.appId || appMapper.mapToAppId();
  }

  private getYesterday(): Date {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    return yesterday;
  }

  private getDateRange(): { start: Date; end: Date } {
    const start = new Date(this.targetDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(this.targetDate);
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
  }

  async execute(): Promise<void> {
    try {
      logger.info('Starting daily rollup ETL', { 
        targetDate: this.targetDate, 
        country: this.country 
      });

      const { start, end } = this.getDateRange();

      // Check if data already exists (unless force rebuild)
      if (!this.forceRebuild) {
        const existingKPI = await AnalyticsDailyKPI.findOne({
          appId: this.appId,
          date: start,
          country: this.country
        });

        if (existingKPI) {
          logger.info('Daily KPI already exists, skipping', { 
            appId: this.appId,
            date: start, 
            country: this.country 
          });
          return;
        }
      }

      // Execute rollups in parallel
      await Promise.all([
        this.rollupDailyKPIs(start, end),
        this.rollupFunnels(start, end),
        this.rollupHostPerformance(start, end)
      ]);

      logger.info('Daily rollup ETL completed successfully', { 
        targetDate: this.targetDate, 
        country: this.country 
      });

    } catch (error) {
      logger.error('Daily rollup ETL failed:', error);
      throw error;
    }
  }

  private async rollupDailyKPIs(start: Date, end: Date): Promise<void> {
    logger.info('Rolling up daily KPIs', { start, end, country: this.country });

    // Revenue KPIs
    const revenueKPIs = await this.calculateRevenueKPIs(start, end);
    
    // Engagement KPIs
    const engagementKPIs = await this.calculateEngagementKPIs(start, end);
    
    // Monetization KPIs
    const monetizationKPIs = await this.calculateMonetizationKPIs(start, end);
    
    // Creator KPIs
    const creatorKPIs = await this.calculateCreatorKPIs(start, end);
    
    // Safety KPIs
    const safetyKPIs = await this.calculateSafetyKPIs(start, end);
    
    // Gaming KPIs
    const gamingKPIs = await this.calculateGamingKPIs(start, end);

    // Create or update daily KPI record
    const dailyKPI = {
      appId: this.appId,
      date: start,
      country: this.country,
      revenue: revenueKPIs,
      engagement: engagementKPIs,
      monetization: monetizationKPIs,
      creators: creatorKPIs,
      safety: safetyKPIs,
      gaming: gamingKPIs
    };

    await AnalyticsDailyKPI.findOneAndUpdate(
      { appId: this.appId, date: start, country: this.country },
      dailyKPI,
      { upsert: true, new: true }
    );

    logger.info('Daily KPIs rolled up successfully', { 
      date: start, 
      country: this.country 
    });
  }

  private async calculateRevenueKPIs(start: Date, end: Date): Promise<any> {
    const matchCondition = this.country === 'ALL' 
      ? { createdAt: { $gte: start, $lte: end }, status: 'completed' }
      : { createdAt: { $gte: start, $lte: end }, status: 'completed', 'metadata.country': this.country };

    const revenueData = await Transaction.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          total: { $sum: '$netAmount' },
          byPaymentMethod: {
            $push: {
              method: '$paymentMethod',
              amount: '$netAmount'
            }
          },
          byType: {
            $push: {
              type: '$type',
              amount: '$netAmount'
            }
          }
        }
      }
    ]);

    const result = revenueData[0] || { total: 0, byPaymentMethod: [], byType: [] };

    // Calculate payment method breakdown
    const paymentMethodBreakdown = {
      esewa: 0,
      khalti: 0,
      stripe: 0,
      paypal: 0
    };

    result.byPaymentMethod.forEach((item: any) => {
      if (paymentMethodBreakdown.hasOwnProperty(item.method)) {
        paymentMethodBreakdown[item.method] += item.amount;
      }
    });

    // Calculate OG tier breakdown
    const ogTierBreakdown = {
      tier1: 0,
      tier2: 0,
      tier3: 0,
      tier4: 0,
      tier5: 0
    };

    result.byType.forEach((item: any) => {
      if (item.type === 'subscription' && item.metadata?.ogTier) {
        const tier = `tier${item.metadata.ogTier}`;
        if (ogTierBreakdown.hasOwnProperty(tier)) {
          ogTierBreakdown[tier] += item.amount;
        }
      }
    });

    return {
      total: result.total,
      byPaymentMethod: paymentMethodBreakdown,
      byOGTier: ogTierBreakdown,
      giftRevenue: result.byType
        .filter((item: any) => item.type === 'gift_sent')
        .reduce((sum: number, item: any) => sum + item.amount, 0),
      coinTopups: result.byType
        .filter((item: any) => item.type === 'recharge')
        .reduce((sum: number, item: any) => sum + item.amount, 0),
      platformFees: result.byType
        .filter((item: any) => item.type === 'platform_fee')
        .reduce((sum: number, item: any) => sum + item.amount, 0)
    };
  }

  private async calculateEngagementKPIs(start: Date, end: Date): Promise<any> {
    // DAU calculation
    const dauMatch = this.country === 'ALL' 
      ? { lastActiveAt: { $gte: start, $lte: end } }
      : { lastActiveAt: { $gte: start, $lte: end }, country: this.country };

    const dau = await User.countDocuments(dauMatch);

    // Stream metrics
    const streamMatch = this.country === 'ALL'
      ? { createdAt: { $gte: start, $lte: end }, status: 'ended' }
      : { createdAt: { $gte: start, $lte: end }, status: 'ended', country: this.country };

    const streamData = await LiveStream.aggregate([
      { $match: streamMatch },
      {
        $group: {
          _id: null,
          totalStreams: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          totalViewers: { $sum: '$totalViewers' },
          avgViewers: { $avg: '$totalViewers' }
        }
      }
    ]);

    const streamMetrics = streamData[0] || {
      totalStreams: 0,
      totalDuration: 0,
      totalViewers: 0,
      avgViewers: 0
    };

    // Gift and message counts
    const giftCount = await Gift.aggregate([
      { $match: { 'stats.totalSent': { $gte: 1 } } },
      { $group: { _id: null, totalSent: { $sum: '$stats.totalSent' } } }
    ]);

    const messageCount = await Message.countDocuments({
      createdAt: { $gte: start, $lte: end },
      isDeleted: false
    });

    return {
      dau,
      mau: 0, // Will be calculated separately for monthly data
      avgSessionDuration: streamMetrics.totalDuration / Math.max(streamMetrics.totalStreams, 1) / 60, // Convert to minutes
      avgViewersPerStream: streamMetrics.avgViewers,
      totalStreams: streamMetrics.totalStreams,
      totalStreamDuration: streamMetrics.totalDuration / 60, // Convert to minutes
      battleParticipation: 0, // TODO: Implement battle participation tracking
      giftSent: giftCount[0]?.totalSent || 0,
      messagesSent: messageCount
    };
  }

  private async calculateMonetizationKPIs(start: Date, end: Date): Promise<any> {
    // Get total users and paying users
    const totalUsers = await User.countDocuments({
      createdAt: { $lte: end },
      ...(this.country !== 'ALL' && { country: this.country })
    });

    const payingUsers = await User.countDocuments({
      createdAt: { $lte: end },
      totalCoinsSpent: { $gt: 0 },
      ...(this.country !== 'ALL' && { country: this.country })
    });

    // Get revenue data
    const revenueMatch = this.country === 'ALL'
      ? { createdAt: { $gte: start, $lte: end }, status: 'completed' }
      : { createdAt: { $gte: start, $lte: end }, status: 'completed', 'metadata.country': this.country };

    const revenueData = await Transaction.aggregate([
      { $match: revenueMatch },
      { $group: { _id: null, totalRevenue: { $sum: '$netAmount' } } }
    ]);

    const totalRevenue = revenueData[0]?.totalRevenue || 0;

    // Gift metrics
    const giftData = await Gift.aggregate([
      { $match: { 'stats.totalSent': { $gte: 1 } } },
      {
        $group: {
          _id: null,
          totalGifts: { $sum: '$stats.totalSent' },
          totalCoins: { $sum: '$stats.totalCoins' }
        }
      }
    ]);

    const giftMetrics = giftData[0] || { totalGifts: 0, totalCoins: 0 };

    return {
      arpu: totalUsers > 0 ? totalRevenue / totalUsers : 0,
      arppu: payingUsers > 0 ? totalRevenue / payingUsers : 0,
      payerRate: totalUsers > 0 ? (payingUsers / totalUsers) * 100 : 0,
      avgGiftValue: giftMetrics.totalGifts > 0 ? giftMetrics.totalCoins / giftMetrics.totalGifts : 0,
      coinTopupVolume: totalRevenue,
      ogConversionRate: 0 // TODO: Calculate OG conversion rate
    };
  }

  private async calculateCreatorKPIs(start: Date, end: Date): Promise<any> {
    // Active hosts (users who streamed in the period)
    const activeHosts = await LiveStream.distinct('hostId', {
      createdAt: { $gte: start, $lte: end },
      ...(this.country !== 'ALL' && { country: this.country })
    });

    // Host revenue
    const hostRevenueData = await LiveStream.aggregate([
      { 
        $match: { 
          createdAt: { $gte: start, $lte: end },
          ...(this.country !== 'ALL' && { country: this.country })
        } 
      },
      {
        $group: {
          _id: '$hostId',
          revenue: { $sum: '$totalCoins' }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$revenue' },
          avgRevenue: { $avg: '$revenue' },
          maxRevenue: { $max: '$revenue' }
        }
      }
    ]);

    const revenueMetrics = hostRevenueData[0] || {
      totalRevenue: 0,
      avgRevenue: 0,
      maxRevenue: 0
    };

    return {
      activeHosts: activeHosts.length,
      topHostRevenue: revenueMetrics.maxRevenue,
      avgHostRevenue: revenueMetrics.avgRevenue,
      newHosts: 0, // TODO: Calculate new hosts
      hostRetentionRate: 0 // TODO: Calculate host retention
    };
  }

  private async calculateSafetyKPIs(start: Date, end: Date): Promise<any> {
    // Flagged content
    const flaggedContent = await ModerationFlag.countDocuments({
      createdAt: { $gte: start, $lte: end },
      ...(this.country !== 'ALL' && { 'metadata.country': this.country })
    });

    // Banned users
    const bannedUsers = await User.countDocuments({
      isBanned: true,
      banExpiresAt: { $gte: start, $lte: end },
      ...(this.country !== 'ALL' && { country: this.country })
    });

    return {
      flaggedContent,
      bannedUsers,
      appealsProcessed: 0, // TODO: Implement appeals tracking
      moderationActions: flaggedContent + bannedUsers,
      safetyScore: Math.max(0, 100 - (flaggedContent * 2) - (bannedUsers * 5)) // Simple safety score
    };
  }

  private async calculateGamingKPIs(start: Date, end: Date): Promise<any> {
    const gameMatch = this.country === 'ALL'
      ? { createdAt: { $gte: start, $lte: end } }
      : { createdAt: { $gte: start, $lte: end }, 'metadata.country': this.country };

    const gameData = await GameStake.aggregate([
      { $match: gameMatch },
      {
        $group: {
          _id: null,
          gamesPlayed: { $sum: 1 },
          totalStakes: { $sum: '$stakeAmount' },
          totalPayouts: { $sum: '$winAmount' },
          uniquePlayers: { $addToSet: '$userId' }
        }
      }
    ]);

    const metrics = gameData[0] || {
      gamesPlayed: 0,
      totalStakes: 0,
      totalPayouts: 0,
      uniquePlayers: []
    };

    const houseEdge = metrics.totalStakes > 0 
      ? ((metrics.totalStakes - metrics.totalPayouts) / metrics.totalStakes) * 100 
      : 40; // Default house edge

    return {
      gamesPlayed: metrics.gamesPlayed,
      totalStakes: metrics.totalStakes,
      totalPayouts: metrics.totalPayouts,
      houseEdge,
      avgGameDuration: 0, // TODO: Calculate from GameRound data
      activePlayers: metrics.uniquePlayers.length
    };
  }

  private async rollupFunnels(start: Date, end: Date): Promise<void> {
    logger.info('Rolling up funnel metrics', { start, end, country: this.country });

    // Calculate funnel metrics
    const funnelData = await this.calculateFunnelMetrics(start, end);

    await AnalyticsFunnel.findOneAndUpdate(
      { date: start, country: this.country },
      funnelData,
      { upsert: true, new: true }
    );

    logger.info('Funnel metrics rolled up successfully', { 
      date: start, 
      country: this.country 
    });
  }

  private async calculateFunnelMetrics(start: Date, end: Date): Promise<any> {
    // Signup to first live funnel
    const totalSignups = await User.countDocuments({
      createdAt: { $gte: start, $lte: end },
      ...(this.country !== 'ALL' && { country: this.country })
    });

    const firstLiveAttempts = await LiveStream.countDocuments({
      createdAt: { $gte: start, $lte: end },
      ...(this.country !== 'ALL' && { country: this.country })
    });

    const firstLiveSuccess = await LiveStream.countDocuments({
      createdAt: { $gte: start, $lte: end },
      status: 'ended',
      ...(this.country !== 'ALL' && { country: this.country })
    });

    return {
      date: start,
      country: this.country,
      signupToFirstLive: {
        totalSignups,
        firstLiveAttempts,
        firstLiveSuccess,
        conversionRate: totalSignups > 0 ? (firstLiveSuccess / totalSignups) * 100 : 0,
        avgDaysToFirstLive: 0 // TODO: Calculate average days
      },
      signupToFirstGift: {
        totalSignups,
        firstGiftSent: 0, // TODO: Calculate first gift sent
        conversionRate: 0,
        avgDaysToFirstGift: 0
      },
      signupToFirstPayment: {
        totalSignups,
        firstPayment: 0, // TODO: Calculate first payment
        conversionRate: 0,
        avgDaysToFirstPayment: 0
      },
      streamEngagement: {
        streamsStarted: firstLiveAttempts,
        streamsWithViewers: 0, // TODO: Calculate streams with viewers
        streamsWithGifts: 0, // TODO: Calculate streams with gifts
        streamsWithComments: 0, // TODO: Calculate streams with comments
        viewerToGiftRate: 0,
        viewerToCommentRate: 0
      },
      ogConversion: {
        totalUsers: totalSignups,
        ogTier1Purchases: 0, // TODO: Calculate OG tier purchases
        ogTier2Purchases: 0,
        ogTier3Purchases: 0,
        ogTier4Purchases: 0,
        ogTier5Purchases: 0,
        totalOGPurchases: 0,
        conversionRate: 0
      },
      gamingConversion: {
        totalUsers: totalSignups,
        gamesViewed: 0, // TODO: Calculate games viewed
        gamesPlayed: 0, // TODO: Calculate games played
        gamesWithStakes: 0, // TODO: Calculate games with stakes
        conversionRate: 0,
        avgStakeAmount: 0
      }
    };
  }

  private async rollupHostPerformance(start: Date, end: Date): Promise<void> {
    logger.info('Rolling up host performance', { start, end, country: this.country });

    // Get all hosts who streamed in the period
    const hosts = await LiveStream.distinct('hostId', {
      createdAt: { $gte: start, $lte: end },
      ...(this.country !== 'ALL' && { country: this.country })
    });

    // Calculate performance for each host
    for (const hostId of hosts) {
      await this.calculateHostPerformance(hostId, start, end);
    }

    logger.info('Host performance rolled up successfully', { 
      date: start, 
      country: this.country,
      hostsCount: hosts.length 
    });
  }

  private async calculateHostPerformance(hostId: mongoose.Types.ObjectId, start: Date, end: Date): Promise<void> {
    const hostStreams = await LiveStream.find({
      hostId,
      createdAt: { $gte: start, $lte: end },
      ...(this.country !== 'ALL' && { country: this.country })
    });

    if (hostStreams.length === 0) return;

    // Calculate aggregated metrics
    const totalStreams = hostStreams.length;
    const totalDuration = hostStreams.reduce((sum, stream) => sum + stream.duration, 0);
    const totalViewers = hostStreams.reduce((sum, stream) => sum + stream.totalViewers, 0);
    const totalGifts = hostStreams.reduce((sum, stream) => sum + stream.totalGifts, 0);
    const totalCoins = hostStreams.reduce((sum, stream) => sum + stream.totalCoins, 0);
    const totalLikes = hostStreams.reduce((sum, stream) => sum + stream.totalLikes, 0);
    const totalComments = hostStreams.reduce((sum, stream) => sum + stream.totalComments, 0);

    const performanceData = {
      hostId,
      date: start,
      country: this.country,
      streams: {
        totalStreams,
        totalDuration: totalDuration / 60, // Convert to minutes
        avgDuration: totalDuration / totalStreams / 60,
        totalViewers,
        avgViewers: totalViewers / totalStreams,
        peakViewers: Math.max(...hostStreams.map(s => s.peakViewers)),
        uniqueViewers: totalViewers // Simplified - would need more complex logic for unique viewers
      },
      engagement: {
        totalLikes,
        totalComments,
        totalShares: hostStreams.reduce((sum, stream) => sum + stream.totalShares, 0),
        totalGifts,
        totalGiftCoins: totalCoins,
        engagementRate: totalViewers > 0 ? ((totalLikes + totalComments + totalGifts) / totalViewers) * 100 : 0,
        viewerRetention: 0, // TODO: Calculate viewer retention
        giftConversionRate: totalViewers > 0 ? (totalGifts / totalViewers) * 100 : 0
      },
      revenue: {
        totalRevenue: totalCoins,
        avgRevenuePerStream: totalCoins / totalStreams,
        topStreamRevenue: Math.max(...hostStreams.map(s => s.totalCoins)),
        revenueGrowth: 0, // TODO: Calculate growth vs previous period
        giftRevenue: totalCoins,
        ogRevenue: 0 // TODO: Calculate OG revenue
      },
      audience: {
        topCountries: [], // TODO: Calculate audience demographics
        ageGroups: [],
        genderDistribution: [],
        returningViewers: 0,
        newViewers: totalViewers
      },
      rankings: {
        revenueRank: 0, // TODO: Calculate rankings
        viewersRank: 0,
        engagementRank: 0,
        overallRank: 0,
        categoryRank: 0
      },
      growth: {
        followerGrowth: 0, // TODO: Calculate growth metrics
        viewerGrowth: 0,
        revenueGrowth: 0,
        engagementGrowth: 0,
        streamFrequencyGrowth: 0
      }
    };

    await AnalyticsHostPerformance.findOneAndUpdate(
      { hostId, date: start, country: this.country },
      performanceData,
      { upsert: true, new: true }
    );
  }
}

export default DailyRollupETL;

import { logger } from '../../config/logger';
import { AnalyticsDailyKPI } from '../models/AnalyticsDailyKPI';
import { AnalyticsFunnel } from '../models/AnalyticsFunnel';
import { AnalyticsCohort } from '../models/AnalyticsCohort';
import { AnalyticsHostPerformance } from '../models/AnalyticsHostPerformance';
import { AnalyticsForecast } from '../models/AnalyticsForecast';

export interface KPIFilter {
  from: Date;
  to: Date;
  country?: string;
  granularity?: 'daily' | 'weekly' | 'monthly';
}

export interface KPIMetrics {
  revenue: RevenueKPIs;
  engagement: EngagementKPIs;
  monetization: MonetizationKPIs;
  retention: RetentionKPIs;
  creators: CreatorKPIs;
  safety: SafetyKPIs;
  gaming: GamingKPIs;
}

export interface RevenueKPIs {
  total: number;
  byPaymentMethod: {
    esewa: number;
    khalti: number;
    stripe: number;
    paypal: number;
  };
  byOGTier: {
    tier1: number;
    tier2: number;
    tier3: number;
    tier4: number;
    tier5: number;
  };
  giftRevenue: number;
  coinTopups: number;
  platformFees: number;
  growth: number; // percentage vs previous period
}

export interface EngagementKPIs {
  dau: number;
  mau: number;
  avgSessionDuration: number;
  avgViewersPerStream: number;
  totalStreams: number;
  totalStreamDuration: number;
  battleParticipation: number;
  giftSent: number;
  messagesSent: number;
  growth: number; // percentage vs previous period
}

export interface MonetizationKPIs {
  arpu: number;
  arppu: number;
  payerRate: number;
  avgGiftValue: number;
  coinTopupVolume: number;
  ogConversionRate: number;
  growth: number; // percentage vs previous period
}

export interface RetentionKPIs {
  d1Retention: number;
  d7Retention: number;
  d30Retention: number;
  churnRate: number;
  avgLifetimeDays: number;
  churnRiskScore: number;
}

export interface CreatorKPIs {
  activeHosts: number;
  topHostRevenue: number;
  avgHostRevenue: number;
  newHosts: number;
  hostRetentionRate: number;
  topCreators: Array<{
    hostId: string;
    username: string;
    revenue: number;
    streams: number;
    viewers: number;
  }>;
}

export interface SafetyKPIs {
  flaggedContent: number;
  bannedUsers: number;
  appealsProcessed: number;
  moderationActions: number;
  safetyScore: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface GamingKPIs {
  gamesPlayed: number;
  totalStakes: number;
  totalPayouts: number;
  houseEdge: number;
  avgGameDuration: number;
  activePlayers: number;
  revenue: number;
}

export class KPIService {
  /**
   * Get comprehensive KPI metrics for a date range
   */
  async getKPIs(filter: KPIFilter): Promise<KPIMetrics> {
    try {
      logger.info('Fetching KPIs', filter);

      const [
        revenue,
        engagement,
        monetization,
        retention,
        creators,
        safety,
        gaming
      ] = await Promise.all([
        this.getRevenueKPIs(filter),
        this.getEngagementKPIs(filter),
        this.getMonetizationKPIs(filter),
        this.getRetentionKPIs(filter),
        this.getCreatorKPIs(filter),
        this.getSafetyKPIs(filter),
        this.getGamingKPIs(filter)
      ]);

      return {
        revenue,
        engagement,
        monetization,
        retention,
        creators,
        safety,
        gaming
      };

    } catch (error) {
      logger.error('Failed to fetch KPIs:', error);
      throw error;
    }
  }

  /**
   * Get revenue KPIs
   */
  async getRevenueKPIs(filter: KPIFilter): Promise<RevenueKPIs> {
    const matchCondition = this.buildMatchCondition(filter);
    
    const revenueData = await AnalyticsDailyKPI.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          total: { $sum: '$revenue.total' },
          byPaymentMethod: {
            esewa: { $sum: '$revenue.byPaymentMethod.esewa' },
            khalti: { $sum: '$revenue.byPaymentMethod.khalti' },
            stripe: { $sum: '$revenue.byPaymentMethod.stripe' },
            paypal: { $sum: '$revenue.byPaymentMethod.paypal' }
          },
          byOGTier: {
            tier1: { $sum: '$revenue.byOGTier.tier1' },
            tier2: { $sum: '$revenue.byOGTier.tier2' },
            tier3: { $sum: '$revenue.byOGTier.tier3' },
            tier4: { $sum: '$revenue.byOGTier.tier4' },
            tier5: { $sum: '$revenue.byOGTier.tier5' }
          },
          giftRevenue: { $sum: '$revenue.giftRevenue' },
          coinTopups: { $sum: '$revenue.coinTopups' },
          platformFees: { $sum: '$revenue.platformFees' }
        }
      }
    ]);

    const result = revenueData[0] || {
      total: 0,
      byPaymentMethod: { esewa: 0, khalti: 0, stripe: 0, paypal: 0 },
      byOGTier: { tier1: 0, tier2: 0, tier3: 0, tier4: 0, tier5: 0 },
      giftRevenue: 0,
      coinTopups: 0,
      platformFees: 0
    };

    // Calculate growth vs previous period
    const growth = await this.calculateGrowth('revenue.total', filter);

    return {
      total: result.total,
      byPaymentMethod: result.byPaymentMethod,
      byOGTier: result.byOGTier,
      giftRevenue: result.giftRevenue,
      coinTopups: result.coinTopups,
      platformFees: result.platformFees,
      growth
    };
  }

  /**
   * Get engagement KPIs
   */
  async getEngagementKPIs(filter: KPIFilter): Promise<EngagementKPIs> {
    const matchCondition = this.buildMatchCondition(filter);
    
    const engagementData = await AnalyticsDailyKPI.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          dau: { $avg: '$engagement.dau' },
          mau: { $avg: '$engagement.mau' },
          avgSessionDuration: { $avg: '$engagement.avgSessionDuration' },
          avgViewersPerStream: { $avg: '$engagement.avgViewersPerStream' },
          totalStreams: { $sum: '$engagement.totalStreams' },
          totalStreamDuration: { $sum: '$engagement.totalStreamDuration' },
          battleParticipation: { $sum: '$engagement.battleParticipation' },
          giftSent: { $sum: '$engagement.giftSent' },
          messagesSent: { $sum: '$engagement.messagesSent' }
        }
      }
    ]);

    const result = engagementData[0] || {
      dau: 0,
      mau: 0,
      avgSessionDuration: 0,
      avgViewersPerStream: 0,
      totalStreams: 0,
      totalStreamDuration: 0,
      battleParticipation: 0,
      giftSent: 0,
      messagesSent: 0
    };

    // Calculate growth vs previous period
    const growth = await this.calculateGrowth('engagement.dau', filter);

    return {
      dau: Math.round(result.dau),
      mau: Math.round(result.mau),
      avgSessionDuration: Math.round(result.avgSessionDuration * 100) / 100,
      avgViewersPerStream: Math.round(result.avgViewersPerStream * 100) / 100,
      totalStreams: result.totalStreams,
      totalStreamDuration: result.totalStreamDuration,
      battleParticipation: result.battleParticipation,
      giftSent: result.giftSent,
      messagesSent: result.messagesSent,
      growth
    };
  }

  /**
   * Get monetization KPIs
   */
  async getMonetizationKPIs(filter: KPIFilter): Promise<MonetizationKPIs> {
    const matchCondition = this.buildMatchCondition(filter);
    
    const monetizationData = await AnalyticsDailyKPI.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          arpu: { $avg: '$monetization.arpu' },
          arppu: { $avg: '$monetization.arppu' },
          payerRate: { $avg: '$monetization.payerRate' },
          avgGiftValue: { $avg: '$monetization.avgGiftValue' },
          coinTopupVolume: { $sum: '$monetization.coinTopupVolume' },
          ogConversionRate: { $avg: '$monetization.ogConversionRate' }
        }
      }
    ]);

    const result = monetizationData[0] || {
      arpu: 0,
      arppu: 0,
      payerRate: 0,
      avgGiftValue: 0,
      coinTopupVolume: 0,
      ogConversionRate: 0
    };

    // Calculate growth vs previous period
    const growth = await this.calculateGrowth('monetization.arpu', filter);

    return {
      arpu: Math.round(result.arpu * 100) / 100,
      arppu: Math.round(result.arppu * 100) / 100,
      payerRate: Math.round(result.payerRate * 100) / 100,
      avgGiftValue: Math.round(result.avgGiftValue * 100) / 100,
      coinTopupVolume: result.coinTopupVolume,
      ogConversionRate: Math.round(result.ogConversionRate * 100) / 100,
      growth
    };
  }

  /**
   * Get retention KPIs
   */
  async getRetentionKPIs(filter: KPIFilter): Promise<RetentionKPIs> {
    // Get latest cohort data
    const latestCohort = await AnalyticsCohort.findOne({
      country: filter.country || 'ALL'
    }).sort({ cohortDate: -1 });

    if (!latestCohort) {
      return {
        d1Retention: 0,
        d7Retention: 0,
        d30Retention: 0,
        churnRate: 0,
        avgLifetimeDays: 0,
        churnRiskScore: 0
      };
    }

    return {
      d1Retention: latestCohort.retention.d1,
      d7Retention: latestCohort.retention.d7,
      d30Retention: latestCohort.retention.d30,
      churnRate: latestCohort.churn.churnRate,
      avgLifetimeDays: latestCohort.churn.avgLifetimeDays,
      churnRiskScore: latestCohort.churn.churnRiskScore
    };
  }

  /**
   * Get creator KPIs
   */
  async getCreatorKPIs(filter: KPIFilter): Promise<CreatorKPIs> {
    const matchCondition = this.buildMatchCondition(filter);
    
    const creatorData = await AnalyticsDailyKPI.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          activeHosts: { $avg: '$creators.activeHosts' },
          topHostRevenue: { $max: '$creators.topHostRevenue' },
          avgHostRevenue: { $avg: '$creators.avgHostRevenue' },
          newHosts: { $sum: '$creators.newHosts' },
          hostRetentionRate: { $avg: '$creators.hostRetentionRate' }
        }
      }
    ]);

    const result = creatorData[0] || {
      activeHosts: 0,
      topHostRevenue: 0,
      avgHostRevenue: 0,
      newHosts: 0,
      hostRetentionRate: 0
    };

    // Get top creators
    const topCreators = await this.getTopCreators(filter);

    return {
      activeHosts: Math.round(result.activeHosts),
      topHostRevenue: result.topHostRevenue,
      avgHostRevenue: Math.round(result.avgHostRevenue * 100) / 100,
      newHosts: result.newHosts,
      hostRetentionRate: Math.round(result.hostRetentionRate * 100) / 100,
      topCreators
    };
  }

  /**
   * Get safety KPIs
   */
  async getSafetyKPIs(filter: KPIFilter): Promise<SafetyKPIs> {
    const matchCondition = this.buildMatchCondition(filter);
    
    const safetyData = await AnalyticsDailyKPI.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          flaggedContent: { $sum: '$safety.flaggedContent' },
          bannedUsers: { $sum: '$safety.bannedUsers' },
          appealsProcessed: { $sum: '$safety.appealsProcessed' },
          moderationActions: { $sum: '$safety.moderationActions' },
          avgSafetyScore: { $avg: '$safety.safetyScore' }
        }
      }
    ]);

    const result = safetyData[0] || {
      flaggedContent: 0,
      bannedUsers: 0,
      appealsProcessed: 0,
      moderationActions: 0,
      avgSafetyScore: 100
    };

    // Determine trend
    const trend = await this.calculateSafetyTrend(filter);

    return {
      flaggedContent: result.flaggedContent,
      bannedUsers: result.bannedUsers,
      appealsProcessed: result.appealsProcessed,
      moderationActions: result.moderationActions,
      safetyScore: Math.round(result.avgSafetyScore * 100) / 100,
      trend
    };
  }

  /**
   * Get gaming KPIs
   */
  async getGamingKPIs(filter: KPIFilter): Promise<GamingKPIs> {
    const matchCondition = this.buildMatchCondition(filter);
    
    const gamingData = await AnalyticsDailyKPI.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          gamesPlayed: { $sum: '$gaming.gamesPlayed' },
          totalStakes: { $sum: '$gaming.totalStakes' },
          totalPayouts: { $sum: '$gaming.totalPayouts' },
          avgHouseEdge: { $avg: '$gaming.houseEdge' },
          avgGameDuration: { $avg: '$gaming.avgGameDuration' },
          activePlayers: { $avg: '$gaming.activePlayers' }
        }
      }
    ]);

    const result = gamingData[0] || {
      gamesPlayed: 0,
      totalStakes: 0,
      totalPayouts: 0,
      avgHouseEdge: 40,
      avgGameDuration: 0,
      activePlayers: 0
    };

    const revenue = result.totalStakes - result.totalPayouts;

    return {
      gamesPlayed: result.gamesPlayed,
      totalStakes: result.totalStakes,
      totalPayouts: result.totalPayouts,
      houseEdge: Math.round(result.avgHouseEdge * 100) / 100,
      avgGameDuration: Math.round(result.avgGameDuration * 100) / 100,
      activePlayers: Math.round(result.activePlayers),
      revenue
    };
  }

  /**
   * Get time series data for a specific KPI
   */
  async getKPITimeSeries(metric: string, filter: KPIFilter): Promise<Array<{ date: Date; value: number }>> {
    const matchCondition = this.buildMatchCondition(filter);
    
    const timeSeriesData = await AnalyticsDailyKPI.aggregate([
      { $match: matchCondition },
      {
        $project: {
          date: 1,
          value: { $ifNull: [`$${metric}`, 0] }
        }
      },
      { $sort: { date: 1 } }
    ]);

    return timeSeriesData.map(item => ({
      date: item.date,
      value: item.value
    }));
  }

  /**
   * Get top creators by revenue
   */
  private async getTopCreators(filter: KPIFilter, limit: number = 10): Promise<Array<{
    hostId: string;
    username: string;
    revenue: number;
    streams: number;
    viewers: number;
  }>> {
    const matchCondition = this.buildHostMatchCondition(filter);
    
    const topCreators = await AnalyticsHostPerformance.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: '$hostId',
          revenue: { $sum: '$revenue.totalRevenue' },
          streams: { $sum: '$streams.totalStreams' },
          viewers: { $sum: '$streams.totalViewers' }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $project: {
          hostId: '$_id',
          username: { $arrayElemAt: ['$user.username', 0] },
          revenue: 1,
          streams: 1,
          viewers: 1
        }
      }
    ]);

    return topCreators.map(creator => ({
      hostId: creator.hostId.toString(),
      username: creator.username || 'Unknown',
      revenue: creator.revenue,
      streams: creator.streams,
      viewers: creator.viewers
    }));
  }

  /**
   * Calculate growth percentage vs previous period
   */
  private async calculateGrowth(metric: string, filter: KPIFilter): Promise<number> {
    const periodLength = filter.to.getTime() - filter.from.getTime();
    const previousFrom = new Date(filter.from.getTime() - periodLength);
    const previousTo = new Date(filter.to.getTime() - periodLength);

    const currentValue = await this.getMetricSum(metric, filter);
    const previousValue = await this.getMetricSum(metric, {
      ...filter,
      from: previousFrom,
      to: previousTo
    });

    if (previousValue === 0) return 0;
    return Math.round(((currentValue - previousValue) / previousValue) * 100 * 100) / 100;
  }

  /**
   * Calculate safety trend
   */
  private async calculateSafetyTrend(filter: KPIFilter): Promise<'improving' | 'stable' | 'declining'> {
    const currentSafetyScore = await this.getMetricSum('safety.safetyScore', filter);
    const growth = await this.calculateGrowth('safety.safetyScore', filter);

    if (growth > 5) return 'improving';
    if (growth < -5) return 'declining';
    return 'stable';
  }

  /**
   * Get sum of a specific metric
   */
  private async getMetricSum(metric: string, filter: KPIFilter): Promise<number> {
    const matchCondition = this.buildMatchCondition(filter);
    
    const result = await AnalyticsDailyKPI.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          sum: { $sum: `$${metric}` }
        }
      }
    ]);

    return result[0]?.sum || 0;
  }

  /**
   * Build match condition for queries
   */
  private buildMatchCondition(filter: KPIFilter): any {
    const condition: any = {
      date: { $gte: filter.from, $lte: filter.to }
    };

    if (filter.country && filter.country !== 'ALL') {
      condition.country = filter.country;
    }

    return condition;
  }

  /**
   * Build match condition for host performance queries
   */
  private buildHostMatchCondition(filter: KPIFilter): any {
    const condition: any = {
      date: { $gte: filter.from, $lte: filter.to }
    };

    if (filter.country && filter.country !== 'ALL') {
      condition.country = filter.country;
    }

    return condition;
  }
}

export default KPIService;

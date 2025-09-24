import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AnalyticsEvent } from '../analytics/models/AnalyticsEvent';
import { User } from '../models/User';
import { LiveStream } from '../models/LiveStream';
import { ShortVideo } from '../models/ShortVideo';
import { RedisService } from './RedisService';
import { Logger } from '@nestjs/common';

interface TimeSeriesData {
  timestamp: Date;
  value: number;
  metadata?: any;
}

interface DashboardMetrics {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalStreams: number;
    totalVideos: number;
    totalRevenue: number;
    engagementRate: number;
  };
  userMetrics: {
    newUsers: TimeSeriesData[];
    activeUsers: TimeSeriesData[];
    userRetention: {
      day1: number;
      day7: number;
      day30: number;
    };
    userSegments: Array<{
      segment: string;
      count: number;
      percentage: number;
    }>;
  };
  contentMetrics: {
    streamsPerDay: TimeSeriesData[];
    videosPerDay: TimeSeriesData[];
    averageWatchTime: TimeSeriesData[];
    topCategories: Array<{
      category: string;
      count: number;
      engagement: number;
    }>;
    topCreators: Array<{
      creatorId: string;
      creatorName: string;
      streams: number;
      videos: number;
      totalViews: number;
      revenue: number;
    }>;
  };
  engagementMetrics: {
    likesPerDay: TimeSeriesData[];
    sharesPerDay: TimeSeriesData[];
    commentsPerDay: TimeSeriesData[];
    giftsPerDay: TimeSeriesData[];
    engagementRate: TimeSeriesData[];
    viralCoefficient: number;
  };
  revenueMetrics: {
    revenuePerDay: TimeSeriesData[];
    revenueBySource: Array<{
      source: string;
      amount: number;
      percentage: number;
    }>;
    averageRevenuePerUser: TimeSeriesData[];
    conversionRate: TimeSeriesData[];
    topRevenueGenerators: Array<{
      userId: string;
      userName: string;
      revenue: number;
      streams: number;
      videos: number;
    }>;
  };
  technicalMetrics: {
    apiResponseTime: TimeSeriesData[];
    errorRate: TimeSeriesData[];
    activeConnections: TimeSeriesData[];
    cacheHitRate: TimeSeriesData[];
    databasePerformance: {
      queryTime: number;
      connectionPool: number;
      slowQueries: number;
    };
  };
}

interface PredictiveInsights {
  userGrowth: {
    predictedGrowth: number;
    confidence: number;
    factors: string[];
  };
  revenueForecast: {
    predictedRevenue: number;
    confidence: number;
    trends: string[];
  };
  contentTrends: {
    trendingCategories: string[];
    predictedTrends: Array<{
      category: string;
      growth: number;
      confidence: number;
    }>;
  };
  churnPrediction: {
    atRiskUsers: number;
    churnProbability: number;
    interventionSuggestions: string[];
  };
}

interface RealTimeMetrics {
  activeStreams: number;
  activeUsers: number;
  currentRevenue: number;
  topTrendingContent: Array<{
    contentId: string;
    contentType: 'stream' | 'video';
    views: number;
    engagement: number;
  }>;
  systemHealth: {
    apiLatency: number;
    errorRate: number;
    activeConnections: number;
    cacheHitRate: number;
  };
  alerts: Array<{
    type: 'warning' | 'error' | 'info';
    message: string;
    timestamp: Date;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
}

@Injectable()
export class AdvancedAnalyticsService {
  private readonly logger = new Logger(AdvancedAnalyticsService.name);

  constructor(
    @InjectModel('AnalyticsEvent') private analyticsEventModel: Model<AnalyticsEvent>,
    @InjectModel('User') private userModel: Model<User>,
    @InjectModel('LiveStream') private liveStreamModel: Model<LiveStream>,
    @InjectModel('ShortVideo') private shortVideoModel: Model<ShortVideo>,
    private redisService: RedisService,
  ) {}

  /**
   * Get comprehensive dashboard metrics
   */
  async getDashboardMetrics(
    timeRange: 'hour' | 'day' | 'week' | 'month' = 'day',
    granularity: 'minute' | 'hour' | 'day' = 'hour',
  ): Promise<DashboardMetrics> {
    try {
      const timeRangeMs = this.getTimeRangeMs(timeRange);
      const startTime = new Date(Date.now() - timeRangeMs);

      // Get overview metrics
      const overview = await this.getOverviewMetrics(startTime);

      // Get user metrics
      const userMetrics = await this.getUserMetrics(startTime, granularity);

      // Get content metrics
      const contentMetrics = await this.getContentMetrics(startTime, granularity);

      // Get engagement metrics
      const engagementMetrics = await this.getEngagementMetrics(startTime, granularity);

      // Get revenue metrics
      const revenueMetrics = await this.getRevenueMetrics(startTime, granularity);

      // Get technical metrics
      const technicalMetrics = await this.getTechnicalMetrics(startTime, granularity);

      return {
        overview,
        userMetrics,
        contentMetrics,
        engagementMetrics,
        revenueMetrics,
        technicalMetrics,
      };
    } catch (error) {
      this.logger.error('Error getting dashboard metrics:', error);
      throw error;
    }
  }

  /**
   * Get predictive insights using ML algorithms
   */
  async getPredictiveInsights(): Promise<PredictiveInsights> {
    try {
      // User growth prediction
      const userGrowth = await this.predictUserGrowth();

      // Revenue forecast
      const revenueForecast = await this.predictRevenue();

      // Content trends prediction
      const contentTrends = await this.predictContentTrends();

      // Churn prediction
      const churnPrediction = await this.predictChurn();

      return {
        userGrowth,
        revenueForecast,
        contentTrends,
        churnPrediction,
      };
    } catch (error) {
      this.logger.error('Error getting predictive insights:', error);
      throw error;
    }
  }

  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    try {
      // Get real-time data from Redis
      const activeStreams = await this.getActiveStreamsCount();
      const activeUsers = await this.getActiveUsersCount();
      const currentRevenue = await this.getCurrentRevenue();

      // Get trending content
      const topTrendingContent = await this.getTopTrendingContent();

      // Get system health
      const systemHealth = await this.getSystemHealth();

      // Get active alerts
      const alerts = await this.getActiveAlerts();

      return {
        activeStreams,
        activeUsers,
        currentRevenue,
        topTrendingContent,
        systemHealth,
        alerts,
      };
    } catch (error) {
      this.logger.error('Error getting real-time metrics:', error);
      throw error;
    }
  }

  /**
   * Get overview metrics
   */
  private async getOverviewMetrics(startTime: Date) {
    const [
      totalUsers,
      activeUsers,
      totalStreams,
      totalVideos,
      totalRevenue,
      engagementRate,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({
        lastActiveAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }),
      this.liveStreamModel.countDocuments({ createdAt: { $gte: startTime } }),
      this.shortVideoModel.countDocuments({ createdAt: { $gte: startTime } }),
      this.getTotalRevenue(startTime),
      this.getEngagementRate(startTime),
    ]);

    return {
      totalUsers,
      activeUsers,
      totalStreams,
      totalVideos,
      totalRevenue,
      engagementRate,
    };
  }

  /**
   * Get user metrics with time series data
   */
  private async getUserMetrics(startTime: Date, granularity: string) {
    const newUsers = await this.getTimeSeriesData(
      'user_registration',
      startTime,
      granularity,
    );

    const activeUsers = await this.getTimeSeriesData(
      'user_active',
      startTime,
      granularity,
    );

    const userRetention = await this.getUserRetention();

    const userSegments = await this.getUserSegments();

    return {
      newUsers,
      activeUsers,
      userRetention,
      userSegments,
    };
  }

  /**
   * Get content metrics
   */
  private async getContentMetrics(startTime: Date, granularity: string) {
    const streamsPerDay = await this.getTimeSeriesData(
      'stream_created',
      startTime,
      granularity,
    );

    const videosPerDay = await this.getTimeSeriesData(
      'video_created',
      startTime,
      granularity,
    );

    const averageWatchTime = await this.getAverageWatchTime(startTime, granularity);

    const topCategories = await this.getTopCategories(startTime);

    const topCreators = await this.getTopCreators(startTime);

    return {
      streamsPerDay,
      videosPerDay,
      averageWatchTime,
      topCategories,
      topCreators,
    };
  }

  /**
   * Get engagement metrics
   */
  private async getEngagementMetrics(startTime: Date, granularity: string) {
    const likesPerDay = await this.getTimeSeriesData(
      'content_like',
      startTime,
      granularity,
    );

    const sharesPerDay = await this.getTimeSeriesData(
      'content_share',
      startTime,
      granularity,
    );

    const commentsPerDay = await this.getTimeSeriesData(
      'content_comment',
      startTime,
      granularity,
    );

    const giftsPerDay = await this.getTimeSeriesData(
      'gift_sent',
      startTime,
      granularity,
    );

    const engagementRate = await this.getEngagementRateTimeSeries(startTime, granularity);

    const viralCoefficient = await this.getViralCoefficient();

    return {
      likesPerDay,
      sharesPerDay,
      commentsPerDay,
      giftsPerDay,
      engagementRate,
      viralCoefficient,
    };
  }

  /**
   * Get revenue metrics
   */
  private async getRevenueMetrics(startTime: Date, granularity: string) {
    const revenuePerDay = await this.getRevenueTimeSeries(startTime, granularity);

    const revenueBySource = await this.getRevenueBySource(startTime);

    const averageRevenuePerUser = await this.getAverageRevenuePerUser(startTime, granularity);

    const conversionRate = await this.getConversionRate(startTime, granularity);

    const topRevenueGenerators = await this.getTopRevenueGenerators(startTime);

    return {
      revenuePerDay,
      revenueBySource,
      averageRevenuePerUser,
      conversionRate,
      topRevenueGenerators,
    };
  }

  /**
   * Get technical metrics
   */
  private async getTechnicalMetrics(startTime: Date, granularity: string) {
    const apiResponseTime = await this.getTimeSeriesData(
      'api_response_time',
      startTime,
      granularity,
    );

    const errorRate = await this.getTimeSeriesData(
      'api_error',
      startTime,
      granularity,
    );

    const activeConnections = await this.getTimeSeriesData(
      'socket_connection',
      startTime,
      granularity,
    );

    const cacheHitRate = await this.getCacheHitRate(startTime, granularity);

    const databasePerformance = await this.getDatabasePerformance();

    return {
      apiResponseTime,
      errorRate,
      activeConnections,
      cacheHitRate,
      databasePerformance,
    };
  }

  /**
   * Get time series data for a specific event type
   */
  private async getTimeSeriesData(
    eventType: string,
    startTime: Date,
    granularity: string,
  ): Promise<TimeSeriesData[]> {
    const groupBy = this.getGroupByClause(granularity);

    const pipeline = [
      {
        $match: {
          eventType,
          timestamp: { $gte: startTime },
        },
      },
      {
        $group: {
          _id: groupBy,
          value: { $sum: 1 },
          metadata: { $first: '$metadata' },
        },
      },
      {
        $sort: { '_id': 1 },
      },
    ];

    const results = await this.analyticsEventModel.aggregate(pipeline);

    return results.map(result => ({
      timestamp: result._id,
      value: result.value,
      metadata: result.metadata,
    }));
  }

  /**
   * Get group by clause for aggregation
   */
  private getGroupByClause(granularity: string) {
    switch (granularity) {
      case 'minute':
        return {
          $dateToString: {
            format: '%Y-%m-%d %H:%M:00',
            date: '$timestamp',
          },
        };
      case 'hour':
        return {
          $dateToString: {
            format: '%Y-%m-%d %H:00:00',
            date: '$timestamp',
          },
        };
      case 'day':
        return {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$timestamp',
          },
        };
      default:
        return {
          $dateToString: {
            format: '%Y-%m-%d %H:00:00',
            date: '$timestamp',
          },
        };
    }
  }

  /**
   * Get user retention metrics
   */
  private async getUserRetention() {
    const now = new Date();
    const day1 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const day7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [day1Retention, day7Retention, day30Retention] = await Promise.all([
      this.calculateRetentionRate(day1),
      this.calculateRetentionRate(day7),
      this.calculateRetentionRate(day30),
    ]);

    return {
      day1: day1Retention,
      day7: day7Retention,
      day30: day30Retention,
    };
  }

  /**
   * Calculate retention rate for a specific period
   */
  private async calculateRetentionRate(periodStart: Date) {
    const totalUsers = await this.userModel.countDocuments({
      createdAt: { $gte: periodStart },
    });

    if (totalUsers === 0) return 0;

    const activeUsers = await this.userModel.countDocuments({
      createdAt: { $gte: periodStart },
      lastActiveAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    });

    return (activeUsers / totalUsers) * 100;
  }

  /**
   * Get user segments
   */
  private async getUserSegments() {
    const segments = await this.userModel.aggregate([
      {
        $group: {
          _id: {
            $cond: [
              { $gte: ['$createdAt', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
              'new',
              {
                $cond: [
                  { $gte: ['$lastActiveAt', new Date(Date.now() - 24 * 60 * 60 * 1000)] },
                  'active',
                  'inactive'
                ]
              }
            ]
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const totalUsers = segments.reduce((sum, segment) => sum + segment.count, 0);

    return segments.map(segment => ({
      segment: segment._id,
      count: segment.count,
      percentage: (segment.count / totalUsers) * 100,
    }));
  }

  /**
   * Get top categories
   */
  private async getTopCategories(startTime: Date) {
    const categories = await this.analyticsEventModel.aggregate([
      {
        $match: {
          eventType: { $in: ['content_watch', 'content_like', 'content_share'] },
          timestamp: { $gte: startTime },
        },
      },
      {
        $group: {
          _id: '$metadata.category',
          count: { $sum: 1 },
          engagement: {
            $sum: {
              $cond: [
                { $eq: ['$eventType', 'content_like'] },
                1,
                { $cond: [
                  { $eq: ['$eventType', 'content_share'] },
                  3,
                  { $cond: [
                    { $eq: ['$eventType', 'content_watch'] },
                    0.1,
                    0
                  ]}
                ]}
              ]
            }
          },
        },
      },
      { $sort: { engagement: -1 } },
      { $limit: 10 },
    ]);

    return categories.map(category => ({
      category: category._id || 'unknown',
      count: category.count,
      engagement: category.engagement,
    }));
  }

  /**
   * Get top creators
   */
  private async getTopCreators(startTime: Date) {
    const creators = await this.analyticsEventModel.aggregate([
      {
        $match: {
          eventType: { $in: ['content_watch', 'content_like', 'content_share'] },
          timestamp: { $gte: startTime },
        },
      },
      {
        $group: {
          _id: '$metadata.creatorId',
          creatorName: { $first: '$metadata.creatorName' },
          streams: {
            $sum: {
              $cond: [
                { $eq: ['$metadata.contentType', 'stream'] },
                1,
                0
              ]
            }
          },
          videos: {
            $sum: {
              $cond: [
                { $eq: ['$metadata.contentType', 'video'] },
                1,
                0
              ]
            }
          },
          totalViews: {
            $sum: {
              $cond: [
                { $eq: ['$eventType', 'content_watch'] },
                1,
                0
              ]
            }
          },
          revenue: { $sum: '$metadata.revenue' || 0 },
        },
      },
      { $sort: { totalViews: -1 } },
      { $limit: 10 },
    ]);

    return creators.map(creator => ({
      creatorId: creator._id,
      creatorName: creator.creatorName || 'Unknown',
      streams: creator.streams,
      videos: creator.videos,
      totalViews: creator.totalViews,
      revenue: creator.revenue,
    }));
  }

  /**
   * Get average watch time time series
   */
  private async getAverageWatchTime(startTime: Date, granularity: string): Promise<TimeSeriesData[]> {
    const groupBy = this.getGroupByClause(granularity);

    const pipeline = [
      {
        $match: {
          eventType: 'content_watch',
          timestamp: { $gte: startTime },
        },
      },
      {
        $group: {
          _id: groupBy,
          averageWatchTime: { $avg: '$metadata.watchTime' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id': 1 },
      },
    ];

    const results = await this.analyticsEventModel.aggregate(pipeline);

    return results.map(result => ({
      timestamp: result._id,
      value: result.averageWatchTime || 0,
      metadata: { count: result.count },
    }));
  }

  /**
   * Get engagement rate time series
   */
  private async getEngagementRateTimeSeries(startTime: Date, granularity: string): Promise<TimeSeriesData[]> {
    const groupBy = this.getGroupByClause(granularity);

    const pipeline = [
      {
        $match: {
          eventType: { $in: ['content_watch', 'content_like', 'content_share', 'content_comment'] },
          timestamp: { $gte: startTime },
        },
      },
      {
        $group: {
          _id: groupBy,
          totalViews: {
            $sum: {
              $cond: [
                { $eq: ['$eventType', 'content_watch'] },
                1,
                0
              ]
            }
          },
          totalEngagements: {
            $sum: {
              $cond: [
                { $in: ['$eventType', ['content_like', 'content_share', 'content_comment']] },
                1,
                0
              ]
            }
          },
        },
      },
      {
        $addFields: {
          engagementRate: {
            $cond: [
              { $gt: ['$totalViews', 0] },
              { $divide: ['$totalEngagements', '$totalViews'] },
              0
            ]
          },
        },
      },
      {
        $sort: { '_id': 1 },
      },
    ];

    const results = await this.analyticsEventModel.aggregate(pipeline);

    return results.map(result => ({
      timestamp: result._id,
      value: result.engagementRate,
      metadata: { totalViews: result.totalViews, totalEngagements: result.totalEngagements },
    }));
  }

  /**
   * Get viral coefficient
   */
  private async getViralCoefficient(): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalShares, totalUsers] = await Promise.all([
      this.analyticsEventModel.countDocuments({
        eventType: 'content_share',
        timestamp: { $gte: thirtyDaysAgo },
      }),
      this.userModel.countDocuments({
        createdAt: { $gte: thirtyDaysAgo },
      }),
    ]);

    return totalUsers > 0 ? totalShares / totalUsers : 0;
  }

  /**
   * Get revenue time series
   */
  private async getRevenueTimeSeries(startTime: Date, granularity: string): Promise<TimeSeriesData[]> {
    const groupBy = this.getGroupByClause(granularity);

    const pipeline = [
      {
        $match: {
          eventType: { $in: ['payment_success', 'subscription_payment', 'gift_purchase'] },
          timestamp: { $gte: startTime },
        },
      },
      {
        $group: {
          _id: groupBy,
          revenue: { $sum: '$metadata.amount' },
          transactions: { $sum: 1 },
        },
      },
      {
        $sort: { '_id': 1 },
      },
    ];

    const results = await this.analyticsEventModel.aggregate(pipeline);

    return results.map(result => ({
      timestamp: result._id,
      value: result.revenue || 0,
      metadata: { transactions: result.transactions },
    }));
  }

  /**
   * Get revenue by source
   */
  private async getRevenueBySource(startTime: Date) {
    const sources = await this.analyticsEventModel.aggregate([
      {
        $match: {
          eventType: { $in: ['payment_success', 'subscription_payment', 'gift_purchase'] },
          timestamp: { $gte: startTime },
        },
      },
      {
        $group: {
          _id: '$metadata.source',
          amount: { $sum: '$metadata.amount' },
        },
      },
    ]);

    const totalRevenue = sources.reduce((sum, source) => sum + source.amount, 0);

    return sources.map(source => ({
      source: source._id || 'unknown',
      amount: source.amount,
      percentage: totalRevenue > 0 ? (source.amount / totalRevenue) * 100 : 0,
    }));
  }

  /**
   * Get average revenue per user time series
   */
  private async getAverageRevenuePerUser(startTime: Date, granularity: string): Promise<TimeSeriesData[]> {
    const groupBy = this.getGroupByClause(granularity);

    const pipeline = [
      {
        $match: {
          eventType: { $in: ['payment_success', 'subscription_payment', 'gift_purchase'] },
          timestamp: { $gte: startTime },
        },
      },
      {
        $group: {
          _id: groupBy,
          totalRevenue: { $sum: '$metadata.amount' },
          uniqueUsers: { $addToSet: '$userId' },
        },
      },
      {
        $addFields: {
          userCount: { $size: '$uniqueUsers' },
          averageRevenue: {
            $cond: [
              { $gt: [{ $size: '$uniqueUsers' }, 0] },
              { $divide: ['$totalRevenue', { $size: '$uniqueUsers' }] },
              0
            ]
          },
        },
      },
      {
        $sort: { '_id': 1 },
      },
    ];

    const results = await this.analyticsEventModel.aggregate(pipeline);

    return results.map(result => ({
      timestamp: result._id,
      value: result.averageRevenue,
      metadata: { userCount: result.userCount, totalRevenue: result.totalRevenue },
    }));
  }

  /**
   * Get conversion rate time series
   */
  private async getConversionRate(startTime: Date, granularity: string): Promise<TimeSeriesData[]> {
    const groupBy = this.getGroupByClause(granularity);

    const pipeline = [
      {
        $match: {
          eventType: { $in: ['user_registration', 'payment_success'] },
          timestamp: { $gte: startTime },
        },
      },
      {
        $group: {
          _id: groupBy,
          registrations: {
            $sum: {
              $cond: [
                { $eq: ['$eventType', 'user_registration'] },
                1,
                0
              ]
            }
          },
          payments: {
            $sum: {
              $cond: [
                { $eq: ['$eventType', 'payment_success'] },
                1,
                0
              ]
            }
          },
        },
      },
      {
        $addFields: {
          conversionRate: {
            $cond: [
              { $gt: ['$registrations', 0] },
              { $divide: ['$payments', '$registrations'] },
              0
            ]
          },
        },
      },
      {
        $sort: { '_id': 1 },
      },
    ];

    const results = await this.analyticsEventModel.aggregate(pipeline);

    return results.map(result => ({
      timestamp: result._id,
      value: result.conversionRate,
      metadata: { registrations: result.registrations, payments: result.payments },
    }));
  }

  /**
   * Get top revenue generators
   */
  private async getTopRevenueGenerators(startTime: Date) {
    const generators = await this.analyticsEventModel.aggregate([
      {
        $match: {
          eventType: { $in: ['payment_success', 'subscription_payment', 'gift_purchase'] },
          timestamp: { $gte: startTime },
        },
      },
      {
        $group: {
          _id: '$userId',
          userName: { $first: '$metadata.userName' },
          revenue: { $sum: '$metadata.amount' },
          streams: {
            $sum: {
              $cond: [
                { $eq: ['$metadata.contentType', 'stream'] },
                1,
                0
              ]
            }
          },
          videos: {
            $sum: {
              $cond: [
                { $eq: ['$metadata.contentType', 'video'] },
                1,
                0
              ]
            }
          },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]);

    return generators.map(generator => ({
      userId: generator._id,
      userName: generator.userName || 'Unknown',
      revenue: generator.revenue,
      streams: generator.streams,
      videos: generator.videos,
    }));
  }

  /**
   * Get cache hit rate time series
   */
  private async getCacheHitRate(startTime: Date, granularity: string): Promise<TimeSeriesData[]> {
    // This would typically come from Redis metrics
    // For now, return mock data
    return [];
  }

  /**
   * Get database performance metrics
   */
  private async getDatabasePerformance() {
    // This would typically come from database monitoring
    // For now, return mock data
    return {
      queryTime: 50, // ms
      connectionPool: 10,
      slowQueries: 2,
    };
  }

  /**
   * Get total revenue for a period
   */
  private async getTotalRevenue(startTime: Date): Promise<number> {
    const result = await this.analyticsEventModel.aggregate([
      {
        $match: {
          eventType: { $in: ['payment_success', 'subscription_payment', 'gift_purchase'] },
          timestamp: { $gte: startTime },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$metadata.amount' },
        },
      },
    ]);

    return result.length > 0 ? result[0].totalRevenue : 0;
  }

  /**
   * Get engagement rate for a period
   */
  private async getEngagementRate(startTime: Date): Promise<number> {
    const [totalViews, totalEngagements] = await Promise.all([
      this.analyticsEventModel.countDocuments({
        eventType: 'content_watch',
        timestamp: { $gte: startTime },
      }),
      this.analyticsEventModel.countDocuments({
        eventType: { $in: ['content_like', 'content_share', 'content_comment'] },
        timestamp: { $gte: startTime },
      }),
    ]);

    return totalViews > 0 ? (totalEngagements / totalViews) * 100 : 0;
  }

  /**
   * Get time range in milliseconds
   */
  private getTimeRangeMs(timeRange: string): number {
    switch (timeRange) {
      case 'hour':
        return 60 * 60 * 1000;
      case 'day':
        return 24 * 60 * 60 * 1000;
      case 'week':
        return 7 * 24 * 60 * 60 * 1000;
      case 'month':
        return 30 * 24 * 60 * 60 * 1000;
      default:
        return 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Predict user growth using simple linear regression
   */
  private async predictUserGrowth() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const dailyUsers = await this.analyticsEventModel.aggregate([
      {
        $match: {
          eventType: 'user_registration',
          timestamp: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$timestamp',
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id': 1 } },
    ]);

    if (dailyUsers.length < 7) {
      return {
        predictedGrowth: 0,
        confidence: 0,
        factors: ['Insufficient data for prediction'],
      };
    }

    // Simple linear regression
    const n = dailyUsers.length;
    const sumX = dailyUsers.reduce((sum, _, index) => sum + index, 0);
    const sumY = dailyUsers.reduce((sum, day) => sum + day.count, 0);
    const sumXY = dailyUsers.reduce((sum, day, index) => sum + index * day.count, 0);
    const sumXX = dailyUsers.reduce((sum, _, index) => sum + index * index, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const predictedGrowth = slope * n + intercept;
    const confidence = Math.min(0.9, dailyUsers.length / 30); // Confidence based on data points

    return {
      predictedGrowth: Math.max(0, predictedGrowth),
      confidence,
      factors: ['Historical registration trends', 'Seasonal patterns', 'Platform growth'],
    };
  }

  /**
   * Predict revenue using trend analysis
   */
  private async predictRevenue() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const dailyRevenue = await this.analyticsEventModel.aggregate([
      {
        $match: {
          eventType: { $in: ['payment_success', 'subscription_payment', 'gift_purchase'] },
          timestamp: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$timestamp',
            },
          },
          revenue: { $sum: '$metadata.amount' },
        },
      },
      { $sort: { '_id': 1 } },
    ]);

    if (dailyRevenue.length < 7) {
      return {
        predictedRevenue: 0,
        confidence: 0,
        trends: ['Insufficient data for prediction'],
      };
    }

    // Calculate average daily revenue
    const totalRevenue = dailyRevenue.reduce((sum, day) => sum + day.revenue, 0);
    const averageDailyRevenue = totalRevenue / dailyRevenue.length;
    const predictedRevenue = averageDailyRevenue * 30; // Next 30 days

    return {
      predictedRevenue,
      confidence: 0.7,
      trends: ['Revenue growth trend', 'User monetization increase', 'Premium feature adoption'],
    };
  }

  /**
   * Predict content trends
   */
  private async predictContentTrends() {
    const trendingCategories = await this.getTopCategories(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    
    const predictedTrends = trendingCategories.slice(0, 5).map(category => ({
      category: category.category,
      growth: Math.random() * 50 + 10, // Mock growth percentage
      confidence: Math.random() * 0.3 + 0.6, // Mock confidence
    }));

    return {
      trendingCategories: trendingCategories.map(c => c.category),
      predictedTrends,
    };
  }

  /**
   * Predict user churn
   */
  private async predictChurn() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const totalUsers = await this.userModel.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    const inactiveUsers = await this.userModel.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
      lastActiveAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });

    const churnProbability = totalUsers > 0 ? (inactiveUsers / totalUsers) * 100 : 0;

    return {
      atRiskUsers: inactiveUsers,
      churnProbability,
      interventionSuggestions: [
        'Send re-engagement notifications',
        'Offer personalized content recommendations',
        'Provide special incentives for returning users',
        'Implement gamification elements',
      ],
    };
  }

  /**
   * Get active streams count
   */
  private async getActiveStreamsCount(): Promise<number> {
    return await this.liveStreamModel.countDocuments({ status: 'live' });
  }

  /**
   * Get active users count
   */
  private async getActiveUsersCount(): Promise<number> {
    return await this.userModel.countDocuments({
      lastActiveAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) }, // Active in last 5 minutes
    });
  }

  /**
   * Get current revenue (last hour)
   */
  private async getCurrentRevenue(): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const result = await this.analyticsEventModel.aggregate([
      {
        $match: {
          eventType: { $in: ['payment_success', 'subscription_payment', 'gift_purchase'] },
          timestamp: { $gte: oneHourAgo },
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$metadata.amount' },
        },
      },
    ]);

    return result.length > 0 ? result[0].revenue : 0;
  }

  /**
   * Get top trending content
   */
  private async getTopTrendingContent() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const trending = await this.analyticsEventModel.aggregate([
      {
        $match: {
          eventType: { $in: ['content_watch', 'content_like', 'content_share'] },
          timestamp: { $gte: oneHourAgo },
        },
      },
      {
        $group: {
          _id: '$metadata.contentId',
          contentType: { $first: '$metadata.contentType' },
          views: {
            $sum: {
              $cond: [
                { $eq: ['$eventType', 'content_watch'] },
                1,
                0
              ]
            }
          },
          engagement: {
            $sum: {
              $cond: [
                { $in: ['$eventType', ['content_like', 'content_share']] },
                1,
                0
              ]
            }
          },
        },
      },
      { $sort: { views: -1 } },
      { $limit: 10 },
    ]);

    return trending.map(item => ({
      contentId: item._id,
      contentType: item.contentType,
      views: item.views,
      engagement: item.engagement,
    }));
  }

  /**
   * Get system health metrics
   */
  private async getSystemHealth() {
    // This would typically come from system monitoring
    // For now, return mock data
    return {
      apiLatency: 120, // ms
      errorRate: 0.02, // 2%
      activeConnections: 1500,
      cacheHitRate: 0.85, // 85%
    };
  }

  /**
   * Get active alerts
   */
  private async getActiveAlerts() {
    // This would typically come from monitoring systems
    // For now, return mock data
    return [
      {
        type: 'warning' as const,
        message: 'High API response time detected',
        timestamp: new Date(),
        severity: 'medium' as const,
      },
      {
        type: 'info' as const,
        message: 'Cache hit rate is optimal',
        timestamp: new Date(),
        severity: 'low' as const,
      },
    ];
  }
}

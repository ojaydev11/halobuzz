import { logger } from '../config/logger';
import { User } from '../models/User';
import { LiveStream } from '../models/LiveStream';
import { Transaction } from '../models/Transaction';
import { getCache, setCache } from '../config/redis';

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
      totalRevenue: number;
    }>;
  };
  revenueMetrics: {
    dailyRevenue: TimeSeriesData[];
    revenueBySource: Array<{
      source: string;
      amount: number;
      percentage: number;
    }>;
    topRevenueGenerators: Array<{
      userId: string;
      username: string;
      revenue: number;
      transactions: number;
    }>;
  };
  engagementMetrics: {
    dailyEngagement: TimeSeriesData[];
    engagementByContent: Array<{
      contentType: string;
      engagement: number;
      count: number;
    }>;
    trendingContent: Array<{
      contentId: string;
      title: string;
      engagement: number;
      views: number;
    }>;
  };
}

interface AnalyticsFilter {
  startDate: Date;
  endDate: Date;
  userId?: string;
  category?: string;
  eventType?: string;
  limit?: number;
}

export class AdvancedAnalyticsService {
  private readonly logger = logger;
  private readonly userModel = User;
  private readonly streamModel = LiveStream;
  private readonly transactionModel = Transaction;

  /**
   * Get comprehensive dashboard metrics
   */
  async getDashboardMetrics(filter: AnalyticsFilter): Promise<DashboardMetrics> {
    try {
      const [
        overview,
        userMetrics,
        contentMetrics,
        revenueMetrics,
        engagementMetrics
      ] = await Promise.all([
        this.getOverviewMetrics(filter),
        this.getUserMetrics(filter),
        this.getContentMetrics(filter),
        this.getRevenueMetrics(filter),
        this.getEngagementMetrics(filter)
      ]);

      return {
        overview,
        userMetrics,
        contentMetrics,
        revenueMetrics,
        engagementMetrics
      };
    } catch (error) {
      this.logger.error('Error getting dashboard metrics:', error);
      throw error;
    }
  }

  /**
   * Get overview metrics
   */
  private async getOverviewMetrics(filter: AnalyticsFilter) {
    const [
      totalUsers,
      activeUsers,
      totalStreams,
      totalVideos,
      totalRevenue,
      engagementRate
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ lastActiveAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
      this.streamModel.countDocuments({ createdAt: { $gte: filter.startDate } }),
      this.streamModel.countDocuments({ createdAt: { $gte: filter.startDate }, type: 'video' }),
      this.getTotalRevenue(filter.startDate),
      this.getEngagementRate(filter.startDate)
    ]);

    return {
      totalUsers,
      activeUsers,
      totalStreams,
      totalVideos,
      totalRevenue,
      engagementRate
    };
  }

  /**
   * Get user metrics
   */
  private async getUserMetrics(filter: AnalyticsFilter) {
    const [newUsers, activeUsers, userRetention, userSegments] = await Promise.all([
      this.getNewUsers(filter.startDate),
      this.getActiveUsers(filter.startDate),
      this.getUserRetention(),
      this.getUserSegments()
    ]);

    return {
      newUsers,
      activeUsers,
      userRetention,
      userSegments
    };
  }

  /**
   * Get content metrics
   */
  private async getContentMetrics(filter: AnalyticsFilter) {
    const [streamsPerDay, videosPerDay, averageWatchTime, topCategories, topCreators] = await Promise.all([
      this.getStreamsPerDay(filter.startDate),
      this.getVideosPerDay(filter.startDate),
      this.getAverageWatchTime(filter.startDate),
      this.getTopCategories(filter.startDate),
      this.getTopCreators(filter.startDate)
    ]);

    return {
      streamsPerDay,
      videosPerDay,
      averageWatchTime,
      topCategories,
      topCreators
    };
  }

  /**
   * Get revenue metrics
   */
  private async getRevenueMetrics(filter: AnalyticsFilter) {
    const [dailyRevenue, revenueBySource, topRevenueGenerators] = await Promise.all([
      this.getDailyRevenue(filter.startDate),
      this.getRevenueBySource(filter.startDate),
      this.getTopRevenueGenerators(filter.startDate)
    ]);

    return {
      dailyRevenue,
      revenueBySource,
      topRevenueGenerators
    };
  }

  /**
   * Get engagement metrics
   */
  private async getEngagementMetrics(filter: AnalyticsFilter) {
    const [dailyEngagement, engagementByContent, trendingContent] = await Promise.all([
      this.getDailyEngagement(filter.startDate),
      this.getEngagementByContent(filter.startDate),
      this.getTrendingContent(filter.startDate)
    ]);

    return {
      dailyEngagement,
      engagementByContent,
      trendingContent
    };
  }

  /**
   * Get new users over time
   */
  private async getNewUsers(startTime: Date): Promise<TimeSeriesData[]> {
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: startTime }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 as const }
      }
    ];

    const results = await this.userModel.aggregate(pipeline);

    return results.map(result => ({
      timestamp: new Date(result._id),
      value: result.count
    }));
  }

  /**
   * Get active users over time
   */
  private async getActiveUsers(startTime: Date): Promise<TimeSeriesData[]> {
    const pipeline = [
      {
        $match: {
          lastActiveAt: { $gte: startTime }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$lastActiveAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 as const }
      }
    ];

    const results = await this.userModel.aggregate(pipeline);

    return results.map(result => ({
      timestamp: new Date(result._id),
      value: result.count
    }));
  }

  /**
   * Get user retention rates
   */
  private async getUserRetention() {
    const now = new Date();
    const day1 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const day7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalUsers, day1Users, day7Users, day30Users] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ lastActiveAt: { $gte: day1 } }),
      this.userModel.countDocuments({ lastActiveAt: { $gte: day7 } }),
      this.userModel.countDocuments({ lastActiveAt: { $gte: day30 } })
    ]);

    return {
      day1: totalUsers > 0 ? (day1Users / totalUsers) * 100 : 0,
      day7: totalUsers > 0 ? (day7Users / totalUsers) * 100 : 0,
      day30: totalUsers > 0 ? (day30Users / totalUsers) * 100 : 0
    };
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
              { $gte: ['$coins.totalSpent', 1000] },
              'Whale',
              { $cond: [
                { $gte: ['$coins.totalSpent', 100] },
                'Premium',
                { $cond: [
                  { $gte: ['$coins.totalSpent', 10] },
                  'Regular',
                  'Free'
                ]}
              ]}
            ]
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 as const }
      }
    ]);

    const totalUsers = await this.userModel.countDocuments();

    return segments.map(segment => ({
      segment: segment._id,
      count: segment.count,
      percentage: totalUsers > 0 ? (segment.count / totalUsers) * 100 : 0
    }));
  }

  /**
   * Get streams per day
   */
  private async getStreamsPerDay(startTime: Date): Promise<TimeSeriesData[]> {
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: startTime },
          type: 'live'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 as const }
      }
    ];

    const results = await this.streamModel.aggregate(pipeline);

    return results.map(result => ({
      timestamp: new Date(result._id),
      value: result.count
    }));
  }

  /**
   * Get videos per day
   */
  private async getVideosPerDay(startTime: Date): Promise<TimeSeriesData[]> {
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: startTime },
          type: 'video'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 as const }
      }
    ];

    const results = await this.streamModel.aggregate(pipeline);

    return results.map(result => ({
      timestamp: new Date(result._id),
      value: result.count
    }));
  }

  /**
   * Get average watch time
   */
  private async getAverageWatchTime(startTime: Date): Promise<TimeSeriesData[]> {
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: startTime },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          avgWatchTime: { $avg: '$duration' }
        }
      },
      {
        $sort: { _id: 1 as const }
      }
    ];

    const results = await this.streamModel.aggregate(pipeline);

    return results.map(result => ({
      timestamp: new Date(result._id),
      value: result.avgWatchTime || 0
    }));
  }

  /**
   * Get top categories
   */
  private async getTopCategories(startTime: Date) {
    const categories = await this.streamModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startTime },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          engagement: { $sum: '$totalLikes' }
        }
      },
      {
        $sort: { count: -1 as const }
      },
      {
        $limit: 10
      }
    ]);

    return categories.map(cat => ({
      category: cat._id || 'Unknown',
      count: cat.count,
      engagement: cat.engagement
    }));
  }

  /**
   * Get top creators
   */
  private async getTopCreators(startTime: Date) {
    const creators = await this.streamModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startTime },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$userId',
          streams: { $sum: 1 },
          totalViews: { $sum: '$totalViewers' },
          totalRevenue: { $sum: '$totalCoins' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          creatorId: '$_id',
          creatorName: '$user.username',
          streams: 1,
          videos: 0,
          totalViews: 1,
          totalRevenue: 1
        }
      },
      {
        $sort: { totalViews: -1 as const }
      },
      {
        $limit: 10
      }
    ]);

    return creators;
  }

  /**
   * Get daily revenue
   */
  private async getDailyRevenue(startTime: Date): Promise<TimeSeriesData[]> {
    const pipeline = [
      {
        $match: {
          type: 'recharge',
          status: 'completed',
          createdAt: { $gte: startTime }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          revenue: { $sum: '$amount' }
        }
      },
      {
        $sort: { _id: 1 as const }
      }
    ];

    const results = await this.transactionModel.aggregate(pipeline);

    return results.map(result => ({
      timestamp: new Date(result._id),
      value: result.revenue
    }));
  }

  /**
   * Get revenue by source
   */
  private async getRevenueBySource(startTime: Date) {
    const sources = await this.transactionModel.aggregate([
      {
        $match: {
          type: 'recharge',
          status: 'completed',
          createdAt: { $gte: startTime }
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          amount: { $sum: '$amount' }
        }
      },
      {
        $sort: { amount: -1 as const }
      }
    ]);

    const totalRevenue = sources.reduce((sum, source) => sum + source.amount, 0);

    return sources.map(source => ({
      source: source._id || 'Unknown',
      amount: source.amount,
      percentage: totalRevenue > 0 ? (source.amount / totalRevenue) * 100 : 0
    }));
  }

  /**
   * Get top revenue generators
   */
  private async getTopRevenueGenerators(startTime: Date) {
    const generators = await this.transactionModel.aggregate([
      {
        $match: {
          type: 'recharge',
          status: 'completed',
          createdAt: { $gte: startTime }
        }
      },
      {
        $group: {
          _id: '$userId',
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          userId: '$_id',
          username: '$user.username',
          revenue: 1,
          transactions: 1
        }
      },
      {
        $sort: { revenue: -1 as const }
      },
      {
        $limit: 10
      }
    ]);

    return generators;
  }

  /**
   * Get daily engagement
   */
  private async getDailyEngagement(startTime: Date): Promise<TimeSeriesData[]> {
    const pipeline = [
      {
        $match: {
          createdAt: { $gte: startTime },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          },
          engagement: { $sum: { $add: ['$totalLikes', '$totalComments', '$totalShares'] } }
        }
      },
      {
        $sort: { _id: 1 as const }
      }
    ];

    const results = await this.streamModel.aggregate(pipeline);

    return results.map(result => ({
      timestamp: new Date(result._id),
      value: result.engagement
    }));
  }

  /**
   * Get engagement by content type
   */
  private async getEngagementByContent(startTime: Date) {
    const engagement = await this.streamModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startTime },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$type',
          engagement: { $sum: { $add: ['$totalLikes', '$totalComments', '$totalShares'] } },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { engagement: -1 as const }
      }
    ]);

    return engagement.map(item => ({
      contentType: item._id || 'Unknown',
      engagement: item.engagement,
      count: item.count
    }));
  }

  /**
   * Get trending content
   */
  private async getTrendingContent(startTime: Date) {
    const trending = await this.streamModel.aggregate([
      {
        $match: {
          createdAt: { $gte: startTime },
          status: 'completed'
        }
      },
      {
        $project: {
          contentId: '$_id',
          title: 1,
          engagement: { $add: ['$totalLikes', '$totalComments', '$totalShares'] },
          views: '$totalViewers'
        }
      },
      {
        $sort: { engagement: -1 as const }
      },
      {
        $limit: 10
      }
    ]);

    return trending;
  }

  /**
   * Get total revenue
   */
  private async getTotalRevenue(startTime: Date): Promise<number> {
    const result = await this.transactionModel.aggregate([
      {
        $match: {
          type: 'recharge',
          status: 'completed',
          createdAt: { $gte: startTime }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    return result.length > 0 ? result[0].total : 0;
  }

  /**
   * Get engagement rate
   */
  private async getEngagementRate(startTime: Date): Promise<number> {
    const [totalViews, totalEngagement] = await Promise.all([
      this.streamModel.aggregate([
        {
          $match: {
            createdAt: { $gte: startTime },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalViewers' }
          }
        }
      ]),
      this.streamModel.aggregate([
        {
          $match: {
            createdAt: { $gte: startTime },
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $add: ['$totalLikes', '$totalComments', '$totalShares'] } }
          }
        }
      ])
    ]);

    const views = totalViews.length > 0 ? totalViews[0].total : 0;
    const engagement = totalEngagement.length > 0 ? totalEngagement[0].total : 0;

    return views > 0 ? (engagement / views) * 100 : 0;
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(filter: AnalyticsFilter, format: 'json' | 'csv' | 'xlsx' = 'json') {
    try {
      const metrics = await this.getDashboardMetrics(filter);
      
      if (format === 'json') {
        return JSON.stringify(metrics, null, 2);
      }
      
      // For CSV and XLSX, we'd need additional libraries
      // This is a simplified implementation
      return JSON.stringify(metrics, null, 2);
    } catch (error) {
      this.logger.error('Error exporting analytics:', error);
      throw error;
    }
  }

  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics() {
    try {
      const now = new Date();
      const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

      const [
        activeStreams,
        activeUsers,
        recentTransactions,
        recentEngagement
      ] = await Promise.all([
        this.streamModel.countDocuments({ status: 'live' }),
        this.userModel.countDocuments({ lastActiveAt: { $gte: lastHour } }),
        this.transactionModel.countDocuments({ createdAt: { $gte: lastHour } }),
        this.streamModel.aggregate([
          {
            $match: {
              createdAt: { $gte: lastHour },
              status: 'completed'
            }
          },
          {
            $group: {
              _id: null,
              engagement: { $sum: { $add: ['$totalLikes', '$totalComments', '$totalShares'] } }
            }
          }
        ])
      ]);

      return {
        activeStreams,
        activeUsers,
        recentTransactions,
        recentEngagement: recentEngagement.length > 0 ? recentEngagement[0].engagement : 0,
        timestamp: now
      };
    } catch (error) {
      this.logger.error('Error getting real-time metrics:', error);
      throw error;
    }
  }
}

export const advancedAnalyticsService = new AdvancedAnalyticsService();
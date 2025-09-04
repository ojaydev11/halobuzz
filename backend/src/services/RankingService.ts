import { LiveStream } from '../models/LiveStream';
import { User } from '../models/User';
import { logger } from '../config/logger';

export class RankingService {
  private weights = {
    viewerCount: 0.3,
    giftsCoins: 0.4,
    aiEngagementScore: 0.3
  };

  async calculateStreamRanking(streamId: string) {
    try {
      const stream = await LiveStream.findById(streamId);
      if (!stream) {
        return { success: false, error: 'Stream not found' };
      }

      // Normalize metrics
      const normalizedViewerCount = await this.normalizeViewerCount(stream.currentViewers);
      const normalizedGiftsCoins = await this.normalizeGiftsCoins(stream.totalCoins);
      const normalizedAiScore = this.normalizeAiEngagementScore(stream.analytics?.engagementRate || 0);

      // Calculate engagement score
      const engagementScore = (
        normalizedViewerCount * this.weights.viewerCount +
        normalizedGiftsCoins * this.weights.giftsCoins +
        normalizedAiScore * this.weights.aiEngagementScore
      );

      // Update stream metrics
      await LiveStream.findByIdAndUpdate(streamId, {
        'metrics.viewerCount': stream.currentViewers,
        'metrics.giftsCoins': stream.totalCoins,
        'metrics.aiEngagementScore': stream.analytics?.engagementRate || 0,
        'metrics.engagementScore': Math.round(engagementScore * 100) / 100
      });

      logger.info(`Stream ranking calculated for ${streamId}: ${engagementScore}`);
      return { success: true, engagementScore };
    } catch (error) {
      logger.error('Failed to calculate stream ranking:', error);
      return { success: false, error: error.message };
    }
  }

  async calculateAllStreamRankings() {
    try {
      const streams = await LiveStream.find({ status: 'live' });
      const results = [];

      for (const stream of streams) {
        const result = await this.calculateStreamRanking(stream._id.toString());
        if (result.success) {
          results.push({ streamId: stream._id, score: result.engagementScore });
        }
      }

      logger.info(`Calculated rankings for ${results.length} streams`);
      return { success: true, results };
    } catch (error) {
      logger.error('Failed to calculate all stream rankings:', error);
      return { success: false, error: error.message };
    }
  }

  async getTopStreams(limit: number = 20, category?: string, country?: string) {
    try {
      const filter: any = { status: 'live' };
      if (category) filter.category = category;
      if (country) filter.country = country;

      const streams = await LiveStream.find(filter)
        .sort({ 'metrics.engagementScore': -1 })
        .limit(limit)
        .populate('hostId', 'username avatar followers ogLevel');

      return {
        success: true,
        data: streams.map(stream => ({
          id: stream._id,
          title: stream.title,
          host: stream.hostId,
          category: stream.category,
          country: stream.country,
          currentViewers: stream.currentViewers,
          totalCoins: stream.totalCoins,
          engagementScore: stream.metrics?.engagementScore || 0,
          thumbnail: stream.thumbnail
        }))
      };
    } catch (error) {
      logger.error('Failed to get top streams:', error);
      return { success: false, error: error.message };
    }
  }

  async getTrendingStreams(limit: number = 20) {
    try {
      // Get streams with high engagement in the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      const streams = await LiveStream.find({
        status: 'live',
        startedAt: { $gte: oneHourAgo }
      })
        .sort({ 'metrics.engagementScore': -1, currentViewers: -1 })
        .limit(limit)
        .populate('hostId', 'username avatar followers ogLevel');

      return {
        success: true,
        data: streams.map(stream => ({
          id: stream._id,
          title: stream.title,
          host: stream.hostId,
          category: stream.category,
          currentViewers: stream.currentViewers,
          totalCoins: stream.totalCoins,
          engagementScore: stream.metrics?.engagementScore || 0,
          thumbnail: stream.thumbnail
        }))
      };
    } catch (error) {
      logger.error('Failed to get trending streams:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserRanking(userId: string) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Calculate user ranking based on multiple factors
      const followerScore = this.normalizeFollowerCount(user.followers);
      const trustScore = user.trust?.score || 0;
      const ogScore = this.normalizeOgLevel(user.ogLevel);
      const totalViewsScore = this.normalizeTotalViews(user.totalViews);

      const userRankingScore = (
        followerScore * 0.3 +
        (trustScore / 100) * 0.3 +
        ogScore * 0.2 +
        totalViewsScore * 0.2
      );

      return {
        success: true,
        data: {
          userId: user._id,
          username: user.username,
          rankingScore: Math.round(userRankingScore * 100) / 100,
          factors: {
            followers: user.followers,
            trustScore,
            ogLevel: user.ogLevel,
            totalViews: user.totalViews
          }
        }
      };
    } catch (error) {
      logger.error('Failed to calculate user ranking:', error);
      return { success: false, error: error.message };
    }
  }

  async getTopCreators(limit: number = 50) {
    try {
      const users = await User.find({ isBanned: false, isVerified: true })
        .sort({ followers: -1, 'trust.score': -1, totalViews: -1 })
        .limit(limit)
        .select('username avatar followers totalViews trust.score ogLevel');

      return {
        success: true,
        data: users.map(user => ({
          id: user._id,
          username: user.username,
          avatar: user.avatar,
          followers: user.followers,
          totalViews: user.totalViews,
          trustScore: user.trust?.score || 0,
          ogLevel: user.ogLevel
        }))
      };
    } catch (error) {
      logger.error('Failed to get top creators:', error);
      return { success: false, error: error.message };
    }
  }

  // Normalization methods
  private async normalizeViewerCount(viewerCount: number): Promise<number> {
    const maxViewers = await LiveStream.aggregate([
      { $group: { _id: null, max: { $max: '$currentViewers' } } }
    ]);
    const max = maxViewers[0]?.max || 1000;
    return Math.min(1, viewerCount / max);
  }

  private async normalizeGiftsCoins(giftsCoins: number): Promise<number> {
    const maxCoins = await LiveStream.aggregate([
      { $group: { _id: null, max: { $max: '$totalCoins' } } }
    ]);
    const max = maxCoins[0]?.max || 10000;
    return Math.min(1, giftsCoins / max);
  }

  private normalizeAiEngagementScore(aiScore: number): number {
    // AI engagement score is already 0-100, normalize to 0-1
    return Math.min(1, aiScore / 100);
  }

  private normalizeFollowerCount(followers: number): number {
    // Normalize follower count (assuming max is 1M)
    return Math.min(1, followers / 1000000);
  }

  private normalizeOgLevel(ogLevel: number): number {
    // OG level is 0-5, normalize to 0-1
    return ogLevel / 5;
  }

  private normalizeTotalViews(totalViews: number): number {
    // Normalize total views (assuming max is 10M)
    return Math.min(1, totalViews / 10000000);
  }

  async updateStreamMetrics(streamId: string) {
    try {
      const stream = await LiveStream.findById(streamId);
      if (!stream) {
        return { success: false, error: 'Stream not found' };
      }

      // Update metrics
      await this.calculateStreamRanking(streamId);

      logger.info(`Stream metrics updated for ${streamId}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to update stream metrics:', error);
      return { success: false, error: error.message };
    }
  }

  async getRankingStats() {
    try {
      const [totalStreams, activeStreams, avgEngagement] = await Promise.all([
        LiveStream.countDocuments(),
        LiveStream.countDocuments({ status: 'live' }),
        LiveStream.aggregate([
          { $group: { _id: null, avg: { $avg: '$metrics.engagementScore' } } }
        ])
      ]);

      return {
        success: true,
        data: {
          totalStreams,
          activeStreams,
          averageEngagementScore: avgEngagement[0]?.avg || 0
        }
      };
    } catch (error) {
      logger.error('Failed to get ranking stats:', error);
      return { success: false, error: error.message };
    }
  }
}

export const rankingService = new RankingService();

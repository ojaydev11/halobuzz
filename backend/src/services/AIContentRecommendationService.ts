import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { User, IUser } from '../models/User';
import { LiveStream, ILiveStream } from '../models/LiveStream';
import { ShortVideo, IShortVideo } from '../models/ShortVideo';
import { AnalyticsEvent, IAnalyticsEvent } from '../analytics/models/AnalyticsEvent';
import { RedisService } from './RedisService';
import { Logger } from '@nestjs/common';

interface UserProfile {
  userId: string;
  preferences: {
    categories: string[];
    languages: string[];
    creators: string[];
    contentTypes: string[];
    watchTime: number;
    engagementRate: number;
    sharingRate: number;
  };
  behavior: {
    watchHistory: Array<{
      contentId: string;
      contentType: 'stream' | 'video';
      watchTime: number;
      engagement: number;
      timestamp: Date;
    }>;
    searchHistory: string[];
    interactionHistory: Array<{
      contentId: string;
      action: 'like' | 'share' | 'comment' | 'gift';
      timestamp: Date;
    }>;
  };
  demographics: {
    age: number;
    location: string;
    interests: string[];
    deviceType: 'mobile' | 'desktop' | 'tablet';
  };
}

interface ContentFeatures {
  contentId: string;
  contentType: 'stream' | 'video';
  features: {
    category: string;
    language: string;
    creatorId: string;
    duration: number;
    quality: 'low' | 'medium' | 'high';
    tags: string[];
    engagement: {
      likes: number;
      shares: number;
      comments: number;
      views: number;
      watchTime: number;
    };
    temporal: {
      createdAt: Date;
      peakHours: boolean;
      trending: boolean;
    };
  };
}

interface RecommendationResult {
  contentId: string;
  contentType: 'stream' | 'video';
  score: number;
  reason: string;
  confidence: number;
  metadata: {
    category: string;
    creator: string;
    duration: number;
    engagement: number;
  };
}

@Injectable()
export class AIContentRecommendationService {
  private readonly logger = new Logger(AIContentRecommendationService.name);

  constructor(
    private userModel: Model<IUser>,
    private liveStreamModel: Model<ILiveStream>,
    private shortVideoModel: Model<IShortVideo>,
    private analyticsEventModel: Model<IAnalyticsEvent>,
    private redisService: RedisService,
  ) {}

  /**
   * Generate personalized content recommendations for a user
   */
  async generateRecommendations(
    userId: string,
    limit: number = 20,
    contentType?: 'stream' | 'video' | 'all',
  ): Promise<RecommendationResult[]> {
    try {
      // Get user profile
      const userProfile = await this.buildUserProfile(userId);
      
      // Get available content
      const availableContent = await this.getAvailableContent(contentType);
      
      // Calculate recommendation scores
      const recommendations = await this.calculateRecommendationScores(
        userProfile,
        availableContent,
      );
      
      // Sort by score and return top recommendations
      const sortedRecommendations = recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
      
      // Cache recommendations for performance
      await this.cacheRecommendations(userId, sortedRecommendations);
      
      this.logger.log(`Generated ${sortedRecommendations.length} recommendations for user ${userId}`);
      
      return sortedRecommendations;
    } catch (error) {
      this.logger.error(`Error generating recommendations for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Build comprehensive user profile from various data sources
   */
  private async buildUserProfile(userId: string): Promise<UserProfile> {
    // Get user basic info
    const user = await this.userModel.findById(userId).select('preferences demographics');
    
    // Get user behavior data from analytics
    const behaviorData = await this.getUserBehaviorData(userId);
    
    // Get user preferences from interactions
    const preferences = await this.getUserPreferences(userId);
    
    return {
      userId,
      preferences: {
        categories: preferences.categories,
        languages: preferences.languages,
        creators: preferences.creators,
        contentTypes: preferences.contentTypes,
        watchTime: behaviorData.totalWatchTime,
        engagementRate: behaviorData.engagementRate,
        sharingRate: behaviorData.sharingRate,
      },
      behavior: {
        watchHistory: behaviorData.watchHistory,
        searchHistory: behaviorData.searchHistory,
        interactionHistory: behaviorData.interactionHistory,
      },
      demographics: {
        age: user?.demographics?.age || 25,
        location: user?.demographics?.location || 'unknown',
        interests: user?.demographics?.interests || [],
        deviceType: user?.demographics?.deviceType || 'mobile',
      },
    };
  }

  /**
   * Get user behavior data from analytics events
   */
  private async getUserBehaviorData(userId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const events = await this.analyticsEventModel.find({
      userId,
      timestamp: { $gte: thirtyDaysAgo },
    }).sort({ timestamp: -1 });

    const watchHistory = [];
    const searchHistory = [];
    const interactionHistory = [];
    let totalWatchTime = 0;
    let totalEngagements = 0;
    let totalShares = 0;

    for (const event of events) {
      switch (event.eventType) {
        case 'content_watch':
          watchHistory.push({
            contentId: event.metadata.contentId,
            contentType: event.metadata.contentType,
            watchTime: event.metadata.watchTime || 0,
            engagement: event.metadata.engagement || 0,
            timestamp: event.timestamp,
          });
          totalWatchTime += event.metadata.watchTime || 0;
          break;
        case 'content_search':
          searchHistory.push(event.metadata.query);
          break;
        case 'content_like':
        case 'content_share':
        case 'content_comment':
        case 'content_gift':
          interactionHistory.push({
            contentId: event.metadata.contentId,
            action: event.eventType.replace('content_', ''),
            timestamp: event.timestamp,
          });
          totalEngagements++;
          if (event.eventType === 'content_share') totalShares++;
          break;
      }
    }

    return {
      watchHistory,
      searchHistory,
      interactionHistory,
      totalWatchTime,
      engagementRate: totalEngagements / Math.max(watchHistory.length, 1),
      sharingRate: totalShares / Math.max(watchHistory.length, 1),
    };
  }

  /**
   * Extract user preferences from behavior data
   */
  private async getUserPreferences(userId: string) {
    const behaviorData = await this.getUserBehaviorData(userId);
    
    // Analyze watch history to extract preferences
    const categoryCounts = {};
    const languageCounts = {};
    const creatorCounts = {};
    const contentTypeCounts = {};

    for (const watch of behaviorData.watchHistory) {
      const content = await this.getContentById(watch.contentId, watch.contentType);
      if (content) {
        categoryCounts[content.category] = (categoryCounts[content.category] || 0) + 1;
        languageCounts[content.language] = (languageCounts[content.language] || 0) + 1;
        creatorCounts[content.creatorId] = (creatorCounts[content.creatorId] || 0) + 1;
        contentTypeCounts[watch.contentType] = (contentTypeCounts[watch.contentType] || 0) + 1;
      }
    }

    return {
      categories: Object.keys(categoryCounts).sort((a, b) => categoryCounts[b] - categoryCounts[a]).slice(0, 5),
      languages: Object.keys(languageCounts).sort((a, b) => languageCounts[b] - languageCounts[a]).slice(0, 3),
      creators: Object.keys(creatorCounts).sort((a, b) => creatorCounts[b] - creatorCounts[a]).slice(0, 10),
      contentTypes: Object.keys(contentTypeCounts).sort((a, b) => contentTypeCounts[b] - contentTypeCounts[a]),
    };
  }

  /**
   * Get available content for recommendations
   */
  private async getAvailableContent(contentType?: 'stream' | 'video' | 'all') {
    const content = [];
    
    if (contentType === 'all' || contentType === 'stream') {
      const streams = await this.liveStreamModel.find({
        status: 'live',
        isPublic: true,
      }).limit(100);
      
      for (const stream of streams) {
        content.push({
          contentId: stream._id.toString(),
          contentType: 'stream' as const,
          features: await this.extractContentFeatures(stream, 'stream'),
        });
      }
    }
    
    if (contentType === 'all' || contentType === 'video') {
      const videos = await this.shortVideoModel.find({
        isPublic: true,
        status: 'published',
      }).sort({ createdAt: -1 }).limit(200);
      
      for (const video of videos) {
        content.push({
          contentId: video._id.toString(),
          contentType: 'video' as const,
          features: await this.extractContentFeatures(video, 'video'),
        });
      }
    }
    
    return content;
  }

  /**
   * Extract features from content for ML algorithms
   */
  private async extractContentFeatures(content: any, contentType: 'stream' | 'video'): Promise<ContentFeatures['features']> {
    // Get engagement data from analytics
    const engagementData = await this.getContentEngagementData(content._id.toString());
    
    return {
      category: content.category || 'general',
      language: content.language || 'en',
      creatorId: content.creatorId || content.userId,
      duration: contentType === 'stream' ? 0 : (content.duration || 0),
      quality: this.determineContentQuality(content),
      tags: content.tags || [],
      engagement: {
        likes: engagementData.likes,
        shares: engagementData.shares,
        comments: engagementData.comments,
        views: engagementData.views,
        watchTime: engagementData.watchTime,
      },
      temporal: {
        createdAt: content.createdAt,
        peakHours: this.isPeakHours(),
        trending: await this.isTrending(content._id.toString()),
      },
    };
  }

  /**
   * Get content engagement data from analytics
   */
  private async getContentEngagementData(contentId: string) {
    const events = await this.analyticsEventModel.find({
      'metadata.contentId': contentId,
    });

    let likes = 0, shares = 0, comments = 0, views = 0, watchTime = 0;

    for (const event of events) {
      switch (event.eventType) {
        case 'content_like':
          likes++;
          break;
        case 'content_share':
          shares++;
          break;
        case 'content_comment':
          comments++;
          break;
        case 'content_watch':
          views++;
          watchTime += event.metadata.watchTime || 0;
          break;
      }
    }

    return { likes, shares, comments, views, watchTime };
  }

  /**
   * Calculate recommendation scores using ML algorithms
   */
  private async calculateRecommendationScores(
    userProfile: UserProfile,
    availableContent: Array<{ contentId: string; contentType: 'stream' | 'video'; features: ContentFeatures['features'] }>,
  ): Promise<RecommendationResult[]> {
    const recommendations = [];

    for (const content of availableContent) {
      const score = await this.calculateContentScore(userProfile, content);
      
      if (score > 0.1) { // Only include content with meaningful scores
        recommendations.push({
          contentId: content.contentId,
          contentType: content.contentType,
          score,
          reason: this.generateRecommendationReason(userProfile, content, score),
          confidence: this.calculateConfidence(userProfile, content),
          metadata: {
            category: content.features.category,
            creator: content.features.creatorId,
            duration: content.features.duration,
            engagement: content.features.engagement.views,
          },
        });
      }
    }

    return recommendations;
  }

  /**
   * Calculate content score using collaborative filtering and content-based filtering
   */
  private async calculateContentScore(
    userProfile: UserProfile,
    content: { contentId: string; contentType: 'stream' | 'video'; features: ContentFeatures['features'] },
  ): Promise<number> {
    let score = 0;

    // Content-based filtering (40% weight)
    score += this.calculateContentBasedScore(userProfile, content) * 0.4;

    // Collaborative filtering (30% weight)
    score += await this.calculateCollaborativeScore(userProfile, content) * 0.3;

    // Trending and popularity (20% weight)
    score += this.calculatePopularityScore(content) * 0.2;

    // Temporal relevance (10% weight)
    score += this.calculateTemporalScore(content) * 0.1;

    return Math.min(score, 1.0); // Cap at 1.0
  }

  /**
   * Content-based filtering score
   */
  private calculateContentBasedScore(
    userProfile: UserProfile,
    content: { contentId: string; contentType: 'stream' | 'video'; features: ContentFeatures['features'] },
  ): number {
    let score = 0;

    // Category preference match
    if (userProfile.preferences.categories.includes(content.features.category)) {
      score += 0.3;
    }

    // Language preference match
    if (userProfile.preferences.languages.includes(content.features.language)) {
      score += 0.2;
    }

    // Creator preference match
    if (userProfile.preferences.creators.includes(content.features.creatorId)) {
      score += 0.3;
    }

    // Content type preference match
    if (userProfile.preferences.contentTypes.includes(content.contentType)) {
      score += 0.2;
    }

    return score;
  }

  /**
   * Collaborative filtering score based on similar users
   */
  private async calculateCollaborativeScore(
    userProfile: UserProfile,
    content: { contentId: string; contentType: 'stream' | 'video'; features: ContentFeatures['features'] },
  ): Promise<number> {
    // Find users with similar preferences
    const similarUsers = await this.findSimilarUsers(userProfile);
    
    if (similarUsers.length === 0) return 0;

    // Calculate average rating from similar users for this content
    let totalScore = 0;
    let userCount = 0;

    for (const similarUser of similarUsers) {
      const userRating = await this.getUserContentRating(similarUser.userId, content.contentId);
      if (userRating > 0) {
        totalScore += userRating * similarUser.similarity;
        userCount++;
      }
    }

    return userCount > 0 ? totalScore / userCount : 0;
  }

  /**
   * Find users with similar preferences and behavior
   */
  private async findSimilarUsers(userProfile: UserProfile): Promise<Array<{ userId: string; similarity: number }>> {
    const similarUsers = [];
    
    // Get users with similar demographics and preferences
    const candidateUsers = await this.userModel.find({
      'demographics.age': { $gte: userProfile.demographics.age - 5, $lte: userProfile.demographics.age + 5 },
      'demographics.location': userProfile.demographics.location,
    }).limit(100);

    for (const candidate of candidateUsers) {
      if (candidate._id.toString() === userProfile.userId) continue;

      const candidateProfile = await this.buildUserProfile(candidate._id.toString());
      const similarity = this.calculateUserSimilarity(userProfile, candidateProfile);
      
      if (similarity > 0.3) {
        similarUsers.push({
          userId: candidate._id.toString(),
          similarity,
        });
      }
    }

    return similarUsers.sort((a, b) => b.similarity - a.similarity).slice(0, 20);
  }

  /**
   * Calculate similarity between two user profiles
   */
  private calculateUserSimilarity(profile1: UserProfile, profile2: UserProfile): number {
    let similarity = 0;

    // Demographics similarity (30% weight)
    if (profile1.demographics.age === profile2.demographics.age) similarity += 0.1;
    if (profile1.demographics.location === profile2.demographics.location) similarity += 0.1;
    if (profile1.demographics.deviceType === profile2.demographics.deviceType) similarity += 0.1;

    // Preferences similarity (40% weight)
    const categoryOverlap = this.calculateArrayOverlap(profile1.preferences.categories, profile2.preferences.categories);
    const languageOverlap = this.calculateArrayOverlap(profile1.preferences.languages, profile2.preferences.languages);
    const creatorOverlap = this.calculateArrayOverlap(profile1.preferences.creators, profile2.preferences.creators);
    
    similarity += categoryOverlap * 0.15;
    similarity += languageOverlap * 0.1;
    similarity += creatorOverlap * 0.15;

    // Behavior similarity (30% weight)
    const watchTimeSimilarity = 1 - Math.abs(profile1.preferences.watchTime - profile2.preferences.watchTime) / Math.max(profile1.preferences.watchTime, profile2.preferences.watchTime, 1);
    const engagementSimilarity = 1 - Math.abs(profile1.preferences.engagementRate - profile2.preferences.engagementRate);
    
    similarity += watchTimeSimilarity * 0.15;
    similarity += engagementSimilarity * 0.15;

    return Math.min(similarity, 1.0);
  }

  /**
   * Calculate overlap between two arrays
   */
  private calculateArrayOverlap(arr1: string[], arr2: string[]): number {
    if (arr1.length === 0 || arr2.length === 0) return 0;
    
    const set1 = new Set(arr1);
    const set2 = new Set(arr2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    
    return intersection.size / Math.max(set1.size, set2.size);
  }

  /**
   * Get user's rating for specific content
   */
  private async getUserContentRating(userId: string, contentId: string): Promise<number> {
    const events = await this.analyticsEventModel.find({
      userId,
      'metadata.contentId': contentId,
    });

    let rating = 0;
    let weight = 0;

    for (const event of events) {
      switch (event.eventType) {
        case 'content_like':
          rating += 0.8;
          weight += 1;
          break;
        case 'content_share':
          rating += 1.0;
          weight += 1;
          break;
        case 'content_comment':
          rating += 0.6;
          weight += 1;
          break;
        case 'content_watch':
          const watchTime = event.metadata.watchTime || 0;
          const duration = event.metadata.duration || 1;
          rating += (watchTime / duration) * 0.5;
          weight += 0.5;
          break;
      }
    }

    return weight > 0 ? rating / weight : 0;
  }

  /**
   * Calculate popularity score based on engagement metrics
   */
  private calculatePopularityScore(content: { contentId: string; contentType: 'stream' | 'video'; features: ContentFeatures['features'] }): number {
    const engagement = content.features.engagement;
    const views = Math.max(engagement.views, 1);
    
    const engagementRate = (engagement.likes + engagement.shares + engagement.comments) / views;
    const watchTimeRate = engagement.watchTime / views;
    
    return Math.min((engagementRate * 0.6 + watchTimeRate * 0.4), 1.0);
  }

  /**
   * Calculate temporal relevance score
   */
  private calculateTemporalScore(content: { contentId: string; contentType: 'stream' | 'video'; features: ContentFeatures['features'] }): number {
    const now = new Date();
    const createdAt = content.features.temporal.createdAt;
    const ageInHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    
    // Fresh content gets higher score
    if (ageInHours < 1) return 1.0;
    if (ageInHours < 24) return 0.8;
    if (ageInHours < 168) return 0.6; // 1 week
    if (ageInHours < 720) return 0.4; // 1 month
    return 0.2;
  }

  /**
   * Generate human-readable reason for recommendation
   */
  private generateRecommendationReason(
    userProfile: UserProfile,
    content: { contentId: string; contentType: 'stream' | 'video'; features: ContentFeatures['features'] },
    score: number,
  ): string {
    const reasons = [];

    if (userProfile.preferences.categories.includes(content.features.category)) {
      reasons.push(`You like ${content.features.category} content`);
    }

    if (userProfile.preferences.creators.includes(content.features.creatorId)) {
      reasons.push(`You follow this creator`);
    }

    if (content.features.temporal.trending) {
      reasons.push(`This is trending now`);
    }

    if (content.features.temporal.peakHours) {
      reasons.push(`Popular during peak hours`);
    }

    if (reasons.length === 0) {
      reasons.push(`Based on your viewing history`);
    }

    return reasons.join(', ');
  }

  /**
   * Calculate confidence score for recommendation
   */
  private calculateConfidence(
    userProfile: UserProfile,
    content: { contentId: string; contentType: 'stream' | 'video'; features: ContentFeatures['features'] },
  ): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on user data availability
    if (userProfile.behavior.watchHistory.length > 10) confidence += 0.2;
    if (userProfile.behavior.interactionHistory.length > 5) confidence += 0.2;
    if (userProfile.preferences.categories.length > 0) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Determine content quality based on various factors
   */
  private determineContentQuality(content: any): 'low' | 'medium' | 'high' {
    const views = content.views || 0;
    const likes = content.likes || 0;
    const duration = content.duration || 0;

    if (views > 10000 && likes > 1000 && duration > 30) return 'high';
    if (views > 1000 && likes > 100 && duration > 10) return 'medium';
    return 'low';
  }

  /**
   * Check if current time is peak hours
   */
  private isPeakHours(): boolean {
    const hour = new Date().getHours();
    return hour >= 19 && hour <= 23; // 7 PM to 11 PM
  }

  /**
   * Check if content is trending
   */
  private async isTrending(contentId: string): Promise<boolean> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const recentEngagement = await this.analyticsEventModel.countDocuments({
      'metadata.contentId': contentId,
      eventType: { $in: ['content_like', 'content_share', 'content_comment'] },
      timestamp: { $gte: oneHourAgo },
    });

    return recentEngagement > 50; // Trending threshold
  }

  /**
   * Get content by ID and type
   */
  private async getContentById(contentId: string, contentType: 'stream' | 'video') {
    if (contentType === 'stream') {
      return await this.liveStreamModel.findById(contentId);
    } else {
      return await this.shortVideoModel.findById(contentId);
    }
  }

  /**
   * Cache recommendations for performance
   */
  private async cacheRecommendations(userId: string, recommendations: RecommendationResult[]): Promise<void> {
    const cacheKey = `recommendations:${userId}`;
    await this.redisService.setex(cacheKey, 300, JSON.stringify(recommendations)); // 5 minutes cache
  }

  /**
   * Get cached recommendations
   */
  async getCachedRecommendations(userId: string): Promise<RecommendationResult[] | null> {
    const cacheKey = `recommendations:${userId}`;
    const cached = await this.redisService.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  }

  /**
   * Update user preferences based on new interactions
   */
  async updateUserPreferences(userId: string, contentId: string, contentType: 'stream' | 'video', action: string): Promise<void> {
    // Clear cached recommendations to force regeneration
    const cacheKey = `recommendations:${userId}`;
    await this.redisService.del(cacheKey);
    
    this.logger.log(`Updated preferences for user ${userId} based on ${action} for ${contentType} ${contentId}`);
  }

  /**
   * Get recommendation analytics for admin dashboard
   */
  async getRecommendationAnalytics(): Promise<{
    totalRecommendations: number;
    averageScore: number;
    topCategories: Array<{ category: string; count: number }>;
    userEngagement: {
      clickThroughRate: number;
      watchTime: number;
      conversionRate: number;
    };
  }> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const recommendationEvents = await this.analyticsEventModel.find({
      eventType: 'recommendation_click',
      timestamp: { $gte: thirtyDaysAgo },
    });

    const totalRecommendations = recommendationEvents.length;
    const averageScore = recommendationEvents.reduce((sum, event) => sum + (event.metadata.score || 0), 0) / totalRecommendations;

    // Analyze top categories
    const categoryCounts = {};
    for (const event of recommendationEvents) {
      const category = event.metadata.category || 'unknown';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    }

    const topCategories = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count: Number(count) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate engagement metrics
    const clickThroughRate = totalRecommendations > 0 ? 
      recommendationEvents.filter(e => e.metadata.clicked).length / totalRecommendations : 0;

    const watchTime = recommendationEvents.reduce((sum, event) => sum + (event.metadata.watchTime || 0), 0);
    const conversionRate = totalRecommendations > 0 ?
      recommendationEvents.filter(e => e.metadata.converted).length / totalRecommendations : 0;

    return {
      totalRecommendations,
      averageScore,
      topCategories,
      userEngagement: {
        clickThroughRate,
        watchTime,
        conversionRate,
      },
    };
  }
}

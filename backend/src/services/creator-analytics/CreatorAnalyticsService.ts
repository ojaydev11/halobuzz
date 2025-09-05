import { logger } from '@/config/logger';
import mongoose from 'mongoose';

export interface CreatorMetrics {
  totalViews: number;
  totalLikes: number;
  totalShares: number;
  totalComments: number;
  totalFollowers: number;
  totalSubscribers: number;
  totalRevenue: number;
  averageEngagementRate: number;
  averageViewDuration: number;
  contentCount: number;
  liveStreamCount: number;
  nftCount: number;
  topPerformingContent: Array<{
    contentId: string;
    title: string;
    views: number;
    engagement: number;
    revenue: number;
  }>;
  growthMetrics: {
    followerGrowth: number;
    viewGrowth: number;
    revenueGrowth: number;
    engagementGrowth: number;
  };
  performanceTrends: Array<{
    date: string;
    views: number;
    likes: number;
    shares: number;
    comments: number;
    revenue: number;
  }>;
}

export interface AudienceAnalytics {
  demographics: {
    ageGroups: Record<string, number>;
    genders: Record<string, number>;
    countries: Record<string, number>;
    languages: Record<string, number>;
  };
  engagement: {
    averageEngagementRate: number;
    peakEngagementTimes: number[];
    mostEngagedContent: string[];
    engagementByPlatform: Record<string, number>;
  };
  behavior: {
    averageSessionDuration: number;
    bounceRate: number;
    returnViewerRate: number;
    contentCompletionRate: number;
    sharingBehavior: {
      shareRate: number;
      mostSharedContent: string[];
      sharingPlatforms: Record<string, number>;
    };
  };
  loyalty: {
    subscriberRetentionRate: number;
    followerRetentionRate: number;
    topFans: Array<{
      userId: string;
      username: string;
      engagementScore: number;
      totalSpent: number;
    }>;
    communityHealth: number;
  };
  insights: {
    audienceGrowth: Array<{
      date: string;
      newFollowers: number;
      newSubscribers: number;
      totalAudience: number;
    }>;
    contentPreferences: Array<{
      category: string;
      engagement: number;
      views: number;
      preference: number;
    }>;
    optimalPostingTimes: Array<{
      dayOfWeek: string;
      hour: number;
      engagement: number;
    }>;
  };
}

export interface OptimizationTips {
  contentOptimization: Array<{
    tip: string;
    category: 'title' | 'thumbnail' | 'description' | 'timing' | 'hashtags';
    impact: 'high' | 'medium' | 'low';
    description: string;
    examples: string[];
  }>;
  engagementOptimization: Array<{
    tip: string;
    category: 'interaction' | 'community' | 'collaboration' | 'consistency';
    impact: 'high' | 'medium' | 'low';
    description: string;
    actionableSteps: string[];
  }>;
  revenueOptimization: Array<{
    tip: string;
    category: 'monetization' | 'pricing' | 'subscriptions' | 'merchandise';
    impact: 'high' | 'medium' | 'low';
    description: string;
    expectedIncrease: string;
  }>;
  growthOptimization: Array<{
    tip: string;
    category: 'discovery' | 'collaboration' | 'trending' | 'cross_platform';
    impact: 'high' | 'medium' | 'low';
    description: string;
    implementation: string;
  }>;
  priority: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

export interface RevenueOptimization {
  currentRevenue: {
    total: number;
    subscriptions: number;
    donations: number;
    merchandise: number;
    sponsorships: number;
    nftSales: number;
  };
  revenueStreams: Array<{
    stream: string;
    currentRevenue: number;
    potentialRevenue: number;
    growthOpportunity: number;
    recommendations: string[];
  }>;
  pricingAnalysis: {
    subscriptionTiers: Array<{
      tierId: string;
      name: string;
      currentPrice: number;
      optimalPrice: number;
      demand: number;
      recommendation: string;
    }>;
    merchandisePricing: Array<{
      item: string;
      currentPrice: number;
      optimalPrice: number;
      demand: number;
      recommendation: string;
    }>;
  };
  monetizationOpportunities: Array<{
    opportunity: string;
    potentialRevenue: number;
    implementation: string;
    timeline: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  projections: {
    nextMonth: number;
    next3Months: number;
    next6Months: number;
    nextYear: number;
  };
}

export class CreatorAnalyticsService {
  private static instance: CreatorAnalyticsService;
  private analyticsCache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    logger.info('CreatorAnalyticsService initialized');
  }

  static getInstance(): CreatorAnalyticsService {
    if (!CreatorAnalyticsService.instance) {
      CreatorAnalyticsService.instance = new CreatorAnalyticsService();
    }
    return CreatorAnalyticsService.instance;
  }

  /**
   * Advanced performance metrics
   */
  async getPerformanceMetrics(creatorId: string): Promise<CreatorMetrics> {
    try {
      const cacheKey = `metrics_${creatorId}`;
      
      // Check cache first
      if (this.isCacheValid(cacheKey)) {
        return this.analyticsCache.get(cacheKey);
      }

      // Get basic metrics
      const basicMetrics = await this.getBasicMetrics(creatorId);
      
      // Get top performing content
      const topPerformingContent = await this.getTopPerformingContent(creatorId);
      
      // Get growth metrics
      const growthMetrics = await this.getGrowthMetrics(creatorId);
      
      // Get performance trends
      const performanceTrends = await this.getPerformanceTrends(creatorId, 30);

      const metrics: CreatorMetrics = {
        totalViews: basicMetrics.totalViews || 0,
        totalLikes: basicMetrics.totalLikes || 0,
        totalShares: basicMetrics.totalShares || 0,
        totalComments: basicMetrics.totalComments || 0,
        totalRevenue: basicMetrics.totalRevenue || 0,
        contentCount: basicMetrics.contentCount || 0,
        totalFollowers: 0,
        totalSubscribers: 0,
        averageEngagementRate: 0,
        averageViewDuration: basicMetrics.averageViewDuration || 0,
        liveStreamCount: 0,
        nftCount: 0,
        topPerformingContent,
        growthMetrics,
        performanceTrends
      };

      // Cache results
      this.analyticsCache.set(cacheKey, metrics);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);

      logger.info('Performance metrics generated', {
        creatorId,
        totalViews: metrics.totalViews,
        totalRevenue: metrics.totalRevenue,
        contentCount: metrics.contentCount
      });

      return metrics;
    } catch (error) {
      logger.error('Error getting performance metrics:', error);
      throw error;
    }
  }

  /**
   * Audience demographics and insights
   */
  async getAudienceInsights(creatorId: string): Promise<AudienceAnalytics> {
    try {
      const cacheKey = `audience_${creatorId}`;
      
      // Check cache first
      if (this.isCacheValid(cacheKey)) {
        return this.analyticsCache.get(cacheKey);
      }

      // Get demographics
      const demographics = await this.getAudienceDemographics(creatorId);
      
      // Get engagement analytics
      const engagement = await this.getEngagementAnalytics(creatorId);
      
      // Get behavior analytics
      const behavior = await this.getBehaviorAnalytics(creatorId);
      
      // Get loyalty metrics
      const loyalty = await this.getLoyaltyMetrics(creatorId);
      
      // Get insights
      const insights = await this.getAudienceInsightsData(creatorId);

      const analytics: AudienceAnalytics = {
        demographics,
        engagement,
        behavior,
        loyalty,
        insights
      };

      // Cache results
      this.analyticsCache.set(cacheKey, analytics);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);

      logger.info('Audience insights generated', {
        creatorId,
        totalFollowers: demographics.ageGroups ? Object.values(demographics.ageGroups).reduce((a, b) => a + b, 0) : 0,
        averageEngagementRate: engagement.averageEngagementRate
      });

      return analytics;
    } catch (error) {
      logger.error('Error getting audience insights:', error);
      throw error;
    }
  }

  /**
   * Content optimization suggestions
   */
  async getContentOptimizationTips(creatorId: string): Promise<OptimizationTips> {
    try {
      const cacheKey = `optimization_${creatorId}`;
      
      // Check cache first
      if (this.isCacheValid(cacheKey)) {
        return this.analyticsCache.get(cacheKey);
      }

      // Get performance metrics for analysis
      const metrics = await this.getPerformanceMetrics(creatorId);
      const audienceInsights = await this.getAudienceInsights(creatorId);

      // Generate optimization tips
      const contentOptimization = await this.generateContentOptimizationTips(metrics, audienceInsights);
      const engagementOptimization = await this.generateEngagementOptimizationTips(metrics, audienceInsights);
      const revenueOptimization = await this.generateRevenueOptimizationTips(metrics);
      const growthOptimization = await this.generateGrowthOptimizationTips(metrics, audienceInsights);

      // Prioritize tips
      const priority = this.prioritizeTips(contentOptimization, engagementOptimization, revenueOptimization, growthOptimization);

      const tips: OptimizationTips = {
        contentOptimization,
        engagementOptimization,
        revenueOptimization,
        growthOptimization,
        priority
      };

      // Cache results
      this.analyticsCache.set(cacheKey, tips);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);

      logger.info('Content optimization tips generated', {
        creatorId,
        contentTips: contentOptimization.length,
        engagementTips: engagementOptimization.length,
        revenueTips: revenueOptimization.length,
        growthTips: growthOptimization.length
      });

      return tips;
    } catch (error) {
      logger.error('Error getting content optimization tips:', error);
      throw error;
    }
  }

  /**
   * Revenue optimization analysis
   */
  async analyzeRevenueOptimization(creatorId: string): Promise<RevenueOptimization> {
    try {
      const cacheKey = `revenue_${creatorId}`;
      
      // Check cache first
      if (this.isCacheValid(cacheKey)) {
        return this.analyticsCache.get(cacheKey);
      }

      // Get current revenue breakdown
      const currentRevenue = await this.getCurrentRevenueBreakdown(creatorId);
      
      // Analyze revenue streams
      const revenueStreams = await this.analyzeRevenueStreams(creatorId);
      
      // Analyze pricing
      const pricingAnalysis = await this.analyzePricing(creatorId);
      
      // Identify monetization opportunities
      const monetizationOpportunities = await this.identifyMonetizationOpportunities(creatorId);
      
      // Generate projections
      const projections = await this.generateRevenueProjections(creatorId);

      const optimization: RevenueOptimization = {
        currentRevenue,
        revenueStreams,
        pricingAnalysis,
        monetizationOpportunities,
        projections
      };

      // Cache results
      this.analyticsCache.set(cacheKey, optimization);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);

      logger.info('Revenue optimization analysis completed', {
        creatorId,
        totalRevenue: currentRevenue.total,
        revenueStreams: revenueStreams.length,
        opportunities: monetizationOpportunities.length
      });

      return optimization;
    } catch (error) {
      logger.error('Error analyzing revenue optimization:', error);
      throw error;
    }
  }

  /**
   * Get real-time analytics dashboard data
   */
  async getDashboardData(creatorId: string): Promise<{
    metrics: CreatorMetrics;
    audience: AudienceAnalytics;
    optimization: OptimizationTips;
    revenue: RevenueOptimization;
    lastUpdated: Date;
  }> {
    try {
      const [metrics, audience, optimization, revenue] = await Promise.all([
        this.getPerformanceMetrics(creatorId),
        this.getAudienceInsights(creatorId),
        this.getContentOptimizationTips(creatorId),
        this.analyzeRevenueOptimization(creatorId)
      ]);

      const dashboardData = {
        metrics,
        audience,
        optimization,
        revenue,
        lastUpdated: new Date()
      };

      logger.info('Dashboard data generated', {
        creatorId,
        lastUpdated: dashboardData.lastUpdated
      });

      return dashboardData;
    } catch (error) {
      logger.error('Error getting dashboard data:', error);
      throw error;
    }
  }

  // Private helper methods
  private async getBasicMetrics(creatorId: string): Promise<Partial<CreatorMetrics>> {
    // Mock implementation - in real app, query actual data
    return {
      totalViews: 1500000,
      totalLikes: 75000,
      totalShares: 12000,
      totalComments: 8500,
      totalFollowers: 45000,
      totalSubscribers: 1200,
      totalRevenue: 25000,
      averageEngagementRate: 0.08,
      averageViewDuration: 180,
      contentCount: 150,
      liveStreamCount: 45,
      nftCount: 8
    };
  }

  private async getTopPerformingContent(creatorId: string): Promise<Array<{
    contentId: string;
    title: string;
    views: number;
    engagement: number;
    revenue: number;
  }>> {
    // Mock implementation
    return [
      {
        contentId: 'content_1',
        title: 'Amazing Dance Performance',
        views: 250000,
        engagement: 0.12,
        revenue: 5000
      },
      {
        contentId: 'content_2',
        title: 'Behind the Scenes',
        views: 180000,
        engagement: 0.15,
        revenue: 3500
      }
    ];
  }

  private async getGrowthMetrics(creatorId: string): Promise<{
    followerGrowth: number;
    viewGrowth: number;
    revenueGrowth: number;
    engagementGrowth: number;
  }> {
    // Mock implementation
    return {
      followerGrowth: 15.5,
      viewGrowth: 22.3,
      revenueGrowth: 35.7,
      engagementGrowth: 8.2
    };
  }

  private async getPerformanceTrends(creatorId: string, days: number): Promise<Array<{
    date: string;
    views: number;
    likes: number;
    shares: number;
    comments: number;
    revenue: number;
  }>> {
    const trends = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      trends.push({
        date: date.toISOString().split('T')[0],
        views: Math.floor(Math.random() * 10000) + 5000,
        likes: Math.floor(Math.random() * 500) + 200,
        shares: Math.floor(Math.random() * 100) + 50,
        comments: Math.floor(Math.random() * 200) + 100,
        revenue: Math.floor(Math.random() * 500) + 100
      });
    }

    return trends;
  }

  private async getAudienceDemographics(creatorId: string): Promise<{
    ageGroups: Record<string, number>;
    genders: Record<string, number>;
    countries: Record<string, number>;
    languages: Record<string, number>;
  }> {
    return {
      ageGroups: { '18-24': 35, '25-34': 40, '35-44': 20, '45+': 5 },
      genders: { 'female': 65, 'male': 30, 'other': 5 },
      countries: { 'US': 45, 'UK': 20, 'CA': 15, 'AU': 10, 'Other': 10 },
      languages: { 'en': 80, 'es': 10, 'fr': 5, 'other': 5 }
    };
  }

  private async getEngagementAnalytics(creatorId: string): Promise<{
    averageEngagementRate: number;
    peakEngagementTimes: number[];
    mostEngagedContent: string[];
    engagementByPlatform: Record<string, number>;
  }> {
    return {
      averageEngagementRate: 0.08,
      peakEngagementTimes: [19, 20, 21, 22],
      mostEngagedContent: ['content_1', 'content_2', 'content_3'],
      engagementByPlatform: { 'mobile': 70, 'desktop': 25, 'tablet': 5 }
    };
  }

  private async getBehaviorAnalytics(creatorId: string): Promise<{
    averageSessionDuration: number;
    bounceRate: number;
    returnViewerRate: number;
    contentCompletionRate: number;
    sharingBehavior: {
      shareRate: number;
      mostSharedContent: string[];
      sharingPlatforms: Record<string, number>;
    };
  }> {
    return {
      averageSessionDuration: 420,
      bounceRate: 0.25,
      returnViewerRate: 0.65,
      contentCompletionRate: 0.75,
      sharingBehavior: {
        shareRate: 0.05,
        mostSharedContent: ['content_1', 'content_2'],
        sharingPlatforms: { 'instagram': 40, 'twitter': 30, 'facebook': 20, 'other': 10 }
      }
    };
  }

  private async getLoyaltyMetrics(creatorId: string): Promise<{
    subscriberRetentionRate: number;
    followerRetentionRate: number;
    topFans: Array<{
      userId: string;
      username: string;
      engagementScore: number;
      totalSpent: number;
    }>;
    communityHealth: number;
  }> {
    return {
      subscriberRetentionRate: 0.85,
      followerRetentionRate: 0.70,
      topFans: [
        { userId: 'user_1', username: 'fan1', engagementScore: 95, totalSpent: 500 },
        { userId: 'user_2', username: 'fan2', engagementScore: 90, totalSpent: 400 }
      ],
      communityHealth: 0.82
    };
  }

  private async getAudienceInsightsData(creatorId: string): Promise<{
    audienceGrowth: Array<{
      date: string;
      newFollowers: number;
      newSubscribers: number;
      totalAudience: number;
    }>;
    contentPreferences: Array<{
      category: string;
      engagement: number;
      views: number;
      preference: number;
    }>;
    optimalPostingTimes: Array<{
      dayOfWeek: string;
      hour: number;
      engagement: number;
    }>;
  }> {
    return {
      audienceGrowth: [
        { date: '2024-01-01', newFollowers: 100, newSubscribers: 20, totalAudience: 1000 },
        { date: '2024-01-02', newFollowers: 120, newSubscribers: 25, totalAudience: 1120 }
      ],
      contentPreferences: [
        { category: 'dance', engagement: 0.12, views: 100000, preference: 0.9 },
        { category: 'music', engagement: 0.10, views: 80000, preference: 0.8 }
      ],
      optimalPostingTimes: [
        { dayOfWeek: 'Monday', hour: 19, engagement: 0.15 },
        { dayOfWeek: 'Friday', hour: 20, engagement: 0.18 }
      ]
    };
  }

  private async generateContentOptimizationTips(metrics: CreatorMetrics, audience: AudienceAnalytics): Promise<Array<{
    tip: string;
    category: 'title' | 'thumbnail' | 'description' | 'timing' | 'hashtags';
    impact: 'high' | 'medium' | 'low';
    description: string;
    examples: string[];
  }>> {
    const tips = [];

    if (metrics.averageEngagementRate < 0.1) {
      tips.push({
        tip: 'Improve thumbnail design',
        category: 'thumbnail' as const,
        impact: 'high' as const,
        description: 'Your engagement rate is below average. Focus on creating eye-catching thumbnails.',
        examples: ['Use bright colors', 'Include text overlay', 'Show faces or emotions']
      });
    }

    if (metrics.averageViewDuration < 120) {
      tips.push({
        tip: 'Optimize content length',
        category: 'timing' as const,
        impact: 'medium' as const,
        description: 'Your average view duration is low. Consider shorter, more engaging content.',
        examples: ['Keep intros under 10 seconds', 'Use hooks in first 3 seconds', 'End with call-to-action']
      });
    }

    return tips;
  }

  private async generateEngagementOptimizationTips(metrics: CreatorMetrics, audience: AudienceAnalytics): Promise<Array<{
    tip: string;
    category: 'interaction' | 'community' | 'collaboration' | 'consistency';
    impact: 'high' | 'medium' | 'low';
    description: string;
    actionableSteps: string[];
  }>> {
    const tips = [];

    if (audience.loyalty.communityHealth < 0.8) {
      tips.push({
        tip: 'Increase community interaction',
        category: 'community' as const,
        impact: 'high' as const,
        description: 'Your community health score is below optimal. Focus on building stronger connections.',
        actionableSteps: [
          'Respond to comments within 2 hours',
          'Host weekly Q&A sessions',
          'Create community challenges',
          'Share behind-the-scenes content'
        ]
      });
    }

    return tips;
  }

  private async generateRevenueOptimizationTips(metrics: CreatorMetrics): Promise<Array<{
    tip: string;
    category: 'monetization' | 'pricing' | 'subscriptions' | 'merchandise';
    impact: 'high' | 'medium' | 'low';
    description: string;
    expectedIncrease: string;
  }>> {
    const tips = [];

    if (metrics.totalSubscribers < metrics.totalFollowers * 0.05) {
      tips.push({
        tip: 'Improve subscription conversion',
        category: 'subscriptions' as const,
        impact: 'high' as const,
        description: 'Your subscription rate is low. Focus on creating exclusive value for subscribers.',
        expectedIncrease: '20-30% revenue increase'
      });
    }

    return tips;
  }

  private async generateGrowthOptimizationTips(metrics: CreatorMetrics, audience: AudienceAnalytics): Promise<Array<{
    tip: string;
    category: 'discovery' | 'collaboration' | 'trending' | 'cross_platform';
    impact: 'high' | 'medium' | 'low';
    description: string;
    implementation: string;
  }>> {
    const tips = [];

    if (metrics.growthMetrics.followerGrowth < 10) {
      tips.push({
        tip: 'Increase cross-platform presence',
        category: 'cross_platform' as const,
        impact: 'high' as const,
        description: 'Your follower growth is slow. Expand to other platforms to reach new audiences.',
        implementation: 'Create platform-specific content and cross-promote between platforms'
      });
    }

    return tips;
  }

  private prioritizeTips(contentTips: any[], engagementTips: any[], revenueTips: any[], growthTips: any[]): {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  } {
    const allTips = [...contentTips, ...engagementTips, ...revenueTips, ...growthTips];
    
    const immediate = allTips.filter(tip => tip.impact === 'high').map(tip => tip.tip);
    const shortTerm = allTips.filter(tip => tip.impact === 'medium').map(tip => tip.tip);
    const longTerm = allTips.filter(tip => tip.impact === 'low').map(tip => tip.tip);

    return { immediate, shortTerm, longTerm };
  }

  private async getCurrentRevenueBreakdown(creatorId: string): Promise<{
    total: number;
    subscriptions: number;
    donations: number;
    merchandise: number;
    sponsorships: number;
    nftSales: number;
  }> {
    return {
      total: 25000,
      subscriptions: 15000,
      donations: 5000,
      merchandise: 3000,
      sponsorships: 1500,
      nftSales: 500
    };
  }

  private async analyzeRevenueStreams(creatorId: string): Promise<Array<{
    stream: string;
    currentRevenue: number;
    potentialRevenue: number;
    growthOpportunity: number;
    recommendations: string[];
  }>> {
    return [
      {
        stream: 'Subscriptions',
        currentRevenue: 15000,
        potentialRevenue: 25000,
        growthOpportunity: 67,
        recommendations: ['Add more subscription tiers', 'Improve exclusive content', 'Better subscriber benefits']
      },
      {
        stream: 'Merchandise',
        currentRevenue: 3000,
        potentialRevenue: 8000,
        growthOpportunity: 167,
        recommendations: ['Expand product line', 'Improve design quality', 'Better marketing']
      }
    ];
  }

  private async analyzePricing(creatorId: string): Promise<{
    subscriptionTiers: Array<{
      tierId: string;
      name: string;
      currentPrice: number;
      optimalPrice: number;
      demand: number;
      recommendation: string;
    }>;
    merchandisePricing: Array<{
      item: string;
      currentPrice: number;
      optimalPrice: number;
      demand: number;
      recommendation: string;
    }>;
  }> {
    return {
      subscriptionTiers: [
        {
          tierId: 'tier_1',
          name: 'Basic',
          currentPrice: 5,
          optimalPrice: 7,
          demand: 0.8,
          recommendation: 'Increase price by $2 for better value perception'
        }
      ],
      merchandisePricing: [
        {
          item: 'T-Shirt',
          currentPrice: 25,
          optimalPrice: 30,
          demand: 0.7,
          recommendation: 'Premium pricing justified by brand value'
        }
      ]
    };
  }

  private async identifyMonetizationOpportunities(creatorId: string): Promise<Array<{
    opportunity: string;
    potentialRevenue: number;
    implementation: string;
    timeline: string;
    priority: 'high' | 'medium' | 'low';
  }>> {
    return [
      {
        opportunity: 'Online courses',
        potentialRevenue: 10000,
        implementation: 'Create dance tutorial courses',
        timeline: '3 months',
        priority: 'high'
      },
      {
        opportunity: 'Brand partnerships',
        potentialRevenue: 5000,
        implementation: 'Partner with dance brands',
        timeline: '1 month',
        priority: 'medium'
      }
    ];
  }

  private async generateRevenueProjections(creatorId: string): Promise<{
    nextMonth: number;
    next3Months: number;
    next6Months: number;
    nextYear: number;
  }> {
    return {
      nextMonth: 28000,
      next3Months: 35000,
      next6Months: 45000,
      nextYear: 75000
    };
  }

  private isCacheValid(cacheKey: string): boolean {
    const expiry = this.cacheExpiry.get(cacheKey);
    return expiry ? Date.now() < expiry : false;
  }
}

export default CreatorAnalyticsService;

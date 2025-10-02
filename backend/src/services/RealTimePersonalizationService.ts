import { Model, Document } from 'mongoose';
import { AnalyticsEvent, IAnalyticsEvent } from '../analytics/models/AnalyticsEvent';
import { User, IUser } from '../models/User';
import { LiveStream, ILiveStream } from '../models/LiveStream';
import { ShortVideo, IShortVideo } from '../models/ShortVideo';
import { logger } from '../config/logger';
import { getCache, setCache } from '../config/redis';

interface UserContext {
  userId: string;
  sessionId: string;
  currentPage: string;
  deviceInfo: {
    type: 'mobile' | 'desktop' | 'tablet';
    os: string;
    browser: string;
    screenSize: string;
  };
  location: {
    country: string;
    city: string;
    timezone: string;
  };
  behavior: {
    currentSessionDuration: number;
    pagesVisited: string[];
    actionsPerformed: string[];
    engagementLevel: 'low' | 'medium' | 'high';
  };
  preferences: {
    language: string;
    contentCategories: string[];
    preferredCreators: string[];
    notificationSettings: any;
  };
  realTimeData: {
    currentTime: Date;
    isPeakHours: boolean;
    trendingTopics: string[];
    activeFriends: string[];
    recentInteractions: Array<{
      type: string;
      contentId: string;
      timestamp: Date;
    }>;
  };
}

interface PersonalizationRule {
  ruleId: string;
  name: string;
  description: string;
  conditions: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
    value: any;
  }>;
  actions: Array<{
    type: 'show_content' | 'hide_content' | 'modify_ui' | 'send_notification' | 'adjust_pricing';
    config: any;
  }>;
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface PersonalizedContent {
  contentId: string;
  contentType: 'stream' | 'video' | 'ad' | 'notification';
  personalizationScore: number;
  reason: string;
  metadata: {
    category: string;
    creator: string;
    duration: number;
    engagement: number;
  };
  adaptations: Array<{
    type: 'thumbnail' | 'title' | 'description' | 'duration' | 'quality';
    originalValue: any;
    personalizedValue: any;
    reason: string;
  }>;
}

interface PersonalizedUI {
  layout: {
    recommendedContent: PersonalizedContent[];
    trendingContent: PersonalizedContent[];
    followingContent: PersonalizedContent[];
    categories: Array<{
      name: string;
      order: number;
      isVisible: boolean;
    }>;
  };
  features: {
    showNotifications: boolean;
    showTrending: boolean;
    showFollowing: boolean;
    showRecommendations: boolean;
    showAds: boolean;
  };
  styling: {
    theme: 'light' | 'dark' | 'auto';
    fontSize: 'small' | 'medium' | 'large';
    colorScheme: string;
  };
  interactions: {
    autoPlay: boolean;
    showSubtitles: boolean;
    enableComments: boolean;
    enableSharing: boolean;
  };
}

interface PersonalizationMetrics {
  totalPersonalizations: number;
  successRate: number;
  userSatisfaction: number;
  engagementImprovement: number;
  conversionImprovement: number;
  topPersonalizationTypes: Array<{
    type: string;
    count: number;
    successRate: number;
  }>;
  userSegments: Array<{
    segment: string;
    personalizationCount: number;
    averageScore: number;
  }>;
}

export class RealTimePersonalizationService {
  private readonly logger = logger;
  private analyticsEventModel: Model<IAnalyticsEvent>;
  private userModel: Model<IUser>;
  private liveStreamModel: Model<ILiveStream>;
  private shortVideoModel: Model<IShortVideo>;

  constructor() {
    this.analyticsEventModel = AnalyticsEvent as any;
    this.userModel = User as any;
    this.liveStreamModel = LiveStream as any;
    this.shortVideoModel = ShortVideo as any;
  }

  async getPersonalizedUIConfig(userId: string): Promise<any> {
    // Return personalized UI configuration
    return {
      theme: 'dark',
      layout: 'compact',
      notifications: 'enabled',
      autoplay: true,
      recommendedContent: []
    };
  }

  async getAllPersonalizationRules(): Promise<any[]> {
    // Return all personalization rules
    return [];
  }

  async updatePersonalizationRule(ruleId: string, ruleData: any): Promise<any> {
    // Update a personalization rule
    return { ...ruleData, id: ruleId, updatedAt: new Date() };
  }

  async deletePersonalizationRule(ruleId: string): Promise<void> {
    // Delete a personalization rule
  }

  async submitPersonalizationFeedback(userId: string, feedback: any): Promise<void> {
    // Submit feedback for personalization improvements
  }

  /**
   * Build comprehensive user context for personalization
   */
  async buildUserContext(userId: string, sessionId: string, currentPage: string): Promise<UserContext> {
    try {
      // Get user basic info
      const user = await this.userModel.findById(userId).select('demographics preferences lastActiveAt');
      
      // Get session data
      const sessionData = await this.getSessionData(sessionId);
      
      // Get behavior data
      const behaviorData = await this.getBehaviorData(userId, sessionId);
      
      // Get preferences
      const preferences = await this.getUserPreferences(userId);
      
      // Get real-time data
      const realTimeData = await this.getRealTimeData(userId);

      const context: UserContext = {
        userId,
        sessionId,
        currentPage,
        deviceInfo: sessionData.deviceInfo,
        location: sessionData.location,
        behavior: behaviorData,
        preferences,
        realTimeData,
      };

      // Cache user context for performance
      await this.cacheUserContext(userId, context);

      return context;
    } catch (error) {
      this.logger.error('Error building user context:', error);
      throw error;
    }
  }

  /**
   * Personalize content feed for user
   */
  async personalizeContentFeed(userId: string, sessionId: string, currentPage: string): Promise<PersonalizedContent[]> {
    try {
      const userContext = await this.buildUserContext(userId, sessionId, currentPage);
      
      // Get available content
      const availableContent = await this.getAvailableContent();
      
      // Apply personalization rules
      const personalizedContent = await this.applyPersonalizationRules(userContext, availableContent);
      
      // Sort by personalization score
      const sortedContent = personalizedContent.sort((a, b) => b.personalizationScore - a.personalizationScore);
      
      // Log personalization
      await this.logPersonalization(userId, 'content_feed', sortedContent.length);
      
      return sortedContent;
    } catch (error) {
      this.logger.error('Error personalizing content feed:', error);
      return [];
    }
  }

  /**
   * Personalize UI elements for user
   */
  async personalizeUI(userId: string, sessionId: string, currentPage: string): Promise<PersonalizedUI> {
    try {
      const userContext = await this.buildUserContext(userId, sessionId, currentPage);
      
      // Get personalized content
      const personalizedContent = await this.personalizeContentFeed(userId, sessionId, currentPage);
      
      // Build personalized UI
      const personalizedUI: PersonalizedUI = {
        layout: {
          recommendedContent: personalizedContent.slice(0, 10),
          trendingContent: await this.getTrendingContent(userContext),
          followingContent: await this.getFollowingContent(userContext),
          categories: await this.getPersonalizedCategories(userContext),
        },
        features: await this.getPersonalizedFeatures(userContext),
        styling: await this.getPersonalizedStyling(userContext),
        interactions: await this.getPersonalizedInteractions(userContext),
      };
      
      // Log UI personalization
      await this.logPersonalization(userId, 'ui_personalization', 1);
      
      return personalizedUI;
    } catch (error) {
      this.logger.error('Error personalizing UI:', error);
      return this.getDefaultUI();
    }
  }

  /**
   * Personalize notifications for user
   */
  async personalizeNotifications(userId: string): Promise<Array<{
    type: string;
    title: string;
    message: string;
    priority: 'low' | 'medium' | 'high';
    timing: Date;
    personalizationScore: number;
  }>> {
    try {
      const userContext = await this.buildUserContext(userId, '', 'notifications');
      
      // Get notification candidates
      const notificationCandidates = await this.getNotificationCandidates(userContext);
      
      // Apply personalization rules
      const personalizedNotifications = await this.applyNotificationPersonalization(userContext, notificationCandidates);
      
      // Sort by priority and personalization score
      const sortedNotifications = personalizedNotifications.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority] || b.personalizationScore - a.personalizationScore;
      });
      
      // Log notification personalization
      await this.logPersonalization(userId, 'notification_personalization', sortedNotifications.length);
      
      return sortedNotifications;
    } catch (error) {
      this.logger.error('Error personalizing notifications:', error);
      return [];
    }
  }

  /**
   * Personalize pricing for user
   */
  async personalizePricing(userId: string, productId: string, basePrice: number): Promise<{
    personalizedPrice: number;
    discount: number;
    reason: string;
    personalizationScore: number;
  }> {
    try {
      const userContext = await this.buildUserContext(userId, '', 'pricing');
      
      // Apply pricing personalization rules
      const pricingResult = await this.applyPricingPersonalization(userContext, productId, basePrice);
      
      // Log pricing personalization
      await this.logPersonalization(userId, 'pricing_personalization', 1);
      
      return pricingResult;
    } catch (error) {
      this.logger.error('Error personalizing pricing:', error);
      return {
        personalizedPrice: basePrice,
        discount: 0,
        reason: 'Personalization failed',
        personalizationScore: 0,
      };
    }
  }

  /**
   * Create personalization rule
   */
  async createPersonalizationRule(rule: Omit<PersonalizationRule, 'ruleId' | 'createdAt' | 'updatedAt'>): Promise<PersonalizationRule> {
    try {
      const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const personalizationRule: PersonalizationRule = {
        ...rule,
        ruleId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store rule
      await setCache(`personalization_rule:${ruleId}`, {
        config: JSON.stringify(personalizationRule),
        isActive: rule.isActive.toString(),
      }, 3600);

      this.logger.info(`Created personalization rule: ${ruleId} - ${rule.name}`);
      
      return personalizationRule;
    } catch (error) {
      this.logger.error('Error creating personalization rule:', error);
      throw error;
    }
  }

  /**
   * Get personalization metrics
   */
  async getPersonalizationMetrics(timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<PersonalizationMetrics> {
    try {
      const timeRangeMs = this.getTimeRangeMs(timeRange);
      const startTime = new Date(Date.now() - timeRangeMs);

      // Get personalization events
      const personalizationEvents = await this.analyticsEventModel.find({
        eventType: 'personalization_applied',
        timestamp: { $gte: startTime },
      });

      const totalPersonalizations = personalizationEvents.length;
      
      // Calculate success rate
      const successfulPersonalizations = personalizationEvents.filter(event => 
        event.metadata.success === true
      ).length;
      const successRate = totalPersonalizations > 0 ? (successfulPersonalizations / totalPersonalizations) * 100 : 0;

      // Calculate user satisfaction (mock data)
      const userSatisfaction = 85 + Math.random() * 10;

      // Calculate engagement improvement (mock data)
      const engagementImprovement = 15 + Math.random() * 10;

      // Calculate conversion improvement (mock data)
      const conversionImprovement = 20 + Math.random() * 15;

      // Analyze top personalization types
      const personalizationTypes = {};
      for (const event of personalizationEvents) {
        const type = event.metadata.personalizationType || 'unknown';
        personalizationTypes[type] = (personalizationTypes[type] || 0) + 1;
      }

      const topPersonalizationTypes = Object.entries(personalizationTypes)
        .map(([type, count]) => ({
          type,
          count: count as number,
          successRate: 80 + Math.random() * 15, // Mock success rate
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Analyze user segments
      const userSegments = [
        { segment: 'new_users', personalizationCount: 150, averageScore: 0.75 },
        { segment: 'active_users', personalizationCount: 300, averageScore: 0.85 },
        { segment: 'premium_users', personalizationCount: 100, averageScore: 0.90 },
        { segment: 'content_creators', personalizationCount: 50, averageScore: 0.88 },
      ];

      return {
        totalPersonalizations,
        successRate,
        userSatisfaction,
        engagementImprovement,
        conversionImprovement,
        topPersonalizationTypes,
        userSegments,
      };
    } catch (error) {
      this.logger.error('Error getting personalization metrics:', error);
      return {
        totalPersonalizations: 0,
        successRate: 0,
        userSatisfaction: 0,
        engagementImprovement: 0,
        conversionImprovement: 0,
        topPersonalizationTypes: [],
        userSegments: [],
      };
    }
  }

  /**
   * Get session data
   */
  private async getSessionData(sessionId: string): Promise<{
    deviceInfo: UserContext['deviceInfo'];
    location: UserContext['location'];
  }> {
    // Mock session data - in real implementation, this would come from session storage
    return {
      deviceInfo: {
        type: 'mobile',
        os: 'iOS',
        browser: 'Safari',
        screenSize: '375x812',
      },
      location: {
        country: 'Nepal',
        city: 'Kathmandu',
        timezone: 'Asia/Kathmandu',
      },
    };
  }

  /**
   * Get behavior data
   */
  private async getBehaviorData(userId: string, sessionId: string): Promise<UserContext['behavior']> {
    const sessionStart = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
    
    const events = await this.analyticsEventModel.find({
      userId,
      sessionId,
      timestamp: { $gte: sessionStart },
    }).sort({ timestamp: 1 });

    const currentSessionDuration = events.length > 0 ? 
      (Date.now() - events[0].timestamp.getTime()) / 1000 : 0;

    const pagesVisited = [...new Set(events.map(event => event.metadata.page || 'unknown'))];
    const actionsPerformed = events.map(event => event.eventType);

    // Calculate engagement level
    let engagementLevel: 'low' | 'medium' | 'high' = 'low';
    if (currentSessionDuration > 600) { // 10 minutes
      engagementLevel = 'high';
    } else if (currentSessionDuration > 300) { // 5 minutes
      engagementLevel = 'medium';
    }

    return {
      currentSessionDuration,
      pagesVisited,
      actionsPerformed,
      engagementLevel,
    };
  }

  /**
   * Get user preferences
   */
  private async getUserPreferences(userId: string): Promise<UserContext['preferences']> {
    const user = await this.userModel.findById(userId).select('preferences');
    
    return {
      language: user?.preferences?.language || 'en',
      contentCategories: user?.preferences?.categories || ['general'],
      preferredCreators: user?.preferences?.creators || [],
      notificationSettings: user?.preferences?.notifications || {},
    };
  }

  /**
   * Get real-time data
   */
  private async getRealTimeData(userId: string): Promise<UserContext['realTimeData']> {
    const currentTime = new Date();
    const hour = currentTime.getHours();
    const isPeakHours = hour >= 19 && hour <= 23;

    // Get trending topics (mock data)
    const trendingTopics = ['gaming', 'music', 'comedy', 'dance', 'cooking'];

    // Get active friends (mock data)
    const activeFriends = ['friend1', 'friend2', 'friend3'];

    // Get recent interactions
    const recentInteractions = await this.analyticsEventModel.find({
      userId,
      eventType: { $in: ['content_like', 'content_share', 'content_comment'] },
      timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
    }).sort({ timestamp: -1 }).limit(10);

    return {
      currentTime,
      isPeakHours,
      trendingTopics,
      activeFriends,
      recentInteractions: recentInteractions.map(event => ({
        type: event.eventType,
        contentId: event.metadata.contentId,
        timestamp: event.timestamp,
      })),
    };
  }

  /**
   * Cache user context
   */
  private async cacheUserContext(userId: string, context: UserContext): Promise<void> {
    const cacheKey = `user_context:${userId}`;
    await setCache(cacheKey, context, 300); // 5 minutes cache
  }

  /**
   * Get available content
   */
  private async getAvailableContent(): Promise<any[]> {
    const [streams, videos] = await Promise.all([
      this.liveStreamModel.find({ status: 'live', isPublic: true }).limit(50),
      this.shortVideoModel.find({ isPublic: true, status: 'published' }).limit(100),
    ]);

    const content = [];
    
    for (const stream of streams) {
      content.push({
        contentId: stream._id.toString(),
        contentType: 'stream',
        category: stream.category || 'general',
        creatorId: stream.creatorId || stream.userId,
        duration: 0,
        engagement: await this.getContentEngagement(stream._id.toString()),
      });
    }

    for (const video of videos) {
      content.push({
        contentId: video._id.toString(),
        contentType: 'video',
        category: video.category || 'general',
        creatorId: video.creatorId || video.userId,
        duration: video.duration || 0,
        engagement: await this.getContentEngagement(video._id.toString()),
      });
    }

    return content;
  }

  /**
   * Get content engagement
   */
  private async getContentEngagement(contentId: string): Promise<number> {
    const events = await this.analyticsEventModel.find({
      'metadata.contentId': contentId,
      eventType: { $in: ['content_watch', 'content_like', 'content_share', 'content_comment'] },
    });

    let engagement = 0;
    for (const event of events) {
      switch (event.eventType) {
        case 'content_watch':
          engagement += 0.1;
          break;
        case 'content_like':
          engagement += 1;
          break;
        case 'content_share':
          engagement += 3;
          break;
        case 'content_comment':
          engagement += 2;
          break;
      }
    }

    return engagement;
  }

  /**
   * Apply personalization rules
   */
  private async applyPersonalizationRules(userContext: UserContext, availableContent: any[]): Promise<PersonalizedContent[]> {
    const personalizedContent: PersonalizedContent[] = [];

    for (const content of availableContent) {
      let personalizationScore = 0.5; // Base score
      const adaptations = [];
      const reasons = [];

      // Category preference match
      if (userContext.preferences.contentCategories.includes(content.category)) {
        personalizationScore += 0.2;
        reasons.push('Matches preferred category');
      }

      // Creator preference match
      if (userContext.preferences.preferredCreators.includes(content.creatorId)) {
        personalizationScore += 0.3;
        reasons.push('From preferred creator');
      }

      // Peak hours boost
      if (userContext.realTimeData.isPeakHours && content.contentType === 'stream') {
        personalizationScore += 0.1;
        reasons.push('Peak hours streaming');
      }

      // Trending topics match
      if (userContext.realTimeData.trendingTopics.includes(content.category)) {
        personalizationScore += 0.15;
        reasons.push('Trending topic');
      }

      // Engagement level boost
      if (userContext.behavior.engagementLevel === 'high' && content.engagement > 10) {
        personalizationScore += 0.1;
        reasons.push('High engagement content');
      }

      // Device-specific adaptations
      if (userContext.deviceInfo.type === 'mobile' && content.duration > 300) {
        adaptations.push({
          type: 'duration',
          originalValue: content.duration,
          personalizedValue: Math.min(content.duration, 180),
          reason: 'Mobile-optimized duration',
        });
      }

      // Language-specific adaptations
      if (userContext.preferences.language !== 'en') {
        adaptations.push({
          type: 'title',
          originalValue: content.title,
          personalizedValue: `${content.title} (${userContext.preferences.language})`,
          reason: 'Language preference',
        });
      }

      personalizedContent.push({
        contentId: content.contentId,
        contentType: content.contentType,
        personalizationScore: Math.min(personalizationScore, 1.0),
        reason: reasons.join(', '),
        metadata: {
          category: content.category,
          creator: content.creatorId,
          duration: content.duration,
          engagement: content.engagement,
        },
        adaptations,
      });
    }

    return personalizedContent;
  }

  /**
   * Get trending content
   */
  private async getTrendingContent(userContext: UserContext): Promise<PersonalizedContent[]> {
    // Mock trending content
    return [
      {
        contentId: 'trending1',
        contentType: 'video',
        personalizationScore: 0.9,
        reason: 'Trending content',
        metadata: {
          category: 'gaming',
          creator: 'creator1',
          duration: 120,
          engagement: 50,
        },
        adaptations: [],
      },
    ];
  }

  /**
   * Get following content
   */
  private async getFollowingContent(userContext: UserContext): Promise<PersonalizedContent[]> {
    // Mock following content
    return [
      {
        contentId: 'following1',
        contentType: 'stream',
        personalizationScore: 0.8,
        reason: 'From followed creator',
        metadata: {
          category: 'music',
          creator: 'creator2',
          duration: 0,
          engagement: 30,
        },
        adaptations: [],
      },
    ];
  }

  /**
   * Get personalized categories
   */
  private async getPersonalizedCategories(userContext: UserContext): Promise<Array<{
    name: string;
    order: number;
    isVisible: boolean;
  }>> {
    const categories = [
      { name: 'gaming', order: 1, isVisible: true },
      { name: 'music', order: 2, isVisible: true },
      { name: 'comedy', order: 3, isVisible: true },
      { name: 'dance', order: 4, isVisible: true },
      { name: 'cooking', order: 5, isVisible: true },
    ];

    // Reorder based on user preferences
    const preferredCategories = userContext.preferences.contentCategories;
    for (let i = 0; i < preferredCategories.length; i++) {
      const category = categories.find(c => c.name === preferredCategories[i]);
      if (category) {
        category.order = i + 1;
      }
    }

    return categories.sort((a, b) => a.order - b.order);
  }

  /**
   * Get personalized features
   */
  private async getPersonalizedFeatures(userContext: UserContext): Promise<PersonalizedUI['features']> {
    return {
      showNotifications: userContext.behavior.engagementLevel === 'high',
      showTrending: true,
      showFollowing: userContext.preferences.preferredCreators.length > 0,
      showRecommendations: true,
      showAds: userContext.behavior.engagementLevel !== 'low',
    };
  }

  /**
   * Get personalized styling
   */
  private async getPersonalizedStyling(userContext: UserContext): Promise<PersonalizedUI['styling']> {
    return {
      theme: userContext.deviceInfo.type === 'mobile' ? 'dark' : 'light',
      fontSize: userContext.deviceInfo.type === 'mobile' ? 'medium' : 'large',
      colorScheme: 'default',
    };
  }

  /**
   * Get personalized interactions
   */
  private async getPersonalizedInteractions(userContext: UserContext): Promise<PersonalizedUI['interactions']> {
    return {
      autoPlay: userContext.behavior.engagementLevel === 'high',
      showSubtitles: userContext.preferences.language !== 'en',
      enableComments: true,
      enableSharing: true,
    };
  }

  /**
   * Get notification candidates
   */
  private async getNotificationCandidates(userContext: UserContext): Promise<any[]> {
    // Mock notification candidates
    return [
      {
        type: 'new_content',
        title: 'New content from followed creator',
        message: 'Check out the latest stream from your favorite creator',
        priority: 'medium',
        timing: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
      },
      {
        type: 'trending',
        title: 'Trending content alert',
        message: 'A video in your favorite category is trending',
        priority: 'low',
        timing: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from now
      },
    ];
  }

  /**
   * Apply notification personalization
   */
  private async applyNotificationPersonalization(userContext: UserContext, candidates: any[]): Promise<any[]> {
    const personalizedNotifications = [];

    for (const candidate of candidates) {
      let personalizationScore = 0.5;
      const reasons = [];

      // Check notification preferences
      if (userContext.preferences.notificationSettings[candidate.type] === false) {
        continue; // Skip if user has disabled this notification type
      }

      // Engagement level boost
      if (userContext.behavior.engagementLevel === 'high') {
        personalizationScore += 0.2;
        reasons.push('High engagement user');
      }

      // Peak hours boost
      if (userContext.realTimeData.isPeakHours) {
        personalizationScore += 0.1;
        reasons.push('Peak hours');
      }

      // Device-specific timing
      if (userContext.deviceInfo.type === 'mobile') {
        candidate.timing = new Date(Date.now() + 2 * 60 * 1000); // Earlier for mobile
        reasons.push('Mobile optimization');
      }

      personalizedNotifications.push({
        ...candidate,
        personalizationScore,
        reason: reasons.join(', '),
      });
    }

    return personalizedNotifications;
  }

  /**
   * Apply pricing personalization
   */
  private async applyPricingPersonalization(userContext: UserContext, productId: string, basePrice: number): Promise<{
    personalizedPrice: number;
    discount: number;
    reason: string;
    personalizationScore: number;
  }> {
    let personalizedPrice = basePrice;
    let discount = 0;
    const reasons = [];
    let personalizationScore = 0.5;

    // New user discount
    if (userContext.behavior.currentSessionDuration < 300) { // Less than 5 minutes
      discount = 0.1; // 10% discount
      personalizedPrice = basePrice * (1 - discount);
      reasons.push('New user discount');
      personalizationScore += 0.2;
    }

    // High engagement user premium
    if (userContext.behavior.engagementLevel === 'high') {
      discount = 0.05; // 5% discount
      personalizedPrice = basePrice * (1 - discount);
      reasons.push('High engagement discount');
      personalizationScore += 0.1;
    }

    // Peak hours pricing
    if (userContext.realTimeData.isPeakHours) {
      personalizedPrice = basePrice * 1.1; // 10% premium
      reasons.push('Peak hours pricing');
      personalizationScore += 0.1;
    }

    return {
      personalizedPrice,
      discount,
      reason: reasons.join(', '),
      personalizationScore,
    };
  }

  /**
   * Log personalization
   */
  private async logPersonalization(userId: string, type: string, count: number): Promise<void> {
    await this.analyticsEventModel.create({
      userId,
      eventType: 'personalization_applied',
      metadata: {
        personalizationType: type,
        count,
        success: true,
      },
      timestamp: new Date(),
      appId: 'halobuzz',
    });
  }

  /**
   * Get default UI
   */
  private getDefaultUI(): PersonalizedUI {
    return {
      layout: {
        recommendedContent: [],
        trendingContent: [],
        followingContent: [],
        categories: [],
      },
      features: {
        showNotifications: true,
        showTrending: true,
        showFollowing: true,
        showRecommendations: true,
        showAds: true,
      },
      styling: {
        theme: 'light',
        fontSize: 'medium',
        colorScheme: 'default',
      },
      interactions: {
        autoPlay: false,
        showSubtitles: false,
        enableComments: true,
        enableSharing: true,
      },
    };
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
}

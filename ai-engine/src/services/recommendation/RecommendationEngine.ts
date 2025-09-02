import logger from '../../utils/logger';
import { aiModelManager } from '../../utils/ai-models';

export interface PersonalizationProfile {
  userId: string;
  interests: string[];
  viewingPatterns: {
    timePreferences: number[];
    contentTypes: string[];
    interactionHistory: any[];
  };
  culturalContext: {
    language: string;
    region: string;
    culturalPreferences: string[];
  };
  socialGraph: {
    following: string[];
    mutualConnections: string[];
    influenceScore: number;
  };
}

export interface Content {
  id: string;
  creatorId: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  duration: number;
  thumbnail: string;
  viewCount: number;
  likeCount: number;
  shareCount: number;
  commentCount: number;
  createdAt: Date;
  culturalContext?: {
    language: string;
    region: string;
    culturalTags: string[];
  };
  engagementMetrics: {
    completionRate: number;
    interactionRate: number;
    shareRate: number;
  };
}

export interface RecommendationRequest {
  userId: string;
  limit: number;
  contentType?: string;
  mood?: string;
  culturalBridge?: boolean;
}

export interface RecommendationResponse {
  content: Content[];
  reasoning: string;
  personalizationScore: number;
  culturalRelevance: number;
  moodAlignment: number;
}

export class HyperPersonalizationEngine {
  private static instance: HyperPersonalizationEngine;
  private userProfiles: Map<string, PersonalizationProfile> = new Map();
  private contentCache: Map<string, Content[]> = new Map();
  private culturalBridges: Map<string, Content[]> = new Map();

  private constructor() {
    this.initializeMockData();
    logger.info('HyperPersonalizationEngine initialized');
  }

  static getInstance(): HyperPersonalizationEngine {
    if (!HyperPersonalizationEngine.instance) {
      HyperPersonalizationEngine.instance = new HyperPersonalizationEngine();
    }
    return HyperPersonalizationEngine.instance;
  }

  /**
   * Real-time content scoring based on user behavior
   */
  async scoreContent(userId: string, contentId: string): Promise<number> {
    try {
      const profile = this.userProfiles.get(userId);
      if (!profile) {
        logger.warn(`No profile found for user ${userId}`);
        return 0.5; // Default neutral score
      }

      // Get content from cache or fetch from database
      const content = await this.getContentById(contentId);
      if (!content) {
        logger.warn(`Content ${contentId} not found`);
        return 0.5;
      }

      // Multi-dimensional scoring algorithm
      const scores = {
        interestMatch: this.calculateInterestMatch(profile, content),
        culturalRelevance: this.calculateCulturalRelevance(profile, content),
        socialInfluence: this.calculateSocialInfluence(profile, content),
        timePreference: this.calculateTimePreference(profile, content),
        engagementHistory: this.calculateEngagementHistory(profile, content),
        contentQuality: this.calculateContentQuality(content)
      };

      // Weighted scoring with AI enhancement
      const weights = {
        interestMatch: 0.25,
        culturalRelevance: 0.20,
        socialInfluence: 0.15,
        timePreference: 0.10,
        engagementHistory: 0.15,
        contentQuality: 0.15
      };

      let finalScore = 0;
      for (const [key, score] of Object.entries(scores)) {
        finalScore += score * weights[key as keyof typeof weights];
      }

      // AI-powered score adjustment based on user behavior patterns
      const aiAdjustment = await this.getAIScoreAdjustment(profile, content, finalScore);
      finalScore = Math.min(1, Math.max(0, finalScore + aiAdjustment));

      logger.info(`Content ${contentId} scored ${finalScore.toFixed(3)} for user ${userId}`, {
        scores,
        aiAdjustment,
        finalScore
      });

      return finalScore;
    } catch (error) {
      logger.error('Error scoring content:', error);
      return 0.5;
    }
  }

  /**
   * Multi-dimensional recommendation algorithm
   */
  async getPersonalizedFeed(userId: string, limit: number): Promise<Content[]> {
    try {
      const profile = this.userProfiles.get(userId);
      if (!profile) {
        logger.warn(`No profile found for user ${userId}, returning trending content`);
        return this.getTrendingContent(limit);
      }

      // Get all available content
      const allContent = await this.getAllContent();
      
      // Score all content for this user
      const scoredContent = await Promise.all(
        allContent.map(async (content) => ({
          content,
          score: await this.scoreContent(userId, content.id)
        }))
      );

      // Sort by score and apply diversity filters
      const sortedContent = scoredContent
        .sort((a, b) => b.score - a.score)
        .map(item => item.content);

      // Apply diversity and freshness filters
      const diversifiedContent = this.applyDiversityFilters(sortedContent, profile, limit);
      
      // Apply cultural bridge content if enabled
      const finalContent = await this.applyCulturalBridge(diversifiedContent, profile);

      logger.info(`Generated personalized feed for user ${userId}`, {
        totalContent: allContent.length,
        finalCount: finalContent.length,
        avgScore: scoredContent.reduce((sum, item) => sum + item.score, 0) / scoredContent.length
      });

      return finalContent.slice(0, limit);
    } catch (error) {
      logger.error('Error generating personalized feed:', error);
      return this.getTrendingContent(limit);
    }
  }

  /**
   * Mood-based content curation
   */
  async getMoodBasedRecommendations(userId: string, detectedMood: string): Promise<Content[]> {
    try {
      const profile = this.userProfiles.get(userId);
      if (!profile) {
        return [];
      }

      // Mood-specific content mapping
      const moodContentMap = {
        happy: ['comedy', 'dance', 'music', 'celebration'],
        sad: ['motivational', 'uplifting', 'music', 'nature'],
        excited: ['adventure', 'sports', 'gaming', 'challenges'],
        calm: ['meditation', 'nature', 'art', 'reading'],
        energetic: ['fitness', 'dance', 'sports', 'gaming'],
        creative: ['art', 'design', 'music', 'crafts'],
        social: ['group_activities', 'conversations', 'collaborations'],
        nostalgic: ['throwback', 'memories', 'vintage', 'classic']
      };

      const preferredCategories = moodContentMap[detectedMood as keyof typeof moodContentMap] || [];
      
      // Get content matching mood categories
      const allContent = await this.getAllContent();
      const moodContent = allContent.filter(content => 
        preferredCategories.some(category => 
          content.category === category || content.tags.includes(category)
        )
      );

      // Score and rank mood-specific content
      const scoredContent = await Promise.all(
        moodContent.map(async (content) => ({
          content,
          score: await this.scoreContent(userId, content.id)
        }))
      );

      const sortedContent = scoredContent
        .sort((a, b) => b.score - a.score)
        .map(item => item.content);

      logger.info(`Generated mood-based recommendations for user ${userId}`, {
        mood: detectedMood,
        categories: preferredCategories,
        contentCount: sortedContent.length
      });

      return sortedContent.slice(0, 20);
    } catch (error) {
      logger.error('Error generating mood-based recommendations:', error);
      return [];
    }
  }

  /**
   * Cross-cultural content bridging
   */
  async getCulturalBridgeContent(userId: string): Promise<Content[]> {
    try {
      const profile = this.userProfiles.get(userId);
      if (!profile) {
        return [];
      }

      const userRegion = profile.culturalContext.region;
      const userLanguage = profile.culturalContext.language;

      // Get content from different cultural contexts
      const allContent = await this.getAllContent();
      const bridgeContent = allContent.filter(content => 
        content.culturalContext && (
          content.culturalContext.region !== userRegion ||
          content.culturalContext.language !== userLanguage
        )
      );

      // Score content for cultural bridge potential
      const scoredContent = await Promise.all(
        bridgeContent.map(async (content) => ({
          content,
          score: await this.calculateCulturalBridgeScore(profile, content)
        }))
      );

      const sortedContent = scoredContent
        .sort((a, b) => b.score - a.score)
        .map(item => item.content);

      logger.info(`Generated cultural bridge content for user ${userId}`, {
        userRegion,
        userLanguage,
        bridgeContentCount: sortedContent.length
      });

      return sortedContent.slice(0, 15);
    } catch (error) {
      logger.error('Error generating cultural bridge content:', error);
      return [];
    }
  }

  /**
   * Update user profile with new interaction data
   */
  async updateUserProfile(userId: string, interactionData: any): Promise<void> {
    try {
      let profile = this.userProfiles.get(userId);
      if (!profile) {
        profile = await this.createDefaultProfile(userId);
      }

      // Update interests based on interaction
      if (interactionData.contentCategory) {
        this.updateInterests(profile, interactionData.contentCategory);
      }

      // Update viewing patterns
      if (interactionData.viewDuration) {
        this.updateViewingPatterns(profile, interactionData);
      }

      // Update social graph
      if (interactionData.socialAction) {
        this.updateSocialGraph(profile, interactionData);
      }

      this.userProfiles.set(userId, profile);
      logger.info(`Updated profile for user ${userId}`, { interactionData });
    } catch (error) {
      logger.error('Error updating user profile:', error);
    }
  }

  // Private helper methods
  private calculateInterestMatch(profile: PersonalizationProfile, content: Content): number {
    const interestMatches = content.tags.filter(tag => 
      profile.interests.includes(tag)
    ).length;
    return Math.min(1, interestMatches / Math.max(1, content.tags.length));
  }

  private calculateCulturalRelevance(profile: PersonalizationProfile, content: Content): number {
    if (!content.culturalContext) return 0.5;

    let score = 0;
    
    // Language match
    if (content.culturalContext.language === profile.culturalContext.language) {
      score += 0.4;
    }
    
    // Region match
    if (content.culturalContext.region === profile.culturalContext.region) {
      score += 0.3;
    }
    
    // Cultural preferences match
    const culturalMatches = content.culturalContext.culturalTags.filter(tag =>
      profile.culturalContext.culturalPreferences.includes(tag)
    ).length;
    score += (culturalMatches / Math.max(1, content.culturalContext.culturalTags.length)) * 0.3;

    return Math.min(1, score);
  }

  private calculateSocialInfluence(profile: PersonalizationProfile, content: Content): number {
    // Check if user follows the creator
    const followsCreator = profile.socialGraph.following.includes(content.creatorId);
    if (followsCreator) return 0.9;

    // Check mutual connections
    const hasMutualConnections = profile.socialGraph.mutualConnections.includes(content.creatorId);
    if (hasMutualConnections) return 0.7;

    // Use influence score
    return Math.min(0.6, profile.socialGraph.influenceScore / 100);
  }

  private calculateTimePreference(profile: PersonalizationProfile, content: Content): number {
    const currentHour = new Date().getHours();
    const timePreferences = profile.viewingPatterns.timePreferences;
    
    if (timePreferences.includes(currentHour)) {
      return 0.8;
    }
    
    // Check nearby hours
    const nearbyHours = timePreferences.filter(hour => 
      Math.abs(hour - currentHour) <= 2
    );
    
    return nearbyHours.length > 0 ? 0.6 : 0.4;
  }

  private calculateEngagementHistory(profile: PersonalizationProfile, content: Content): number {
    const history = profile.viewingPatterns.interactionHistory;
    const similarContent = history.filter(interaction =>
      interaction.contentCategory === content.category ||
      interaction.tags.some((tag: string) => content.tags.includes(tag))
    );

    if (similarContent.length === 0) return 0.5;

    const avgEngagement = similarContent.reduce((sum, interaction) => 
      sum + interaction.engagementScore, 0
    ) / similarContent.length;

    return Math.min(1, avgEngagement);
  }

  private calculateContentQuality(content: Content): number {
    const engagementRate = (content.likeCount + content.shareCount + content.commentCount) / 
      Math.max(1, content.viewCount);
    
    const completionRate = content.engagementMetrics.completionRate;
    const interactionRate = content.engagementMetrics.interactionRate;
    
    return (engagementRate * 0.4 + completionRate * 0.3 + interactionRate * 0.3);
  }

  private async getAIScoreAdjustment(profile: PersonalizationProfile, content: Content, currentScore: number): Promise<number> {
    try {
      const prompt = `
        Analyze this user profile and content for personalized scoring adjustment:
        
        User Profile:
        - Interests: ${profile.interests.join(', ')}
        - Cultural Context: ${profile.culturalContext.language}, ${profile.culturalContext.region}
        - Social Graph: Following ${profile.socialGraph.following.length} users
        
        Content:
        - Title: ${content.title}
        - Category: ${content.category}
        - Tags: ${content.tags.join(', ')}
        - Current Score: ${currentScore.toFixed(3)}
        
        Provide a score adjustment (-0.2 to +0.2) based on subtle patterns and preferences.
        Return only a number.
      `;

      const response = await aiModelManager.generateText(prompt);
      const adjustment = parseFloat(response.trim());
      
      return isNaN(adjustment) ? 0 : Math.max(-0.2, Math.min(0.2, adjustment));
    } catch (error) {
      logger.error('Error getting AI score adjustment:', error);
      return 0;
    }
  }

  private applyDiversityFilters(content: Content[], profile: PersonalizationProfile, limit: number): Content[] {
    const diversified: Content[] = [];
    const categoryCounts: Record<string, number> = {};
    const creatorCounts: Record<string, number> = {};
    
    const maxPerCategory = Math.ceil(limit / 5); // Max 5 categories
    const maxPerCreator = Math.ceil(limit / 10); // Max 10 creators

    for (const item of content) {
      if (diversified.length >= limit) break;

      const categoryCount = categoryCounts[item.category] || 0;
      const creatorCount = creatorCounts[item.creatorId] || 0;

      if (categoryCount < maxPerCategory && creatorCount < maxPerCreator) {
        diversified.push(item);
        categoryCounts[item.category] = categoryCount + 1;
        creatorCounts[item.creatorId] = creatorCount + 1;
      }
    }

    return diversified;
  }

  private async applyCulturalBridge(content: Content[], profile: PersonalizationProfile): Promise<Content[]> {
    // Add 10-20% cultural bridge content
    const bridgeContent = await this.getCulturalBridgeContent(profile.userId);
    const bridgeCount = Math.min(3, Math.ceil(content.length * 0.15));
    
    return [...content, ...bridgeContent.slice(0, bridgeCount)];
  }

  private async calculateCulturalBridgeScore(profile: PersonalizationProfile, content: Content): Promise<number> {
    if (!content.culturalContext) return 0;

    let score = 0;
    
    // Different but related cultural context
    if (content.culturalContext.region !== profile.culturalContext.region) {
      score += 0.3;
    }
    
    // Universal appeal indicators
    const universalTags = ['music', 'dance', 'art', 'nature', 'comedy', 'sports'];
    const hasUniversalAppeal = content.tags.some(tag => universalTags.includes(tag));
    if (hasUniversalAppeal) score += 0.4;
    
    // High engagement content
    const engagementRate = (content.likeCount + content.shareCount) / Math.max(1, content.viewCount);
    score += Math.min(0.3, engagementRate * 2);

    return Math.min(1, score);
  }

  private async getContentById(contentId: string): Promise<Content | null> {
    // Mock implementation - in real app, fetch from database
    const allContent = await this.getAllContent();
    return allContent.find(content => content.id === contentId) || null;
  }

  private async getAllContent(): Promise<Content[]> {
    // Mock implementation - in real app, fetch from database
    return this.contentCache.get('all') || [];
  }

  private getTrendingContent(limit: number): Content[] {
    // Mock implementation - return trending content
    return [];
  }

  private async createDefaultProfile(userId: string): Promise<PersonalizationProfile> {
    return {
      userId,
      interests: ['general', 'entertainment'],
      viewingPatterns: {
        timePreferences: [18, 19, 20, 21, 22], // Evening hours
        contentTypes: ['video', 'live_stream'],
        interactionHistory: []
      },
      culturalContext: {
        language: 'en',
        region: 'global',
        culturalPreferences: ['universal']
      },
      socialGraph: {
        following: [],
        mutualConnections: [],
        influenceScore: 50
      }
    };
  }

  private updateInterests(profile: PersonalizationProfile, category: string): void {
    if (!profile.interests.includes(category)) {
      profile.interests.push(category);
      // Keep only top 20 interests
      if (profile.interests.length > 20) {
        profile.interests = profile.interests.slice(-20);
      }
    }
  }

  private updateViewingPatterns(profile: PersonalizationProfile, interactionData: any): void {
    const currentHour = new Date().getHours();
    if (!profile.viewingPatterns.timePreferences.includes(currentHour)) {
      profile.viewingPatterns.timePreferences.push(currentHour);
    }

    profile.viewingPatterns.interactionHistory.push({
      timestamp: new Date(),
      contentCategory: interactionData.contentCategory,
      tags: interactionData.tags || [],
      engagementScore: interactionData.engagementScore || 0.5
    });

    // Keep only last 100 interactions
    if (profile.viewingPatterns.interactionHistory.length > 100) {
      profile.viewingPatterns.interactionHistory = 
        profile.viewingPatterns.interactionHistory.slice(-100);
    }
  }

  private updateSocialGraph(profile: PersonalizationProfile, interactionData: any): void {
    if (interactionData.action === 'follow' && interactionData.targetUserId) {
      if (!profile.socialGraph.following.includes(interactionData.targetUserId)) {
        profile.socialGraph.following.push(interactionData.targetUserId);
      }
    }
  }

  private initializeMockData(): void {
    // Initialize with mock content for testing
    const mockContent: Content[] = [
      {
        id: 'content_1',
        creatorId: 'creator_1',
        title: 'Amazing Dance Performance',
        description: 'Incredible dance moves from around the world',
        category: 'dance',
        tags: ['dance', 'performance', 'music', 'entertainment'],
        duration: 180,
        thumbnail: 'https://example.com/thumb1.jpg',
        viewCount: 10000,
        likeCount: 850,
        shareCount: 120,
        commentCount: 45,
        createdAt: new Date(),
        culturalContext: {
          language: 'en',
          region: 'global',
          culturalTags: ['universal', 'dance']
        },
        engagementMetrics: {
          completionRate: 0.75,
          interactionRate: 0.12,
          shareRate: 0.08
        }
      }
    ];

    this.contentCache.set('all', mockContent);
  }
}

export default HyperPersonalizationEngine;

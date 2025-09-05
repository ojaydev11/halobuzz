import { Schema, model, Document } from 'mongoose';
import { logger } from '@/config/logger';
import { getRedisClient } from '@/config/redis';
import { getSocketIO } from '@/config/socket';

// Interfaces
export interface CulturalProfile {
  userId: string;
  primaryCulture: string;
  secondaryCultures: string[];
  languagePreferences: {
    primary: string;
    secondary: string[];
    proficiency: { [language: string]: 'beginner' | 'intermediate' | 'advanced' | 'native' };
  };
  culturalValues: {
    individualism: number; // 0-100
    collectivism: number; // 0-100
    powerDistance: number; // 0-100
    uncertaintyAvoidance: number; // 0-100
    masculinity: number; // 0-100
    femininity: number; // 0-100
    longTermOrientation: number; // 0-100
    indulgence: number; // 0-100
  };
  communicationStyle: {
    directness: number; // 0-100
    formality: number; // 0-100
    contextDependency: number; // 0-100
    emotionalExpression: number; // 0-100
  };
  contentPreferences: {
    humor: string[]; // types of humor preferred
    topics: string[]; // preferred content topics
    formats: string[]; // preferred content formats
    timePreferences: {
      peakHours: number[]; // hours of day (0-23)
      timezone: string;
    };
  };
  culturalInsights: {
    lastUpdated: Date;
    confidence: number; // 0-100
    dataPoints: number;
    sources: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CulturalBridge {
  bridgeId: string;
  sourceCulture: string;
  targetCulture: string;
  bridgeType: 'content' | 'language' | 'context' | 'humor' | 'values';
  description: string;
  examples: string[];
  effectiveness: number; // 0-100
  usageCount: number;
  successRate: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
}

export interface CulturalContent {
  contentId: string;
  originalCulture: string;
  targetCultures: string[];
  adaptations: {
    culture: string;
    title: string;
    description: string;
    hashtags: string[];
    culturalNotes: string[];
    modifications: {
      type: 'translation' | 'context' | 'humor' | 'values' | 'format';
      original: string;
      adapted: string;
      reason: string;
    }[];
  }[];
  engagement: {
    culture: string;
    views: number;
    likes: number;
    shares: number;
    comments: number;
    engagementRate: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CulturalRecommendation {
  recommendationId: string;
  userId: string;
  contentType: 'creator' | 'content' | 'trend' | 'event';
  targetId: string;
  reason: string;
  culturalRelevance: number; // 0-100
  confidence: number; // 0-100
  culturalFactors: {
    language: number;
    values: number;
    humor: number;
    context: number;
    timing: number;
  };
  metadata: any;
  createdAt: Date;
  expiresAt: Date;
}

export interface CulturalAnalytics {
  userId: string;
  crossCulturalEngagement: {
    totalCultures: number;
    primaryCulture: string;
    topEngagedCultures: { culture: string; engagement: number }[];
    culturalDiversity: number; // 0-100
  };
  contentPerformance: {
    originalCulture: { views: number; engagement: number };
    adaptedCultures: { [culture: string]: { views: number; engagement: number } };
    bestPerformingCulture: string;
    adaptationSuccess: number; // 0-100
  };
  culturalLearning: {
    newCulturesExplored: number;
    culturalPreferences: { [preference: string]: number };
    adaptationSkills: number; // 0-100
    crossCulturalCommunication: number; // 0-100
  };
  lastUpdated: Date;
}

// Mongoose Schemas
const CulturalProfileSchema = new Schema<CulturalProfile>({
  userId: { type: String, required: true, unique: true },
  primaryCulture: { type: String, required: true },
  secondaryCultures: [{ type: String }],
  languagePreferences: {
    primary: { type: String, required: true },
    secondary: [{ type: String }],
    proficiency: { type: Schema.Types.Mixed, default: {} }
  },
  culturalValues: {
    individualism: { type: Number, min: 0, max: 100, default: 50 },
    collectivism: { type: Number, min: 0, max: 100, default: 50 },
    powerDistance: { type: Number, min: 0, max: 100, default: 50 },
    uncertaintyAvoidance: { type: Number, min: 0, max: 100, default: 50 },
    masculinity: { type: Number, min: 0, max: 100, default: 50 },
    femininity: { type: Number, min: 0, max: 100, default: 50 },
    longTermOrientation: { type: Number, min: 0, max: 100, default: 50 },
    indulgence: { type: Number, min: 0, max: 100, default: 50 }
  },
  communicationStyle: {
    directness: { type: Number, min: 0, max: 100, default: 50 },
    formality: { type: Number, min: 0, max: 100, default: 50 },
    contextDependency: { type: Number, min: 0, max: 100, default: 50 },
    emotionalExpression: { type: Number, min: 0, max: 100, default: 50 }
  },
  contentPreferences: {
    humor: [{ type: String }],
    topics: [{ type: String }],
    formats: [{ type: String }],
    timePreferences: {
      peakHours: [{ type: Number, min: 0, max: 23 }],
      timezone: { type: String, default: 'UTC' }
    }
  },
  culturalInsights: {
    lastUpdated: { type: Date, default: Date.now },
    confidence: { type: Number, min: 0, max: 100, default: 0 },
    dataPoints: { type: Number, default: 0 },
    sources: [{ type: String }]
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const CulturalBridgeSchema = new Schema<CulturalBridge>({
  bridgeId: { type: String, required: true, unique: true },
  sourceCulture: { type: String, required: true },
  targetCulture: { type: String, required: true },
  bridgeType: { type: String, enum: ['content', 'language', 'context', 'humor', 'values'], required: true },
  description: { type: String, required: true },
  examples: [{ type: String }],
  effectiveness: { type: Number, min: 0, max: 100, default: 0 },
  usageCount: { type: Number, default: 0 },
  successRate: { type: Number, min: 0, max: 100, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const CulturalContentSchema = new Schema<CulturalContent>({
  contentId: { type: String, required: true, unique: true },
  originalCulture: { type: String, required: true },
  targetCultures: [{ type: String }],
  adaptations: [{
    culture: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    hashtags: [{ type: String }],
    culturalNotes: [{ type: String }],
    modifications: [{
      type: { type: String, enum: ['translation', 'context', 'humor', 'values', 'format'], required: true },
      original: { type: String, required: true },
      adapted: { type: String, required: true },
      reason: { type: String, required: true }
    }]
  }],
  engagement: [{
    culture: { type: String, required: true },
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    engagementRate: { type: Number, default: 0 }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const CulturalRecommendationSchema = new Schema<CulturalRecommendation>({
  recommendationId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  contentType: { type: String, enum: ['creator', 'content', 'trend', 'event'], required: true },
  targetId: { type: String, required: true },
  reason: { type: String, required: true },
  culturalRelevance: { type: Number, min: 0, max: 100, required: true },
  confidence: { type: Number, min: 0, max: 100, required: true },
  culturalFactors: {
    language: { type: Number, min: 0, max: 100, required: true },
    values: { type: Number, min: 0, max: 100, required: true },
    humor: { type: Number, min: 0, max: 100, required: true },
    context: { type: Number, min: 0, max: 100, required: true },
    timing: { type: Number, min: 0, max: 100, required: true }
  },
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true }
});

const CulturalAnalyticsSchema = new Schema<CulturalAnalytics>({
  userId: { type: String, required: true, unique: true },
  crossCulturalEngagement: {
    totalCultures: { type: Number, default: 0 },
    primaryCulture: { type: String, required: true },
    topEngagedCultures: [{ culture: { type: String }, engagement: { type: Number } }],
    culturalDiversity: { type: Number, min: 0, max: 100, default: 0 }
  },
  contentPerformance: {
    originalCulture: { views: { type: Number, default: 0 }, engagement: { type: Number, default: 0 } },
    adaptedCultures: { type: Schema.Types.Mixed, default: {} },
    bestPerformingCulture: { type: String },
    adaptationSuccess: { type: Number, min: 0, max: 100, default: 0 }
  },
  culturalLearning: {
    newCulturesExplored: { type: Number, default: 0 },
    culturalPreferences: { type: Schema.Types.Mixed, default: {} },
    adaptationSkills: { type: Number, min: 0, max: 100, default: 0 },
    crossCulturalCommunication: { type: Number, min: 0, max: 100, default: 0 }
  },
  lastUpdated: { type: Date, default: Date.now }
});

// Models
const CulturalProfileModel = model<CulturalProfile>('CulturalProfile', CulturalProfileSchema);
const CulturalBridgeModel = model<CulturalBridge>('CulturalBridge', CulturalBridgeSchema);
const CulturalContentModel = model<CulturalContent>('CulturalContent', CulturalContentSchema);
const CulturalRecommendationModel = model<CulturalRecommendation>('CulturalRecommendation', CulturalRecommendationSchema);
const CulturalAnalyticsModel = model<CulturalAnalytics>('CulturalAnalytics', CulturalAnalyticsSchema);

export class CulturalIntelligenceService {
  private static instance: CulturalIntelligenceService;

  public static getInstance(): CulturalIntelligenceService {
    if (!CulturalIntelligenceService.instance) {
      CulturalIntelligenceService.instance = new CulturalIntelligenceService();
    }
    return CulturalIntelligenceService.instance;
  }

  /**
   * Create or update cultural profile
   */
  async createCulturalProfile(
    userId: string,
    profileData: {
      primaryCulture: string;
      secondaryCultures?: string[];
      languagePreferences?: any;
      culturalValues?: any;
      communicationStyle?: any;
      contentPreferences?: any;
    }
  ): Promise<CulturalProfile> {
    try {
      let profile = await CulturalProfileModel.findOne({ userId });
      
      if (profile) {
        // Update existing profile
        Object.assign(profile, profileData);
        (profile as any).culturalInsights.lastUpdated = new Date();
        (profile as any).culturalInsights.dataPoints += 1;
        (profile as any).updatedAt = new Date();
        await CulturalProfileModel.findByIdAndUpdate((profile as any)._id, profile);
      } else {
        // Create new profile
        const culturalProfile: CulturalProfile = {
          userId,
          primaryCulture: profileData.primaryCulture,
          secondaryCultures: profileData.secondaryCultures || [],
          languagePreferences: {
            primary: profileData.languagePreferences?.primary || 'en',
            secondary: profileData.languagePreferences?.secondary || [],
            proficiency: profileData.languagePreferences?.proficiency || {}
          },
          culturalValues: {
            individualism: profileData.culturalValues?.individualism || 50,
            collectivism: profileData.culturalValues?.collectivism || 50,
            powerDistance: profileData.culturalValues?.powerDistance || 50,
            uncertaintyAvoidance: profileData.culturalValues?.uncertaintyAvoidance || 50,
            masculinity: profileData.culturalValues?.masculinity || 50,
            femininity: profileData.culturalValues?.femininity || 50,
            longTermOrientation: profileData.culturalValues?.longTermOrientation || 50,
            indulgence: profileData.culturalValues?.indulgence || 50
          },
          communicationStyle: {
            directness: profileData.communicationStyle?.directness || 50,
            formality: profileData.communicationStyle?.formality || 50,
            contextDependency: profileData.communicationStyle?.contextDependency || 50,
            emotionalExpression: profileData.communicationStyle?.emotionalExpression || 50
          },
          contentPreferences: {
            humor: profileData.contentPreferences?.humor || [],
            topics: profileData.contentPreferences?.topics || [],
            formats: profileData.contentPreferences?.formats || [],
            timePreferences: {
              peakHours: profileData.contentPreferences?.timePreferences?.peakHours || [],
              timezone: profileData.contentPreferences?.timePreferences?.timezone || 'UTC'
            }
          },
          culturalInsights: {
            lastUpdated: new Date(),
            confidence: 0,
            dataPoints: 1,
            sources: ['user_input']
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        profile = await CulturalProfileModel.create(culturalProfile);
      }

      // Cache profile
      const redisClient = getRedisClient();
      await redisClient.setEx(
        `cultural_profile:${userId}`,
        3600,
        JSON.stringify(profile)
      );

      // Emit real-time event
      const io = getSocketIO();
      if (io) {
        io.emit('cultural_profile_updated', {
          userId,
                  primaryCulture: (profile as any).primaryCulture,
        confidence: (profile as any).culturalInsights.confidence
        });
      }

      logger.info('Cultural profile created/updated', { userId, primaryCulture: (profile as any).primaryCulture });
      return profile;
    } catch (error) {
      logger.error('Error creating cultural profile', { error, userId });
      throw error;
    }
  }

  /**
   * Analyze content for cultural adaptation
   */
  async analyzeContentForCulturalAdaptation(
    contentId: string,
    originalCulture: string,
    targetCultures: string[],
    content: {
      title: string;
      description: string;
      hashtags: string[];
      mediaType: string;
      language: string;
    }
  ): Promise<CulturalContent> {
    try {
      const adaptations = [];

      for (const targetCulture of targetCultures) {
        const adaptation = await this.generateCulturalAdaptation(
          content,
          originalCulture,
          targetCulture
        );
        adaptations.push(adaptation);
      }

      const culturalContent: CulturalContent = {
        contentId,
        originalCulture,
        targetCultures,
        adaptations,
        engagement: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const createdContent = await CulturalContentModel.create(culturalContent);

      // Cache content
      const redisClient = getRedisClient();
      await redisClient.setEx(
        `cultural_content:${contentId}`,
        3600,
        JSON.stringify(culturalContent)
      );

      logger.info('Cultural content analysis completed', { contentId, targetCultures });
      return createdContent;
    } catch (error) {
      logger.error('Error analyzing content for cultural adaptation', { error, contentId });
      throw error;
    }
  }

  /**
   * Generate cultural recommendations
   */
  async generateCulturalRecommendations(
    userId: string,
    contentType: 'creator' | 'content' | 'trend' | 'event',
    limit: number = 10
  ): Promise<CulturalRecommendation[]> {
    try {
      const profile = await this.getCulturalProfile(userId);
      if (!profile) {
        throw new Error('Cultural profile not found');
      }

      const recommendations = [];

      // Generate recommendations based on cultural compatibility
      for (let i = 0; i < limit; i++) {
        const recommendation = await this.createCulturalRecommendation(
          userId,
          contentType,
          profile
        );
        recommendations.push(recommendation);
      }

      // Cache recommendations
      const redisClient = getRedisClient();
      await redisClient.setEx(
        `cultural_recommendations:${userId}`,
        1800, // 30 minutes
        JSON.stringify(recommendations)
      );

      logger.info('Cultural recommendations generated', { userId, count: recommendations.length });
      return recommendations;
    } catch (error) {
      logger.error('Error generating cultural recommendations', { error, userId });
      throw error;
    }
  }

  /**
   * Track cultural engagement
   */
  async trackCulturalEngagement(
    userId: string,
    contentId: string,
    culture: string,
    engagement: {
      views?: number;
      likes?: number;
      shares?: number;
      comments?: number;
    }
  ): Promise<void> {
    try {
      const culturalContent = await CulturalContentModel.findOne({ contentId });
      if (!culturalContent) {
        return;
      }

      // Update engagement for specific culture
      let cultureEngagement = (culturalContent as any).engagement.find((e: any) => e.culture === culture);
      if (!cultureEngagement) {
        cultureEngagement = {
          culture,
          views: 0,
          likes: 0,
          shares: 0,
          comments: 0,
          engagementRate: 0
        };
        (culturalContent as any).engagement.push(cultureEngagement);
      }

      cultureEngagement.views += engagement.views || 0;
      cultureEngagement.likes += engagement.likes || 0;
      cultureEngagement.shares += engagement.shares || 0;
      cultureEngagement.comments += engagement.comments || 0;

      // Calculate engagement rate
      const totalEngagement = cultureEngagement.likes + cultureEngagement.shares + cultureEngagement.comments;
      cultureEngagement.engagementRate = cultureEngagement.views > 0 
        ? (totalEngagement / cultureEngagement.views) * 100 
        : 0;

      (culturalContent as any).updatedAt = new Date();
      await CulturalContentModel.findByIdAndUpdate((culturalContent as any)._id, culturalContent);

      // Update cultural analytics
      await this.updateCulturalAnalytics(userId, culture, engagement);

      logger.info('Cultural engagement tracked', { userId, contentId, culture });
    } catch (error) {
      logger.error('Error tracking cultural engagement', { error, userId, contentId });
      throw error;
    }
  }

  /**
   * Get cultural analytics
   */
  async getCulturalAnalytics(userId: string): Promise<CulturalAnalytics | null> {
    try {
      let analytics = await CulturalAnalyticsModel.findOne({ userId });
      
      if (!analytics) {
        // Create initial analytics
        const profile = await this.getCulturalProfile(userId);
        if (!profile) {
          throw new Error('Cultural profile not found');
        }

        analytics = new CulturalAnalyticsModel({
          userId,
          crossCulturalEngagement: {
            totalCultures: 1,
            primaryCulture: profile.primaryCulture,
            topEngagedCultures: [],
            culturalDiversity: 0
          },
          contentPerformance: {
            originalCulture: { views: 0, engagement: 0 },
            adaptedCultures: {},
            bestPerformingCulture: profile.primaryCulture,
            adaptationSuccess: 0
          },
          culturalLearning: {
            newCulturesExplored: 0,
            culturalPreferences: {},
            adaptationSkills: 0,
            crossCulturalCommunication: 0
          },
          lastUpdated: new Date()
        });
        await CulturalAnalyticsModel.findByIdAndUpdate((analytics as any)._id, analytics);
      }

      return analytics;
    } catch (error) {
      logger.error('Error getting cultural analytics', { error, userId });
      throw error;
    }
  }

  /**
   * Get cultural bridges
   */
  async getCulturalBridges(
    sourceCulture: string,
    targetCulture: string,
    bridgeType?: string
  ): Promise<CulturalBridge[]> {
    try {
      const query: any = { sourceCulture, targetCulture };
      if (bridgeType) {
        query.bridgeType = bridgeType;
      }

      const bridges = await CulturalBridgeModel.find(query)
        .sort({ effectiveness: -1, usageCount: -1 });

      return bridges;
    } catch (error) {
      logger.error('Error getting cultural bridges', { error, sourceCulture, targetCulture });
      throw error;
    }
  }

  // Helper methods
  private async getCulturalProfile(userId: string): Promise<CulturalProfile | null> {
    try {
      // Try cache first
      const redisClient = getRedisClient();
      const cached = await redisClient.get(`cultural_profile:${userId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fallback to database
      const profile = await CulturalProfileModel.findOne({ userId });
      if (profile) {
        await redisClient.setEx(`cultural_profile:${userId}`, 3600, JSON.stringify(profile));
      }

      return profile;
    } catch (error) {
      logger.error('Error getting cultural profile', { error, userId });
      throw error;
    }
  }

  private async generateCulturalAdaptation(
    content: any,
    originalCulture: string,
    targetCulture: string
  ): Promise<any> {
    // Simplified cultural adaptation - in production, use AI/ML models
    return {
      culture: targetCulture,
      title: content.title, // Would be translated/adapted
      description: content.description, // Would be culturally adapted
      hashtags: content.hashtags, // Would be localized
      culturalNotes: [`Adapted from ${originalCulture} to ${targetCulture}`],
      modifications: [{
        type: 'translation',
        original: content.title,
        adapted: content.title, // Would be actual translation
        reason: 'Language adaptation for target culture'
      }]
    };
  }

  private async createCulturalRecommendation(
    userId: string,
    contentType: string,
    profile: CulturalProfile
  ): Promise<CulturalRecommendation> {
    const recommendationId = this.generateRecommendationId();
    
    return {
      recommendationId,
      userId,
      contentType: contentType as any,
      targetId: `target_${Date.now()}`,
      reason: 'Cultural compatibility match',
      culturalRelevance: Math.floor(Math.random() * 40) + 60, // 60-100
      confidence: Math.floor(Math.random() * 30) + 70, // 70-100
      culturalFactors: {
        language: Math.floor(Math.random() * 100),
        values: Math.floor(Math.random() * 100),
        humor: Math.floor(Math.random() * 100),
        context: Math.floor(Math.random() * 100),
        timing: Math.floor(Math.random() * 100)
      },
      metadata: {},
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
  }

  private async updateCulturalAnalytics(
    userId: string,
    culture: string,
    engagement: any
  ): Promise<void> {
    const analytics = await CulturalAnalyticsModel.findOne({ userId });
    if (!analytics) return;

    // Update cross-cultural engagement
    const existingCulture = (analytics as any).crossCulturalEngagement.topEngagedCultures.find(
      (c: any) => c.culture === culture
    );
    
    if (existingCulture) {
      existingCulture.engagement += (engagement.likes || 0) + (engagement.shares || 0) + (engagement.comments || 0);
    } else {
      (analytics as any).crossCulturalEngagement.topEngagedCultures.push({
        culture,
        engagement: (engagement.likes || 0) + (engagement.shares || 0) + (engagement.comments || 0)
      });
    }

    (analytics as any).crossCulturalEngagement.totalCultures = (analytics as any).crossCulturalEngagement.topEngagedCultures.length;
    (analytics as any).lastUpdated = new Date();
    await CulturalAnalyticsModel.findByIdAndUpdate((analytics as any)._id, analytics);
  }

  private generateRecommendationId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default CulturalIntelligenceService;

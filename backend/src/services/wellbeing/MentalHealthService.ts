import { Schema, model, Document } from 'mongoose';
import { logger } from '@/config/logger';
import { getRedisClient } from '@/config/redis';
import { getSocketIO } from '@/config/socket';

// Interfaces
export interface WellbeingProfile {
  userId: string;
  mentalHealthScore: number; // 0-100
  stressLevel: number; // 0-100
  moodTrend: {
    current: number; // -100 to 100
    average: number; // -100 to 100
    trend: 'improving' | 'stable' | 'declining';
    lastUpdated: Date;
  };
  screenTime: {
    daily: number; // minutes
    weekly: number; // minutes
    average: number; // minutes per day
    lastUpdated: Date;
  };
  socialEngagement: {
    positive: number; // 0-100
    negative: number; // 0-100
    neutral: number; // 0-100
    lastUpdated: Date;
  };
  contentConsumption: {
    educational: number; // percentage
    entertainment: number; // percentage
    social: number; // percentage
    news: number; // percentage
    lastUpdated: Date;
  };
  wellbeingFactors: {
    sleep: number; // 0-100
    exercise: number; // 0-100
    social: number; // 0-100
    work: number; // 0-100
    leisure: number; // 0-100
  };
  riskFactors: {
    excessiveScreenTime: boolean;
    negativeContent: boolean;
    socialIsolation: boolean;
    stressIndicators: boolean;
    sleepDisruption: boolean;
  };
  interventions: {
    active: string[];
    completed: string[];
    recommended: string[];
  };
  privacySettings: {
    dataSharing: boolean;
    interventionAlerts: boolean;
    familyNotifications: boolean;
    therapistAccess: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface WellbeingCheck {
  checkId: string;
  userId: string;
  type: 'daily' | 'weekly' | 'monthly' | 'triggered';
  responses: {
    question: string;
    answer: number; // 1-5 scale
    category: 'mood' | 'stress' | 'sleep' | 'social' | 'energy' | 'anxiety';
  }[];
  overallScore: number; // 0-100
  recommendations: string[];
  completedAt: Date;
  nextCheck: Date;
}

export interface WellbeingIntervention {
  interventionId: string;
  userId: string;
  type: 'break_reminder' | 'content_filter' | 'social_encouragement' | 'mindfulness' | 'professional_help';
  title: string;
  description: string;
  action: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'active' | 'completed' | 'dismissed' | 'expired';
  effectiveness: number; // 0-100
  createdAt: Date;
  expiresAt?: Date;
  completedAt?: Date;
}

export interface WellbeingAlert {
  alertId: string;
  userId: string;
  type: 'risk' | 'concern' | 'improvement' | 'milestone';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  data: any;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  createdAt: Date;
}

export interface WellbeingAnalytics {
  userId: string;
  period: 'week' | 'month' | 'quarter' | 'year';
  mentalHealthTrend: {
    startScore: number;
    endScore: number;
    averageScore: number;
    improvement: number;
    dataPoints: number;
  };
  screenTimeAnalysis: {
    totalTime: number;
    averageDaily: number;
    peakHours: number[];
    contentBreakdown: { [category: string]: number };
    healthyLimit: number;
    overLimit: boolean;
  };
  socialEngagementAnalysis: {
    positiveInteractions: number;
    negativeInteractions: number;
    socialScore: number;
    isolationRisk: boolean;
    communityParticipation: number;
  };
  interventionEffectiveness: {
    totalInterventions: number;
    completedInterventions: number;
    averageEffectiveness: number;
    mostEffective: string[];
    improvementAreas: string[];
  };
  riskAssessment: {
    overallRisk: 'low' | 'medium' | 'high';
    riskFactors: string[];
    protectiveFactors: string[];
    recommendations: string[];
  };
  lastUpdated: Date;
}

export interface WellbeingResource {
  resourceId: string;
  title: string;
  description: string;
  type: 'article' | 'video' | 'audio' | 'exercise' | 'meditation' | 'professional';
  category: 'anxiety' | 'depression' | 'stress' | 'sleep' | 'social' | 'general';
  content: string;
  duration?: number; // minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  effectiveness: number; // 0-100
  usageCount: number;
  rating: number; // 0-5
  tags: string[];
  isFree: boolean;
  requiresProfessional: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Mongoose Schemas
const WellbeingProfileSchema = new Schema<WellbeingProfile>({
  userId: { type: String, required: true, unique: true },
  mentalHealthScore: { type: Number, min: 0, max: 100, default: 50 },
  stressLevel: { type: Number, min: 0, max: 100, default: 50 },
  moodTrend: {
    current: { type: Number, min: -100, max: 100, default: 0 },
    average: { type: Number, min: -100, max: 100, default: 0 },
    trend: { type: String, enum: ['improving', 'stable', 'declining'], default: 'stable' },
    lastUpdated: { type: Date, default: Date.now }
  },
  screenTime: {
    daily: { type: Number, default: 0 },
    weekly: { type: Number, default: 0 },
    average: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  },
  socialEngagement: {
    positive: { type: Number, min: 0, max: 100, default: 50 },
    negative: { type: Number, min: 0, max: 100, default: 50 },
    neutral: { type: Number, min: 0, max: 100, default: 50 },
    lastUpdated: { type: Date, default: Date.now }
  },
  contentConsumption: {
    educational: { type: Number, min: 0, max: 100, default: 25 },
    entertainment: { type: Number, min: 0, max: 100, default: 25 },
    social: { type: Number, min: 0, max: 100, default: 25 },
    news: { type: Number, min: 0, max: 100, default: 25 },
    lastUpdated: { type: Date, default: Date.now }
  },
  wellbeingFactors: {
    sleep: { type: Number, min: 0, max: 100, default: 50 },
    exercise: { type: Number, min: 0, max: 100, default: 50 },
    social: { type: Number, min: 0, max: 100, default: 50 },
    work: { type: Number, min: 0, max: 100, default: 50 },
    leisure: { type: Number, min: 0, max: 100, default: 50 }
  },
  riskFactors: {
    excessiveScreenTime: { type: Boolean, default: false },
    negativeContent: { type: Boolean, default: false },
    socialIsolation: { type: Boolean, default: false },
    stressIndicators: { type: Boolean, default: false },
    sleepDisruption: { type: Boolean, default: false }
  },
  interventions: {
    active: [{ type: String }],
    completed: [{ type: String }],
    recommended: [{ type: String }]
  },
  privacySettings: {
    dataSharing: { type: Boolean, default: false },
    interventionAlerts: { type: Boolean, default: true },
    familyNotifications: { type: Boolean, default: false },
    therapistAccess: { type: Boolean, default: false }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const WellbeingCheckSchema = new Schema<WellbeingCheck>({
  checkId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  type: { type: String, enum: ['daily', 'weekly', 'monthly', 'triggered'], required: true },
  responses: [{
    question: { type: String, required: true },
    answer: { type: Number, min: 1, max: 5, required: true },
    category: { type: String, enum: ['mood', 'stress', 'sleep', 'social', 'energy', 'anxiety'], required: true }
  }],
  overallScore: { type: Number, min: 0, max: 100, required: true },
  recommendations: [{ type: String }],
  completedAt: { type: Date, default: Date.now },
  nextCheck: { type: Date, required: true }
});

const WellbeingInterventionSchema = new Schema<WellbeingIntervention>({
  interventionId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  type: { type: String, enum: ['break_reminder', 'content_filter', 'social_encouragement', 'mindfulness', 'professional_help'], required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  action: { type: String, required: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: { type: String, enum: ['active', 'completed', 'dismissed', 'expired'], default: 'active' },
  effectiveness: { type: Number, min: 0, max: 100, default: 0 },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  completedAt: { type: Date }
});

const WellbeingAlertSchema = new Schema<WellbeingAlert>({
  alertId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  type: { type: String, enum: ['risk', 'concern', 'improvement', 'milestone'], required: true },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
  message: { type: String, required: true },
  data: { type: Schema.Types.Mixed },
  acknowledged: { type: Boolean, default: false },
  acknowledgedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

const WellbeingAnalyticsSchema = new Schema<WellbeingAnalytics>({
  userId: { type: String, required: true },
  period: { type: String, enum: ['week', 'month', 'quarter', 'year'], required: true },
  mentalHealthTrend: {
    startScore: { type: Number, required: true },
    endScore: { type: Number, required: true },
    averageScore: { type: Number, required: true },
    improvement: { type: Number, required: true },
    dataPoints: { type: Number, required: true }
  },
  screenTimeAnalysis: {
    totalTime: { type: Number, required: true },
    averageDaily: { type: Number, required: true },
    peakHours: [{ type: Number }],
    contentBreakdown: { type: Schema.Types.Mixed },
    healthyLimit: { type: Number, required: true },
    overLimit: { type: Boolean, required: true }
  },
  socialEngagementAnalysis: {
    positiveInteractions: { type: Number, required: true },
    negativeInteractions: { type: Number, required: true },
    socialScore: { type: Number, required: true },
    isolationRisk: { type: Boolean, required: true },
    communityParticipation: { type: Number, required: true }
  },
  interventionEffectiveness: {
    totalInterventions: { type: Number, required: true },
    completedInterventions: { type: Number, required: true },
    averageEffectiveness: { type: Number, required: true },
    mostEffective: [{ type: String }],
    improvementAreas: [{ type: String }]
  },
  riskAssessment: {
    overallRisk: { type: String, enum: ['low', 'medium', 'high'], required: true },
    riskFactors: [{ type: String }],
    protectiveFactors: [{ type: String }],
    recommendations: [{ type: String }]
  },
  lastUpdated: { type: Date, default: Date.now }
});

const WellbeingResourceSchema = new Schema<WellbeingResource>({
  resourceId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: { type: String, enum: ['article', 'video', 'audio', 'exercise', 'meditation', 'professional'], required: true },
  category: { type: String, enum: ['anxiety', 'depression', 'stress', 'sleep', 'social', 'general'], required: true },
  content: { type: String, required: true },
  duration: { type: Number },
  difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
  effectiveness: { type: Number, min: 0, max: 100, default: 0 },
  usageCount: { type: Number, default: 0 },
  rating: { type: Number, min: 0, max: 5, default: 0 },
  tags: [{ type: String }],
  isFree: { type: Boolean, default: true },
  requiresProfessional: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Models
const WellbeingProfileModel = model<WellbeingProfile & Document>('WellbeingProfile', WellbeingProfileSchema);
const WellbeingCheckModel = model<WellbeingCheck & Document>('WellbeingCheck', WellbeingCheckSchema);
const WellbeingInterventionModel = model<WellbeingIntervention & Document>('WellbeingIntervention', WellbeingInterventionSchema);
const WellbeingAlertModel = model<WellbeingAlert & Document>('WellbeingAlert', WellbeingAlertSchema);
const WellbeingAnalyticsModel = model<WellbeingAnalytics & Document>('WellbeingAnalytics', WellbeingAnalyticsSchema);
const WellbeingResourceModel = model<WellbeingResource & Document>('WellbeingResource', WellbeingResourceSchema);

export class MentalHealthService {
  private static instance: MentalHealthService;

  public static getInstance(): MentalHealthService {
    if (!MentalHealthService.instance) {
      MentalHealthService.instance = new MentalHealthService();
    }
    return MentalHealthService.instance;
  }

  /**
   * Create or update wellbeing profile
   */
  async createWellbeingProfile(
    userId: string,
    profileData: {
      mentalHealthScore?: number;
      stressLevel?: number;
      wellbeingFactors?: any;
      privacySettings?: any;
    }
  ): Promise<WellbeingProfile> {
    try {
      let profile = await WellbeingProfileModel.findOne({ userId });
      
      if (profile) {
        // Update existing profile
        Object.assign(profile, profileData);
        profile.updatedAt = new Date();
        await profile.save();
      } else {
        // Create new profile
        const wellbeingProfile: WellbeingProfile = {
          userId,
          mentalHealthScore: profileData.mentalHealthScore || 50,
          stressLevel: profileData.stressLevel || 50,
          moodTrend: {
            current: 0,
            average: 0,
            trend: 'stable',
            lastUpdated: new Date()
          },
          screenTime: {
            daily: 0,
            weekly: 0,
            average: 0,
            lastUpdated: new Date()
          },
          socialEngagement: {
            positive: 50,
            negative: 50,
            neutral: 50,
            lastUpdated: new Date()
          },
          contentConsumption: {
            educational: 25,
            entertainment: 25,
            social: 25,
            news: 25,
            lastUpdated: new Date()
          },
          wellbeingFactors: {
            sleep: profileData.wellbeingFactors?.sleep || 50,
            exercise: profileData.wellbeingFactors?.exercise || 50,
            social: profileData.wellbeingFactors?.social || 50,
            work: profileData.wellbeingFactors?.work || 50,
            leisure: profileData.wellbeingFactors?.leisure || 50
          },
          riskFactors: {
            excessiveScreenTime: false,
            negativeContent: false,
            socialIsolation: false,
            stressIndicators: false,
            sleepDisruption: false
          },
          interventions: {
            active: [],
            completed: [],
            recommended: []
          },
          privacySettings: {
            dataSharing: profileData.privacySettings?.dataSharing || false,
            interventionAlerts: profileData.privacySettings?.interventionAlerts || true,
            familyNotifications: profileData.privacySettings?.familyNotifications || false,
            therapistAccess: profileData.privacySettings?.therapistAccess || false
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        profile = await WellbeingProfileModel.create(wellbeingProfile);
      }

      // Cache profile
      await redisClient.setex(
        `wellbeing_profile:${userId}`,
        3600,
        JSON.stringify(profile)
      );

      // Emit real-time event
      io.emit('wellbeing_profile_updated', {
        userId,
        mentalHealthScore: profile.mentalHealthScore,
        stressLevel: profile.stressLevel
      });

      logger.info('Wellbeing profile created/updated', { userId, mentalHealthScore: profile.mentalHealthScore });
      return profile;
    } catch (error) {
      logger.error('Error creating wellbeing profile', { error, userId });
      throw error;
    }
  }

  /**
   * Complete wellbeing check
   */
  async completeWellbeingCheck(
    userId: string,
    type: 'daily' | 'weekly' | 'monthly' | 'triggered',
    responses: {
      question: string;
      answer: number;
      category: 'mood' | 'stress' | 'sleep' | 'social' | 'energy' | 'anxiety';
    }[]
  ): Promise<WellbeingCheck> {
    try {
      const checkId = this.generateCheckId();
      
      // Calculate overall score
      const overallScore = this.calculateWellbeingScore(responses);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(responses, overallScore);
      
      // Determine next check date
      const nextCheck = this.calculateNextCheckDate(type);

      const wellbeingCheck: WellbeingCheck = {
        checkId,
        userId,
        type,
        responses,
        overallScore,
        recommendations,
        completedAt: new Date(),
        nextCheck
      };

      const createdCheck = await WellbeingCheckModel.create(wellbeingCheck);

      // Update profile with new data
      await this.updateProfileFromCheck(userId, responses, overallScore);

      // Check for interventions needed
      await this.checkForInterventions(userId, overallScore, responses);

      // Emit real-time event
      io.emit('wellbeing_check_completed', {
        userId,
        checkId,
        overallScore,
        type
      });

      logger.info('Wellbeing check completed', { userId, checkId, overallScore, type });
      return createdCheck;
    } catch (error) {
      logger.error('Error completing wellbeing check', { error, userId, type });
      throw error;
    }
  }

  /**
   * Create wellbeing intervention
   */
  async createIntervention(
    userId: string,
    type: 'break_reminder' | 'content_filter' | 'social_encouragement' | 'mindfulness' | 'professional_help',
    title: string,
    description: string,
    action: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
    expiresAt?: Date
  ): Promise<WellbeingIntervention> {
    try {
      const interventionId = this.generateInterventionId();
      
      const intervention: WellbeingIntervention = {
        interventionId,
        userId,
        type,
        title,
        description,
        action,
        priority,
        status: 'active',
        effectiveness: 0,
        createdAt: new Date(),
        expiresAt
      };

      const createdIntervention = await WellbeingInterventionModel.create(intervention);

      // Update profile
      await WellbeingProfileModel.updateOne(
        { userId },
        { $push: { 'interventions.active': interventionId } }
      );

      // Create alert if high priority
      if (priority === 'high' || priority === 'urgent') {
        await this.createAlert(userId, 'concern', priority, title, { interventionId });
      }

      // Emit real-time event
      io.emit('wellbeing_intervention_created', {
        userId,
        interventionId,
        type,
        priority
      });

      logger.info('Wellbeing intervention created', { userId, interventionId, type, priority });
      return createdIntervention;
    } catch (error) {
      logger.error('Error creating wellbeing intervention', { error, userId, type });
      throw error;
    }
  }

  /**
   * Track screen time
   */
  async trackScreenTime(
    userId: string,
    duration: number, // minutes
    category: 'educational' | 'entertainment' | 'social' | 'news'
  ): Promise<void> {
    try {
      const profile = await this.getWellbeingProfile(userId);
      if (!profile) {
        throw new Error('Wellbeing profile not found');
      }

      // Update screen time
      profile.screenTime.daily += duration;
      profile.screenTime.weekly += duration;
      profile.screenTime.average = profile.screenTime.weekly / 7;
      profile.screenTime.lastUpdated = new Date();

      // Update content consumption
      const totalConsumption = Object.values(profile.contentConsumption).reduce((sum, val) => sum + val, 0);
      profile.contentConsumption[category] += duration;
      profile.contentConsumption.lastUpdated = new Date();

      // Check for excessive screen time
      const dailyLimit = 480; // 8 hours
      if (profile.screenTime.daily > dailyLimit) {
        profile.riskFactors.excessiveScreenTime = true;
        
        // Create intervention if not already active
        const existingIntervention = await WellbeingInterventionModel.findOne({
          userId,
          type: 'break_reminder',
          status: 'active'
        });

        if (!existingIntervention) {
          await this.createIntervention(
            userId,
            'break_reminder',
            'Screen Time Break',
            'You\'ve been using the app for a while. Consider taking a break.',
            'Take a 15-minute break',
            'medium'
          );
        }
      }

      profile.updatedAt = new Date();
      await profile.save();

      // Update cache
      await redisClient.setex(
        `wellbeing_profile:${userId}`,
        3600,
        JSON.stringify(profile)
      );

      logger.info('Screen time tracked', { userId, duration, category });
    } catch (error) {
      logger.error('Error tracking screen time', { error, userId, duration });
      throw error;
    }
  }

  /**
   * Get wellbeing analytics
   */
  async getWellbeingAnalytics(
    userId: string,
    period: 'week' | 'month' | 'quarter' | 'year'
  ): Promise<WellbeingAnalytics> {
    try {
      const startDate = this.calculatePeriodStart(period);
      const endDate = new Date();

      // Get checks for the period
      const checks = await WellbeingCheckModel.find({
        userId,
        completedAt: { $gte: startDate, $lte: endDate }
      }).sort({ completedAt: 1 });

      // Calculate mental health trend
      const scores = checks.map(check => check.overallScore);
      const mentalHealthTrend = {
        startScore: scores[0] || 50,
        endScore: scores[scores.length - 1] || 50,
        averageScore: scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 50,
        improvement: scores.length > 1 ? scores[scores.length - 1] - scores[0] : 0,
        dataPoints: scores.length
      };

      // Get screen time analysis
      const profile = await this.getWellbeingProfile(userId);
      const screenTimeAnalysis = {
        totalTime: profile?.screenTime.weekly || 0,
        averageDaily: profile?.screenTime.average || 0,
        peakHours: [], // Would need detailed tracking
        contentBreakdown: profile?.contentConsumption || {},
        healthyLimit: 480, // 8 hours
        overLimit: (profile?.screenTime.average || 0) > 480
      };

      // Get intervention effectiveness
      const interventions = await WellbeingInterventionModel.find({
        userId,
        createdAt: { $gte: startDate, $lte: endDate }
      });

      const interventionEffectiveness = {
        totalInterventions: interventions.length,
        completedInterventions: interventions.filter(i => i.status === 'completed').length,
        averageEffectiveness: interventions.length > 0 
          ? interventions.reduce((sum, i) => sum + i.effectiveness, 0) / interventions.length 
          : 0,
        mostEffective: [], // Would analyze effectiveness
        improvementAreas: [] // Would analyze areas for improvement
      };

      // Risk assessment
      const riskAssessment = await this.assessRisk(userId, profile);

      const analytics: WellbeingAnalytics = {
        userId,
        period,
        mentalHealthTrend,
        screenTimeAnalysis,
        socialEngagementAnalysis: {
          positiveInteractions: 0, // Would track from social data
          negativeInteractions: 0,
          socialScore: profile?.socialEngagement.positive || 50,
          isolationRisk: profile?.riskFactors.socialIsolation || false,
          communityParticipation: 0
        },
        interventionEffectiveness,
        riskAssessment,
        lastUpdated: new Date()
      };

      return analytics;
    } catch (error) {
      logger.error('Error getting wellbeing analytics', { error, userId, period });
      throw error;
    }
  }

  /**
   * Get wellbeing resources
   */
  async getWellbeingResources(
    category?: 'anxiety' | 'depression' | 'stress' | 'sleep' | 'social' | 'general',
    difficulty?: 'beginner' | 'intermediate' | 'advanced'
  ): Promise<WellbeingResource[]> {
    try {
      const query: any = {};
      if (category) query.category = category;
      if (difficulty) query.difficulty = difficulty;

      const resources = await WellbeingResourceModel.find(query)
        .sort({ effectiveness: -1, rating: -1 });

      return resources;
    } catch (error) {
      logger.error('Error getting wellbeing resources', { error, category, difficulty });
      throw error;
    }
  }

  // Helper methods
  private async getWellbeingProfile(userId: string): Promise<WellbeingProfile | null> {
    try {
      // Try cache first
      const cached = await redisClient.get(`wellbeing_profile:${userId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fallback to database
      const profile = await WellbeingProfileModel.findOne({ userId });
      if (profile) {
        await redisClient.setex(`wellbeing_profile:${userId}`, 3600, JSON.stringify(profile));
      }

      return profile;
    } catch (error) {
      logger.error('Error getting wellbeing profile', { error, userId });
      throw error;
    }
  }

  private calculateWellbeingScore(responses: any[]): number {
    const totalScore = responses.reduce((sum, response) => sum + response.answer, 0);
    const maxScore = responses.length * 5;
    return Math.round((totalScore / maxScore) * 100);
  }

  private generateRecommendations(responses: any[], score: number): string[] {
    const recommendations = [];
    
    if (score < 40) {
      recommendations.push('Consider speaking with a mental health professional');
      recommendations.push('Try mindfulness or meditation exercises');
    } else if (score < 60) {
      recommendations.push('Take regular breaks throughout the day');
      recommendations.push('Engage in activities you enjoy');
    } else {
      recommendations.push('Keep up the great work!');
      recommendations.push('Continue your current wellness practices');
    }

    return recommendations;
  }

  private calculateNextCheckDate(type: string): Date {
    const now = new Date();
    switch (type) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  private async updateProfileFromCheck(userId: string, responses: any[], score: number): Promise<void> {
    const profile = await this.getWellbeingProfile(userId);
    if (!profile) return;

    // Update mental health score
    profile.mentalHealthScore = score;

    // Update mood trend
    const moodResponse = responses.find(r => r.category === 'mood');
    if (moodResponse) {
      profile.moodTrend.current = (moodResponse.answer - 3) * 25; // Convert 1-5 to -50 to 50
      profile.moodTrend.average = (profile.moodTrend.average + profile.moodTrend.current) / 2;
      profile.moodTrend.lastUpdated = new Date();
    }

    // Update stress level
    const stressResponse = responses.find(r => r.category === 'stress');
    if (stressResponse) {
      profile.stressLevel = stressResponse.answer * 20; // Convert 1-5 to 20-100
    }

    profile.updatedAt = new Date();
    await profile.save();
  }

  private async checkForInterventions(userId: string, score: number, responses: any[]): Promise<void> {
    if (score < 30) {
      // High risk - create urgent intervention
      await this.createIntervention(
        userId,
        'professional_help',
        'Professional Support Recommended',
        'Your wellbeing check indicates you may benefit from professional support.',
        'Contact a mental health professional',
        'urgent'
      );
    } else if (score < 50) {
      // Medium risk - create mindfulness intervention
      await this.createIntervention(
        userId,
        'mindfulness',
        'Mindfulness Practice',
        'Try a guided meditation or breathing exercise.',
        'Practice mindfulness for 10 minutes',
        'medium'
      );
    }
  }

  private async createAlert(
    userId: string,
    type: 'risk' | 'concern' | 'improvement' | 'milestone',
    severity: 'low' | 'medium' | 'high' | 'critical',
    message: string,
    data: any
  ): Promise<void> {
    const alertId = this.generateAlertId();
    
    const alert: WellbeingAlert = {
      alertId,
      userId,
      type,
      severity,
      message,
      data,
      acknowledged: false,
      createdAt: new Date()
    };

    await WellbeingAlertModel.create(alert);

    // Emit real-time alert
    io.emit('wellbeing_alert', {
      userId,
      alertId,
      type,
      severity,
      message
    });
  }

  private async assessRisk(userId: string, profile: WellbeingProfile | null): Promise<any> {
    if (!profile) {
      return {
        overallRisk: 'low',
        riskFactors: [],
        protectiveFactors: [],
        recommendations: []
      };
    }

    const riskFactors = [];
    const protectiveFactors = [];

    if (profile.riskFactors.excessiveScreenTime) riskFactors.push('Excessive screen time');
    if (profile.riskFactors.negativeContent) riskFactors.push('Negative content consumption');
    if (profile.riskFactors.socialIsolation) riskFactors.push('Social isolation');
    if (profile.riskFactors.stressIndicators) riskFactors.push('High stress indicators');
    if (profile.riskFactors.sleepDisruption) riskFactors.push('Sleep disruption');

    if (profile.mentalHealthScore > 70) protectiveFactors.push('Good mental health score');
    if (profile.socialEngagement.positive > 60) protectiveFactors.push('Positive social engagement');
    if (profile.wellbeingFactors.exercise > 60) protectiveFactors.push('Regular exercise');

    const overallRisk = riskFactors.length > 2 ? 'high' : riskFactors.length > 0 ? 'medium' : 'low';

    return {
      overallRisk,
      riskFactors,
      protectiveFactors,
      recommendations: this.generateRiskRecommendations(riskFactors)
    };
  }

  private generateRiskRecommendations(riskFactors: string[]): string[] {
    const recommendations = [];
    
    if (riskFactors.includes('Excessive screen time')) {
      recommendations.push('Set screen time limits and take regular breaks');
    }
    if (riskFactors.includes('Social isolation')) {
      recommendations.push('Increase social interactions and community participation');
    }
    if (riskFactors.includes('High stress indicators')) {
      recommendations.push('Practice stress management techniques');
    }

    return recommendations;
  }

  private calculatePeriodStart(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'quarter':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case 'year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  }

  private generateCheckId(): string {
    return `check_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateInterventionId(): string {
    return `intervention_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default MentalHealthService;

import axios from 'axios';
import { logger } from '../config/logger';
import { User } from '../models/User';
import { LiveStream } from '../models/LiveStream';
import { Gift } from '../models/Gift';
import { Festival } from '../models/Festival';
import { getCache, setCache } from '../config/redis';

interface AIResponse {
  success: boolean;
  message: string;
  suggestions?: string[];
  actions?: any[];
  confidence: number;
  metadata?: any;
}

interface EngagementBoost {
  type: 'chat' | 'gift' | 'interaction' | 'content';
  suggestion: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high';
  metadata?: any;
}

interface WhaleInfo {
  userId: string;
  username: string;
  totalSpent: number;
  recentActivity: string;
  preferences: string[];
  lastSeen: Date;
}

interface FestivalEvent {
  festivalId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  gifts: string[];
  events: string[];
  isActive: boolean;
}

export class HaloAIService {
  private readonly logger = logger;
  private readonly whaleThreshold = 1000; // Coins spent threshold for whale status
  private readonly engagementThresholds = {
    low: 0.3,
    medium: 0.6,
    high: 0.8
  };

  /**
   * Process AI request for engagement boosts
   */
  async processEngagementRequest(
    userId: string,
    requestType: 'boost' | 'suggestions' | 'analysis',
    context?: any
  ): Promise<AIResponse> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found',
          confidence: 0
        };
      }

      let response: AIResponse;

      switch (requestType) {
        case 'boost':
          response = await this.generateEngagementBoost(userId, context);
          break;
        case 'suggestions':
          response = await this.generateSuggestions(userId, context);
          break;
        case 'analysis':
          response = await this.analyzeEngagement(userId, context);
          break;
        default:
          response = {
            success: false,
            message: 'Invalid request type',
            confidence: 0
          };
      }

      // Log AI interaction
      await this.logAIInteraction(userId, requestType, response);

      return response;
    } catch (error) {
      this.logger.error('Error processing AI request:', error);
      return {
        success: false,
        message: 'AI service error',
        confidence: 0
      };
    }
  }

  /**
   * Generate engagement boost suggestions
   */
  private async generateEngagementBoost(userId: string, context?: any): Promise<AIResponse> {
    try {
      const user = await User.findById(userId);
      const stream = context?.streamId ? await LiveStream.findById(context.streamId) : null;

      const boosts: EngagementBoost[] = [];

      // Chat suggestions
      const chatSuggestions = await this.generateChatSuggestions(user, stream);
      boosts.push(...chatSuggestions);

      // Gift suggestions
      const giftSuggestions = await this.generateGiftSuggestions(user, stream);
      boosts.push(...giftSuggestions);

      // Interaction suggestions
      const interactionSuggestions = await this.generateInteractionSuggestions(user, stream);
      boosts.push(...interactionSuggestions);

      // Content suggestions
      const contentSuggestions = await this.generateContentSuggestions(user, stream);
      boosts.push(...contentSuggestions);

      // Sort by priority and confidence
      boosts.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority] || b.confidence - a.confidence;
      });

      return {
        success: true,
        message: 'Engagement boost suggestions generated',
        suggestions: boosts.map(boost => boost.suggestion),
        actions: boosts.slice(0, 5), // Top 5 suggestions
        confidence: boosts.length > 0 ? boosts[0].confidence : 0.5,
        metadata: {
          totalSuggestions: boosts.length,
          userOgLevel: user?.ogLevel || 0,
          streamActive: !!stream
        }
      };
    } catch (error) {
      this.logger.error('Error generating engagement boost:', error);
      return {
        success: false,
        message: 'Failed to generate engagement boost',
        confidence: 0
      };
    }
  }

  /**
   * Generate chat suggestions
   */
  private async generateChatSuggestions(user: any, stream: any): Promise<EngagementBoost[]> {
    const suggestions: EngagementBoost[] = [];

    // Time-based greetings
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) {
      suggestions.push({
        type: 'chat',
        suggestion: 'Good morning! 🌅 Start your day with positive energy!',
        confidence: 0.8,
        priority: 'medium'
      });
    } else if (hour >= 12 && hour < 18) {
      suggestions.push({
        type: 'chat',
        suggestion: 'Good afternoon! ☀️ Hope you\'re having a great day!',
        confidence: 0.8,
        priority: 'medium'
      });
    } else {
      suggestions.push({
        type: 'chat',
        suggestion: 'Good evening! 🌙 Ready for some fun?',
        confidence: 0.8,
        priority: 'medium'
      });
    }

    // Stream-specific suggestions
    if (stream) {
      suggestions.push({
        type: 'chat',
        suggestion: `Welcome to ${stream.title}! 🎉 Let's make this stream amazing!`,
        confidence: 0.9,
        priority: 'high'
      });

      if (stream.category === 'gaming') {
        suggestions.push({
          type: 'chat',
          suggestion: 'What game are you playing? Share your favorite gaming moments! 🎮',
          confidence: 0.7,
          priority: 'medium'
        });
      } else if (stream.category === 'music') {
        suggestions.push({
          type: 'chat',
          suggestion: 'Music brings us together! What\'s your favorite genre? 🎵',
          confidence: 0.7,
          priority: 'medium'
        });
      }
    }

    // OG level specific suggestions
    if (user?.ogLevel >= 3) {
      suggestions.push({
        type: 'chat',
        suggestion: 'As an OG member, you can help moderate the chat! Use your powers wisely! 👑',
        confidence: 0.9,
        priority: 'high'
      });
    }

    return suggestions;
  }

  /**
   * Generate gift suggestions
   */
  private async generateGiftSuggestions(user: any, stream: any): Promise<EngagementBoost[]> {
    const suggestions: EngagementBoost[] = [];

    // Check for active festivals
    const activeFestivals = await this.getActiveFestivals();
    if (activeFestivals.length > 0) {
      const festival = activeFestivals[0];
      suggestions.push({
        type: 'gift',
        suggestion: `🎉 ${festival.name} is happening! Send special festival gifts to celebrate!`,
        confidence: 0.9,
        priority: 'high',
        metadata: { festivalId: festival.festivalId }
      });
    }

    // Stream-specific gift suggestions
    if (stream) {
      const streamGifts = await Gift.find({ 
        category: stream.category,
        isActive: true 
      }).limit(3);

      streamGifts.forEach(gift => {
        suggestions.push({
          type: 'gift',
          suggestion: `Send ${gift.name} to show your support! ${gift.description}`,
          confidence: 0.7,
          priority: 'medium',
          metadata: { giftId: gift._id }
        });
      });
    }

    // OG level gift suggestions
    if (user?.ogLevel >= 2) {
      suggestions.push({
        type: 'gift',
        suggestion: 'As an OG member, you get exclusive gifts! Check out the OG gift collection! 🎁',
        confidence: 0.8,
        priority: 'high'
      });
    }

    return suggestions;
  }

  /**
   * Generate interaction suggestions
   */
  private async generateInteractionSuggestions(user: any, stream: any): Promise<EngagementBoost[]> {
    const suggestions: EngagementBoost[] = [];

    // Stream interaction suggestions
    if (stream) {
      suggestions.push({
        type: 'interaction',
        suggestion: 'Like the stream to show your support! ❤️',
        confidence: 0.8,
        priority: 'medium'
      });

      suggestions.push({
        type: 'interaction',
        suggestion: 'Share this stream with your friends! 📱',
        confidence: 0.7,
        priority: 'medium'
      });

      if (stream.currentViewers > 100) {
        suggestions.push({
          type: 'interaction',
          suggestion: 'Wow! This stream is getting popular! Help it reach more viewers! 🚀',
          confidence: 0.9,
          priority: 'high'
        });
      }
    }

    // Community suggestions
    suggestions.push({
      type: 'interaction',
      suggestion: 'Join the HaloBuzz community! Follow other creators and discover amazing content! 🌟',
      confidence: 0.6,
      priority: 'low'
    });

    return suggestions;
  }

  /**
   * Generate content suggestions
   */
  private async generateContentSuggestions(user: any, stream: any): Promise<EngagementBoost[]> {
    const suggestions: EngagementBoost[] = [];

    // Stream content suggestions
    if (stream) {
      if (stream.category === 'gaming') {
        suggestions.push({
          type: 'content',
          suggestion: 'Try playing with viewers! Interactive gaming creates amazing moments! 🎮',
          confidence: 0.8,
          priority: 'high'
        });
      } else if (stream.category === 'music') {
        suggestions.push({
          type: 'content',
          suggestion: 'Take song requests from viewers! Music requests create great engagement! 🎵',
          confidence: 0.8,
          priority: 'high'
        });
      } else if (stream.category === 'talk') {
        suggestions.push({
          type: 'content',
          suggestion: 'Ask viewers questions! Interactive discussions keep people engaged! 💬',
          confidence: 0.8,
          priority: 'high'
        });
      }
    }

    // General content suggestions
    suggestions.push({
      type: 'content',
      suggestion: 'Share your story! Personal stories create deep connections with viewers! 📖',
      confidence: 0.7,
      priority: 'medium'
    });

    return suggestions;
  }

  /**
   * Generate general suggestions
   */
  private async generateSuggestions(userId: string, context?: any): Promise<AIResponse> {
    try {
      const user = await User.findById(userId);
      const suggestions: string[] = [];

      // User-specific suggestions
      if (user?.ogLevel === 0) {
        suggestions.push('Upgrade to OG status to unlock exclusive features and gifts!');
        suggestions.push('Complete your profile to increase your trust score!');
      }

      if (user?.followers < 100) {
        suggestions.push('Connect with other creators to grow your following!');
        suggestions.push('Share your streams on social media to reach more people!');
      }

      // Time-based suggestions
      const hour = new Date().getHours();
      if (hour >= 19 && hour <= 23) {
        suggestions.push('Prime time! This is the best time to go live!');
      }

      // Festival suggestions
      const activeFestivals = await this.getActiveFestivals();
      if (activeFestivals.length > 0) {
        suggestions.push(`Join the ${activeFestivals[0].name} celebration with special gifts!`);
      }

      return {
        success: true,
        message: 'Suggestions generated successfully',
        suggestions,
        confidence: 0.8,
        metadata: {
          userLevel: user?.ogLevel || 0,
          followers: user?.followers || 0,
          activeFestivals: activeFestivals.length
        }
      };
    } catch (error) {
      this.logger.error('Error generating suggestions:', error);
      return {
        success: false,
        message: 'Failed to generate suggestions',
        confidence: 0
      };
    }
  }

  /**
   * Analyze engagement
   */
  private async analyzeEngagement(userId: string, context?: any): Promise<AIResponse> {
    try {
      const user = await User.findById(userId);
      const stream = context?.streamId ? await LiveStream.findById(context.streamId) : null;

      const analysis = {
        userEngagement: await this.analyzeUserEngagement(user),
        streamEngagement: stream ? await this.analyzeStreamEngagement(stream) : null,
        recommendations: await this.generateRecommendations(user, stream)
      };

      return {
        success: true,
        message: 'Engagement analysis completed',
        suggestions: analysis.recommendations,
        confidence: 0.8,
        metadata: analysis
      };
    } catch (error) {
      this.logger.error('Error analyzing engagement:', error);
      return {
        success: false,
        message: 'Failed to analyze engagement',
        confidence: 0
      };
    }
  }

  /**
   * Analyze user engagement
   */
  private async analyzeUserEngagement(user: any): Promise<any> {
    return {
      trustScore: user?.trust?.score || 0,
      ogLevel: user?.ogLevel || 0,
      followers: user?.followers || 0,
      totalStreams: user?.trust?.factors?.totalStreams || 0,
      totalGifts: user?.trust?.factors?.totalGifts || 0,
      engagementLevel: this.calculateEngagementLevel(user)
    };
  }

  /**
   * Analyze stream engagement
   */
  private async analyzeStreamEngagement(stream: any): Promise<any> {
    return {
      viewerCount: stream.currentViewers,
      totalViewers: stream.totalViewers,
      totalCoins: stream.totalCoins,
      totalLikes: stream.totalLikes,
      engagementScore: stream.metrics?.engagementScore || 0,
      aiEngagementScore: stream.metrics?.aiEngagementScore || 0
    };
  }

  /**
   * Generate recommendations
   */
  private async generateRecommendations(user: any, stream: any): Promise<string[]> {
    const recommendations: string[] = [];

    // User recommendations
    if (user?.trust?.score < 50) {
      recommendations.push('Increase your trust score by completing verification and being active');
    }

    if (user?.ogLevel === 0) {
      recommendations.push('Consider upgrading to OG status for exclusive features');
    }

    // Stream recommendations
    if (stream) {
      if (stream.currentViewers < 10) {
        recommendations.push('Try different stream times to reach more viewers');
      }

      if (stream.totalCoins < 100) {
        recommendations.push('Engage more with viewers to increase gift activity');
      }

      if (stream.metrics?.engagementScore < 0.5) {
        recommendations.push('Improve stream quality and interaction to boost engagement');
      }
    }

    return recommendations;
  }

  /**
   * Calculate engagement level
   */
  private calculateEngagementLevel(user: any): 'low' | 'medium' | 'high' {
    const trustScore = user?.trust?.score || 0;
    const followers = user?.followers || 0;
    const totalStreams = user?.trust?.factors?.totalStreams || 0;

    const engagementScore = (trustScore / 100) * 0.4 + 
                           Math.min(followers / 1000, 1) * 0.3 + 
                           Math.min(totalStreams / 100, 1) * 0.3;

    if (engagementScore >= this.engagementThresholds.high) return 'high';
    if (engagementScore >= this.engagementThresholds.medium) return 'medium';
    return 'low';
  }

  /**
   * Get active festivals
   */
  private async getActiveFestivals(): Promise<FestivalEvent[]> {
    try {
      const now = new Date();
      const festivals = await Festival.find({
        startDate: { $lte: now },
        endDate: { $gte: now },
        isActive: true
      });

      return festivals.map(festival => ({
        festivalId: festival._id.toString(),
        name: festival.name,
        startDate: festival.startDate,
        endDate: festival.endDate,
        gifts: festival.specialGifts || [],
        events: festival.events || [],
        isActive: true
      }));
    } catch (error) {
      this.logger.error('Error getting active festivals:', error);
      return [];
    }
  }

  /**
   * Whale Radar - Notify whales about top hosts
   */
  async notifyWhalesAboutTopHosts(): Promise<void> {
    try {
      const whales = await this.getWhales();
      const topHosts = await this.getTopHosts();

      for (const whale of whales) {
        const recommendations = await this.recommendHostsToWhale(whale, topHosts);
        
        if (recommendations.length > 0) {
          await this.sendWhaleNotification(whale.userId, recommendations);
        }
      }
    } catch (error) {
      this.logger.error('Error notifying whales about top hosts:', error);
    }
  }

  /**
   * Get whale users
   */
  private async getWhales(): Promise<WhaleInfo[]> {
    try {
      const whales = await User.find({
        'coins.totalSpent': { $gte: this.whaleThreshold },
        isBanned: false
      }).limit(50);

      return whales.map(user => ({
        userId: user._id.toString(),
        username: user.username,
        totalSpent: user.coins?.totalSpent || 0,
        recentActivity: 'Active',
        preferences: user.preferences?.interests || [],
        lastSeen: user.lastActiveAt
      }));
    } catch (error) {
      this.logger.error('Error getting whales:', error);
      return [];
    }
  }

  /**
   * Get top hosts
   */
  private async getTopHosts(): Promise<any[]> {
    try {
      const hosts = await User.find({
        'trust.factors.totalStreams': { $gt: 0 },
        isBanned: false
      })
        .sort({ 'coins.totalEarned': -1 })
        .limit(20);

      return hosts.map(host => ({
        userId: host._id.toString(),
        username: host.username,
        totalEarned: host.coins?.totalEarned || 0,
        totalStreams: host.trust?.factors?.totalStreams || 0,
        trustScore: host.trust?.score || 0,
        ogLevel: host.ogLevel || 0
      }));
    } catch (error) {
      this.logger.error('Error getting top hosts:', error);
      return [];
    }
  }

  /**
   * Recommend hosts to whale
   */
  private async recommendHostsToWhale(whale: WhaleInfo, topHosts: any[]): Promise<any[]> {
    // Simple recommendation logic - can be enhanced with ML
    return topHosts
      .filter(host => host.userId !== whale.userId)
      .slice(0, 3)
      .map(host => ({
        ...host,
        reason: `High-earning host with ${host.totalEarned} coins earned`
      }));
  }

  /**
   * Send whale notification
   */
  private async sendWhaleNotification(whaleId: string, recommendations: any[]): Promise<void> {
    try {
      // This would integrate with notification service
      this.logger.info(`Sending whale notification to ${whaleId}`, { recommendations });
      
      // Cache notification for user to see in app
      await setCache(`whale_notification:${whaleId}`, {
        type: 'top_hosts',
        recommendations,
        timestamp: new Date()
      }, 3600); // 1 hour
    } catch (error) {
      this.logger.error('Error sending whale notification:', error);
    }
  }

  /**
   * Auto Gifter Bot for OG3+
   */
  async autoGifterBot(userId: string, streamId: string): Promise<void> {
    try {
      const user = await User.findById(userId);
      if (!user || user.ogLevel < 3) {
        return;
      }

      const stream = await LiveStream.findById(streamId);
      if (!stream) {
        return;
      }

      // Check if user has auto-gifter enabled
      const autoGifterEnabled = user.preferences?.autoGifter || false;
      if (!autoGifterEnabled) {
        return;
      }

      // Simple auto-gift logic - can be enhanced with ML
      const shouldGift = Math.random() < 0.3; // 30% chance
      if (shouldGift) {
        const gifts = await Gift.find({ isActive: true }).limit(5);
        const randomGift = gifts[Math.floor(Math.random() * gifts.length)];
        
        if (randomGift && user.coins?.balance >= randomGift.price) {
          // Send gift (this would integrate with gift service)
          this.logger.info(`Auto-gift sent: ${randomGift.name} to stream ${streamId} by user ${userId}`);
        }
      }
    } catch (error) {
      this.logger.error('Error in auto gifter bot:', error);
    }
  }

  /**
   * Festival detection and auto-create events
   */
  async detectAndCreateFestivalEvents(): Promise<void> {
    try {
      const now = new Date();
      const festivals = await Festival.find({
        startDate: { $lte: now },
        endDate: { $gte: now },
        isActive: true
      });

      for (const festival of festivals) {
        // Auto-create festival gifts if not already created
        if (!festival.specialGifts || festival.specialGifts.length === 0) {
          await this.createFestivalGifts(festival);
        }

        // Auto-create festival events
        if (!festival.events || festival.events.length === 0) {
          await this.createFestivalEvents(festival);
        }
      }
    } catch (error) {
      this.logger.error('Error detecting and creating festival events:', error);
    }
  }

  /**
   * Create festival gifts
   */
  private async createFestivalGifts(festival: any): Promise<void> {
    try {
      const festivalGifts = [
        {
          name: `${festival.name} Special`,
          description: `Exclusive gift for ${festival.name} celebration`,
          price: 100,
          category: 'festival',
          isActive: true,
          festivalId: festival._id
        },
        {
          name: `${festival.name} Premium`,
          description: `Premium gift for ${festival.name} celebration`,
          price: 500,
          category: 'festival',
          isActive: true,
          festivalId: festival._id
        }
      ];

      for (const giftData of festivalGifts) {
        const existingGift = await Gift.findOne({ name: giftData.name });
        if (!existingGift) {
          const gift = new Gift(giftData);
          await gift.save();
        }
      }

      // Update festival with special gifts
      await Festival.findByIdAndUpdate(festival._id, {
        specialGifts: festivalGifts.map(g => g.name)
      });
    } catch (error) {
      this.logger.error('Error creating festival gifts:', error);
    }
  }

  /**
   * Create festival events
   */
  private async createFestivalEvents(festival: any): Promise<void> {
    try {
      const events = [
        `${festival.name} Gift Bonanza - Double coins for gifts!`,
        `${festival.name} Stream Marathon - Special rewards for long streams!`,
        `${festival.name} Community Challenge - Help us reach our goals!`
      ];

      await Festival.findByIdAndUpdate(festival._id, {
        events
      });
    } catch (error) {
      this.logger.error('Error creating festival events:', error);
    }
  }

  /**
   * Log AI interaction
   */
  private async logAIInteraction(userId: string, requestType: string, response: AIResponse): Promise<void> {
    try {
      await setCache(`ai_interaction:${userId}:${Date.now()}`, {
        requestType,
        response,
        timestamp: new Date()
      }, 86400); // 24 hours
    } catch (error) {
      this.logger.error('Error logging AI interaction:', error);
    }
  }
}

export const haloAIService = new HaloAIService();



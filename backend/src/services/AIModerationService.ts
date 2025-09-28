import axios from 'axios';
import { logger } from '../config/logger';
import { User } from '../models/User';
import { ModerationFlag } from '../models/ModerationFlag';

interface ModerationResult {
  isSafe: boolean;
  confidence: number;
  categories: string[];
  action: 'allow' | 'warn' | 'block' | 'review';
  reason?: string;
  metadata?: any;
}

interface NSFWDetectionResult {
  isNSFW: boolean;
  confidence: number;
  categories: {
    explicit: number;
    suggestive: number;
    violence: number;
    drugs: number;
    hate: number;
  };
  action: 'allow' | 'block' | 'review';
}

interface AgeVerificationResult {
  isAdult: boolean;
  confidence: number;
  ageEstimate?: number;
  action: 'allow' | 'block' | 'review';
}

export class AIModerationService {
  private readonly logger = logger;
  private readonly moderationThresholds = {
    nsfw: 0.7,
    violence: 0.8,
    hate: 0.9,
    age: 0.8
  };

  /**
   * Moderate content (text, image, video)
   */
  async moderateContent(
    content: string | Buffer,
    type: 'text' | 'image' | 'video',
    userId: string,
    context?: any
  ): Promise<ModerationResult> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          isSafe: false,
          confidence: 1.0,
          categories: ['user_not_found'],
          action: 'block',
          reason: 'User not found'
        };
      }

      // Check user's age verification status
      if (!user.ageVerified && user.dateOfBirth) {
        const age = this.calculateAge(user.dateOfBirth);
        if (age < 18) {
          return {
            isSafe: false,
            confidence: 1.0,
            categories: ['underage'],
            action: 'block',
            reason: 'User is under 18'
          };
        }
      }

      let result: ModerationResult;

      switch (type) {
        case 'text':
          result = await this.moderateText(content as string, userId, context);
          break;
        case 'image':
          result = await this.moderateImage(content as Buffer, userId, context);
          break;
        case 'video':
          result = await this.moderateVideo(content as Buffer, userId, context);
          break;
        default:
          throw new Error('Invalid content type');
      }

      // Log moderation action
      await this.logModerationAction(userId, type, result, context);

      return result;
    } catch (error) {
      this.logger.error('Error moderating content:', error);
      return {
        isSafe: false,
        confidence: 0.0,
        categories: ['moderation_error'],
        action: 'review',
        reason: 'Moderation service error'
      };
    }
  }

  /**
   * Moderate text content
   */
  private async moderateText(text: string, userId: string, context?: any): Promise<ModerationResult> {
    try {
      // Use AI engine for text moderation
      if (process.env.AI_ENGINE_URL) {
        const response = await axios.post(
          `${process.env.AI_ENGINE_URL}/internal/moderation/analyze`,
          {
            text,
            type: 'chat',
            userId,
            context
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.AI_ENGINE_SECRET}`,
              'Content-Type': 'application/json'
            },
            timeout: 5000
          }
        );

        const result = response.data || {};
        const confidence = result.confidence || 0;
        const categories = result.categories || [];
        const isSafe = confidence < this.moderationThresholds.nsfw;

        let action: 'allow' | 'warn' | 'block' | 'review' = 'allow';
        if (confidence >= this.moderationThresholds.hate) {
          action = 'block';
        } else if (confidence >= this.moderationThresholds.nsfw) {
          action = 'warn';
        } else if (confidence >= 0.5) {
          action = 'review';
        }

        return {
          isSafe,
          confidence,
          categories,
          action,
          reason: result.reason,
          metadata: result.metadata
        };
      }

      // Fallback: Basic keyword filtering
      return this.basicTextModeration(text);
    } catch (error) {
      this.logger.error('Error moderating text:', error);
      return this.basicTextModeration(text);
    }
  }

  /**
   * Moderate image content
   */
  private async moderateImage(image: Buffer, userId: string, context?: any): Promise<ModerationResult> {
    try {
      // Use AI engine for image moderation
      if (process.env.AI_ENGINE_URL) {
        const response = await axios.post(
          `${process.env.AI_ENGINE_URL}/internal/moderation/analyze-image`,
          {
            image: image.toString('base64'),
            userId,
            context
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.AI_ENGINE_SECRET}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );

        const result = response.data || {};
        const nsfwResult = await this.detectNSFW(result);
        
        return {
          isSafe: nsfwResult.action !== 'block',
          confidence: nsfwResult.confidence,
          categories: Object.keys(nsfwResult.categories).filter(
            key => nsfwResult.categories[key] > 0.5
          ),
          action: nsfwResult.action,
          reason: 'Image content analysis',
          metadata: result
        };
      }

      // Fallback: Allow with review
      return {
        isSafe: true,
        confidence: 0.5,
        categories: ['unverified'],
        action: 'review',
        reason: 'Image moderation not available'
      };
    } catch (error) {
      this.logger.error('Error moderating image:', error);
      return {
        isSafe: false,
        confidence: 0.0,
        categories: ['moderation_error'],
        action: 'review',
        reason: 'Image moderation error'
      };
    }
  }

  /**
   * Moderate video content
   */
  private async moderateVideo(video: Buffer, userId: string, context?: any): Promise<ModerationResult> {
    try {
      // Use AI engine for video moderation
      if (process.env.AI_ENGINE_URL) {
        const response = await axios.post(
          `${process.env.AI_ENGINE_URL}/internal/moderation/analyze-video`,
          {
            video: video.toString('base64'),
            userId,
            context
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.AI_ENGINE_SECRET}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );

        const result = response.data || {};
        const nsfwResult = await this.detectNSFW(result);
        
        return {
          isSafe: nsfwResult.action !== 'block',
          confidence: nsfwResult.confidence,
          categories: Object.keys(nsfwResult.categories).filter(
            key => nsfwResult.categories[key] > 0.5
          ),
          action: nsfwResult.action,
          reason: 'Video content analysis',
          metadata: result
        };
      }

      // Fallback: Allow with review
      return {
        isSafe: true,
        confidence: 0.5,
        categories: ['unverified'],
        action: 'review',
        reason: 'Video moderation not available'
      };
    } catch (error) {
      this.logger.error('Error moderating video:', error);
      return {
        isSafe: false,
        confidence: 0.0,
        categories: ['moderation_error'],
        action: 'review',
        reason: 'Video moderation error'
      };
    }
  }

  /**
   * Detect NSFW content
   */
  private async detectNSFW(analysisResult: any): Promise<NSFWDetectionResult> {
    const categories = {
      explicit: analysisResult.explicit || 0,
      suggestive: analysisResult.suggestive || 0,
      violence: analysisResult.violence || 0,
      drugs: analysisResult.drugs || 0,
      hate: analysisResult.hate || 0
    };

    const maxConfidence = Math.max(...Object.values(categories));
    
    let action: 'allow' | 'block' | 'review' = 'allow';
    if (maxConfidence >= this.moderationThresholds.nsfw) {
      action = 'block';
    } else if (maxConfidence >= 0.5) {
      action = 'review';
    }

    return {
      isNSFW: maxConfidence >= this.moderationThresholds.nsfw,
      confidence: maxConfidence,
      categories,
      action
    };
  }

  /**
   * Verify user age
   */
  async verifyUserAge(userId: string, documentImage?: Buffer): Promise<AgeVerificationResult> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        return {
          isAdult: false,
          confidence: 0.0,
          action: 'block'
        };
      }

      // If date of birth is provided, calculate age
      if (user.dateOfBirth) {
        const age = this.calculateAge(user.dateOfBirth);
        const isAdult = age >= 18;
        
        return {
          isAdult,
          confidence: 1.0,
          ageEstimate: age,
          action: isAdult ? 'allow' : 'block'
        };
      }

      // If document image is provided, use AI to verify age
      if (documentImage && process.env.AI_ENGINE_URL) {
        const response = await axios.post(
          `${process.env.AI_ENGINE_URL}/internal/moderation/verify-age`,
          {
            image: documentImage.toString('base64'),
            userId
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.AI_ENGINE_SECRET}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );

        const result = response.data || {};
        const ageEstimate = result.ageEstimate || 0;
        const confidence = result.confidence || 0;
        const isAdult = ageEstimate >= 18;

        let action: 'allow' | 'block' | 'review' = 'review';
        if (confidence >= this.moderationThresholds.age) {
          action = isAdult ? 'allow' : 'block';
        }

        return {
          isAdult,
          confidence,
          ageEstimate,
          action
        };
      }

      // Default: require manual review
      return {
        isAdult: false,
        confidence: 0.0,
        action: 'review'
      };
    } catch (error) {
      this.logger.error('Error verifying user age:', error);
      return {
        isAdult: false,
        confidence: 0.0,
        action: 'review'
      };
    }
  }

  /**
   * Basic text moderation fallback
   */
  private basicTextModeration(text: string): ModerationResult {
    const bannedWords = [
      'fuck', 'shit', 'bitch', 'asshole', 'damn', 'hell',
      'sex', 'porn', 'nude', 'naked', 'fuck', 'shit'
    ];

    const lowerText = text.toLowerCase();
    const foundWords = bannedWords.filter(word => lowerText.includes(word));

    if (foundWords.length > 0) {
      return {
        isSafe: false,
        confidence: 0.8,
        categories: ['profanity'],
        action: 'warn',
        reason: 'Inappropriate language detected'
      };
    }

    return {
      isSafe: true,
      confidence: 0.9,
      categories: [],
      action: 'allow'
    };
  }

  /**
   * Calculate age from date of birth
   */
  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Log moderation action
   */
  private async logModerationAction(
    userId: string,
    contentType: string,
    result: ModerationResult,
    context?: any
  ): Promise<void> {
    try {
      const flag = new ModerationFlag({
        userId,
        contentType,
        action: result.action,
        confidence: result.confidence,
        categories: result.categories,
        reason: result.reason,
        metadata: {
          ...result.metadata,
          context
        },
        status: result.action === 'block' ? 'flagged' : 'reviewed'
      });

      await flag.save();
    } catch (error) {
      this.logger.error('Error logging moderation action:', error);
    }
  }

  /**
   * Get moderation statistics
   */
  async getModerationStats(timeframe: 'day' | 'week' | 'month' = 'day'): Promise<any> {
    try {
      const now = new Date();
      let startDate: Date;

      switch (timeframe) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      const stats = await ModerationFlag.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 },
            avgConfidence: { $avg: '$confidence' }
          }
        }
      ]);

      const totalFlags = await ModerationFlag.countDocuments({
        createdAt: { $gte: startDate }
      });

      return {
        timeframe,
        totalFlags,
        actions: stats.reduce((acc, stat) => {
          acc[stat._id] = {
            count: stat.count,
            avgConfidence: stat.avgConfidence
          };
          return acc;
        }, {}),
        startDate,
        endDate: now
      };
    } catch (error) {
      this.logger.error('Error getting moderation stats:', error);
      return {
        timeframe,
        totalFlags: 0,
        actions: {},
        error: error.message
      };
    }
  }
}

export const aiModerationService = new AIModerationService();



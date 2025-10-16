import { User } from '@/models/User';
import { logger } from '@/config/logger';
import { setCache, getCache } from '@/config/redis';

export interface CommunityAction {
  id: string;
  userId: string;
  type: 'help_neighbor' | 'teach_skill' | 'mentor_user' | 'donate_time' | 'support_cause' | 'create_positive_content';
  description: string;
  impact: number; // 1-10 scale
  verificationRequired: boolean;
  witnesses?: string[];
  timestamp: Date;
  status: 'pending' | 'verified' | 'completed' | 'rewarded';
}

export interface KarmaScore {
  userId: string;
  totalKarma: number;
  categories: {
    helpfulness: number;
    mentorship: number;
    creativity: number;
    positivity: number;
    cultural_respect: number;
    community_service: number;
  };
  level: 'beginner' | 'helper' | 'guardian' | 'elder' | 'bodhisattva';
  lastUpdated: Date;
}

export interface CommunityMilestone {
  id: string;
  name: string;
  description: string;
  requirement: string;
  reward: {
    karmaPoints: number;
    badge: string;
    privileges: string[];
  };
  achievedBy: string[];
}

export class CommunityLoveService {
  private static karmaLevels = {
    beginner: { min: 0, max: 99, name: 'नयाँ साथी (New Friend)' },
    helper: { min: 100, max: 499, name: 'सहायक (Helper)' },
    guardian: { min: 500, max: 1499, name: 'संरक्षक (Guardian)' },
    elder: { min: 1500, max: 4999, name: 'ज्येष्ठ (Elder)' },
    bodhisattva: { min: 5000, max: Infinity, name: 'बोधिसत्व (Enlightened Helper)' }
  };

  private static milestones: CommunityMilestone[] = [
    {
      id: 'first_help',
      name: 'पहिलो सहयोग (First Help)',
      description: 'Help your first community member',
      requirement: 'Complete one verified helping action',
      reward: {
        karmaPoints: 10,
        badge: '🤝',
        privileges: ['helper_badge', 'priority_support']
      },
      achievedBy: []
    },
    {
      id: 'mentor_master',
      name: 'गुरु (Guru)',
      description: 'Successfully mentor 10 users',
      requirement: 'Complete 10 verified mentorship actions',
      reward: {
        karmaPoints: 100,
        badge: '🧘',
        privileges: ['mentor_badge', 'special_title', 'community_recognition']
      },
      achievedBy: []
    },
    {
      id: 'cultural_ambassador',
      name: 'सांस्कृतिक राजदूत (Cultural Ambassador)',
      description: 'Promote Nepali culture globally',
      requirement: 'Create 20 cultural content pieces with high engagement',
      reward: {
        karmaPoints: 200,
        badge: '🏔️',
        privileges: ['cultural_badge', 'content_boost', 'festival_features']
      },
      achievedBy: []
    },
    {
      id: 'peace_maker',
      name: 'शान्तिदूत (Peacemaker)',
      description: 'Help resolve community conflicts',
      requirement: 'Successfully mediate 5 community disputes',
      reward: {
        karmaPoints: 150,
        badge: '🕊️',
        privileges: ['mediator_status', 'conflict_resolution_tools', 'elder_council_access']
      },
      achievedBy: []
    },
    {
      id: 'wisdom_keeper',
      name: 'ज्ञानी (Wisdom Keeper)',
      description: 'Share wisdom and knowledge',
      requirement: 'Create 50 educational posts with high positive feedback',
      reward: {
        karmaPoints: 300,
        badge: '📚',
        privileges: ['knowledge_badge', 'education_features', 'wisdom_spotlight']
      },
      achievedBy: []
    }
  ];

  // Record a community action
  static async recordCommunityAction(action: Omit<CommunityAction, 'id' | 'timestamp' | 'status'>): Promise<{
    success: boolean;
    actionId?: string;
    karmaAwarded?: number;
    message: string;
  }> {
    try {
      const actionId = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const communityAction: CommunityAction = {
        ...action,
        id: actionId,
        timestamp: new Date(),
        status: action.verificationRequired ? 'pending' : 'completed'
      };

      // Store the action
      await setCache(`community_action:${actionId}`, communityAction, 86400 * 30); // 30 days

      // Update user's karma if action is immediately verified
      let karmaAwarded = 0;
      if (!action.verificationRequired) {
        karmaAwarded = await this.awardKarma(action.userId, action.type, action.impact);
        communityAction.status = 'rewarded';
      }

      // Check for milestone achievements
      await this.checkMilestoneAchievements(action.userId);

      logger.info('Community action recorded:', {
        actionId,
        userId: action.userId,
        type: action.type,
        karmaAwarded
      });

      return {
        success: true,
        actionId,
        karmaAwarded,
        message: action.verificationRequired ? 
          'Action recorded, pending verification' : 
          `Great work! You earned ${karmaAwarded} karma points! 🎉`
      };

    } catch (error) {
      logger.error('Error recording community action:', error);
      return {
        success: false,
        message: 'Failed to record action. Please try again.'
      };
    }
  }

  // Award karma points
  private static async awardKarma(userId: string, actionType: string, impact: number): Promise<number> {
    try {
      const karmaMultipliers: { [key: string]: number } = {
        'help_neighbor': 1.5,
        'teach_skill': 2.0,
        'mentor_user': 2.5,
        'donate_time': 1.8,
        'support_cause': 1.2,
        'create_positive_content': 1.0
      };

      const baseKarma = impact * 5; // Base 5 karma per impact point
      const multiplier = karmaMultipliers[actionType] || 1.0;
      const karmaAwarded = Math.round(baseKarma * multiplier);

      // Get current karma score
      const karmaScore = await this.getKarmaScore(userId);
      
      // Update appropriate category
      const categoryMap: { [key: string]: keyof KarmaScore['categories'] } = {
        'help_neighbor': 'helpfulness',
        'teach_skill': 'mentorship',
        'mentor_user': 'mentorship',
        'donate_time': 'community_service',
        'support_cause': 'community_service',
        'create_positive_content': 'creativity'
      };

      const category = categoryMap[actionType] || 'helpfulness';
      karmaScore.categories[category] += karmaAwarded;
      karmaScore.totalKarma += karmaAwarded;
      
      // Update level based on total karma
      karmaScore.level = this.calculateKarmaLevel(karmaScore.totalKarma);
      karmaScore.lastUpdated = new Date();

      // Save updated karma score
      await setCache(`karma_score:${userId}`, karmaScore, 86400 * 365); // 1 year

      // Update user's karma in database
      await User.findByIdAndUpdate(userId, {
        $inc: { 'karma.total': karmaAwarded }
      });

      return karmaAwarded;

    } catch (error) {
      logger.error('Error awarding karma:', error);
      return 0;
    }
  }

  // Get user's karma score
  static async getKarmaScore(userId: string): Promise<KarmaScore> {
    try {
      const cached = await getCache(`karma_score:${userId}`);
      if (cached) return JSON.parse(cached as string);

      // Initialize new karma score
      const karmaScore: KarmaScore = {
        userId,
        totalKarma: 0,
        categories: {
          helpfulness: 0,
          mentorship: 0,
          creativity: 0,
          positivity: 0,
          cultural_respect: 0,
          community_service: 0
        },
        level: 'beginner',
        lastUpdated: new Date()
      };

      await setCache(`karma_score:${userId}`, karmaScore, 86400 * 365);
      return karmaScore;

    } catch (error) {
      logger.error('Error getting karma score:', error);
      return {
        userId,
        totalKarma: 0,
        categories: {
          helpfulness: 0,
          mentorship: 0,
          creativity: 0,
          positivity: 0,
          cultural_respect: 0,
          community_service: 0
        },
        level: 'beginner',
        lastUpdated: new Date()
      };
    }
  }

  // Calculate karma level
  private static calculateKarmaLevel(totalKarma: number): KarmaScore['level'] {
    for (const [level, range] of Object.entries(this.karmaLevels)) {
      if (totalKarma >= range.min && totalKarma <= range.max) {
        return level as KarmaScore['level'];
      }
    }
    return 'beginner';
  }

  // Check milestone achievements
  private static async checkMilestoneAchievements(userId: string): Promise<string[]> {
    try {
      const achievements: string[] = [];
      const karmaScore = await this.getKarmaScore(userId);
      
      // Get user's action history
      const userActions = await this.getUserActions(userId);
      
      for (const milestone of this.milestones) {
        if (milestone.achievedBy.includes(userId)) continue; // Already achieved

        let qualified = false;

        switch (milestone.id) {
          case 'first_help':
            qualified = userActions.filter(a => a.type === 'help_neighbor' && a.status === 'rewarded').length >= 1;
            break;
          
          case 'mentor_master':
            qualified = userActions.filter(a => a.type === 'mentor_user' && a.status === 'rewarded').length >= 10;
            break;
          
          case 'cultural_ambassador':
            qualified = userActions.filter(a => a.type === 'create_positive_content' && a.status === 'rewarded').length >= 20;
            break;
          
          case 'peace_maker':
            qualified = karmaScore.categories.community_service >= 750; // Equivalent to 5 mediations
            break;
          
          case 'wisdom_keeper':
            qualified = karmaScore.categories.creativity >= 1500 && karmaScore.categories.mentorship >= 500;
            break;
        }

        if (qualified) {
          await this.awardMilestone(userId, milestone);
          achievements.push(milestone.id);
        }
      }

      return achievements;

    } catch (error) {
      logger.error('Error checking milestone achievements:', error);
      return [];
    }
  }

  // Award milestone
  private static async awardMilestone(userId: string, milestone: CommunityMilestone): Promise<void> {
    try {
      // Add user to achievers
      milestone.achievedBy.push(userId);
      
      // Award karma points
      await this.awardKarma(userId, 'milestone_achievement', milestone.reward.karmaPoints / 5);
      
      // Store achievement
      const achievement = {
        userId,
        milestoneId: milestone.id,
        name: milestone.name,
        badge: milestone.reward.badge,
        privileges: milestone.reward.privileges,
        achievedAt: new Date()
      };
      
      await setCache(`achievement:${userId}:${milestone.id}`, achievement, 86400 * 365 * 10); // 10 years
      
      // Notify user
      logger.info('Milestone achieved:', {
        userId,
        milestone: milestone.name,
        badge: milestone.reward.badge
      });

    } catch (error) {
      logger.error('Error awarding milestone:', error);
    }
  }

  // Get user's community actions
  private static async getUserActions(userId: string): Promise<CommunityAction[]> {
    try {
      // In production, this would query a database
      // For now, return cached actions
      const actions: CommunityAction[] = [];
      
      // This is a simplified version - in reality would scan cache/DB for user actions
      return actions;

    } catch (error) {
      logger.error('Error getting user actions:', error);
      return [];
    }
  }

  // Generate daily inspiration
  static async getDailyInspiration(userId: string): Promise<{
    message: string;
    messageNepali: string;
    author: string;
    actionSuggestion: string;
    karmaOpportunity?: {
      type: string;
      description: string;
      potentialKarma: number;
    };
  }> {
    try {
      const inspirations = [
        {
          message: "A single act of kindness can brighten someone's entire day.",
          messageNepali: "एउटै दयालु कार्यले कसैको पूरै दिन उज्यालो पार्न सक्छ।",
          author: "Ancient Wisdom",
          actionSuggestion: "Help someone learn something new today",
          karmaOpportunity: {
            type: "teach_skill",
            description: "Teach a skill to someone in the community",
            potentialKarma: 50
          }
        },
        {
          message: "The best way to find yourself is to lose yourself in service of others.",
          messageNepali: "आफूलाई फेला पार्ने सबैभन्दा राम्रो तरिका भनेको अरूको सेवामा आफूलाई समर्पित गर्नु हो।",
          author: "Mahatma Gandhi",
          actionSuggestion: "Volunteer for a community cause today",
          karmaOpportunity: {
            type: "support_cause",
            description: "Support a local community cause",
            potentialKarma: 40
          }
        },
        {
          message: "Be the change you wish to see in the world.",
          messageNepali: "संसारमा जस्तो परिवर्तन चाहन्छौ, त्यस्तै परिवर्तन आफैं बनौ।",
          author: "Mahatma Gandhi",
          actionSuggestion: "Create positive content that inspires others",
          karmaOpportunity: {
            type: "create_positive_content",
            description: "Share uplifting content with the community",
            potentialKarma: 30
          }
        },
        {
          message: "Happiness is not something ready made. It comes from your own actions.",
          messageNepali: "खुशी कुनै तयार भएको वस्तु होइन। यो तपाईंका आफ्नै कार्यहरूबाट आउँछ।",
          author: "Dalai Lama",
          actionSuggestion: "Make someone smile today with your kindness",
          karmaOpportunity: {
            type: "help_neighbor",
            description: "Help a neighbor or community member",
            potentialKarma: 35
          }
        }
      ];

      const today = new Date();
      const inspirationIndex = today.getDate() % inspirations.length;
      
      return inspirations[inspirationIndex];

    } catch (error) {
      logger.error('Error getting daily inspiration:', error);
      return {
        message: "Every day is a new opportunity to spread kindness.",
        messageNepali: "हरेक दिन दयालुता फैलाउने नयाँ अवसर हो।",
        author: "HaloBuzz Community",
        actionSuggestion: "Do one kind act today"
      };
    }
  }

  // Get community leaderboard
  static async getCommunityLeaderboard(category: 'overall' | 'weekly' | 'monthly' = 'overall'): Promise<{
    leaders: {
      userId: string;
      username: string;
      avatar?: string;
      karma: number;
      level: string;
      badge: string;
      contributions: number;
    }[];
    userRank?: {
      position: number;
      karma: number;
      level: string;
    };
  }> {
    try {
      // In production, this would query the database for top karma users
      const mockLeaders = [
        {
          userId: 'user1',
          username: 'कर्मयोगी',
          karma: 2500,
          level: 'elder',
          badge: '🧘',
          contributions: 47
        },
        {
          userId: 'user2',
          username: 'सहायक',
          karma: 1800,
          level: 'guardian',
          badge: '🤝',
          contributions: 32
        },
        {
          userId: 'user3',
          username: 'ज्ञानी',
          karma: 1200,
          level: 'guardian',
          badge: '📚',
          contributions: 28
        }
      ];

      return {
        leaders: mockLeaders
      };

    } catch (error) {
      logger.error('Error getting community leaderboard:', error);
      return { leaders: [] };
    }
  }

  // Get community challenges
  static async getCommunitychallenges(): Promise<{
    daily: {
      challenge: string;
      description: string;
      reward: number;
      participants: number;
      timeLeft: string;
    };
    weekly: {
      challenge: string;
      description: string;
      reward: number;
      progress: number;
      target: number;
    };
    monthly: {
      challenge: string;
      description: string;
      reward: number;
      communityProgress: number;
      goal: number;
    };
  }> {
    try {
      return {
        daily: {
          challenge: "Kindness Chain",
          description: "Help someone and encourage them to help someone else",
          reward: 25,
          participants: 127,
          timeLeft: "8 hours"
        },
        weekly: {
          challenge: "Cultural Sharing Week",
          description: "Share something unique about Nepali culture",
          reward: 100,
          progress: 68,
          target: 100
        },
        monthly: {
          challenge: "Community Unity Month",
          description: "Build bridges between different communities",
          reward: 500,
          communityProgress: 2847,
          goal: 5000
        }
      };

    } catch (error) {
      logger.error('Error getting community challenges:', error);
      return {
        daily: { challenge: '', description: '', reward: 0, participants: 0, timeLeft: '' },
        weekly: { challenge: '', description: '', reward: 0, progress: 0, target: 0 },
        monthly: { challenge: '', description: '', reward: 0, communityProgress: 0, goal: 0 }
      };
    }
  }

  // Verify community action
  static async verifyCommunityAction(actionId: string, verifierId: string, approved: boolean, notes?: string): Promise<{
    success: boolean;
    message: string;
    karmaAwarded?: number;
  }> {
    try {
      const actionData = await getCache(`community_action:${actionId}`);
      if (!actionData) {
        return { success: false, message: 'Action not found' };
      }

      const action = JSON.parse(actionData as string);
      if (action.status !== 'pending') {
        return { success: false, message: 'Action already processed' };
      }

      let karmaAwarded = 0;
      if (approved) {
        karmaAwarded = await this.awardKarma(action.userId, action.type, action.impact);
        action.status = 'rewarded';
      } else {
        action.status = 'completed'; // No reward but marked as completed
      }

      action.verifier = verifierId;
      action.verificationNotes = notes;
      action.verifiedAt = new Date();

      await setCache(`community_action:${actionId}`, action, 86400 * 30);

      return {
        success: true,
        message: approved ? `Action approved! ${karmaAwarded} karma awarded.` : 'Action marked as completed.',
        karmaAwarded: approved ? karmaAwarded : 0
      };

    } catch (error) {
      logger.error('Error verifying community action:', error);
      return { success: false, message: 'Verification failed' };
    }
  }

  // Get user achievements
  static async getUserAchievements(userId: string): Promise<{
    karmaScore: KarmaScore;
    milestones: {
      id: string;
      name: string;
      badge: string;
      achievedAt: Date;
    }[];
    nextMilestone?: {
      name: string;
      progress: number;
      target: number;
    };
  }> {
    try {
      const karmaScore = await this.getKarmaScore(userId);
      
      // Get achieved milestones (simplified for demo)
      const milestones = [
        {
          id: 'first_help',
          name: 'पहिलो सहयोग',
          badge: '🤝',
          achievedAt: new Date('2024-01-15')
        }
      ];

      // Calculate next milestone
      let nextMilestone;
      if (karmaScore.totalKarma < 100) {
        nextMilestone = {
          name: 'सहायक Level',
          progress: karmaScore.totalKarma,
          target: 100
        };
      } else if (karmaScore.totalKarma < 500) {
        nextMilestone = {
          name: 'संरक्षक Level',
          progress: karmaScore.totalKarma,
          target: 500
        };
      }

      return {
        karmaScore,
        milestones,
        nextMilestone
      };

    } catch (error) {
      logger.error('Error getting user achievements:', error);
      return {
        karmaScore: await this.getKarmaScore(userId),
        milestones: []
      };
    }
  }

  // Community health check
  static async getCommunityHealthMetrics(): Promise<{
    overallHealth: 'excellent' | 'good' | 'fair' | 'needs_attention';
    metrics: {
      dailyKindnessActions: number;
      communityMorale: number; // 1-10 scale
      conflictResolutionRate: number; // percentage
      culturalRespectScore: number; // 1-10 scale
      newMemberIntegration: number; // percentage
    };
    recommendations: string[];
  }> {
    try {
      const metrics = {
        dailyKindnessActions: 243,
        communityMorale: 8.7,
        conflictResolutionRate: 94,
        culturalRespectScore: 9.2,
        newMemberIntegration: 87
      };

      const overallScore = (
        (metrics.dailyKindnessActions / 300) * 10 +
        metrics.communityMorale +
        (metrics.conflictResolutionRate / 10) +
        metrics.culturalRespectScore +
        (metrics.newMemberIntegration / 10)
      ) / 5;

      const overallHealth: 'excellent' | 'good' | 'fair' | 'needs_attention' = 
        overallScore >= 8.5 ? 'excellent' :
        overallScore >= 7 ? 'good' :
        overallScore >= 5 ? 'fair' : 'needs_attention';

      const recommendations: string[] = [];
      
      if (metrics.dailyKindnessActions < 200) {
        recommendations.push('Increase community engagement activities');
      }
      
      if (metrics.conflictResolutionRate < 90) {
        recommendations.push('Improve mediation and conflict resolution systems');
      }
      
      if (metrics.newMemberIntegration < 80) {
        recommendations.push('Enhance new member onboarding and welcome programs');
      }

      return {
        overallHealth,
        metrics,
        recommendations
      };

    } catch (error) {
      logger.error('Error getting community health metrics:', error);
      return {
        overallHealth: 'needs_attention',
        metrics: {
          dailyKindnessActions: 0,
          communityMorale: 0,
          conflictResolutionRate: 0,
          culturalRespectScore: 0,
          newMemberIntegration: 0
        },
        recommendations: ['System error - manual review required']
      };
    }
  }
}
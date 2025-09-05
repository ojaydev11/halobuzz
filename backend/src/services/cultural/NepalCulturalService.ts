import { User } from '@/models/User';
import { CulturalIntelligenceService } from './CulturalIntelligenceService';
import { logger } from '@/config/logger';
import { setCache, getCache } from '@/config/redis';

export interface NepalFestival {
  id: string;
  name: string;
  nameNepali: string;
  type: 'major' | 'regional' | 'community';
  date: Date;
  duration: number; // days
  regions: string[];
  traditions: string[];
  greetings: {
    nepali: string;
    english: string;
    romanized: string;
  };
  specialEffects: {
    colors: string[];
    animations: string[];
    sounds: string[];
  };
  activities: string[];
}

export interface CulturalValue {
  concept: string;
  nepaliTerm: string;
  description: string;
  applicationInApp: string;
  respectProtocols: string[];
}

export class NepalCulturalService {
  private static festivals: NepalFestival[] = [
    {
      id: 'dashain',
      name: 'Dashain',
      nameNepali: 'दशैं',
      type: 'major',
      date: new Date('2024-10-10'), // Dynamic calculation needed
      duration: 15,
      regions: ['all'],
      traditions: ['tika', 'jamara', 'family_reunion', 'animal_sacrifice'],
      greetings: {
        nepali: 'दशैंको शुभकामना',
        english: 'Happy Dashain',
        romanized: 'Dashain ko subhakamana'
      },
      specialEffects: {
        colors: ['#FF6B35', '#F7931E', '#FFD700'],
        animations: ['flower_petals', 'tika_blessing', 'kite_flying'],
        sounds: ['dhol_beats', 'temple_bells']
      },
      activities: ['family_video_calls', 'blessing_posts', 'cultural_content']
    },
    {
      id: 'tihar',
      name: 'Tihar',
      nameNepali: 'तिहार',
      type: 'major',
      date: new Date('2024-11-01'),
      duration: 5,
      regions: ['all'],
      traditions: ['lights', 'rangoli', 'deusi_bhailo', 'gai_tihar'],
      greetings: {
        nepali: 'तिहारको शुभकामना',
        english: 'Happy Tihar',
        romanized: 'Tihar ko subhakamana'
      },
      specialEffects: {
        colors: ['#FFD700', '#FF69B4', '#00CED1'],
        animations: ['diya_lights', 'rangoli_patterns', 'fireworks'],
        sounds: ['deusi_songs', 'traditional_music']
      },
      activities: ['light_decoration_contest', 'rangoli_sharing', 'cultural_performances']
    },
    {
      id: 'holi',
      name: 'Holi',
      nameNepali: 'होली',
      type: 'major',
      date: new Date('2024-03-13'),
      duration: 2,
      regions: ['terai', 'kathmandu'],
      traditions: ['color_powder', 'water_balloons', 'community_celebration'],
      greetings: {
        nepali: 'होलीको शुभकामना',
        english: 'Happy Holi',
        romanized: 'Holi ko subhakamana'
      },
      specialEffects: {
        colors: ['#FF1493', '#00FF00', '#1E90FF', '#FFD700'],
        animations: ['color_splash', 'powder_throw', 'water_splash'],
        sounds: ['dhol_nagara', 'folk_songs']
      },
      activities: ['color_photo_filters', 'community_events', 'traditional_sweets']
    }
  ];

  private static culturalValues: CulturalValue[] = [
    {
      concept: 'Namaste',
      nepaliTerm: 'नमस्ते',
      description: 'Respectful greeting acknowledging the divine in each person',
      applicationInApp: 'Default greeting system with joined palms gesture',
      respectProtocols: ['Use for first interactions', 'Include in morning notifications', 'Cultural bridge in global chats']
    },
    {
      concept: 'Guru-Shishya Parampara',
      nepaliTerm: 'गुरु-शिष्य परम्परा',
      description: 'Sacred teacher-student relationship with deep respect',
      applicationInApp: 'Mentorship system with respect protocols and recognition',
      respectProtocols: ['Formal language for mentors', 'Special badges', 'Knowledge sharing rewards']
    },
    {
      concept: 'Atithi Devo Bhava',
      nepaliTerm: 'अतिथि देवो भव',
      description: 'Guest is equivalent to God - ultimate hospitality',
      applicationInApp: 'New user welcome system with special care and guidance',
      respectProtocols: ['VIP treatment for first week', 'Community ambassador assignment', 'Cultural orientation']
    },
    {
      concept: 'Vasudhaiva Kutumbakam',
      nepaliTerm: 'वसुधैव कुटुम्बकम्',
      description: 'The world is one family - global unity with local roots',
      applicationInApp: 'Global community features while celebrating Nepali identity',
      respectProtocols: ['Cultural exchange programs', 'Global festivals celebration', 'Unity in diversity themes']
    }
  ];

  // Get current active festivals
  static async getActiveFestivals(): Promise<NepalFestival[]> {
    try {
      const cached = await getCache('nepal:active_festivals');
      if (cached) return JSON.parse(cached as string);

      const now = new Date();
      const activeFestivals = this.festivals.filter(festival => {
        const festivalEnd = new Date(festival.date);
        festivalEnd.setDate(festivalEnd.getDate() + festival.duration);
        return now >= festival.date && now <= festivalEnd;
      });

      // Cache for 6 hours
      await setCache('nepal:active_festivals', activeFestivals, 21600);
      return activeFestivals;
    } catch (error) {
      logger.error('Error getting active festivals:', error);
      return [];
    }
  }

  // Get upcoming festivals (next 30 days)
  static async getUpcomingFestivals(): Promise<NepalFestival[]> {
    try {
      const now = new Date();
      const thirtyDaysLater = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
      
      return this.festivals.filter(festival => 
        festival.date >= now && festival.date <= thirtyDaysLater
      ).sort((a, b) => a.date.getTime() - b.date.getTime());
    } catch (error) {
      logger.error('Error getting upcoming festivals:', error);
      return [];
    }
  }

  // Apply festival theme to user interface
  static async applyFestivalTheme(userId: string): Promise<{
    theme: string;
    colors: string[];
    greeting: string;
    specialEffects: string[];
  } | null> {
    try {
      const activeFestivals = await this.getActiveFestivals();
      if (activeFestivals.length === 0) return null;

      // Get user's region preference
      const user = await User.findById(userId);
      const userRegion = (user as any)?.preferences?.region || 'all';

      // Find applicable festival
      const applicableFestival = activeFestivals.find(festival => 
        festival.regions.includes('all') || 
        festival.regions.includes(userRegion)
      );

      if (!applicableFestival) return null;

      return {
        theme: applicableFestival.id,
        colors: applicableFestival.specialEffects.colors,
        greeting: applicableFestival.greetings.nepali,
        specialEffects: applicableFestival.specialEffects.animations
      };
    } catch (error) {
      logger.error('Error applying festival theme:', error);
      return null;
    }
  }

  // Generate culturally appropriate content suggestions
  static async getCulturalContentSuggestions(userId: string): Promise<{
    suggestions: string[];
    hashtags: string[];
    backgroundMusic: string[];
  }> {
    try {
      const user = await User.findById(userId);
      const activeFestivals = await this.getActiveFestivals();
      
      const suggestions: string[] = [];
      const hashtags: string[] = ['#HaloBuzzNepal', '#NepalCulture'];
      const backgroundMusic: string[] = [];

      if (activeFestivals.length > 0) {
        const festival = activeFestivals[0];
        suggestions.push(
          `Share your ${festival.name} celebration`,
          `Create traditional ${festival.name} content`,
          `Connect with family for ${festival.name}`,
          `Learn about ${festival.name} traditions`
        );
        
        hashtags.push(`#${festival.name}`, `#${festival.name}2024`);
        backgroundMusic.push(...festival.specialEffects.sounds);
      }

      // Add general cultural suggestions
      suggestions.push(
        'Share traditional Nepali recipes',
        'Teach Nepali language phrases',
        'Show Nepal\'s natural beauty',
        'Celebrate local artisans'
      );

      hashtags.push('#ProudNepal', '#NepalTradition', '#CulturalHeritage');

      return { suggestions, hashtags, backgroundMusic };
    } catch (error) {
      logger.error('Error getting cultural content suggestions:', error);
      return { suggestions: [], hashtags: [], backgroundMusic: [] };
    }
  }

  // Check if content is culturally sensitive
  static async validateCulturalSensitivity(content: {
    text?: string;
    hashtags?: string[];
    category?: string;
  }): Promise<{
    isAppropriate: boolean;
    concerns: string[];
    suggestions: string[];
  }> {
    try {
      const concerns: string[] = [];
      const suggestions: string[] = [];

      // Check for cultural appropriation
      if (content.text) {
        const text = content.text.toLowerCase();
        
        // Check for potentially offensive content
        const offensiveTerms = ['fake nepali', 'backward', 'primitive', 'third world mockery'];
        const foundOffensive = offensiveTerms.some(term => text.includes(term));
        
        if (foundOffensive) {
          concerns.push('Content may contain culturally insensitive language');
          suggestions.push('Consider using respectful language when discussing culture');
        }

        // Check for religious sensitivity
        const religiousTerms = ['hindu', 'buddha', 'temple', 'god', 'goddess'];
        const hasReligious = religiousTerms.some(term => text.includes(term));
        
        if (hasReligious && (text.includes('joke') || text.includes('funny'))) {
          concerns.push('Religious content should be handled with respect');
          suggestions.push('Ensure religious references are respectful and appropriate');
        }
      }

      return {
        isAppropriate: concerns.length === 0,
        concerns,
        suggestions
      };
    } catch (error) {
      logger.error('Error validating cultural sensitivity:', error);
      return {
        isAppropriate: true,
        concerns: [],
        suggestions: []
      };
    }
  }

  // Get elder respect protocols for user interactions
  static async getElderRespectProtocols(interactingUserId: string, targetUserId: string): Promise<{
    useRespectfulLanguage: boolean;
    suggestedGreeting: string;
    interactionGuidelines: string[];
  }> {
    try {
      const [interactingUser, targetUser] = await Promise.all([
        User.findById(interactingUserId),
        User.findById(targetUserId)
      ]);

      if (!interactingUser || !targetUser) {
        return {
          useRespectfulLanguage: false,
          suggestedGreeting: 'नमस्ते',
          interactionGuidelines: []
        };
      }

      // Calculate ages
      const interactingAge = this.calculateAge(interactingUser.dateOfBirth);
      const targetAge = this.calculateAge(targetUser.dateOfBirth);

      const ageDifference = targetAge - interactingAge;
      const isElder = ageDifference >= 10; // 10+ years difference considered elder

      if (isElder) {
        return {
          useRespectfulLanguage: true,
          suggestedGreeting: 'नमस्ते दाजु/दिदी', // Respectful greeting for elders
          interactionGuidelines: [
            'Use respectful language (तपाईं instead of तिमी)',
            'Address with honorific titles (दाजु/दिदी/बुबा/आमा)',
            'Listen more than speak',
            'Ask for blessings when appropriate'
          ]
        };
      }

      return {
        useRespectfulLanguage: false,
        suggestedGreeting: 'नमस्ते',
        interactionGuidelines: ['Maintain friendly and respectful communication']
      };
    } catch (error) {
      logger.error('Error getting elder respect protocols:', error);
      return {
        useRespectfulLanguage: false,
        suggestedGreeting: 'नमस्ते',
        interactionGuidelines: []
      };
    }
  }

  // Community moderation using Panchayat system principles
  static async moderateUsingPanchayatPrinciples(issue: {
    reporterId: string;
    reportedUserId: string;
    contentId?: string;
    issueType: string;
    description: string;
  }): Promise<{
    moderationType: 'automated' | 'community' | 'elder_council';
    escalationLevel: 1 | 2 | 3;
    suggestedAction: string;
    communityMediators?: string[];
  }> {
    try {
      const severity = await this.assessIssueSeverity(issue);
      
      if (severity.level === 1) {
        // Minor issues - community self-resolution
        return {
          moderationType: 'community',
          escalationLevel: 1,
          suggestedAction: 'Community dialogue and mutual understanding',
          communityMediators: await this.findCommunityMediators(issue.reporterId, issue.reportedUserId)
        };
      } else if (severity.level === 2) {
        // Moderate issues - elder council involvement
        return {
          moderationType: 'elder_council',
          escalationLevel: 2,
          suggestedAction: 'Elder council mediation with restorative approach',
          communityMediators: await this.findElderMediators()
        };
      } else {
        // Severe issues - immediate automated action + elder review
        return {
          moderationType: 'automated',
          escalationLevel: 3,
          suggestedAction: 'Immediate protection with elder council review',
          communityMediators: await this.findElderMediators()
        };
      }
    } catch (error) {
      logger.error('Error in Panchayat moderation:', error);
      return {
        moderationType: 'automated',
        escalationLevel: 3,
        suggestedAction: 'Standard automated moderation',
        communityMediators: []
      };
    }
  }

  // Helper methods
  private static calculateAge(birthDate?: Date): number {
    if (!birthDate) return 25; // Default age assumption
    
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  private static async assessIssueSeverity(issue: any): Promise<{ level: 1 | 2 | 3; reasoning: string }> {
    // AI-powered severity assessment would go here
    // For now, simple rule-based assessment
    
    const severKeywords = ['threat', 'violence', 'harassment', 'abuse', 'hate'];
    const moderateKeywords = ['inappropriate', 'offensive', 'spam', 'misleading'];
    
    const description = issue.description.toLowerCase();
    
    if (severKeywords.some(keyword => description.includes(keyword))) {
      return { level: 3, reasoning: 'Contains severe violation keywords' };
    } else if (moderateKeywords.some(keyword => description.includes(keyword))) {
      return { level: 2, reasoning: 'Contains moderate concern keywords' };
    } else {
      return { level: 1, reasoning: 'Minor community disagreement' };
    }
  }

  private static async findCommunityMediators(userId1: string, userId2: string): Promise<string[]> {
    try {
      // Find users with high trust scores and community involvement
      const mediators = await User.find({
        'trust.level': { $in: ['high', 'verified'] },
        'trust.factors.totalStreams': { $gte: 50 },
        isBanned: false,
        country: 'NP'
      })
      .sort({ 'trust.score': -1 })
      .limit(3)
      .select('_id username');

      return mediators.map(m => m._id.toString());
    } catch (error) {
      logger.error('Error finding community mediators:', error);
      return [];
    }
  }

  private static async findElderMediators(): Promise<string[]> {
    try {
      // Find elder users (age 40+) with high trust and community respect
      const elders = await User.find({
        'trust.level': { $in: ['high', 'verified'] },
        'trust.score': { $gte: 80 },
        dateOfBirth: { $lte: new Date(new Date().getFullYear() - 40, 0, 1) },
        isBanned: false,
        country: 'NP'
      })
      .sort({ 'trust.score': -1, followers: -1 })
      .limit(5)
      .select('_id username');

      return elders.map(e => e._id.toString());
    } catch (error) {
      logger.error('Error finding elder mediators:', error);
      return [];
    }
  }

  // Generate daily cultural blessing/inspiration
  static async getDailyBlessing(userId: string): Promise<{
    blessing: string;
    translation: string;
    context: string;
    image?: string;
  }> {
    try {
      const blessings = [
        {
          blessing: 'सर्वे भवन्तु सुखिनः सर्वे सन्तु निरामयाः।',
          translation: 'May all beings be happy, may all beings be free from illness.',
          context: 'Universal well-being prayer from ancient Sanskrit',
          image: 'lotus_blessing.jpg'
        },
        {
          blessing: 'गते गते पारगते पारसंगते बोधि स्वाहा।',
          translation: 'Gone, gone, gone beyond, gone completely beyond, awakening, so be it!',
          context: 'Buddhist mantra for spiritual progress',
          image: 'buddhist_blessing.jpg'
        },
        {
          blessing: 'लोकाः समस्ताः सुखिनो भवन्तु।',
          translation: 'May all worlds be happy.',
          context: 'Universal happiness prayer',
          image: 'world_peace.jpg'
        }
      ];

      const today = new Date();
      const dayIndex = today.getDate() % blessings.length;
      
      return blessings[dayIndex];
    } catch (error) {
      logger.error('Error getting daily blessing:', error);
      return {
        blessing: 'नमस्ते',
        translation: 'Hello with respect',
        context: 'Traditional Nepali greeting',
        image: 'namaste.jpg'
      };
    }
  }

  // Get cultural values for app integration
  static getCulturalValues(): CulturalValue[] {
    return this.culturalValues;
  }

  // Get festival information
  static getAllFestivals(): NepalFestival[] {
    return this.festivals;
  }
}
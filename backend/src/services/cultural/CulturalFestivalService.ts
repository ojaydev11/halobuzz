import { setupLogger } from '../../config/logger';
import { karmaReputationService } from '../KarmaReputationService';

const logger = setupLogger();

export interface Festival {
  id: string;
  name: string;
  nameNepali: string;
  startDate: Date;
  endDate: Date;
  duration: number; // in days
  active: boolean;
  culturalSignificance: string;
  traditions: string[];
  bonusMultiplier: number;
  specialEvents: FestivalEvent[];
}

export interface FestivalEvent {
  id: string;
  name: string;
  nameNepali: string;
  type: 'celebration' | 'participation' | 'cultural_contribution' | 'community_gathering';
  karmaBonus: number;
  reputationBonus: number;
  description: string;
  descriptionNepali: string;
  requirements: string[];
}

export interface FestivalParticipation {
  userId: string;
  festivalId: string;
  eventId: string;
  participationType: string;
  karmaEarned: number;
  reputationEarned: number;
  timestamp: Date;
  culturalNotes?: string;
}

export class CulturalFestivalService {
  private festivals: Festival[] = [
    {
      id: 'dashain',
      name: 'Dashain',
      nameNepali: 'दशैं',
      startDate: new Date('2024-10-03'),
      endDate: new Date('2024-10-17'),
      duration: 15,
      active: false,
      culturalSignificance: 'The greatest festival of Nepal, celebrating the victory of good over evil',
      traditions: [
        'Tika and Jamara blessing',
        'Family gatherings and feasts',
        'Kite flying',
        'Swing (ping) playing',
        'Card games and gambling',
        'New clothes and gifts'
      ],
      bonusMultiplier: 2.0,
      specialEvents: [
        {
          id: 'dashain_tika',
          name: 'Tika Blessing',
          nameNepali: 'टिका आशीर्वाद',
          type: 'celebration',
          karmaBonus: 50,
          reputationBonus: 25,
          description: 'Receive or give Tika blessing during Dashain',
          descriptionNepali: 'दशैंको समयमा टिका आशीर्वाद लिनु वा दिनु',
          requirements: ['Family gathering', 'Traditional blessing ceremony']
        },
        {
          id: 'dashain_kite',
          name: 'Kite Flying',
          nameNepali: 'चङ्गा उडाउने',
          type: 'participation',
          karmaBonus: 30,
          reputationBonus: 15,
          description: 'Participate in traditional kite flying',
          descriptionNepali: 'परम्परागत चङ्गा उडाउनेमा सहभागी हुनु',
          requirements: ['Kite flying activity', 'Community participation']
        },
        {
          id: 'dashain_swing',
          name: 'Swing Playing',
          nameNepali: 'पिङ खेल्ने',
          type: 'participation',
          karmaBonus: 25,
          reputationBonus: 12,
          description: 'Play on traditional bamboo swing',
          descriptionNepali: 'परम्परागत बाँसको पिङमा खेल्नु',
          requirements: ['Swing construction', 'Community gathering']
        }
      ]
    },
    {
      id: 'tihar',
      name: 'Tihar',
      nameNepali: 'तिहार',
      startDate: new Date('2024-11-01'),
      endDate: new Date('2024-11-05'),
      duration: 5,
      active: false,
      culturalSignificance: 'Festival of lights celebrating the bond between humans and animals',
      traditions: [
        'Worship of crows, dogs, cows, and oxen',
        'Laxmi Puja (worship of goddess of wealth)',
        'Bhai Tika (brother-sister bond)',
        'Deusi-Bhailo (traditional songs and dances)',
        'Oil lamps and lights decoration'
      ],
      bonusMultiplier: 1.8,
      specialEvents: [
        {
          id: 'tihar_laxmi',
          name: 'Laxmi Puja',
          nameNepali: 'लक्ष्मी पूजा',
          type: 'celebration',
          karmaBonus: 40,
          reputationBonus: 20,
          description: 'Perform Laxmi Puja for prosperity',
          descriptionNepali: 'समृद्धिको लागि लक्ष्मी पूजा गर्नु',
          requirements: ['Traditional puja ceremony', 'Light decoration']
        },
        {
          id: 'tihar_bhai',
          name: 'Bhai Tika',
          nameNepali: 'भाई टिका',
          type: 'celebration',
          karmaBonus: 45,
          reputationBonus: 22,
          description: 'Celebrate brother-sister bond with Tika',
          descriptionNepali: 'दाजुभाइको सम्बन्ध टिकाको साथ मनाउनु',
          requirements: ['Family gathering', 'Traditional ceremony']
        },
        {
          id: 'tihar_deusi',
          name: 'Deusi-Bhailo',
          nameNepali: 'देउसी-भैलो',
          type: 'cultural_contribution',
          karmaBonus: 35,
          reputationBonus: 18,
          description: 'Participate in traditional Deusi-Bhailo',
          descriptionNepali: 'परम्परागत देउसी-भैलोमा सहभागी हुनु',
          requirements: ['Traditional songs', 'Community participation']
        }
      ]
    },
    {
      id: 'holi',
      name: 'Holi',
      nameNepali: 'होली',
      startDate: new Date('2025-03-14'),
      endDate: new Date('2025-03-15'),
      duration: 2,
      active: false,
      culturalSignificance: 'Festival of colors celebrating the arrival of spring',
      traditions: [
        'Color throwing and playing',
        'Bonfire (Holika Dahan)',
        'Traditional songs and dances',
        'Special sweets and delicacies',
        'Community gatherings'
      ],
      bonusMultiplier: 1.5,
      specialEvents: [
        {
          id: 'holi_colors',
          name: 'Color Playing',
          nameNepali: 'रङ खेल्ने',
          type: 'participation',
          karmaBonus: 30,
          reputationBonus: 15,
          description: 'Participate in color throwing and playing',
          descriptionNepali: 'रङ फ्याँक्ने र खेल्नेमा सहभागी हुनु',
          requirements: ['Color participation', 'Community gathering']
        },
        {
          id: 'holi_bonfire',
          name: 'Holika Dahan',
          nameNepali: 'होलिका दहन',
          type: 'celebration',
          karmaBonus: 35,
          reputationBonus: 18,
          description: 'Participate in traditional bonfire ceremony',
          descriptionNepali: 'परम्परागत चुलो दहनमा सहभागी हुनु',
          requirements: ['Bonfire ceremony', 'Traditional rituals']
        }
      ]
    }
  ];

  /**
   * Get all festivals
   */
  async getAllFestivals(): Promise<Festival[]> {
    return this.festivals;
  }

  /**
   * Get active festivals
   */
  async getActiveFestivals(): Promise<Festival[]> {
    const now = new Date();
    return this.festivals.filter(festival => 
      festival.active && 
      now >= festival.startDate && 
      now <= festival.endDate
    );
  }

  /**
   * Get festival by ID
   */
  async getFestivalById(festivalId: string): Promise<Festival | null> {
    return this.festivals.find(festival => festival.id === festivalId) || null;
  }

  /**
   * Activate festival (called by cron job or admin)
   */
  async activateFestival(festivalId: string): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    try {
      const festival = await this.getFestivalById(festivalId);
      if (!festival) {
        return { success: false, message: 'Festival not found', error: 'FESTIVAL_NOT_FOUND' };
      }

      festival.active = true;
      logger.info(`Festival activated: ${festival.name} (${festival.nameNepali})`);

      // Send notification to all users about festival activation
      await this.notifyFestivalActivation(festival);

      return { 
        success: true, 
        message: `Festival ${festival.name} (${festival.nameNepali}) is now active!` 
      };

    } catch (error) {
      logger.error('Failed to activate festival:', error);
      return { success: false, message: 'Failed to activate festival', error: error.message };
    }
  }

  /**
   * Deactivate festival
   */
  async deactivateFestival(festivalId: string): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    try {
      const festival = await this.getFestivalById(festivalId);
      if (!festival) {
        return { success: false, message: 'Festival not found', error: 'FESTIVAL_NOT_FOUND' };
      }

      festival.active = false;
      logger.info(`Festival deactivated: ${festival.name} (${festival.nameNepali})`);

      return { 
        success: true, 
        message: `Festival ${festival.name} (${festival.nameNepali}) has ended` 
      };

    } catch (error) {
      logger.error('Failed to deactivate festival:', error);
      return { success: false, message: 'Failed to deactivate festival', error: error.message };
    }
  }

  /**
   * Record festival participation
   */
  async recordFestivalParticipation(
    userId: string,
    festivalId: string,
    eventId: string,
    participationType: string,
    culturalNotes?: string
  ): Promise<{
    success: boolean;
    karmaEarned?: number;
    reputationEarned?: number;
    message?: string;
    error?: string;
  }> {
    try {
      const festival = await this.getFestivalById(festivalId);
      if (!festival) {
        return { success: false, error: 'Festival not found' };
      }

      if (!festival.active) {
        return { success: false, error: 'Festival is not currently active' };
      }

      const event = festival.specialEvents.find(e => e.id === eventId);
      if (!event) {
        return { success: false, error: 'Festival event not found' };
      }

      // Apply festival bonus multiplier
      const karmaBonus = Math.round(event.karmaBonus * festival.bonusMultiplier);
      const reputationBonus = Math.round(event.reputationBonus * festival.bonusMultiplier);

      // Award karma and reputation through unified service
      const result = await karmaReputationService.awardFestivalBonus(
        userId,
        festival.name,
        festival.nameNepali,
        event.type as 'participation' | 'celebration' | 'cultural_contribution'
      );

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Log participation
      const participation: FestivalParticipation = {
        userId,
        festivalId,
        eventId,
        participationType,
        karmaEarned: result.karmaBonus || 0,
        reputationEarned: result.reputationBonus || 0,
        timestamp: new Date(),
        culturalNotes
      };

      logger.info(`Festival participation recorded: ${userId} - ${festival.name} - ${event.name}`, participation);

      return {
        success: true,
        karmaEarned: result.karmaBonus,
        reputationEarned: result.reputationBonus,
        message: `Successfully participated in ${event.nameNepali} (${event.name}) during ${festival.nameNepali} (${festival.name})`
      };

    } catch (error) {
      logger.error('Failed to record festival participation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get festival leaderboard
   */
  async getFestivalLeaderboard(festivalId: string, limit: number = 20): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    try {
      const festival = await this.getFestivalById(festivalId);
      if (!festival) {
        return { success: false, error: 'Festival not found' };
      }

      // This would typically query a database for festival participations
      // For now, we'll return a placeholder structure
      const leaderboard = [];

      return { success: true, data: leaderboard };

    } catch (error) {
      logger.error('Failed to get festival leaderboard:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get upcoming festivals
   */
  async getUpcomingFestivals(limit: number = 5): Promise<Festival[]> {
    const now = new Date();
    return this.festivals
      .filter(festival => festival.startDate > now)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .slice(0, limit);
  }

  /**
   * Check if user can participate in festival event
   */
  async canParticipateInEvent(
    userId: string,
    festivalId: string,
    eventId: string
  ): Promise<{
    canParticipate: boolean;
    reason?: string;
  }> {
    try {
      const festival = await this.getFestivalById(festivalId);
      if (!festival) {
        return { canParticipate: false, reason: 'Festival not found' };
      }

      if (!festival.active) {
        return { canParticipate: false, reason: 'Festival is not currently active' };
      }

      const event = festival.specialEvents.find(e => e.id === eventId);
      if (!event) {
        return { canParticipate: false, reason: 'Event not found' };
      }

      // Check if user has already participated in this event today
      // This would typically check a database
      // For now, we'll allow participation

      return { canParticipate: true };

    } catch (error) {
      logger.error('Failed to check participation eligibility:', error);
      return { canParticipate: false, reason: 'System error' };
    }
  }

  /**
   * Get festival statistics
   */
  async getFestivalStats(festivalId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const festival = await this.getFestivalById(festivalId);
      if (!festival) {
        return { success: false, error: 'Festival not found' };
      }

      // This would typically query database for statistics
      const stats = {
        totalParticipants: 0,
        totalEvents: festival.specialEvents.length,
        totalKarmaAwarded: 0,
        totalReputationAwarded: 0,
        mostPopularEvent: festival.specialEvents[0]?.name || 'None',
        averageParticipation: 0
      };

      return { success: true, data: stats };

    } catch (error) {
      logger.error('Failed to get festival stats:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Notify users about festival activation
   */
  private async notifyFestivalActivation(festival: Festival): Promise<void> {
    try {
      // This would typically send push notifications to all users
      logger.info(`Sending festival activation notification: ${festival.name} (${festival.nameNepali})`);
      
      // Placeholder for notification service integration
      // await notificationService.sendFestivalNotification(festival);
      
    } catch (error) {
      logger.error('Failed to send festival notification:', error);
    }
  }

  /**
   * Update festival dates (for admin use)
   */
  async updateFestivalDates(festivalId: string, startDate: Date, endDate: Date): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    try {
      const festival = await this.getFestivalById(festivalId);
      if (!festival) {
        return { success: false, message: 'Festival not found', error: 'FESTIVAL_NOT_FOUND' };
      }

      festival.startDate = startDate;
      festival.endDate = endDate;
      festival.duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      logger.info(`Festival dates updated: ${festival.name} - ${startDate.toDateString()} to ${endDate.toDateString()}`);

      return { 
        success: true, 
        message: `Festival ${festival.name} dates updated successfully` 
      };

    } catch (error) {
      logger.error('Failed to update festival dates:', error);
      return { success: false, message: 'Failed to update festival dates', error: error.message };
    }
  }
}

export const culturalFestivalService = new CulturalFestivalService();

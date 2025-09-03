import { 
  BoredomEvent, 
  BoredomAnalysis, 
  CohostCandidate, 
  FestivalSkin, 
  EngagementRequest,
  ServiceResponse,
  EngagementSpec,
  LanguageCode
} from '../models/types';
import logger from '../utils/logger';
import { aiModelManager } from '../utils/ai-models';

export class EngagementService {
  private static instance: EngagementService;
  private boredomThresholds = {
    low: 30,
    medium: 50,
    high: 70,
    critical: 85
  };

  private cohostDatabase: Map<string, CohostCandidate> = new Map();
  private festivalDatabase: Map<string, FestivalSkin[]> = new Map();

  private constructor() {
    this.initializeMockData();
    logger.info('EngagementService initialized');
  }

  static getInstance(): EngagementService {
    if (!EngagementService.instance) {
      EngagementService.instance = new EngagementService();
    }
    return EngagementService.instance;
  }

  /**
   * Detect boredom from viewer events and suggest engagement boost
   */
  async boredom_detector(viewerEvents: BoredomEvent[]): Promise<BoredomAnalysis> {
    try {
      logger.info('Starting boredom detection', { eventCount: viewerEvents.length });

      if (viewerEvents.length === 0) {
        return {
          score: 0,
          trend: 'stable',
          suggestions: ['No events to analyze'],
          boostMultiplier: 1.0
        };
      }

      // Calculate boredom score based on event patterns
      const score = this.calculateBoredomScore(viewerEvents);
      const trend = this.analyzeBoredomTrend(viewerEvents);
      const suggestions = this.generateEngagementSuggestions(score, trend);

      // Determine if boost should be suggested
      let boostMultiplier: number | undefined;
      if (score > this.boredomThresholds.critical) {
        boostMultiplier = 3;
      } else if (score > this.boredomThresholds.high) {
        boostMultiplier = 2;
      }

      const analysis: BoredomAnalysis = {
        score,
        trend,
        suggestions,
        boostMultiplier: boostMultiplier || 1.0
      };

      logger.info('Boredom detection completed', { 
        score, 
        trend, 
        boostMultiplier,
        suggestionCount: suggestions.length 
      });

      return analysis;
    } catch (error) {
      logger.error('Boredom detection failed:', error);
      throw error;
    }
  }

  /**
   * Suggest cohosts based on host ID and country
   */
  async cohost_suggester(hostId: string, country: string): Promise<CohostCandidate[]> {
    try {
      logger.info('Starting cohost suggestion', { hostId, country });

      // Get host preferences and compatibility factors
      const hostPreferences = await this.getHostPreferences(hostId);
      
      // Filter candidates by availability and basic criteria
      const availableCandidates = Array.from(this.cohostDatabase.values())
        .filter(candidate => candidate.availability)
        .filter(candidate => candidate.hostId !== hostId);

      // Calculate compatibility scores
      const scoredCandidates = availableCandidates.map(candidate => ({
        ...candidate,
        compatibility: this.calculateCompatibility(candidate, hostPreferences, country)
      }));

      // Sort by compatibility and rating
      const sortedCandidates = scoredCandidates
        .sort((a, b) => {
          const scoreA = (a.compatibility * 0.7) + (a.rating * 0.3);
          const scoreB = (b.compatibility * 0.7) + (b.rating * 0.3);
          return scoreB - scoreA;
        })
        .slice(0, 10); // Return top 10 candidates

      logger.info('Cohost suggestion completed', { 
        candidateCount: sortedCandidates.length,
        topCompatibility: sortedCandidates[0]?.compatibility 
      });

      return sortedCandidates;
    } catch (error) {
      logger.error('Cohost suggestion failed:', error);
      throw error;
    }
  }

  /**
   * Get festival skin and gift set for country and date
   */
  async festival_skinner(country: string, date: string): Promise<FestivalSkin | null> {
    try {
      logger.info('Starting festival skin lookup', { country, date });

      const festivalDate = new Date(date);
      const countryFestivals = this.festivalDatabase.get(country) || [];
      
      // Find active festival for the given date
      const activeFestival = countryFestivals.find(festival => {
        const startDate = new Date(festival.startDate);
        const endDate = new Date(festival.endDate);
        return festival.active && festivalDate >= startDate && festivalDate <= endDate;
      });

      if (!activeFestival) {
        logger.info('No active festival found', { country, date });
        return null;
      }

      logger.info('Festival skin found', { 
        skinId: activeFestival.skinId,
        name: activeFestival.name 
      });

      return activeFestival;
    } catch (error) {
      logger.error('Festival skin lookup failed:', error);
      throw error;
    }
  }

  /**
   * Process engagement request
   */
  async processEngagementRequest(request: EngagementRequest): Promise<ServiceResponse<any>> {
    const requestId = this.generateRequestId();
    
    try {
      logger.info('Processing engagement request', { requestId, type: request.type });

      let result: BoredomAnalysis | CohostCandidate[] | FestivalSkin[] | { success: boolean; message: string };

      switch (request.type) {
        case 'boredom_detector':
          if (!request.data.viewerEvents) {
            throw new Error('viewerEvents is required for boredom detection');
          }
          result = await this.boredom_detector(request.data.viewerEvents as BoredomEvent[]);
          break;
        case 'cohost_suggester':
          if (!request.data.hostId || !request.data.country) {
            throw new Error('hostId and country are required for cohost suggestion');
          }
          result = await this.cohost_suggester(request.data.hostId as string, request.data.country as string);
          break;
        case 'festival_skinner':
          if (!request.data.country || !request.data.date) {
            throw new Error('country and date are required for festival skinning');
          }
          const festivalResult = await this.festival_skinner(request.data.country as string, request.data.date as string);
          result = festivalResult ? [festivalResult] : [];
          break;
        default:
          throw new Error(`Unknown engagement request type: ${request.type}`);
      }

      return {
        success: true,
        data: result,
        timestamp: Date.now(),
        requestId
      };
    } catch (error) {
      logger.error('Engagement request failed', { requestId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        requestId
      };
    }
  }

  /**
   * Calculate boredom score from viewer events
   */
  private calculateBoredomScore(events: BoredomEvent[]): number {
    let score = 0;
    let totalDuration = 0;
    let leaveCount = 0;
    let returnCount = 0;
    let interactionCount = 0;

    for (const event of events) {
      switch (event.eventType) {
        case 'leave':
          leaveCount++;
          score += 15;
          break;
        case 'return':
          returnCount++;
          score -= 5;
          break;
        case 'like':
        case 'comment':
        case 'share':
          interactionCount++;
          score -= 10;
          break;
        case 'view':
          if (event.duration) {
            totalDuration += event.duration;
            // Penalize long viewing without interaction
            if (event.duration > 300) { // 5 minutes
              score += 5;
            }
          }
          break;
      }
    }

    // Normalize score based on event count and duration
    const eventCount = events.length;
    const avgDuration = totalDuration / eventCount || 0;
    
    // Adjust score based on interaction ratio
    const interactionRatio = interactionCount / eventCount;
    score += (1 - interactionRatio) * 20;

    // Cap score between 0 and 100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Analyze boredom trend from recent events
   */
  private analyzeBoredomTrend(events: BoredomEvent[]): BoredomAnalysis['trend'] {
    if (events.length < 2) return 'stable';

    // Sort events by timestamp
    const sortedEvents = events.sort((a, b) => a.timestamp - b.timestamp);
    
    // Split into two halves
    const midPoint = Math.floor(sortedEvents.length / 2);
    const firstHalf = sortedEvents.slice(0, midPoint);
    const secondHalf = sortedEvents.slice(midPoint);

    const firstScore = this.calculateBoredomScore(firstHalf);
    const secondScore = this.calculateBoredomScore(secondHalf);

    const difference = secondScore - firstScore;
    
    if (difference > 10) return 'increasing';
    if (difference < -10) return 'decreasing';
    return 'stable';
  }

  /**
   * Generate engagement suggestions based on boredom score and trend
   */
  private generateEngagementSuggestions(score: number, trend: BoredomAnalysis['trend']): string[] {
    const suggestions: string[] = [];

    if (score > this.boredomThresholds.critical) {
      suggestions.push('Immediate action required: Consider ending stream or major content change');
      suggestions.push('Activate emergency engagement boost (3x multiplier)');
      suggestions.push('Send push notifications to loyal viewers');
    } else if (score > this.boredomThresholds.high) {
      suggestions.push('High boredom detected: Switch to interactive content');
      suggestions.push('Start a Q&A session or poll');
      suggestions.push('Consider bringing in a cohost');
    } else if (score > this.boredomThresholds.medium) {
      suggestions.push('Moderate engagement drop: Add variety to content');
      suggestions.push('Incorporate viewer suggestions');
      suggestions.push('Start a mini-game or challenge');
    } else if (score > this.boredomThresholds.low) {
      suggestions.push('Slight engagement dip: Monitor closely');
      suggestions.push('Ask for viewer feedback');
    } else {
      suggestions.push('Good engagement levels: Maintain current content');
    }

    // Add trend-specific suggestions
    if (trend === 'increasing') {
      suggestions.push('Boredom is increasing: Consider content pivot');
    } else if (trend === 'decreasing') {
      suggestions.push('Engagement is improving: Continue current approach');
    }

    return suggestions;
  }

  /**
   * Get host preferences for compatibility calculation
   */
  private async getHostPreferences(hostId: string): Promise<any> {
    // Placeholder for host preference retrieval
    // In production, this would fetch from database
    return {
      languages: ['English', 'Spanish'],
      specialties: ['Gaming', 'Comedy'],
      preferredCountries: ['US', 'MX', 'CA'],
      rating: 4.5,
      totalStreams: 150
    };
  }

  /**
   * Calculate compatibility between host and candidate
   */
  private calculateCompatibility(
    candidate: CohostCandidate, 
    hostPreferences: { languages: LanguageCode[]; specialties: string[]; rating: number; country?: string; preferredCountries?: string[] }, 
    country: string
  ): number {
    let compatibility = 0.5; // Base compatibility

    // Language compatibility
    const languageOverlap = candidate.languages.filter(lang => 
      hostPreferences.languages.includes(lang)
    ).length;
    compatibility += (languageOverlap / Math.max(candidate.languages.length, 1)) * 0.2;

    // Specialty compatibility
    const specialtyOverlap = candidate.specialties.filter(spec => 
      hostPreferences.specialties.includes(spec)
    ).length;
    compatibility += (specialtyOverlap / Math.max(candidate.specialties.length, 1)) * 0.2;

    // Rating compatibility
    const ratingDiff = Math.abs(candidate.rating - hostPreferences.rating);
    compatibility += (1 - ratingDiff / 5) * 0.1;

    // Country preference
    if (hostPreferences.preferredCountries?.includes(country)) {
      compatibility += 0.1;
    }

    return Math.min(1, Math.max(0, compatibility));
  }

  /**
   * Initialize mock data for testing
   */
  private initializeMockData(): void {
    // Mock cohost candidates
    const mockCandidates: CohostCandidate[] = [
      {
        id: 'candidate_001',
        hostId: 'host_001',
        name: 'Alex Gaming',
        avatar: 'https://example.com/avatar1.jpg',
        rating: 4.8,
        compatibility: 0.9,
        availability: true,
        languages: ['English', 'Spanish'],
        specialties: ['Gaming', 'Tech']
      },
      {
        id: 'candidate_002',
        hostId: 'host_002',
        name: 'Maria Comedy',
        avatar: 'https://example.com/avatar2.jpg',
        rating: 4.6,
        compatibility: 0.8,
        availability: true,
        languages: ['English', 'Portuguese'],
        specialties: ['Comedy', 'Lifestyle']
      },
      {
        id: 'candidate_003',
        hostId: 'host_003',
        name: 'Carlos Music',
        avatar: 'https://example.com/avatar3.jpg',
        rating: 4.7,
        compatibility: 0.7,
        availability: false,
        languages: ['Spanish', 'English'],
        specialties: ['Music', 'Entertainment']
      }
    ];

    mockCandidates.forEach(candidate => {
      this.cohostDatabase.set(candidate.id, candidate);
    });

    // Mock festival skins
    const mockFestivals: FestivalSkin[] = [
      {
        id: 'festival_skin_001',
        skinId: 'festival_001',
        name: 'Carnival Celebration',
        type: 'background',
        url: 'https://example.com/carnival_skin.jpg',
        description: 'Vibrant carnival-themed skin for Brazilian festivals',
        imageUrl: 'https://example.com/carnival_skin.jpg',
        giftSet: {
          id: 'gift_set_001',
          giftId: 'gift_001',
          name: 'Carnival Mask',
          description: 'Colorful carnival mask gift',
          imageUrl: 'https://example.com/carnival_mask.jpg',
          rarity: 'rare',
          value: 100,
          items: ['mask', 'feathers', 'colors']
        },
        active: true,
        country: 'BR',
        festival: 'Carnival',
        startDate: '2024-02-01',
        endDate: '2024-02-15'
      },
      {
        id: 'festival_skin_002',
        skinId: 'festival_002',
        name: 'Diwali Lights',
        type: 'background',
        url: 'https://example.com/diwali_skin.jpg',
        description: 'Beautiful Diwali-themed skin for Indian festivals',
        imageUrl: 'https://example.com/diwali_skin.jpg',
        giftSet: {
          id: 'gift_set_002',
          giftId: 'gift_002',
          name: 'Diwali Lantern',
          description: 'Glowing Diwali lantern gift',
          imageUrl: 'https://example.com/diwali_lantern.jpg',
          rarity: 'epic',
          value: 200,
          items: ['lantern', 'lights', 'candles']
        },
        active: true,
        country: 'IN',
        festival: 'Diwali',
        startDate: '2024-11-01',
        endDate: '2024-11-05'
      }
    ];

    this.festivalDatabase.set('BR', [mockFestivals[0]!]);
    this.festivalDatabase.set('IN', [mockFestivals[1]!]);
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `eng_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update boredom thresholds
   */
  updateBoredomThresholds(thresholds: Partial<typeof this.boredomThresholds>): void {
    this.boredomThresholds = { ...this.boredomThresholds, ...thresholds };
    logger.info('Updated boredom thresholds', { thresholds: this.boredomThresholds });
  }

  /**
   * Get current boredom thresholds
   */
  getBoredomThresholds(): typeof this.boredomThresholds {
    return { ...this.boredomThresholds };
  }

  /**
   * Trigger battle boost for a stream
   */
  async triggerBattleBoost(streamId: string, multiplier: number, durationSec: number): Promise<any> {
    try {
      logger.info('Triggering battle boost', { streamId, multiplier, durationSec });

      // In a real implementation, this would communicate with the backend via socket
      // For now, we'll return a success response
      const result = {
        streamId,
        multiplier,
        durationSec,
        activatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + durationSec * 1000).toISOString()
      };

      logger.info('Battle boost triggered successfully', { result });

      return result;
    } catch (error) {
      logger.error('Battle boost trigger failed:', error);
      throw error;
    }
  }
}

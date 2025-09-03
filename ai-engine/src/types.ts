// ai-engine/src/models/types.ts
export type LanguageCode = 'en' | 'ne' | 'hi' | 'English' | 'Spanish' | 'Portuguese';

export type ReputationBucket = 'excellent' | 'good' | 'fair' | 'poor' | 'banned';
export const REPUTATION_BUCKET_WEIGHTS: Record<ReputationBucket, number> = {
  excellent: 5,
  good: 3,
  fair: 1,
  poor: -2,
  banned: -999,
};

export type SentimentBucket = 'positive' | 'negative' | 'neutral';
export const SENTIMENT_WEIGHTS: Record<SentimentBucket, number> = {
  positive: 1,
  negative: -1,
  neutral: 0,
};

// Generic spec used by EngagementService; broadened to avoid implicit-any.
export interface EngagementSpec {
  lang?: LanguageCode;
  [key: string]: unknown;
}

// AI model names used by AIModelManager.
// Keep it permissive but typed so code compiles; extend if needed.
export type AIModelName =
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'llama'
  | 'claude'
  | 'gemini'
  | string;

// Request types for different services
export interface EngagementRequest {
  type: string;
  data: Record<string, unknown>;
  userId?: string;
}

export interface ModerationRequest {
  type: string;
  data: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
}

export interface ReputationEvent {
  userId: string;
  eventType: 'positive' | 'negative' | 'neutral';
  score: number;
  reason: string;
  timestamp?: number;
  source: 'moderation' | 'engagement' | 'user_report' | 'system';
}

// Additional types for EngagementService
export interface BoredomEvent {
  viewerId: string;
  timestamp: number;
  eventType: 'view' | 'like' | 'comment' | 'share' | 'leave' | 'return';
  duration?: number;
}

export interface BoredomAnalysis {
  score: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  suggestions: string[];
  boostMultiplier: number;
}

export interface CohostCandidate {
  id: string;
  hostId: string;
  name: string;
  rating: number;
  languages: LanguageCode[];
  specialties: string[];
  availability: boolean;
  avatar?: string;
  compatibility?: number;
}

export interface FestivalSkin {
  id: string;
  skinId: string;
  name: string;
  type: 'background' | 'overlay' | 'effect';
  url: string;
  country: string;
  festival: string;
  startDate: string;
  endDate: string;
  active: boolean;
  description?: string;
  imageUrl?: string;
  giftSet?: {
    id: string;
    giftId: string;
    name: string;
    description?: string;
    imageUrl?: string;
    rarity?: string;
    value?: number;
    items: string[];
  };
}

export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
  requestId?: string;
}

// Moderation service types
export interface NSFWScanResult {
  isNSFW: boolean;
  confidence: number;
  categories: string[];
  timestamp: number;
  label?: string;
  score?: number;
}

export interface AgeEstimateResult {
  estimatedAge: number;
  confidence: number;
  isMinor: boolean;
  timestamp: number;
  ageEstimate?: number;
}

export interface ProfanityResult {
  hasProfanity: boolean;
  confidence: number;
  detectedWords: string[];
  timestamp: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  badnessScore?: number;
}

export interface PolicyAction {
  action: 'allow' | 'warn' | 'block' | 'flag' | 'none' | 'ban' | 'timeout' | 'blur';
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  confidence?: number;
  duration?: number;
}

export interface AIWarningEvent {
  userId: string;
  type: 'nsfw' | 'age' | 'profanity' | 'policy' | 'moderation_warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, unknown>;
  timestamp: number;
}

// Reputation service types
export interface ReputationScore {
  userId: string;
  score: number;
  level: ReputationBucket;
  lastUpdated: number;
  totalEvents: number;
  recentEvents: number;
  positiveEvents?: number;
  negativeEvents?: number;
  restrictions: {
    canStream: boolean;
    canComment: boolean;
    canGift: boolean;
    canHost: boolean;
  };
}
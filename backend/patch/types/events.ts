/**
 * Canonical Socket.IO Event Types
 * 
 * This patch provides shared event type definitions to ensure
 * type safety between socket emitters and listeners across client and server.
 */

// Base event structure
export interface BaseEvent {
  timestamp: Date;
  eventId: string;
}

// Stream Events
export interface StreamJoinEvent extends BaseEvent {
  type: 'stream:join';
  streamId: string;
  userId: string;
  userInfo: {
    username: string;
    ogLevel: number;
    avatar?: string;
  };
}

export interface StreamLeaveEvent extends BaseEvent {
  type: 'stream:leave';
  streamId: string;
  userId: string;
}

// Chat Events
export interface ChatNewEvent extends BaseEvent {
  type: 'chat:new';
  streamId: string;
  messageId: string;
  userId: string;
  message: {
    text: string;
    type: 'text' | 'gift' | 'system' | 'emoji';
    giftId?: string;
    replyTo?: string;
  };
  userInfo: {
    username: string;
    ogLevel: number;
    avatar?: string;
  };
}

// Gift Events
export interface GiftSentEvent extends BaseEvent {
  type: 'gift:sent';
  streamId: string;
  giftId: string;
  fromUserId: string;
  toUserId: string;
  gift: {
    id: string;
    name: string;
    price: number;
    animation: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
  };
  userInfo: {
    username: string;
    ogLevel: number;
    avatar?: string;
  };
}

// Throne Events
export interface ThroneClaimedEvent extends BaseEvent {
  type: 'throne:claimed';
  streamId: string;
  throneId: string;
  userId: string;
  throne: {
    id: string;
    position: number;
    totalGifts: number;
    topGift: {
      giftId: string;
      name: string;
      count: number;
    };
  };
  userInfo: {
    username: string;
    ogLevel: number;
    avatar?: string;
  };
}

// Battle Events
export interface BattleBoostEvent extends BaseEvent {
  type: 'battle:boost';
  streamId: string;
  battleId: string;
  userId: string;
  boost: {
    type: 'attack' | 'defense' | 'special';
    power: number;
    duration: number;
  };
  userInfo: {
    username: string;
    ogLevel: number;
    avatar?: string;
  };
}

// AI Events
export interface AIWarningEvent extends BaseEvent {
  type: 'ai:warning';
  streamId: string;
  userId: string;
  warning: {
    type: 'content' | 'behavior' | 'spam';
    severity: 'low' | 'medium' | 'high';
    message: string;
    action?: 'mute' | 'kick' | 'ban';
  };
}

// OG Events
export interface OGChangedEvent extends BaseEvent {
  type: 'og:changed';
  userId: string;
  ogChange: {
    oldLevel: number;
    newLevel: number;
    tier: {
      id: number;
      name: string;
      benefits: string[];
    };
  };
  userInfo: {
    username: string;
    avatar?: string;
  };
}

// Metrics Events
export interface MetricsUpdateEvent extends BaseEvent {
  type: 'metrics:update';
  streamId: string;
  metrics: {
    viewers: number;
    likes: number;
    gifts: number;
    comments: number;
    duration: number;
  };
}

// Union type for all events
export type SocketEvent = 
  | StreamJoinEvent
  | StreamLeaveEvent
  | ChatNewEvent
  | GiftSentEvent
  | ThroneClaimedEvent
  | BattleBoostEvent
  | AIWarningEvent
  | OGChangedEvent
  | MetricsUpdateEvent;

// Event type mapping for type safety
export const EVENT_TYPES = {
  STREAM_JOIN: 'stream:join' as const,
  STREAM_LEAVE: 'stream:leave' as const,
  CHAT_NEW: 'chat:new' as const,
  GIFT_SENT: 'gift:sent' as const,
  THRONE_CLAIMED: 'throne:claimed' as const,
  BATTLE_BOOST: 'battle:boost' as const,
  AI_WARNING: 'ai:warning' as const,
  OG_CHANGED: 'og:changed' as const,
  METRICS_UPDATE: 'metrics:update' as const,
} as const;

// Type guards for event validation
export function isStreamJoinEvent(event: SocketEvent): event is StreamJoinEvent {
  return event.type === EVENT_TYPES.STREAM_JOIN;
}

export function isStreamLeaveEvent(event: SocketEvent): event is StreamLeaveEvent {
  return event.type === EVENT_TYPES.STREAM_LEAVE;
}

export function isChatNewEvent(event: SocketEvent): event is ChatNewEvent {
  return event.type === EVENT_TYPES.CHAT_NEW;
}

export function isGiftSentEvent(event: SocketEvent): event is GiftSentEvent {
  return event.type === EVENT_TYPES.GIFT_SENT;
}

export function isThroneClaimedEvent(event: SocketEvent): event is ThroneClaimedEvent {
  return event.type === EVENT_TYPES.THRONE_CLAIMED;
}

export function isBattleBoostEvent(event: SocketEvent): event is BattleBoostEvent {
  return event.type === EVENT_TYPES.BATTLE_BOOST;
}

export function isAIWarningEvent(event: SocketEvent): event is AIWarningEvent {
  return event.type === EVENT_TYPES.AI_WARNING;
}

export function isOGChangedEvent(event: SocketEvent): event is OGChangedEvent {
  return event.type === EVENT_TYPES.OG_CHANGED;
}

export function isMetricsUpdateEvent(event: SocketEvent): event is MetricsUpdateEvent {
  return event.type === EVENT_TYPES.METRICS_UPDATE;
}

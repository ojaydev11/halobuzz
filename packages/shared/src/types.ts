export type UserRole = 'user' | 'host' | 'admin' | 'moderator';

export interface UserProfile {
  _id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  countryCode?: string;
  roles: UserRole[];
  ogLevel: 1 | 2 | 3 | 4 | 5;
  reputationScore: number; // 0-100
  trustFlags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  userId: string;
  coinBalance: number;
  bonusCoinBalance: number;
  lockedCoinBalance: number;
  totalGiftsSent: number;
  totalGiftsReceived: number;
  updatedAt: string;
}

export interface StreamSession {
  _id: string;
  hostId: string;
  channelId: string; // Agora channel name or WebRTC room id
  isLive: boolean;
  title?: string;
  tags?: string[];
  countryCode?: string;
  startedAt?: string;
  endedAt?: string;
  concurrentViewers: number;
  totalViewers: number;
}

export interface GiftDefinition {
  _id: string;
  code: string; // e.g., ROSE, CASTLE
  name: string;
  coinCost: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  animationUrl?: string;
  isFestival?: boolean;
}

export interface TransactionRecord {
  _id: string;
  userId: string;
  type: 'purchase' | 'gift_send' | 'gift_receive' | 'withdraw' | 'reward' | 'throne' | 'fee';
  amountCoins: number; // positive for credit, negative for debit
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ThroneSeat {
  _id: string;
  userId: string;
  streamId?: string;
  purchasedAt: string;
  expiresAt: string; // 25 days validity
}


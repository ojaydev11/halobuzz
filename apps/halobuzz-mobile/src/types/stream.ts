export interface Stream {
  id: string;
  channelName: string;
  hostId?: string;
  hostName?: string;
  hostAvatar?: string;
  host: {
    id: string;
    username: string;
    avatar?: string;
    ogLevel?: number;
    followers?: number;
  };
  thumb: string;
  thumbnail?: string;
  streamUrl?: string;
  viewers: number;
  viewerCount?: number;
  maxViewers?: number;
  currentViewers?: number;
  country: string;
  startedAt: string;
  startTime?: string;
  tags: string[];
  title?: string;
  category?: string;
  description?: string;
  isLive: boolean;
  duration?: number;
  totalLikes?: number;
  likes?: number;
  comments?: number;
  quality?: string;
  language?: string;
  isPublic?: boolean;
  allowComments?: boolean;
  allowGifts?: boolean;
  minLevel?: number;
  totalCoins?: number;
  data?: any;
}

export interface FeaturedItem {
  id: string;
  type: 'live' | 'festival';
  title: string;
  subtitle: string;
  cta: string;
  image: string;
  deeplink: string;
}

export interface ContinueWatchingItem {
  streamId: string;
  host: {
    username: string;
    avatar?: string;
  };
  thumb: string;
  progress: number; // 0-1
  lastWatched: string;
}

export interface CheckinReward {
  coinsAwarded: number;
  streak: number;
  nextCheckin?: string;
}

export type RegionFilter = 'all' | 'nepal' | 'asia' | 'global' | 'following';

export interface StreamsResponse {
  success: boolean;
  data: {
    streams: Stream[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
  };
  message?: string;
}

export interface CreateStreamRequest {
  title: string;
  category?: string;
  tags?: string[];
  country?: string;
  thumbnail?: string;
  description?: string;
  isAudioOnly?: boolean;
}

export interface Game {
  id: string;
  name: string;
  description?: string;
  rules: string[];
  thumbnail?: string;
  isActive: boolean;
}

export interface HomeState {
  // Streams
  streams: Stream[];
  featuredItems: FeaturedItem[];
  continueWatching: ContinueWatchingItem[];

  // UI State
  activeFilter: RegionFilter;
  loading: boolean;
  refreshing: boolean;
  error?: string;

  // Check-in
  checkinReward?: CheckinReward;
  checkinLoading: boolean;

  // Pagination
  hasMore: boolean;
  page: number;
}
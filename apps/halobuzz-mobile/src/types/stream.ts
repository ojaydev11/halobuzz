export interface Stream {
  id: string;
  channelName: string;
  host: {
    id: string;
    username: string;
    avatar?: string;
    ogLevel?: number;
  };
  thumb: string;
  viewers: number;
  country: string;
  startedAt: string;
  tags: string[];
  title?: string;
  category?: string;
  isLive: boolean;
  duration?: number;
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
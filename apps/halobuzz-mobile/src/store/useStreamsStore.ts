import { create } from 'zustand';
import { Stream, FeaturedItem, ContinueWatchingItem, CheckinReward, RegionFilter, HomeState } from '../types/stream';

interface StreamsStore extends HomeState {
  // Actions
  fetchActiveStreams: (region?: RegionFilter) => Promise<void>;
  fetchFeaturedItems: () => Promise<void>;
  fetchContinueWatching: () => Promise<void>;
  claimCheckin: () => Promise<void>;
  setFilter: (filter: RegionFilter) => void;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  clearError: () => void;
}

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:4000';

const getMockStreams = (): Stream[] => [
  {
    id: '1',
    channelName: 'gaming-channel-1',
    title: 'Epic Gaming Session!',
    description: 'Playing the latest games and having fun with viewers',
    hostId: 'user_1',
    hostName: 'GamerPro',
    hostAvatar: 'https://i.pravatar.cc/150?img=1',
    host: {
      id: 'user_1',
      username: 'GamerPro',
      avatar: 'https://i.pravatar.cc/150?img=1',
      ogLevel: 2,
      followers: 1500
    },
    category: 'gaming',
    thumbnail: 'https://picsum.photos/400/300?random=1',
    thumb: 'https://picsum.photos/400/300?random=1',
    isLive: true,
    viewers: 1250,
    viewerCount: 1250,
    likes: 890,
    comments: 156,
    startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    duration: 7200,
    tags: ['gaming', 'fun', 'interactive'],
    country: 'US',
    quality: '1080p',
    language: 'en',
    isPublic: true,
    allowComments: true,
    allowGifts: true,
    minLevel: 1,
    maxViewers: 10000,
  },
  {
    id: '2',
    channelName: 'music-channel-2',
    title: 'Music Production Live',
    description: 'Creating beats and making music with the community',
    hostId: 'user_2',
    hostName: 'MusicMaker',
    hostAvatar: 'https://i.pravatar.cc/150?img=2',
    host: {
      id: 'user_2',
      username: 'MusicMaker',
      avatar: 'https://i.pravatar.cc/150?img=2',
      ogLevel: 3,
      followers: 2500
    },
    category: 'music',
    thumbnail: 'https://picsum.photos/400/300?random=2',
    thumb: 'https://picsum.photos/400/300?random=2',
    isLive: true,
    viewers: 450,
    viewerCount: 450,
    likes: 320,
    comments: 89,
    startTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    startedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    duration: 3600,
    tags: ['music', 'production', 'creative'],
    country: 'CA',
    quality: '720p',
    language: 'en',
    isPublic: true,
    allowComments: true,
    allowGifts: true,
    minLevel: 1,
    maxViewers: 5000,
  },
  {
    id: '3',
    channelName: 'art-channel-3',
    title: 'Digital Art Creation',
    description: 'Drawing and painting digitally with viewers',
    hostId: 'user_3',
    hostName: 'ArtistLife',
    hostAvatar: 'https://i.pravatar.cc/150?img=3',
    host: {
      id: 'user_3',
      username: 'ArtistLife',
      avatar: 'https://i.pravatar.cc/150?img=3',
      ogLevel: 1,
      followers: 800
    },
    category: 'art',
    thumbnail: 'https://picsum.photos/400/300?random=3',
    thumb: 'https://picsum.photos/400/300?random=3',
    isLive: true,
    viewers: 780,
    viewerCount: 780,
    likes: 560,
    comments: 234,
    startTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    duration: 1800,
    tags: ['art', 'digital', 'creative'],
    country: 'UK',
    quality: '1080p',
    language: 'en',
    isPublic: true,
    allowComments: true,
    allowGifts: true,
    minLevel: 1,
    maxViewers: 3000,
  },
];

export const useStreamsStore = create<StreamsStore>((set, get) => ({
  // Initial state
  streams: [],
  featuredItems: [],
  continueWatching: [],
  activeFilter: 'all',
  loading: false,
  refreshing: false,
  hasMore: true,
  page: 1,
  checkinLoading: false,

  // Actions
  fetchActiveStreams: async (region?: RegionFilter) => {
    const currentFilter = region || get().activeFilter;
    set({ loading: true, error: undefined });

    try {
      const params = new URLSearchParams({
        region: currentFilter,
        limit: '24',
        page: get().page.toString(),
      });

      const response = await fetch(`${API_BASE}/api/v1/streams?${params}`);
      
      if (!response.ok) {
        console.log('Streams API failed, using mock data');
        // Use mock data as fallback
        set({
          streams: getMockStreams(),
          loading: false,
          hasMore: false,
        });
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        set({
          streams: data.data.streams || [],
          loading: false,
          hasMore: data.data.pagination?.hasMore || false,
        });
      } else {
        console.log('Streams API returned error, using mock data');
        set({
          streams: getMockStreams(),
          loading: false,
          hasMore: false,
        });
      }
    } catch (error) {
      console.error('Failed to fetch streams:', error);
      set({
        streams: getMockStreams(),
        loading: false,
        hasMore: false,
      });
    }
  },

  fetchFeaturedItems: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/events/featured`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        set({ featuredItems: data.data.items || [] });
      }
    } catch (error) {
      console.error('Failed to fetch featured items:', error);
    }
  },

  fetchContinueWatching: async () => {
    try {
      const response = await fetch(`${API_BASE}/api/v1/personal/continue-watching`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        set({ continueWatching: data.data.items || [] });
      }
    } catch (error) {
      console.error('Failed to fetch continue watching:', error);
    }
  },

  claimCheckin: async () => {
    set({ checkinLoading: true });

    try {
      const response = await fetch(`${API_BASE}/api/v1/rewards/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth header here when available
          // 'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        set({
          checkinReward: data.data,
          checkinLoading: false,
        });
      } else {
        throw new Error(data.error || 'Failed to claim check-in');
      }
    } catch (error) {
      console.error('Failed to claim check-in:', error);
      set({
        checkinLoading: false,
        error: error instanceof Error ? error.message : 'Failed to claim check-in',
      });
    }
  },

  setFilter: (filter: RegionFilter) => {
    set({ activeFilter: filter, page: 1 });
    get().fetchActiveStreams(filter);
  },

  refresh: async () => {
    set({ refreshing: true, page: 1 });
    await Promise.all([
      get().fetchActiveStreams(),
      get().fetchFeaturedItems(),
      get().fetchContinueWatching(),
    ]);
    set({ refreshing: false });
  },

  loadMore: async () => {
    const { hasMore, loading, page } = get();
    
    if (!hasMore || loading) return;

    set({ page: page + 1 });
    await get().fetchActiveStreams();
  },

  clearError: () => {
    set({ error: undefined });
  },
}));

import { create } from 'zustand';
import { Stream, FeaturedItem, ContinueWatchingItem, CheckinReward, RegionFilter, HomeState } from '../types/stream';
import { apiClient } from '../lib/api';

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

// Note: API base/prefix handled by apiClient; avoid direct env usage here

// Basic region mapping helpers
const ASIA_COUNTRIES = [
  'NP','IN','PK','BD','LK','BT','CN','JP','KR','SG','MY','TH','ID','PH','VN','MM','KH','LA','TW','HK','MO','BN',
  'AE','SA','IR','IQ','IL','TR','UZ','KZ','KG','TJ','TM','AF','MN','YE','OM','QA','BH','KW','JO','LB','SY','PS','GE','AM','AZ'
];

function mapRegionToQuery(region: RegionFilter): { country?: string; asiaFilter?: boolean } {
  switch (region) {
    case 'nepal':
      return { country: 'NP' };
    case 'asia':
      return { asiaFilter: true };
    case 'global':
    case 'all':
    default:
      return {};
  }
}

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

export const useStreamsStore = create<StreamsStore>((set: any, get: any) => ({
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
      const { country, asiaFilter } = mapRegionToQuery(currentFilter as RegionFilter);
      const page = get().page;

      const res = await apiClient.get('/streams', {
        params: {
          ...(country ? { country } : {}),
          limit: 24,
          page,
        }
      });

      const streamsRaw = res?.data?.streams || res?.data?.data?.streams || [];
      const mapped: Stream[] = streamsRaw.map((s: any) => ({
        id: s.id || s._id,
        channelName: s.agoraChannel || s.channelName || (s.id || s._id),
        hostId: s.host?.id || s.hostId || s.host?._id,
        hostName: s.host?.username,
        hostAvatar: s.host?.avatar,
        host: {
          id: s.host?.id || s.host?._id || s.hostId,
          username: s.host?.username || s.hostName || 'host',
          avatar: s.host?.avatar,
          ogLevel: s.host?.ogLevel,
          followers: s.host?.followers,
        },
        thumb: s.thumbnail || s.thumb || s.image || 'https://picsum.photos/400/300',
        thumbnail: s.thumbnail || s.thumb,
        streamUrl: s.streamUrl,
        viewers: s.currentViewers || s.viewerCount || s.viewers || 0,
        viewerCount: s.currentViewers || s.viewerCount,
        maxViewers: s.maxViewers,
        currentViewers: s.currentViewers,
        country: s.country || s.host?.country || 'NP',
        startedAt: s.startedAt || s.startTime || new Date().toISOString(),
        startTime: s.startTime,
        tags: s.tags || [],
        title: s.title,
        category: s.category,
        description: s.description,
        isLive: s.status ? s.status === 'live' : true,
        duration: s.duration,
        totalLikes: s.totalLikes,
        likes: s.likes,
        comments: s.comments,
        quality: s.quality,
        language: s.language,
        isPublic: s.isPublic,
        allowComments: s.allowComments,
        allowGifts: s.allowGifts,
        minLevel: s.minLevel,
        totalCoins: s.totalCoins,
        data: s,
      }));

      const filtered = asiaFilter
        ? mapped.filter((m) => m.country && ASIA_COUNTRIES.includes(m.country.toUpperCase()))
        : mapped;

      set({
        streams: filtered,
        loading: false,
        hasMore: (res?.data?.pagination?.hasMore || res?.data?.data?.pagination?.hasMore) ?? false,
      });
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
      const res = await apiClient.get('/streams/events/featured');
      const events = res?.events || res?.data?.events || res?.data?.data?.items || [];
      const mapped: FeaturedItem[] = events.map((e: any) => ({
        id: e.id || e._id,
        type: 'live',
        title: e.title,
        subtitle: e.description || '',
        cta: 'Watch',
        image: e.thumbnail || e.image,
        deeplink: e.deeplink || `halobuzz://stream/${e.id || e._id}`,
      }));
      set({ featuredItems: mapped });
    } catch (error) {
      console.error('Failed to fetch featured items:', error);
      try {
        // Fallback to trending streams as banners
        const fallback = await apiClient.get('/streams/trending', { params: { limit: 5 } });
        const items = fallback?.data || fallback?.data?.data || [];
        const mapped: FeaturedItem[] = (items.streams || items).map((s: any) => ({
          id: s.id || s._id,
          type: 'live',
          title: s.title || s.host?.username || 'Live',
          subtitle: s.description || '',
          cta: 'Watch',
          image: s.thumbnail || s.thumb,
          deeplink: `halobuzz://stream/${s.id || s._id}`,
        }));
        set({ featuredItems: mapped });
      } catch (e) {
        // Ignore final failure
      }
    }
  },

  fetchContinueWatching: async () => {
    try {
      const res = await apiClient.get('/streams/personal/continue-watching');
      const content = res?.content || res?.data?.content || res?.data?.data?.items || [];
      const mapped: ContinueWatchingItem[] = content.map((c: any) => ({
        streamId: c.id || c.streamId,
        host: { username: c.hostName || c.host?.username || 'host', avatar: c.host?.avatar },
        thumb: c.thumbnail || c.thumb,
        progress: c.totalDuration ? Math.min(1, (c.watchedDuration || 0) / c.totalDuration) : 0,
        lastWatched: c.lastWatched || new Date().toISOString(),
      }));
      set({ continueWatching: mapped });
    } catch (error) {
      console.error('Failed to fetch continue watching:', error);
      try {
        // Fallback to trending streams as continue-watching
        const fallback = await apiClient.get('/streams/trending', { params: { limit: 8 } });
        const items = fallback?.data || fallback?.data?.data || [];
        const streams = items.streams || items;
        const mapped: ContinueWatchingItem[] = streams.map((s: any) => ({
          streamId: s.id || s._id,
          host: { username: s.host?.username || 'host', avatar: s.host?.avatar },
          thumb: s.thumbnail || s.thumb,
          progress: 0,
          lastWatched: new Date().toISOString(),
        }));
        set({ continueWatching: mapped });
      } catch (e) {
        // Ignore final failure
      }
    }
  },

  claimCheckin: async () => {
    set({ checkinLoading: true });

    try {
      const res = await apiClient.post('/streams/rewards/checkin', {});
      const reward = res?.reward || res?.data || res?.data?.data;
      set({
        checkinReward: reward as CheckinReward,
        checkinLoading: false,
      });
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

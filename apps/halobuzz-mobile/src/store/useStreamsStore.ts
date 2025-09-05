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

      const response = await fetch(`${API_BASE}/api/v1/streams/active?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        set({
          streams: data.data.streams || [],
          loading: false,
          hasMore: data.data.pagination?.hasMore || false,
        });
      } else {
        throw new Error(data.error || 'Failed to fetch streams');
      }
    } catch (error) {
      console.error('Failed to fetch streams:', error);
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch streams',
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

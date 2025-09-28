import { useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PerformanceMonitor } from '@/utils/performanceMonitor';

interface InfiniteScrollConfig<T> {
  fetchFn: (page: number, pageSize: number) => Promise<{ data: T[]; hasMore: boolean; total?: number }>;
  pageSize?: number;
  cacheKey?: string;
  maxCacheSize?: number;
  staleTime?: number; // ms before cache is considered stale
  prefetchPages?: number;
  enableCache?: boolean;
  onError?: (error: any) => void;
}

interface InfiniteScrollState<T> {
  data: T[];
  isLoading: boolean;
  isRefreshing: boolean;
  hasMore: boolean;
  error: any;
  currentPage: number;
  totalItems?: number;
}

// Advanced caching system for infinite scroll data
class InfiniteScrollCache<T> {
  private cache = new Map<string, {
    data: T[];
    timestamp: number;
    pages: number;
    hasMore: boolean;
    totalItems?: number;
  }>();

  private maxSize: number;
  private staleTime: number;

  constructor(maxSize: number = 50, staleTime: number = 300000) { // 5 min default
    this.maxSize = maxSize;
    this.staleTime = staleTime;
  }

  async get(key: string): Promise<{
    data: T[];
    pages: number;
    hasMore: boolean;
    totalItems?: number;
  } | null> {
    // Check memory cache first
    const memoryCache = this.cache.get(key);
    if (memoryCache && Date.now() - memoryCache.timestamp < this.staleTime) {
      return {
        data: memoryCache.data,
        pages: memoryCache.pages,
        hasMore: memoryCache.hasMore,
        totalItems: memoryCache.totalItems,
      };
    }

    // Fallback to AsyncStorage for persistent cache
    try {
      const stored = await AsyncStorage.getItem(`scroll_cache_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Date.now() - parsed.timestamp < this.staleTime) {
          // Update memory cache
          this.cache.set(key, parsed);
          return {
            data: parsed.data,
            pages: parsed.pages,
            hasMore: parsed.hasMore,
            totalItems: parsed.totalItems,
          };
        }
      }
    } catch (error) {
      console.warn('Failed to read from scroll cache:', error);
    }

    return null;
  }

  async set(key: string, data: T[], pages: number, hasMore: boolean, totalItems?: number) {
    const cacheData = {
      data,
      timestamp: Date.now(),
      pages,
      hasMore,
      totalItems,
    };

    // Update memory cache
    this.cache.set(key, cacheData);

    // Enforce size limit
    if (this.cache.size > this.maxSize) {
      const oldestKey = Array.from(this.cache.keys())[0];
      this.cache.delete(oldestKey);
    }

    // Persist to AsyncStorage (non-blocking)
    setTimeout(async () => {
      try {
        await AsyncStorage.setItem(`scroll_cache_${key}`, JSON.stringify(cacheData));
      } catch (error) {
        console.warn('Failed to write to scroll cache:', error);
      }
    }, 0);
  }

  clear(key?: string) {
    if (key) {
      this.cache.delete(key);
      AsyncStorage.removeItem(`scroll_cache_${key}`).catch(() => {});
    } else {
      this.cache.clear();
      // Clear all scroll caches from AsyncStorage
      AsyncStorage.getAllKeys().then(keys => {
        const scrollKeys = keys.filter(k => k.startsWith('scroll_cache_'));
        AsyncStorage.multiRemove(scrollKeys).catch(() => {});
      }).catch(() => {});
    }
  }
}

// Global cache instance
const scrollCache = new InfiniteScrollCache();

export const useInfiniteScroll = <T>({
  fetchFn,
  pageSize = 20,
  cacheKey,
  maxCacheSize = 50,
  staleTime = 300000,
  prefetchPages = 1,
  enableCache = true,
  onError,
}: InfiniteScrollConfig<T>) => {
  const [state, setState] = useState<InfiniteScrollState<T>>({
    data: [],
    isLoading: false,
    isRefreshing: false,
    hasMore: true,
    error: null,
    currentPage: 0,
    totalItems: undefined,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const prefetchControllerRef = useRef<AbortController | null>(null);
  const isInitialized = useRef(false);

  // Initialize cache on mount
  useEffect(() => {
    if (!isInitialized.current && cacheKey && enableCache) {
      isInitialized.current = true;
      loadFromCache();
    }
  }, [cacheKey, enableCache]);

  // Load cached data
  const loadFromCache = useCallback(async () => {
    if (!cacheKey || !enableCache) return;

    PerformanceMonitor.markStart('cache_load');
    const cached = await scrollCache.get(cacheKey);
    PerformanceMonitor.markEnd('cache_load');

    if (cached && cached.data.length > 0) {
      setState(prev => ({
        ...prev,
        data: cached.data,
        currentPage: cached.pages,
        hasMore: cached.hasMore,
        totalItems: cached.totalItems,
      }));
    } else if (!cached || cached.data.length === 0) {
      // No cache or empty cache - load first page
      loadMore();
    }
  }, [cacheKey, enableCache]);

  // Fetch data with caching
  const fetchData = useCallback(async (page: number, isRefresh: boolean = false) => {
    try {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      PerformanceMonitor.markStart(`fetch_page_${page}`);
      const result = await fetchFn(page, pageSize);
      PerformanceMonitor.markEnd(`fetch_page_${page}`);

      return result;
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error(`Failed to fetch page ${page}:`, error);
        if (onError) onError(error);
      }
      throw error;
    }
  }, [fetchFn, pageSize, onError]);

  // Load more items
  const loadMore = useCallback(async () => {
    if (state.isLoading || !state.hasMore) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const nextPage = state.currentPage + 1;
      const result = await fetchData(nextPage);

      setState(prev => {
        const newData = [...prev.data, ...result.data];

        // Cache the updated data
        if (cacheKey && enableCache) {
          scrollCache.set(cacheKey, newData, nextPage, result.hasMore, result.total);
        }

        return {
          ...prev,
          data: newData,
          currentPage: nextPage,
          hasMore: result.hasMore,
          totalItems: result.total,
          isLoading: false,
        };
      });

      // Prefetch next pages if enabled
      if (prefetchPages > 0 && result.hasMore) {
        prefetchNextPages(nextPage + 1, prefetchPages);
      }

    } catch (error) {
      if (error.name !== 'AbortError') {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error,
        }));
      }
    }
  }, [state.isLoading, state.hasMore, state.currentPage, state.data, fetchData, cacheKey, enableCache, prefetchPages]);

  // Refresh (reload from start)
  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, isRefreshing: true, error: null }));

    // Clear cache
    if (cacheKey && enableCache) {
      scrollCache.clear(cacheKey);
    }

    try {
      const result = await fetchData(1, true);

      setState({
        data: result.data,
        currentPage: 1,
        hasMore: result.hasMore,
        totalItems: result.total,
        isLoading: false,
        isRefreshing: false,
        error: null,
      });

      // Cache fresh data
      if (cacheKey && enableCache) {
        scrollCache.set(cacheKey, result.data, 1, result.hasMore, result.total);
      }

    } catch (error) {
      if (error.name !== 'AbortError') {
        setState(prev => ({
          ...prev,
          isRefreshing: false,
          error,
        }));
      }
    }
  }, [fetchData, cacheKey, enableCache]);

  // Prefetch upcoming pages
  const prefetchNextPages = useCallback(async (startPage: number, count: number) => {
    if (!count || count <= 0) return;

    // Cancel previous prefetch
    if (prefetchControllerRef.current) {
      prefetchControllerRef.current.abort();
    }

    prefetchControllerRef.current = new AbortController();

    for (let i = 0; i < count; i++) {
      try {
        const page = startPage + i;
        PerformanceMonitor.markStart(`prefetch_page_${page}`);

        // Non-blocking prefetch with low priority
        setTimeout(async () => {
          try {
            const result = await fetchData(page);
            PerformanceMonitor.markEnd(`prefetch_page_${page}`);

            // Store in cache for future use
            if (cacheKey && enableCache) {
              const cacheKey_prefetch = `${cacheKey}_prefetch_${page}`;
              scrollCache.set(cacheKey_prefetch, result.data, page, result.hasMore, result.total);
            }
          } catch (error) {
            // Ignore prefetch errors
            PerformanceMonitor.markEnd(`prefetch_page_${page}`);
          }
        }, i * 100); // Stagger requests

      } catch (error) {
        // Continue with other pages
      }
    }
  }, [fetchData, cacheKey, enableCache]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (prefetchControllerRef.current) {
        prefetchControllerRef.current.abort();
      }
    };
  }, []);

  return {
    ...state,
    loadMore,
    refresh,
    clearCache: () => scrollCache.clear(cacheKey),
  };
};
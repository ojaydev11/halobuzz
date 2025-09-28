import { useEffect, useRef, useCallback } from 'react';
import { Platform, PanResponder } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { PerformanceMonitor } from '@/utils/performanceMonitor';
import { ScreenPreloader } from '@/components/LazyScreen';

interface NavigationPrefetchConfig {
  enableGesturePrefetch?: boolean;
  enableHoverPrefetch?: boolean;
  prefetchDelay?: number;
  routes?: string[];
}

// Hook for intelligent navigation prefetching
export const useNavigationPrefetch = (config: NavigationPrefetchConfig = {}) => {
  const {
    enableGesturePrefetch = true,
    enableHoverPrefetch = Platform.OS === 'web',
    prefetchDelay = 150,
    routes = []
  } = config;

  const router = useRouter();
  const pathname = usePathname();
  const prefetchCache = useRef(new Set<string>());
  const gestureStartTime = useRef<number>(0);

  // Prefetch a route with caching
  const prefetchRoute = useCallback((route: string) => {
    if (prefetchCache.current.has(route) || route === pathname) {
      return;
    }

    prefetchCache.current.add(route);
    PerformanceMonitor.markStart(`prefetch_${route}`);

    // Route-specific prefetching logic
    const routePreloadMap: { [key: string]: () => Promise<any> } = {
      '/profile': () => import('@/screens/ProfileScreen'),
      '/games': () => import('@/screens/GamesScreen'),
      '/live': () => import('@/screens/LiveScreen'),
      '/search': () => import('@/screens/SearchScreen'),
      '/messages': () => import('@/screens/MessagesScreen'),
    };

    const preloadFn = routePreloadMap[route];
    if (preloadFn) {
      preloadFn()
        .then(() => {
          PerformanceMonitor.markEnd(`prefetch_${route}`);
        })
        .catch(() => {
          // Remove from cache on failure for retry
          prefetchCache.current.delete(route);
        });
    }
  }, [pathname]);

  // Smart route prediction based on current location
  const predictNextRoutes = useCallback((): string[] => {
    const routePredictions: { [key: string]: string[] } = {
      '/(tabs)': ['/profile', '/games', '/search'],
      '/(tabs)/index': ['/live', '/games', '/profile'],
      '/(tabs)/games': ['/games/leaderboard', '/profile'],
      '/(tabs)/live': ['/games', '/profile'],
      '/(tabs)/profile': ['/settings', '/wallet'],
    };

    return routePredictions[pathname] || [];
  }, [pathname]);

  // Gesture-based prefetching (swipe detection)
  const createGesturePrefetch = useCallback(() => {
    if (!enableGesturePrefetch) return null;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
      },
      onPanResponderGrant: () => {
        gestureStartTime.current = Date.now();
      },
      onPanResponderMove: (_, gestureState) => {
        const elapsed = Date.now() - gestureStartTime.current;

        // If gesture is sustained for prefetchDelay, start prefetching
        if (elapsed > prefetchDelay) {
          // Predict direction and prefetch accordingly
          if (Math.abs(gestureState.dx) > Math.abs(gestureState.dy)) {
            // Horizontal swipe - tab navigation
            const predictedRoutes = predictNextRoutes();
            predictedRoutes.forEach(route => {
              setTimeout(() => prefetchRoute(route), 50);
            });
          }
        }
      },
      onPanResponderRelease: () => {
        gestureStartTime.current = 0;
      },
    });
  }, [enableGesturePrefetch, prefetchDelay, predictNextRoutes, prefetchRoute]);

  // Initialize prefetching on mount
  useEffect(() => {
    // Prefetch predicted routes immediately
    const nextRoutes = predictNextRoutes();
    nextRoutes.forEach((route, index) => {
      setTimeout(() => {
        prefetchRoute(route);
      }, index * 100); // Stagger prefetch requests
    });

    // Prefetch critical screens
    setTimeout(() => {
      ScreenPreloader.preloadCriticalScreens();
    }, 1000);
  }, [pathname, predictNextRoutes, prefetchRoute]);

  // Clear cache when route changes to prevent memory bloat
  useEffect(() => {
    return () => {
      prefetchCache.current.clear();
    };
  }, [pathname]);

  return {
    prefetchRoute,
    gesturePrefetch: createGesturePrefetch(),
    prefetchedRoutes: Array.from(prefetchCache.current),
  };
};

// Hook for tab-specific prefetching
export const useTabPrefetch = () => {
  const { prefetchRoute } = useNavigationPrefetch();
  const pathname = usePathname();

  const prefetchTab = useCallback((tabName: string) => {
    const tabRoute = `/(tabs)/${tabName}`;
    prefetchRoute(tabRoute);
  }, [prefetchRoute]);

  // Prefetch adjacent tabs based on current tab
  useEffect(() => {
    const currentTab = pathname.split('/').pop();
    const tabOrder = ['index', 'reels', 'live', 'games', 'search', 'messages-section', 'profile'];
    const currentIndex = tabOrder.indexOf(currentTab || '');

    if (currentIndex >= 0) {
      // Prefetch adjacent tabs
      if (currentIndex > 0) {
        setTimeout(() => prefetchTab(tabOrder[currentIndex - 1]), 200);
      }
      if (currentIndex < tabOrder.length - 1) {
        setTimeout(() => prefetchTab(tabOrder[currentIndex + 1]), 400);
      }
    }
  }, [pathname, prefetchTab]);

  return { prefetchTab };
};
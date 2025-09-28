import React, { Suspense } from 'react';
import { View, StyleSheet } from 'react-native';
import { LoadingSpinner } from './LoadingSpinner';
import { PerformanceMonitor } from '@/utils/performanceMonitor';

interface LazyScreenProps {
  componentName: string;
  children: React.ComponentType<any>;
  fallback?: React.ComponentType;
  preloadDelay?: number;
}

// HOC for lazy screen loading with preload capability
export const createLazyScreen = (
  importFn: () => Promise<{ default: React.ComponentType<any> }>,
  componentName: string,
  preloadDelay: number = 0
) => {
  // Create lazy component
  const LazyComponent = React.lazy(() => {
    PerformanceMonitor.markStart(`screen_load_${componentName}`);
    return importFn().then(module => {
      PerformanceMonitor.markEnd(`screen_load_${componentName}`);
      return module;
    });
  });

  // Preload function for prefetching
  let preloadPromise: Promise<any> | null = null;
  const preload = () => {
    if (!preloadPromise) {
      preloadPromise = importFn();
    }
    return preloadPromise;
  };

  // Auto-preload with delay if specified
  if (preloadDelay > 0) {
    setTimeout(() => {
      preload();
    }, preloadDelay);
  }

  // Screen wrapper component
  const ScreenWrapper: React.FC<any> = (props) => {
    return (
      <Suspense fallback={<LazyScreenFallback screenName={componentName} />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };

  ScreenWrapper.displayName = `LazyScreen(${componentName})`;
  ScreenWrapper.preload = preload;

  return ScreenWrapper;
};

// Optimized fallback component with shimmer
const LazyScreenFallback: React.FC<{ screenName: string }> = React.memo(({ screenName }) => {
  React.useEffect(() => {
    PerformanceMonitor.markStart(`screen_transition_${screenName}`);
    return () => {
      PerformanceMonitor.markEnd(`screen_transition_${screenName}`);
    };
  }, [screenName]);

  return (
    <View style={styles.fallbackContainer}>
      <LoadingSpinner useShimmer />
    </View>
  );
});

// Screen preloader utility
export class ScreenPreloader {
  private static preloadedScreens = new Set<string>();

  static preloadScreen(screenName: string, importFn: () => Promise<any>) {
    if (this.preloadedScreens.has(screenName)) {
      return;
    }

    this.preloadedScreens.add(screenName);

    // Use requestIdleCallback for non-blocking preload
    if ('requestIdleCallback' in global) {
      (global as any).requestIdleCallback(() => {
        importFn().catch(() => {
          // Remove from cache on failure so it can be retried
          this.preloadedScreens.delete(screenName);
        });
      });
    } else {
      setTimeout(() => {
        importFn().catch(() => {
          this.preloadedScreens.delete(screenName);
        });
      }, 100);
    }
  }

  static preloadCriticalScreens() {
    // Preload screens likely to be visited first
    this.preloadScreen('profile', () => import('@/screens/ProfileScreen'));
    this.preloadScreen('search', () => import('@/screens/SearchScreen'));
    this.preloadScreen('games', () => import('@/screens/GamesScreen'));
  }
}

const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    backgroundColor: '#0B0B10',
  },
});

LazyScreenFallback.displayName = 'LazyScreenFallback';
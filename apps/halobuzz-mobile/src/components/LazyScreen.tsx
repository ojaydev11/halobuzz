import React, { Suspense, lazy, ComponentType } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { PerformanceMonitor } from '@/utils/performanceMonitor';

// Loading fallback component
const ScreenLoadingFallback: React.FC<{ screenName?: string }> = ({ screenName }) => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#007AFF" />
  </View>
);

// Lazy loading wrapper with performance tracking
export const createLazyScreen = <P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  screenName: string
): ComponentType<P> => {
  const LazyComponent = lazy(importFn);

  const WrappedComponent: ComponentType<P> = React.memo((props: P) => {
    React.useEffect(() => {
      PerformanceMonitor.markStart(`screen_load_${screenName}`);
      
      return () => {
        PerformanceMonitor.markEnd(`screen_load_${screenName}`);
      };
    }, []);

    return (
      <Suspense fallback={<ScreenLoadingFallback screenName={screenName} />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  });

  WrappedComponent.displayName = `LazyScreen(${screenName})`;
  return WrappedComponent;
};

// Screen preloader utility
export class ScreenPreloader {
  private static preloadedScreens = new Set<string>();
  private static preloadPromises = new Map<string, Promise<any>>();

  // Preload a specific screen
  static async preloadScreen(screenName: string, importFn: () => Promise<any>): Promise<void> {
    if (this.preloadedScreens.has(screenName)) {
      return;
    }

    if (this.preloadPromises.has(screenName)) {
      return this.preloadPromises.get(screenName);
    }

    const promise = importFn()
      .then(() => {
        this.preloadedScreens.add(screenName);
        PerformanceMonitor.markEnd(`preload_${screenName}`);
      })
      .catch((error) => {
        console.warn(`Failed to preload screen ${screenName}:`, error);
        this.preloadPromises.delete(screenName);
      });

    this.preloadPromises.set(screenName, promise);
    PerformanceMonitor.markStart(`preload_${screenName}`);
    
    return promise;
  }

  // Preload critical screens that are likely to be accessed
  static async preloadCriticalScreens(): Promise<void> {
    const criticalScreens = [
      { name: 'ProfileScreen', importFn: () => import('@/screens/ProfileScreen') },
      { name: 'GamesScreen', importFn: () => import('@/screens/GamesScreen') },
      { name: 'LiveScreen', importFn: () => import('@/screens/LiveScreen') },
      { name: 'SearchScreen', importFn: () => import('@/components/SearchScreen') },
    ];

    // Preload screens with staggered timing to avoid blocking
    for (let i = 0; i < criticalScreens.length; i++) {
      const { name, importFn } = criticalScreens[i];
      setTimeout(() => {
        this.preloadScreen(name, importFn);
      }, i * 200); // 200ms stagger
    }
  }

  // Check if a screen is already preloaded
  static isPreloaded(screenName: string): boolean {
    return this.preloadedScreens.has(screenName);
  }

  // Clear preload cache (useful for memory management)
  static clearCache(): void {
    this.preloadedScreens.clear();
    this.preloadPromises.clear();
  }
}

// Higher-order component for lazy screen loading
export const withLazyLoading = <P extends object>(
  Component: ComponentType<P>,
  screenName: string
): ComponentType<P> => {
  return createLazyScreen(() => Promise.resolve({ default: Component }), screenName);
};

// Hook for screen preloading
export const useScreenPreload = (screenName: string, importFn: () => Promise<any>) => {
  React.useEffect(() => {
    ScreenPreloader.preloadScreen(screenName, importFn);
  }, [screenName, importFn]);
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});
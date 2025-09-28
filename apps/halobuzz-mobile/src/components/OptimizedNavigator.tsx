import React, { useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { PerformanceMonitor } from '@/utils/performanceMonitor';
import { useNavigationPrefetch, useTabPrefetch } from '@/hooks/useNavigationPrefetch';

interface NavigationConfig {
  enableSharedElementTransitions?: boolean;
  transitionTimeout?: number;
  enableGestureNavigation?: boolean;
}

// Optimized navigation wrapper with performance tracking
export const OptimizedNavigator: React.FC<{
  children: React.ReactNode;
  config?: NavigationConfig;
}> = React.memo(({ children, config = {} }) => {
  const {
    enableSharedElementTransitions = true,
    transitionTimeout = 300,
    enableGestureNavigation = true,
  } = config;

  const { gesturePrefetch } = useNavigationPrefetch({
    enableGesturePrefetch: enableGestureNavigation,
    prefetchDelay: 100,
  });

  useTabPrefetch();

  const navigationState = useRef({
    isTransitioning: false,
    lastTransition: 0,
  });

  // Optimize navigation state updates
  const handleNavigationStateChange = useCallback((state: any) => {
    const now = Date.now();
    const timeSinceLastTransition = now - navigationState.current.lastTransition;

    // Throttle rapid navigation changes
    if (timeSinceLastTransition < 100) {
      return;
    }

    navigationState.current.lastTransition = now;

    // Track navigation performance
    if (state?.routes) {
      const currentRoute = state.routes[state.index];
      if (currentRoute) {
        PerformanceMonitor.markStart(`navigate_to_${currentRoute.name}`);

        setTimeout(() => {
          PerformanceMonitor.markEnd(`navigate_to_${currentRoute.name}`);
        }, transitionTimeout);
      }
    }
  }, [transitionTimeout]);

  return (
    <div
      {...(Platform.OS === 'web' ? {} : gesturePrefetch?.panHandlers)}
      style={{ flex: 1 }}
    >
      {children}
    </div>
  );
});

// Screen transition optimization configurations
export const ScreenTransitionConfigs = {
  // Fast transitions for tab navigation (60fps target)
  fastTransition: {
    transitionSpec: {
      open: {
        animation: 'timing',
        config: {
          duration: 150,
          useNativeDriver: true,
        },
      },
      close: {
        animation: 'timing',
        config: {
          duration: 100,
          useNativeDriver: true,
        },
      },
    },
  },

  // Smooth transitions for modal screens
  modalTransition: {
    transitionSpec: {
      open: {
        animation: 'spring',
        config: {
          stiffness: 1000,
          damping: 500,
          mass: 3,
          overshootClamping: true,
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 0.01,
          useNativeDriver: true,
        },
      },
      close: {
        animation: 'timing',
        config: {
          duration: 200,
          useNativeDriver: true,
        },
      },
    },
  },

  // Instant transitions for performance-critical screens
  instantTransition: {
    transitionSpec: {
      open: {
        animation: 'timing',
        config: {
          duration: 0,
          useNativeDriver: true,
        },
      },
      close: {
        animation: 'timing',
        config: {
          duration: 0,
          useNativeDriver: true,
        },
      },
    },
  },
};

// Performance-aware screen options
export const createPerformantScreenOptions = (screenName: string) => ({
  // Use native driver for all animations
  animationEnabled: true,
  animationTypeForReplace: 'push' as const,

  // Optimize header for performance
  headerShown: false, // Let screens handle their own headers

  // Lazy rendering optimizations
  lazy: true,
  lazyPreloadDistance: 0,

  // Gesture optimizations
  gestureEnabled: true,
  gestureDirection: 'horizontal' as const,

  // Performance budget enforcement
  transitionSpec: {
    open: {
      animation: 'timing',
      config: {
        duration: 200, // Within 200ms budget
        useNativeDriver: true,
      },
    },
    close: {
      animation: 'timing',
      config: {
        duration: 150,
        useNativeDriver: true,
      },
    },
  },

  // Add performance tracking
  listeners: {
    transitionStart: () => {
      PerformanceMonitor.markStart(`screen_transition_${screenName}`);
    },
    transitionEnd: () => {
      PerformanceMonitor.markEnd(`screen_transition_${screenName}`);
    },
  },
});

OptimizedNavigator.displayName = 'OptimizedNavigator';
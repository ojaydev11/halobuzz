import { Platform } from 'react-native';
import { PerformanceMonitor } from '@/utils/performanceMonitor';

// Lazy service initialization with idle callback fallback
export const deferToIdle = (callback: () => void) => {
  if (Platform.OS === 'web' && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(callback, { timeout: 2000 });
  } else {
    // Use setTimeout for mobile platforms
    setTimeout(callback, 100);
  }
};

// Lazy analytics service
let analyticsService: any = null;
export const initAnalyticsLazy = () => {
  if (!analyticsService) {
    deferToIdle(async () => {
      PerformanceMonitor.markStart('analytics_init');
      const { default: analytics } = await import('@/services/analytics');
      analyticsService = analytics;
      analytics.init();
      PerformanceMonitor.markEnd('analytics_init');
    });
  }
  return analyticsService;
};

// Lazy heavy SDK initialization (Expo Go Compatible)
export const initHeavySDKs = () => {
  deferToIdle(async () => {
    // Skip heavy SDKs for Expo Go compatibility
    console.log('Mock: Skipping heavy SDK initialization for Expo Go compatibility');
    
    // Skip all heavy SDKs for production optimization
    console.log('Mock: All heavy SDKs skipped for production optimization');
  });
};

// Feature flag for low-spec devices
export const isLowSpecDevice = () => {
  // Simple heuristic - can be enhanced with device detection
  return Platform.OS === 'android';
};

export const conditionallyLoadFeatures = () => {
  if (!isLowSpecDevice()) {
    deferToIdle(() => {
      // Load premium features only on capable devices
      import('@/services/premiumFeatures');
    });
  }
};
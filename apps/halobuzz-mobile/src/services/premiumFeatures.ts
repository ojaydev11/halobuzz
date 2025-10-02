/**
 * Premium Features Service
 * Handles advanced features for high-end devices
 * Only loaded on capable devices to optimize performance
 */

import { Platform } from 'react-native';
import { PerformanceMonitor } from '@/utils/performanceMonitor';

interface PremiumFeature {
  id: string;
  name: string;
  enabled: boolean;
  requiredCapability?: 'high-memory' | 'high-performance' | 'modern-device';
}

class PremiumFeaturesService {
  private features: Map<string, PremiumFeature> = new Map();
  private initialized = false;

  constructor() {
    this.initializeFeatures();
  }

  private initializeFeatures() {
    if (this.initialized) return;

    PerformanceMonitor.markStart('premium_features_init');

    // Define premium features
    const premiumFeatures: PremiumFeature[] = [
      {
        id: 'advanced_animations',
        name: 'Advanced Animations',
        enabled: true,
        requiredCapability: 'high-performance'
      },
      {
        id: 'high_quality_streaming',
        name: 'High Quality Streaming',
        enabled: true,
        requiredCapability: 'high-memory'
      },
      {
        id: 'ai_recommendations',
        name: 'AI-Powered Recommendations',
        enabled: true,
        requiredCapability: 'modern-device'
      },
      {
        id: 'advanced_graphics',
        name: 'Advanced Graphics',
        enabled: Platform.OS === 'ios' || Platform.Version >= 29, // Android 10+
        requiredCapability: 'high-performance'
      },
      {
        id: 'background_sync',
        name: 'Background Sync',
        enabled: true
      },
      {
        id: 'haptic_feedback',
        name: 'Haptic Feedback',
        enabled: true
      },
      {
        id: 'ar_features',
        name: 'Augmented Reality',
        enabled: false, // Disabled by default
        requiredCapability: 'modern-device'
      },
      {
        id: 'live_filters',
        name: 'Live Video Filters',
        enabled: true,
        requiredCapability: 'high-performance'
      }
    ];

    // Store features
    premiumFeatures.forEach(feature => {
      this.features.set(feature.id, feature);
    });

    this.initialized = true;
    PerformanceMonitor.markEnd('premium_features_init');

    console.log('[PremiumFeatures] Initialized with', this.features.size, 'features');
  }

  /**
   * Check if a premium feature is available
   */
  isFeatureEnabled(featureId: string): boolean {
    const feature = this.features.get(featureId);
    return feature?.enabled ?? false;
  }

  /**
   * Enable a premium feature
   */
  enableFeature(featureId: string): boolean {
    const feature = this.features.get(featureId);
    if (feature) {
      feature.enabled = true;
      this.features.set(featureId, feature);
      return true;
    }
    return false;
  }

  /**
   * Disable a premium feature
   */
  disableFeature(featureId: string): boolean {
    const feature = this.features.get(featureId);
    if (feature) {
      feature.enabled = false;
      this.features.set(featureId, feature);
      return true;
    }
    return false;
  }

  /**
   * Get all available premium features
   */
  getAllFeatures(): PremiumFeature[] {
    return Array.from(this.features.values());
  }

  /**
   * Get all enabled premium features
   */
  getEnabledFeatures(): PremiumFeature[] {
    return Array.from(this.features.values()).filter(f => f.enabled);
  }

  /**
   * Preload premium feature assets
   */
  async preloadAssets(): Promise<void> {
    try {
      PerformanceMonitor.markStart('premium_assets_preload');
      
      // Preload animations
      if (this.isFeatureEnabled('advanced_animations')) {
        // Preload animation libraries
        await import('@/animations/advanced');
      }

      // Preload AR features
      if (this.isFeatureEnabled('ar_features')) {
        // Preload AR libraries
        console.log('[PremiumFeatures] AR features ready');
      }

      PerformanceMonitor.markEnd('premium_assets_preload');
    } catch (error) {
      console.error('[PremiumFeatures] Failed to preload assets:', error);
    }
  }

  /**
   * Check device capabilities
   */
  checkDeviceCapabilities(): {
    highPerformance: boolean;
    highMemory: boolean;
    modernDevice: boolean;
  } {
    const isModernAndroid = Platform.OS === 'android' && Platform.Version >= 29;
    const isModernIOS = Platform.OS === 'ios' && parseInt(Platform.Version as string) >= 14;

    return {
      highPerformance: Platform.OS === 'ios' || isModernAndroid,
      highMemory: Platform.OS === 'ios' || isModernAndroid,
      modernDevice: isModernIOS || isModernAndroid
    };
  }

  /**
   * Auto-configure features based on device capabilities
   */
  autoConfigureFeatures(): void {
    const capabilities = this.checkDeviceCapabilities();

    this.features.forEach((feature, id) => {
      if (feature.requiredCapability) {
        const capabilityKey = feature.requiredCapability.replace(/-/g, '') as 
          'highPerformance' | 'highMemory' | 'modernDevice';
        
        const isCapable = capabilities[capabilityKey as keyof typeof capabilities];
        
        if (!isCapable && feature.enabled) {
          console.log(`[PremiumFeatures] Disabling ${feature.name} due to device limitations`);
          this.disableFeature(id);
        }
      }
    });
  }
}

// Singleton instance
const premiumFeaturesService = new PremiumFeaturesService();

export default premiumFeaturesService;
export { PremiumFeaturesService, type PremiumFeature };







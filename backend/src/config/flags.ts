/**
 * Feature flags configuration
 * Controls feature rollout and A/B testing
 */

export const featureFlags = {
  // Core Features
  AI_MODERATION: process.env.FEATURE_AI_MODERATION === 'true',
  GIFTING: process.env.FEATURE_GIFTING === 'true',
  REELS: process.env.FEATURE_REELS === 'true',
  OG_MEMBERSHIP: process.env.FEATURE_OG_MEMBERSHIP === 'true',
  MESSAGING: process.env.FEATURE_MESSAGING === 'true',
  GAMES: process.env.FEATURE_GAMES === 'true',
  LINKCAST: process.env.FEATURE_LINKCAST === 'true',
  
  // Payment Features
  ESEWA_ENABLED: process.env.ESEWA_ENABLED !== 'false',
  KHALTI_ENABLED: process.env.KHALTI_ENABLED !== 'false',
  STRIPE_ENABLED: process.env.STRIPE_ENABLED !== 'false',
  
  // Stream Features
  AUDIO_ONLY_STREAMS: true,
  ANONYMOUS_STREAMS: true,
  PRIVATE_STREAMS: true,
  STREAM_RECORDING: process.env.STREAM_RECORDING === 'true',
  
  // Social Features
  FOLLOW_SYSTEM: true,
  THRONE_SYSTEM: true,
  BLESSING_MODE: false,
  REVERSE_GIFT_CHALLENGE: false,
  
  // Advanced Features
  NFT_GIFTS: false,
  CREATOR_COINS: false,
  DAO_GOVERNANCE: false,
  SUBSCRIPTION_TIERS: false,
  
  // Security Features
  KYC_REQUIRED_FOR_WITHDRAWAL: true,
  AGE_VERIFICATION: true,
  DEVICE_BINDING: true,
  TWO_FACTOR_AUTH: true,
  
  // Performance Features
  CDN_ENABLED: process.env.CDN_URL ? true : false,
  REDIS_CACHE: true,
  WEBSOCKET_CLUSTERING: false,
  
  // Monitoring
  PROMETHEUS_METRICS: process.env.PROMETHEUS_ENABLED === 'true',
  SENTRY_LOGGING: process.env.SENTRY_DSN ? true : false,
  
  // Development
  SWAGGER_DOCS: process.env.ENABLE_SWAGGER === 'true',
  GRAPHQL_PLAYGROUND: process.env.ENABLE_GRAPHQL_PLAYGROUND === 'true',
  DEBUG_MODE: process.env.DEBUG === 'true'
};

/**
 * Get feature flag value
 */
export function isFeatureEnabled(feature: keyof typeof featureFlags): boolean {
  return featureFlags[feature] ?? false;
}

/**
 * Check multiple features at once
 */
export function areFeaturesEnabled(...features: (keyof typeof featureFlags)[]): boolean {
  return features.every(feature => isFeatureEnabled(feature));
}

/**
 * Get all enabled features
 */
export function getEnabledFeatures(): string[] {
  return Object.entries(featureFlags)
    .filter(([_, enabled]) => enabled)
    .map(([feature]) => feature);
}

/**
 * Feature flag middleware
 */
export function requireFeature(feature: keyof typeof featureFlags) {
  return (req: any, res: any, next: any) => {
    if (!isFeatureEnabled(feature)) {
      return res.status(403).json({
        success: false,
        error: `Feature ${feature} is not enabled`
      });
    }
    next();
  };
}
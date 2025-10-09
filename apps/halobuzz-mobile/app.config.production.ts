import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'HaloBuzz',
  slug: 'halobuzz-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#000000'
  },
  assetBundlePatterns: [
    '**/*'
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.halobuzz.mobile'
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#000000'
    },
    package: 'com.halobuzz.mobile'
  },
  web: {
    favicon: './assets/favicon.png'
  },
  scheme: 'halobuzz',
  extra: {
    // Production backend on Northflank
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || "https://p01--halo-api--6jbmvhzxwv4y.code.run",
    apiPrefix: "/api/v1",
    wsUrl: process.env.EXPO_PUBLIC_WS_URL || "wss://p01--halo-api--6jbmvhzxwv4y.code.run",
    environment: "production",
    eas: {
      projectId: "halobuzz-mobile-project"
    }
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-font'
  ],
  experiments: {
    typedRoutes: true
  }
});


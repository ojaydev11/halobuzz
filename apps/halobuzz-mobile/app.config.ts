import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "HaloBuzz - Global Gaming Platform",
  slug: "halobuzz-mobile",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "dark",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#0B0B10"
  },
  description: "HaloBuzz - Advanced Gaming Platform with Live Streaming, AI Opponents, and Social Features",
  assetBundlePatterns: [
    "**/*"
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.halobuzz.app",
    buildNumber: "1",
    infoPlist: {
      NSCameraUsageDescription: "HaloBuzz needs camera access for live streaming and profile pictures",
      NSMicrophoneUsageDescription: "HaloBuzz needs microphone access for live streaming and voice chat",
      NSPhotoLibraryUsageDescription: "HaloBuzz needs photo library access for profile pictures and content sharing"
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#0B0B10"
    },
    package: "com.halobuzz.app",
    versionCode: 1,
    permissions: [
      "android.permission.CAMERA",
      "android.permission.RECORD_AUDIO",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.INTERNET",
      "android.permission.ACCESS_NETWORK_STATE"
    ]
  },
  web: {
    favicon: "./assets/favicon.png"
  },
  scheme: "halobuzz",
  extra: {
    apiBaseUrl: "https://halo-api-production.up.railway.app",
    apiPrefix: "/api/v1",
    eas: {
      projectId: "halobuzz-mobile-project"
    }
  },
  plugins: [
    "expo-router",
    "expo-font",
    [
      "expo-build-properties",
      {
        ios: {
          deploymentTarget: "15.1"
        },
        android: {
          compileSdkVersion: 34,
          targetSdkVersion: 34,
          buildToolsVersion: "34.0.0"
        }
      }
    ]
  ],
  updates: {
    enabled: true,
    checkAutomatically: "ON_LOAD",
    fallbackToCacheTimeout: 0
  },
  runtimeVersion: {
    policy: "appVersion"
  }
});
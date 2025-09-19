import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "HaloBuzz",
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
  description: "HaloBuzz - Live streaming platform for creators and viewers",
  keywords: ["live streaming", "social media", "content creation", "entertainment"],
  assetBundlePatterns: [
    "**/*"
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: process.env.IOS_BUNDLE_ID || "com.halobuzz.app",
    buildNumber: "1",
    infoPlist: {
      NSCameraUsageDescription: "Camera access is required for live streaming and content creation.",
      NSMicrophoneUsageDescription: "Microphone access is required for live audio and voice features.",
      NSPhotoLibraryUsageDescription: "Photo library access is required to select profile pictures and share content.",
      NSLocationWhenInUseUsageDescription: "Location access helps you discover local streams and events.",
      NSContactsUsageDescription: "Contact access helps you find friends who are already on HaloBuzz.",
      ITSAppUsesNonExemptEncryption: false,
      UIBackgroundModes: ["audio", "voip"],
      NSAppTransportSecurity: {
        NSAllowsArbitraryLoads: false,
        NSExceptionDomains: {
          "halo-api-production.up.railway.app": {
            NSExceptionAllowsInsecureHTTPLoads: false,
            NSExceptionMinimumTLSVersion: "TLSv1.2",
            NSIncludesSubdomains: true
          }
        }
      }
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
      "android.permission.INTERNET",
      "android.permission.ACCESS_NETWORK_STATE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
      "android.permission.READ_CONTACTS",
      "android.permission.WAKE_LOCK",
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.VIBRATE"
    ],
    intentFilters: [
      {
        action: "VIEW",
        data: [
          {
            scheme: "halobuzz"
          }
        ],
        category: ["BROWSABLE", "DEFAULT"]
      }
    ]
  },
  web: {
    favicon: "./assets/favicon.png"
  },
  scheme: "halobuzz",
  extra: {
    // Expo public env var (preferred for OTA updates)
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || "https://halo-api-production.up.railway.app",
    // Fallback for non-OTA dev builds
    apiBase: process.env.HALOBUZZ_API_BASE || "https://halo-api-production.up.railway.app",
    // API path prefix (e.g., /api, /v1, etc.)
    apiPrefix: process.env.EXPO_PUBLIC_API_PREFIX || process.env.API_PREFIX || "/api/v1",
    agoraAppId: process.env.AGORA_APP_ID || "",
    paymentsEnabled: process.env.PAYMENTS_ENABLED === "true",
    eas: {
      projectId: "5c8d3620-68bb-4fd8-94c3-6575c9c218bb"
    }
  },
  plugins: [
    "expo-router",
    "expo-font"
  ]
});

import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "HaloBuzz",
  slug: "halobuzz-mobile",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff"
  },
  assetBundlePatterns: [
    "**/*"
  ],
  ios: {
    supportsTablet: true,
    bundleIdentifier: process.env.IOS_BUNDLE_ID || "com.halobuzz.app",
    infoPlist: {
      NSCameraUsageDescription: "Camera access is required for live streaming.",
      NSMicrophoneUsageDescription: "Microphone access is required for live audio.",
      NSPhotoLibraryUsageDescription: "Photo library access is required to select profile pictures.",
      ITSAppUsesNonExemptEncryption: false
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff"
    },
    package: "com.halobuzz.app",
    versionCode: 1,
    permissions: [
      "android.permission.CAMERA",
      "android.permission.RECORD_AUDIO",
      "android.permission.INTERNET",
      "android.permission.ACCESS_NETWORK_STATE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.READ_EXTERNAL_STORAGE"
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
    apiBase: process.env.HALOBUZZ_API_BASE || "https://halobuzz-api-proxy.ojayshah123.workers.dev",
    agoraAppId: process.env.AGORA_APP_ID || "",
    paymentsEnabled: process.env.PAYMENTS_ENABLED === "true",
    eas: {
      projectId: "5c8d3620-68bb-4fd8-94c3-6575c9c218bb"
    }
  },
  plugins: [
    "expo-router"
  ]
});

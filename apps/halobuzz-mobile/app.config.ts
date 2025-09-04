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
      NSPhotoLibraryUsageDescription: "Photo library access is required to select profile pictures."
    }
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff"
    },
    package: "com.halobuzz.app",
    permissions: [
      "android.permission.CAMERA",
      "android.permission.RECORD_AUDIO",
      "android.permission.INTERNET",
      "android.permission.ACCESS_NETWORK_STATE"
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
      projectId: process.env.EXPO_PROJECT_ID || ""
    }
  },
  plugins: [
    "expo-router",
    [
      "expo-build-properties",
      {
        ios: {
          deploymentTarget: "13.4"
        }
      }
    ]
  ]
});

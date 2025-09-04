# HaloBuzz Mobile App

A production-grade Expo React Native app for HaloBuzz live streaming platform, built for iOS with EAS Build support.

## Features

- 🔐 **Authentication**: Login/Register with email, username, or phone
- 📱 **Live Streaming**: Agora-powered live streaming with camera/mic controls
- 🎯 **Discover**: Browse and discover live streams
- 👤 **Profile**: User profile management
- 🎨 **Modern UI**: Clean, dark-themed interface
- 📦 **iOS Build**: EAS Cloud Build for .ipa generation
- 🔧 **TypeScript**: Fully typed codebase

## Prerequisites

### Required Software
- **Node.js** 18+ (Download from [nodejs.org](https://nodejs.org/))
- **Git** (Download from [git-scm.com](https://git-scm.com/))
- **Expo CLI**: `npm install -g expo-cli`
- **EAS CLI**: `npm install -g eas-cli`
- **Expo Account** (Free at [expo.dev](https://expo.dev))

### Required Accounts
- **Expo Account**: Sign up at [expo.dev](https://expo.dev) (free)
- **Apple ID**: Free Apple ID works for 7-day sideloading
- **Agora Account**: Get App ID from [agora.io](https://agora.io) (free tier available)

## Quick Start (Windows → iOS .ipa)

### 1. Install Dependencies

```bash
# Install global CLI tools
npm install -g expo-cli eas-cli

# Install project dependencies
cd apps/halobuzz-mobile
npm install
```

### 2. Environment Setup

Create `.env` file in the project root:

```bash
# Copy the example file
cp env.example .env
```

Edit `.env` with your values:

```env
# API Configuration
HALOBUZZ_API_BASE=https://halobuzz-api-proxy.ojayshah123.workers.dev

# Agora Configuration (Get from agora.io)
AGORA_APP_ID=YOUR_AGORA_APP_ID

# iOS Configuration
IOS_BUNDLE_ID=com.halobuzz.app

# Feature Flags
PAYMENTS_ENABLED=false

# Expo Configuration (Get from expo.dev)
EXPO_PROJECT_ID=your-expo-project-id
```

### 3. Build iOS .ipa

```bash
# From project root
npm run mobile:build:ios

# Or from mobile directory
cd apps/halobuzz-mobile
npx eas build -p ios --profile preview
```

**Follow the prompts:**
1. Log into your Expo account
2. Log into your Apple ID (free account works)
3. Wait for EAS to build your app (5-10 minutes)
4. Copy the download URL when complete

### 4. Sideload to iPhone

#### Option A: AltStore (Recommended)
1. Install **AltServer** on Windows from [altstore.io](https://altstore.io)
2. Install **AltStore** on iPhone via AltServer
3. Download the .ipa file from EAS
4. Open AltStore → My Apps → + → Select .ipa file
5. Sign with your Apple ID (7-day validity)

#### Option B: Sideloadly
1. Download **Sideloadly** from [sideloadly.io](https://sideloadly.io)
2. Connect iPhone via USB
3. Open Sideloadly → Select .ipa → Sign with Apple ID
4. Install to iPhone

### 5. Trust Developer Profile

On iPhone:
1. Go to **Settings** → **General** → **VPN & Device Management**
2. Find your Apple ID under **Developer App**
3. Tap **Trust** → **Trust**

### 6. Launch HaloBuzz

Open the HaloBuzz app on your iPhone and start streaming!

## Development

### Local Development

```bash
# Start Expo development server
npm run mobile:dev

# Or
cd apps/halobuzz-mobile
npx expo start
```

**Testing Options:**
- **Expo Go**: Scan QR code for JS-only testing (no custom native modules)
- **Development Build**: Build and install .ipa for full native testing

### Project Structure

```
apps/halobuzz-mobile/
├── app/                    # Expo Router pages
│   ├── (auth)/            # Authentication screens
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/            # Main app tabs
│   │   ├── index.tsx      # Discover
│   │   ├── live.tsx       # Live streaming
│   │   └── profile.tsx    # User profile
│   └── _layout.tsx        # Root layout
├── src/
│   ├── components/        # Reusable components
│   ├── hooks/            # Custom hooks
│   │   ├── useAgora.ts   # Agora streaming
│   │   └── useStreams.ts # Stream management
│   ├── lib/              # Utilities
│   │   └── api.ts        # API client
│   ├── store/            # State management
│   │   └── AuthContext.tsx
│   └── types/            # TypeScript types
├── assets/               # Images, icons
├── app.config.ts         # Expo configuration
├── eas.json             # EAS Build configuration
└── package.json
```

## API Integration

The app connects to the HaloBuzz backend API:

- **Base URL**: `https://halobuzz-api-proxy.ojayshah123.workers.dev`
- **Authentication**: JWT tokens stored in AsyncStorage
- **Endpoints**: 
  - `POST /auth/login` - User login
  - `POST /auth/register` - User registration
  - `GET /auth/me` - Current user profile
  - `GET /streams` - List live streams
  - `POST /streams` - Create new stream
  - `GET /streams/trending` - Trending streams

## Agora Integration

Live streaming powered by Agora:

- **SDK**: `react-native-agora`
- **Features**: Camera/mic controls, channel management
- **Permissions**: Camera and microphone access
- **Token**: Backend generates Agora tokens for security

## Build Profiles

### Development
- **Distribution**: Internal
- **Resource Class**: Default
- **Use Case**: Testing with development features

### Preview
- **Distribution**: Internal  
- **Resource Class**: Default
- **Use Case**: Pre-production testing, sideloading

### Production
- **Distribution**: App Store
- **Resource Class**: Default
- **Use Case**: App Store submission

## Troubleshooting

### Common Issues

**Build Fails:**
- Check Apple ID credentials
- Verify bundle identifier is unique
- Ensure all environment variables are set

**App Crashes on Launch:**
- Check device iOS version (13.4+)
- Verify developer profile is trusted
- Check console logs in Expo DevTools

**Streaming Issues:**
- Verify Agora App ID is correct
- Check camera/mic permissions
- Ensure stable internet connection

**API Connection Issues:**
- Verify API base URL is correct
- Check network connectivity
- Review authentication token

### Getting Help

1. Check [Expo Documentation](https://docs.expo.dev/)
2. Review [Agora Documentation](https://docs.agora.io/)
3. Check project issues on GitHub
4. Contact HaloBuzz support

## Notes

- **Free Apple ID**: Apps expire after 7 days, reinstall as needed
- **Development**: Use Expo Go for quick JS testing
- **Production**: Use EAS Development Build for full native testing
- **Updates**: Rebuild and reinstall for app updates

## License

UNLICENSED - HaloBuzz Platform

# HaloBuzz Mobile App

A comprehensive live streaming platform built with React Native and Expo, featuring real-time interactions, gaming, and social features.

## 🚀 Features

### Core Functionality
- **Live Streaming**: Real-time video streaming with interactive chat
- **Reels**: Short-form video content with offline upload queue
- **Games**: Interactive gaming with coin-based economy
- **Social**: Direct messaging with 3-message rule and OG tier privileges
- **Wallet**: Multi-currency support with dynamic payment gateways

### Key Features

#### 🎥 Live Streaming
- Age gate verification (13+ requirement)
- Country-based content filtering
- Real-time chat with OG tier badges
- Gift system with animated effects
- Battle system for streamer competitions
- "Bless Me" button for viewer interactions
- Halo Throne CTA for OG tier upgrades

#### 📱 Reels
- Vertical video feed
- Offline upload queue
- S3 pre-signed uploads
- Video editing capabilities
- Hashtag system

#### 🎮 Games
- Multiple game types
- Coin debit/credit system
- Real-time multiplayer
- Leaderboards
- Tournament support

#### 💰 Wallet & Payments
- Rs 10 = 500 coins conversion
- Dynamic payment gateways by country
- Support for eSewa, Khalti, Stripe
- Transaction history
- Coin balance management

#### 👑 OG Store
- 5-tier system (OG1-OG5)
- Perks list for each tier
- Computed daily rewards
- Exclusive features and badges

#### 💬 Inbox
- Direct messaging
- 3-message rule for new conversations
- OG4/5 unsend capability
- Message status indicators

#### 👤 Profile
- Pinned latest reel
- Live streaming history
- OG badge display
- Follower/following management

### 🛡️ Safety Features
- Blur overlays for moderation
- Warning banners
- Content filtering
- Report system
- Age verification

### 📱 Device Support
- **Mobile**: Optimized for iOS and Android
- **Tablet/iPad**: 
  - Live Room 2-pane layout (video left, chat/gifts right)
  - Split view for Inbox/DM
- **Lite Mode**: Performance optimization for low-end devices

## 🛠️ Tech Stack

### Core Technologies
- **React Native**: 0.72.6
- **Expo**: ~49.0.0
- **TypeScript**: ^5.1.3
- **Redux Toolkit**: ^1.9.7
- **NativeBase**: ^3.4.28

### Navigation
- **React Navigation**: ^6.1.9
- **Bottom Tabs**: ^6.5.11
- **Stack Navigator**: ^6.3.20
- **Drawer Navigator**: ^6.6.6

### Real-time Communication
- **Socket.IO Client**: ^4.7.4
- **Agora SDK**: Video/audio streaming
- **WebRTC**: Adaptive fallback

### Media & Storage
- **Expo AV**: Video playback
- **Expo Camera**: Camera access
- **Expo Image Picker**: Media selection
- **AWS S3**: Pre-signed uploads

### Authentication & Security
- **Expo Secure Store**: Token storage
- **Expo Crypto**: Encryption
- **Biometric Authentication**: Fingerprint/Face ID

### UI/UX
- **React Native Vector Icons**: ^10.0.2
- **Lottie**: Animations
- **React Native Reanimated**: ^3.3.0
- **React Native Gesture Handler**: ~2.12.0

### Notifications
- **Expo Notifications**: Push notifications
- **FCM/APNs**: Cross-platform support

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mobile
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment setup**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Edit environment variables
   nano .env
   ```

4. **Start the development server**
   ```bash
   npm start
   # or
   yarn start
   ```

5. **Run on device/simulator**
   ```bash
   # iOS
   npm run ios
   
   # Android
   npm run android
   
   # Web
   npm run web
   ```

## 🔧 Configuration

### Environment Variables
```env
# API Configuration
API_BASE_URL=http://localhost:3001/api
SOCKET_URL=http://localhost:3001

# AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET=halobuzz-media

# Agora
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_certificate

# Payment Gateways
STRIPE_PUBLISHABLE_KEY=your_stripe_key
ESEWA_MERCHANT_ID=your_esewa_id
KHALTI_PUBLIC_KEY=your_khalti_key

# Push Notifications
FCM_SERVER_KEY=your_fcm_key
APNS_KEY_ID=your_apns_key_id
APNS_TEAM_ID=your_apns_team_id
```

### Feature Flags
Feature flags are managed through the backend `/config` endpoint and can be toggled dynamically.

## 📱 App Structure

```
src/
├── navigation/           # Navigation configuration
│   ├── OnboardingNavigator.tsx
│   ├── MainTabNavigator.tsx
│   ├── LiveTabNavigator.tsx
│   ├── ReelsTabNavigator.tsx
│   ├── GamesTabNavigator.tsx
│   ├── InboxTabNavigator.tsx
│   └── ProfileTabNavigator.tsx
├── screens/             # Screen components
│   ├── onboarding/     # Age gate, country selection, login
│   ├── live/           # Live feed, live room, go live
│   ├── reels/          # Reels feed, upload, detail
│   ├── games/          # Games lobby, gameplay, results
│   ├── inbox/          # DM list, chat
│   └── profile/         # Profile, wallet, OG store, settings
├── store/              # Redux store
│   ├── index.ts        # Store configuration
│   ├── hooks.ts        # Typed hooks
│   └── slices/         # Redux slices
├── services/           # API and external services
│   ├── authService.ts  # Authentication
│   ├── socketService.ts # Socket.IO
│   ├── agoraService.ts # Video streaming
│   └── uploadService.ts # File uploads
├── components/         # Reusable components
├── utils/              # Utility functions
└── types/              # TypeScript type definitions
```

## 🎯 Key Features Implementation

### Live Streaming
- **Agora Integration**: Real-time video/audio streaming
- **Socket.IO**: Chat, gifts, and viewer management
- **Adaptive Quality**: Automatic quality adjustment
- **Country Filtering**: Content localization

### Gaming System
- **Coin Economy**: Debit/credit system
- **Real-time Multiplayer**: Socket.IO game rooms
- **Tournament Support**: Competitive gameplay
- **Leaderboards**: Global and regional rankings

### Payment Integration
- **Multi-Gateway**: eSewa, Khalti, Stripe support
- **Dynamic Pricing**: Country-based rates
- **Secure Transactions**: Tokenized payments
- **Transaction History**: Complete audit trail

### OG Tier System
- **5-Tier Structure**: OG1 to OG5
- **Perks System**: Tier-specific benefits
- **Daily Rewards**: Computed based on tier
- **Exclusive Features**: Higher tier privileges

## 🚀 Deployment

### Build Configuration
```bash
# iOS Build
expo build:ios

# Android Build
expo build:android

# EAS Build (recommended)
eas build --platform ios
eas build --platform android
```

### App Store Deployment
1. Configure app signing certificates
2. Update app metadata
3. Submit for review
4. Monitor analytics and crash reports

## 📊 Analytics & Monitoring

### Key Metrics
- User engagement
- Live stream duration
- Gift revenue
- Game participation
- OG tier conversions

### Crash Reporting
- Sentry integration
- Real-time error tracking
- Performance monitoring

## 🔒 Security

### Data Protection
- End-to-end encryption for DMs
- Secure token storage
- API rate limiting
- Content moderation

### Privacy Compliance
- GDPR compliance
- COPPA compliance (13+ age gate)
- Data retention policies
- User consent management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Email: support@halobuzz.com
- Discord: [HaloBuzz Community](https://discord.gg/halobuzz)
- Documentation: [docs.halobuzz.com](https://docs.halobuzz.com)

## 🔄 Updates

Stay updated with the latest features and improvements by following our release notes and changelog.

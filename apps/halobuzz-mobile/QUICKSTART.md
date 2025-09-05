# HaloBuzz Mobile - Quick Start Guide

## 🚀 From Zero to iOS .ipa in 5 Steps

### Step 1: Install Prerequisites
```bash
# Install Node.js 18+ from https://nodejs.org
# Install Git from https://git-scm.com

# Install global CLI tools
npm install -g expo-cli eas-cli
```

### Step 2: Setup Environment
```bash
# Navigate to mobile app
cd apps/halobuzz-mobile

# Install dependencies
npm install

# Copy environment template
cp env.example .env
```

### Step 3: Configure Environment
Edit `.env` file with your values:
```env
HALOBUZZ_API_BASE=https://halo-api-production.up.railway.app
AGORA_APP_ID=YOUR_AGORA_APP_ID
IOS_BUNDLE_ID=com.halobuzz.app
PAYMENTS_ENABLED=false
EXPO_PROJECT_ID=your-expo-project-id
```

**Get your credentials:**
- **Agora App ID**: Sign up at [agora.io](https://agora.io) (free)
- **Expo Project ID**: Sign up at [expo.dev](https://expo.dev) (free)

### Step 4: Build iOS .ipa
```bash
# From project root
npm run mobile:build:ios

# Follow prompts:
# 1. Login to Expo account
# 2. Login to Apple ID (free account works)
# 3. Wait for build (5-10 minutes)
# 4. Copy download URL when complete
```

### Step 5: Sideload to iPhone

#### Option A: AltStore (Recommended)
1. Install **AltServer** on Windows: [altstore.io](https://altstore.io)
2. Install **AltStore** on iPhone via AltServer
3. Download .ipa from EAS build URL
4. Open AltStore → My Apps → + → Select .ipa
5. Sign with Apple ID (7-day validity)

#### Option B: Sideloadly
1. Download **Sideloadly**: [sideloadly.io](https://sideloadly.io)
2. Connect iPhone via USB
3. Open Sideloadly → Select .ipa → Sign with Apple ID
4. Install to iPhone

### Step 6: Trust Developer Profile
On iPhone:
1. Settings → General → VPN & Device Management
2. Find your Apple ID under Developer App
3. Tap Trust → Trust

### Step 7: Launch HaloBuzz
Open the HaloBuzz app and start streaming! 🎉

## 🔧 Development Commands

```bash
# Start development server
npm run mobile:dev

# Build for iOS (preview)
npm run mobile:build:ios

# Build for iOS (development)
npm run mobile:build:ios:dev
```

## 📱 Testing Options

- **Expo Go**: Scan QR code for JS-only testing
- **Development Build**: Full native testing with .ipa
- **Production Build**: Final .ipa for sideloading

## ⚠️ Important Notes

- Free Apple ID apps expire after 7 days
- Reinstall .ipa to extend validity
- Use Expo Go for quick JS testing
- Use Development Build for full native testing

## 🆘 Troubleshooting

**Build fails?**
- Check Apple ID credentials
- Verify bundle ID is unique
- Ensure all env vars are set

**App crashes?**
- Check iOS version (13.4+)
- Verify developer profile is trusted
- Check console logs

**Streaming issues?**
- Verify Agora App ID
- Check camera/mic permissions
- Ensure stable internet

## 📚 Full Documentation

See `README.md` for complete documentation and troubleshooting guide.

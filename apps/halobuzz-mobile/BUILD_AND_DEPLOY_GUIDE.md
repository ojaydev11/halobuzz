# HaloBuzz Mobile - Build and Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Development Setup](#development-setup)
3. [EAS Build Configuration](#eas-build-configuration)
4. [Building for iOS](#building-for-ios)
5. [Building for Android](#building-for-android)
6. [App Store Submission](#app-store-submission)
7. [Play Store Submission](#play-store-submission)
8. [CI/CD Setup](#cicd-setup)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts
- [ ] **Expo Account** - https://expo.dev (Free)
- [ ] **Apple Developer Account** - https://developer.apple.com ($99/year)
- [ ] **Google Play Console** - https://play.google.com/console ($25 one-time)
- [ ] **GitHub Account** - For version control and CI/CD

### Required Software
```bash
# Node.js 18+ and npm
node --version  # Should be v18 or higher
npm --version

# Expo CLI
npm install -g eas-cli expo-cli

# Git
git --version
```

### Required Credentials
- Apple Developer credentials (Apple ID + App-Specific Password)
- Google Play Service Account JSON file
- Expo account credentials
- Code signing certificates

---

## Development Setup

### 1. Initial Setup
```bash
# Navigate to mobile app directory
cd apps/halobuzz-mobile

# Install dependencies
npm install

# Login to Expo
eas login
```

### 2. Configure Environment Variables
Create `.env` file with required variables:
```bash
# API Configuration
EXPO_PUBLIC_API_BASE_URL=https://api.halobuzz.com

# Feature Flags
EXPO_PUBLIC_ENABLE_ANALYTICS=true
EXPO_PUBLIC_ENABLE_CRASH_REPORTING=true

# Third-party Services
EXPO_PUBLIC_AGORA_APP_ID=your-agora-app-id
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your-key
```

### 3. Test Locally
```bash
# Start Expo development server
npx expo start

# Scan QR code with Expo Go app on your device
# OR press 'i' for iOS simulator / 'a' for Android emulator
```

---

## EAS Build Configuration

### Build Profiles Overview

The `eas.json` file defines 5 build profiles:

1. **development** - Local development with Expo Go
2. **preview** - Internal testing builds (APK for Android)
3. **production** - Store-ready builds (AAB for Android, IPA for iOS)
4. **production-ios** - iOS-specific production build
5. **production-android** - Android-specific production build

### Environment Variables by Profile

| Profile | NODE_ENV | API_BASE_URL | Distribution |
|---------|----------|--------------|--------------|
| development | development | http://localhost:5010 | Internal |
| preview | production | https://halo-api-production.up.railway.app | Internal |
| production | production | https://api.halobuzz.com | Store |

---

## Building for iOS

### Step 1: Configure Apple Developer Account

#### 1.1 Create App in App Store Connect
1. Go to https://appstoreconnect.apple.com
2. Click "My Apps" → "+" → "New App"
3. Fill in details:
   - **Platform**: iOS
   - **Name**: HaloBuzz
   - **Primary Language**: English
   - **Bundle ID**: `com.blavatsoft.halobuzz`
   - **SKU**: `HALOBUZZ-001`

#### 1.2 Update EAS Configuration
```bash
# Edit eas.json and update iOS submission details
nano eas.json

# Update these values:
"appleId": "your-apple-id@example.com",
"ascAppId": "1234567890",  # From App Store Connect
"appleTeamId": "XXXXXXXXXX"  # From Apple Developer Portal
```

#### 1.3 Generate Apple App-Specific Password
1. Go to https://appleid.apple.com
2. Sign in with your Apple ID
3. Go to "Security" → "App-Specific Passwords"
4. Click "Generate Password"
5. Label: "EAS CLI"
6. Copy the generated password
7. Store in environment variable:
```bash
export EXPO_APPLE_APP_SPECIFIC_PASSWORD=your-app-specific-password
```

### Step 2: Build for iOS

#### Development Build (for testing on physical device)
```bash
# Build development client
eas build --profile development --platform ios

# Download IPA and install via TestFlight or Xcode
```

#### Preview Build (for internal testing)
```bash
# Build preview APK
eas build --profile preview --platform ios

# Distribute via TestFlight or direct download
```

#### Production Build (for App Store)
```bash
# Build production IPA
eas build --profile production --platform ios

# OR use iOS-specific profile for optimized build
eas build --profile production-ios --platform ios

# Build takes 15-30 minutes
# You'll receive email when complete
```

### Step 3: Submit to App Store

#### Option A: Automatic Submission (via EAS)
```bash
# Submit to App Store Connect
eas submit --platform ios --latest

# OR specify build ID
eas submit --platform ios --id <build-id>
```

#### Option B: Manual Submission

1. Download IPA from Expo dashboard
2. Use Transporter app to upload to App Store Connect
3. Go to App Store Connect → "TestFlight" or "App Store"
4. Submit for review

### Step 4: App Store Review Preparation

#### Required Materials
- [ ] App screenshots (all required sizes)
- [ ] App preview video (optional but recommended)
- [ ] App icon (1024x1024 PNG)
- [ ] Privacy Policy URL
- [ ] Terms of Service URL
- [ ] Support URL
- [ ] Marketing URL (optional)
- [ ] App description (4000 characters max)
- [ ] Keywords (100 characters max)
- [ ] What's New text (for updates)

#### Screenshot Sizes Required
- **iPhone 6.7"** - 1290 x 2796 (iPhone 14 Pro Max, 15 Pro Max)
- **iPhone 6.5"** - 1242 x 2688 (iPhone XS Max, 11 Pro Max)
- **iPad Pro 12.9"** - 2048 x 2732

#### App Review Information
```
Demo Account Credentials:
Username: demo@halobuzz.com
Password: Demo123!

Notes for Reviewer:
- HaloBuzz is a live streaming platform for creators
- Virtual coin system is for in-app purchases only
- Age restriction: 13+
- Content moderation is automated and manual
```

---

## Building for Android

### Step 1: Configure Google Play Console

#### 1.1 Create App in Play Console
1. Go to https://play.google.com/console
2. Click "Create app"
3. Fill in details:
   - **App name**: HaloBuzz
   - **Default language**: English (United States)
   - **App or game**: App
   - **Free or paid**: Free

#### 1.2 Create Service Account for EAS

1. Go to Google Cloud Console: https://console.cloud.google.com
2. Create new project or select existing
3. Enable "Google Play Android Developer API"
4. Create Service Account:
   - Go to "IAM & Admin" → "Service Accounts"
   - Click "Create Service Account"
   - Name: `eas-build-halobuzz`
   - Grant role: "Service Account User"
5. Create JSON key:
   - Click on service account
   - Go to "Keys" tab
   - "Add Key" → "Create new key" → JSON
   - Save file as `google-play-service-account.json`
6. Grant access in Play Console:
   - Go to Play Console → "Users and permissions"
   - "Invite new users"
   - Add service account email
   - Grant "Release Manager" role

#### 1.3 Store Service Account JSON
```bash
# Save to mobile app directory
cp /path/to/downloaded/key.json apps/halobuzz-mobile/google-play-service-account.json

# Add to .gitignore (already done)
echo "google-play-service-account.json" >> .gitignore
```

### Step 2: Generate Upload Keystore

#### Option A: Let EAS Generate (Recommended)
```bash
# EAS will generate and manage keystore automatically
eas build --profile production --platform android

# First time will prompt to generate keystore
# Select "Yes" to let EAS manage it
```

#### Option B: Use Existing Keystore
```bash
# If you have existing keystore
eas credentials

# Select Android → Production → Keystore
# Upload your .jks file
```

### Step 3: Build for Android

#### Development Build
```bash
# Build development APK
eas build --profile development --platform android

# Install on device via ADB
adb install build.apk
```

#### Preview Build (for testing)
```bash
# Build preview APK
eas build --profile preview --platform android

# Download and share APK for testing
```

#### Production Build (for Play Store)
```bash
# Build production AAB (App Bundle)
eas build --profile production --platform android

# OR use Android-specific profile
eas build --profile production-android --platform android

# Build takes 10-20 minutes
```

### Step 4: Submit to Play Store

#### Option A: Automatic Submission (via EAS)
```bash
# Submit to Play Console
eas submit --platform android --latest

# OR specify build ID
eas submit --platform android --id <build-id>

# Select track: internal, alpha, beta, or production
```

#### Option B: Manual Submission

1. Download AAB from Expo dashboard
2. Go to Play Console → "Release" → "Production"
3. Click "Create new release"
4. Upload AAB file
5. Fill in release notes
6. Submit for review

### Step 5: Play Store Listing

#### Required Materials
- [ ] App icon (512x512 PNG)
- [ ] Feature graphic (1024x500 PNG)
- [ ] Screenshots (min 2, max 8 per device type)
- [ ] Privacy Policy URL
- [ ] App description (short: 80 chars, full: 4000 chars)
- [ ] Categorization (Social, Entertainment, etc.)
- [ ] Content rating questionnaire
- [ ] Target age group

#### Screenshot Sizes
- **Phone**: 320-3840 width, 16:9 or 9:16 aspect ratio
- **7-inch Tablet**: 1024-7680 width
- **10-inch Tablet**: 1024-7680 width

#### Content Rating
1. Go to "Content rating" in Play Console
2. Complete IARC questionnaire
3. Declare:
   - Social features (yes)
   - User-generated content (yes)
   - Age restriction (13+)
   - In-app purchases (yes)

---

## App Store Submission Checklist

### iOS App Store

#### Pre-submission
- [ ] Test app thoroughly on real devices
- [ ] Test in-app purchases in sandbox
- [ ] Verify all features work without placeholders
- [ ] Check app size (target: < 200MB for cellular download)
- [ ] Prepare demo account for reviewers
- [ ] Prepare app preview video (optional)
- [ ] Test on latest iOS version

#### App Store Connect Setup
- [ ] Complete all app metadata
- [ ] Upload all required screenshots
- [ ] Set app pricing (Free)
- [ ] Configure in-app purchases
- [ ] Add privacy policy URL: `https://halobuzz.com/privacy`
- [ ] Add terms of service URL: `https://halobuzz.com/terms`
- [ ] Set age rating (13+)
- [ ] Select category (Social Networking)
- [ ] Add keywords for search optimization

#### Privacy & Compliance
- [ ] Declare data collection practices
- [ ] Add privacy manifest if using sensitive APIs
- [ ] Declare use of Agora SDK
- [ ] Declare use of payment processing
- [ ] Export compliance (encryption usage)

#### Submission
- [ ] Upload build via EAS or Transporter
- [ ] Submit for review
- [ ] Respond to review feedback within 24 hours
- [ ] Expected review time: 24-48 hours

### Android Play Store

#### Pre-submission
- [ ] Test on multiple Android devices/versions
- [ ] Test on minimum supported OS (Android 6.0+)
- [ ] Verify AAB is properly signed
- [ ] Test in-app billing in test environment
- [ ] Check app size (target: < 150MB)

#### Play Console Setup
- [ ] Complete store listing
- [ ] Upload all required graphics
- [ ] Set up pricing & distribution
- [ ] Configure in-app products
- [ ] Add privacy policy URL
- [ ] Add terms of service URL
- [ ] Complete content rating questionnaire
- [ ] Set target age group (13+)

#### Privacy & Data Safety
- [ ] Complete Data safety form
- [ ] Declare data collection and usage
- [ ] Specify security practices
- [ ] Declare sharing with third parties
- [ ] Declare use of advertising ID (if applicable)

#### Submission
- [ ] Upload AAB via EAS or manual upload
- [ ] Choose release track (internal → beta → production)
- [ ] Submit for review
- [ ] Expected review time: 1-7 days

---

## CI/CD Setup (GitHub Actions)

### Create EAS Build Workflow

Create `.github/workflows/eas-build.yml`:

```yaml
name: EAS Build

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  workflow_dispatch:
    inputs:
      profile:
        description: 'EAS Build Profile'
        required: true
        default: 'preview'
        type: choice
        options:
          - development
          - preview
          - production
      platform:
        description: 'Platform'
        required: true
        default: 'all'
        type: choice
        options:
          - all
          - ios
          - android

jobs:
  build:
    name: Build App
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'

      - name: Setup Expo and EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Install dependencies
        working-directory: apps/halobuzz-mobile
        run: npm ci

      - name: Build iOS (Preview)
        if: github.ref == 'refs/heads/develop' && (github.event.inputs.platform == 'all' || github.event.inputs.platform == 'ios')
        working-directory: apps/halobuzz-mobile
        run: eas build --profile preview --platform ios --non-interactive

      - name: Build Android (Preview)
        if: github.ref == 'refs/heads/develop' && (github.event.inputs.platform == 'all' || github.event.inputs.platform == 'android')
        working-directory: apps/halobuzz-mobile
        run: eas build --profile preview --platform android --non-interactive

      - name: Build iOS (Production)
        if: github.ref == 'refs/heads/main' && (github.event.inputs.platform == 'all' || github.event.inputs.platform == 'ios')
        working-directory: apps/halobuzz-mobile
        run: eas build --profile production-ios --platform ios --non-interactive

      - name: Build Android (Production)
        if: github.ref == 'refs/heads/main' && (github.event.inputs.platform == 'all' || github.event.inputs.platform == 'android')
        working-directory: apps/halobuzz-mobile
        run: eas build --profile production-android --platform android --non-interactive

      - name: Submit to App Store (Production only)
        if: github.ref == 'refs/heads/main' && github.event.inputs.platform == 'ios'
        working-directory: apps/halobuzz-mobile
        run: eas submit --platform ios --latest --non-interactive

      - name: Submit to Play Store (Production only)
        if: github.ref == 'refs/heads/main' && github.event.inputs.platform == 'android'
        working-directory: apps/halobuzz-mobile
        run: eas submit --platform android --latest --non-interactive
```

### Setup GitHub Secrets

Add these secrets in GitHub repository settings:

```
EXPO_TOKEN - Expo access token (generate at expo.dev)
EXPO_APPLE_APP_SPECIFIC_PASSWORD - Apple app-specific password
```

### Trigger Build

```bash
# Push to develop branch → triggers preview build
git push origin develop

# Push to main branch → triggers production build
git push origin main

# Manual trigger via GitHub Actions UI
# Go to Actions → EAS Build → Run workflow
```

---

## Build Commands Reference

### Development
```bash
# Local development
npx expo start

# Development build for device
eas build --profile development --platform ios
eas build --profile development --platform android
```

### Preview/Testing
```bash
# Preview builds (internal testing)
eas build --profile preview --platform ios
eas build --profile preview --platform android
eas build --profile preview --platform all

# Download and share builds
open https://expo.dev/accounts/your-account/projects/halobuzz/builds
```

### Production
```bash
# Production builds (for stores)
eas build --profile production --platform ios
eas build --profile production --platform android
eas build --profile production --platform all

# Platform-specific production builds
eas build --profile production-ios
eas build --profile production-android
```

### Submission
```bash
# Submit to stores
eas submit --platform ios --latest
eas submit --platform android --latest

# Submit specific build
eas submit --platform ios --id <build-id>
eas submit --platform android --id <build-id>
```

### Build Management
```bash
# List all builds
eas build:list

# View build details
eas build:view <build-id>

# Cancel running build
eas build:cancel <build-id>

# Configure credentials
eas credentials
```

---

## Troubleshooting

### iOS Build Issues

#### Issue: "No provisioning profile found"
**Solution:**
```bash
eas credentials
# Select iOS → Production → Provisioning Profile
# Let EAS generate new profile
```

#### Issue: "Apple Developer Team not found"
**Solution:**
```bash
# Update eas.json with correct team ID
# Get team ID from: https://developer.apple.com/account
```

#### Issue: "Build failed with exit code 65"
**Solution:**
```bash
# Check Xcode build logs in EAS dashboard
# Common causes:
# - Missing entitlements
# - Invalid bundle identifier
# - Cocoapods dependency issues

# Try clean build
eas build --profile production --platform ios --clear-cache
```

### Android Build Issues

#### Issue: "Keystore not found"
**Solution:**
```bash
eas credentials
# Select Android → Production → Keystore
# Let EAS generate new keystore
```

#### Issue: "Build failed: Gradle build failed"
**Solution:**
```bash
# Check Gradle logs in EAS dashboard
# Common causes:
# - Dependency version conflicts
# - Missing Android SDK components

# Try clean build
eas build --profile production --platform android --clear-cache
```

#### Issue: "Duplicate resources"
**Solution:**
```bash
# Check android/app/build.gradle
# Add to android block:
packagingOptions {
  pickFirst 'lib/x86/libc++_shared.so'
  pickFirst 'lib/x86_64/libc++_shared.so'
  pickFirst 'lib/armeabi-v7a/libc++_shared.so'
  pickFirst 'lib/arm64-v8a/libc++_shared.so'
}
```

### Submission Issues

#### Issue: "Invalid binary - Missing required icon"
**Solution:**
```bash
# Ensure app.config.ts has correct icon path
# Icon must be 1024x1024 PNG without transparency
```

#### Issue: "Your app contains non-public API usage"
**Solution:**
```bash
# Check for usage of private APIs
# Common culprit: third-party SDKs
# Review Agora SDK usage for compliance
```

#### Issue: "Missing privacy policy"
**Solution:**
```bash
# Add privacy policy URL in:
# - App Store Connect → App Information
# - Play Console → Store Listing
# URL: https://halobuzz.com/privacy
```

### General Issues

#### Issue: "EAS CLI not authenticated"
**Solution:**
```bash
eas logout
eas login
```

#### Issue: "Build queue time too long"
**Solution:**
```bash
# Upgrade to paid Expo plan for priority builds
# OR schedule builds during off-peak hours
```

#### Issue: "Out of memory during build"
**Solution:**
```bash
# Use larger resource class in eas.json
"ios": {
  "resourceClass": "large"
}
```

---

## Build Optimization Tips

### Reduce Build Size
```bash
# Enable Hermes engine (default in Expo SDK 49+)
# Check app.config.ts:
{
  "expo": {
    "jsEngine": "hermes"
  }
}

# Use production mode
NODE_ENV=production eas build --profile production

# Analyze bundle size
npx expo-bundle-analyzer
```

### Speed Up Builds
```bash
# Use build cache
# Enabled by default in eas.json

# Build only changed platform
eas build --platform ios  # Instead of --platform all

# Use medium/large resource class
# Costs more but builds faster
```

### Improve App Performance
```bash
# Enable ProGuard (Android)
# In android/app/build.gradle:
buildTypes {
  release {
    minifyEnabled true
    proguardFiles getDefaultProguardFile('proguard-android.txt')
  }
}

# Enable Bitcode (iOS) - deprecated in Xcode 14
# Now automatic with modern Xcode versions
```

---

## Post-Launch Checklist

### After App Store Approval
- [ ] Monitor crash reports in Sentry/Crashlytics
- [ ] Check app store ratings and reviews
- [ ] Monitor server load and API performance
- [ ] Verify in-app purchases are working
- [ ] Test push notifications
- [ ] Set up analytics tracking
- [ ] Prepare OTA updates for bugs

### Ongoing Maintenance
```bash
# Push OTA updates (for JS/asset changes only)
eas update --branch production --message "Bug fixes"

# For native changes, rebuild and resubmit
eas build --profile production --platform all
eas submit --platform all --latest
```

---

## Support & Resources

### Documentation
- **Expo Docs**: https://docs.expo.dev
- **EAS Build**: https://docs.expo.dev/build/introduction/
- **EAS Submit**: https://docs.expo.dev/submit/introduction/
- **App Store Review Guidelines**: https://developer.apple.com/app-store/review/guidelines/
- **Play Store Policies**: https://play.google.com/about/developer-content-policy/

### Getting Help
- **Expo Discord**: https://chat.expo.dev
- **Expo Forums**: https://forums.expo.dev
- **Stack Overflow**: Tag `expo` or `react-native`

### Contact
- **Technical Support**: tech@halobuzz.com
- **App Review Issues**: support@halobuzz.com

---

**Last Updated**: January 2025
**Version**: 1.0.0

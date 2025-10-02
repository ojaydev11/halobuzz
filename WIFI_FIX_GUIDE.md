# 🔧 WiFi Connection Fix Guide

## Problem Solved: App Cutting Off WiFi After QR Code Scan

The issue was caused by the app trying to connect to a production backend server (`https://halo-api-production.up.railway.app`) during development, which was interfering with your local network connection.

## ✅ Solutions Implemented:

### 1. **Development Configuration System**
- Created `src/config/development.ts` with proper dev/prod configurations
- Added automatic environment detection
- Configured local development server support

### 2. **Development Server Manager**
- Created `src/utils/devServer.ts` for local server management
- Added automatic server health checking
- Platform-specific network configuration (iOS/Android)

### 3. **Enhanced API Client**
- Updated `src/lib/api.ts` with development mode support
- Added proper timeout handling (10s for dev, 15s for prod)
- Enhanced error logging and network debugging

### 4. **Metro Bundler Configuration**
- Updated `metro.config.js` with CORS headers
- Added development server middleware
- Fixed network configuration issues

### 5. **Development Server Scripts**
- Created `start-dev-server.sh` (Linux/Mac)
- Created `start-dev-server.bat` (Windows)
- Automatic dependency installation and .env creation

## 🚀 How to Use:

### Option 1: Use Offline Mode (Recommended for Testing)
The app now automatically detects when the backend server is not running and switches to offline mode with a temporary user. This prevents WiFi issues entirely.

### Option 2: Start Local Backend Server
1. **Open terminal in the backend directory**
2. **Run the startup script:**
   - Windows: `start-dev-server.bat`
   - Linux/Mac: `./start-dev-server.sh`
3. **The script will:**
   - Install dependencies if needed
   - Create a development .env file
   - Start the server on `http://localhost:3001`

### Option 3: Use Production Backend (Not Recommended for Development)
The app will still work with the production backend, but it may cause network issues during development.

## 🔍 Debug Information:

The app now provides detailed logging in development mode:
- 🌐 API Request logs with full URLs
- 📡 Development mode status
- 🔗 Server connection attempts
- ⚠️ Network error details with helpful tips

## 📱 Network Configuration:

### iOS Simulator:
- Uses `localhost:3001`
- Timeout: 10 seconds

### Android Emulator:
- Uses `10.0.2.2:3001` (Android emulator host)
- Timeout: 15 seconds

### Physical Devices:
- Uses your computer's IP address
- Requires both devices on same network

## 🛠️ Troubleshooting:

### If WiFi Still Gets Cut Off:
1. **Check if backend server is running:**
   ```bash
   curl http://localhost:3001/api/v1/health
   ```

2. **Clear Metro cache:**
   ```bash
   npx expo start --clear
   ```

3. **Use offline mode:**
   - The app will automatically detect server issues
   - Switch to offline mode with temporary user
   - No network connection required

### If App Still Shows "Something Went Wrong":
1. **Check the console logs** for detailed error messages
2. **Verify the development configuration** is being used
3. **Try restarting the Metro bundler** with `--clear` flag

## 🎯 Key Benefits:

- ✅ **No more WiFi cutoff** - App uses local server or offline mode
- ✅ **Automatic fallback** - Switches to offline mode if server unavailable
- ✅ **Better debugging** - Detailed network logs and error messages
- ✅ **Platform-specific** - Optimized for iOS/Android development
- ✅ **Easy setup** - One-click server startup scripts

The app will now work smoothly without interfering with your WiFi connection!

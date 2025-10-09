#!/bin/bash

# HaloBuzz Live Production Configuration Script
# This script sets up the app for LIVE backend testing

echo "🚀 Setting up HaloBuzz for LIVE PRODUCTION testing..."
echo "=================================================="

# Set production environment variables
export EXPO_PUBLIC_API_BASE_URL="https://halo-api-production.up.railway.app"
export EXPO_PUBLIC_WS_URL="wss://halo-api-production.up.railway.app"
export NODE_ENV="production"
export EXPO_PUBLIC_ENVIRONMENT="production"

echo "✅ Environment configured for LIVE backend:"
echo "   🌐 API: $EXPO_PUBLIC_API_BASE_URL"
echo "   🔌 WebSocket: $EXPO_PUBLIC_WS_URL"
echo "   🏭 Environment: $NODE_ENV"
echo ""

# Start Expo with production configuration
echo "📱 Starting Expo development server with LIVE backend..."
echo "   This will generate a QR code for testing the REAL app"
echo ""

# Kill any existing Expo processes
pkill -f "expo start" || true
sleep 2

# Start Expo with tunnel for live testing
npx expo start --tunnel --port 8084 --clear

echo ""
echo "🎉 HaloBuzz is now running with LIVE backend!"
echo "   Scan the QR code above to test the REAL app"
echo "   All data will be saved to the LIVE database"



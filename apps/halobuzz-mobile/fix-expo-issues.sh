#!/bin/bash

echo "🔧 Fixing HaloBuzz Mobile App Issues..."
echo ""

# Stop any running Expo processes
echo "🛑 Stopping existing Expo processes..."
pkill -f "expo start" || true
pkill -f "metro" || true

# Clear all caches
echo "🧹 Clearing caches..."
rm -rf node_modules/.cache
rm -rf .expo
rm -rf .metro
rm -rf /tmp/metro-*
rm -rf /tmp/haste-map-*

# Clear npm cache
echo "📦 Clearing npm cache..."
npm cache clean --force

# Reinstall dependencies
echo "📥 Reinstalling dependencies..."
rm -rf node_modules
npm install

# Clear Expo cache
echo "🗑️ Clearing Expo cache..."
npx expo install --fix

# Start backend server (in background)
echo "🚀 Starting backend server..."
cd ../../backend
npm run dev &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 10

# Go back to mobile app
cd ../apps/halobuzz-mobile

# Start Expo with tunnel
echo "📱 Starting Expo with tunnel..."
npx expo start --tunnel --clear

# Cleanup function
cleanup() {
    echo "🧹 Cleaning up..."
    kill $BACKEND_PID 2>/dev/null || true
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

echo "✅ Setup complete! Backend and Expo are running."
echo "📱 Scan the QR code above with Expo Go app"
echo "🌐 Backend should be running at: https://halo-api-production.up.railway.app"
echo ""
echo "Press Ctrl+C to stop both servers"

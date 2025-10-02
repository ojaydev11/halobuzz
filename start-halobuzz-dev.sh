#!/bin/bash

# 🎮 HaloBuzz Development Startup Script
# This script starts all services for development and testing

echo "🚀 Starting HaloBuzz Development Environment..."
echo "=============================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the HaloBuzz root directory"
    exit 1
fi

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm"
    exit 1
fi

if ! command -v npx &> /dev/null; then
    echo "❌ npx is not installed. Please install npx"
    exit 1
fi

echo "✅ Prerequisites check passed"

# Install dependencies if needed
echo "📦 Installing dependencies..."
npm install

# Start backend in background
echo "🔧 Starting Backend API..."
cd backend
npm install
npm run dev &
BACKEND_PID=$!
cd ..

# Start AI engine in background
echo "🤖 Starting AI Engine..."
cd ai-engine
npm install
npm run dev &
AI_PID=$!
cd ..

# Wait a moment for services to start
echo "⏳ Waiting for services to initialize..."
sleep 5

# Start mobile app with QR code
echo "📱 Starting Mobile App..."
echo "=============================================="
echo "🎯 SCAN THIS QR CODE WITH EXPO GO APP:"
echo "=============================================="

cd apps/halobuzz-mobile
npm install
npx expo start --tunnel --clear

# Cleanup function
cleanup() {
    echo "🛑 Shutting down services..."
    kill $BACKEND_PID 2>/dev/null
    kill $AI_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

echo "✅ HaloBuzz Development Environment Started!"
echo "Backend API: http://localhost:5010"
echo "AI Engine: http://localhost:5020"
echo "Mobile App: Scan QR code above with Expo Go"
echo ""
echo "Press Ctrl+C to stop all services"


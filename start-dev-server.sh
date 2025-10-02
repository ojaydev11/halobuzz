#!/bin/bash

# HaloBuzz Development Server Startup Script
# This script helps start the backend development server

echo "🚀 Starting HaloBuzz Development Server..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the backend directory."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found. Creating a basic development .env..."
    cat > .env << EOF
NODE_ENV=development
PORT=3001
MONGODB_URI=mongodb://localhost:27017/halobuzz-dev
JWT_SECRET=dev-secret-key-change-in-production
API_PREFIX=/api/v1
CORS_ORIGIN=http://localhost:8081
EOF
    echo "✅ Created basic .env file for development"
fi

# Start the development server
echo "🌐 Starting development server on port 3001..."
echo "📱 Mobile app will connect to: http://localhost:3001/api/v1"
echo "🔗 Web interface: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev

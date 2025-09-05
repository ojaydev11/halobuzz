#!/bin/bash

# Development startup script for HaloBuzz backend

echo "🚀 Starting HaloBuzz Backend (Development Mode)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo "✅ .env created. Please configure your environment variables."
fi

# Check MongoDB
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB is not running. Starting MongoDB..."
    mongod --fork --logpath /dev/null
fi

# Check Redis
if ! pgrep -x "redis-server" > /dev/null; then
    echo "⚠️  Redis is not running. Starting Redis..."
    redis-server --daemonize yes
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the application
echo ""
echo "🔧 Configuration:"
echo "  • Port: 4000"
echo "  • Environment: development"
echo "  • Health: http://localhost:4000/healthz"
echo "  • Metrics: http://localhost:4000/metrics"
echo ""
echo "Starting server..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Run with development configuration
NODE_ENV=development \
PORT=4000 \
MONGODB_URI=mongodb://localhost:27017/halobuzz \
REDIS_URL=redis://localhost:6379 \
JWT_SECRET=dev_jwt_secret_min_32_characters_long \
JWT_REFRESH_SECRET=dev_refresh_secret_min_32_chars \
AGORA_APP_ID=test_agora_app_id \
AGORA_APP_CERTIFICATE=test_agora_certificate \
AI_MODERATION=true \
FEATURE_GIFTING=true \
FEATURE_REELS=true \
PROMETHEUS_ENABLED=true \
npm run dev
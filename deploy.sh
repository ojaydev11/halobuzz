#!/bin/bash

# HaloBuzz Big Games Deployment Script
set -e

echo "🎮 HaloBuzz Big Games Deployment Script"
echo "========================================"

# Configuration
ENVIRONMENT=${1:-"local"}
BUILD_BACKEND=${BUILD_BACKEND:-true}
BUILD_GAMESERVER=${BUILD_GAMESERVER:-true}
RUN_TESTS=${RUN_TESTS:-true}

echo "🔧 Environment: $ENVIRONMENT"
echo "🏗️  Build Backend: $BUILD_BACKEND"
echo "🎯 Build Game Server: $BUILD_GAMESERVER"
echo "🧪 Run Tests: $RUN_TESTS"
echo ""

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        echo "❌ Docker is not running. Please start Docker and try again."
        exit 1
    fi
    echo "✅ Docker is running"
}

# Function to run tests
run_tests() {
    if [ "$RUN_TESTS" = true ]; then
        echo "🧪 Running tests..."
        cd backend
        npm run test
        npm run test:load
        cd ..
        echo "✅ All tests passed"
    fi
}

# Function to build images
build_images() {
    echo "🏗️  Building Docker images..."

    if [ "$BUILD_BACKEND" = true ]; then
        echo "📦 Building backend image..."
        docker build -t halobuzz/backend:latest ./backend
        echo "✅ Backend image built"
    fi

    if [ "$BUILD_GAMESERVER" = true ]; then
        echo "🎮 Building game server image..."
        docker build -f ./backend/Dockerfile.gameserver -t halobuzz/gameserver:latest ./backend
        echo "✅ Game server image built"
    fi
}

# Function to deploy locally
deploy_local() {
    echo "🚀 Deploying locally with Docker Compose..."

    # Create .env file if it doesn't exist
    if [ ! -f ".env" ]; then
        echo "📝 Creating .env file..."
        cat > .env << EOF
JWT_SECRET=your-super-secret-jwt-key-here
NODE_ENV=development
DATABASE_URL=mongodb://mongo:27017/halobuzz
REDIS_URL=redis://redis:6379
EOF
        echo "✅ .env file created"
    fi

    # Start services
    docker-compose down
    docker-compose up -d

    echo "⏳ Waiting for services to start..."
    sleep 30

    # Health checks
    echo "🔍 Running health checks..."

    # Check backend health
    if curl -f http://localhost:5010/health > /dev/null 2>&1; then
        echo "✅ Backend is healthy"
    else
        echo "❌ Backend health check failed"
        docker-compose logs backend-1
    fi

    # Check game server health
    if curl -f http://localhost:5011/health > /dev/null 2>&1; then
        echo "✅ Game server is healthy"
    else
        echo "❌ Game server health check failed"
        docker-compose logs game-server-1
    fi

    echo ""
    echo "🎉 Local deployment complete!"
    echo "📊 Services:"
    echo "   - Backend API: http://localhost:5010"
    echo "   - Game Server: http://localhost:5011"
    echo "   - Grafana: http://localhost:3001 (admin/admin123)"
    echo "   - Prometheus: http://localhost:9090"
    echo "   - Kibana: http://localhost:5601"
    echo ""
    echo "📋 Useful commands:"
    echo "   - View logs: docker-compose logs -f"
    echo "   - Stop services: docker-compose down"
    echo "   - Restart: docker-compose restart"
}

# Function to deploy to staging
deploy_staging() {
    echo "🚀 Deploying to staging environment..."

    # Tag images for staging
    docker tag halobuzz/backend:latest halobuzz/backend:staging
    docker tag halobuzz/gameserver:latest halobuzz/gameserver:staging

    # Apply Kubernetes configuration
    kubectl apply -f k8s-deployment.yaml

    # Wait for rollout
    kubectl rollout status deployment/halobuzz-backend -n halobuzz --timeout=300s
    kubectl rollout status deployment/halobuzz-gameserver -n halobuzz --timeout=300s

    echo "✅ Staging deployment complete"
}

# Function to deploy to production
deploy_production() {
    echo "🚀 Deploying to production environment..."

    # Confirmation prompt
    read -p "⚠️  Are you sure you want to deploy to PRODUCTION? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "❌ Production deployment cancelled"
        exit 1
    fi

    # Tag images for production
    docker tag halobuzz/backend:latest halobuzz/backend:prod
    docker tag halobuzz/gameserver:latest halobuzz/gameserver:prod

    # Blue-green deployment
    echo "🔄 Performing blue-green deployment..."

    # Apply production configuration
    kubectl apply -f k8s-deployment.yaml

    # Wait for rollout
    kubectl rollout status deployment/halobuzz-backend -n halobuzz --timeout=300s
    kubectl rollout status deployment/halobuzz-gameserver -n halobuzz --timeout=300s

    # Health check
    sleep 30

    echo "✅ Production deployment complete"
}

# Main execution
main() {
    echo "Starting deployment for environment: $ENVIRONMENT"

    check_docker
    run_tests
    build_images

    case $ENVIRONMENT in
        "local")
            deploy_local
            ;;
        "staging")
            deploy_staging
            ;;
        "production")
            deploy_production
            ;;
        *)
            echo "❌ Unknown environment: $ENVIRONMENT"
            echo "Valid environments: local, staging, production"
            exit 1
            ;;
    esac

    echo ""
    echo "🎉 Deployment complete!"
    echo "📅 $(date)"
}

# Handle script termination
trap 'echo "❌ Deployment interrupted"; exit 1' INT TERM

# Run main function
main
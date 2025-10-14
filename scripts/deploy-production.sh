#!/bin/bash

# HaloBuzz Production Deployment Script
# This script handles the complete production deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="halobuzz"
BACKEND_DIR="backend"
AI_ENGINE_DIR="ai-engine"
ADMIN_DIR="admin"
MOBILE_DIR="apps/halobuzz-mobile"
DOCKER_REGISTRY="your-registry.com"
DOCKER_NAMESPACE="halobuzz"
VERSION=${1:-"latest"}
ENVIRONMENT=${2:-"production"}

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

# Check if required tools are installed
check_dependencies() {
    log "Checking dependencies..."
    
    command -v docker >/dev/null 2>&1 || error "Docker is not installed"
    command -v docker-compose >/dev/null 2>&1 || error "Docker Compose is not installed"
    command -v node >/dev/null 2>&1 || error "Node.js is not installed"
    command -v npm >/dev/null 2>&1 || error "npm is not installed"
    command -v git >/dev/null 2>&1 || error "Git is not installed"
    
    log "All dependencies are installed"
}

# Validate environment configuration
validate_environment() {
    log "Validating environment configuration..."
    
    if [ ! -f ".env.production" ]; then
        error "Production environment file (.env.production) not found"
    fi
    
    # Check critical environment variables
    source .env.production
    
    if [ -z "$MONGODB_URI" ]; then
        error "MONGODB_URI is not set in production environment"
    fi
    
    if [ -z "$REDIS_URL" ]; then
        error "REDIS_URL is not set in production environment"
    fi
    
    if [ -z "$JWT_SECRET" ]; then
        error "JWT_SECRET is not set in production environment"
    fi
    
    if [ -z "$STRIPE_SECRET_KEY" ]; then
        error "STRIPE_SECRET_KEY is not set in production environment"
    fi
    
    log "Environment configuration is valid"
}

# Run security checks
run_security_checks() {
    log "Running security checks..."
    
    # Check for secrets in code
    if grep -r "password\|secret\|key" --include="*.js" --include="*.ts" --include="*.json" . | grep -v node_modules | grep -v ".env" | grep -v "package-lock.json"; then
        warn "Potential secrets found in code. Please review."
    fi
    
    # Check for vulnerable dependencies
    if [ -f "package.json" ]; then
        npm audit --audit-level=high || warn "High severity vulnerabilities found"
    fi
    
    # Check Dockerfile security
    if [ -f "Dockerfile" ]; then
        docker run --rm -v "$PWD:/app" securecodereview/docker-security-scan /app/Dockerfile || warn "Docker security issues found"
    fi
    
    log "Security checks completed"
}

# Run tests
run_tests() {
    log "Running tests..."
    
    # Backend tests
    if [ -d "$BACKEND_DIR" ]; then
        cd "$BACKEND_DIR"
        npm ci
        npm run test || error "Backend tests failed"
        npm run test:security || warn "Security tests failed"
        cd ..
    fi
    
    # AI Engine tests
    if [ -d "$AI_ENGINE_DIR" ]; then
        cd "$AI_ENGINE_DIR"
        npm ci
        npm run test || error "AI Engine tests failed"
        cd ..
    fi
    
    # Admin tests
    if [ -d "$ADMIN_DIR" ]; then
        cd "$ADMIN_DIR"
        npm ci
        npm run test || error "Admin tests failed"
        cd ..
    fi
    
    log "All tests passed"
}

# Build Docker images
build_docker_images() {
    log "Building Docker images..."
    
    # Build backend image
    if [ -d "$BACKEND_DIR" ]; then
        log "Building backend image..."
        docker build -f "$BACKEND_DIR/Dockerfile.prod" -t "$DOCKER_REGISTRY/$DOCKER_NAMESPACE/backend:$VERSION" "$BACKEND_DIR"
        docker tag "$DOCKER_REGISTRY/$DOCKER_NAMESPACE/backend:$VERSION" "$DOCKER_REGISTRY/$DOCKER_NAMESPACE/backend:latest"
    fi
    
    # Build AI engine image
    if [ -d "$AI_ENGINE_DIR" ]; then
        log "Building AI engine image..."
        docker build -f "$AI_ENGINE_DIR/Dockerfile.prod" -t "$DOCKER_REGISTRY/$DOCKER_NAMESPACE/ai-engine:$VERSION" "$AI_ENGINE_DIR"
        docker tag "$DOCKER_REGISTRY/$DOCKER_NAMESPACE/ai-engine:$VERSION" "$DOCKER_REGISTRY/$DOCKER_NAMESPACE/ai-engine:latest"
    fi
    
    # Build admin image
    if [ -d "$ADMIN_DIR" ]; then
        log "Building admin image..."
        docker build -f "$ADMIN_DIR/Dockerfile.prod" -t "$DOCKER_REGISTRY/$DOCKER_NAMESPACE/admin:$VERSION" "$ADMIN_DIR"
        docker tag "$DOCKER_REGISTRY/$DOCKER_NAMESPACE/admin:$VERSION" "$DOCKER_REGISTRY/$DOCKER_NAMESPACE/admin:latest"
    fi
    
    log "Docker images built successfully"
}

# Push Docker images
push_docker_images() {
    log "Pushing Docker images to registry..."
    
    # Login to Docker registry
    docker login "$DOCKER_REGISTRY" || error "Failed to login to Docker registry"
    
    # Push backend image
    if [ -d "$BACKEND_DIR" ]; then
        docker push "$DOCKER_REGISTRY/$DOCKER_NAMESPACE/backend:$VERSION"
        docker push "$DOCKER_REGISTRY/$DOCKER_NAMESPACE/backend:latest"
    fi
    
    # Push AI engine image
    if [ -d "$AI_ENGINE_DIR" ]; then
        docker push "$DOCKER_REGISTRY/$DOCKER_NAMESPACE/ai-engine:$VERSION"
        docker push "$DOCKER_REGISTRY/$DOCKER_NAMESPACE/ai-engine:latest"
    fi
    
    # Push admin image
    if [ -d "$ADMIN_DIR" ]; then
        docker push "$DOCKER_REGISTRY/$DOCKER_NAMESPACE/admin:$VERSION"
        docker push "$DOCKER_REGISTRY/$DOCKER_NAMESPACE/admin:latest"
    fi
    
    log "Docker images pushed successfully"
}

# Deploy to production
deploy_to_production() {
    log "Deploying to production..."
    
    # Update environment variables
    export VERSION="$VERSION"
    export ENVIRONMENT="$ENVIRONMENT"
    
    # Deploy using Docker Compose
    if [ -f "docker-compose.prod.yml" ]; then
        docker-compose -f docker-compose.prod.yml down
        docker-compose -f docker-compose.prod.yml up -d
    else
        error "Production Docker Compose file not found"
    fi
    
    # Wait for services to be healthy
    log "Waiting for services to be healthy..."
    sleep 30
    
    # Health check
    if ! curl -f http://localhost:4000/health; then
        error "Health check failed"
    fi
    
    log "Deployment completed successfully"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    
    # Run backend migrations
    if [ -d "$BACKEND_DIR" ]; then
        cd "$BACKEND_DIR"
        npm run migrate:prod || error "Database migrations failed"
        cd ..
    fi
    
    log "Database migrations completed"
}

# Setup monitoring
setup_monitoring() {
    log "Setting up monitoring..."
    
    # Start Prometheus
    if command -v prometheus >/dev/null 2>&1; then
        prometheus --config.file=prometheus.yml --storage.tsdb.path=./prometheus-data &
    fi
    
    # Start Grafana
    if command -v grafana-server >/dev/null 2>&1; then
        grafana-server --config=grafana.ini &
    fi
    
    log "Monitoring setup completed"
}

# Run load tests
run_load_tests() {
    log "Running load tests..."
    
    # Install artillery if not present
    if ! command -v artillery >/dev/null 2>&1; then
        npm install -g artillery
    fi
    
    # Run load tests
    if [ -f "load-tests.yml" ]; then
        artillery run load-tests.yml || warn "Load tests failed"
    else
        warn "Load test configuration not found"
    fi
    
    log "Load tests completed"
}

# Cleanup old images
cleanup_old_images() {
    log "Cleaning up old Docker images..."
    
    # Remove dangling images
    docker image prune -f
    
    # Remove old versions (keep last 3)
    docker images "$DOCKER_REGISTRY/$DOCKER_NAMESPACE/*" --format "table {{.Repository}}:{{.Tag}}" | tail -n +4 | xargs -r docker rmi
    
    log "Cleanup completed"
}

# Send deployment notification
send_notification() {
    log "Sending deployment notification..."
    
    # Send Slack notification
    if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"🚀 HaloBuzz $VERSION deployed to $ENVIRONMENT successfully!\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
    
    # Send email notification
    if [ ! -z "$NOTIFICATION_EMAIL" ]; then
        echo "HaloBuzz $VERSION has been successfully deployed to $ENVIRONMENT" | mail -s "Deployment Success" "$NOTIFICATION_EMAIL"
    fi
    
    log "Notification sent"
}

# Main deployment function
main() {
    log "Starting HaloBuzz production deployment..."
    log "Version: $VERSION"
    log "Environment: $ENVIRONMENT"
    
    # Pre-deployment checks
    check_dependencies
    validate_environment
    run_security_checks
    
    # Build and test
    run_tests
    build_docker_images
    
    # Deploy
    push_docker_images
    run_migrations
    deploy_to_production
    setup_monitoring
    
    # Post-deployment
    run_load_tests
    cleanup_old_images
    send_notification
    
    log "Production deployment completed successfully! 🎉"
    log "Application is available at: https://halobuzz.com"
    log "Admin panel: https://admin.halobuzz.com"
    log "API documentation: https://api.halobuzz.com/docs"
}

# Error handling
trap 'error "Deployment failed at line $LINENO"' ERR

# Run main function
main "$@"

#!/bin/bash

# HaloBuzz Production Deployment Script for Northflank
# Deploys the hardened backend to production environment

set -e

# Configuration
PROJECT_NAME="halobuzz-backend"
ENVIRONMENT="production"
REGION="us-east-1"
NODEVERSION="20"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log function
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')] INFO:${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking deployment prerequisites..."
    
    # Check if Northflank CLI is installed
    if ! command -v nf &> /dev/null; then
        error "Northflank CLI not found. Please install it first:"
        echo "npm install -g @northflank/cli"
        exit 1
    fi
    
    # Check if logged in to Northflank
    if ! nf auth status &> /dev/null; then
        error "Not logged in to Northflank. Please login first:"
        echo "nf auth login"
        exit 1
    fi
    
    # Check if project exists
    if ! nf project list | grep -q "$PROJECT_NAME"; then
        warn "Project $PROJECT_NAME not found. Creating..."
        nf project create "$PROJECT_NAME" --region "$REGION"
    fi
    
    log "Prerequisites check completed"
}

# Build application
build_application() {
    log "Building application..."
    
    # Install dependencies
    npm ci --production
    
    # Run security audit
    log "Running security audit..."
    npm audit --audit-level=high --production
    
    # Run type checking
    log "Running TypeScript type checking..."
    npm run type-check
    
    # Run linting
    log "Running ESLint..."
    npm run lint
    
    # Build application
    log "Building TypeScript..."
    npm run build
    
    # Verify build
    if [ ! -d "dist" ]; then
        error "Build failed - dist directory not found"
        exit 1
    fi
    
    log "Application built successfully"
}

# Create Dockerfile for production
create_dockerfile() {
    log "Creating production Dockerfile..."
    
    cat > Dockerfile << 'EOF'
# Multi-stage build for production
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig-paths-bootstrap.js ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S halobuzz -u 1001

# Set working directory
WORKDIR /app

# Copy built application
COPY --from=builder --chown=halobuzz:nodejs /app/dist ./dist
COPY --from=builder --chown=halobuzz:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=halobuzz:nodejs /app/package*.json ./

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads && \
    chown -R halobuzz:nodejs /app/logs /app/uploads

# Switch to non-root user
USER halobuzz

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/healthz', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
EOF

    log "Dockerfile created"
}

# Create Northflank configuration
create_northflank_config() {
    log "Creating Northflank configuration..."
    
    cat > northflank.yml << EOF
version: '1.0'

project:
  name: $PROJECT_NAME
  region: $REGION

services:
  backend:
    name: halobuzz-backend
    type: container
    image:
      build:
        context: .
        dockerfile: Dockerfile
    resources:
      cpu: 1000m
      memory: 2Gi
      replicas: 3
    ports:
      - port: 3000
        protocol: http
        public: true
    environment:
      NODE_ENV: production
      PORT: 3000
    healthCheck:
      path: /healthz
      port: 3000
      interval: 30s
      timeout: 5s
      retries: 3
    scaling:
      minReplicas: 2
      maxReplicas: 10
      targetCPU: 70
      targetMemory: 80
    volumes:
      - name: logs
        mountPath: /app/logs
      - name: uploads
        mountPath: /app/uploads

databases:
  mongodb:
    name: halobuzz-mongodb
    type: mongodb
    version: "7.0"
    resources:
      cpu: 1000m
      memory: 2Gi
      storage: 20Gi
    backup:
      enabled: true
      schedule: "0 2 * * *"
      retention: 30d

  redis:
    name: halobuzz-redis
    type: redis
    version: "7.0"
    resources:
      cpu: 500m
      memory: 1Gi
      storage: 5Gi
    backup:
      enabled: true
      schedule: "0 */6 * * *"
      retention: 7d

volumes:
  logs:
    name: halobuzz-logs
    size: 10Gi
  uploads:
    name: halobuzz-uploads
    size: 50Gi

networking:
  domains:
    - halobuzz.com
    - api.halobuzz.com
  ssl:
    enabled: true
    certificate: auto
  cors:
    enabled: true
    origins:
      - https://halobuzz.com
      - https://admin.halobuzz.com
      - https://mobile.halobuzz.com

monitoring:
  metrics:
    enabled: true
  logging:
    enabled: true
    level: info
  alerting:
    enabled: true
    channels:
      - email: admin@halobuzz.com
      - slack: "#alerts"
EOF

    log "Northflank configuration created"
}

# Deploy to Northflank
deploy_to_northflank() {
    log "Deploying to Northflank..."
    
    # Switch to project
    nf project use "$PROJECT_NAME"
    
    # Deploy services
    log "Deploying backend service..."
    nf service deploy backend --config northflank.yml
    
    # Wait for deployment to complete
    log "Waiting for deployment to complete..."
    nf service status backend --wait
    
    # Get service URL
    SERVICE_URL=$(nf service get backend --output json | jq -r '.url')
    log "Service deployed successfully at: $SERVICE_URL"
    
    # Run health check
    log "Running health check..."
    for i in {1..30}; do
        if curl -f "$SERVICE_URL/healthz" > /dev/null 2>&1; then
            log "Health check passed"
            break
        fi
        if [ $i -eq 30 ]; then
            error "Health check failed after 30 attempts"
            exit 1
        fi
        sleep 10
    done
}

# Configure environment variables
configure_environment() {
    log "Configuring environment variables..."
    
    # Set production environment variables
    nf service env set backend NODE_ENV=production
    nf service env set backend PORT=3000
    
    # Set database URLs (these should be provided by Northflank)
    MONGODB_URL=$(nf database get mongodb --output json | jq -r '.connectionString')
    REDIS_URL=$(nf database get redis --output json | jq -r '.connectionString')
    
    nf service env set backend MONGODB_URI="$MONGODB_URL"
    nf service env set backend REDIS_URL="$REDIS_URL"
    
    # Set CORS origin
    nf service env set backend CORS_ORIGIN="https://halobuzz.com,https://admin.halobuzz.com,https://mobile.halobuzz.com"
    
    # Set JWT secrets (these should be generated securely)
    nf service env set backend JWT_SECRET="$(openssl rand -hex 64)"
    nf service env set backend JWT_REFRESH_SECRET="$(openssl rand -hex 64)"
    nf service env set backend ENCRYPTION_KEY="$(openssl rand -hex 32)"
    
    # Set other required environment variables
    nf service env set backend FRONTEND_URL="https://halobuzz.com"
    nf service env set backend API_BASE_URL="https://api.halobuzz.com"
    
    log "Environment variables configured"
}

# Run post-deployment tests
run_post_deployment_tests() {
    log "Running post-deployment tests..."
    
    SERVICE_URL=$(nf service get backend --output json | jq -r '.url')
    
    # Test health endpoint
    log "Testing health endpoint..."
    curl -f "$SERVICE_URL/healthz" || {
        error "Health endpoint test failed"
        exit 1
    }
    
    # Test API endpoints
    log "Testing API endpoints..."
    curl -f "$SERVICE_URL/api/v1/monitoring/health" || {
        error "API health endpoint test failed"
        exit 1
    }
    
    # Test metrics endpoint
    log "Testing metrics endpoint..."
    curl -f "$SERVICE_URL/metrics" || {
        error "Metrics endpoint test failed"
        exit 1
    }
    
    log "Post-deployment tests passed"
}

# Main execution
main() {
    log "Starting HaloBuzz production deployment to Northflank..."
    
    check_prerequisites
    build_application
    create_dockerfile
    create_northflank_config
    deploy_to_northflank
    configure_environment
    run_post_deployment_tests
    
    log "Production deployment completed successfully!"
    log "Service URL: $(nf service get backend --output json | jq -r '.url')"
}

# Show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -p, --project NAME     Project name (default: halobuzz-backend)"
    echo "  -e, --env ENV          Environment (default: production)"
    echo "  -r, --region REGION    Region (default: us-east-1)"
    echo "  --help                 Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Deploy with defaults"
    echo "  $0 --project my-project               # Deploy to custom project"
    echo "  $0 --env staging                     # Deploy to staging"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--project)
            PROJECT_NAME="$2"
            shift 2
            ;;
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -r|--region)
            REGION="$2"
            shift 2
            ;;
        --help)
            show_usage
            exit 0
            ;;
        -*)
            error "Unknown option $1"
            show_usage
            exit 1
            ;;
        *)
            error "Unknown argument $1"
            show_usage
            exit 1
            ;;
    esac
done

# Run main function
main "$@"

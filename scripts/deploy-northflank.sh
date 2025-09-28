#!/bin/bash

# HaloBuzz Northflank Deployment Script
# This script helps automate the deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="halobuzz"
BACKEND_SERVICE="halo-api"
AI_SERVICE="halo-ai-engine"
ADMIN_SERVICE="halo-admin"

# Functions
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check if environment file exists
    if [ ! -f "env.northflank.template" ]; then
        print_error "Environment template not found. Please ensure env.northflank.template exists."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

build_images() {
    print_status "Building Docker images..."
    
    # Build Backend API
    print_status "Building Backend API image..."
    docker build -f backend/Dockerfile.prod -t halobuzz-backend ./backend
    
    # Build AI Engine
    print_status "Building AI Engine image..."
    docker build -f ai-engine/Dockerfile.prod -t halobuzz-ai ./ai-engine
    
    # Build Admin Dashboard
    print_status "Building Admin Dashboard image..."
    docker build -f admin/Dockerfile.prod -t halobuzz-admin ./admin
    
    print_success "All Docker images built successfully"
}

test_images() {
    print_status "Testing Docker images..."
    
    # Test Backend API
    print_status "Testing Backend API image..."
    docker run --rm halobuzz-backend node --version
    
    # Test AI Engine
    print_status "Testing AI Engine image..."
    docker run --rm halobuzz-ai node --version
    
    # Test Admin Dashboard
    print_status "Testing Admin Dashboard image..."
    docker run --rm halobuzz-admin node --version
    
    print_success "All Docker images tested successfully"
}

check_environment() {
    print_status "Checking environment configuration..."
    
    if [ ! -f ".env.northflank" ]; then
        print_warning "Environment file .env.northflank not found"
        print_status "Creating from template..."
        cp env.northflank.template .env.northflank
        print_warning "Please edit .env.northflank with your actual values before deploying"
        return 1
    fi
    
    # Check for required variables
    required_vars=("MONGODB_URI" "REDIS_URL" "JWT_SECRET" "OPENAI_API_KEY")
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" .env.northflank || grep -q "^${var}=your-" .env.northflank; then
            print_error "Required environment variable ${var} is not set or still has template value"
            return 1
        fi
    done
    
    print_success "Environment configuration looks good"
    return 0
}

deploy_instructions() {
    print_status "Deployment Instructions:"
    echo ""
    echo "1. Go to your Northflank dashboard"
    echo "2. Create three new services:"
    echo "   - ${BACKEND_SERVICE} (Backend API)"
    echo "   - ${AI_SERVICE} (AI Engine)"
    echo "   - ${ADMIN_SERVICE} (Admin Dashboard)"
    echo ""
    echo "3. For each service:"
    echo "   - Set build type to 'Dockerfile'"
    echo "   - Use the appropriate Dockerfile.prod"
    echo "   - Set the correct build context"
    echo "   - Configure ports and environment variables"
    echo ""
    echo "4. Deploy in this order:"
    echo "   - First: ${AI_SERVICE}"
    echo "   - Second: ${BACKEND_SERVICE}"
    echo "   - Third: ${ADMIN_SERVICE}"
    echo ""
    echo "5. Monitor health checks and logs"
    echo ""
    echo "For detailed instructions, see: NORTHFLANK_DEPLOYMENT_GUIDE.md"
}

health_check() {
    print_status "Performing health checks..."
    
    # This would require the services to be running
    # For now, just show the expected health check URLs
    echo ""
    echo "Expected health check URLs:"
    echo "- Backend API: https://${BACKEND_SERVICE}.your-project.northflank.app/api/v1/monitoring/health"
    echo "- AI Engine: https://${AI_SERVICE}.your-project.northflank.app/health"
    echo "- Admin Dashboard: https://${ADMIN_SERVICE}.your-project.northflank.app/api/health"
    echo ""
    echo "Test with:"
    echo "curl -f https://your-service-url/health-endpoint"
}

cleanup() {
    print_status "Cleaning up..."
    
    # Remove local images to save space
    docker rmi halobuzz-backend halobuzz-ai halobuzz-admin 2>/dev/null || true
    
    print_success "Cleanup completed"
}

# Main execution
main() {
    echo "🚀 HaloBuzz Northflank Deployment Script"
    echo "========================================"
    echo ""
    
    # Parse command line arguments
    case "${1:-}" in
        "build")
            check_prerequisites
            build_images
            test_images
            ;;
        "check")
            check_prerequisites
            check_environment
            ;;
        "deploy")
            check_prerequisites
            if check_environment; then
                build_images
                test_images
                deploy_instructions
            else
                print_error "Environment check failed. Please fix environment variables first."
                exit 1
            fi
            ;;
        "health")
            health_check
            ;;
        "cleanup")
            cleanup
            ;;
        *)
            echo "Usage: $0 {build|check|deploy|health|cleanup}"
            echo ""
            echo "Commands:"
            echo "  build   - Build all Docker images"
            echo "  check   - Check prerequisites and environment"
            echo "  deploy  - Full deployment preparation"
            echo "  health  - Show health check information"
            echo "  cleanup - Clean up local Docker images"
            echo ""
            echo "Examples:"
            echo "  $0 build    # Build images only"
            echo "  $0 check   # Check environment"
            echo "  $0 deploy  # Full deployment prep"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"

#!/bin/bash

# HaloBuzz Platform Setup Script
# This script sets up the complete HaloBuzz platform

set -e

echo "🚀 Welcome to HaloBuzz Platform Setup!"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}$1${NC}"
}

# Check if Node.js is installed
check_nodejs() {
    print_status "Checking Node.js installation..."
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node -v)"
        exit 1
    fi
    
    print_status "Node.js $(node -v) is installed ✓"
}

# Check if npm is installed
check_npm() {
    print_status "Checking npm installation..."
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed."
        exit 1
    fi
    
    print_status "npm $(npm -v) is installed ✓"
}

# Check if MongoDB is installed
check_mongodb() {
    print_status "Checking MongoDB installation..."
    if ! command -v mongod &> /dev/null; then
        print_warning "MongoDB is not installed. Please install MongoDB or use MongoDB Atlas."
        print_warning "You can install MongoDB from: https://docs.mongodb.com/manual/installation/"
    else
        print_status "MongoDB is installed ✓"
    fi
}

# Check if Redis is installed
check_redis() {
    print_status "Checking Redis installation..."
    if ! command -v redis-server &> /dev/null; then
        print_warning "Redis is not installed. Please install Redis or use Redis Cloud."
        print_warning "You can install Redis from: https://redis.io/download"
    else
        print_status "Redis is installed ✓"
    fi
}

# Check if Expo CLI is installed
check_expo() {
    print_status "Checking Expo CLI installation..."
    if ! command -v expo &> /dev/null; then
        print_status "Installing Expo CLI..."
        npm install -g @expo/cli
    else
        print_status "Expo CLI is installed ✓"
    fi
}

# Install dependencies for all packages
install_dependencies() {
    print_header "Installing Dependencies"
    
    # Root dependencies
    print_status "Installing root dependencies..."
    npm install
    
    # Backend dependencies
    print_status "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    
    # Mobile dependencies
    print_status "Installing mobile dependencies..."
    cd mobile
    npm install
    cd ..
    
    # AI Engine dependencies
    print_status "Installing AI engine dependencies..."
    cd ai-engine
    npm install
    cd ..
    
    # Web Admin dependencies (if exists)
    if [ -d "web-admin" ]; then
        print_status "Installing web admin dependencies..."
        cd web-admin
        npm install
        cd ..
    fi
}

# Create environment files
setup_environment() {
    print_header "Setting Up Environment Files"
    
    # Backend environment
    if [ ! -f "backend/.env" ]; then
        print_status "Creating backend environment file..."
        cp backend/env.example backend/.env
        print_warning "Please update backend/.env with your configuration"
    else
        print_status "Backend environment file already exists"
    fi
    
    # Mobile environment
    if [ ! -f "mobile/.env" ]; then
        print_status "Creating mobile environment file..."
        cat > mobile/.env << EOF
# HaloBuzz Mobile App Environment Variables
API_BASE_URL=http://localhost:3000/api/v1
SOCKET_URL=http://localhost:3000
AGORA_APP_ID=your-agora-app-id
STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
GOOGLE_CLIENT_ID=your-google-client-id
FACEBOOK_APP_ID=your-facebook-app-id
APPLE_CLIENT_ID=your-apple-client-id
EOF
        print_warning "Please update mobile/.env with your configuration"
    else
        print_status "Mobile environment file already exists"
    fi
    
    # AI Engine environment
    if [ ! -f "ai-engine/.env" ]; then
        print_status "Creating AI engine environment file..."
        cat > ai-engine/.env << EOF
# HaloAI Engine Environment Variables
NODE_ENV=development
PORT=3001
OPENAI_API_KEY=your-openai-api-key
TENSORFLOW_MODEL_PATH=./models
REDIS_URL=redis://localhost:6379
MONGODB_URI=mongodb://localhost:27017/halobuzz
EOF
        print_warning "Please update ai-engine/.env with your configuration"
    else
        print_status "AI engine environment file already exists"
    fi
}

# Create necessary directories
create_directories() {
    print_header "Creating Directories"
    
    # Backend directories
    mkdir -p backend/logs
    mkdir -p backend/uploads
    mkdir -p backend/uploads/avatars
    mkdir -p backend/uploads/reels
    mkdir -p backend/uploads/thumbnails
    mkdir -p backend/uploads/kyc
    
    # AI Engine directories
    mkdir -p ai-engine/models
    mkdir -p ai-engine/logs
    mkdir -p ai-engine/temp
    
    # Mobile directories
    mkdir -p mobile/assets
    mkdir -p mobile/assets/images
    mkdir -p mobile/assets/icons
    mkdir -p mobile/assets/animations
    
    print_status "Directories created successfully ✓"
}

# Build TypeScript projects
build_projects() {
    print_header "Building Projects"
    
    # Build backend
    print_status "Building backend..."
    cd backend
    npm run build
    cd ..
    
    # Build AI engine
    print_status "Building AI engine..."
    cd ai-engine
    npm run build
    cd ..
    
    print_status "Build completed successfully ✓"
}

# Setup database
setup_database() {
    print_header "Setting Up Database"
    
    print_status "Starting MongoDB (if installed locally)..."
    if command -v mongod &> /dev/null; then
        # Start MongoDB in background
        mongod --fork --logpath /tmp/mongod.log --dbpath /tmp/mongodb
        print_status "MongoDB started ✓"
    else
        print_warning "MongoDB not found. Please ensure MongoDB is running or update your connection string."
    fi
    
    print_status "Starting Redis (if installed locally)..."
    if command -v redis-server &> /dev/null; then
        # Start Redis in background
        redis-server --daemonize yes
        print_status "Redis started ✓"
    else
        print_warning "Redis not found. Please ensure Redis is running or update your connection string."
    fi
}

# Run database migrations and seeders
run_database_setup() {
    print_header "Running Database Setup"
    
    print_status "Running database migrations..."
    cd backend
    npm run migrate
    cd ..
    
    print_status "Seeding database..."
    cd backend
    npm run seed
    cd ..
    
    print_status "Database setup completed ✓"
}

# Create startup scripts
create_startup_scripts() {
    print_header "Creating Startup Scripts"
    
    # Development startup script
    cat > start-dev.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting HaloBuzz Development Environment..."

# Start backend
echo "Starting Backend Server..."
cd backend && npm run dev &

# Start AI engine
echo "Starting AI Engine..."
cd ai-engine && npm run dev &

# Start mobile (Expo)
echo "Starting Mobile App..."
cd mobile && npm start &

echo "✅ All services started!"
echo "Backend: http://localhost:3000"
echo "AI Engine: http://localhost:3001"
echo "Mobile: Expo DevTools will open automatically"
echo ""
echo "Press Ctrl+C to stop all services"
wait
EOF
    chmod +x start-dev.sh
    
    # Production startup script
    cat > start-prod.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting HaloBuzz Production Environment..."

# Build all projects
echo "Building projects..."
npm run build

# Start backend
echo "Starting Backend Server..."
cd backend && npm start &

# Start AI engine
echo "Starting AI Engine..."
cd ai-engine && npm start &

echo "✅ Production services started!"
echo "Backend: http://localhost:3000"
echo "AI Engine: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all services"
wait
EOF
    chmod +x start-prod.sh
    
    print_status "Startup scripts created ✓"
}

# Display next steps
show_next_steps() {
    print_header "🎉 Setup Complete!"
    echo ""
    echo "Next Steps:"
    echo "1. Update environment files with your API keys and configuration:"
    echo "   - backend/.env"
    echo "   - mobile/.env"
    echo "   - ai-engine/.env"
    echo ""
    echo "2. Required API Keys and Services:"
    echo "   - Agora (for live streaming)"
    echo "   - OpenAI (for AI features)"
    echo "   - AWS S3 (for file storage)"
    echo "   - Stripe (for payments)"
    echo "   - eSewa/Khalti (for Nepal payments)"
    echo "   - Twilio (for SMS)"
    echo "   - Firebase (for push notifications)"
    echo ""
    echo "3. Start development environment:"
    echo "   ./start-dev.sh"
    echo ""
    echo "4. Start production environment:"
    echo "   ./start-prod.sh"
    echo ""
    echo "5. Access the application:"
    echo "   - Backend API: http://localhost:3000"
    echo "   - AI Engine: http://localhost:3001"
    echo "   - Mobile: Use Expo Go app or run on simulator"
    echo ""
    echo "📚 Documentation:"
    echo "   - README.md - Main documentation"
    echo "   - docs/ - Detailed documentation"
    echo ""
    echo "🆘 Support:"
    echo "   - GitHub Issues: https://github.com/halobuzz/halobuzz-platform/issues"
    echo "   - Discord: https://discord.gg/halobuzz"
    echo ""
}

# Main setup function
main() {
    print_header "HaloBuzz Platform Setup"
    echo "This script will set up the complete HaloBuzz platform."
    echo ""
    
    # Check prerequisites
    check_nodejs
    check_npm
    check_mongodb
    check_redis
    check_expo
    
    # Install dependencies
    install_dependencies
    
    # Setup environment
    setup_environment
    
    # Create directories
    create_directories
    
    # Build projects
    build_projects
    
    # Setup database
    setup_database
    
    # Run database setup
    run_database_setup
    
    # Create startup scripts
    create_startup_scripts
    
    # Show next steps
    show_next_steps
}

# Run main function
main "$@"

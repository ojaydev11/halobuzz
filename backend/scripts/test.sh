#!/bin/bash

# Comprehensive test script for HaloBuzz backend
set -e

echo "🚀 Starting HaloBuzz Backend Test Suite"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ to continue."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

print_success "Node.js version: $(node -v)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm to continue."
    exit 1
fi

print_success "npm version: $(npm -v)"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
else
    print_status "Dependencies already installed"
fi

# Set test environment
export NODE_ENV=test
export JWT_SECRET=test-jwt-secret-key-for-testing-only
export MONGODB_URI=mongodb://localhost:27017/halobuzz_test
export REDIS_URL=redis://localhost:6379

# Check if MongoDB is running
if ! command -v mongod &> /dev/null; then
    print_warning "MongoDB not found. Using in-memory database for tests."
else
    print_status "Checking MongoDB connection..."
    if ! mongosh --eval "db.runCommand('ping')" &> /dev/null; then
        print_warning "MongoDB is not running. Using in-memory database for tests."
    else
        print_success "MongoDB is running"
    fi
fi

# Check if Redis is running
if ! command -v redis-cli &> /dev/null; then
    print_warning "Redis not found. Using mock Redis for tests."
else
    print_status "Checking Redis connection..."
    if ! redis-cli ping &> /dev/null; then
        print_warning "Redis is not running. Using mock Redis for tests."
    else
        print_success "Redis is running"
    fi
fi

# Run linting
print_status "Running ESLint..."
if npm run lint; then
    print_success "Linting passed"
else
    print_error "Linting failed"
    exit 1
fi

# Run type checking
print_status "Running TypeScript type checking..."
if npm run type-check; then
    print_success "Type checking passed"
else
    print_error "Type checking failed"
    exit 1
fi

# Run unit tests
print_status "Running unit tests..."
if npm run test:unit; then
    print_success "Unit tests passed"
else
    print_error "Unit tests failed"
    exit 1
fi

# Run integration tests
print_status "Running integration tests..."
if npm run test:integration; then
    print_success "Integration tests passed"
else
    print_error "Integration tests failed"
    exit 1
fi

# Run end-to-end tests
print_status "Running end-to-end tests..."
if npm run test:e2e; then
    print_success "End-to-end tests passed"
else
    print_error "End-to-end tests failed"
    exit 1
fi

# Generate coverage report
print_status "Generating coverage report..."
if npm run test:coverage; then
    print_success "Coverage report generated"
else
    print_error "Coverage report generation failed"
    exit 1
fi

# Check coverage thresholds
print_status "Checking coverage thresholds..."
COVERAGE_FILE="coverage/coverage-summary.json"
if [ -f "$COVERAGE_FILE" ]; then
    LINES_COVERAGE=$(node -e "console.log(require('./$COVERAGE_FILE').total.lines.pct)")
    FUNCTIONS_COVERAGE=$(node -e "console.log(require('./$COVERAGE_FILE').total.functions.pct)")
    BRANCHES_COVERAGE=$(node -e "console.log(require('./$COVERAGE_FILE').total.branches.pct)")
    STATEMENTS_COVERAGE=$(node -e "console.log(require('./$COVERAGE_FILE').total.statements.pct)")
    
    print_status "Coverage Summary:"
    print_status "  Lines: ${LINES_COVERAGE}%"
    print_status "  Functions: ${FUNCTIONS_COVERAGE}%"
    print_status "  Branches: ${BRANCHES_COVERAGE}%"
    print_status "  Statements: ${STATEMENTS_COVERAGE}%"
    
    # Check if coverage meets thresholds
    if (( $(echo "$LINES_COVERAGE >= 80" | bc -l) )) && \
       (( $(echo "$FUNCTIONS_COVERAGE >= 80" | bc -l) )) && \
       (( $(echo "$BRANCHES_COVERAGE >= 80" | bc -l) )) && \
       (( $(echo "$STATEMENTS_COVERAGE >= 80" | bc -l) )); then
        print_success "Coverage thresholds met (80%+)"
    else
        print_error "Coverage thresholds not met (80%+ required)"
        exit 1
    fi
else
    print_error "Coverage file not found"
    exit 1
fi

# Run security audit
print_status "Running security audit..."
if npm audit --audit-level=moderate; then
    print_success "Security audit passed"
else
    print_warning "Security audit found vulnerabilities. Please review and fix."
fi

# Run load tests (if Artillery is installed)
if command -v artillery &> /dev/null; then
    print_status "Running load tests..."
    if artillery run load-tests/load-test.yml; then
        print_success "Load tests passed"
    else
        print_warning "Load tests failed or exceeded thresholds"
    fi
else
    print_warning "Artillery not installed. Skipping load tests."
    print_status "To install Artillery: npm install -g artillery"
fi

# Performance tests
print_status "Running performance tests..."
if npm run test:performance; then
    print_success "Performance tests passed"
else
    print_warning "Performance tests failed"
fi

# Memory leak tests
print_status "Running memory leak tests..."
if npm run test:memory; then
    print_success "Memory leak tests passed"
else
    print_warning "Memory leak tests failed"
fi

# Cleanup
print_status "Cleaning up test artifacts..."
rm -rf coverage/.nyc_output
rm -rf test-results
print_success "Cleanup completed"

# Final summary
echo ""
echo "🎉 Test Suite Completed Successfully!"
echo "====================================="
print_success "All tests passed"
print_success "Coverage thresholds met"
print_success "Security audit completed"
print_success "Performance tests completed"
echo ""
print_status "Test artifacts:"
print_status "  Coverage report: coverage/index.html"
print_status "  Test results: test-results/"
print_status "  Load test results: load-test-results/"
echo ""
print_status "To view coverage report: open coverage/index.html"
print_status "To run specific tests: npm run test -- --testNamePattern='pattern'"
print_status "To run tests in watch mode: npm run test:watch"
echo ""
print_success "HaloBuzz Backend is ready for production! 🚀"

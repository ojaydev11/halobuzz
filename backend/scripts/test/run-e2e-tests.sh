#!/bin/bash

# Comprehensive E2E Test Runner
# Runs all E2E tests with proper setup and teardown

set -e

# Configuration
BASE_URL="${E2E_BASE_URL:-http://localhost:3000}"
API_BASE_URL="${E2E_API_BASE_URL:-http://localhost:3000/api/v1}"
TEST_ENV="${E2E_TEST_ENV:-staging}"
HEADLESS="${E2E_HEADLESS:-true}"
PARALLEL="${E2E_PARALLEL:-true}"
RETRIES="${E2E_RETRIES:-2}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
        exit 1
    fi
    
    # Check if Playwright is installed
    if ! npm list @playwright/test &> /dev/null; then
        warn "Playwright not found, installing..."
        npm install @playwright/test
        npx playwright install
    fi
    
    log "Prerequisites check completed"
}

# Setup test environment
setup_test_env() {
    log "Setting up test environment..."
    
    # Create test data directory
    mkdir -p tests/fixtures
    
    # Create test images if they don't exist
    if [ ! -f "tests/fixtures/avatar.jpg" ]; then
        log "Creating test avatar image..."
        # Create a simple test image (1x1 pixel JPEG)
        echo -e "\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xff\xc0\x00\x11\x08\x00\x01\x00\x01\x01\x01\x11\x00\x02\x11\x01\x03\x11\x01\xff\xc4\x00\x14\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x08\xff\xc4\x00\x14\x10\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xda\x00\x0c\x03\x01\x00\x02\x11\x03\x11\x00\x3f\x00\xaa\xff\xd9" > tests/fixtures/avatar.jpg
    fi
    
    # Set environment variables
    export E2E_BASE_URL="$BASE_URL"
    export E2E_API_BASE_URL="$API_BASE_URL"
    export E2E_TEST_ENV="$TEST_ENV"
    export E2E_HEADLESS="$HEADLESS"
    export E2E_PARALLEL="$PARALLEL"
    export E2E_RETRIES="$RETRIES"
    
    log "Test environment setup completed"
}

# Start application server
start_server() {
    log "Starting application server..."
    
    # Check if server is already running
    if curl -s "$BASE_URL/health" > /dev/null 2>&1; then
        log "Server is already running at $BASE_URL"
        return 0
    fi
    
    # Start server in background
    npm run start &
    SERVER_PID=$!
    
    # Wait for server to start
    log "Waiting for server to start..."
    for i in {1..30}; do
        if curl -s "$BASE_URL/health" > /dev/null 2>&1; then
            log "Server started successfully"
            return 0
        fi
        sleep 2
    done
    
    error "Server failed to start within 60 seconds"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
}

# Run E2E tests
run_tests() {
    log "Running E2E tests..."
    
    # Create test results directory
    mkdir -p test-results
    
    # Run tests with Playwright
    npx playwright test \
        --config=playwright.config.ts \
        --reporter=html,json,junit \
        --output-dir=test-results \
        --retries="$RETRIES" \
        ${HEADLESS:+--headed} \
        ${PARALLEL:+--workers=1} \
        "$@"
    
    local test_exit_code=$?
    
    if [ $test_exit_code -eq 0 ]; then
        log "All tests passed successfully"
    else
        error "Some tests failed"
    fi
    
    return $test_exit_code
}

# Generate test report
generate_report() {
    log "Generating test report..."
    
    # Check if test results exist
    if [ ! -f "test-results/results.json" ]; then
        warn "No test results found"
        return 1
    fi
    
    # Generate HTML report
    npx playwright show-report test-results
    
    # Generate summary
    local total_tests=$(jq '.stats.total' test-results/results.json 2>/dev/null || echo "0")
    local passed_tests=$(jq '.stats.passed' test-results/results.json 2>/dev/null || echo "0")
    local failed_tests=$(jq '.stats.failed' test-results/results.json 2>/dev/null || echo "0")
    
    log "Test Summary:"
    log "  Total tests: $total_tests"
    log "  Passed: $passed_tests"
    log "  Failed: $failed_tests"
    
    # Save summary to file
    echo "Total tests: $total_tests" > test-results/summary.txt
    echo "Passed: $passed_tests" >> test-results/summary.txt
    echo "Failed: $failed_tests" >> test-results/summary.txt
    echo "Timestamp: $(date)" >> test-results/summary.txt
}

# Cleanup test environment
cleanup() {
    log "Cleaning up test environment..."
    
    # Stop server if we started it
    if [ ! -z "$SERVER_PID" ]; then
        log "Stopping application server..."
        kill $SERVER_PID 2>/dev/null || true
        wait $SERVER_PID 2>/dev/null || true
    fi
    
    # Clean up test data
    if [ -f "test-results/cleanup.sh" ]; then
        log "Running cleanup script..."
        bash test-results/cleanup.sh
    fi
    
    log "Cleanup completed"
}

# Handle script interruption
trap cleanup EXIT INT TERM

# Main execution
main() {
    log "Starting E2E test suite..."
    log "Configuration:"
    log "  Base URL: $BASE_URL"
    log "  API Base URL: $API_BASE_URL"
    log "  Test Environment: $TEST_ENV"
    log "  Headless: $HEADLESS"
    log "  Parallel: $PARALLEL"
    log "  Retries: $RETRIES"
    
    # Run setup steps
    check_prerequisites
    setup_test_env
    start_server
    
    # Run tests
    run_tests
    local test_exit_code=$?
    
    # Generate report
    generate_report
    
    # Return test exit code
    exit $test_exit_code
}

# Show usage
show_usage() {
    echo "Usage: $0 [OPTIONS] [TEST_PATTERN]"
    echo ""
    echo "Options:"
    echo "  -u, --url URL          Base URL for tests (default: http://localhost:3000)"
    echo "  -a, --api-url URL      API Base URL for tests (default: http://localhost:3000/api/v1)"
    echo "  -e, --env ENV          Test environment (default: staging)"
    echo "  -h, --headless         Run tests in headless mode (default: true)"
    echo "  -p, --parallel         Run tests in parallel (default: true)"
    echo "  -r, --retries NUM      Number of retries for failed tests (default: 2)"
    echo "  --help                 Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Run all tests"
    echo "  $0 --url https://staging.halobuzz.com # Run tests against staging"
    echo "  $0 --headless false                   # Run tests with browser visible"
    echo "  $0 user-journey.spec.ts              # Run specific test file"
    echo "  $0 --grep \"User Registration\"        # Run tests matching pattern"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--url)
            BASE_URL="$2"
            shift 2
            ;;
        -a|--api-url)
            API_BASE_URL="$2"
            shift 2
            ;;
        -e|--env)
            TEST_ENV="$2"
            shift 2
            ;;
        -h|--headless)
            HEADLESS="false"
            shift
            ;;
        -p|--parallel)
            PARALLEL="false"
            shift
            ;;
        -r|--retries)
            RETRIES="$2"
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
            # Pass remaining arguments to Playwright
            break
            ;;
    esac
done

# Run main function
main "$@"

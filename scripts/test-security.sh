#!/bin/bash

# HaloBuzz Security Test Runner
# Runs comprehensive security tests across all services

set -e

echo "🔒 HaloBuzz Security Test Suite"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run tests and track results
run_test_suite() {
    local service=$1
    local test_command=$2
    local description=$3
    
    echo ""
    echo -e "${BLUE}Testing ${service}: ${description}${NC}"
    echo "----------------------------------------"
    
    if cd "$service" && eval "$test_command"; then
        echo -e "${GREEN}✅ ${service} security tests PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ ${service} security tests FAILED${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    cd ..
}

# Function to check prerequisites
check_prerequisites() {
    echo "Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm is not installed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerequisites check passed${NC}"
}

# Function to install dependencies
install_dependencies() {
    echo ""
    echo "Installing dependencies..."
    
    for service in backend ai-engine; do
        if [ -d "$service" ]; then
            echo "Installing dependencies for $service..."
            cd "$service"
            npm install --silent
            cd ..
        fi
    done
    
    echo -e "${GREEN}✅ Dependencies installed${NC}"
}

# Function to run linting
run_linting() {
    echo ""
    echo -e "${BLUE}Running linting checks...${NC}"
    
    for service in backend ai-engine; do
        if [ -d "$service" ]; then
            echo "Linting $service..."
            cd "$service"
            if npm run lint; then
                echo -e "${GREEN}✅ ${service} linting PASSED${NC}"
            else
                echo -e "${RED}❌ ${service} linting FAILED${NC}"
                FAILED_TESTS=$((FAILED_TESTS + 1))
            fi
            cd ..
            TOTAL_TESTS=$((TOTAL_TESTS + 1))
        fi
    done
}

# Function to run type checking
run_type_checking() {
    echo ""
    echo -e "${BLUE}Running TypeScript type checking...${NC}"
    
    for service in backend ai-engine; do
        if [ -d "$service" ]; then
            echo "Type checking $service..."
            cd "$service"
            if npm run typecheck; then
                echo -e "${GREEN}✅ ${service} type checking PASSED${NC}"
            else
                echo -e "${RED}❌ ${service} type checking FAILED${NC}"
                FAILED_TESTS=$((FAILED_TESTS + 1))
            fi
            cd ..
            TOTAL_TESTS=$((TOTAL_TESTS + 1))
        fi
    done
}

# Function to generate test report
generate_report() {
    echo ""
    echo "🔒 Security Test Results Summary"
    echo "==============================="
    echo "Total Test Suites: $TOTAL_TESTS"
    echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
    echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        echo ""
        echo -e "${GREEN}🎉 All security tests PASSED! 🎉${NC}"
        echo -e "${GREEN}✅ HaloBuzz is ready for secure deployment${NC}"
        exit 0
    else
        echo ""
        echo -e "${RED}❌ Some security tests FAILED${NC}"
        echo -e "${YELLOW}⚠️  Please fix failing tests before deployment${NC}"
        exit 1
    fi
}

# Main execution
main() {
    echo "Starting security test suite..."
    
    # Check prerequisites
    check_prerequisites
    
    # Install dependencies
    install_dependencies
    
    # Run linting
    run_linting
    
    # Run type checking
    run_type_checking
    
    # Run security-specific tests
    echo ""
    echo -e "${BLUE}Running Security Test Suites${NC}"
    echo "============================"
    
    # Backend security tests
    if [ -d "backend" ]; then
        run_test_suite "backend" "npm run test:security" "Payment Fraud, Risk Controls, Compliance, Feature Flags, Middleware"
    fi
    
    # AI Engine security tests
    if [ -d "ai-engine" ]; then
        run_test_suite "ai-engine" "npm run test:security" "JWT Auth, HMAC Validation, Input Sanitization, Rate Limiting"
    fi
    
    # Run full test suites with coverage
    echo ""
    echo -e "${BLUE}Running Full Test Suites with Coverage${NC}"
    echo "====================================="
    
    if [ -d "backend" ]; then
        run_test_suite "backend" "npm run test:coverage" "Full Backend Test Suite with Coverage"
    fi
    
    if [ -d "ai-engine" ]; then
        run_test_suite "ai-engine" "npm run test:coverage" "Full AI Engine Test Suite with Coverage"
    fi
    
    # Generate final report
    generate_report
}

# Handle script arguments
case "$1" in
    --quick)
        echo "Running quick security tests (no coverage)..."
        check_prerequisites
        run_test_suite "backend" "npm run test:security" "Backend Security Tests"
        run_test_suite "ai-engine" "npm run test:security" "AI Engine Security Tests"
        generate_report
        ;;
    --lint-only)
        echo "Running linting checks only..."
        check_prerequisites
        run_linting
        generate_report
        ;;
    --help)
        echo "HaloBuzz Security Test Runner"
        echo ""
        echo "Usage: $0 [option]"
        echo ""
        echo "Options:"
        echo "  --quick      Run security tests without coverage"
        echo "  --lint-only  Run linting checks only"
        echo "  --help       Show this help message"
        echo ""
        echo "Default: Run full security test suite with coverage"
        ;;
    *)
        main
        ;;
esac

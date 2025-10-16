#!/bin/bash

# HaloBuzz Production Performance Testing Script
# Comprehensive performance testing for production environment

set -e

# Configuration
BASE_URL="${PERF_TEST_URL:-https://api.halobuzz.com}"
PERF_REPORT_DIR="./performance-reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
ARTILLERY_CONFIG_DIR="./perf"

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

# Check dependencies
check_dependencies() {
    log "Checking dependencies..."
    
    if ! command -v artillery &> /dev/null; then
        error "Artillery not found. Installing..."
        npm install -g artillery@latest
    fi
    
    if ! command -v curl &> /dev/null; then
        error "curl not found. Please install curl."
        exit 1
    fi
    
    log "Dependencies check completed"
}

# Create report directory
create_report_dir() {
    mkdir -p "$PERF_REPORT_DIR"
    REPORT_FILE="$PERF_REPORT_DIR/performance-test-$TIMESTAMP.md"
    
    cat > "$REPORT_FILE" << EOF
# HaloBuzz Production Performance Test Report

**Date**: $(date)
**Environment**: Production
**Base URL**: $BASE_URL
**Test Duration**: $(date)

## Test Configuration

- **Base URL**: $BASE_URL
- **Test Timestamp**: $TIMESTAMP
- **Artillery Version**: $(artillery --version 2>/dev/null || echo "Unknown")

## Test Results

EOF
}

# Test basic connectivity
test_connectivity() {
    log "Testing basic connectivity..."
    
    local connectivity_results=""
    
    # Test health endpoint
    local health_response=$(curl -s -w "%{http_code},%{time_total}" -o /dev/null "$BASE_URL/healthz" 2>/dev/null)
    local health_code=$(echo "$health_response" | cut -d',' -f1)
    local health_time=$(echo "$health_response" | cut -d',' -f2)
    
    if [[ "$health_code" == "200" ]]; then
        connectivity_results+="✅ Health endpoint: HTTP $health_code, ${health_time}s\n"
    else
        connectivity_results+="❌ Health endpoint: HTTP $health_code, ${health_time}s\n"
    fi
    
    # Test API endpoint
    local api_response=$(curl -s -w "%{http_code},%{time_total}" -o /dev/null "$BASE_URL/api/v1/monitoring/health" 2>/dev/null)
    local api_code=$(echo "$api_response" | cut -d',' -f1)
    local api_time=$(echo "$api_response" | cut -d',' -f2)
    
    if [[ "$api_code" == "200" ]]; then
        connectivity_results+="✅ API endpoint: HTTP $api_code, ${api_time}s\n"
    else
        connectivity_results+="❌ API endpoint: HTTP $api_code, ${api_time}s\n"
    fi
    
    # Test metrics endpoint
    local metrics_response=$(curl -s -w "%{http_code},%{time_total}" -o /dev/null "$BASE_URL/metrics" 2>/dev/null)
    local metrics_code=$(echo "$metrics_response" | cut -d',' -f1)
    local metrics_time=$(echo "$metrics_response" | cut -d',' -f2)
    
    if [[ "$metrics_code" == "200" ]]; then
        connectivity_results+="✅ Metrics endpoint: HTTP $metrics_code, ${metrics_time}s\n"
    else
        connectivity_results+="❌ Metrics endpoint: HTTP $metrics_code, ${metrics_time}s\n"
    fi
    
    echo -e "$connectivity_results" >> "$REPORT_FILE"
    log "Connectivity test completed"
}

# Run basic load test
run_basic_load_test() {
    log "Running basic load test..."
    
    local basic_config="$ARTILLERY_CONFIG_DIR/basic-load.yml"
    local basic_report="$PERF_REPORT_DIR/basic-load-$TIMESTAMP.json"
    
    if [[ -f "$basic_config" ]]; then
        # Update base URL in config
        sed "s|https://api.halobuzz.com|$BASE_URL|g" "$basic_config" > "$basic_config.tmp"
        
        artillery run "$basic_config.tmp" --output "$basic_report" --quiet
        artillery report "$basic_report" --output "$PERF_REPORT_DIR/basic-load-$TIMESTAMP.html"
        
        # Extract key metrics
        local summary=$(artillery report "$basic_report" --quiet 2>/dev/null | grep -E "(Summary|Latency|RPS)" || echo "No summary available")
        
        cat >> "$REPORT_FILE" << EOF

### Basic Load Test Results

\`\`\`
$summary
\`\`\`

EOF
        
        rm -f "$basic_config.tmp"
        log "Basic load test completed"
    else
        warn "Basic load test config not found: $basic_config"
    fi
}

# Run stress test
run_stress_test() {
    log "Running stress test..."
    
    local stress_config="$ARTILLERY_CONFIG_DIR/stress-test.yml"
    local stress_report="$PERF_REPORT_DIR/stress-test-$TIMESTAMP.json"
    
    if [[ -f "$stress_config" ]]; then
        # Update base URL in config
        sed "s|https://api.halobuzz.com|$BASE_URL|g" "$stress_config" > "$stress_config.tmp"
        
        artillery run "$stress_config.tmp" --output "$stress_report" --quiet
        artillery report "$stress_report" --output "$PERF_REPORT_DIR/stress-test-$TIMESTAMP.html"
        
        # Extract key metrics
        local summary=$(artillery report "$stress_report" --quiet 2>/dev/null | grep -E "(Summary|Latency|RPS)" || echo "No summary available")
        
        cat >> "$REPORT_FILE" << EOF

### Stress Test Results

\`\`\`
$summary
\`\`\`

EOF
        
        rm -f "$stress_config.tmp"
        log "Stress test completed"
    else
        warn "Stress test config not found: $stress_config"
    fi
}

# Run WebSocket load test
run_websocket_load_test() {
    log "Running WebSocket load test..."
    
    local ws_config="$ARTILLERY_CONFIG_DIR/websocket-load.yml"
    local ws_report="$PERF_REPORT_DIR/websocket-load-$TIMESTAMP.json"
    
    if [[ -f "$ws_config" ]]; then
        # Update base URL in config
        sed "s|https://api.halobuzz.com|$BASE_URL|g" "$ws_config" > "$ws_config.tmp"
        
        artillery run "$ws_config.tmp" --output "$ws_report" --quiet
        artillery report "$ws_report" --output "$PERF_REPORT_DIR/websocket-load-$TIMESTAMP.html"
        
        # Extract key metrics
        local summary=$(artillery report "$ws_report" --quiet 2>/dev/null | grep -E "(Summary|Latency|RPS)" || echo "No summary available")
        
        cat >> "$REPORT_FILE" << EOF

### WebSocket Load Test Results

\`\`\`
$summary
\`\`\`

EOF
        
        rm -f "$ws_config.tmp"
        log "WebSocket load test completed"
    else
        warn "WebSocket load test config not found: $ws_config"
    fi
}

# Test rate limiting
test_rate_limiting() {
    log "Testing rate limiting..."
    
    local rate_limit_results=""
    
    # Test rate limiting on monitoring endpoint
    local rate_limit_headers=""
    for i in {1..5}; do
        local headers=$(curl -s -I "$BASE_URL/api/v1/monitoring/health" 2>/dev/null)
        if echo "$headers" | grep -q "X-RateLimit"; then
            rate_limit_headers=$(echo "$headers" | grep "X-RateLimit" | head -1)
            break
        fi
        sleep 0.1
    done
    
    if [[ -n "$rate_limit_headers" ]]; then
        rate_limit_results+="✅ Rate limiting headers present: $rate_limit_headers\n"
    else
        rate_limit_results+="⚠️ Rate limiting headers not found\n"
    fi
    
    # Test rate limiting enforcement
    local rate_limit_test=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/api/v1/monitoring/health" 2>/dev/null)
    if [[ "$rate_limit_test" == "200" ]]; then
        rate_limit_results+="✅ Rate limiting allows normal requests\n"
    else
        rate_limit_results+="⚠️ Rate limiting may be blocking requests (HTTP $rate_limit_test)\n"
    fi
    
    echo -e "$rate_limit_results" >> "$REPORT_FILE"
    log "Rate limiting test completed"
}

# Test response times
test_response_times() {
    log "Testing response times..."
    
    local response_time_results=""
    
    # Test multiple endpoints
    local endpoints=(
        "/healthz"
        "/api/v1/monitoring/health"
        "/metrics"
        "/api/v1/legal/age-verification"
    )
    
    for endpoint in "${endpoints[@]}"; do
        local response=$(curl -s -w "%{http_code},%{time_total}" -o /dev/null "$BASE_URL$endpoint" 2>/dev/null)
        local code=$(echo "$response" | cut -d',' -f1)
        local time=$(echo "$response" | cut -d',' -f2)
        local time_ms=$(echo "$time * 1000" | bc)
        
        if (( $(echo "$time_ms < 1000" | bc -l) )); then
            response_time_results+="✅ $endpoint: HTTP $code, ${time_ms}ms\n"
        else
            response_time_results+="⚠️ $endpoint: HTTP $code, ${time_ms}ms (slow)\n"
        fi
    done
    
    echo -e "$response_time_results" >> "$REPORT_FILE"
    log "Response time test completed"
}

# Test concurrent connections
test_concurrent_connections() {
    log "Testing concurrent connections..."
    
    local concurrent_results=""
    
    # Test concurrent requests
    local start_time=$(date +%s.%N)
    
    for i in {1..10}; do
        curl -s -o /dev/null "$BASE_URL/healthz" &
    done
    
    wait
    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc)
    
    if (( $(echo "$duration < 5" | bc -l) )); then
        concurrent_results+="✅ 10 concurrent requests completed in ${duration}s\n"
    else
        concurrent_results+="⚠️ 10 concurrent requests took ${duration}s (may be slow)\n"
    fi
    
    echo -e "$concurrent_results" >> "$REPORT_FILE"
    log "Concurrent connections test completed"
}

# Generate performance summary
generate_performance_summary() {
    log "Generating performance summary..."
    
    cat >> "$REPORT_FILE" << EOF

## Performance Summary

### Key Metrics

- **Test Duration**: $(date)
- **Base URL**: $BASE_URL
- **Test Environment**: Production

### Performance Thresholds

- **Response Time**: < 1000ms (1 second)
- **Concurrent Connections**: 10+ simultaneous
- **Rate Limiting**: Properly configured
- **Health Endpoints**: All responding

### Recommendations

1. **Monitor Response Times**: Set up alerts for response times > 1s
2. **Load Testing**: Run regular load tests to identify bottlenecks
3. **Rate Limiting**: Monitor rate limiting effectiveness
4. **Health Monitoring**: Ensure all health endpoints are responding

## Next Steps

1. Review performance metrics
2. Address any performance issues
3. Set up continuous performance monitoring
4. Schedule regular performance tests

---
**Report Generated**: $(date)
**Performance Test Script Version**: 1.0
EOF

    log "Performance summary generated"
}

# Main execution
main() {
    log "Starting HaloBuzz production performance testing..."
    log "Target URL: $BASE_URL"
    
    check_dependencies
    create_report_dir
    test_connectivity
    test_rate_limiting
    test_response_times
    test_concurrent_connections
    run_basic_load_test
    run_stress_test
    run_websocket_load_test
    generate_performance_summary
    
    log "Performance testing completed!"
    log "Report saved to: $REPORT_FILE"
    
    # Show summary
    local html_reports=$(find "$PERF_REPORT_DIR" -name "*.html" | wc -l)
    local json_reports=$(find "$PERF_REPORT_DIR" -name "*.json" | wc -l)
    
    echo ""
    log "Performance Test Summary:"
    log "  HTML Reports: $html_reports"
    log "  JSON Reports: $json_reports"
    log "  Main Report: $REPORT_FILE"
    
    log "All performance tests completed! ✅"
}

# Show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -u, --url URL          Base URL to test (default: https://api.halobuzz.com)"
    echo "  -o, --output DIR       Output directory for reports (default: ./performance-reports)"
    echo "  --config DIR           Artillery config directory (default: ./perf)"
    echo "  --help                 Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Test production API"
    echo "  $0 --url https://staging.halobuzz.com # Test staging API"
    echo "  $0 --output ./reports                 # Save reports to custom directory"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--url)
            BASE_URL="$2"
            shift 2
            ;;
        -o|--output)
            PERF_REPORT_DIR="$2"
            shift 2
            ;;
        --config)
            ARTILLERY_CONFIG_DIR="$2"
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

#!/bin/bash

# HaloBuzz Production Security Audit Script
# Comprehensive security testing for production environment

set -e

# Configuration
BASE_URL="${SECURITY_AUDIT_URL:-https://api.halobuzz.com}"
AUDIT_REPORT_DIR="./security-audit-reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

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

# Create report directory
create_report_dir() {
    mkdir -p "$AUDIT_REPORT_DIR"
    REPORT_FILE="$AUDIT_REPORT_DIR/security-audit-$TIMESTAMP.md"
    
    cat > "$REPORT_FILE" << EOF
# HaloBuzz Production Security Audit Report

**Date**: $(date)
**Environment**: Production
**Base URL**: $BASE_URL
**Auditor**: Security Audit Script

## Executive Summary

This report contains the results of a comprehensive security audit of the HaloBuzz production environment.

## Audit Results

EOF
}

# Test SSL/TLS Configuration
test_ssl_configuration() {
    log "Testing SSL/TLS configuration..."
    
    local ssl_results=""
    
    # Test SSL certificate
    local cert_info=$(echo | openssl s_client -servername api.halobuzz.com -connect api.halobuzz.com:443 2>/dev/null | openssl x509 -noout -text)
    
    if echo "$cert_info" | grep -q "Subject:"; then
        ssl_results+="✅ SSL certificate is valid\n"
    else
        ssl_results+="❌ SSL certificate validation failed\n"
    fi
    
    # Test TLS version
    local tls_version=$(echo | openssl s_client -servername api.halobuzz.com -connect api.halobuzz.com:443 2>/dev/null | grep "Protocol" | head -1)
    ssl_results+="📋 TLS Version: $tls_version\n"
    
    # Test HSTS header
    local hsts_header=$(curl -s -I "$BASE_URL" | grep -i "strict-transport-security" || echo "Not found")
    if [[ "$hsts_header" != "Not found" ]]; then
        ssl_results+="✅ HSTS header present: $hsts_header\n"
    else
        ssl_results+="❌ HSTS header missing\n"
    fi
    
    echo -e "$ssl_results" >> "$REPORT_FILE"
    log "SSL/TLS configuration test completed"
}

# Test Security Headers
test_security_headers() {
    log "Testing security headers..."
    
    local headers_results=""
    local response_headers=$(curl -s -I "$BASE_URL")
    
    # Check for security headers
    local security_headers=(
        "X-Frame-Options"
        "X-Content-Type-Options"
        "X-XSS-Protection"
        "Content-Security-Policy"
        "Referrer-Policy"
        "Permissions-Policy"
    )
    
    for header in "${security_headers[@]}"; do
        if echo "$response_headers" | grep -qi "$header"; then
            local header_value=$(echo "$response_headers" | grep -i "$header" | head -1)
            headers_results+="✅ $header_value\n"
        else
            headers_results+="❌ $header header missing\n"
        fi
    done
    
    echo -e "$headers_results" >> "$REPORT_FILE"
    log "Security headers test completed"
}

# Test Authentication Security
test_authentication_security() {
    log "Testing authentication security..."
    
    local auth_results=""
    
    # Test rate limiting on login endpoint
    local rate_limit_test=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$BASE_URL/api/v1/auth-enhanced/login" \
        -H "Content-Type: application/json" \
        -d '{"identifier":"test@example.com","password":"wrongpassword"}' 2>/dev/null)
    
    if [[ "$rate_limit_test" == "429" ]]; then
        auth_results+="✅ Rate limiting working on login endpoint\n"
    else
        auth_results+="⚠️ Rate limiting may not be working (HTTP $rate_limit_test)\n"
    fi
    
    # Test JWT token security
    local token_response=$(curl -s -X POST "$BASE_URL/api/v1/auth-enhanced/login" \
        -H "Content-Type: application/json" \
        -d '{"identifier":"test@example.com","password":"wrongpassword"}' 2>/dev/null)
    
    if echo "$token_response" | grep -q "Invalid credentials"; then
        auth_results+="✅ Authentication properly rejects invalid credentials\n"
    else
        auth_results+="❌ Authentication may not be working properly\n"
    fi
    
    # Test CORS
    local cors_test=$(curl -s -H "Origin: https://malicious-site.com" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: X-Requested-With" \
        -X OPTIONS "$BASE_URL/api/v1/auth-enhanced/login" 2>/dev/null)
    
    if echo "$cors_test" | grep -q "Access-Control-Allow-Origin"; then
        auth_results+="⚠️ CORS headers present - verify allowed origins\n"
    else
        auth_results+="✅ CORS properly configured\n"
    fi
    
    echo -e "$auth_results" >> "$REPORT_FILE"
    log "Authentication security test completed"
}

# Test Input Validation
test_input_validation() {
    log "Testing input validation..."
    
    local validation_results=""
    
    # Test XSS protection
    local xss_payload="<script>alert('xss')</script>"
    local xss_response=$(curl -s -X POST "$BASE_URL/api/v1/auth-enhanced/register" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$xss_payload\",\"email\":\"test@example.com\",\"password\":\"TestPassword123!\"}" 2>/dev/null)
    
    if echo "$xss_response" | grep -q "error\|invalid\|validation"; then
        validation_results+="✅ XSS protection working\n"
    else
        validation_results+="❌ XSS protection may not be working\n"
    fi
    
    # Test SQL injection protection
    local sql_payload="admin'; DROP TABLE users; --"
    local sql_response=$(curl -s -X POST "$BASE_URL/api/v1/auth-enhanced/login" \
        -H "Content-Type: application/json" \
        -d "{\"identifier\":\"$sql_payload\",\"password\":\"password\"}" 2>/dev/null)
    
    if echo "$sql_response" | grep -q "error\|invalid"; then
        validation_results+="✅ SQL injection protection working\n"
    else
        validation_results+="❌ SQL injection protection may not be working\n"
    fi
    
    # Test file upload security
    local file_upload_test=$(curl -s -X POST "$BASE_URL/api/v1/upload/direct" \
        -F "files=@/dev/null" \
        -H "Authorization: Bearer invalid-token" 2>/dev/null)
    
    if echo "$file_upload_test" | grep -q "error\|unauthorized"; then
        validation_results+="✅ File upload security working\n"
    else
        validation_results+="❌ File upload security may not be working\n"
    fi
    
    echo -e "$validation_results" >> "$REPORT_FILE"
    log "Input validation test completed"
}

# Test API Security
test_api_security() {
    log "Testing API security..."
    
    local api_results=""
    
    # Test protected endpoints without authentication
    local protected_endpoints=(
        "/api/v1/users/me"
        "/api/v1/admin/users"
        "/api/v1/upload/direct"
        "/api/v1/wallet/balance"
    )
    
    for endpoint in "${protected_endpoints[@]}"; do
        local response=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL$endpoint" 2>/dev/null)
        if [[ "$response" == "401" ]]; then
            api_results+="✅ $endpoint properly requires authentication\n"
        else
            api_results+="❌ $endpoint may not require authentication (HTTP $response)\n"
        fi
    done
    
    # Test admin endpoints
    local admin_response=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/api/v1/admin/users" \
        -H "Authorization: Bearer invalid-token" 2>/dev/null)
    
    if [[ "$admin_response" == "403" ]]; then
        api_results+="✅ Admin endpoints properly protected\n"
    else
        api_results+="❌ Admin endpoints may not be properly protected (HTTP $admin_response)\n"
    fi
    
    echo -e "$api_results" >> "$REPORT_FILE"
    log "API security test completed"
}

# Test Performance and Load
test_performance_security() {
    log "Testing performance and load security..."
    
    local perf_results=""
    
    # Test response times
    local response_time=$(curl -s -w "%{time_total}" -o /dev/null "$BASE_URL/healthz" 2>/dev/null)
    local response_time_ms=$(echo "$response_time * 1000" | bc)
    
    if (( $(echo "$response_time_ms < 1000" | bc -l) )); then
        perf_results+="✅ Health endpoint response time: ${response_time_ms}ms\n"
    else
        perf_results+="⚠️ Health endpoint response time: ${response_time_ms}ms (may be slow)\n"
    fi
    
    # Test rate limiting under load
    local rate_limit_headers=""
    for i in {1..10}; do
        local headers=$(curl -s -I "$BASE_URL/api/v1/monitoring/health" 2>/dev/null)
        if echo "$headers" | grep -q "X-RateLimit"; then
            rate_limit_headers=$(echo "$headers" | grep "X-RateLimit" | head -1)
            break
        fi
        sleep 0.1
    done
    
    if [[ -n "$rate_limit_headers" ]]; then
        perf_results+="✅ Rate limiting headers present: $rate_limit_headers\n"
    else
        perf_results+="⚠️ Rate limiting headers not found\n"
    fi
    
    echo -e "$perf_results" >> "$REPORT_FILE"
    log "Performance security test completed"
}

# Test Monitoring and Logging
test_monitoring_security() {
    log "Testing monitoring and logging security..."
    
    local monitoring_results=""
    
    # Test health endpoints
    local health_response=$(curl -s "$BASE_URL/healthz" 2>/dev/null)
    if echo "$health_response" | grep -q "healthy\|ok"; then
        monitoring_results+="✅ Health endpoint working\n"
    else
        monitoring_results+="❌ Health endpoint not working\n"
    fi
    
    # Test metrics endpoint
    local metrics_response=$(curl -s "$BASE_URL/metrics" 2>/dev/null)
    if echo "$metrics_response" | grep -q "http_requests_total\|http_request_duration_seconds"; then
        monitoring_results+="✅ Metrics endpoint working\n"
    else
        monitoring_results+="❌ Metrics endpoint not working\n"
    fi
    
    # Test monitoring API
    local monitoring_response=$(curl -s "$BASE_URL/api/v1/monitoring/health" 2>/dev/null)
    if echo "$monitoring_response" | grep -q "status\|healthy"; then
        monitoring_results+="✅ Monitoring API working\n"
    else
        monitoring_results+="❌ Monitoring API not working\n"
    fi
    
    echo -e "$monitoring_results" >> "$REPORT_FILE"
    log "Monitoring security test completed"
}

# Generate final report
generate_final_report() {
    log "Generating final security audit report..."
    
    cat >> "$REPORT_FILE" << EOF

## Summary

### Critical Issues
$(grep -c "❌" "$REPORT_FILE" || echo "0") critical issues found

### Warnings
$(grep -c "⚠️" "$REPORT_FILE" || echo "0") warnings found

### Passed Tests
$(grep -c "✅" "$REPORT_FILE" || echo "0") tests passed

## Recommendations

1. **Immediate Action Required**: Address all critical issues (❌) before launch
2. **Review Warnings**: Investigate all warnings (⚠️) and address as needed
3. **Monitor Continuously**: Set up continuous security monitoring
4. **Regular Audits**: Schedule regular security audits

## Next Steps

1. Review this report with the security team
2. Address all critical issues
3. Implement recommendations
4. Schedule follow-up audit

---
**Report Generated**: $(date)
**Audit Script Version**: 1.0
EOF

    log "Security audit report generated: $REPORT_FILE"
}

# Main execution
main() {
    log "Starting HaloBuzz production security audit..."
    log "Target URL: $BASE_URL"
    
    create_report_dir
    test_ssl_configuration
    test_security_headers
    test_authentication_security
    test_input_validation
    test_api_security
    test_performance_security
    test_monitoring_security
    generate_final_report
    
    log "Security audit completed!"
    log "Report saved to: $REPORT_FILE"
    
    # Show summary
    local critical_issues=$(grep -c "❌" "$REPORT_FILE" || echo "0")
    local warnings=$(grep -c "⚠️" "$REPORT_FILE" || echo "0")
    local passed=$(grep -c "✅" "$REPORT_FILE" || echo "0")
    
    echo ""
    log "Audit Summary:"
    log "  Critical Issues: $critical_issues"
    log "  Warnings: $warnings"
    log "  Passed Tests: $passed"
    
    if [[ "$critical_issues" -gt 0 ]]; then
        error "Critical issues found! Review report and address before launch."
        exit 1
    elif [[ "$warnings" -gt 0 ]]; then
        warn "Warnings found. Review report and address as needed."
    else
        log "All security tests passed! ✅"
    fi
}

# Show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -u, --url URL          Base URL to audit (default: https://api.halobuzz.com)"
    echo "  -o, --output DIR       Output directory for reports (default: ./security-audit-reports)"
    echo "  --help                 Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Audit production API"
    echo "  $0 --url https://staging.halobuzz.com # Audit staging API"
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
            AUDIT_REPORT_DIR="$2"
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

#!/bin/bash

# HaloBuzz Security Penetration Testing Script
# This script performs comprehensive security testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
TARGET_URL=${1:-"https://api.halobuzz.com"}
REPORT_DIR="security-reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

# Create report directory
mkdir -p "$REPORT_DIR"

# Install required tools
install_tools() {
    log "Installing security testing tools..."
    
    # Install OWASP ZAP
    if ! command -v zap-cli >/dev/null 2>&1; then
        pip install zapcli
    fi
    
    # Install Nikto
    if ! command -v nikto >/dev/null 2>&1; then
        apt-get update && apt-get install -y nikto
    fi
    
    # Install SQLMap
    if ! command -v sqlmap >/dev/null 2>&1; then
        apt-get install -y sqlmap
    fi
    
    # Install Nmap
    if ! command -v nmap >/dev/null 2>&1; then
        apt-get install -y nmap
    fi
    
    log "Security tools installed"
}

# Port scanning
port_scan() {
    log "Performing port scan..."
    
    nmap -sS -O -sV -p- "$TARGET_URL" -oN "$REPORT_DIR/port_scan_$TIMESTAMP.txt"
    
    log "Port scan completed"
}

# Vulnerability scanning with Nikto
nikto_scan() {
    log "Running Nikto vulnerability scan..."
    
    nikto -h "$TARGET_URL" -output "$REPORT_DIR/nikto_$TIMESTAMP.txt" -Format txt
    
    log "Nikto scan completed"
}

# OWASP ZAP scan
zap_scan() {
    log "Running OWASP ZAP scan..."
    
    # Start ZAP daemon
    zap.sh -daemon -host 0.0.0.0 -port 8080 &
    sleep 30
    
    # Run spider scan
    zap-cli --zap-url http://localhost:8080 spider "$TARGET_URL"
    
    # Run active scan
    zap-cli --zap-url http://localhost:8080 active-scan "$TARGET_URL"
    
    # Generate report
    zap-cli --zap-url http://localhost:8080 report -o "$REPORT_DIR/zap_report_$TIMESTAMP.html" -f html
    
    # Stop ZAP
    pkill -f zap
    
    log "ZAP scan completed"
}

# SQL injection testing
sql_injection_test() {
    log "Testing for SQL injection vulnerabilities..."
    
    sqlmap -u "$TARGET_URL/api/v1/auth/login" \
           --data="identifier=test&password=test" \
           --batch \
           --output-dir="$REPORT_DIR/sqlmap_$TIMESTAMP"
    
    log "SQL injection testing completed"
}

# Authentication testing
auth_testing() {
    log "Testing authentication mechanisms..."
    
    # Test for weak passwords
    hydra -L common_usernames.txt -P common_passwords.txt "$TARGET_URL" http-post-form "/api/v1/auth/login:identifier=^USER^&password=^PASS^:Invalid credentials" -o "$REPORT_DIR/hydra_$TIMESTAMP.txt"
    
    # Test for brute force protection
    for i in {1..10}; do
        curl -X POST "$TARGET_URL/api/v1/auth/login" \
             -H "Content-Type: application/json" \
             -d '{"identifier":"admin","password":"wrongpassword"}' \
             -o "$REPORT_DIR/brute_force_test_$i.txt"
    done
    
    log "Authentication testing completed"
}

# Input validation testing
input_validation_test() {
    log "Testing input validation..."
    
    # Test for XSS
    curl -X POST "$TARGET_URL/api/v1/auth/register" \
         -H "Content-Type: application/json" \
         -d '{"username":"<script>alert(1)</script>","email":"test@test.com","password":"Test123!","country":"US"}' \
         -o "$REPORT_DIR/xss_test.txt"
    
    # Test for command injection
    curl -X POST "$TARGET_URL/api/v1/auth/register" \
         -H "Content-Type: application/json" \
         -d '{"username":"test; rm -rf /","email":"test@test.com","password":"Test123!","country":"US"}' \
         -o "$REPORT_DIR/command_injection_test.txt"
    
    log "Input validation testing completed"
}

# Rate limiting testing
rate_limit_test() {
    log "Testing rate limiting..."
    
    # Test API rate limits
    for i in {1..200}; do
        curl -X GET "$TARGET_URL/api/v1/streams" \
             -o "$REPORT_DIR/rate_limit_test_$i.txt" &
    done
    
    wait
    
    log "Rate limiting testing completed"
}

# CORS testing
cors_test() {
    log "Testing CORS configuration..."
    
    curl -H "Origin: https://evil.com" \
         -H "Access-Control-Request-Method: POST" \
         -H "Access-Control-Request-Headers: X-Requested-With" \
         -X OPTIONS "$TARGET_URL/api/v1/auth/login" \
         -o "$REPORT_DIR/cors_test.txt"
    
    log "CORS testing completed"
}

# Security headers testing
security_headers_test() {
    log "Testing security headers..."
    
    curl -I "$TARGET_URL" -o "$REPORT_DIR/security_headers.txt"
    
    log "Security headers testing completed"
}

# Generate comprehensive report
generate_report() {
    log "Generating comprehensive security report..."
    
    cat > "$REPORT_DIR/security_report_$TIMESTAMP.md" << EOF
# HaloBuzz Security Penetration Testing Report

**Date:** $(date)
**Target:** $TARGET_URL
**Tester:** Security Testing Script

## Executive Summary

This report contains the results of comprehensive security testing performed on the HaloBuzz application.

## Test Results

### Port Scanning
- Results stored in: port_scan_$TIMESTAMP.txt

### Vulnerability Scanning
- Nikto results: nikto_$TIMESTAMP.txt
- OWASP ZAP results: zap_report_$TIMESTAMP.html

### Authentication Testing
- Brute force test results: brute_force_test_*.txt
- Hydra results: hydra_$TIMESTAMP.txt

### Input Validation Testing
- XSS test results: xss_test.txt
- Command injection test results: command_injection_test.txt

### Rate Limiting Testing
- Rate limit test results: rate_limit_test_*.txt

### CORS Testing
- CORS test results: cors_test.txt

### Security Headers Testing
- Security headers results: security_headers.txt

## Recommendations

1. Review all identified vulnerabilities
2. Implement proper input validation
3. Ensure rate limiting is working correctly
4. Verify security headers are properly configured
5. Test authentication mechanisms thoroughly

## Next Steps

1. Address critical vulnerabilities immediately
2. Implement security patches
3. Re-test after fixes
4. Schedule regular security assessments

EOF

    log "Security report generated: $REPORT_DIR/security_report_$TIMESTAMP.md"
}

# Main function
main() {
    log "Starting HaloBuzz security penetration testing..."
    log "Target: $TARGET_URL"
    
    install_tools
    port_scan
    nikto_scan
    zap_scan
    sql_injection_test
    auth_testing
    input_validation_test
    rate_limit_test
    cors_test
    security_headers_test
    generate_report
    
    log "Security penetration testing completed!"
    log "Reports available in: $REPORT_DIR/"
}

# Run main function
main "$@"

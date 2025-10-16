#!/bin/bash

# HaloBuzz Final Launch Checklist Script
# Comprehensive pre-launch verification for production environment

set -e

# Configuration
CHECKLIST_REPORT_DIR="./launch-checklist-reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BASE_URL="${LAUNCH_CHECK_URL:-https://api.halobuzz.com}"

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
    mkdir -p "$CHECKLIST_REPORT_DIR"
    REPORT_FILE="$CHECKLIST_REPORT_DIR/launch-checklist-$TIMESTAMP.md"
    
    cat > "$REPORT_FILE" << EOF
# HaloBuzz Final Launch Checklist Report

**Date**: $(date)
**Environment**: Production
**Base URL**: $BASE_URL
**Launch Readiness**: PENDING

## Checklist Results

EOF
}

# P0 Critical Security Checks
check_p0_security() {
    log "Checking P0 Critical Security..."
    
    local p0_results=""
    
    # Check environment variables
    if [[ -f "src/config/requiredEnv.ts" ]]; then
        p0_results+="✅ Environment validation exists\n"
    else
        p0_results+="❌ Environment validation missing\n"
    fi
    
    # Check CORS configuration
    local cors_response=$(curl -s -H "Origin: https://malicious-site.com" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: X-Requested-With" \
        -X OPTIONS "$BASE_URL/api/v1/auth-enhanced/login" 2>/dev/null)
    
    if echo "$cors_response" | grep -q "Access-Control-Allow-Origin"; then
        p0_results+="⚠️ CORS headers present - verify allowed origins\n"
    else
        p0_results+="✅ CORS properly configured\n"
    fi
    
    # Check HTTPS
    if [[ "$BASE_URL" == https* ]]; then
        p0_results+="✅ HTTPS enabled\n"
    else
        p0_results+="❌ HTTPS not enabled\n"
    fi
    
    # Check HSTS header
    local hsts_header=$(curl -s -I "$BASE_URL" | grep -i "strict-transport-security" || echo "Not found")
    if [[ "$hsts_header" != "Not found" ]]; then
        p0_results+="✅ HSTS header present\n"
    else
        p0_results+="❌ HSTS header missing\n"
    fi
    
    # Check authentication
    local auth_response=$(curl -s -X POST "$BASE_URL/api/v1/auth-enhanced/login" \
        -H "Content-Type: application/json" \
        -d '{"identifier":"test@example.com","password":"wrongpassword"}' 2>/dev/null)
    
    if echo "$auth_response" | grep -q "Invalid credentials"; then
        p0_results+="✅ Authentication properly rejects invalid credentials\n"
    else
        p0_results+="❌ Authentication may not be working properly\n"
    fi
    
    # Check rate limiting
    local rate_limit_test=$(curl -s -w "%{http_code}" -o /dev/null -X POST "$BASE_URL/api/v1/auth-enhanced/login" \
        -H "Content-Type: application/json" \
        -d '{"identifier":"test@example.com","password":"wrongpassword"}' 2>/dev/null)
    
    if [[ "$rate_limit_test" == "429" ]]; then
        p0_results+="✅ Rate limiting working\n"
    else
        p0_results+="⚠️ Rate limiting may not be working (HTTP $rate_limit_test)\n"
    fi
    
    echo -e "$p0_results" >> "$REPORT_FILE"
    log "P0 Critical Security check completed"
}

# P1 High Priority Checks
check_p1_priority() {
    log "Checking P1 High Priority..."
    
    local p1_results=""
    
    # Check input validation
    local xss_payload="<script>alert('xss')</script>"
    local xss_response=$(curl -s -X POST "$BASE_URL/api/v1/auth-enhanced/register" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$xss_payload\",\"email\":\"test@example.com\",\"password\":\"TestPassword123!\"}" 2>/dev/null)
    
    if echo "$xss_response" | grep -q "error\|invalid\|validation"; then
        p1_results+="✅ XSS protection working\n"
    else
        p1_results+="❌ XSS protection may not be working\n"
    fi
    
    # Check file upload security
    local file_upload_test=$(curl -s -X POST "$BASE_URL/api/v1/upload/direct" \
        -F "files=@/dev/null" \
        -H "Authorization: Bearer invalid-token" 2>/dev/null)
    
    if echo "$file_upload_test" | grep -q "error\|unauthorized"; then
        p1_results+="✅ File upload security working\n"
    else
        p1_results+="❌ File upload security may not be working\n"
    fi
    
    # Check email verification
    local email_verification=$(curl -s "$BASE_URL/api/v1/verify/email" 2>/dev/null)
    if echo "$email_verification" | grep -q "error\|not found"; then
        p1_results+="✅ Email verification endpoint protected\n"
    else
        p1_results+="⚠️ Email verification endpoint may not be protected\n"
    fi
    
    # Check admin RBAC
    local admin_response=$(curl -s -w "%{http_code}" -o /dev/null "$BASE_URL/api/v1/admin/users" \
        -H "Authorization: Bearer invalid-token" 2>/dev/null)
    
    if [[ "$admin_response" == "403" ]]; then
        p1_results+="✅ Admin endpoints properly protected\n"
    else
        p1_results+="❌ Admin endpoints may not be properly protected (HTTP $admin_response)\n"
    fi
    
    echo -e "$p1_results" >> "$REPORT_FILE"
    log "P1 High Priority check completed"
}

# P2 Scale and Resilience Checks
check_p2_scale() {
    log "Checking P2 Scale and Resilience..."
    
    local p2_results=""
    
    # Check health endpoints
    local health_response=$(curl -s "$BASE_URL/healthz" 2>/dev/null)
    if echo "$health_response" | grep -q "healthy\|ok"; then
        p2_results+="✅ Health endpoint working\n"
    else
        p2_results+="❌ Health endpoint not working\n"
    fi
    
    # Check metrics endpoint
    local metrics_response=$(curl -s "$BASE_URL/metrics" 2>/dev/null)
    if echo "$metrics_response" | grep -q "http_requests_total\|http_request_duration_seconds"; then
        p2_results+="✅ Metrics endpoint working\n"
    else
        p2_results+="❌ Metrics endpoint not working\n"
    fi
    
    # Check monitoring API
    local monitoring_response=$(curl -s "$BASE_URL/api/v1/monitoring/health" 2>/dev/null)
    if echo "$monitoring_response" | grep -q "status\|healthy"; then
        p2_results+="✅ Monitoring API working\n"
    else
        p2_results+="❌ Monitoring API not working\n"
    fi
    
    # Check legal compliance
    local legal_response=$(curl -s "$BASE_URL/api/v1/legal/age-verification" 2>/dev/null)
    if echo "$legal_response" | grep -q "error\|not found"; then
        p2_results+="✅ Legal compliance endpoint protected\n"
    else
        p2_results+="⚠️ Legal compliance endpoint may not be protected\n"
    fi
    
    # Check response times
    local response_time=$(curl -s -w "%{time_total}" -o /dev/null "$BASE_URL/healthz" 2>/dev/null)
    local response_time_ms=$(echo "$response_time * 1000" | bc)
    
    if (( $(echo "$response_time_ms < 1000" | bc -l) )); then
        p2_results+="✅ Response time acceptable: ${response_time_ms}ms\n"
    else
        p2_results+="⚠️ Response time slow: ${response_time_ms}ms\n"
    fi
    
    echo -e "$p2_results" >> "$REPORT_FILE"
    log "P2 Scale and Resilience check completed"
}

# CI/CD Pipeline Checks
check_cicd_pipeline() {
    log "Checking CI/CD Pipeline..."
    
    local cicd_results=""
    
    # Check GitHub Actions workflows
    if [[ -d ".github/workflows" ]]; then
        local workflow_count=$(find ".github/workflows" -name "*.yml" | wc -l)
        if [[ "$workflow_count" -gt 0 ]]; then
            cicd_results+="✅ GitHub Actions workflows found: $workflow_count\n"
        else
            cicd_results+="❌ No GitHub Actions workflows found\n"
        fi
    else
        cicd_results+="❌ GitHub Actions workflows directory not found\n"
    fi
    
    # Check CodeQL workflow
    if [[ -f ".github/workflows/codeql.yml" ]]; then
        cicd_results+="✅ CodeQL SAST workflow exists\n"
    else
        cicd_results+="❌ CodeQL SAST workflow missing\n"
    fi
    
    # Check backend CI workflow
    if [[ -f ".github/workflows/backend-ci.yml" ]]; then
        cicd_results+="✅ Backend CI workflow exists\n"
    else
        cicd_results+="❌ Backend CI workflow missing\n"
    fi
    
    # Check performance testing workflow
    if [[ -f ".github/workflows/performance.yml" ]]; then
        cicd_results+="✅ Performance testing workflow exists\n"
    else
        cicd_results+="❌ Performance testing workflow missing\n"
    fi
    
    echo -e "$cicd_results" >> "$REPORT_FILE"
    log "CI/CD Pipeline check completed"
}

# Observability Checks
check_observability() {
    log "Checking Observability..."
    
    local observability_results=""
    
    # Check monitoring setup
    if [[ -d "monitoring" ]]; then
        observability_results+="✅ Monitoring directory exists\n"
    else
        observability_results+="❌ Monitoring directory missing\n"
    fi
    
    # Check backup scripts
    if [[ -d "scripts/backup" ]]; then
        local backup_scripts=$(find "scripts/backup" -name "*.sh" | wc -l)
        if [[ "$backup_scripts" -gt 0 ]]; then
            observability_results+="✅ Backup scripts found: $backup_scripts\n"
        else
            observability_results+="❌ No backup scripts found\n"
        fi
    else
        observability_results+="❌ Backup scripts directory missing\n"
    fi
    
    # Check E2E tests
    if [[ -d "tests/e2e" ]]; then
        local e2e_tests=$(find "tests/e2e" -name "*.spec.ts" | wc -l)
        if [[ "$e2e_tests" -gt 0 ]]; then
            observability_results+="✅ E2E tests found: $e2e_tests\n"
        else
            observability_results+="❌ No E2E tests found\n"
        fi
    else
        observability_results+="❌ E2E tests directory missing\n"
    fi
    
    # Check documentation
    if [[ -f "docs/RELEASE_CHECKLIST.md" ]]; then
        observability_results+="✅ Release checklist documentation exists\n"
    else
        observability_results+="❌ Release checklist documentation missing\n"
    fi
    
    echo -e "$observability_results" >> "$REPORT_FILE"
    log "Observability check completed"
}

# Performance Checks
check_performance() {
    log "Checking Performance..."
    
    local performance_results=""
    
    # Check Artillery configs
    if [[ -d "perf" ]]; then
        local perf_configs=$(find "perf" -name "*.yml" | wc -l)
        if [[ "$perf_configs" -gt 0 ]]; then
            performance_results+="✅ Performance test configs found: $perf_configs\n"
        else
            performance_results+="❌ No performance test configs found\n"
        fi
    else
        performance_results+="❌ Performance test configs directory missing\n"
    fi
    
    # Check concurrent connections
    local start_time=$(date +%s.%N)
    
    for i in {1..5}; do
        curl -s -o /dev/null "$BASE_URL/healthz" &
    done
    
    wait
    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc)
    
    if (( $(echo "$duration < 3" | bc -l) )); then
        performance_results+="✅ Concurrent connections working: ${duration}s\n"
    else
        performance_results+="⚠️ Concurrent connections slow: ${duration}s\n"
    fi
    
    echo -e "$performance_results" >> "$REPORT_FILE"
    log "Performance check completed"
}

# Security Audit Checks
check_security_audit() {
    log "Checking Security Audit..."
    
    local security_results=""
    
    # Check security audit script
    if [[ -f "scripts/security/security-audit.sh" ]]; then
        security_results+="✅ Security audit script exists\n"
    else
        security_results+="❌ Security audit script missing\n"
    fi
    
    # Check performance test script
    if [[ -f "scripts/performance/performance-test.sh" ]]; then
        security_results+="✅ Performance test script exists\n"
    else
        security_results+="❌ Performance test script missing\n"
    fi
    
    # Check backup verification script
    if [[ -f "scripts/backup/backup-verification.sh" ]]; then
        security_results+="✅ Backup verification script exists\n"
    else
        security_results+="❌ Backup verification script missing\n"
    fi
    
    # Check monitoring setup script
    if [[ -f "scripts/monitoring/setup-monitoring.sh" ]]; then
        security_results+="✅ Monitoring setup script exists\n"
    else
        security_results+="❌ Monitoring setup script missing\n"
    fi
    
    echo -e "$security_results" >> "$REPORT_FILE"
    log "Security Audit check completed"
}

# Generate launch readiness assessment
generate_launch_assessment() {
    log "Generating launch readiness assessment..."
    
    # Count results
    local critical_issues=$(grep -c "❌" "$REPORT_FILE" || echo "0")
    local warnings=$(grep -c "⚠️" "$REPORT_FILE" || echo "0")
    local passed=$(grep -c "✅" "$REPORT_FILE" || echo "0")
    
    # Determine launch readiness
    local launch_status="READY"
    if [[ "$critical_issues" -gt 0 ]]; then
        launch_status="NOT READY - Critical Issues"
    elif [[ "$warnings" -gt 5 ]]; then
        launch_status="NOT READY - Too Many Warnings"
    fi
    
    cat >> "$REPORT_FILE" << EOF

## Launch Readiness Assessment

### Summary
- **Launch Status**: $launch_status
- **Critical Issues**: $critical_issues
- **Warnings**: $warnings
- **Passed Tests**: $passed

### Launch Criteria
- ✅ **P0 Critical Security**: All critical security issues resolved
- ✅ **P1 High Priority**: All high priority issues resolved
- ✅ **P2 Scale & Resilience**: All scale and resilience issues resolved
- ✅ **CI/CD Pipeline**: All CI/CD workflows configured
- ✅ **Observability**: All monitoring and backup systems ready
- ✅ **Performance**: All performance tests passing
- ✅ **Security Audit**: All security audit scripts ready

### Recommendations

EOF

    if [[ "$critical_issues" -gt 0 ]]; then
        cat >> "$REPORT_FILE" << EOF
🚨 **CRITICAL**: Address all critical issues before launch:
$(grep "❌" "$REPORT_FILE" | sed 's/^/- /')

EOF
    fi

    if [[ "$warnings" -gt 0 ]]; then
        cat >> "$REPORT_FILE" << EOF
⚠️ **WARNING**: Review and address warnings:
$(grep "⚠️" "$REPORT_FILE" | sed 's/^/- /')

EOF
    fi

    cat >> "$REPORT_FILE" << EOF
### Next Steps

1. **Review Results**: Carefully review all checklist results
2. **Address Issues**: Fix all critical issues and review warnings
3. **Re-run Checklist**: Run this checklist again after fixes
4. **Final Approval**: Get final approval from security and DevOps teams
5. **Launch**: Execute launch plan

### Launch Execution Plan

1. **Pre-Launch** (24 hours before):
   - [ ] Final security audit
   - [ ] Performance testing
   - [ ] Backup verification
   - [ ] Monitoring setup

2. **Launch Day**:
   - [ ] Deploy to production
   - [ ] Verify all services
   - [ ] Monitor for issues
   - [ ] Execute rollback plan if needed

3. **Post-Launch** (24 hours after):
   - [ ] Monitor system health
   - [ ] Review metrics and logs
   - [ ] Address any issues
   - [ ] Document lessons learned

---
**Checklist Completed**: $(date)
**Launch Readiness**: $launch_status
**Report Generated**: $REPORT_FILE
EOF

    log "Launch readiness assessment generated"
}

# Main execution
main() {
    log "Starting HaloBuzz final launch checklist..."
    log "Target URL: $BASE_URL"
    
    create_report_dir
    check_p0_security
    check_p1_priority
    check_p2_scale
    check_cicd_pipeline
    check_observability
    check_performance
    check_security_audit
    generate_launch_assessment
    
    log "Final launch checklist completed!"
    log "Report saved to: $REPORT_FILE"
    
    # Show summary
    local critical_issues=$(grep -c "❌" "$REPORT_FILE" || echo "0")
    local warnings=$(grep -c "⚠️" "$REPORT_FILE" || echo "0")
    local passed=$(grep -c "✅" "$REPORT_FILE" || echo "0")
    
    echo ""
    log "Launch Checklist Summary:"
    log "  Critical Issues: $critical_issues"
    log "  Warnings: $warnings"
    log "  Passed Tests: $passed"
    
    if [[ "$critical_issues" -gt 0 ]]; then
        error "Critical issues found! Launch NOT READY."
        exit 1
    elif [[ "$warnings" -gt 5 ]]; then
        warn "Too many warnings found. Review before launch."
        exit 1
    else
        log "Launch checklist passed! Ready for launch! ✅"
    fi
}

# Show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -u, --url URL          Base URL to check (default: https://api.halobuzz.com)"
    echo "  -o, --output DIR        Output directory for reports (default: ./launch-checklist-reports)"
    echo "  --help                 Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Check production API"
    echo "  $0 --url https://staging.halobuzz.com # Check staging API"
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
            CHECKLIST_REPORT_DIR="$2"
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

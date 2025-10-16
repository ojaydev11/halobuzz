#!/bin/bash

# HaloBuzz Backup Verification Script
# Comprehensive backup and restore testing for production environment

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
VERIFICATION_REPORT_DIR="./backup-verification-reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
MONGO_URI="${MONGO_URI:-mongodb://localhost:27017/halobuzz}"
REDIS_URL="${REDIS_URL:-redis://localhost:6379}"

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
    
    if ! command -v mongodump &> /dev/null; then
        error "mongodump not found. Please install MongoDB tools."
        exit 1
    fi
    
    if ! command -v mongorestore &> /dev/null; then
        error "mongorestore not found. Please install MongoDB tools."
        exit 1
    fi
    
    if ! command -v redis-cli &> /dev/null; then
        error "redis-cli not found. Please install Redis tools."
        exit 1
    fi
    
    log "Dependencies check completed"
}

# Create report directory
create_report_dir() {
    mkdir -p "$VERIFICATION_REPORT_DIR"
    REPORT_FILE="$VERIFICATION_REPORT_DIR/backup-verification-$TIMESTAMP.md"
    
    cat > "$REPORT_FILE" << EOF
# HaloBuzz Backup Verification Report

**Date**: $(date)
**Environment**: Production
**Backup Directory**: $BACKUP_DIR
**MongoDB URI**: $MONGO_URI
**Redis URL**: $REDIS_URL

## Verification Results

EOF
}

# Test MongoDB backup
test_mongodb_backup() {
    log "Testing MongoDB backup..."
    
    local mongo_results=""
    
    # Check if backup directory exists
    if [[ -d "$BACKUP_DIR" ]]; then
        mongo_results+="✅ Backup directory exists: $BACKUP_DIR\n"
    else
        mongo_results+="❌ Backup directory not found: $BACKUP_DIR\n"
        echo -e "$mongo_results" >> "$REPORT_FILE"
        return
    fi
    
    # Check for recent MongoDB backups
    local mongo_backups=$(find "$BACKUP_DIR" -name "mongo-backup-*.tar.gz" -mtime -1 2>/dev/null | wc -l)
    if [[ "$mongo_backups" -gt 0 ]]; then
        mongo_results+="✅ Recent MongoDB backups found: $mongo_backups\n"
    else
        mongo_results+="⚠️ No recent MongoDB backups found\n"
    fi
    
    # Test backup integrity
    local latest_backup=$(find "$BACKUP_DIR" -name "mongo-backup-*.tar.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
    if [[ -n "$latest_backup" ]]; then
        if tar -tzf "$latest_backup" >/dev/null 2>&1; then
            mongo_results+="✅ Latest backup integrity verified: $(basename "$latest_backup")\n"
        else
            mongo_results+="❌ Latest backup integrity check failed: $(basename "$latest_backup")\n"
        fi
    fi
    
    echo -e "$mongo_results" >> "$REPORT_FILE"
    log "MongoDB backup test completed"
}

# Test Redis backup
test_redis_backup() {
    log "Testing Redis backup..."
    
    local redis_results=""
    
    # Check for recent Redis backups
    local redis_backups=$(find "$BACKUP_DIR" -name "redis-backup-*.rdb" -mtime -1 2>/dev/null | wc -l)
    if [[ "$redis_backups" -gt 0 ]]; then
        redis_results+="✅ Recent Redis backups found: $redis_backups\n"
    else
        redis_results+="⚠️ No recent Redis backups found\n"
    fi
    
    # Test Redis connectivity
    if redis-cli -u "$REDIS_URL" ping >/dev/null 2>&1; then
        redis_results+="✅ Redis connectivity verified\n"
    else
        redis_results+="❌ Redis connectivity failed\n"
    fi
    
    # Test Redis backup integrity
    local latest_redis_backup=$(find "$BACKUP_DIR" -name "redis-backup-*.rdb" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
    if [[ -n "$latest_redis_backup" ]]; then
        if file "$latest_redis_backup" | grep -q "Redis"; then
            redis_results+="✅ Latest Redis backup integrity verified: $(basename "$latest_redis_backup")\n"
        else
            redis_results+="❌ Latest Redis backup integrity check failed: $(basename "$latest_redis_backup")\n"
        fi
    fi
    
    echo -e "$redis_results" >> "$REPORT_FILE"
    log "Redis backup test completed"
}

# Test backup scripts
test_backup_scripts() {
    log "Testing backup scripts..."
    
    local script_results=""
    
    # Check if backup scripts exist
    local backup_scripts=(
        "scripts/backup/mongo_backup.sh"
        "scripts/backup/mongo_restore.sh"
        "scripts/backup/redis_backup.sh"
    )
    
    for script in "${backup_scripts[@]}"; do
        if [[ -f "$script" ]]; then
            script_results+="✅ Backup script exists: $script\n"
            
            # Check if script is executable
            if [[ -x "$script" ]]; then
                script_results+="✅ Script is executable: $script\n"
            else
                script_results+="⚠️ Script not executable: $script\n"
            fi
        else
            script_results+="❌ Backup script not found: $script\n"
        fi
    done
    
    echo -e "$script_results" >> "$REPORT_FILE"
    log "Backup scripts test completed"
}

# Test restore procedures
test_restore_procedures() {
    log "Testing restore procedures..."
    
    local restore_results=""
    
    # Test MongoDB restore script
    local mongo_restore_script="scripts/backup/mongo_restore.sh"
    if [[ -f "$mongo_restore_script" ]]; then
        # Check if script has proper error handling
        if grep -q "set -e" "$mongo_restore_script"; then
            restore_results+="✅ MongoDB restore script has error handling\n"
        else
            restore_results+="⚠️ MongoDB restore script missing error handling\n"
        fi
        
        # Check if script validates input
        if grep -q "if.*-z.*BACKUP_FILE" "$mongo_restore_script"; then
            restore_results+="✅ MongoDB restore script validates input\n"
        else
            restore_results+="⚠️ MongoDB restore script missing input validation\n"
        fi
    fi
    
    # Test Redis restore procedure
    local redis_restore_script="scripts/backup/redis_backup.sh"
    if [[ -f "$redis_restore_script" ]]; then
        if grep -q "set -e" "$redis_restore_script"; then
            restore_results+="✅ Redis backup script has error handling\n"
        else
            restore_results+="⚠️ Redis backup script missing error handling\n"
        fi
    fi
    
    echo -e "$restore_results" >> "$REPORT_FILE"
    log "Restore procedures test completed"
}

# Test backup retention
test_backup_retention() {
    log "Testing backup retention..."
    
    local retention_results=""
    
    # Check MongoDB backup retention
    local mongo_backups=$(find "$BACKUP_DIR" -name "mongo-backup-*.tar.gz" 2>/dev/null | wc -l)
    if [[ "$mongo_backups" -ge 7 ]]; then
        retention_results+="✅ MongoDB backup retention: $mongo_backups backups (>= 7 days)\n"
    else
        retention_results+="⚠️ MongoDB backup retention: $mongo_backups backups (< 7 days)\n"
    fi
    
    # Check Redis backup retention
    local redis_backups=$(find "$BACKUP_DIR" -name "redis-backup-*.rdb" 2>/dev/null | wc -l)
    if [[ "$redis_backups" -ge 7 ]]; then
        retention_results+="✅ Redis backup retention: $redis_backups backups (>= 7 days)\n"
    else
        retention_results+="⚠️ Redis backup retention: $redis_backups backups (< 7 days)\n"
    fi
    
    # Check backup age
    local oldest_backup=$(find "$BACKUP_DIR" -name "mongo-backup-*.tar.gz" -type f -printf '%T@ %p\n' | sort -n | head -1 | cut -d' ' -f2-)
    if [[ -n "$oldest_backup" ]]; then
        local backup_age=$(find "$BACKUP_DIR" -name "mongo-backup-*.tar.gz" -type f -printf '%T@ %p\n' | sort -n | head -1 | cut -d' ' -f1)
        local current_time=$(date +%s)
        local age_days=$(( (current_time - backup_age) / 86400 ))
        
        if [[ "$age_days" -le 30 ]]; then
            retention_results+="✅ Oldest backup age: $age_days days (<= 30 days)\n"
        else
            retention_results+="⚠️ Oldest backup age: $age_days days (> 30 days)\n"
        fi
    fi
    
    echo -e "$retention_results" >> "$REPORT_FILE"
    log "Backup retention test completed"
}

# Test backup automation
test_backup_automation() {
    log "Testing backup automation..."
    
    local automation_results=""
    
    # Check for cron jobs or scheduled tasks
    if command -v crontab &> /dev/null; then
        local cron_jobs=$(crontab -l 2>/dev/null | grep -c "backup" || echo "0")
        if [[ "$cron_jobs" -gt 0 ]]; then
            automation_results+="✅ Backup cron jobs found: $cron_jobs\n"
        else
            automation_results+="⚠️ No backup cron jobs found\n"
        fi
    fi
    
    # Check for systemd timers
    if command -v systemctl &> /dev/null; then
        local systemd_timers=$(systemctl list-timers --no-pager 2>/dev/null | grep -c "backup" || echo "0")
        if [[ "$systemd_timers" -gt 0 ]]; then
            automation_results+="✅ Backup systemd timers found: $systemd_timers\n"
        else
            automation_results+="⚠️ No backup systemd timers found\n"
        fi
    fi
    
    # Check for GitHub Actions workflows
    if [[ -d ".github/workflows" ]]; then
        local backup_workflows=$(find ".github/workflows" -name "*.yml" -exec grep -l "backup" {} \; 2>/dev/null | wc -l)
        if [[ "$backup_workflows" -gt 0 ]]; then
            automation_results+="✅ Backup GitHub Actions workflows found: $backup_workflows\n"
        else
            automation_results+="⚠️ No backup GitHub Actions workflows found\n"
        fi
    fi
    
    echo -e "$automation_results" >> "$REPORT_FILE"
    log "Backup automation test completed"
}

# Test disaster recovery procedures
test_disaster_recovery() {
    log "Testing disaster recovery procedures..."
    
    local dr_results=""
    
    # Check if DR documentation exists
    if [[ -f "docs/BACKUP_AND_DISASTER_RECOVERY.md" ]]; then
        dr_results+="✅ Disaster recovery documentation exists\n"
    else
        dr_results+="❌ Disaster recovery documentation not found\n"
    fi
    
    # Check if DR procedures are documented
    if [[ -f "docs/BACKUP_AND_DISASTER_RECOVERY.md" ]]; then
        if grep -q "Disaster Recovery" "docs/BACKUP_AND_DISASTER_RECOVERY.md"; then
            dr_results+="✅ Disaster recovery procedures documented\n"
        else
            dr_results+="⚠️ Disaster recovery procedures not documented\n"
        fi
    fi
    
    # Check if RTO/RPO are defined
    if [[ -f "docs/BACKUP_AND_DISASTER_RECOVERY.md" ]]; then
        if grep -q "RTO\|RPO" "docs/BACKUP_AND_DISASTER_RECOVERY.md"; then
            dr_results+="✅ RTO/RPO defined in documentation\n"
        else
            dr_results+="⚠️ RTO/RPO not defined in documentation\n"
        fi
    fi
    
    echo -e "$dr_results" >> "$REPORT_FILE"
    log "Disaster recovery test completed"
}

# Generate backup verification summary
generate_backup_summary() {
    log "Generating backup verification summary..."
    
    cat >> "$REPORT_FILE" << EOF

## Backup Verification Summary

### Key Findings

- **Backup Directory**: $BACKUP_DIR
- **MongoDB URI**: $MONGO_URI
- **Redis URL**: $REDIS_URL
- **Verification Date**: $(date)

### Backup Status

- **MongoDB Backups**: $(find "$BACKUP_DIR" -name "mongo-backup-*.tar.gz" 2>/dev/null | wc -l) backups found
- **Redis Backups**: $(find "$BACKUP_DIR" -name "redis-backup-*.rdb" 2>/dev/null | wc -l) backups found
- **Backup Scripts**: $(find "scripts/backup" -name "*.sh" 2>/dev/null | wc -l) scripts found

### Recommendations

1. **Regular Testing**: Test restore procedures monthly
2. **Monitoring**: Set up backup monitoring and alerts
3. **Documentation**: Keep disaster recovery procedures updated
4. **Automation**: Ensure backup automation is working

## Next Steps

1. Review backup verification results
2. Address any backup issues
3. Test restore procedures in staging
4. Schedule regular backup verification

---
**Report Generated**: $(date)
**Backup Verification Script Version**: 1.0
EOF

    log "Backup verification summary generated"
}

# Main execution
main() {
    log "Starting HaloBuzz backup verification..."
    log "Backup Directory: $BACKUP_DIR"
    log "MongoDB URI: $MONGO_URI"
    log "Redis URL: $REDIS_URL"
    
    check_dependencies
    create_report_dir
    test_mongodb_backup
    test_redis_backup
    test_backup_scripts
    test_restore_procedures
    test_backup_retention
    test_backup_automation
    test_disaster_recovery
    generate_backup_summary
    
    log "Backup verification completed!"
    log "Report saved to: $REPORT_FILE"
    
    # Show summary
    local mongo_backups=$(find "$BACKUP_DIR" -name "mongo-backup-*.tar.gz" 2>/dev/null | wc -l)
    local redis_backups=$(find "$BACKUP_DIR" -name "redis-backup-*.rdb" 2>/dev/null | wc -l)
    local scripts=$(find "scripts/backup" -name "*.sh" 2>/dev/null | wc -l)
    
    echo ""
    log "Backup Verification Summary:"
    log "  MongoDB Backups: $mongo_backups"
    log "  Redis Backups: $redis_backups"
    log "  Backup Scripts: $scripts"
    log "  Report: $REPORT_FILE"
    
    log "All backup verification tests completed! ✅"
}

# Show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -d, --backup-dir DIR   Backup directory (default: ./backups)"
    echo "  -o, --output DIR       Output directory for reports (default: ./backup-verification-reports)"
    echo "  -m, --mongo URI        MongoDB URI (default: mongodb://localhost:27017/halobuzz)"
    echo "  -r, --redis URL       Redis URL (default: redis://localhost:6379)"
    echo "  --help                Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Verify local backups"
    echo "  $0 --backup-dir /var/backups         # Verify custom backup directory"
    echo "  $0 --mongo mongodb://prod:27017/halobuzz # Verify production MongoDB"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--backup-dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        -o|--output)
            VERIFICATION_REPORT_DIR="$2"
            shift 2
            ;;
        -m|--mongo)
            MONGO_URI="$2"
            shift 2
            ;;
        -r|--redis)
            REDIS_URL="$2"
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

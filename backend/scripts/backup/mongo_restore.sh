#!/bin/bash

# MongoDB Restore Script
# Restores database from backup

set -e

# Configuration
BACKUP_DIR="/opt/halobuzz/backups"
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/halobuzz}"
DRY_RUN="${DRY_RUN:-false}"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$BACKUP_DIR/restore.log"
}

# Show usage
show_usage() {
    echo "Usage: $0 [OPTIONS] <backup_file>"
    echo ""
    echo "Options:"
    echo "  -d, --dry-run    Show what would be restored without actually restoring"
    echo "  -h, --help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 halobuzz_backup_20231201_120000.tar.gz"
    echo "  $0 --dry-run halobuzz_backup_20231201_120000"
    echo ""
    echo "Available backups:"
    ls -la "$BACKUP_DIR"/halobuzz_backup_* 2>/dev/null || echo "No backups found"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--dry-run)
            DRY_RUN="true"
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        -*)
            echo "Unknown option $1"
            show_usage
            exit 1
            ;;
        *)
            BACKUP_FILE="$1"
            shift
            ;;
    esac
done

# Check if backup file is provided
if [ -z "$BACKUP_FILE" ]; then
    echo "Error: Backup file is required"
    show_usage
    exit 1
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ] && [ ! -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    show_usage
    exit 1
fi

# Resolve full path
if [ ! -f "$BACKUP_FILE" ]; then
    BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
fi

log "Starting MongoDB restore from: $BACKUP_FILE"

# Check if it's a compressed backup
if [[ "$BACKUP_FILE" == *.tar.gz ]]; then
    log "Detected compressed backup, extracting..."
    EXTRACT_DIR="/tmp/halobuzz_restore_$(date +%s)"
    mkdir -p "$EXTRACT_DIR"
    
    if tar -xzf "$BACKUP_FILE" -C "$EXTRACT_DIR"; then
        log "Backup extracted successfully"
        RESTORE_PATH="$EXTRACT_DIR/$(basename "$BACKUP_FILE" .tar.gz)"
    else
        log "Failed to extract backup"
        exit 1
    fi
else
    RESTORE_PATH="$BACKUP_FILE"
fi

# Verify backup structure
if [ ! -d "$RESTORE_PATH" ]; then
    log "Error: Invalid backup structure"
    exit 1
fi

log "Backup structure verified"

# Show what will be restored
log "Collections to be restored:"
ls -la "$RESTORE_PATH"/*/

# Dry run mode
if [ "$DRY_RUN" = "true" ]; then
    log "DRY RUN MODE - No actual restore will be performed"
    log "Would restore from: $RESTORE_PATH"
    log "Would restore to: $MONGODB_URI"
    exit 0
fi

# Confirm restore
echo ""
echo "WARNING: This will overwrite the existing database!"
echo "Backup: $BACKUP_FILE"
echo "Target: $MONGODB_URI"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    log "Restore cancelled by user"
    exit 0
fi

# Create backup of current database before restore
log "Creating backup of current database before restore..."
CURRENT_BACKUP="$BACKUP_DIR/pre_restore_backup_$(date +%Y%m%d_%H%M%S)"
if mongodump --uri="$MONGODB_URI" --out="$CURRENT_BACKUP"; then
    log "Current database backed up to: $CURRENT_BACKUP"
else
    log "Warning: Failed to backup current database"
fi

# Perform restore
log "Starting database restore..."
if mongorestore --uri="$MONGODB_URI" --drop "$RESTORE_PATH"; then
    log "Database restore completed successfully"
else
    log "Database restore failed!"
    exit 1
fi

# Cleanup extracted files
if [ -n "$EXTRACT_DIR" ]; then
    rm -rf "$EXTRACT_DIR"
    log "Temporary files cleaned up"
fi

log "Restore process completed successfully"
exit 0

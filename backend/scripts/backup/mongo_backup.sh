#!/bin/bash

# MongoDB Backup Script
# Creates automated backups with retention policy

set -e

# Configuration
BACKUP_DIR="/opt/halobuzz/backups"
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/halobuzz}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
COMPRESSION="${BACKUP_COMPRESSION:-gzip}"
NOTIFICATION_WEBHOOK="${BACKUP_NOTIFICATION_WEBHOOK:-}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/halobuzz_backup_$TIMESTAMP"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$BACKUP_DIR/backup.log"
}

# Send notification function
send_notification() {
    local status="$1"
    local message="$2"
    
    if [ -n "$NOTIFICATION_WEBHOOK" ]; then
        curl -X POST "$NOTIFICATION_WEBHOOK" \
            -H "Content-Type: application/json" \
            -d "{\"status\":\"$status\",\"message\":\"$message\",\"timestamp\":\"$(date -Iseconds)\"}" \
            || log "Failed to send notification"
    fi
}

# Start backup
log "Starting MongoDB backup..."

# Create backup
if mongodump --uri="$MONGODB_URI" --out="$BACKUP_FILE"; then
    log "MongoDB dump completed successfully"
    
    # Compress backup if enabled
    if [ "$COMPRESSION" = "gzip" ]; then
        log "Compressing backup..."
        tar -czf "$BACKUP_FILE.tar.gz" -C "$(dirname "$BACKUP_FILE")" "$(basename "$BACKUP_FILE")"
        rm -rf "$BACKUP_FILE"
        BACKUP_FILE="$BACKUP_FILE.tar.gz"
        log "Backup compressed to $BACKUP_FILE"
    fi
    
    # Get backup size
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log "Backup completed: $BACKUP_FILE ($BACKUP_SIZE)"
    
    # Send success notification
    send_notification "success" "MongoDB backup completed successfully: $BACKUP_FILE ($BACKUP_SIZE)"
    
else
    log "MongoDB backup failed!"
    send_notification "error" "MongoDB backup failed!"
    exit 1
fi

# Cleanup old backups
log "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "halobuzz_backup_*" -type f -mtime +$RETENTION_DAYS -delete
log "Old backups cleaned up"

# Verify backup integrity
if [ "$COMPRESSION" = "gzip" ]; then
    if gzip -t "$BACKUP_FILE"; then
        log "Backup integrity verified"
    else
        log "Backup integrity check failed!"
        send_notification "error" "Backup integrity check failed!"
        exit 1
    fi
fi

log "Backup process completed successfully"
exit 0

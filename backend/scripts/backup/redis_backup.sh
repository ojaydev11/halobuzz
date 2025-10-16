#!/bin/bash

# Redis Backup Script
# Creates automated Redis backups with retention policy

set -e

# Configuration
BACKUP_DIR="/opt/halobuzz/backups/redis"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"
RETENTION_DAYS="${REDIS_BACKUP_RETENTION_DAYS:-7}"
NOTIFICATION_WEBHOOK="${BACKUP_NOTIFICATION_WEBHOOK:-}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate backup filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/redis_backup_$TIMESTAMP.rdb"

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
log "Starting Redis backup..."

# Build Redis CLI command
REDIS_CLI="redis-cli -h $REDIS_HOST -p $REDIS_PORT"
if [ -n "$REDIS_PASSWORD" ]; then
    REDIS_CLI="$REDIS_CLI -a $REDIS_PASSWORD"
fi

# Test Redis connection
if ! $REDIS_CLI ping > /dev/null 2>&1; then
    log "Error: Cannot connect to Redis server"
    send_notification "error" "Cannot connect to Redis server"
    exit 1
fi

# Trigger Redis BGSAVE
log "Triggering Redis BGSAVE..."
if $REDIS_CLI bgsave; then
    log "Redis BGSAVE triggered successfully"
else
    log "Failed to trigger Redis BGSAVE"
    send_notification "error" "Failed to trigger Redis BGSAVE"
    exit 1
fi

# Wait for BGSAVE to complete
log "Waiting for BGSAVE to complete..."
while true; do
    LAST_SAVE=$($REDIS_CLI lastsave)
    CURRENT_TIME=$(date +%s)
    
    if [ "$LAST_SAVE" -gt "$CURRENT_TIME" ]; then
        break
    fi
    
    sleep 1
done

log "BGSAVE completed"

# Find the RDB file
RDB_FILE=""
if [ -f "/var/lib/redis/dump.rdb" ]; then
    RDB_FILE="/var/lib/redis/dump.rdb"
elif [ -f "/var/lib/redis/6379/dump.rdb" ]; then
    RDB_FILE="/var/lib/redis/6379/dump.rdb"
elif [ -f "/usr/local/var/db/redis/dump.rdb" ]; then
    RDB_FILE="/usr/local/var/db/redis/dump.rdb"
else
    # Try to find RDB file using Redis config
    RDB_FILE=$($REDIS_CLI config get dir | tail -n 1)/dump.rdb
fi

if [ ! -f "$RDB_FILE" ]; then
    log "Error: RDB file not found"
    send_notification "error" "RDB file not found"
    exit 1
fi

log "Found RDB file: $RDB_FILE"

# Copy RDB file to backup location
if cp "$RDB_FILE" "$BACKUP_FILE"; then
    log "RDB file copied to backup location"
else
    log "Failed to copy RDB file"
    send_notification "error" "Failed to copy RDB file"
    exit 1
fi

# Compress backup
log "Compressing backup..."
if gzip "$BACKUP_FILE"; then
    BACKUP_FILE="$BACKUP_FILE.gz"
    log "Backup compressed to $BACKUP_FILE"
else
    log "Warning: Failed to compress backup"
fi

# Get backup size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
log "Backup completed: $BACKUP_FILE ($BACKUP_SIZE)"

# Verify backup integrity
if [[ "$BACKUP_FILE" == *.gz ]]; then
    if gzip -t "$BACKUP_FILE"; then
        log "Backup integrity verified"
    else
        log "Backup integrity check failed!"
        send_notification "error" "Backup integrity check failed!"
        exit 1
    fi
fi

# Cleanup old backups
log "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "redis_backup_*" -type f -mtime +$RETENTION_DAYS -delete
log "Old backups cleaned up"

# Send success notification
send_notification "success" "Redis backup completed successfully: $BACKUP_FILE ($BACKUP_SIZE)"

log "Redis backup process completed successfully"
exit 0

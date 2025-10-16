# HaloBuzz Backup and Disaster Recovery Guide

## Overview

This document provides comprehensive guidance for backing up and restoring HaloBuzz data, including MongoDB databases, Redis caches, and application files.

## Backup Strategy

### 1. MongoDB Backups

MongoDB backups are created using `mongodump` and stored with compression and retention policies.

#### Configuration

- **Backup Directory**: `/opt/halobuzz/backups`
- **Retention**: 30 days (configurable via `BACKUP_RETENTION_DAYS`)
- **Compression**: gzip (configurable via `BACKUP_COMPRESSION`)
- **Schedule**: Daily at 2 AM UTC

#### Manual Backup

```bash
# Run MongoDB backup
./scripts/backup/mongo_backup.sh

# With custom configuration
MONGODB_URI="mongodb://user:pass@host:port/db" \
BACKUP_RETENTION_DAYS=14 \
./scripts/backup/mongo_backup.sh
```

#### Automated Backup (Cron)

```bash
# Add to crontab
0 2 * * * /opt/halobuzz/scripts/backup/mongo_backup.sh >> /var/log/halobuzz-backup.log 2>&1
```

### 2. Redis Backups

Redis backups are created using `BGSAVE` and stored with compression.

#### Configuration

- **Backup Directory**: `/opt/halobuzz/backups/redis`
- **Retention**: 7 days (configurable via `REDIS_BACKUP_RETENTION_DAYS`)
- **Compression**: gzip
- **Schedule**: Every 6 hours

#### Manual Backup

```bash
# Run Redis backup
./scripts/backup/redis_backup.sh

# With custom configuration
REDIS_HOST="redis.example.com" \
REDIS_PASSWORD="secret" \
./scripts/backup/redis_backup.sh
```

#### Automated Backup (Cron)

```bash
# Add to crontab
0 */6 * * * /opt/halobuzz/scripts/backup/redis_backup.sh >> /var/log/halobuzz-redis-backup.log 2>&1
```

### 3. Application Files Backup

Application files include configuration, logs, and uploaded content.

#### Configuration

- **Backup Directory**: `/opt/halobuzz/backups/files`
- **Retention**: 7 days
- **Schedule**: Daily at 3 AM UTC

#### Manual Backup

```bash
# Create application files backup
tar -czf /opt/halobuzz/backups/files/halobuzz_files_$(date +%Y%m%d_%H%M%S).tar.gz \
    /opt/halobuzz/uploads \
    /opt/halobuzz/logs \
    /opt/halobuzz/config
```

## Restore Procedures

### 1. MongoDB Restore

#### List Available Backups

```bash
ls -la /opt/halobuzz/backups/halobuzz_backup_*
```

#### Dry Run Restore

```bash
# Test restore without actually restoring
./scripts/backup/mongo_restore.sh --dry-run halobuzz_backup_20231201_120000.tar.gz
```

#### Full Restore

```bash
# Restore from backup
./scripts/backup/mongo_restore.sh halobuzz_backup_20231201_120000.tar.gz

# With custom MongoDB URI
MONGODB_URI="mongodb://user:pass@host:port/db" \
./scripts/backup/mongo_restore.sh halobuzz_backup_20231201_120000.tar.gz
```

#### Partial Restore

```bash
# Restore specific collections
mongorestore --uri="mongodb://localhost:27017/halobuzz" \
    --collection=users \
    --collection=streams \
    /path/to/backup/halobuzz/users.bson
```

### 2. Redis Restore

#### Stop Redis Service

```bash
sudo systemctl stop redis
# or
sudo service redis-server stop
```

#### Restore RDB File

```bash
# Copy backup to Redis data directory
sudo cp /opt/halobuzz/backups/redis/redis_backup_20231201_120000.rdb.gz \
    /var/lib/redis/dump.rdb.gz

# Decompress if needed
sudo gunzip /var/lib/redis/dump.rdb.gz

# Set proper permissions
sudo chown redis:redis /var/lib/redis/dump.rdb
sudo chmod 660 /var/lib/redis/dump.rdb
```

#### Start Redis Service

```bash
sudo systemctl start redis
# or
sudo service redis-server start
```

### 3. Application Files Restore

```bash
# Restore application files
tar -xzf /opt/halobuzz/backups/files/halobuzz_files_20231201_120000.tar.gz -C /
```

## Disaster Recovery Procedures

### 1. Complete System Recovery

#### Prerequisites

- Fresh server with same OS version
- MongoDB and Redis installed
- HaloBuzz application deployed
- Backup files accessible

#### Recovery Steps

1. **Deploy Application**
   ```bash
   # Deploy HaloBuzz application
   git clone https://github.com/ojaydev11/shivx.git
   cd shivx
   npm install
   npm run build
   ```

2. **Restore MongoDB**
   ```bash
   ./scripts/backup/mongo_restore.sh latest_backup.tar.gz
   ```

3. **Restore Redis**
   ```bash
   ./scripts/backup/redis_backup.sh --restore latest_redis_backup.rdb.gz
   ```

4. **Restore Application Files**
   ```bash
   tar -xzf latest_files_backup.tar.gz -C /
   ```

5. **Verify Services**
   ```bash
   # Check MongoDB
   mongosh --eval "db.adminCommand('ping')"
   
   # Check Redis
   redis-cli ping
   
   # Check application
   curl http://localhost:3000/health
   ```

### 2. Point-in-Time Recovery

#### MongoDB Point-in-Time Recovery

```bash
# Restore from backup
./scripts/backup/mongo_restore.sh backup_20231201_120000.tar.gz

# Apply oplog entries (if available)
mongorestore --uri="mongodb://localhost:27017/halobuzz" \
    --oplogReplay \
    /path/to/oplog.bson
```

## Monitoring and Alerting

### 1. Backup Monitoring

#### Health Checks

```bash
# Check backup status
curl http://localhost:3000/api/v1/monitoring/health

# Check backup metrics
curl http://localhost:3000/api/v1/monitoring/metrics
```

#### Alerting

Configure webhook notifications for backup failures:

```bash
# Set notification webhook
export BACKUP_NOTIFICATION_WEBHOOK="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
```

### 2. Backup Verification

#### Automated Verification

```bash
# Verify backup integrity
./scripts/backup/verify_backup.sh /opt/halobuzz/backups/halobuzz_backup_20231201_120000.tar.gz
```

#### Manual Verification

```bash
# Test restore in isolated environment
./scripts/backup/mongo_restore.sh --dry-run backup_file.tar.gz
```

## Best Practices

### 1. Backup Security

- Encrypt sensitive backups
- Store backups in secure locations
- Implement access controls
- Regular security audits

### 2. Backup Testing

- Regular restore testing
- Disaster recovery drills
- Performance testing
- Documentation updates

### 3. Backup Optimization

- Incremental backups for large datasets
- Compression for storage efficiency
- Parallel backup processes
- Network optimization

## Troubleshooting

### Common Issues

#### MongoDB Backup Failures

```bash
# Check MongoDB connection
mongosh --eval "db.adminCommand('ping')"

# Check disk space
df -h

# Check MongoDB logs
tail -f /var/log/mongodb/mongod.log
```

#### Redis Backup Failures

```bash
# Check Redis connection
redis-cli ping

# Check Redis configuration
redis-cli config get dir

# Check Redis logs
tail -f /var/log/redis/redis-server.log
```

#### Restore Failures

```bash
# Check backup file integrity
gzip -t backup_file.tar.gz

# Check MongoDB logs
tail -f /var/log/mongodb/mongod.log

# Check disk space
df -h
```

### Recovery Time Objectives (RTO)

- **MongoDB**: 15 minutes
- **Redis**: 5 minutes
- **Application Files**: 10 minutes
- **Complete System**: 30 minutes

### Recovery Point Objectives (RPO)

- **MongoDB**: 1 hour (daily backups)
- **Redis**: 6 hours (every 6 hours)
- **Application Files**: 24 hours (daily backups)

## Contact Information

For backup and disaster recovery support:

- **Technical Lead**: [Your Name]
- **Email**: [your.email@halobuzz.com]
- **Emergency**: [emergency.contact@halobuzz.com]

## Appendix

### A. Backup Scripts

All backup scripts are located in `/opt/halobuzz/scripts/backup/`:

- `mongo_backup.sh` - MongoDB backup script
- `mongo_restore.sh` - MongoDB restore script
- `redis_backup.sh` - Redis backup script
- `verify_backup.sh` - Backup verification script

### B. Configuration Files

Backup configuration is managed through environment variables:

- `MONGODB_URI` - MongoDB connection string
- `REDIS_HOST` - Redis host
- `REDIS_PASSWORD` - Redis password
- `BACKUP_RETENTION_DAYS` - Backup retention period
- `BACKUP_NOTIFICATION_WEBHOOK` - Notification webhook URL

### C. Log Files

Backup logs are stored in:

- `/opt/halobuzz/backups/backup.log` - MongoDB backup logs
- `/opt/halobuzz/backups/redis/backup.log` - Redis backup logs
- `/opt/halobuzz/backups/restore.log` - Restore logs

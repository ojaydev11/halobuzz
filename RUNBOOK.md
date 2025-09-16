# HaloBuzz Platform Runbook v1.0

## 📋 Table of Contents

1. [Quick Start Guide](#quick-start-guide)
2. [Installation & Setup](#installation--setup)
3. [Configuration Management](#configuration-management)
4. [Service Management](#service-management)
5. [Monitoring & Health Checks](#monitoring--health-checks)
6. [Troubleshooting](#troubleshooting)
7. [Backup & Recovery](#backup--recovery)
8. [Security Operations](#security-operations)
9. [Performance Optimization](#performance-optimization)
10. [Emergency Procedures](#emergency-procedures)

---

## 🚀 Quick Start Guide

### Prerequisites

- **Node.js**: 20.x or higher
- **MongoDB**: 7.x or higher
- **Redis**: 7.x or higher
- **Docker**: 20.x or higher
- **Docker Compose**: 2.x or higher

### 5-Minute Setup

```bash
# 1. Clone the repository
git clone https://github.com/halobuzz/halobuzz-platform.git
cd halobuzz-platform

# 2. Complete setup
make setup

# 3. Start services
make up

# 4. Verify installation
make health
```

**Expected Output**:
```
✅ Backend: http://localhost:5010/api/v1/monitoring/health
✅ AI Engine: http://localhost:5020/api/v1/health
✅ Services running successfully
```

---

## 🔧 Installation & Setup

### Development Environment

#### 1. System Requirements

**Minimum Requirements**:
- **CPU**: 4 cores
- **RAM**: 8GB
- **Storage**: 50GB free space
- **OS**: macOS, Linux, or Windows with WSL2

**Recommended Requirements**:
- **CPU**: 8 cores
- **RAM**: 16GB
- **Storage**: 100GB SSD
- **OS**: Ubuntu 22.04 LTS or macOS Monterey+

#### 2. Install Dependencies

```bash
# Install Node.js (using nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install pnpm
npm install -g pnpm
```

#### 3. Project Setup

```bash
# Clone repository
git clone https://github.com/halobuzz/halobuzz-platform.git
cd halobuzz-platform

# Install dependencies
make install

# Setup environment files
make setup-env

# Start development services
make dev
```

### Production Environment

#### 1. Server Requirements

**Minimum Production Specs**:
- **CPU**: 8 cores
- **RAM**: 32GB
- **Storage**: 500GB SSD
- **Network**: 1Gbps
- **OS**: Ubuntu 22.04 LTS

**Recommended Production Specs**:
- **CPU**: 16 cores
- **RAM**: 64GB
- **Storage**: 1TB NVMe SSD
- **Network**: 10Gbps
- **OS**: Ubuntu 22.04 LTS

#### 2. Production Deployment

```bash
# Clone repository
git clone https://github.com/halobuzz/halobuzz-platform.git
cd halobuzz-platform

# Switch to production branch
git checkout production

# Setup production environment
cp .env.production.example .env.production
# Edit .env.production with production values

# Deploy to production
make deploy-prod

# Verify deployment
make health
```

---

## ⚙️ Configuration Management

### Environment Variables

#### Required Variables

```bash
# Server Configuration
NODE_ENV=production
PORT=5010
TZ=Australia/Sydney

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster/db?retryWrites=true&w=majority
REDIS_URL=redis://:password@host:6379

# Security
JWT_SECRET=your-super-secure-jwt-secret-minimum-64-characters-long
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-different-from-jwt-secret

# External Services
AGORA_APP_ID=your-agora-app-id
AGORA_APP_CERT=your-agora-app-certificate

# AWS S3
S3_BUCKET=your-s3-bucket-name
S3_REGION=us-east-1
S3_ACCESS_KEY=your-aws-access-key
S3_SECRET_KEY=your-aws-secret-key

# Payment Gateways
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
ESEWA_MERCHANT_ID=your-esewa-merchant-id
ESEWA_SECRET=your-esewa-secret-key
KHALTI_PUBLIC_KEY=live_public_key_your_khalti_public_key
KHALTI_SECRET_KEY=live_secret_key_your_khalti_secret_key

# AI Services
OPENAI_API_KEY=sk-your-openai-api-key
AI_ENGINE_URL=http://ai-engine:5020
AI_ENGINE_SECRET=your-ai-engine-secret

# Communication
SENDGRID_API_KEY=SG.your-sendgrid-api-key
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

#### Feature Flags

```bash
# Enable/disable features
ENABLE_AI=true
ENABLE_PAYMENTS=true
ENABLE_NOTIFICATIONS=true
ENABLE_MODERATION=true
ENABLE_ANALYTICS=true
```

### Configuration Validation

```bash
# Validate configuration
make config-check

# Expected output:
# ✅ Configuration validation passed
# ✅ All required variables set
# ✅ Security settings validated
# ✅ External services configured
```

---

## 🔄 Service Management

### Starting Services

#### Development Mode

```bash
# Start all services
make up

# Start specific service
docker-compose up -d backend
docker-compose up -d ai-engine
docker-compose up -d mongodb
docker-compose up -d redis
```

#### Production Mode

```bash
# Start production services
make deploy-prod

# Scale services
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --scale backend=3
```

### Stopping Services

```bash
# Stop all services
make down

# Stop specific service
docker-compose stop backend

# Stop and remove volumes
docker-compose down -v
```

### Service Status

```bash
# Check service status
make status

# Check logs
make logs

# Check specific service logs
make logs-backend
make logs-ai
```

### Service Health Checks

```bash
# Run health checks
make health

# Expected output:
# ✅ Backend: http://localhost:5010/api/v1/monitoring/health
# ✅ AI Engine: http://localhost:5020/api/v1/health
# ✅ MongoDB: Connected
# ✅ Redis: Connected
```

---

## 📊 Monitoring & Health Checks

### Health Check Endpoints

#### Backend API Health

```bash
curl http://localhost:5010/api/v1/monitoring/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "ai_engine": "connected"
  },
  "metrics": {
    "uptime": 3600,
    "memory_usage": "45%",
    "cpu_usage": "12%"
  }
}
```

#### AI Engine Health

```bash
curl http://localhost:5020/api/v1/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "openai": "connected",
    "database": "connected",
    "redis": "connected"
  }
}
```

### Monitoring Dashboard

#### Access Monitoring Tools

```bash
# Prometheus Metrics
http://localhost:9090

# Grafana Dashboard
http://localhost:3001
Username: admin
Password: [from GRAFANA_PASSWORD env var]

# Kibana Logs
http://localhost:5601
```

#### Key Metrics to Monitor

**Application Metrics**:
- Request rate (requests/second)
- Response time (p95, p99)
- Error rate (4xx, 5xx responses)
- Active connections

**Infrastructure Metrics**:
- CPU usage
- Memory usage
- Disk usage
- Network I/O

**Business Metrics**:
- User registrations
- Active streams
- Payment transactions
- Chat messages

### Alerting Rules

#### Critical Alerts

```yaml
# High error rate
- alert: HighErrorRate
  expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "High error rate detected"

# High response time
- alert: HighResponseTime
  expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High response time detected"

# Database connection issues
- alert: DatabaseDown
  expr: up{job="mongodb"} == 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Database is down"
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Service Won't Start

**Symptoms**:
- Docker containers exit immediately
- Services return 500 errors
- Connection refused errors

**Diagnosis**:
```bash
# Check container logs
docker-compose logs backend
docker-compose logs ai-engine

# Check service status
docker-compose ps

# Check resource usage
docker stats
```

**Solutions**:
```bash
# Restart services
make down
make up

# Check configuration
make config-check

# Verify dependencies
docker-compose up -d mongodb redis
docker-compose up -d backend
```

#### 2. Database Connection Issues

**Symptoms**:
- "MongoDB connection failed" errors
- "Redis connection failed" errors
- Timeout errors

**Diagnosis**:
```bash
# Test MongoDB connection
docker-compose exec backend node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));
"

# Test Redis connection
docker-compose exec backend node -e "
const redis = require('redis');
const client = redis.createClient(process.env.REDIS_URL);
client.connect()
  .then(() => console.log('Redis connected'))
  .catch(err => console.error('Redis error:', err));
"
```

**Solutions**:
```bash
# Restart database services
docker-compose restart mongodb redis

# Check database logs
docker-compose logs mongodb
docker-compose logs redis

# Verify connection strings
echo $MONGODB_URI
echo $REDIS_URL
```

#### 3. High Memory Usage

**Symptoms**:
- Services consuming >80% memory
- Out of memory errors
- Slow response times

**Diagnosis**:
```bash
# Check memory usage
docker stats

# Check application memory
curl http://localhost:5010/api/v1/monitoring/metrics | grep memory

# Check for memory leaks
docker-compose exec backend node --inspect=0.0.0.0:9229 dist/index.js
```

**Solutions**:
```bash
# Restart services
make down
make up

# Scale services
docker-compose up -d --scale backend=2

# Optimize memory settings
export NODE_OPTIONS="--max-old-space-size=2048"
make up
```

#### 4. Payment Processing Issues

**Symptoms**:
- Payment failures
- Webhook timeouts
- Transaction not found errors

**Diagnosis**:
```bash
# Check payment service logs
docker-compose logs backend | grep -i payment

# Test payment endpoints
curl -X POST http://localhost:5010/api/v1/payments/stripe/create-payment-intent \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000, "currency": "usd"}'

# Check webhook endpoints
curl http://localhost:5010/api/v1/payments/stripe/webhook
```

**Solutions**:
```bash
# Verify payment configuration
echo $STRIPE_SECRET_KEY
echo $ESEWA_MERCHANT_ID
echo $KHALTI_PUBLIC_KEY

# Restart payment services
docker-compose restart backend

# Check external service status
curl https://api.stripe.com/v1/charges
```

### Performance Issues

#### 1. Slow API Responses

**Diagnosis**:
```bash
# Check response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:5010/api/v1/streams

# Check database performance
docker-compose exec mongodb mongosh --eval "db.runCommand({serverStatus: 1})"

# Check Redis performance
docker-compose exec redis redis-cli --latency-history
```

**Solutions**:
```bash
# Enable caching
export ENABLE_CACHE=true
make restart

# Optimize database queries
docker-compose exec backend npm run db:optimize

# Scale services
docker-compose up -d --scale backend=3
```

#### 2. High CPU Usage

**Diagnosis**:
```bash
# Check CPU usage
docker stats

# Profile application
docker-compose exec backend node --prof dist/index.js

# Check for infinite loops
docker-compose logs backend | grep -i "loop\|infinite"
```

**Solutions**:
```bash
# Restart services
make restart

# Optimize code
npm run build:optimized

# Scale horizontally
docker-compose up -d --scale backend=4
```

---

## 💾 Backup & Recovery

### Backup Procedures

#### 1. Database Backup

```bash
# Create MongoDB backup
make db-backup

# Manual backup
docker-compose exec mongodb mongodump --out /backup/$(date +%Y%m%d_%H%M%S)

# Automated backup (cron)
0 2 * * * cd /path/to/halobuzz && make db-backup
```

#### 2. File Storage Backup

```bash
# Backup S3 bucket
aws s3 sync s3://halobuzz-storage s3://halobuzz-backup/$(date +%Y%m%d)

# Backup local files
tar -czf backup_files_$(date +%Y%m%d).tar.gz uploads/ logs/
```

#### 3. Configuration Backup

```bash
# Backup configuration
git add .
git commit -m "Configuration backup $(date)"
git push origin backup

# Backup environment files
cp .env .env.backup.$(date +%Y%m%d)
```

### Recovery Procedures

#### 1. Database Recovery

```bash
# Restore from backup
make db-restore

# Manual restore
docker-compose exec mongodb mongorestore /backup/20240115_020000/

# Point-in-time recovery
docker-compose exec mongodb mongorestore --oplogReplay /backup/20240115_020000/
```

#### 2. Service Recovery

```bash
# Full service recovery
make down
make clean-docker
make up

# Partial recovery
docker-compose restart backend
docker-compose restart ai-engine
```

#### 3. Disaster Recovery

```bash
# Complete system recovery
git clone https://github.com/halobuzz/halobuzz-platform.git
cd halobuzz-platform
make setup
make db-restore
make up
```

---

## 🔒 Security Operations

### Security Monitoring

#### 1. Authentication Monitoring

```bash
# Check failed login attempts
curl http://localhost:5010/api/v1/security/failed-logins

# Monitor suspicious activity
curl http://localhost:5010/api/v1/security/suspicious-activity

# Check JWT token usage
curl http://localhost:5010/api/v1/security/token-usage
```

#### 2. Rate Limiting Monitoring

```bash
# Check rate limit violations
curl http://localhost:5010/api/v1/security/rate-limits

# Monitor API usage
curl http://localhost:5010/api/v1/security/api-usage
```

#### 3. Content Moderation

```bash
# Check moderation queue
curl http://localhost:5010/api/v1/moderation/queue

# Review flagged content
curl http://localhost:5010/api/v1/moderation/flags
```

### Security Incidents

#### 1. Suspected Breach

**Immediate Actions**:
```bash
# 1. Isolate affected services
docker-compose stop backend

# 2. Check logs for suspicious activity
docker-compose logs backend | grep -i "breach\|attack\|unauthorized"

# 3. Rotate secrets
make rotate-secrets

# 4. Notify security team
curl -X POST http://localhost:5010/api/v1/security/incident \
  -H "Content-Type: application/json" \
  -d '{"type": "breach", "severity": "high", "description": "Suspected breach detected"}'
```

#### 2. DDoS Attack

**Immediate Actions**:
```bash
# 1. Enable rate limiting
export ENABLE_RATE_LIMITING=true
docker-compose restart backend

# 2. Block suspicious IPs
curl -X POST http://localhost:5010/api/v1/security/block-ip \
  -H "Content-Type: application/json" \
  -d '{"ip": "192.168.1.100", "reason": "DDoS attack"}'

# 3. Scale services
docker-compose up -d --scale backend=5
```

#### 3. Data Leak

**Immediate Actions**:
```bash
# 1. Stop affected services
docker-compose stop backend

# 2. Check data access logs
docker-compose exec mongodb mongosh --eval "
db.audit_logs.find({
  timestamp: {\$gte: new Date(Date.now() - 3600000)},
  action: 'data_access'
}).sort({timestamp: -1})
"

# 3. Rotate database credentials
make rotate-db-credentials

# 4. Notify affected users
curl -X POST http://localhost:5010/api/v1/security/data-leak-notification
```

### Security Maintenance

#### 1. Regular Security Updates

```bash
# Update dependencies
npm audit fix
docker-compose pull

# Update base images
docker-compose build --no-cache

# Security scan
npm run security:scan
```

#### 2. Secret Rotation

```bash
# Rotate JWT secrets
make rotate-jwt-secrets

# Rotate database passwords
make rotate-db-passwords

# Rotate API keys
make rotate-api-keys
```

---

## ⚡ Performance Optimization

### Database Optimization

#### 1. Index Optimization

```bash
# Analyze slow queries
docker-compose exec mongodb mongosh --eval "
db.setProfilingLevel(2, {slowms: 100})
db.system.profile.find().sort({ts: -1}).limit(10)
"

# Create missing indexes
docker-compose exec backend npm run db:create-indexes
```

#### 2. Query Optimization

```bash
# Enable query logging
export DEBUG=mongoose:query
docker-compose restart backend

# Optimize aggregation pipelines
docker-compose exec backend npm run db:optimize-aggregations
```

### Cache Optimization

#### 1. Redis Optimization

```bash
# Check Redis memory usage
docker-compose exec redis redis-cli info memory

# Optimize Redis configuration
docker-compose exec redis redis-cli config set maxmemory-policy allkeys-lru

# Clear old cache
docker-compose exec redis redis-cli flushdb
```

#### 2. Application Cache

```bash
# Enable response caching
export ENABLE_RESPONSE_CACHE=true
docker-compose restart backend

# Warm up cache
curl http://localhost:5010/api/v1/cache/warm-up
```

### Network Optimization

#### 1. Connection Pooling

```bash
# Optimize database connections
export DB_POOL_SIZE=20
export DB_POOL_MIN=5
export DB_POOL_MAX=50
docker-compose restart backend
```

#### 2. Compression

```bash
# Enable gzip compression
export ENABLE_COMPRESSION=true
docker-compose restart backend
```

---

## 🚨 Emergency Procedures

### Service Outage

#### 1. Complete Service Failure

**Immediate Response**:
```bash
# 1. Check service status
make status

# 2. Restart all services
make down
make up

# 3. Check logs for errors
make logs

# 4. Verify health
make health
```

**Escalation**:
```bash
# 1. Scale services
docker-compose up -d --scale backend=3

# 2. Enable maintenance mode
curl -X POST http://localhost:5010/api/v1/maintenance/enable

# 3. Notify users
curl -X POST http://localhost:5010/api/v1/notifications/maintenance
```

#### 2. Database Failure

**Immediate Response**:
```bash
# 1. Check database status
docker-compose exec mongodb mongosh --eval "db.runCommand({ping: 1})"

# 2. Restart database
docker-compose restart mongodb

# 3. Check replication status
docker-compose exec mongodb mongosh --eval "rs.status()"
```

**Recovery**:
```bash
# 1. Restore from backup
make db-restore

# 2. Rebuild indexes
docker-compose exec backend npm run db:rebuild-indexes

# 3. Verify data integrity
docker-compose exec backend npm run db:verify
```

### Data Corruption

#### 1. Database Corruption

**Immediate Response**:
```bash
# 1. Stop services
docker-compose stop backend

# 2. Check database integrity
docker-compose exec mongodb mongosh --eval "
db.runCommand({repairDatabase: 1})
"

# 3. Restore from backup
make db-restore
```

#### 2. File Corruption

**Immediate Response**:
```bash
# 1. Check file integrity
docker-compose exec backend npm run files:verify

# 2. Restore from backup
aws s3 sync s3://halobuzz-backup/latest s3://halobuzz-storage

# 3. Rebuild thumbnails
docker-compose exec backend npm run files:rebuild-thumbnails
```

### Security Breach

#### 1. Immediate Response

```bash
# 1. Isolate services
docker-compose stop backend ai-engine

# 2. Check logs
docker-compose logs backend | grep -i "breach\|attack\|unauthorized"

# 3. Rotate all secrets
make rotate-all-secrets

# 4. Enable security mode
export SECURITY_MODE=high
docker-compose up -d
```

#### 2. Investigation

```bash
# 1. Collect logs
docker-compose logs backend > security_incident_$(date +%Y%m%d_%H%M%S).log

# 2. Check access patterns
docker-compose exec mongodb mongosh --eval "
db.audit_logs.find({
  timestamp: {\$gte: new Date(Date.now() - 3600000)}
}).sort({timestamp: -1})
"

# 3. Check for data exfiltration
docker-compose exec mongodb mongosh --eval "
db.transactions.find({
  timestamp: {\$gte: new Date(Date.now() - 3600000)},
  amount: {\$gt: 1000}
})
"
```

### Rollback Procedures

#### 1. Application Rollback

```bash
# 1. Check current version
git log --oneline -1

# 2. Rollback to previous version
git checkout HEAD~1

# 3. Rebuild and restart
make build
make restart
```

#### 2. Database Rollback

```bash
# 1. Stop services
docker-compose stop backend

# 2. Restore previous backup
make db-restore --backup=previous

# 3. Restart services
docker-compose start backend
```

#### 3. Configuration Rollback

```bash
# 1. Restore previous configuration
cp .env.backup.$(date -d '1 day ago' +%Y%m%d) .env

# 2. Restart services
make restart
```

---

## 📞 Support & Escalation

### Support Channels

- **Emergency**: security@halobuzz.com
- **Technical**: tech@halobuzz.com
- **General**: support@halobuzz.com

### Escalation Matrix

| Severity | Response Time | Escalation |
|----------|---------------|------------|
| Critical | 15 minutes | CTO, Security Team |
| High | 1 hour | Engineering Manager |
| Medium | 4 hours | Senior Developer |
| Low | 24 hours | Support Team |

### On-Call Procedures

1. **Page on-call engineer** for critical issues
2. **Create incident ticket** in tracking system
3. **Follow runbook procedures** for resolution
4. **Document lessons learned** post-incident
5. **Update runbook** with new procedures

---

This runbook provides comprehensive operational procedures for the HaloBuzz platform. For additional support or clarification, contact the technical team or refer to the individual service documentation.

# HaloBuzz Deployment Guide

## 1. Pre-Deployment Checklist

### 1.1 Environment Setup
- [ ] Docker and Docker Compose installed
- [ ] Node.js 18+ and npm/pnpm installed
- [ ] MongoDB 6.0+ running
- [ ] Redis 6.0+ running
- [ ] Environment files configured
- [ ] SSL certificates obtained
- [ ] Domain names configured

### 1.2 Security Prerequisites
- [ ] JWT secrets generated
- [ ] API keys for payment providers
- [ ] AI engine secrets configured
- [ ] Database credentials secured
- [ ] Firewall rules configured
- [ ] SSL/TLS certificates installed

### 1.3 Infrastructure Requirements
- [ ] Minimum 4GB RAM per service
- [ ] 50GB storage for database
- [ ] 10GB storage for logs
- [ ] Network bandwidth: 100Mbps
- [ ] Load balancer configured
- [ ] CDN setup for static assets

## 2. Local Development Deployment

### 2.1 Environment Configuration
```bash
# Copy environment files
cp env.backend.local.example .env.backend.local
cp env.ai.local.example .env.ai.local
cp env.mobile.example .env.mobile

# Edit environment files with your configuration
nano .env.backend.local
nano .env.ai.local
nano .env.mobile
```

### 2.2 Docker Deployment
```bash
# Build and start services
docker compose build --no-cache
docker compose up -d

# Check service status
docker compose ps

# View logs
docker compose logs -f backend
docker compose logs -f ai-engine
```

### 2.3 Database Setup
```bash
# Wait for services to be healthy
sleep 30

# Seed initial data
docker compose exec backend node dist/scripts/seeds/index.js

# Verify database connection
docker compose exec backend node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/halobuzz');
console.log('Database connected successfully');
"
```

### 2.4 Health Checks
```bash
# Backend health check
curl http://localhost:5010/healthz

# AI Engine health check
curl http://localhost:5020/healthz

# Expected response: {"status":"healthy","timestamp":"2025-09-01T00:00:00.000Z"}
```

## 3. Staging Deployment

### 3.1 Staging Environment Setup
```bash
# Create staging environment files
cp env.backend.local.example .env.backend.staging
cp env.ai.local.example .env.ai.staging

# Update staging configuration
export ENV=staging
export MONGODB_URI=mongodb://staging-db:27017/halobuzz-staging
export REDIS_URL=redis://staging-redis:6379
export JWT_SECRET=staging-jwt-secret
export AI_ENGINE_SECRET=staging-ai-secret
```

### 3.2 Staging Deployment
```bash
# Build staging images
docker compose -f docker-compose.staging.yml build

# Deploy to staging
docker compose -f docker-compose.staging.yml up -d

# Run staging tests
npm run test:staging
```

### 3.3 Staging Validation
```bash
# Run smoke tests
AI_ENGINE_SECRET=$AI_ENGINE_SECRET npm run smoke

# Run integration tests
npm run test:integration

# Performance testing
npm run test:performance
```

## 4. Production Deployment

### 4.1 Production Environment Setup
```bash
# Create production environment files
cp env.backend.local.example .env.backend.production
cp env.ai.local.example .env.ai.production

# Secure production configuration
export ENV=production
export MONGODB_URI=mongodb://prod-db-cluster:27017/halobuzz
export REDIS_URL=redis://prod-redis-cluster:6379
export JWT_SECRET=$(openssl rand -base64 64)
export AI_ENGINE_SECRET=$(openssl rand -base64 64)
```

### 4.2 Production Security Configuration
```bash
# Generate secure secrets
openssl rand -base64 64 > jwt-secret.txt
openssl rand -base64 64 > ai-secret.txt

# Set secure file permissions
chmod 600 jwt-secret.txt ai-secret.txt

# Configure SSL certificates
mkdir -p ssl
cp /path/to/ssl/cert.pem ssl/
cp /path/to/ssl/private.key ssl/
chmod 600 ssl/private.key
```

### 4.3 Production Deployment
```bash
# Build production images
docker compose -f docker-compose.production.yml build

# Deploy with zero downtime
docker compose -f docker-compose.production.yml up -d --scale backend=3

# Verify deployment
docker compose -f docker-compose.production.yml ps
```

### 4.4 Production Validation
```bash
# Health checks
curl https://api.halobuzz.com/healthz
curl https://ai.halobuzz.com/healthz

# Load testing
npm run test:load

# Security scanning
npm run security:scan
```

## 5. Database Migration

### 5.1 Schema Migration
```bash
# Run database migrations
docker compose exec backend node dist/scripts/migrate.js

# Verify schema
docker compose exec backend node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI);
console.log('Schema verification complete');
"
```

### 5.2 Data Migration
```bash
# Backup existing data
mongodump --uri=$MONGODB_URI --out=/backup/$(date +%Y%m%d)

# Run data migration
docker compose exec backend node dist/scripts/data-migrate.js

# Verify data integrity
docker compose exec backend node dist/scripts/verify-data.js
```

## 6. Load Balancer Configuration

### 6.1 Nginx Configuration
```nginx
# /etc/nginx/sites-available/halobuzz
upstream backend {
    server backend1:5010;
    server backend2:5010;
    server backend3:5010;
}

upstream ai-engine {
    server ai-engine1:5020;
    server ai-engine2:5020;
}

server {
    listen 443 ssl http2;
    server_name api.halobuzz.com;
    
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/private.key;
    
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name ai.halobuzz.com;
    
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/private.key;
    
    location / {
        proxy_pass http://ai-engine;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 6.2 Load Balancer Health Checks
```bash
# Configure health check endpoints
curl http://backend1:5010/healthz
curl http://backend2:5010/healthz
curl http://backend3:5010/healthz

# Monitor load balancer status
nginx -t
systemctl reload nginx
```

## 7. Monitoring and Logging Setup

### 7.1 Log Aggregation
```bash
# Configure log rotation
cat > /etc/logrotate.d/halobuzz << EOF
/var/log/halobuzz/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
    postrotate
        docker compose restart backend ai-engine
    endscript
}
EOF
```

### 7.2 Monitoring Configuration
```bash
# Install monitoring tools
apt-get update
apt-get install -y prometheus-node-exporter

# Configure Prometheus
cat > /etc/prometheus/prometheus.yml << EOF
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'halobuzz-backend'
    static_configs:
      - targets: ['backend1:5010', 'backend2:5010', 'backend3:5010']
  
  - job_name: 'halobuzz-ai-engine'
    static_configs:
      - targets: ['ai-engine1:5020', 'ai-engine2:5020']
EOF
```

## 8. Backup and Recovery

### 8.1 Database Backup
```bash
# Create backup script
cat > /usr/local/bin/backup-halobuzz.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/halobuzz"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Database backup
mongodump --uri=$MONGODB_URI --out=$BACKUP_DIR/db_$DATE

# Compress backup
tar -czf $BACKUP_DIR/halobuzz_$DATE.tar.gz -C $BACKUP_DIR db_$DATE

# Remove old backups (keep 30 days)
find $BACKUP_DIR -name "halobuzz_*.tar.gz" -mtime +30 -delete

echo "Backup completed: halobuzz_$DATE.tar.gz"
EOF

chmod +x /usr/local/bin/backup-halobuzz.sh

# Schedule daily backups
echo "0 2 * * * /usr/local/bin/backup-halobuzz.sh" | crontab -
```

### 8.2 Recovery Procedures
```bash
# Database recovery
tar -xzf /backup/halobuzz/halobuzz_20250901_020000.tar.gz
mongorestore --uri=$MONGODB_URI /backup/halobuzz/db_20250901_020000/halobuzz

# Service recovery
docker compose down
docker compose up -d
```

## 9. Security Hardening

### 9.1 System Hardening
```bash
# Update system packages
apt-get update && apt-get upgrade -y

# Configure firewall
ufw enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw deny 5010/tcp
ufw deny 5020/tcp

# Disable unnecessary services
systemctl disable apache2
systemctl disable nginx
systemctl enable docker
```

### 9.2 Docker Security
```bash
# Configure Docker daemon security
cat > /etc/docker/daemon.json << EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "userns-remap": "default"
}
EOF

systemctl restart docker
```

## 10. Performance Optimization

### 10.1 Database Optimization
```bash
# Configure MongoDB for production
cat > /etc/mongod.conf << EOF
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true
  wiredTiger:
    engineConfig:
      cacheSizeGB: 2

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

net:
  port: 27017
  bindIp: 127.0.0.1

processManagement:
  timeZoneInfo: /usr/share/zoneinfo
EOF

systemctl restart mongod
```

### 10.2 Redis Optimization
```bash
# Configure Redis for production
cat > /etc/redis/redis.conf << EOF
bind 127.0.0.1
port 6379
timeout 300
tcp-keepalive 60

# Memory management
maxmemory 1gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log
EOF

systemctl restart redis-server
```

## 11. Deployment Automation

### 11.1 CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy HaloBuzz

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm install
        
      - name: Run tests
        run: npm test
        
      - name: Build Docker images
        run: docker compose build
        
      - name: Deploy to production
        run: |
          docker compose -f docker-compose.production.yml up -d
          docker compose -f docker-compose.production.yml ps
```

### 11.2 Deployment Scripts
```bash
# Create deployment script
cat > /usr/local/bin/deploy-halobuzz.sh << 'EOF'
#!/bin/bash
set -e

echo "Starting HaloBuzz deployment..."

# Pull latest code
git pull origin main

# Build and deploy
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d

# Wait for services to be healthy
sleep 30

# Run health checks
curl -f http://localhost:5010/healthz || exit 1
curl -f http://localhost:5020/healthz || exit 1

echo "Deployment completed successfully!"
EOF

chmod +x /usr/local/bin/deploy-halobuzz.sh
```

## 12. Troubleshooting

### 12.1 Common Issues
```bash
# Service not starting
docker compose logs backend
docker compose logs ai-engine

# Database connection issues
docker compose exec backend node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI);
console.log('Connection status:', mongoose.connection.readyState);
"

# Memory issues
docker stats
free -h
df -h
```

### 12.2 Performance Issues
```bash
# Check resource usage
docker stats --no-stream

# Database performance
docker compose exec backend node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI);
mongoose.connection.db.stats().then(console.log);
"

# Network issues
netstat -tulpn | grep :5010
netstat -tulpn | grep :5020
```

## 13. Rollback Procedures

### 13.1 Application Rollback
```bash
# Rollback to previous version
git checkout HEAD~1
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d

# Verify rollback
curl http://localhost:5010/healthz
curl http://localhost:5020/healthz
```

### 13.2 Database Rollback
```bash
# Restore from backup
tar -xzf /backup/halobuzz/halobuzz_20250901_020000.tar.gz
mongorestore --uri=$MONGODB_URI /backup/halobuzz/db_20250901_020000/halobuzz

# Verify data integrity
docker compose exec backend node dist/scripts/verify-data.js
```

## 14. Maintenance Procedures

### 14.1 Regular Maintenance
```bash
# Weekly maintenance script
cat > /usr/local/bin/maintain-halobuzz.sh << 'EOF'
#!/bin/bash
echo "Starting weekly maintenance..."

# Update system packages
apt-get update && apt-get upgrade -y

# Clean Docker images
docker system prune -f

# Rotate logs
logrotate -f /etc/logrotate.d/halobuzz

# Backup database
/usr/local/bin/backup-halobuzz.sh

echo "Maintenance completed!"
EOF

chmod +x /usr/local/bin/maintain-halobuzz.sh

# Schedule weekly maintenance
echo "0 3 * * 0 /usr/local/bin/maintain-halobuzz.sh" | crontab -
```

### 14.2 Monitoring Maintenance
```bash
# Check service health
docker compose ps
docker compose logs --tail=100 backend
docker compose logs --tail=100 ai-engine

# Check disk space
df -h
du -sh /var/lib/docker
du -sh /backup/halobuzz

# Check memory usage
free -h
docker stats --no-stream
```

---

**Last Updated**: September 1, 2025  
**Version**: 0.1.0  
**Deployment Team**: HaloBuzz DevOps  
**Environment**: Production Ready

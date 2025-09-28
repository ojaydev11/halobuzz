# HaloBuzz Production Deployment Guide

## 🚀 Pre-Deployment Checklist

### ✅ Code Quality
- [ ] All TypeScript errors fixed
- [ ] All tests passing
- [ ] Code review completed
- [ ] Security audit passed
- [ ] Performance benchmarks met

### ✅ Database
- [ ] All indexes created
- [ ] Data migration scripts ready
- [ ] Backup procedures tested
- [ ] Connection pooling configured
- [ ] Monitoring enabled

### ✅ Security
- [ ] Authentication system implemented
- [ ] Payment security validated
- [ ] GDPR compliance verified
- [ ] Rate limiting configured
- [ ] Input validation implemented

### ✅ Infrastructure
- [ ] Production servers provisioned
- [ ] Load balancers configured
- [ ] CDN setup completed
- [ ] SSL certificates installed
- [ ] Monitoring and alerting configured

## 🏗️ Infrastructure Setup

### 1. Server Requirements

#### Backend Servers (2x)
- **CPU:** 8 cores, 2.4GHz+
- **RAM:** 16GB
- **Storage:** 100GB SSD
- **OS:** Ubuntu 20.04 LTS
- **Network:** 1Gbps

#### Database Server (1x)
- **CPU:** 16 cores, 2.4GHz+
- **RAM:** 32GB
- **Storage:** 500GB SSD
- **OS:** Ubuntu 20.04 LTS
- **Network:** 1Gbps

#### Redis Server (1x)
- **CPU:** 4 cores, 2.4GHz+
- **RAM:** 8GB
- **Storage:** 50GB SSD
- **OS:** Ubuntu 20.04 LTS
- **Network:** 1Gbps

### 2. Environment Configuration

#### Production Environment Variables
```bash
# Database
MONGODB_URI=mongodb://halobuzz:password@db.halobuzz.com:27017/halobuzz_prod
REDIS_URL=redis://redis.halobuzz.com:6379

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-key
JWT_ACCESS_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Agora
AGORA_APP_ID=your-agora-app-id
AGORA_APP_CERT=your-agora-app-certificate

# Payment
ESEWA_SECRET_KEY=your-esewa-secret-key
KHALTI_SECRET_KEY=your-khalti-secret-key
STRIPE_SECRET_KEY=your-stripe-secret-key

# Monitoring
SENTRY_DSN=your-sentry-dsn
NEW_RELIC_LICENSE_KEY=your-newrelic-license-key

# Security
ENCRYPTION_KEY=your-encryption-key
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# App Store
APPLE_APP_ID=com.halobuzz.app
GOOGLE_PACKAGE_NAME=com.halobuzz.app
```

## 🐳 Docker Deployment

### 1. Backend Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### 2. Docker Compose
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/halobuzz_prod
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongo
      - redis
    restart: unless-stopped

  mongo:
    image: mongo:5.0
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  mongo_data:
  redis_data:
```

## 📱 Mobile App Deployment

### 1. iOS App Store

#### Build Configuration
```bash
# Set production environment
export EXPO_PUBLIC_API_URL=https://api.halobuzz.com
export EXPO_PUBLIC_ENV=production

# Build for iOS
eas build --platform ios --profile production
```

#### App Store Connect
1. Upload build to App Store Connect
2. Complete app information
3. Submit for review
4. Wait for approval (1-7 days)

### 2. Google Play Store

#### Build Configuration
```bash
# Set production environment
export EXPO_PUBLIC_API_URL=https://api.halobuzz.com
export EXPO_PUBLIC_ENV=production

# Build for Android
eas build --platform android --profile production
```

#### Play Console
1. Upload APK/AAB to Play Console
2. Complete store listing
3. Submit for review
4. Wait for approval (1-3 days)

## 🔧 Database Setup

### 1. MongoDB Setup
```bash
# Connect to MongoDB
mongo mongodb://halobuzz:password@db.halobuzz.com:27017/halobuzz_prod

# Create indexes
use halobuzz_prod
db.users.createIndex({ email: 1, isBanned: 1 })
db.users.createIndex({ username: 1, isBanned: 1 })
db.users.createIndex({ 'trust.score': -1 })
db.users.createIndex({ 'karma.total': -1 })
db.users.createIndex({ country: 1 })
db.users.createIndex({ lastActiveAt: -1 })

db.livestreams.createIndex({ status: 1, category: 1, country: 1, currentViewers: -1 })
db.livestreams.createIndex({ hostId: 1, status: 1, createdAt: -1 })
db.livestreams.createIndex({ agoraChannel: 1 }, { unique: true })
db.livestreams.createIndex({ streamKey: 1 }, { unique: true })

db.transactions.createIndex({ userId: 1, status: 1, createdAt: -1 })
db.transactions.createIndex({ type: 1, status: 1, createdAt: -1 })
db.transactions.createIndex({ 'metadata.orderId': 1 }, { sparse: true, unique: true })
db.transactions.createIndex({ idempotencyKey: 1 }, { sparse: true, unique: true })

# Create TTL indexes
db.failed_transactions.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 })
db.messages.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 })
db.analytics_events.createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000 })
db.auditlogs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 31536000 })
```

### 2. Redis Setup
```bash
# Configure Redis
redis-cli CONFIG SET maxmemory 6gb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
redis-cli CONFIG SET save "900 1 300 10 60 10000"
```

## 🔒 Security Configuration

### 1. SSL/TLS Setup
```bash
# Generate SSL certificate
certbot certonly --standalone -d api.halobuzz.com
certbot certonly --standalone -d halobuzz.com

# Configure Nginx
server {
    listen 443 ssl http2;
    server_name api.halobuzz.com;
    
    ssl_certificate /etc/letsencrypt/live/api.halobuzz.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.halobuzz.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    location / {
        proxy_pass http://backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. Firewall Configuration
```bash
# Configure UFW
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 27017/tcp
ufw allow 6379/tcp
ufw enable
```

## 📊 Monitoring Setup

### 1. Application Monitoring
```bash
# Install New Relic
npm install newrelic

# Configure New Relic
export NEW_RELIC_LICENSE_KEY=your-license-key
export NEW_RELIC_APP_NAME=HaloBuzz-Backend
```

### 2. Log Management
```bash
# Configure log rotation
sudo nano /etc/logrotate.d/halobuzz

# Log rotation configuration
/var/log/halobuzz/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 halobuzz halobuzz
}
```

### 3. Health Checks
```bash
# Create health check script
#!/bin/bash
curl -f http://localhost:3000/api/v1/health || exit 1
```

## 🚀 Deployment Process

### 1. Pre-Deployment
```bash
# Run tests
npm run test:ci

# Build application
npm run build

# Security audit
npm audit

# Performance test
npm run test:load
```

### 2. Deployment
```bash
# Deploy to staging
docker-compose -f docker-compose.staging.yml up -d --build

# Run staging tests
npm run test:staging

# Deploy to production
docker-compose -f docker-compose.production.yml up -d --build
```

### 3. Post-Deployment
```bash
# Verify deployment
curl -f https://api.halobuzz.com/api/v1/health

# Check logs
docker-compose logs -f backend

# Monitor metrics
curl https://api.halobuzz.com/api/v1/monitoring/metrics
```

## 🔄 Rollback Procedure

### 1. Quick Rollback
```bash
# Stop current deployment
docker-compose down

# Deploy previous version
docker-compose -f docker-compose.production.yml up -d --build
```

### 2. Database Rollback
```bash
# Restore from backup
mongorestore --host db.halobuzz.com:27017 --db halobuzz_prod /backup/halobuzz_prod_$(date -d '1 day ago' +%Y%m%d)
```

## 📈 Performance Optimization

### 1. Database Optimization
- Enable query profiling
- Monitor slow queries
- Optimize indexes
- Use connection pooling

### 2. Caching Strategy
- Redis for session storage
- CDN for static assets
- Application-level caching
- Database query caching

### 3. Load Balancing
- Nginx load balancer
- Health checks
- Session affinity
- Failover configuration

## 🚨 Incident Response

### 1. Monitoring Alerts
- CPU usage > 80%
- Memory usage > 85%
- Database slow queries > 10
- Redis connection lost
- Application errors > 5%

### 2. Escalation Procedure
1. **Level 1:** Automated alerts
2. **Level 2:** On-call engineer
3. **Level 3:** Senior engineer
4. **Level 4:** Engineering manager

### 3. Communication
- Slack alerts for critical issues
- Email notifications for stakeholders
- Status page updates
- User notifications if needed

## 📋 Maintenance Schedule

### Daily
- Check system health
- Review error logs
- Monitor performance metrics
- Verify backup completion

### Weekly
- Security updates
- Performance optimization
- Capacity planning
- User feedback review

### Monthly
- Full system backup
- Security audit
- Performance review
- Disaster recovery test

---

**This deployment guide ensures HaloBuzz is production-ready with proper security, monitoring, and scalability measures in place.**

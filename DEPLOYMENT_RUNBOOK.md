# HaloBuzz Platform - Complete Deployment Runbook

**Last Updated**: January 2025
**Version**: 1.0.0
**Platform**: Production-Ready Global Deployment

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Backend Deployment](#backend-deployment)
4. [AI Engine Deployment](#ai-engine-deployment)
5. [Mobile App Deployment](#mobile-app-deployment)
6. [Admin Dashboard Deployment](#admin-dashboard-deployment)
7. [Database Setup](#database-setup)
8. [Third-Party Services](#third-party-services)
9. [Environment Configuration](#environment-configuration)
10. [Testing & Verification](#testing--verification)
11. [Monitoring & Observability](#monitoring--observability)
12. [Rollback Procedures](#rollback-procedures)
13. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    HaloBuzz Platform                     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Mobile App  │  │  Admin Panel │  │   Web App    │  │
│  │   (Expo)     │  │  (Next.js)   │  │  (Optional)  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                  │                  │           │
│         └──────────────────┼──────────────────┘           │
│                            │                              │
│                    ┌───────▼────────┐                     │
│                    │  Load Balancer │                     │
│                    │    (Nginx)     │                     │
│                    └───────┬────────┘                     │
│                            │                              │
│         ┌──────────────────┼──────────────────┐          │
│         │                  │                  │          │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐  │
│  │   Backend    │  │ AI Engine    │  │   WebSocket  │  │
│  │  (Node.js)   │  │ (Python)     │  │  (Socket.IO) │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                  │                  │          │
│         └──────────────────┼──────────────────┘          │
│                            │                             │
│         ┌──────────────────┼──────────────────┐         │
│         │                  │                  │         │
│  ┌──────▼───────┐  ┌──────▼───────┐  ┌──────▼───────┐ │
│  │   MongoDB    │  │    Redis     │  │     AWS S3   │ │
│  │   (Atlas)    │  │  (Upstash)   │  │   (Storage)  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Technology | Hosting |
|-----------|-----------|---------|
| Mobile App | React Native (Expo) | App Store / Play Store |
| Backend API | Node.js + Express + TypeScript | Railway / Northflank |
| AI Engine | Python + TensorFlow | Railway / Northflank |
| Admin Dashboard | Next.js | Vercel |
| Database | MongoDB | MongoDB Atlas |
| Cache/Sessions | Redis | Upstash / Redis Cloud |
| File Storage | S3-compatible | AWS S3 / Cloudflare R2 |
| CDN | CloudFront / Cloudflare | AWS / Cloudflare |
| Live Streaming | Agora SDK | Agora Cloud |

---

## Pre-Deployment Checklist

### Required Accounts & Services

- [ ] **MongoDB Atlas** - Database hosting
- [ ] **Redis Cloud / Upstash** - Cache and sessions
- [ ] **AWS Account** - S3 storage, CloudFront CDN
- [ ] **Railway / Northflank** - Backend hosting
- [ ] **Vercel** - Admin dashboard hosting
- [ ] **Expo Account** - Mobile app builds
- [ ] **Apple Developer** - iOS app distribution
- [ ] **Google Play Console** - Android app distribution
- [ ] **Agora Account** - Live streaming infrastructure
- [ ] **Stripe Account** - Payment processing
- [ ] **Sentry Account** - Error tracking
- [ ] **Domain Registrar** - DNS for halobuzz.com

### DNS Configuration

```dns
# A Records
halobuzz.com          A    <backend-ip>
www.halobuzz.com      A    <backend-ip>
api.halobuzz.com      A    <backend-ip>
admin.halobuzz.com    CNAME vercel-alias.vercel-dns.com

# CDN
cdn.halobuzz.com      CNAME <cloudfront-domain>
media.halobuzz.com    CNAME <s3-bucket>.s3.amazonaws.com

# Services
ai.halobuzz.com       A    <ai-engine-ip>
```

### SSL Certificates

```bash
# Let's Encrypt via Certbot
sudo certbot certonly --nginx -d halobuzz.com -d www.halobuzz.com -d api.halobuzz.com

# Auto-renewal
sudo certbot renew --dry-run
```

---

## Backend Deployment

### Option A: Railway (Recommended)

#### Step 1: Create Railway Project

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
cd backend
railway init

# Link to existing project (if created via UI)
railway link <project-id>
```

#### Step 2: Configure Environment Variables

```bash
# Set environment variables via CLI
railway variables set NODE_ENV=production
railway variables set PORT=5010
railway variables set MONGODB_URI=mongodb+srv://...
railway variables set JWT_SECRET=<strong-secret>

# OR upload .env file via Railway dashboard
# Settings → Variables → Raw Editor → paste contents
```

#### Step 3: Deploy

```bash
# Deploy from local
railway up

# OR connect GitHub repository
# Railway will auto-deploy on push to main branch
```

#### Step 4: Configure Custom Domain

```bash
# Via Railway dashboard
# Settings → Domains → Add Domain → api.halobuzz.com

# Add DNS record:
# CNAME api.halobuzz.com → <railway-domain>.railway.app
```

### Option B: Northflank

#### Step 1: Create Project via UI

1. Go to https://northflank.com
2. Create new project: "HaloBuzz"
3. Create service: "Backend API"

#### Step 2: Connect Repository

```bash
# Connect GitHub repository
# Select branch: main
# Build configuration:
# - Build command: npm run build
# - Start command: npm start
# - Port: 5010
```

#### Step 3: Environment Variables

```bash
# Add via Northflank UI
# Project → Services → Backend API → Environment
# Import from .env or add manually
```

#### Step 4: Deploy

```bash
# Automatic deployment on git push
git push origin main

# OR trigger manual deployment via UI
```

### Option C: Docker (Self-Hosted)

#### Step 1: Build Docker Image

```dockerfile
# backend/Dockerfile already exists
# Build image
docker build -t halobuzz-backend:latest .

# Test locally
docker run -p 5010:5010 --env-file .env halobuzz-backend:latest
```

#### Step 2: Push to Registry

```bash
# Docker Hub
docker tag halobuzz-backend:latest username/halobuzz-backend:latest
docker push username/halobuzz-backend:latest

# OR Amazon ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.us-east-1.amazonaws.com
docker tag halobuzz-backend:latest <account-id>.dkr.ecr.us-east-1.amazonaws.com/halobuzz-backend:latest
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/halobuzz-backend:latest
```

#### Step 3: Deploy to Server

```bash
# Pull and run on production server
ssh user@api.halobuzz.com

# Pull image
docker pull username/halobuzz-backend:latest

# Run with docker-compose
docker-compose up -d
```

### Health Check Verification

```bash
# Check backend health
curl https://api.halobuzz.com/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-01-25T10:00:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

---

## AI Engine Deployment

### Step 1: Prepare AI Engine

```bash
cd ai-engine

# Install dependencies
pip install -r requirements.txt

# Download ML models (if not in repo)
python scripts/download_models.py
```

### Step 2: Deploy to Railway/Northflank

```bash
# Create separate service for AI Engine
railway init

# Set environment variables
railway variables set PYTHON_VERSION=3.11
railway variables set AI_ENGINE_SECRET=<strong-secret>
railway variables set BACKEND_URL=https://api.halobuzz.com

# Deploy
railway up
```

### Step 3: Configure Backend Connection

```bash
# Update backend .env
AI_ENGINE_URL=https://ai.halobuzz.com
AI_ENGINE_SECRET=<matching-secret>

# Restart backend
railway restart
```

### Step 4: Verify AI Engine

```bash
# Test NSFW detection
curl -X POST https://ai.halobuzz.com/detect \
  -H "Authorization: Bearer $AI_ENGINE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://example.com/test.jpg"}'
```

---

## Mobile App Deployment

### See BUILD_AND_DEPLOY_GUIDE.md for detailed instructions

Quick summary:

```bash
cd apps/halobuzz-mobile

# Build for production
eas build --profile production --platform all

# Submit to stores
eas submit --platform ios --latest
eas submit --platform android --latest
```

---

## Admin Dashboard Deployment

### Vercel Deployment (Recommended)

#### Step 1: Connect GitHub Repository

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link project
cd admin
vercel link

# Deploy
vercel --prod
```

#### Step 2: Configure Environment Variables

```bash
# Via Vercel dashboard
# Project Settings → Environment Variables

NEXT_PUBLIC_API_URL=https://api.halobuzz.com
NEXT_PUBLIC_ENV=production
```

#### Step 3: Configure Custom Domain

```bash
# Vercel dashboard → Domains → Add Domain
# Add: admin.halobuzz.com

# DNS:
# CNAME admin.halobuzz.com → cname.vercel-dns.com
```

### Alternative: Self-Hosted

```bash
cd admin

# Build
npm run build

# Start
npm start

# OR use PM2
pm2 start npm --name "halobuzz-admin" -- start
pm2 save
pm2 startup
```

---

## Database Setup

### MongoDB Atlas Configuration

#### Step 1: Create Cluster

1. Go to https://cloud.mongodb.com
2. Create new cluster:
   - **Cloud Provider**: AWS
   - **Region**: us-east-1 (or closest to users)
   - **Tier**: M10+ (production)
   - **Cluster Name**: halobuzz-prod

#### Step 2: Configure Security

```bash
# Database Access → Add User
Username: halobuzz-api
Password: <strong-password>
Role: readWrite on halobuzz database

# Network Access → Add IP
0.0.0.0/0 (all IPs - restrict in production)
# OR specific IPs of backend servers
```

#### Step 3: Get Connection String

```bash
# Cluster → Connect → Connect Your Application
mongodb+srv://halobuzz-api:<password>@halobuzz-prod.xxxxx.mongodb.net/halobuzz?retryWrites=true&w=majority

# Set in backend environment
MONGODB_URI=<connection-string>
```

#### Step 4: Create Indexes

```bash
# Connect via MongoDB Compass or mongosh
mongosh "mongodb+srv://halobuzz-prod.xxxxx.mongodb.net/halobuzz"

# Create indexes for performance
use halobuzz

# Users collection
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ username: 1 }, { unique: true })
db.users.createIndex({ createdAt: -1 })

# Transactions collection
db.transactions.createIndex({ userId: 1, createdAt: -1 })
db.transactions.createIndex({ type: 1, status: 1 })
db.transactions.createIndex({ "metadata.stripeSessionId": 1 }, { sparse: true })

# Streams collection
db.streams.createIndex({ hostId: 1, status: 1 })
db.streams.createIndex({ isLive: 1, startTime: -1 })
db.streams.createIndex({ category: 1, viewers: -1 })

# Games collection
db.games.createIndex({ sessionId: 1 })
db.games.createIndex({ players: 1, status: 1 })
```

### Redis Setup (Upstash)

#### Step 1: Create Database

1. Go to https://upstash.com
2. Create database:
   - **Name**: halobuzz-prod
   - **Type**: Redis
   - **Region**: us-east-1

#### Step 2: Get Connection Details

```bash
# Copy connection string
REDIS_URL=rediss://default:<password>@<endpoint>.upstash.io:6379

# Set in backend environment
```

#### Step 3: Configure Eviction Policy

```bash
# Upstash Console → Configuration
# Eviction Policy: allkeys-lru
# Max Memory: Based on plan
```

---

## Third-Party Services

### Agora (Live Streaming)

```bash
# Get credentials from https://console.agora.io
AGORA_APP_ID=<your-app-id>
AGORA_APP_CERTIFICATE=<your-certificate>
AGORA_PRIMARY_KEY=<your-primary-key>

# Enable features:
# - Video Call
# - Live Interactive Streaming
# - Cloud Recording (optional)
```

### Stripe (Payments)

```bash
# Get API keys from https://dashboard.stripe.com
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Create webhook endpoint
# URL: https://api.halobuzz.com/api/v1/webhooks/stripe
# Events: checkout.session.completed, payment_intent.succeeded, charge.refunded

# Get webhook secret
STRIPE_WEBHOOK_SECRET=whsec_...
```

### AWS S3 (File Storage)

```bash
# Create S3 bucket
aws s3 mb s3://halobuzz-media --region us-east-1

# Configure CORS
aws s3api put-bucket-cors --bucket halobuzz-media --cors-configuration file://cors.json

# cors.json:
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://halobuzz.com", "https://api.halobuzz.com"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}

# Create IAM user for backend
aws iam create-user --user-name halobuzz-backend
aws iam create-access-key --user-name halobuzz-backend

# Set environment variables
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=halobuzz-media
AWS_REGION=us-east-1
```

### Sentry (Error Tracking)

```bash
# Create project at https://sentry.io
SENTRY_DSN=https://...@sentry.io/...

# Initialize in backend
npm install @sentry/node

# In index.ts:
import * as Sentry from '@sentry/node';
Sentry.init({ dsn: process.env.SENTRY_DSN });
```

---

## Environment Configuration

### Production Environment Variables

See `backend/ENV_SETUP_GUIDE.md` for complete reference.

**Critical Variables** (must be set):

```bash
# Server
NODE_ENV=production
PORT=5010
API_VERSION=v1

# Database
MONGODB_URI=mongodb+srv://...
REDIS_URL=rediss://...

# Security
JWT_SECRET=<64-char-random-string>
JWT_REFRESH_SECRET=<64-char-random-string>

# Agora
AGORA_APP_ID=...
AGORA_APP_CERTIFICATE=...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# AWS
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=halobuzz-media

# AI Engine
AI_ENGINE_URL=https://ai.halobuzz.com
AI_ENGINE_SECRET=<strong-secret>

# Email
SMTP_HOST=smtp.sendgrid.net
SMTP_USER=apikey
SMTP_PASS=<sendgrid-api-key>

# URLs
FRONTEND_URL=https://halobuzz.com
ADMIN_DASHBOARD_URL=https://admin.halobuzz.com
CORS_ORIGIN=https://halobuzz.com,https://admin.halobuzz.com
```

---

## Testing & Verification

### Backend API Tests

```bash
# Health check
curl https://api.halobuzz.com/health

# Create test account
curl -X POST https://api.halobuzz.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@halobuzz.com","username":"testuser","password":"Test123!"}'

# Login
curl -X POST https://api.halobuzz.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@halobuzz.com","password":"Test123!"}'

# Get user profile (with token)
curl https://api.halobuzz.com/api/v1/users/me \
  -H "Authorization: Bearer <access-token>"
```

### Stripe Webhook Test

```bash
# Use Stripe CLI
stripe listen --forward-to https://api.halobuzz.com/api/v1/webhooks/stripe

# Trigger test event
stripe trigger checkout.session.completed
```

### Database Connection Test

```bash
# From backend server
mongosh "$MONGODB_URI"

# Should connect successfully
# Run test query:
use halobuzz
db.users.countDocuments()
```

### Mobile App Test

```bash
# Download TestFlight (iOS) or Play Store Internal Testing (Android)
# Test critical flows:
# 1. Registration and login
# 2. Profile creation
# 3. Coin purchase (use Stripe test mode)
# 4. Live streaming (start/join)
# 5. Game play
# 6. Payout request
```

---

## Monitoring & Observability

### Application Monitoring (Sentry)

```bash
# Backend errors are auto-reported to Sentry
# Dashboard: https://sentry.io/organizations/halobuzz/

# Monitor:
# - Error rate
# - Response time
# - Failed requests
# - Database query performance
```

### Server Monitoring

```bash
# Railway/Northflank built-in metrics
# Monitor:
# - CPU usage (target: < 70%)
# - Memory usage (target: < 80%)
# - Request rate
# - Response time (target: < 500ms p95)

# Set up alerts for:
# - CPU > 80% for 5 minutes
# - Memory > 90%
# - Error rate > 1%
# - Response time > 2s
```

### Database Monitoring

```bash
# MongoDB Atlas Performance Advisor
# Monitor:
# - Slow queries (> 100ms)
# - Index usage
# - Connection count
# - Disk usage

# Set up alerts for:
# - Disk usage > 80%
# - Connection count > 80% of max
# - Slow query threshold exceeded
```

### Uptime Monitoring

```bash
# Use UptimeRobot or similar
# Monitor endpoints:
# - https://api.halobuzz.com/health (every 1 min)
# - https://halobuzz.com (every 5 min)
# - https://admin.halobuzz.com (every 5 min)

# Alert channels:
# - Email
# - SMS
# - Slack webhook
```

### Log Aggregation

```bash
# Railway/Northflank logs
# OR use external service (Papertrail, Loggly)

# Log retention:
# - 7 days on platform
# - 30 days in external service
# - Critical logs archived to S3
```

---

## Rollback Procedures

### Backend Rollback

#### Railway

```bash
# Via Railway dashboard
# Deployments → Select previous deployment → Redeploy

# OR via CLI
railway rollback <deployment-id>
```

#### Docker

```bash
# Pull previous image version
docker pull username/halobuzz-backend:v1.2.3

# Stop current container
docker stop halobuzz-backend

# Start previous version
docker run -d --name halobuzz-backend -p 5010:5010 \
  --env-file .env \
  username/halobuzz-backend:v1.2.3
```

### Mobile App Rollback

#### iOS

```bash
# Cannot roll back published app
# Options:
# 1. Submit hotfix build for expedited review
# 2. Push OTA update (for JS-only changes)
eas update --branch production --message "Hotfix"
```

#### Android

```bash
# Play Console → Release Management → App Releases
# Deactivate current release
# Reactivate previous release
# NOTE: Only works if previous APK is still active
```

### Database Rollback

```bash
# Restore from MongoDB Atlas backup
# Atlas → Cluster → Backup → Restore Snapshot

# Select backup point-in-time
# Restore to new cluster or overwrite existing

# Update connection string if restored to new cluster
```

---

## Troubleshooting

### Backend Won't Start

**Check:**
```bash
# Environment variables
railway variables

# Logs
railway logs

# Common issues:
# - Missing required environment variable
# - Database connection failed
# - Port already in use
```

**Solution:**
```bash
# Verify all required env vars are set
# Check MongoDB Atlas IP whitelist
# Verify Redis connection
# Check application logs for specific error
```

### High Memory Usage

**Check:**
```bash
# Monitor memory usage
railway metrics

# Check for memory leaks
# Use Node.js heap snapshot
node --inspect index.js
```

**Solution:**
```bash
# Increase memory limit
# Railway: Upgrade plan or resource class
# Docker: docker run -m 2g ...

# Fix memory leaks in code
# Implement proper cleanup in WebSocket handlers
```

### Database Connection Timeouts

**Check:**
```bash
# MongoDB Atlas network access
# IP whitelist includes backend server IPs

# Connection pool size
mongoose.connect(uri, { maxPoolSize: 10 })

# Check Atlas metrics for connection count
```

**Solution:**
```bash
# Add backend IPs to whitelist
# Increase connection pool size
# Implement connection retry logic
# Check for long-running queries
```

### Stripe Webhook Failures

**Check:**
```bash
# Stripe Dashboard → Webhooks → View Events
# Check for failed events and error messages

# Verify webhook signature
# Check STRIPE_WEBHOOK_SECRET matches
```

**Solution:**
```bash
# Resend failed events from Stripe dashboard
# Verify webhook endpoint is accessible
# Check for changes in Stripe API version
# Implement idempotency correctly
```

### Mobile App Build Failures

**See:** `apps/halobuzz-mobile/BUILD_AND_DEPLOY_GUIDE.md`

### Performance Degradation

**Check:**
```bash
# Database slow queries
# MongoDB Atlas Performance Advisor

# API response times
# Sentry Performance monitoring

# Redis cache hit rate
# Should be > 80%
```

**Solution:**
```bash
# Add database indexes
# Optimize slow queries
# Increase cache TTL
# Implement query result caching
# Use CDN for static assets
```

---

## Security Hardening

### SSL/TLS Configuration

```bash
# Enable HTTPS only
# Redirect HTTP to HTTPS

# nginx.conf:
server {
  listen 80;
  server_name api.halobuzz.com;
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name api.halobuzz.com;

  ssl_certificate /etc/letsencrypt/live/api.halobuzz.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.halobuzz.com/privkey.pem;

  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
}
```

### Rate Limiting

```bash
# Already implemented in backend
# Verify settings:
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# Monitor rate limit hits in logs
# Adjust limits based on usage patterns
```

### Firewall Rules

```bash
# Allow only necessary ports
# Backend: 5010 (or use reverse proxy on 443)
# MongoDB: 27017 (only from backend IPs)
# Redis: 6379 (only from backend IPs)

# AWS Security Group:
Inbound:
  - 443 (HTTPS) from 0.0.0.0/0
  - 22 (SSH) from admin IPs only
Outbound:
  - All traffic allowed
```

### Secrets Management

```bash
# Never commit secrets to git
# Use environment variables

# Rotate secrets quarterly:
# - JWT secrets
# - API keys
# - Database passwords

# Use secret management service:
# - AWS Secrets Manager
# - Railway environment variables
# - Encrypted .env files
```

---

## Disaster Recovery

### Backup Strategy

```bash
# MongoDB Atlas: Continuous backup enabled
# Retention: 30 days
# Frequency: Automatic snapshots every 6 hours

# S3 bucket: Versioning enabled
# Lifecycle policy: Delete versions > 30 days

# Code: Git repository (multiple remotes)
# Environment configs: Encrypted backup in secure location
```

### Recovery Procedures

#### Database Disaster

```bash
# 1. Create new MongoDB cluster from backup
# 2. Update MONGODB_URI in backend
# 3. Restart backend services
# 4. Verify data integrity

# Atlas restore:
# Cluster → Backup → Select snapshot → Restore
```

#### Complete Service Failure

```bash
# 1. Assess scope of failure
# 2. Enable maintenance mode
# 3. Restore from backups
# 4. Redeploy services
# 5. Run verification tests
# 6. Gradually restore traffic
# 7. Monitor closely

# Estimated RTO: 2-4 hours
# Estimated RPO: < 6 hours
```

---

## Maintenance Procedures

### Regular Maintenance Tasks

**Daily:**
- [ ] Check error rates in Sentry
- [ ] Review server metrics (CPU, memory, disk)
- [ ] Monitor active users and concurrent streams

**Weekly:**
- [ ] Review slow database queries
- [ ] Check backup completion
- [ ] Review security alerts
- [ ] Update dependencies (patch versions)

**Monthly:**
- [ ] Review and archive old logs
- [ ] Performance optimization review
- [ ] Security audit
- [ ] Update dependencies (minor versions)
- [ ] Review and optimize database indexes

**Quarterly:**
- [ ] Rotate API keys and secrets
- [ ] Review and update SSL certificates (auto-renewed)
- [ ] Disaster recovery drill
- [ ] Capacity planning review
- [ ] Major dependency updates

### Scheduled Downtime

```bash
# Plan maintenance window
# Notify users 48 hours in advance
# Use low-traffic period (e.g., 2-4 AM local time)

# Enable maintenance mode:
MAINTENANCE_MODE=true

# Perform updates
# Run migration scripts
# Test thoroughly

# Disable maintenance mode:
MAINTENANCE_MODE=false

# Monitor closely for 1 hour post-deployment
```

---

## Cost Optimization

### Infrastructure Costs Estimate

| Service | Tier | Monthly Cost |
|---------|------|-------------|
| MongoDB Atlas | M10 | $57 |
| Redis (Upstash) | Free tier | $0 |
| Railway (Backend) | Pro | $20 + usage |
| Railway (AI Engine) | Pro | $20 + usage |
| Vercel (Admin) | Pro | $20 |
| AWS S3 | 1TB storage | $23 |
| AWS CloudFront | 1TB transfer | $85 |
| Agora | 10,000 min/month | $45 |
| Sentry | Team | $26 |
| **Total Estimated** | | **~$300-400/month** |

### Optimization Tips

```bash
# Enable compression
# Reduce image sizes before upload
# Use appropriate S3 storage class
# Implement CDN caching
# Optimize database queries
# Use connection pooling
# Implement proper pagination
# Cache frequently accessed data
```

---

## Support & Escalation

### Internal Contacts

- **Technical Lead**: tech@halobuzz.com
- **DevOps**: devops@halobuzz.com
- **Emergency**: +977-XXXX-XXXX (24/7)

### External Vendor Support

- **MongoDB Atlas**: https://support.mongodb.com (24/7)
- **Railway**: https://railway.app/help (Email)
- **Vercel**: https://vercel.com/support (Email)
- **Agora**: https://www.agora.io/en/support/ (24/7)
- **Stripe**: https://support.stripe.com (24/7)
- **AWS**: https://aws.amazon.com/support (Based on plan)

### Escalation Matrix

1. **P0 - Critical** (Complete outage)
   - Response: Immediate
   - All hands on deck
   - Notify users via status page

2. **P1 - High** (Major feature broken)
   - Response: < 1 hour
   - Deploy hotfix ASAP

3. **P2 - Medium** (Minor feature issues)
   - Response: < 4 hours
   - Fix in next release

4. **P3 - Low** (Cosmetic issues)
   - Response: < 24 hours
   - Schedule for future release

---

## Post-Deployment Checklist

- [ ] All services are running and healthy
- [ ] SSL certificates are valid and auto-renewing
- [ ] DNS records are correctly configured
- [ ] Database backups are running
- [ ] Monitoring and alerts are configured
- [ ] Error tracking is working (Sentry)
- [ ] Logs are being collected
- [ ] Load testing completed successfully
- [ ] Security scan completed (no critical issues)
- [ ] Documentation is up to date
- [ ] Team is trained on operations
- [ ] Runbook is tested and validated
- [ ] Rollback procedure is documented and tested
- [ ] Users are notified of go-live

---

**Deployment Complete! 🎉**

For ongoing support and updates, refer to:
- Technical documentation in `/docs`
- API documentation at https://api.halobuzz.com/docs
- Admin guide in `/admin/README.md`
- Mobile app guide in `/apps/halobuzz-mobile/BUILD_AND_DEPLOY_GUIDE.md`

**Questions?** Contact tech@halobuzz.com

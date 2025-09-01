# HaloBuzz v0.1.0 Production Deployment Guide

## Overview
This guide walks you through deploying HaloBuzz to production using Railway (backend/AI) and Vercel (admin).

## Prerequisites
- GitHub repository with HaloBuzz code
- Railway account
- Vercel account
- MongoDB Atlas cluster
- Redis instance
- Payment provider accounts (Stripe, eSewa, Khalti)
- Agora account for video streaming
- AWS S3 bucket for file storage

## Step 1: Railway Backend Service

### 1.1 Create Service
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Create new project
3. Add service from GitHub repo
4. Select `backend/` folder
5. Railway will auto-detect Dockerfile

### 1.2 Environment Variables
Add these environment variables in Railway dashboard:

```bash
# Core
NODE_ENV=production
PORT=5010
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/halobuzz?retryWrites=true&w=majority
REDIS_URL=redis://<user>:<pass>@<host>:<port>
JWT_SECRET=<64-character-random-string>
CORS_ORIGIN=https://<your-admin>.vercel.app,https://<preview>--<your-admin>.vercel.app

# Agora
AGORA_APP_ID=<your-agora-app-id>
AGORA_APP_CERT=<your-agora-app-certificate>

# AWS S3
S3_BUCKET=<your-s3-bucket>
S3_REGION=<your-aws-region>
S3_ACCESS_KEY=<your-aws-access-key>
S3_SECRET_KEY=<your-aws-secret-key>

# Payments
ESEWA_MERCHANT_ID=<your-esewa-merchant-id>
ESEWA_SECRET=<your-esewa-secret>
KHALTI_PUBLIC_KEY=<your-khalti-public-key>
KHALTI_SECRET_KEY=<your-khalti-secret-key>
STRIPE_SECRET_KEY=<your-stripe-secret-key>

# AI Engine
AI_ENGINE_URL=https://<ai-engine>.railway.app
AI_ENGINE_SECRET=<same-64-character-random-string>

# System
TZ=Australia/Sydney
ADMIN_EMAILS=<you@domain.com,other@domain.com>
```

### 1.3 Deploy
Railway will automatically build and deploy. Check logs for success.

## Step 2: Railway AI Engine Service

### 2.1 Create Service
1. In same Railway project
2. Add another service from GitHub repo
3. Select `ai-engine/` folder

### 2.2 Environment Variables
```bash
PORT=5020
AI_ENGINE_SECRET=<same-64-character-random-string-as-backend>
LOG_LEVEL=info
```

### 2.3 Deploy
Railway will build and deploy automatically.

## Step 3: Vercel Admin Dashboard

### 3.1 Import Project
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Import from GitHub repository
3. Select `admin/` folder as root
4. Framework: Next.js (auto-detected)

### 3.2 Environment Variables
```bash
NEXT_PUBLIC_API_BASE=https://<backend>.railway.app
```

### 3.3 Deploy
Vercel will build and deploy automatically.

## Step 4: Seed Production Database

### 4.1 Health Check
```bash
curl -s https://<backend>.railway.app/healthz
```

### 4.2 Run Seeds
```bash
railway run -s backend -- bash -lc "node dist/scripts/seeds/index.js"
```

## Step 5: Mobile App Configuration

### 5.1 Environment Setup
Create `mobile/.env` with:
```bash
API_BASE_URL=https://<backend>.railway.app
AGORA_APP_ID=<your-agora-app-id>
STRIPE_PUBLISHABLE_KEY=<your-stripe-publishable-key>
ESEWA_ENABLED=true
KHALTI_ENABLED=true
```

### 5.2 Development
```bash
npm --prefix mobile start
```

### 5.3 Production Build
```bash
eas build --profile preview
```

## Step 6: Smoke Tests

### 6.1 Quick Health Check
```bash
# Backend
curl -s https://<backend>.railway.app/healthz

# AI Engine
curl -s https://<ai-engine>.railway.app/healthz
```

### 6.2 Full Smoke Test
```bash
# Set environment variables
export BACKEND_URL=https://<backend>.railway.app
export AI_URL=https://<ai-engine>.railway.app
export AI_ENGINE_SECRET=<your-ai-secret>

# Run smoke tests
./scripts/hosted-smoke.sh
```

## Step 7: Security Hardening Tests

### 7.1 Rate Limiting
```bash
# Should return 429 after 5 attempts
for i in {1..6}; do 
  curl -X POST https://<backend>.railway.app/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"test","password":"test"}'
done
```

### 7.2 Security Headers
```bash
curl -I https://<backend>.railway.app/healthz | grep -Ei 'strict-transport|x-frame|content-security|referrer|x-content-type'
```

### 7.3 Age Verification
```bash
# Register underage user
curl -X POST https://<backend>.railway.app/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"minor@hb.com","password":"StrongP@ss1","country":"NP","dob":"2012-01-01"}'

# Login and try to stream (should fail)
TOKEN=$(curl -s -X POST https://<backend>.railway.app/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"minor@hb.com","password":"StrongP@ss1"}' \
  | node -pe "JSON.parse(fs.readFileSync(0,'utf8')).accessToken")

curl -X POST https://<backend>.railway.app/streams \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"mode":"video","title":"test"}'
```

### 7.4 AI Engine Security
```bash
# Should return 401 without secret
curl -X POST https://<ai-engine>.railway.app/internal/engagement/battle-boost \
  -H 'Content-Type: application/json' \
  -d '{"streamId":"test","multiplier":2,"durationSec":60}'

# Should return 200 with secret
curl -X POST https://<ai-engine>.railway.app/internal/engagement/battle-boost \
  -H "x-ai-secret: <AI_ENGINE_SECRET>" \
  -H 'Content-Type: application/json' \
  -d '{"streamId":"test","multiplier":2,"durationSec":60}'
```

## Step 8: Webhook Configuration

### 8.1 Stripe Webhooks
- URL: `https://<backend>.railway.app/webhooks/stripe`
- Disputes: `https://<backend>.railway.app/webhooks/stripe/disputes`
- Events: `payment_intent.succeeded`, `payment_intent.payment_failed`

### 8.2 eSewa Webhooks
- URL: `https://<backend>.railway.app/webhooks/esewa`
- Events: Payment success/failure

### 8.3 Khalti Webhooks
- URL: `https://<backend>.railway.app/webhooks/khalti`
- Events: Payment success/failure

## Step 9: Monitoring Setup

### 9.1 Railway Monitoring
- Monitor logs for errors
- Set up alerts for 5xx responses
- Track rate limit hits
- Monitor cron job executions

### 9.2 Vercel Monitoring
- Enable Vercel Analytics
- Monitor build failures
- Track performance metrics

### 9.3 Custom Monitoring
- Set up uptime monitoring for `/healthz`
- Monitor payment processing
- Track user engagement metrics

## Step 10: Final Verification

### 10.1 Admin Access
1. Visit `https://<your-admin>.vercel.app/login`
2. Use email from `ADMIN_EMAILS`
3. Verify admin dashboard loads

### 10.2 Mobile App
1. Install from TestFlight/Play Console
2. Test login and streaming
3. Verify payment flows

### 10.3 Core Features
1. User registration/login
2. Video streaming
3. Gift sending
4. Throne claiming
5. Payment processing
6. Content moderation

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Verify `CORS_ORIGIN` includes all frontend domains
   - Check for trailing slashes

2. **Database Connection**
   - Verify MongoDB URI format
   - Check network access

3. **Payment Issues**
   - Verify webhook URLs
   - Check HMAC signatures
   - Verify API keys

4. **AI Engine Communication**
   - Verify `AI_ENGINE_URL` and `AI_ENGINE_SECRET`
   - Check service health endpoints

### Debug Commands
```bash
# Check service logs
railway logs -s backend
railway logs -s ai-engine

# Test database connection
railway run -s backend -- node -e "require('./dist/config/database').connect()"

# Verify environment variables
railway run -s backend -- env | grep -E "(MONGODB|REDIS|JWT)"
```

## Post-Deployment

### 1. Feature Flags
Enable production features:
- Games per country
- Strict moderation
- Battle boost
- Festival events

### 2. App Store Submission
- Submit mobile builds to TestFlight/Play Console
- Use Store & Ops Pack documentation
- Complete app store metadata

### 3. Documentation
- Update API documentation
- Create user guides
- Document operational procedures

### 4. Backup Strategy
- Set up automated database backups
- Configure disaster recovery procedures
- Test backup restoration

---

**Deployment Complete!** 🎉

Your HaloBuzz v0.1.0 is now live in production with full security hardening and monitoring.

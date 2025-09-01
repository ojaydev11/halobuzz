# Railway Deployment Guide

## Overview
Railway hosts the backend API and AI engine services for HaloBuzz production.

## Services

### 1. Backend Service
- **Path**: `backend/`
- **Dockerfile**: Uses existing `backend/Dockerfile`
- **Port**: 5010
- **Health Check**: `/healthz`

### 2. AI Engine Service
- **Path**: `ai-engine/`
- **Dockerfile**: Uses existing `ai-engine/Dockerfile`
- **Port**: 5020
- **Health Check**: `/healthz`

## Environment Variables

### Backend Service
```bash
# Core
NODE_ENV=production
PORT=5010
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/halobuzz?retryWrites=true&w=majority
REDIS_URL=redis://<user>:<pass>@<host>:<port>
JWT_SECRET=<64-character-random-string>
CORS_ORIGIN=https://<your-admin>.vercel.app,https://<preview>--<your-admin>.vercel.app

# Agora (Video Streaming)
AGORA_APP_ID=<your-agora-app-id>
AGORA_APP_CERT=<your-agora-app-certificate>

# AWS S3 (File Storage)
S3_BUCKET=<your-s3-bucket>
S3_REGION=<your-aws-region>
S3_ACCESS_KEY=<your-aws-access-key>
S3_SECRET_KEY=<your-aws-secret-key>

# Payment Providers
ESEWA_MERCHANT_ID=<your-esewa-merchant-id>
ESEWA_SECRET=<your-esewa-secret>
KHALTI_PUBLIC_KEY=<your-khalti-public-key>
KHALTI_SECRET_KEY=<your-khalti-secret-key>
STRIPE_SECRET_KEY=<your-stripe-secret-key>

# AI Engine Integration
AI_ENGINE_URL=https://<ai-engine>.railway.app
AI_ENGINE_SECRET=<same-64-character-random-string>

# System
TZ=Australia/Sydney
ADMIN_EMAILS=<you@domain.com,other@domain.com>
```

### AI Engine Service
```bash
# Core
PORT=5020
AI_ENGINE_SECRET=<same-64-character-random-string>
LOG_LEVEL=info
```

## Deployment Steps

### 1. Create Services
1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Create new project
3. Add service from GitHub repo
4. Select `backend/` folder for backend service
5. Add another service from same repo
6. Select `ai-engine/` folder for AI engine service

### 2. Configure Environment Variables
1. For each service, go to Variables tab
2. Add all environment variables listed above
3. Ensure `AI_ENGINE_SECRET` matches between both services

### 3. Deploy
1. Railway will automatically build and deploy on push
2. Check logs for successful deployment
3. Verify health endpoints:
   - Backend: `https://<backend>.railway.app/healthz`
   - AI Engine: `https://<ai-engine>.railway.app/healthz`

### 4. Seed Production Database
Seed runs via workflow after deploy; idempotent. The GitHub Actions workflow automatically seeds the database after successful deployment.

## Scaling Notes

### Redis Adapter for Multi-Instance Sockets
When scaling to multiple backend instances:

1. **Redis Adapter Setup**:
   ```bash
   # Add to backend environment
   REDIS_ADAPTER_URL=<same-redis-url>
   ```

2. **Socket.IO Configuration**:
   - Backend already configured with Redis adapter
   - Multiple instances will share socket state via Redis
   - No additional configuration needed

### Resource Limits
- **Backend**: 1GB RAM, 1 CPU (can scale to 2GB, 2 CPU for high load)
- **AI Engine**: 512MB RAM, 0.5 CPU (sufficient for current AI features)

## Monitoring

### Health Checks
- Backend: `GET /healthz` - Returns 200 if healthy
- AI Engine: `GET /healthz` - Returns 200 if healthy

### Logs
- Access via Railway dashboard
- Key metrics to monitor:
  - Rate limit hits
  - Moderation warnings
  - Cron job executions (OG bonus at 00:05 Australia/Sydney)
  - Payment webhook processing
  - AI engine engagement triggers

### Alerts
Set up alerts for:
- 5xx errors
- High latency (>2s response time)
- Failed health checks
- Database connection issues

## Security

### Network Security
- Services communicate via internal Railway network
- External access only through configured CORS origins
- AI engine only accessible from backend service

### Secrets Management
- All sensitive data stored in Railway environment variables
- Never commit secrets to repository
- Rotate secrets regularly

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Verify `CORS_ORIGIN` includes all frontend domains
   - Check for trailing slashes in URLs

2. **Database Connection**
   - Verify MongoDB URI format
   - Check network access from Railway IPs

3. **Redis Connection**
   - Verify Redis URL format
   - Ensure Redis instance is accessible

4. **AI Engine Communication**
   - Verify `AI_ENGINE_URL` points to correct service
   - Check `AI_ENGINE_SECRET` matches between services

### Debug Commands
```bash
# Check service logs
railway logs -s backend
railway logs -s ai-engine

# Connect to service shell
railway run -s backend -- bash
railway run -s ai-engine -- bash

# Test database connection
railway run -s backend -- node -e "require('./dist/config/database').connect()"
```
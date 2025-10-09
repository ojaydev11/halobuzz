# Northflank Deployment Guide

## Quick Fix for TypeScript Path Resolution Issues

If you're seeing errors like:
```
error TS2307: Cannot find module '@/routes/*' or its corresponding type declarations
```

This has been **FIXED** in the latest commit. Just redeploy:

```bash
git pull origin master
# Push to Northflank (auto-deploys)
```

---

## Deployment Steps

### 1. Create Northflank Account

1. Go to https://northflank.com
2. Sign up with GitHub
3. Connect your GitHub repository

### 2. Create Service

1. Click **"Create Service"**
2. Select **"Combined Service"** (Backend + Build)
3. Configure:
   - **Name**: HaloBuzz Backend
   - **Repository**: Your GitHub repo
   - **Branch**: `master`
   - **Build Method**: Dockerfile
   - **Dockerfile Path**: `backend/Dockerfile`

### 3. Configure Build Settings

```yaml
Build Settings:
  - Context: backend/
  - Dockerfile: Dockerfile
  - Build Arguments: (none needed)
  - Target Stage: runtime
```

### 4. Configure Runtime

```yaml
Runtime Settings:
  - Port: 4000
  - Health Check: /api/v1/monitoring/health
  - Replicas: 1 (scale up as needed)
  - Resources:
    - CPU: 0.5 vCPU
    - Memory: 1 GB
```

### 5. Environment Variables

Go to **Environment** tab and add these variables:

```bash
# Required - Server
NODE_ENV=production
PORT=4000
API_VERSION=v1

# Required - Database
MONGODB_URI=mongodb+srv://...
REDIS_URL=rediss://...

# Required - Security
JWT_SECRET=<generate-64-char-string>
JWT_REFRESH_SECRET=<generate-64-char-string>

# Required - AWS
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=halobuzz-media

# Required - Agora
AGORA_APP_ID=...
AGORA_APP_CERTIFICATE=...
AGORA_PRIMARY_KEY=...

# Required - Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Required - URLs
FRONTEND_URL=https://halobuzz.com
ADMIN_DASHBOARD_URL=https://admin.halobuzz.com
CORS_ORIGIN=https://halobuzz.com,https://admin.halobuzz.com

# Optional - AI Engine
AI_ENGINE_URL=https://ai.halobuzz.com
AI_ENGINE_SECRET=<strong-secret>

# Optional - Email
SMTP_HOST=smtp.sendgrid.net
SMTP_USER=apikey
SMTP_PASS=<sendgrid-api-key>
FROM_EMAIL=noreply@halobuzz.com
```

### 6. Deploy

1. Click **"Deploy"**
2. Wait for build to complete (5-10 minutes)
3. Check logs for startup messages

### 7. Verify Deployment

```bash
# Check health
curl https://your-service.northflank.app/api/v1/monitoring/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-01-25T10:00:00.000Z",
  "uptime": 60,
  "environment": "production"
}
```

---

## Troubleshooting

### Issue: TS2307 Module Not Found Errors

**Symptoms:**
```
error TS2307: Cannot find module '@/routes/auth'
Couldn't find tsconfig.json
```

**Solution:**
This is **FIXED** in the latest code. The Dockerfile now copies `tsconfig.json` to the runtime container.

**Steps:**
1. Pull latest changes: `git pull origin master`
2. Redeploy in Northflank
3. Verify build succeeds

**What was fixed:**
- Added `COPY --from=build /app/tsconfig*.json ./` to Dockerfile line 99
- This ensures tsconfig-paths can resolve `@/` aliases at runtime

### Issue: Build Fails - pnpm Not Found

**Symptoms:**
```
pnpm: command not found
```

**Solution:**
The Dockerfile uses `corepack` to install pnpm. This should work automatically.

If it doesn't:
1. Check Northflank uses Node.js 20+ image
2. Verify Dockerfile has: `RUN corepack enable && corepack prepare pnpm@9.1.0 --activate`

### Issue: MongoDB Connection Failed

**Symptoms:**
```
MongooseServerSelectionError: connect ETIMEDOUT
```

**Solution:**
1. Check MongoDB Atlas IP whitelist includes `0.0.0.0/0`
2. Or get Northflank static IP and whitelist it
3. Verify `MONGODB_URI` is correct in environment variables

### Issue: Redis Connection Failed

**Symptoms:**
```
Error: connect ECONNREFUSED
```

**Solution:**
1. Verify `REDIS_URL` format: `rediss://default:password@host:port`
2. Check Upstash/Redis Cloud is accessible
3. Test connection string locally first

### Issue: Health Check Failing

**Symptoms:**
```
Health check failed: Connection refused
```

**Solution:**
1. Verify `PORT=4000` in environment variables
2. Check health check URL: `/api/v1/monitoring/health`
3. Ensure app is listening on `0.0.0.0` not `localhost`

### Issue: Stripe Webhook Not Working

**Symptoms:**
```
Webhook signature verification failed
```

**Solution:**
1. Get Northflank deployment URL
2. Update Stripe webhook endpoint:
   - URL: `https://your-service.northflank.app/api/v1/webhooks/stripe`
3. Copy new webhook secret to `STRIPE_WEBHOOK_SECRET` env var
4. Redeploy

---

## Performance Optimization

### Scaling

**Horizontal Scaling:**
```yaml
Replicas: 2-4 (for production)
Load Balancer: Enabled (automatic)
```

**Vertical Scaling:**
```yaml
CPU: 1 vCPU (for high traffic)
Memory: 2 GB (for better performance)
```

### Resource Limits

```yaml
Recommended for Production:
  - Min replicas: 2
  - Max replicas: 10
  - CPU: 0.5-1 vCPU per replica
  - Memory: 1-2 GB per replica
  - Auto-scaling: Enabled at 70% CPU
```

---

## Monitoring

### Logs

```bash
# View live logs in Northflank dashboard
# Or use CLI:
northflank logs tail --service halobuzz-backend
```

### Metrics

Monitor in Northflank dashboard:
- CPU usage (target: <70%)
- Memory usage (target: <80%)
- Request rate
- Response time (target: <500ms p95)
- Error rate (target: <1%)

### Alerts

Set up alerts for:
- CPU > 80% for 5 minutes
- Memory > 90%
- Health check failures
- Error rate > 5%

---

## CI/CD Setup

### Automatic Deployments

Northflank auto-deploys when you push to `master` branch.

**Disable auto-deploy:**
1. Go to Service → Settings
2. Deployment → Auto Deploy
3. Toggle off

**Manual deploy:**
```bash
# In Northflank dashboard
Service → Deploy → Deploy Latest Commit
```

### GitHub Actions Integration

Create `.github/workflows/deploy-northflank.yml`:

```yaml
name: Deploy to Northflank

on:
  push:
    branches: [master]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Trigger Northflank Deployment
        run: |
          curl -X POST https://api.northflank.com/v1/projects/${{ secrets.NORTHFLANK_PROJECT_ID }}/services/${{ secrets.NORTHFLANK_SERVICE_ID }}/deploy \
            -H "Authorization: Bearer ${{ secrets.NORTHFLANK_API_TOKEN }}"
```

---

## Rollback

### Quick Rollback

1. Go to Northflank dashboard
2. Service → Deployments
3. Click on previous successful deployment
4. Click **"Redeploy"**

### Git-based Rollback

```bash
# Find previous working commit
git log --oneline

# Rollback to specific commit
git revert <commit-hash>
git push origin master

# Northflank will auto-deploy the rollback
```

---

## Cost Estimate

| Resource | Configuration | Monthly Cost |
|----------|--------------|-------------|
| Backend Service | 1 replica, 0.5 vCPU, 1GB RAM | ~$30 |
| Backend Service | 2 replicas, 1 vCPU, 2GB RAM | ~$120 |
| Build Minutes | ~50 builds/month @ 5min each | Included |
| Bandwidth | 100GB transfer | Included |

**Total**: $30-120/month depending on scale

---

## Production Checklist

- [ ] All environment variables configured
- [ ] MongoDB Atlas IP whitelist updated
- [ ] Stripe webhook endpoint configured
- [ ] Health check endpoint responding
- [ ] Logs showing no errors
- [ ] Database connection working
- [ ] Redis connection working
- [ ] S3 uploads working
- [ ] Agora token generation working
- [ ] Custom domain configured (optional)
- [ ] SSL certificate active
- [ ] Monitoring alerts configured
- [ ] Backup strategy in place

---

## Custom Domain Setup

### 1. Get Northflank Domain

In Northflank dashboard:
1. Service → Networking → Domains
2. Copy the default domain: `your-service.northflank.app`

### 2. Configure DNS

Add CNAME record in your DNS provider:

```
api.halobuzz.com  CNAME  your-service.northflank.app
```

### 3. Add Custom Domain in Northflank

1. Service → Networking → Domains
2. Click **"Add Domain"**
3. Enter: `api.halobuzz.com`
4. Wait for SSL certificate (automatic via Let's Encrypt)

### 4. Update Environment Variables

```bash
FRONTEND_URL=https://halobuzz.com
CORS_ORIGIN=https://halobuzz.com,https://admin.halobuzz.com
```

### 5. Update Stripe Webhook

```
https://api.halobuzz.com/api/v1/webhooks/stripe
```

---

## Support

**Northflank Docs**: https://northflank.com/docs
**Northflank Support**: support@northflank.com
**HaloBuzz Support**: tech@halobuzz.com

---

**Last Updated**: January 2025

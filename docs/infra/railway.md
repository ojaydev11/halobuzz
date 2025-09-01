# Railway Deployment Guide

This guide covers deploying the HaloBuzz backend and AI engine to Railway.

## Prerequisites

- Railway account
- GitHub repository with HaloBuzz code
- MongoDB Atlas cluster (or Railway MongoDB addon)
- Redis instance (Railway Redis addon recommended)
- Stripe account for payments
- AWS S3 bucket for file storage

## Services Overview

HaloBuzz requires 2 Railway services:
1. **Backend API** (`backend/` folder)
2. **AI Engine** (`ai-engine/` folder)

## 1. Backend Service Deployment

### Create Backend Service

1. Go to Railway dashboard
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your HaloBuzz repository
4. Choose "Deploy from a folder" → `backend`
5. Name the service: `halobuzz-backend`

### Environment Variables (Backend)

Set these environment variables in Railway:

#### Core Configuration
```bash
NODE_ENV=production
PORT=3000
API_VERSION=v1

# Database
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/halobuzz?retryWrites=true&w=majority
REDIS_URL=redis://default:password@redis-hostname:port

# Security
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-chars
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-minimum-32-chars
ADMIN_JWT_SECRET=your-super-secure-admin-jwt-secret-minimum-32-chars
AI_SERVICE_SECRET=your-super-secure-ai-service-secret-minimum-32-chars

# CORS and Security
CORS_ORIGIN=https://your-admin-domain.vercel.app,https://your-app-domain.com
ALLOWED_BACKEND_IPS=10.0.0.0/8,172.16.0.0/12,192.168.0.0/16
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Payment Configuration
```bash
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# PayPal (optional)
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
PAYPAL_MODE=live
```

#### File Storage (AWS S3)
```bash
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-s3-bucket-name
```

#### Communication Services
```bash
# Twilio (SMS/Voice)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Email (NodeMailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

#### Agora (Live Streaming)
```bash
AGORA_APP_ID=your-agora-app-id
AGORA_APP_CERTIFICATE=your-agora-app-certificate
```

#### Feature Flags
```bash
ADMIN_TOTP_REQUIRED=true
GAMES_ENABLED_GLOBAL=true
HIGH_SPENDER_CONTROLS=true
FRAUD_DETECTION_ENABLED=true
NEPAL_COMPLIANCE_MODE=true
```

### Build Configuration

Railway will auto-detect the Node.js app. Ensure your `package.json` has:

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

### Health Checks

Railway will monitor the `/healthz` endpoint automatically.

## 2. AI Engine Service Deployment

### Create AI Engine Service

1. In the same Railway project, click "Add Service"
2. Choose "Deploy from GitHub repo" → select same repo
3. Choose "Deploy from a folder" → `ai-engine`
4. Name the service: `halobuzz-ai-engine`

### Environment Variables (AI Engine)

```bash
NODE_ENV=production
PORT=4000

# Security
AI_SERVICE_SECRET=your-super-secure-ai-service-secret-minimum-32-chars
ALLOWED_BACKEND_IPS=10.0.0.0/8,172.16.0.0/12,192.168.0.0/16

# Backend Communication
BACKEND_URL=https://halobuzz-backend.railway.app

# AI Services
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
```

## 3. Database Setup

### MongoDB Atlas

1. Create MongoDB Atlas cluster
2. Create database user with read/write permissions
3. Whitelist Railway IP ranges (or use 0.0.0.0/0 for simplicity)
4. Get connection string and set as `DATABASE_URL`

### Redis (Railway Addon)

1. In Railway project, click "Add Service"
2. Choose "Add Database" → Redis
3. Copy the Redis URL to `REDIS_URL` in backend service

## 4. Networking Configuration

### Internal Communication

Railway services can communicate internally using:
- Backend URL: `https://halobuzz-backend.railway.app`
- AI Engine URL: `https://halobuzz-ai-engine.railway.app`

### External Access

Both services get public URLs:
- Backend: `https://halobuzz-backend.railway.app`
- AI Engine: `https://halobuzz-ai-engine.railway.app` (should be protected)

### Security Considerations

1. **AI Engine Protection**: The AI engine should only accept requests from the backend
2. **CORS Configuration**: Set `CORS_ORIGIN` to include your admin panel domain
3. **Rate Limiting**: Configured automatically in the application
4. **HTTPS**: Railway provides HTTPS certificates automatically

## 5. Scaling Configuration

### Resource Allocation

For production workloads:

**Backend Service:**
- Memory: 1GB minimum
- CPU: 1 vCPU minimum
- Instances: Start with 1, scale based on load

**AI Engine Service:**
- Memory: 2GB minimum (for TensorFlow/AI models)
- CPU: 2 vCPU minimum
- Instances: Start with 1

### Horizontal Scaling

When scaling beyond 1 instance:

1. **Socket.IO Clustering**: Add Redis adapter for Socket.IO
2. **Session Storage**: Use Redis for session storage
3. **File Uploads**: Use S3 for all file storage (no local storage)

Add to backend environment:
```bash
REDIS_ADAPTER_ENABLED=true
SESSION_STORE=redis
```

## 6. Monitoring and Logging

### Railway Metrics

Railway provides:
- CPU and memory usage
- Request metrics
- Error rates
- Response times

### Application Logging

Logs are automatically collected. Key log levels:
- `ERROR`: Critical errors requiring attention
- `WARN`: Security warnings, rate limits
- `INFO`: Normal operations, user actions
- `DEBUG`: Development debugging (disabled in production)

### Health Monitoring

Both services expose health endpoints:
- Backend: `GET /healthz`
- AI Engine: `GET /health`

Set up external monitoring (e.g., UptimeRobot) to monitor these endpoints.

## 7. Deployment Pipeline

### Automatic Deployments

Railway automatically deploys on git push to the main branch.

### Manual Deployments

1. Go to Railway dashboard
2. Select the service
3. Click "Deploy" → choose commit/branch

### Rollback

1. Go to "Deployments" tab in Railway
2. Click "Redeploy" on a previous successful deployment

## 8. Domain Configuration

### Custom Domains

1. In Railway service settings, go to "Domains"
2. Add custom domain (e.g., `api.halobuzz.com`)
3. Update DNS records as instructed
4. Update `CORS_ORIGIN` environment variable

### SSL Certificates

Railway automatically provisions SSL certificates for all domains.

## 9. Backup Strategy

### Database Backups

- MongoDB Atlas: Enable automated backups
- Redis: Enable persistence in Railway Redis settings

### Application Data

- File uploads: Stored in S3 (automatically replicated)
- Logs: Retained by Railway for 7 days (upgrade plan for longer retention)

## 10. Cost Optimization

### Railway Pricing

- **Hobby Plan**: $5/month per service (good for development)
- **Pro Plan**: $20/month per service (production workloads)
- **Usage-based**: Additional charges for compute/bandwidth

### Optimization Tips

1. **Right-size resources**: Start small and scale up
2. **Enable auto-sleep**: For development environments
3. **Monitor usage**: Use Railway metrics to optimize
4. **Cache effectively**: Use Redis for caching to reduce database load

## 11. Troubleshooting

### Common Issues

**Build Failures:**
- Check Node.js version compatibility
- Verify all dependencies are in `package.json`
- Check TypeScript compilation errors

**Runtime Errors:**
- Verify all environment variables are set
- Check database connectivity
- Review application logs in Railway dashboard

**Performance Issues:**
- Monitor CPU/memory usage
- Check database query performance
- Review Redis cache hit rates

### Support Resources

- Railway Documentation: https://docs.railway.app/
- Railway Discord: https://discord.gg/railway
- Railway Status: https://status.railway.app/

## 12. Security Checklist

- [ ] All secrets are set as environment variables
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] HTTPS is enforced
- [ ] Database access is restricted
- [ ] AI engine is protected from public access
- [ ] Monitoring and alerting is configured
- [ ] Backup strategy is implemented

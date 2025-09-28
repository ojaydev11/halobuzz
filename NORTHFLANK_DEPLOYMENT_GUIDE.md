# 🚀 HaloBuzz Northflank Deployment Guide

This comprehensive guide will help you deploy HaloBuzz to Northflank successfully.

## 📋 Prerequisites

- [ ] Northflank account with active subscription
- [ ] MongoDB Atlas cluster (or self-hosted MongoDB)
- [ ] Redis instance (Redis Cloud or self-hosted)
- [ ] Domain name (optional, for custom domains)
- [ ] External service API keys (OpenAI, Stripe, etc.)

## 🏗️ Architecture Overview

HaloBuzz consists of three main services:

| Service | Port | Description | Health Check |
|---------|------|-------------|--------------|
| **Backend API** | 5010 | Main API server | `/api/v1/monitoring/health` |
| **AI Engine** | 5020 | AI services | `/health` |
| **Admin Dashboard** | 3000 | Admin interface | `/api/health` |

## 🐳 Docker Images

Each service has an optimized production Dockerfile:

- `backend/Dockerfile.prod` - Backend API service
- `ai-engine/Dockerfile.prod` - AI Engine service  
- `admin/Dockerfile.prod` - Admin Dashboard service

## 🔧 Step-by-Step Deployment

### 1. Prepare Environment Variables

Copy the template and fill in your values:

```bash
cp env.northflank.template .env.northflank
```

**Required Environment Variables:**

```bash
# Core Configuration
NODE_ENV=production
PORT=5010
HOST=0.0.0.0
API_VERSION=v1

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/halobuzz
REDIS_URL=redis://username:password@redis-host:6379

# Security
JWT_SECRET=your-super-secret-jwt-key-here
ADMIN_SECRET=your-admin-dashboard-secret-key
AI_SERVICE_SECRET=your-ai-service-secret-key

# External Services
OPENAI_API_KEY=sk-your-openai-api-key
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
AGORA_APP_ID=your-agora-app-id
AGORA_APP_CERT=your-agora-app-certificate

# AWS S3
S3_BUCKET=your-s3-bucket-name
S3_REGION=us-east-1
S3_ACCESS_KEY=your-aws-access-key
S3_SECRET_KEY=your-aws-secret-key
```

### 2. Create Services in Northflank

#### Backend API Service

1. **Create New Service:**
   - Service Name: `halo-api`
   - Build Type: `Dockerfile`
   - Dockerfile Path: `backend/Dockerfile.prod`
   - Build Context: `backend/`

2. **Configure Port:**
   - Port: `5010`
   - Protocol: `HTTP`
   - Public: `Yes`

3. **Set Environment Variables:**
   - Copy all variables from `.env.northflank`
   - Set `PORT=5010`
   - Set `AI_ENGINE_URL=http://halo-ai-engine:5020`

4. **Configure Health Check:**
   - Path: `/api/v1/monitoring/health`
   - Port: `5010`
   - Interval: `30s`
   - Timeout: `10s`
   - Start Period: `20s`
   - Retries: `3`

#### AI Engine Service

1. **Create New Service:**
   - Service Name: `halo-ai-engine`
   - Build Type: `Dockerfile`
   - Dockerfile Path: `ai-engine/Dockerfile.prod`
   - Build Context: `ai-engine/`

2. **Configure Port:**
   - Port: `5020`
   - Protocol: `HTTP`
   - Public: `Yes`

3. **Set Environment Variables:**
   - Copy relevant variables from `.env.northflank`
   - Set `PORT=5020`
   - Ensure `OPENAI_API_KEY` is set

4. **Configure Health Check:**
   - Path: `/health`
   - Port: `5020`
   - Interval: `30s`
   - Timeout: `10s`
   - Start Period: `20s`
   - Retries: `3`

#### Admin Dashboard Service

1. **Create New Service:**
   - Service Name: `halo-admin`
   - Build Type: `Dockerfile`
   - Dockerfile Path: `admin/Dockerfile.prod`
   - Build Context: `admin/`

2. **Configure Port:**
   - Port: `3000`
   - Protocol: `HTTP`
   - Public: `Yes`

3. **Set Environment Variables:**
   - Copy relevant variables from `.env.northflank`
   - Set `PORT=3000`
   - Set `NEXT_PUBLIC_API_URL=https://halo-api.your-project.northflank.app`

4. **Configure Health Check:**
   - Path: `/api/health`
   - Port: `3000`
   - Interval: `30s`
   - Timeout: `10s`
   - Start Period: `20s`
   - Retries: `3`

### 3. Deploy Services

1. **Deploy in Order:**
   - First: `halo-ai-engine`
   - Second: `halo-api`
   - Third: `halo-admin`

2. **Monitor Build Logs:**
   - Check for compilation errors
   - Verify dependencies are installed
   - Ensure TypeScript builds successfully

3. **Verify Health Checks:**
   - All services should show "Healthy" status
   - Health check endpoints should return 200 OK

### 4. Configure Custom Domains (Optional)

1. **Add Custom Domain:**
   - Go to each service's settings
   - Add your custom domain
   - Configure SSL certificate

2. **Update Environment Variables:**
   - Update `CORS_ORIGIN` with your domain
   - Update `NEXT_PUBLIC_API_URL` with your domain

## 🧪 Testing Deployment

### Health Check Tests

```bash
# Backend API
curl https://halo-api.your-project.northflank.app/api/v1/monitoring/health

# AI Engine
curl https://halo-ai-engine.your-project.northflank.app/health

# Admin Dashboard
curl https://halo-admin.your-project.northflank.app/api/health
```

### API Tests

```bash
# Test user registration
curl -X POST https://halo-api.your-project.northflank.app/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "Secret123!",
    "country": "US",
    "language": "en"
  }'

# Test AI service
curl -X POST https://halo-ai-engine.your-project.northflank.app/api/v1/ai/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{
    "prompt": "Hello, how are you?",
    "maxTokens": 100
  }'
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Build Failures

**Problem:** TypeScript compilation errors
**Solution:**
- Check build logs for specific errors
- Ensure all dependencies are installed
- Verify TypeScript configuration

**Problem:** Missing files during build
**Solution:**
- Verify build context is set correctly
- Check Dockerfile paths are accurate
- Ensure source files are included

#### 2. Health Check Failures

**Problem:** Health checks timing out
**Solution:**
- Increase timeout values
- Check if services are binding to `0.0.0.0`
- Verify health check paths are correct

**Problem:** Services not starting
**Solution:**
- Check environment variables
- Verify database connections
- Review service logs for errors

#### 3. Database Connection Issues

**Problem:** MongoDB connection failed
**Solution:**
- Verify `MONGODB_URI` is correct
- Check MongoDB Atlas IP whitelist
- Ensure database user has proper permissions

**Problem:** Redis connection failed
**Solution:**
- Verify `REDIS_URL` is correct
- Check Redis instance is running
- Ensure Redis credentials are valid

#### 4. External Service Issues

**Problem:** OpenAI API errors
**Solution:**
- Verify `OPENAI_API_KEY` is valid
- Check API key permissions
- Ensure sufficient credits

**Problem:** Payment gateway errors
**Solution:**
- Verify Stripe keys are correct
- Check webhook endpoints
- Ensure test/live mode matches

### Debugging Commands

```bash
# Check service logs
northflank logs halo-api
northflank logs halo-ai-engine
northflank logs halo-admin

# Check service status
northflank status halo-api
northflank status halo-ai-engine
northflank status halo-admin

# Restart service
northflank restart halo-api
```

## 📊 Monitoring

### Built-in Monitoring

Each service includes:
- **Health checks** for availability
- **Structured logging** with Winston
- **Metrics collection** for performance
- **Error tracking** and reporting

### External Monitoring

Consider setting up:
- **Uptime monitoring** (UptimeRobot, Pingdom)
- **Error tracking** (Sentry, Bugsnag)
- **Performance monitoring** (New Relic, DataDog)
- **Log aggregation** (LogRocket, LogDNA)

## 🔒 Security Considerations

### Production Security

- [ ] Use strong, unique secrets for all services
- [ ] Enable HTTPS for all endpoints
- [ ] Configure proper CORS origins
- [ ] Set up rate limiting
- [ ] Enable request logging
- [ ] Use non-root containers
- [ ] Regular security updates

### Environment Variables Security

- [ ] Never commit secrets to version control
- [ ] Use Northflank's secret management
- [ ] Rotate secrets regularly
- [ ] Use different secrets for each environment

## 📈 Scaling

### Horizontal Scaling

- **Backend API:** Scale based on CPU/memory usage
- **AI Engine:** Scale based on request volume
- **Admin Dashboard:** Usually single instance sufficient

### Vertical Scaling

- **Backend API:** 1GB RAM, 0.5 CPU minimum
- **AI Engine:** 512MB RAM, 0.25 CPU minimum
- **Admin Dashboard:** 512MB RAM, 0.25 CPU minimum

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Deploy to Northflank
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Northflank
        run: |
          # Trigger Northflank deployment
          curl -X POST "https://api.northflank.com/v1/projects/$PROJECT_ID/services/$SERVICE_ID/deploy" \
            -H "Authorization: Bearer $NORTHFLANK_TOKEN"
```

## 📞 Support

### Getting Help

- **Northflank Documentation:** https://docs.northflank.com
- **HaloBuzz Issues:** Create GitHub issue
- **Community Support:** Discord/Slack channels

### Emergency Procedures

1. **Service Down:** Check health checks and logs
2. **Database Issues:** Verify connection strings and permissions
3. **External Service Issues:** Check API keys and quotas
4. **Rollback:** Use Northflank's rollback feature

## ✅ Deployment Checklist

- [ ] All environment variables configured
- [ ] Database connections tested
- [ ] External services configured
- [ ] Health checks passing
- [ ] Custom domains configured (if applicable)
- [ ] SSL certificates installed
- [ ] Monitoring set up
- [ ] Backup strategy implemented
- [ ] Security measures in place
- [ ] Performance testing completed

---

**🎉 Congratulations!** Your HaloBuzz application should now be successfully deployed on Northflank.

For ongoing maintenance, monitor the health checks, review logs regularly, and keep dependencies updated.

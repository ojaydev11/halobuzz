# HaloBuzz Northflank Deployment Guide

This guide provides exact Northflank settings for deploying all HaloBuzz backend services.

## 🏗️ Services Overview

| Service | Path | Port | Health Check | Description |
|---------|------|------|--------------|-------------|
| **Backend API** | `backend/` | 4000 | `/api/v1/monitoring/health` | Main HaloBuzz Backend API |
| **AI Engine** | `ai-engine/` | 4000 | `/api/v1/monitoring/health` | AI Services for HaloBuzz |

## 🐳 Docker Configuration

### Backend API Service

**Service Name:** `halo-api`

**Build Configuration:**
- **Build Type:** Dockerfile
- **Dockerfile Path:** `backend/Dockerfile`
- **Build Context:** `backend/`
- **Platform:** Linux/amd64

**Container Settings:**
- **Port:** 4000 (HTTP)
- **Health Check Path:** `/api/v1/monitoring/health`
- **Health Check Port:** 4000
- **Health Check Interval:** 30s
- **Health Check Timeout:** 3s
- **Health Check Start Period:** 20s
- **Health Check Retries:** 3

**Environment Variables:**
```bash
# Required
NODE_ENV=production
PORT=4000
API_VERSION=v1
HOST=0.0.0.0

# Database
MONGODB_URI=mongodb://your-mongodb-connection-string

# Redis
REDIS_URL=redis://your-redis-connection-string

# Security
JWT_SECRET=your-jwt-secret-key-here

# CORS
CORS_ORIGIN=*

# Optional
LOG_LEVEL=info
```

### AI Engine Service

**Service Name:** `halo-ai-engine`

**Build Configuration:**
- **Build Type:** Dockerfile
- **Dockerfile Path:** `ai-engine/Dockerfile`
- **Build Context:** `ai-engine/`
- **Platform:** Linux/amd64

**Container Settings:**
- **Port:** 4000 (HTTP)
- **Health Check Path:** `/api/v1/monitoring/health`
- **Health Check Port:** 4000
- **Health Check Interval:** 30s
- **Health Check Timeout:** 3s
- **Health Check Start Period:** 20s
- **Health Check Retries:** 3

**Environment Variables:**
```bash
# Required
NODE_ENV=production
PORT=4000
HOST=0.0.0.0

# AI Service Configuration
AI_SERVICE_SECRET=your-ai-service-secret
OPENAI_API_KEY=your-openai-api-key

# Database (if needed)
MONGODB_URI=mongodb://your-mongodb-connection-string

# Redis (if needed)
REDIS_URL=redis://your-redis-connection-string

# CORS
CORS_ORIGIN=*
```

## 🚀 Deployment Steps

### 1. Create Services in Northflank

1. **Backend API Service:**
   - Go to Northflank Dashboard
   - Click "New Service"
   - Choose "Dockerfile" build type
   - Set service name: `halo-api`
   - Set Dockerfile path: `backend/Dockerfile`
   - Set build context: `backend/`

2. **AI Engine Service:**
   - Repeat the process
   - Set service name: `halo-ai-engine`
   - Set Dockerfile path: `ai-engine/Dockerfile`
   - Set build context: `ai-engine/`

### 2. Configure Ports

For each service:
- **Port:** 4000
- **Protocol:** HTTP
- **Public:** Yes (for external access)

### 3. Set Environment Variables

Copy the environment variables from the tables above into each service's environment configuration.

### 4. Configure Health Checks

For each service:
- **Path:** `/api/v1/monitoring/health`
- **Port:** 4000
- **Interval:** 30s
- **Timeout:** 3s
- **Start Period:** 20s
- **Retries:** 3

### 5. Deploy

1. Click "Deploy" on each service
2. Monitor the build logs for any errors
3. Verify health checks are passing
4. Test the endpoints

## 🔧 Monorepo Build (Alternative)

If you prefer to use the root Dockerfile for monorepo builds:

**For Backend API:**
```bash
# Build context: Repository root
# Dockerfile: Dockerfile
# Build args: SERVICE_PATH=backend
```

**For AI Engine:**
```bash
# Build context: Repository root
# Dockerfile: Dockerfile
# Build args: SERVICE_PATH=ai-engine
```

## 🧪 Testing Deployment

### Health Check
```bash
curl https://your-service-url/api/v1/monitoring/health
```

Expected response:
```json
{
  "status": "healthy",
  "environment": "production",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456
}
```

### Backend API Test
```bash
# Test auth endpoint
curl -X POST https://your-backend-url/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "Secret123!",
    "country": "US",
    "language": "en"
  }'
```

## 🔍 Troubleshooting

### Common Issues

1. **404 on auth endpoints:**
   - Check if `API_VERSION=v1` is set
   - Verify the build includes the latest code
   - Check build logs for "Mounting auth routes" message

2. **Health check failing:**
   - Verify the service is binding to `0.0.0.0:4000`
   - Check if the health endpoint is accessible
   - Review service logs for errors

3. **Build failures:**
   - Ensure all required files are in the build context
   - Check if `pnpm-lock.yaml` exists
   - Verify TypeScript compilation is successful

### Logs

Check service logs in Northflank dashboard:
- **Build Logs:** Shows compilation and build process
- **Runtime Logs:** Shows application startup and runtime errors

## 📊 Monitoring

Each service includes:
- **Health checks** for availability monitoring
- **Structured logging** with Winston
- **Metrics collection** for performance monitoring
- **Security monitoring** for threat detection

## 🔒 Security Features

- **Non-root user** execution
- **Security headers** with Helmet
- **Rate limiting** on all endpoints
- **Input sanitization** and validation
- **CORS** configuration
- **JWT** authentication
- **Request logging** and monitoring

## 📝 Notes

- All services run on **Node.js 20 Alpine**
- Use **pnpm** for package management
- **Multi-stage builds** for optimized images
- **Health checks** ensure service availability
- **Non-root execution** for security
- **Production-ready** configuration

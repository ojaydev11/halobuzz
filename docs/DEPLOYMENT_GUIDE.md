# HaloBuzz Deployment Guide

## 📋 Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Backend Deployment](#backend-deployment)
4. [Mobile App Deployment](#mobile-app-deployment)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Monitoring & Rollback](#monitoring--rollback)

---

## 🔍 Pre-Deployment Checklist

### Code Quality
- [ ] All tests passing (unit, integration, e2e)
- [ ] Code coverage ≥90%
- [ ] No linter errors
- [ ] TypeScript compilation successful
- [ ] Security audit passed (no high/critical vulnerabilities)

### Performance
- [ ] FPS ≥55 on test devices
- [ ] Bundle size <15MB
- [ ] API response time p95 <200ms
- [ ] Load tested (1000+ concurrent users)

### Documentation
- [ ] API documentation updated
- [ ] CHANGELOG updated
- [ ] README updated with latest features
- [ ] Release notes prepared

### Security
- [ ] Environment variables secured
- [ ] Secrets rotated
- [ ] SSL certificates valid
- [ ] Rate limiting configured
- [ ] Anti-cheat enabled

---

## 🌍 Environment Setup

### Required Secrets

#### Backend (.env.production)
```bash
# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/halobuzz
REDIS_URL=redis://user:pass@redis-host:6379

# Authentication
JWT_SECRET=<64-char-random-string>
JWT_EXPIRES_IN=7d

# External Services
OPENAI_API_KEY=sk-proj-...
STRIPE_SECRET_KEY=sk_live_...
EXPO_PUSH_TOKEN=ExponentPushToken[...]

# Server
PORT=5000
NODE_ENV=production
CLIENT_URL=https://app.halobuzz.com

# Socket.IO
SOCKET_CORS_ORIGIN=https://app.halobuzz.com
```

#### Mobile (eas.json secrets)
```bash
# EAS Build
EXPO_TOKEN=<expo-access-token>

# Google Play
GOOGLE_SERVICES_JSON=<base64-encoded-json>

# Apple
APPLE_TEAM_ID=<team-id>
APPLE_APP_ID=<app-id>
```

### Generate Secrets
```bash
# JWT Secret (64 chars)
openssl rand -hex 32

# Random API Key (32 chars)
openssl rand -base64 32
```

---

## 🖥️ Backend Deployment

### Option 1: Docker (Recommended)

#### 1. Build Images
```bash
# Backend
docker build -t halobuzz/backend:latest -f backend/Dockerfile.prod ./backend

# AI Engine
docker build -t halobuzz/ai-engine:latest -f ai-engine/Dockerfile.prod ./ai-engine
```

#### 2. Push to Registry
```bash
docker login

docker push halobuzz/backend:latest
docker push halobuzz/ai-engine:latest
```

#### 3. Deploy with Docker Compose
```bash
# Production docker-compose.prod.yml
docker-compose -f docker-compose.prod.yml up -d
```

#### 4. Verify Deployment
```bash
# Health check
curl https://api.halobuzz.com/api/v1/health

# Expected response
{"status":"UP","message":"HaloBuzz API is running."}
```

### Option 2: Kubernetes

#### 1. Apply Configurations
```bash
# Create namespace
kubectl create namespace halobuzz

# Apply secrets
kubectl apply -f k8s/secrets.yaml

# Deploy backend
kubectl apply -f k8s/backend-deployment.yaml

# Deploy AI engine
kubectl apply -f k8s/ai-engine-deployment.yaml

# Apply services
kubectl apply -f k8s/services.yaml

# Apply ingress
kubectl apply -f k8s/ingress.yaml
```

#### 2. Scale Deployment
```bash
# Scale backend to 3 replicas
kubectl scale deployment backend --replicas=3 -n halobuzz

# Verify pods
kubectl get pods -n halobuzz
```

#### 3. Monitor Logs
```bash
# Backend logs
kubectl logs -f deployment/backend -n halobuzz

# AI engine logs
kubectl logs -f deployment/ai-engine -n halobuzz
```

### Option 3: Northflank (PaaS)

#### 1. Install Northflank CLI
```bash
npm install -g @northflank/cli
nf login
```

#### 2. Create Services
```bash
# Backend service
nf create service \
  --name halobuzz-backend \
  --type combined \
  --image halobuzz/backend:latest \
  --port 5000

# AI Engine service
nf create service \
  --name halobuzz-ai \
  --type combined \
  --image halobuzz/ai-engine:latest \
  --port 3001
```

#### 3. Configure Environment
```bash
# Set secrets
nf env set JWT_SECRET <value> --service halobuzz-backend
nf env set MONGODB_URI <value> --service halobuzz-backend
```

---

## 📱 Mobile App Deployment

### Prerequisites
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
cd apps/halobuzz-mobile
eas build:configure
```

### Build Process

#### 1. Development Build (Internal Testing)
```bash
# Android APK
eas build -p android --profile development

# iOS Simulator
eas build -p ios --profile development
```

#### 2. Preview Build (Beta Testing)
```bash
# Android APK
eas build -p android --profile preview

# iOS (TestFlight)
eas build -p ios --profile preview
```

#### 3. Production Build
```bash
# Android App Bundle (Google Play)
eas build -p android --profile production

# iOS (App Store)
eas build -p ios --profile production
```

### Submission

#### Google Play Store
```bash
# Submit to Internal Track
eas submit -p android --latest

# Promote to Beta
# (Do this manually in Google Play Console)

# Promote to Production
# (Do this manually after beta testing)
```

#### Apple App Store
```bash
# Submit to TestFlight
eas submit -p ios --latest

# Promote to App Store
# (Use App Store Connect website)
```

### Over-the-Air (OTA) Updates
```bash
# Publish update (JavaScript only, no native changes)
cd apps/halobuzz-mobile
eas update --branch production --message "Fix: Game balance adjustments"

# Create update branch
eas update --branch hotfix-v1.2.1 --message "Hotfix: Critical bug fix"

# Rollback update
eas update:rollback --branch production
```

---

## ⚙️ CI/CD Pipeline

### GitHub Actions Workflow

#### Trigger Conditions
- **Push to `main`**: Full deploy to production
- **Push to `develop`**: Deploy to staging
- **Pull Request**: Run tests only

#### Pipeline Stages

```mermaid
graph LR
    A[Code Push] --> B[Lint & Type Check]
    B --> C[Unit Tests]
    C --> D[Security Scan]
    D --> E[Build]
    E --> F[E2E Tests]
    F --> G{Branch?}
    G -->|main| H[Build Mobile]
    G -->|develop| I[Deploy Staging]
    H --> J[Deploy Production]
    J --> K[Submit to Stores]
```

#### Required GitHub Secrets
```bash
# Docker
DOCKER_USERNAME=<dockerhub-username>
DOCKER_PASSWORD=<dockerhub-token>

# Expo
EXPO_TOKEN=<expo-access-token>

# Deployment
KUBE_CONFIG=<base64-encoded-kubeconfig>

# Monitoring
SENTRY_AUTH_TOKEN=<sentry-token>
SLACK_WEBHOOK=<slack-webhook-url>

# Security
SNYK_TOKEN=<snyk-api-token>
```

### Manual Deployment

#### Backend
```bash
# Build
npm run build

# Deploy to production
npm run deploy:production

# Verify
curl https://api.halobuzz.com/health
```

#### Mobile
```bash
# Production build
eas build --platform all --profile production

# Submit
eas submit --platform all --latest
```

---

## 📊 Monitoring & Rollback

### Health Checks

#### Backend
```bash
# API Health
curl https://api.halobuzz.com/api/v1/health

# Database Connection
curl https://api.halobuzz.com/api/v1/health/db

# Redis Connection
curl https://api.halobuzz.com/api/v1/health/redis

# Socket.IO
curl https://api.halobuzz.com/socket.io/
```

#### Mobile
```bash
# Check latest build
eas build:list --platform all --limit 1

# Check update status
eas update:list --branch production

# Check crash reports
# (Use Sentry dashboard)
```

### Monitoring Tools

#### Application Performance Monitoring (APM)
- **Sentry**: Error tracking and crash reports
- **PostHog**: User analytics and funnels
- **New Relic / Datadog**: Server performance

#### Logs
```bash
# Backend logs (Docker)
docker logs -f halobuzz-backend

# Backend logs (Kubernetes)
kubectl logs -f deployment/backend -n halobuzz --tail=100

# Mobile logs
# (Use Expo Dev Tools or Sentry)
```

#### Metrics
```bash
# API Metrics
curl https://api.halobuzz.com/metrics

# Prometheus metrics
curl https://api.halobuzz.com/metrics/prometheus

# Grafana dashboards
# (Access at https://grafana.halobuzz.com)
```

### Rollback Procedures

#### Backend Rollback (Kubernetes)
```bash
# View deployment history
kubectl rollout history deployment/backend -n halobuzz

# Rollback to previous version
kubectl rollout undo deployment/backend -n halobuzz

# Rollback to specific revision
kubectl rollout undo deployment/backend -n halobuzz --to-revision=3

# Verify rollback
kubectl rollout status deployment/backend -n halobuzz
```

#### Backend Rollback (Docker)
```bash
# Pull previous image
docker pull halobuzz/backend:v1.2.0

# Stop current container
docker stop halobuzz-backend

# Start with previous version
docker run -d --name halobuzz-backend halobuzz/backend:v1.2.0

# Verify
curl http://localhost:5000/health
```

#### Mobile Rollback (OTA)
```bash
# Rollback to previous update
eas update:rollback --branch production

# Republish specific update
eas update:republish --update-id <update-id>

# Delete bad update
eas update:delete --update-id <update-id>
```

#### Mobile Rollback (Full Build)
```bash
# If OTA can't fix it, submit new build
eas build -p all --profile production

# Submit immediately
eas submit -p all --latest

# Meanwhile, rollback OTA to stable version
eas update:rollback --branch production
```

### Incident Response

#### 1. Detect Issue
- Monitor Sentry for crash spikes
- Check API error rates in Grafana
- Watch user complaints in support channels

#### 2. Assess Impact
```bash
# Check affected users
SELECT COUNT(*) FROM error_logs WHERE created_at > NOW() - INTERVAL 1 HOUR;

# Check error rate
curl https://api.halobuzz.com/metrics | grep error_rate
```

#### 3. Immediate Mitigation
```bash
# If backend issue: rollback deployment
kubectl rollout undo deployment/backend -n halobuzz

# If mobile issue: rollback OTA update
eas update:rollback --branch production

# If database issue: enable read-only mode
# (Execute in MongoDB console)
db.fsyncLock()
```

#### 4. Post-Mortem
- Document incident timeline
- Identify root cause
- Implement fixes
- Update runbooks

---

## 🔐 Security Best Practices

### Pre-Deployment
- [ ] Rotate all secrets
- [ ] Update SSL certificates
- [ ] Review firewall rules
- [ ] Enable DDoS protection
- [ ] Configure WAF rules

### Post-Deployment
- [ ] Monitor auth failures
- [ ] Check for SQL injection attempts
- [ ] Review access logs
- [ ] Verify rate limiting
- [ ] Test anti-cheat system

---

## 📚 Additional Resources

### Documentation
- [Backend API Docs](https://api.halobuzz.com/docs)
- [Mobile SDK Docs](https://docs.halobuzz.com/mobile)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

### Tools
- [EAS CLI Docs](https://docs.expo.dev/eas/)
- [Kubernetes Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [Docker Compose Docs](https://docs.docker.com/compose/)

### Support
- **Slack**: #deployments, #incidents
- **Email**: devops@halobuzz.com
- **Escalation**: On-call rotation (PagerDuty)

---

**Last Updated:** December 2024  
**Maintained By:** HaloBuzz DevOps Team


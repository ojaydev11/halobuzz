# 🚀 HaloBuzz Deployment Guide

## Prerequisites

- Docker 20.10+
- Kubernetes 1.25+ (for k8s deployment)
- Node.js 18+
- MongoDB 6.0+
- Redis 7.0+

## 🐳 Docker Deployment

### 1. Build Images

```bash
# Backend
cd backend
docker build -t halobuzz/backend:latest .

# AI Engine
cd ai-engine
docker build -t halobuzz/ai-engine:latest .

# Admin Dashboard
cd admin
docker build -t halobuzz/admin:latest .
```

### 2. Docker Compose (Development)

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down
```

### 3. Docker Compose (Production)

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  backend:
    image: halobuzz/backend:latest
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/halobuzz
      - REDIS_URL=redis://redis:6379
    depends_on:
      - mongo
      - redis
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3

  mongo:
    image: mongo:6.0
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"
    restart: always

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: always

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
    restart: always

volumes:
  mongo_data:
  redis_data:
```

## ☸️ Kubernetes Deployment

### 1. Create Namespace

```bash
kubectl create namespace halobuzz
```

### 2. Create Secrets

```bash
# Create secret for environment variables
kubectl create secret generic halobuzz-secrets \
  --from-literal=mongodb-uri='mongodb://mongo:27017/halobuzz' \
  --from-literal=jwt-secret='your-jwt-secret' \
  --from-literal=agora-app-id='your-agora-id' \
  --from-literal=agora-certificate='your-agora-cert' \
  -n halobuzz
```

### 3. Deploy Backend

```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: halobuzz-backend
  namespace: halobuzz
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: halobuzz/backend:latest
        ports:
        - containerPort: 4000
        env:
        - name: NODE_ENV
          value: "production"
        - name: MONGODB_URI
          valueFrom:
            secretKeyRef:
              name: halobuzz-secrets
              key: mongodb-uri
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: halobuzz-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /healthz
            port: 4000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /readyz
            port: 4000
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: halobuzz
spec:
  selector:
    app: backend
  ports:
  - port: 80
    targetPort: 4000
  type: LoadBalancer
```

### 4. Deploy MongoDB

```yaml
# k8s/mongodb-deployment.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
  namespace: halobuzz
spec:
  serviceName: mongodb-service
  replicas: 1
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
      - name: mongodb
        image: mongo:6.0
        ports:
        - containerPort: 27017
        volumeMounts:
        - name: mongo-storage
          mountPath: /data/db
  volumeClaimTemplates:
  - metadata:
      name: mongo-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: mongodb-service
  namespace: halobuzz
spec:
  selector:
    app: mongodb
  ports:
  - port: 27017
    targetPort: 27017
  clusterIP: None
```

### 5. Deploy Redis

```yaml
# k8s/redis-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: halobuzz
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: halobuzz
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
```

### 6. Apply Configurations

```bash
# Deploy all resources
kubectl apply -f k8s/

# Check deployment status
kubectl get all -n halobuzz

# View logs
kubectl logs -f deployment/halobuzz-backend -n halobuzz

# Scale deployment
kubectl scale deployment halobuzz-backend --replicas=5 -n halobuzz
```

## 🔄 CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
    - run: npm ci
    - run: npm test
    - run: npm run lint

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Build Docker image
      run: docker build -t halobuzz/backend:${{ github.sha }} .
    - name: Push to registry
      run: |
        echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
        docker push halobuzz/backend:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
    - name: Deploy to Kubernetes
      run: |
        kubectl set image deployment/halobuzz-backend backend=halobuzz/backend:${{ github.sha }} -n halobuzz
        kubectl rollout status deployment/halobuzz-backend -n halobuzz
```

## 🌍 Cloud Deployments

### AWS ECS

```bash
# Build and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin $ECR_REGISTRY
docker build -t halobuzz-backend .
docker tag halobuzz-backend:latest $ECR_REGISTRY/halobuzz-backend:latest
docker push $ECR_REGISTRY/halobuzz-backend:latest

# Update ECS service
aws ecs update-service --cluster halobuzz-cluster --service halobuzz-backend --force-new-deployment
```

### Google Cloud Run

```bash
# Build and deploy
gcloud builds submit --tag gcr.io/PROJECT_ID/halobuzz-backend
gcloud run deploy halobuzz-backend \
  --image gcr.io/PROJECT_ID/halobuzz-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Heroku

```bash
# Deploy using Heroku CLI
heroku create halobuzz-api
heroku addons:create mongolab:sandbox
heroku addons:create heroku-redis:hobby-dev
git push heroku main
heroku ps:scale web=1
```

## 📊 Monitoring Setup

### Prometheus

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'halobuzz-backend'
    static_configs:
      - targets: ['backend-service:4000']
    metrics_path: '/metrics'
```

### Grafana Dashboard

Import dashboard ID: `12345` or use our custom [dashboard.json](./monitoring/grafana-dashboard.json)

## 🔄 Rolling Updates

```bash
# Zero-downtime deployment
kubectl set image deployment/halobuzz-backend \
  backend=halobuzz/backend:v2.0.0 \
  -n halobuzz \
  --record

# Check rollout status
kubectl rollout status deployment/halobuzz-backend -n halobuzz

# Rollback if needed
kubectl rollout undo deployment/halobuzz-backend -n halobuzz
```

## 🔥 Troubleshooting

### Check Health

```bash
# Docker
docker exec halobuzz-backend curl http://localhost:4000/healthz

# Kubernetes
kubectl exec -it deployment/halobuzz-backend -n halobuzz -- curl http://localhost:4000/healthz
```

### View Logs

```bash
# Docker
docker logs halobuzz-backend --tail=100 -f

# Kubernetes
kubectl logs deployment/halobuzz-backend -n halobuzz --tail=100 -f
```

### Debug Pod

```bash
# Get shell access
kubectl exec -it deployment/halobuzz-backend -n halobuzz -- /bin/sh

# Port forward for local debugging
kubectl port-forward deployment/halobuzz-backend 4000:4000 -n halobuzz
```

## 🔐 SSL/TLS Setup

### Using Let's Encrypt

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create certificate
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: halobuzz-tls
  namespace: halobuzz
spec:
  secretName: halobuzz-tls-secret
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - api.halobuzz.com
EOF
```

## 📝 Post-Deployment Checklist

- [ ] Health endpoints responding
- [ ] Database connections verified
- [ ] Redis cache working
- [ ] Payment webhooks configured
- [ ] SSL certificates valid
- [ ] Monitoring dashboards active
- [ ] Logs aggregating properly
- [ ] Backup jobs scheduled
- [ ] Rate limiting active
- [ ] AI moderation online

---

For production support: devops@halobuzz.com
# HaloBuzz - Nepali-First Live Streaming Platform

A comprehensive live streaming and short-video platform built for Nepal with global expansion capabilities.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB
- Redis
- Expo CLI

### Docker Quick Start

```bash
# Build images
docker compose build

# Start services in background
docker compose up -d

# Tail backend logs
docker compose logs -f backend
```

Environment templates at repo root:

```bash
cp env.backend.local.example .env.backend.local
cp env.ai.local.example .env.ai.local
```

Seed database (after backend is running and built):

```bash
docker compose exec backend node dist/scripts/seeds/index.js
```

### Installation & Setup

1. **Install dependencies**
```bash
npm install
```

2. **Environment Setup**
```bash
# Copy environment files
cp backend/env.example backend/.env
cp ai-engine/env.example ai-engine/.env
cp mobile/env.example mobile/.env
```

3. **Start Development**
```bash
# Start backend
npm run dev:backend

# Start AI engine (in new terminal)
npm run dev:ai

# Seed database (after backend is running)
npm run seed

# Start mobile (in new terminal)
npm run dev:mobile

# Run smoke tests (in new terminal)
AI_ENGINE_SECRET=<your-secret> npm run smoke
```

4. **Import Postman Collection**
- Import `docs/postman/HaloBuzz_Local_API.postman_collection.json`
- Import `docs/postman/HaloBuzz_Local.postman_environment.json`
- Set `ai_secret` variable in environment

## 🏗️ Architecture

```
halobuzz/
├── backend/               # Node.js + Express + Socket.IO
├── ai-engine/             # AI services (moderation, engagement)
├── mobile/                # React Native + Expo
├── admin/                 # Next.js admin dashboard
├── docs/                  # Documentation
└── scripts/               # Smoke tests
```

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js + Express + TypeScript
- **Real-time**: Socket.IO
- **Database**: MongoDB + Redis
- **Media**: Agora SDK
- **Storage**: AWS S3
- **Payments**: eSewa, Khalti, Stripe

### AI Engine
- **Moderation**: NSFW detection, age estimation, profanity
- **Engagement**: Boredom detection, cohost suggestions
- **Reputation**: Score calculation and decay

### Mobile
- **Framework**: React Native + Expo
- **Platforms**: iOS, Android, iPad
- **Real-time**: Socket.IO client
- **Video**: Agora SDK

## 📊 Features

### Core Features
- Live streaming with Agora
- Short videos (reels) with offline queue
- Coin system (NPR 10 = 500 coins)
- OG tiers (5 levels with daily bonuses)
- Halo Throne premium feature
- In-app games with AI win rates
- Real-time chat and gifts

### AI Features
- Content moderation (NSFW, profanity)
- Age verification
- Engagement optimization
- Reputation system

### Payment Integration
- Nepal: eSewa, Khalti
- International: Stripe
- Webhook idempotency
- HMAC verification

## 📄 Documentation

- [Architecture](docs/ARCHITECTURE.md) - System architecture and data model
- [API Collection](docs/postman/) - Complete Postman collection
- [Quick Start](QUICKSTART.md) - Detailed setup guide

## 🐳 Docker & CI/CD

### Docker Setup
```bash
# Development
docker compose -f docker-compose.dev.yml up -d

# Production
docker compose -f docker-compose.prod.yml up -d

# Health check
curl http://localhost:5010/healthz
```

### CI/CD Pipeline
GitHub Actions workflow automatically:
- Runs tests on PR/push
- Builds Docker images
- Deploys to staging/production
- Runs smoke tests
- Updates documentation

### Required Secrets
Add these GitHub Actions secrets (Settings → Secrets and variables → Actions):

**Backend:**
- BACKEND_ENV
- MONGODB_URI
- REDIS_URL
- JWT_SECRET

**AI Engine:**
- AI_ENV
- OPENAI_API_KEY

**Mobile:**
- EAS_TOKEN
- EXPO_PUBLIC_API_URL

**Payments:**
- STRIPE_SECRET_KEY
- ESEWA_SECRET
- KHALTI_SECRET_KEY

**Media & Storage:**
- AGORA_APP_ID
- AGORA_APP_CERT
- S3_ACCESS_KEY
- S3_SECRET_KEY
- S3_BUCKET
- S3_REGION

## 🔒 Production Hardening

### Security Checklist
- [x] Helmet security headers
- [x] Strict CORS configuration
- [x] Rate limiting on write routes
- [x] Request/response validation (express-validator)
- [x] Stack trace hiding in production
- [x] Structured logging with request IDs
- [x] RBAC for admin endpoints
- [x] Webhook HMAC verification
- [x] Event idempotency
- [x] Input sanitization

### Performance
- [x] Redis caching
- [x] Database indexing
- [x] Response compression
- [x] Static file serving
- [x] Connection pooling

### Monitoring
- [x] Health check endpoints
- [x] Error tracking and logging
- [x] Performance metrics
- [x] Uptime monitoring

## 🆘 Support

For support and questions:
- Email: support@halobuzz.com
- Documentation: [docs.halobuzz.com](https://docs.halobuzz.com)

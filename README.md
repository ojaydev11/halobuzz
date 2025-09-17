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

#### Global Single-Player Games (60/40 hold)
- API endpoints under `/api/v1/games`:
  - `GET /api/v1/games` list games with current bucket and timeLeftSec
  - `GET /api/v1/games/:id/round` public round data with commit (seedHash) and reveal (seed after settle)
  - `POST /api/v1/games/:id/play` submit a play `{ userId, betAmount, choice? }`
  - `GET /api/v1/games/:id/history?limit=50` recent settled rounds
  - `GET /api/v1/games/verify?gameId=...&bucketStart=...` verification helper
- Provable fairness doc: `GET /api/v1/provable-fairness`
- Engine: commit–reveal via HMAC-SHA256 seed; deterministic RNG; drift correction to target payout 0.60
- Simulation: `cd backend && npm run sim`

### AI Engine
- **Moderation**: NSFW detection, age estimation, profanity
- **Engagement**: Boredom detection, cohost suggestions
- **Reputation**: Score calculation and decay

### Live Realtime Layer
- **WebSocket**: Socket.IO with room-based communication
- **Features**: Real-time chat, gifts, presence tracking, moderation
- **Security**: JWT authentication, rate limiting, input validation
- **Monitoring**: Prometheus metrics for connection and event tracking
- **Transport**: WebSocket primary, polling fallback

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

## 🚀 Production Deploy (Railway + Vercel)

### Quick Deploy Commands

```bash
# Run hosted smoke tests after deployment
BACKEND_URL=https://<your-backend>.railway.app \
AI_URL=https://<your-ai>.railway.app \
AI_ENGINE_SECRET=<your-secret> \
./scripts/hosted-smoke.sh

# Windows PowerShell
$env:BACKEND_URL="https://<your-backend>.railway.app"
$env:AI_URL="https://<your-ai>.railway.app"
$env:AI_ENGINE_SECRET="<your-secret>"
.\scripts\hosted-smoke.ps1
```

### Deploy via GitHub Actions

#### Automated Deployment Workflows
- **Railway Backend Deploy** - Deploys backend to Railway on push to main
- **Railway AI Engine Deploy** - Deploys AI engine to Railway on push to main  
- **Hosted Smoke Tests** - Verifies live deployment security and functionality
- **Vercel Admin Deploy** - Optional admin dashboard deployment to Vercel

#### Required GitHub Secrets
Add these secrets in GitHub → Settings → Secrets → Actions:

**Railway Deployment:**
- `RAILWAY_TOKEN` - Your Railway API token
- `BACKEND_URL` - https://<backend>.railway.app
- `AI_URL` - https://<ai-engine>.railway.app
- `AI_ENGINE_SECRET` - Shared secret for AI engine authentication

**Optional Vercel Deployment:**
- `VERCEL_TOKEN` - Your Vercel API token
- `VERCEL_ORG_ID` - Your Vercel organization ID
- `VERCEL_PROJECT_ID` - Your Vercel project ID

#### CI/CD Pipeline
GitHub Actions workflow automatically:
- Runs tests on PR/push
- Builds and deploys to Railway
- Seeds production database
- Runs hosted smoke tests
- Verifies security controls
- Updates documentation

### Production Environment Setup

#### Environment Templates
Copy and configure these production environment files:
- `env.backend.production.example` → Backend service variables
- `env.ai.production.example` → AI Engine service variables  
- `env.admin.production.example` → Admin dashboard variables

#### Documentation
- [Production Environment Matrix](docs/infra/prod-env-matrix.md) - Complete env var reference
- [Rollback Guide](docs/infra/rollback.md) - How to rollback deployments
- [Deployment Guide](docs/infra/deployment-guide.md) - Step-by-step deployment

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

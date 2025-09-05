# 🚀 HaloBuzz - Live Streaming & Social Platform

[![Build Status](https://img.shields.io/badge/build-passing-green)](https://github.com/halobuzz/halobuzz)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)

Nepal's premier live streaming platform with gifting, games, and social features.

## 🎯 Quick Start (One Command)

```bash
# Clone and run
git clone https://github.com/halobuzz/halobuzz.git
cd halobuzz
./setup.sh  # Installs everything and starts services
```

Or manually:

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run dev

# Mobile (in new terminal)
cd apps/halobuzz-mobile
cp .env.example .env
npm install
npm run ios  # or npm run android
```

## 📦 Project Structure

```
halobuzz/
├── backend/              # Node.js + Express + MongoDB API
├── apps/
│   └── halobuzz-mobile/ # React Native mobile app
├── ai-engine/           # AI moderation service
├── admin/               # Admin dashboard
└── infra/               # Infrastructure configs
```

## 🔧 Tech Stack

- **Backend:** Node.js, Express, MongoDB, Redis, Socket.io
- **Mobile:** React Native, Expo
- **Streaming:** Agora WebRTC
- **AI:** TensorFlow.js, NSFWJS, Face-API
- **Payments:** eSewa, Khalti, Stripe
- **Monitoring:** Prometheus, Grafana, Sentry

## 🚀 Features

### MVP (Ready)
- ✅ Live video/audio streaming
- ✅ Real-time gifting system
- ✅ Coin wallet & payments
- ✅ AI content moderation
- ✅ User profiles & auth

### In Progress
- 🔄 Reels (short videos)
- 🔄 OG membership tiers
- 🔄 Private messaging
- 🔄 Mini-games

### Planned
- 📅 LinkCast (multi-host)
- 📅 Creator analytics
- 📅 NFT integration
- 📅 DAO governance

## 🔑 Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Critical for MVP
MONGODB_URI=mongodb://localhost:27017/halobuzz
REDIS_URL=redis://localhost:6379
AGORA_APP_ID=your_agora_id
AGORA_APP_CERTIFICATE=your_agora_cert
JWT_SECRET=your_32_char_secret

# Payment Providers
ESEWA_MERCHANT_CODE=HALOBUZZ
KHALTI_SECRET_KEY=test_secret_key_
STRIPE_SECRET_KEY=sk_test_
```

## 📊 API Documentation

### Core Endpoints

```bash
# Health Check
GET /healthz          # Liveness probe
GET /readyz          # Readiness probe

# Streaming
POST /api/v1/streams/start
POST /api/v1/streams/join
POST /api/v1/streams/end
GET  /api/v1/streams/active

# Payments
POST /api/v1/wallet/topup/:provider
POST /api/v1/payments/:provider/webhook
GET  /api/v1/wallet/balance

# Moderation
POST /api/v1/moderation/scan
POST /api/v1/moderation/decision

# Gifts
POST /api/v1/gifts/send
GET  /api/v1/leaderboards/live/:streamId
```

### Rate Limits
- Auth: 5/min/IP
- Payments: 3/min/IP  
- Gifts: 30/min/user
- General: 100/min

## 🧪 Testing

```bash
# Unit tests
npm test

# Load testing (10k users)
npm run test:load

# Security scan
npm run test:security

# E2E tests
npm run test:e2e
```

## 🐳 Docker Deployment

```bash
# Build and run
docker-compose up -d

# Or production
docker build -t halobuzz/backend .
docker run -p 4000:4000 --env-file .env halobuzz/backend
```

## 📈 Monitoring

- **Metrics:** http://localhost:4000/metrics (Prometheus)
- **Health:** http://localhost:4000/healthz
- **Admin:** http://localhost:3001/admin

## 🔒 Security

- JWT authentication with refresh tokens
- Rate limiting on all endpoints
- Input sanitization & validation
- CORS, CSP, HSTS headers
- SQL/NoSQL injection prevention
- XSS protection

## 🚀 Performance

- **Live Latency:** < 300ms (p95)
- **Reconnect:** < 5s
- **Wallet Credit:** < 10s
- **API Response:** < 200ms (p95)

## 🤝 Contributing

1. Fork the repo
2. Create feature branch: `feature/epic-name`
3. Commit changes
4. Push and create PR to `develop`
5. Pass CI gates (lint, test, build)

## 📜 License

MIT License - see [LICENSE](LICENSE) file

## 🆘 Support

- **Email:** support@halobuzz.com
- **Discord:** [Join our server](https://discord.gg/halobuzz)
- **Docs:** [docs.halobuzz.com](https://docs.halobuzz.com)

## 🎯 Roadmap

**Q1 2025:** MVP Launch (Nepal)
**Q2 2025:** Games & Advanced Features
**Q3 2025:** Web3 Integration
**Q4 2025:** Global Expansion

---

Built with ❤️ by Base44 Team
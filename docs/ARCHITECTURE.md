# HaloBuzz Architecture

## System Overview

HaloBuzz is a comprehensive live streaming platform built with microservices architecture, designed for scalability and real-time performance.

## 🏗️ High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │  Admin Dashboard │    │   Web Client    │
│  React Native   │    │     Next.js     │    │     React       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Load Balancer  │
                    │     Nginx       │
                    └─────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Backend API    │    │   AI Engine     │    │  Media Server   │
│ Node.js/Express │    │    Python       │    │     Agora       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Data Layer    │
                    │ MongoDB + Redis │
                    └─────────────────┘
```

## 🔧 Technology Stack

### Backend Services
- **API Server**: Node.js + Express + TypeScript
- **Real-time**: Socket.IO for live chat and notifications
- **Database**: MongoDB for data persistence
- **Cache**: Redis for session storage and caching
- **Queue**: Bull for background job processing

### AI Engine
- **Runtime**: Python + FastAPI
- **ML Models**: Custom trained models for content moderation
- **Image Processing**: OpenCV + TensorFlow
- **Text Analysis**: Natural language processing

### Mobile Application
- **Framework**: React Native + Expo
- **State Management**: Redux Toolkit
- **Navigation**: React Navigation
- **Real-time**: Socket.IO client

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Orchestration**: Kubernetes (production)
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack

## 📊 Data Architecture

### Core Entities

```typescript
// User Management
User {
  id: ObjectId
  username: string
  email: string
  coins: {
    balance: number
    bonusBalance: number  // Non-transferable OG bonuses
    totalEarned: number
    totalSpent: number
  }
  ogLevel: number (1-5)
  ogExpiresAt: Date
  trust: {
    score: number (0-100)
    level: 'low' | 'medium' | 'high' | 'verified'
  }
}

// Streaming
LiveStream {
  id: ObjectId
  hostId: ObjectId
  title: string
  status: 'pending' | 'live' | 'ended'
  viewers: number
  totalCoins: number
  country: string
  analytics: StreamAnalytics
}

// OG Subscription System
OGTier {
  tier: number (1-5)
  priceCoins: number
  duration: number  // days
  benefits: {
    dailyBonus: number  // floor(priceCoins * 0.6 / duration)
    exclusiveGifts: ObjectId[]
    chatPrivileges: string[]
  }
}

// Moderation
ModerationFlag {
  reporterId: ObjectId
  type: 'user' | 'stream' | 'message' | 'content'
  reason: string
  score: number  // AI confidence score
  action: 'warn' | 'blur' | 'ban' | 'delete' | 'none'
  status: 'pending' | 'reviewed' | 'resolved'
}
```

### Database Design

#### MongoDB Collections
- `users` - User profiles and authentication
- `liveStreams` - Stream metadata and analytics
- `messages` - Chat messages and moderation
- `gifts` - Virtual gifts and transactions
- `ogTiers` - OG subscription tiers
- `transactions` - Financial transactions
- `moderationFlags` - Content moderation records
- `festivals` - Special events and themed content
- `games` - In-app games and results
- `reputationEvents` - User reputation tracking

#### Redis Cache Structure
```
user:{userId}           # User session data
stream:{streamId}       # Live stream cache
chat:{streamId}         # Chat message buffer
ranking:streams         # Stream popularity ranking
festival:active         # Active festival data
```

## 🔄 Real-time Architecture

### Socket.IO Events (Canonical)
- `stream:join` - Join live stream
- `stream:leave` - Leave live stream
- `chat:new` - New chat message
- `gift:sent` - Virtual gift sent
- `throne:claimed` - Halo Throne claimed
- `battle:boost` - AI battle boost
- `ai:warning` - Content moderation warning
- `og:changed` - OG level change
- `metrics:update` - Stream metrics update

### Event Flow
```
Mobile Client → Socket.IO → Backend → Database
     ↓              ↓          ↓         ↓
Real-time UI ← Broadcast ← Validation ← Persistence
```

## 💰 Payment Architecture

### Supported Gateways
- **Nepal**: eSewa, Khalti (NPR baseline: NPR 10 = 500 coins)
- **International**: Stripe (USD)

### Webhook Security
- **Idempotency**: Unique `eventId` prevents double processing
- **HMAC Verification**: All webhooks verify signatures
- **Replay Protection**: Event deduplication with 24h window

### Transaction Flow
```
Client → Payment Gateway → Webhook → Verification → Balance Update
```

## 🤖 AI Engine Architecture

### Content Moderation Pipeline
```
Input Content → Preprocessing → ML Models → Scoring → Action Decision
     ↓              ↓             ↓          ↓           ↓
  Text/Image → Normalization → Classification → Threshold → warn/ban/blur
```

### Moderation Thresholds
- **Profanity Score ≥ 0.6**: `ai:warning` (warn)
- **Profanity Score ≥ 0.9**: Content blocked + temporary ban
- **NSFW Detection**: Auto-blur + human review
- **Age Detection < 18**: Account restriction

### AI Features
- **Boredom Detection**: Engagement analysis
- **Cohost Suggestions**: User matching algorithms
- **Gift Recommendations**: Behavioral analysis
- **Reputation Scoring**: Trust calculation

## 🎮 Gaming System

### Game Engine
- **AI Win Rate**: Server-enforced 35%-55% range
- **Fairness**: Cryptographically secure randomness
- **Anti-cheat**: Server-side validation
- **Tournaments**: Bracket management

### Game Types
- **Battle**: Team vs team competitions
- **Quiz**: Knowledge-based games
- **Lottery**: Chance-based rewards
- **Challenge**: Skill-based contests

## 📱 Mobile Architecture

### App Structure
```
src/
├── components/          # Reusable UI components
├── screens/            # Screen components
│   ├── live/           # Live streaming screens
│   ├── inbox/          # Messaging screens
│   └── games/          # Gaming screens
├── navigation/         # Navigation configuration
├── services/          # API and socket services
├── store/             # Redux state management
└── utils/             # Utility functions
```

### Tablet Optimization
- **Live Room**: Two-pane layout (video left, chat/gifts right)
- **Inbox**: Split view (conversations left, chat right)
- **Responsive**: Automatic layout switching at 768px breakpoint
- **Testing**: Snapshot tests for all breakpoints

## 🔐 Security Architecture

### Authentication & Authorization
- **JWT Tokens**: Stateless authentication
- **RBAC**: Role-based access control
- **Admin Guards**: Email-based admin verification
- **Session Management**: Redis-based session store

### API Security
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Input Validation**: Express-validator on all endpoints
- **CORS**: Strict origin validation
- **Helmet**: Security headers (CSP, HSTS, etc.)

### Data Protection
- **Encryption**: AES-256 for sensitive data
- **Hashing**: bcrypt for passwords (12 rounds)
- **Sanitization**: XSS prevention
- **Audit Logging**: All admin actions logged

## 🐳 Docker & Deployment

### Container Architecture
```yaml
# docker-compose.yml
services:
  backend:
    build: ./backend
    ports: ["5010:5010"]
    depends_on: [mongodb, redis]
    
  ai-engine:
    build: ./ai-engine
    ports: ["5020:5020"]
    
  mongodb:
    image: mongo:7
    ports: ["27017:27017"]
    
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
```

### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy
on: [push, pull_request]
jobs:
  test:
    - Run unit tests
    - Run integration tests
    - Run smoke tests
  build:
    - Build Docker images
    - Push to registry
  deploy:
    - Deploy to staging
    - Run health checks
    - Deploy to production
```

### Production Deployment
- **Kubernetes**: Container orchestration
- **Load Balancing**: Multiple backend instances
- **Auto-scaling**: Based on CPU/memory usage
- **Health Checks**: Liveness and readiness probes
- **Rolling Updates**: Zero-downtime deployments

## 📊 Monitoring & Observability

### Metrics Collection
- **Application Metrics**: Response times, error rates
- **Business Metrics**: Active users, revenue, engagement
- **Infrastructure Metrics**: CPU, memory, disk usage
- **Custom Metrics**: Stream quality, AI accuracy

### Logging Strategy
- **Structured Logs**: JSON format with request IDs
- **Log Levels**: ERROR, WARN, INFO, DEBUG
- **Centralized**: ELK stack aggregation
- **Retention**: 30 days for INFO, 90 days for ERROR

### Alerting
- **Error Rate**: > 1% triggers alert
- **Response Time**: > 500ms P95 triggers alert
- **System Health**: CPU > 80% triggers alert
- **Business KPIs**: Revenue drop > 10% triggers alert

## 🔄 Data Flow Examples

### Live Streaming Flow
```
1. Host starts stream → Backend creates LiveStream record
2. Viewers join → Socket.IO room management
3. Chat messages → Real-time broadcast to room
4. Gifts sent → Transaction processing + animation
5. Stream ends → Analytics calculation + storage
```

### OG Subscription Flow
```
1. User selects tier → Pricing validation (NP baseline)
2. Payment processing → Gateway webhook
3. HMAC verification → Idempotency check
4. Balance update → OG tier activation
5. Daily bonus cron → bonusBalance credit (non-transferable)
```

### Content Moderation Flow
```
1. User posts content → AI Engine analysis
2. Score calculation → Threshold comparison
3. Action decision → Automatic or human review
4. ModerationFlag creation → Audit trail
5. User notification → Action enforcement
```

This architecture supports HaloBuzz's requirements for real-time performance, scalability, security, and maintainability while providing a foundation for future growth and feature expansion.
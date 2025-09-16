# HaloBuzz Platform Architecture v1.0

## 🏗️ System Overview

HaloBuzz is a comprehensive live streaming platform built with microservices architecture, designed for scalability, real-time performance, and global expansion. The platform supports multiple regions, currencies, and payment methods while maintaining high security and performance standards.

## 📊 High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        MA[Mobile App<br/>React Native]
        WA[Web App<br/>Next.js]
        AA[Admin Panel<br/>Next.js]
    end
    
    subgraph "Load Balancer"
        LB[Nginx<br/>SSL Termination]
    end
    
    subgraph "API Gateway"
        AG[API Gateway<br/>Rate Limiting]
    end
    
    subgraph "Core Services"
        BE[Backend API<br/>Node.js/Express]
        AI[AI Engine<br/>Node.js/Python]
        WS[WebSocket Service<br/>Socket.IO]
    end
    
    subgraph "Data Layer"
        DB[(MongoDB<br/>Primary Database)]
        RD[(Redis<br/>Cache & Sessions)]
        S3[(AWS S3<br/>File Storage)]
    end
    
    subgraph "External Services"
        AGORA[Agora<br/>Video Streaming]
        STRIPE[Stripe<br/>Payments]
        ESEWA[eSewa<br/>Payments]
        KHALTI[Khalti<br/>Payments]
        OPENAI[OpenAI<br/>AI Services]
        SENDGRID[SendGrid<br/>Email]
        TWILIO[Twilio<br/>SMS]
    end
    
    subgraph "Monitoring"
        PROM[Prometheus<br/>Metrics]
        GRAF[Grafana<br/>Dashboards]
        ELK[ELK Stack<br/>Logging]
    end
    
    MA --> LB
    WA --> LB
    AA --> LB
    LB --> AG
    AG --> BE
    AG --> AI
    AG --> WS
    
    BE --> DB
    BE --> RD
    BE --> S3
    AI --> DB
    AI --> RD
    
    BE --> AGORA
    BE --> STRIPE
    BE --> ESEWA
    BE --> KHALTI
    BE --> OPENAI
    BE --> SENDGRID
    BE --> TWILIO
    
    BE --> PROM
    AI --> PROM
    PROM --> GRAF
    BE --> ELK
    AI --> ELK
```

## 🔧 Component Architecture

### 1. Backend API Service (`backend/`)

**Purpose**: Core business logic, authentication, and API endpoints

**Technology Stack**:
- **Runtime**: Node.js 20.x
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Cache**: Redis
- **Authentication**: JWT with refresh tokens
- **File Storage**: AWS S3 with presigned URLs
- **Real-time**: Socket.IO with Redis adapter

**Key Components**:
```
backend/
├── src/
│   ├── config/          # Configuration management
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic
│   ├── middleware/      # Express middleware
│   ├── utils/           # Utility functions
│   └── cron/            # Scheduled jobs
├── tests/               # Test suites
└── scripts/             # Build and deployment scripts
```

**Core Features**:
- User authentication and authorization
- Live streaming management
- Payment processing (Stripe, eSewa, Khalti, PayPal)
- Real-time chat and notifications
- Content moderation and AI services
- Creator economy and monetization
- Global expansion and localization
- Analytics and reporting

### 2. AI Engine Service (`ai-engine/`)

**Purpose**: AI-powered content analysis, moderation, and recommendations

**Technology Stack**:
- **Runtime**: Node.js 20.x
- **AI Services**: OpenAI GPT-3.5-turbo
- **Language**: TypeScript
- **Database**: MongoDB
- **Cache**: Redis

**Key Features**:
- Content moderation and safety
- Sentiment analysis
- Content quality assessment
- KYC verification
- Recommendation engine
- Automated content tagging

### 3. Mobile Application (`apps/halobuzz-mobile/`)

**Purpose**: Cross-platform mobile app for iOS and Android

**Technology Stack**:
- **Framework**: React Native with Expo
- **Navigation**: Expo Router
- **State Management**: Zustand
- **UI Components**: React Native Elements
- **Real-time**: Socket.IO client
- **Build**: EAS Build

**Key Features**:
- Live streaming viewer
- Real-time chat
- Social interactions (follow, like, share)
- Search and discovery
- Creator tools
- Payment integration
- Push notifications

### 4. Admin Panel (`admin/`)

**Purpose**: Administrative interface for platform management

**Technology Stack**:
- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Headless UI
- **Authentication**: NextAuth.js

**Key Features**:
- User management
- Content moderation
- Analytics dashboard
- Payment monitoring
- System configuration
- Security monitoring

## 🔄 Data Flow Architecture

### Request Processing Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant LB as Load Balancer
    participant AG as API Gateway
    participant BE as Backend API
    participant DB as MongoDB
    participant RD as Redis
    participant EXT as External Services
    
    C->>LB: HTTPS Request
    LB->>AG: Forward Request
    AG->>AG: Rate Limiting
    AG->>AG: Authentication
    AG->>BE: Process Request
    
    BE->>RD: Check Cache
    alt Cache Hit
        RD-->>BE: Return Cached Data
    else Cache Miss
        BE->>DB: Query Database
        DB-->>BE: Return Data
        BE->>RD: Update Cache
    end
    
    BE->>EXT: Call External Service
    EXT-->>BE: Return Response
    
    BE-->>AG: Return Response
    AG-->>LB: Forward Response
    LB-->>C: Return Response
```

### Real-time Communication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant WS as WebSocket Service
    participant RD as Redis
    participant BE as Backend API
    
    C->>WS: WebSocket Connection
    WS->>RD: Subscribe to Channel
    WS-->>C: Connection Established
    
    C->>WS: Send Message
    WS->>RD: Publish Message
    RD->>WS: Broadcast to Subscribers
    WS-->>C: Message Delivered
    
    BE->>RD: System Notification
    RD->>WS: Forward Notification
    WS-->>C: Push Notification
```

## 🗄️ Data Architecture

### Database Schema

**MongoDB Collections**:

1. **Users**: User profiles, authentication, preferences
2. **LiveStreams**: Stream metadata, analytics, settings
3. **Messages**: Chat messages, moderation flags
4. **Transactions**: Payment records, coin transactions
5. **Gifts**: Virtual gifts, pricing, analytics
6. **ModerationFlags**: Content moderation, reports
7. **ReputationEvents**: User reputation tracking
8. **CreatorEconomy**: Creator tiers, subscriptions, brand deals
9. **SearchIndex**: Search optimization, trending content
10. **GlobalExpansion**: Regional settings, currencies, localization

### Caching Strategy

**Redis Usage**:
- **Session Storage**: User sessions and authentication tokens
- **API Response Cache**: Frequently accessed data (30min TTL)
- **Real-time Data**: Live stream viewers, chat messages
- **Rate Limiting**: Request throttling and abuse prevention
- **WebSocket State**: Connection management and message queuing

### File Storage

**AWS S3 Structure**:
```
halobuzz-storage/
├── avatars/           # User profile pictures
├── thumbnails/        # Stream thumbnails
├── recordings/        # Stream recordings
├── reels/            # Short video content
├── documents/        # KYC documents
└── temp/             # Temporary uploads
```

## 🔐 Security Architecture

### Authentication & Authorization

```mermaid
graph LR
    A[Client Request] --> B[JWT Validation]
    B --> C{Valid Token?}
    C -->|Yes| D[Extract User Info]
    C -->|No| E[Return 401]
    D --> F[Check Permissions]
    F --> G{Authorized?}
    G -->|Yes| H[Process Request]
    G -->|No| I[Return 403]
```

**Security Layers**:
1. **Transport Security**: HTTPS/TLS 1.3
2. **Authentication**: JWT with refresh tokens
3. **Authorization**: Role-based access control (RBAC)
4. **Rate Limiting**: Per-user and per-endpoint limits
5. **Input Validation**: Express-validator with sanitization
6. **CORS Protection**: Configurable origin restrictions
7. **Helmet.js**: Security headers
8. **Content Security Policy**: XSS protection

### Data Protection

- **Encryption at Rest**: MongoDB encryption, S3 server-side encryption
- **Encryption in Transit**: TLS for all communications
- **Password Security**: bcrypt with configurable rounds
- **PII Protection**: Data anonymization and retention policies
- **Audit Logging**: Comprehensive activity tracking

## 🌍 Global Expansion Architecture

### Multi-Region Support

```mermaid
graph TB
    subgraph "Region: Nepal"
        NP[API: np.halobuzz.com]
        NP_DB[(MongoDB Nepal)]
        NP_RD[(Redis Nepal)]
    end
    
    subgraph "Region: India"
        IN[API: in.halobuzz.com]
        IN_DB[(MongoDB India)]
        IN_RD[(Redis India)]
    end
    
    subgraph "Region: Global"
        GL[API: api.halobuzz.com]
        GL_DB[(MongoDB Global)]
        GL_RD[(Redis Global)]
    end
    
    CDN[CloudFlare CDN] --> NP
    CDN --> IN
    CDN --> GL
```

**Regional Features**:
- **Currency Support**: NPR, INR, BDT, PKR, LKR, THB, VND, AED, USD
- **Payment Methods**: eSewa, Khalti, Paytm, PhonePe, bKash, Nagad
- **Localization**: 5+ languages with cultural adaptation
- **Timezone Support**: Regional timezone handling
- **Content Moderation**: Region-specific guidelines

## 📈 Scalability Architecture

### Horizontal Scaling

```mermaid
graph TB
    subgraph "Load Balancer"
        LB[Nginx]
    end
    
    subgraph "API Instances"
        API1[Backend Instance 1]
        API2[Backend Instance 2]
        API3[Backend Instance 3]
    end
    
    subgraph "Database Cluster"
        DB1[(MongoDB Primary)]
        DB2[(MongoDB Secondary)]
        DB3[(MongoDB Secondary)]
    end
    
    subgraph "Cache Cluster"
        RD1[(Redis Master)]
        RD2[(Redis Replica)]
        RD3[(Redis Replica)]
    end
    
    LB --> API1
    LB --> API2
    LB --> API3
    
    API1 --> DB1
    API2 --> DB1
    API3 --> DB1
    
    API1 --> RD1
    API2 --> RD1
    API3 --> RD1
```

**Scaling Strategies**:
- **Stateless Services**: All API instances are stateless
- **Database Sharding**: User-based sharding strategy
- **Cache Distribution**: Redis Cluster for high availability
- **CDN Integration**: CloudFlare for global content delivery
- **Auto-scaling**: Kubernetes HPA based on CPU/memory metrics

## 🔍 Monitoring & Observability

### Metrics Collection

```mermaid
graph LR
    A[Application] --> B[Prometheus]
    B --> C[Grafana]
    B --> D[AlertManager]
    
    E[Logs] --> F[Elasticsearch]
    F --> G[Kibana]
    
    H[Traces] --> I[Jaeger]
```

**Monitoring Stack**:
- **Metrics**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Tracing**: Jaeger for distributed tracing
- **Alerting**: AlertManager with Slack/email notifications
- **Health Checks**: Kubernetes liveness and readiness probes

**Key Metrics**:
- **Application**: Request rate, response time, error rate
- **Infrastructure**: CPU, memory, disk, network
- **Business**: User registrations, stream starts, payments
- **Security**: Failed logins, suspicious activity, rate limit hits

## 🚀 Deployment Architecture

### Production Environment

```mermaid
graph TB
    subgraph "Kubernetes Cluster"
        subgraph "Namespace: halobuzz-prod"
            API[Backend Pods]
            AI[AI Engine Pods]
            WS[WebSocket Pods]
        end
        
        subgraph "Namespace: halobuzz-data"
            DB[(MongoDB StatefulSet)]
            RD[(Redis StatefulSet)]
        end
        
        subgraph "Namespace: halobuzz-monitoring"
            PROM[Prometheus]
            GRAF[Grafana]
        end
    end
    
    subgraph "External Services"
        S3[AWS S3]
        CF[CloudFlare]
    end
    
    CF --> API
    API --> DB
    API --> RD
    API --> S3
```

**Deployment Strategy**:
- **Container Orchestration**: Kubernetes
- **CI/CD**: GitHub Actions with automated testing
- **Infrastructure as Code**: Terraform for cloud resources
- **Secrets Management**: Kubernetes secrets with external vault
- **Backup Strategy**: Automated MongoDB backups to S3
- **Disaster Recovery**: Multi-region deployment with failover

## 🔧 Configuration Management

### Environment Configuration

**Configuration Hierarchy**:
1. **Default Values**: Hardcoded safe defaults
2. **Environment Variables**: Runtime configuration
3. **Config Files**: YAML/JSON configuration files
4. **Secrets Vault**: Encrypted secrets management
5. **Feature Flags**: Runtime feature toggles

**Configuration Validation**:
- **Startup Validation**: All required configs validated on startup
- **Type Safety**: TypeScript interfaces for all configurations
- **Secret Masking**: Sensitive data never logged
- **Environment Separation**: Dev/staging/production isolation

## 📋 API Design

### RESTful API Structure

```
/api/v1/
├── auth/              # Authentication endpoints
├── users/             # User management
├── streams/           # Live streaming
├── chat/              # Real-time chat
├── payments/          # Payment processing
├── gifts/             # Virtual gifts
├── moderation/        # Content moderation
├── analytics/         # Analytics and reporting
├── search/            # Global search
├── creator-economy/   # Creator monetization
├── global-expansion/  # Regional features
└── monitoring/        # Health and metrics
```

### WebSocket Events

```typescript
// Client to Server Events
'join_stream' | 'leave_stream' | 'send_message' | 'send_gift' | 'like_stream'

// Server to Client Events
'stream_started' | 'stream_ended' | 'new_message' | 'gift_received' | 'viewer_count_changed'
```

## 🎯 Performance Optimization

### Caching Strategy

- **API Response Cache**: 30-minute TTL for read-heavy endpoints
- **Database Query Cache**: Redis for expensive aggregations
- **CDN Caching**: Static assets cached globally
- **Browser Caching**: Optimized cache headers

### Database Optimization

- **Indexing Strategy**: Compound indexes for common queries
- **Query Optimization**: Aggregation pipelines for analytics
- **Connection Pooling**: Mongoose connection management
- **Read Replicas**: Separate read/write operations

### Real-time Optimization

- **WebSocket Scaling**: Redis adapter for multi-instance scaling
- **Message Batching**: Batch similar events to reduce overhead
- **Connection Management**: Automatic cleanup of stale connections
- **Rate Limiting**: Per-connection message limits

## 🔄 Backup & Recovery

### Backup Strategy

```mermaid
graph LR
    A[MongoDB] --> B[Daily Backup]
    B --> C[AWS S3]
    C --> D[Cross-Region Replication]
    
    E[Application Data] --> F[Snapshot]
    F --> G[Version Control]
```

**Backup Schedule**:
- **Database**: Daily automated backups with 30-day retention
- **File Storage**: S3 versioning with lifecycle policies
- **Configuration**: Git-based version control
- **Disaster Recovery**: Multi-region backup replication

## 📊 Business Intelligence

### Analytics Architecture

```mermaid
graph TB
    A[Application Events] --> B[Event Stream]
    B --> C[Data Processing]
    C --> D[Analytics Database]
    D --> E[Dashboards]
    D --> F[Reports]
```

**Analytics Features**:
- **Real-time Metrics**: Live user activity and engagement
- **Business Metrics**: Revenue, user growth, content performance
- **Predictive Analytics**: User behavior and content recommendations
- **Custom Dashboards**: Configurable analytics for different roles

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x
- MongoDB 7.x
- Redis 7.x
- Docker & Docker Compose
- AWS CLI (for S3)

### Quick Start

```bash
# Clone repository
git clone https://github.com/halobuzz/halobuzz-platform.git
cd halobuzz-platform

# Setup environment
make setup

# Start development
make up

# Run tests
make test

# Build for production
make build
```

### Production Deployment

```bash
# Deploy to production
make deploy-prod

# Monitor services
make monitor

# Check health
make health
```

---

This architecture document provides a comprehensive overview of the HaloBuzz platform's design, implementation, and operational considerations. For detailed implementation guides, refer to the individual service documentation and runbooks.

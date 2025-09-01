# HaloBuzz Operations Documentation

## 1. Infrastructure Overview

### 1.1 System Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │   Admin Panel   │    │   AI Engine     │
│   (React Native)│    │   (Next.js)     │    │   (Node.js)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Backend API   │
                    │   (Node.js)     │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Database      │
                    │   (MongoDB)     │
                    └─────────────────┘
```

### 1.2 Service Ports
- **Backend API**: 5010
- **AI Engine**: 5020
- **Admin Panel**: 3000
- **Mobile App**: Expo development server

### 1.3 Environment Configuration
- **Development**: Local Docker Compose
- **Staging**: Cloud deployment with staging database
- **Production**: Multi-region deployment with load balancing

## 2. Deployment Process

### 2.1 Docker Deployment
```bash
# Build and start services
docker compose build --no-cache
docker compose up -d

# Check service health
docker compose ps
docker compose logs backend
docker compose logs ai-engine

# Verify health endpoints
curl http://localhost:5010/healthz
curl http://localhost:5020/healthz
```

### 2.2 Database Seeding
```bash
# Seed initial data
docker compose exec backend node dist/scripts/seeds/index.js

# Verify seeding
docker compose exec backend node -e "
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/halobuzz');
console.log('Database connected');
"
```

### 2.3 Smoke Testing
```bash
# Run smoke tests
AI_ENGINE_SECRET=<secret> npm run smoke

# Windows PowerShell
$env:AI_ENGINE_SECRET="<secret>"; npm run smoke
```

## 3. Monitoring and Logging

### 3.1 Health Checks
- **Backend**: `GET /healthz` - Returns 200 OK when healthy
- **AI Engine**: `GET /healthz` - Returns 200 OK when healthy
- **Database**: MongoDB connection status
- **Redis**: Cache connection status

### 3.2 Logging Configuration
```javascript
// Winston logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console()
  ]
});
```

### 3.3 Key Metrics to Monitor
- **API Response Times**: < 200ms for 95th percentile
- **Database Query Performance**: < 100ms for 95th percentile
- **AI Engine Processing**: < 500ms for content moderation
- **Stream Quality**: Bitrate and latency metrics
- **Error Rates**: < 1% for all endpoints
- **Memory Usage**: < 80% of allocated resources
- **CPU Usage**: < 70% under normal load

## 4. Security Operations

### 4.1 Authentication & Authorization
- **JWT Tokens**: 24-hour expiration with refresh mechanism
- **API Rate Limiting**: 100 requests per minute per IP
- **Admin Access**: Role-based permissions with audit logging
- **Session Management**: Secure session storage with Redis

### 4.2 Data Protection
- **Encryption**: AES-256 for sensitive data at rest
- **HTTPS**: TLS 1.3 for all communications
- **Input Validation**: Comprehensive sanitization and validation
- **SQL Injection Prevention**: Parameterized queries and ORM usage

### 4.3 Content Moderation
- **AI-Powered Detection**: Real-time NSFW and inappropriate content filtering
- **Human Review**: Escalation for complex moderation decisions
- **User Reporting**: Community-driven content flagging
- **Appeal Process**: Transparent moderation action appeals

## 5. Payment Processing

### 5.1 Payment Providers
- **eSewa**: Primary payment method for Nepal
- **Khalti**: Secondary payment method for Nepal
- **Stripe**: International payment processing
- **Webhook Security**: HMAC signature verification

### 5.2 Transaction Monitoring
- **Idempotency**: Unique transaction IDs to prevent duplicates
- **Fraud Detection**: Real-time transaction analysis
- **Refund Processing**: Automated refund handling
- **Audit Trail**: Complete transaction logging

### 5.3 Virtual Economy
- **Coin Pricing**: NPR 10 = 500 coins baseline
- **OG Tiers**: 5-level subscription system
- **Daily Bonuses**: Automated coin distribution
- **Gift Transactions**: Virtual gift purchase and sending

## 6. Database Operations

### 6.1 MongoDB Configuration
```javascript
// Connection configuration
const mongoConfig = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/halobuzz',
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  }
};
```

### 6.2 Indexing Strategy
```javascript
// Key indexes for performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ phone: 1 }, { unique: true });
db.streams.createIndex({ userId: 1, createdAt: -1 });
db.gifts.createIndex({ streamId: 1, createdAt: -1 });
db.chat.createIndex({ streamId: 1, createdAt: -1 });
db.webhook_events.createIndex({ eventId: 1 }, { unique: true });
```

### 6.3 Backup Strategy
- **Daily Backups**: Automated MongoDB backups
- **Point-in-Time Recovery**: Continuous backup with 30-day retention
- **Cross-Region Replication**: Disaster recovery setup
- **Backup Testing**: Monthly restore testing

## 7. AI Engine Operations

### 7.1 Content Moderation Pipeline
```javascript
// Moderation workflow
const moderationPipeline = {
  1: 'Content Upload/Stream',
  2: 'AI Analysis (NSFW, Profanity, Age)',
  3: 'Confidence Scoring',
  4: 'Human Review (if needed)',
  5: 'Action (Allow/Flag/Remove)',
  6: 'User Notification'
};
```

### 7.2 AI Model Management
- **Model Updates**: Monthly model retraining
- **Performance Monitoring**: Accuracy and response time tracking
- **A/B Testing**: New model validation
- **Fallback Mechanisms**: Human review for AI failures

### 7.3 Engagement Analysis
- **Boredom Detection**: Real-time engagement monitoring
- **Content Recommendations**: Personalized content suggestions
- **User Behavior Analysis**: Pattern recognition for safety
- **Performance Metrics**: Engagement rate improvements

## 8. Cron Jobs and Scheduled Tasks

### 8.1 Daily Tasks
```javascript
// Daily cron jobs
const dailyTasks = {
  '0 0 * * *': 'OG Daily Bonus Distribution',
  '0 1 * * *': 'Festival Activation Check',
  '0 2 * * *': 'Throne Expiry Processing',
  '0 3 * * *': 'Database Cleanup',
  '0 4 * * *': 'Analytics Report Generation'
};
```

### 8.2 Timezone Configuration
- **Primary Timezone**: Australia/Sydney
- **Backup Timezone**: UTC
- **User Timezones**: Automatic detection and conversion
- **Cron Scheduling**: Timezone-aware job execution

## 9. Error Handling and Recovery

### 9.1 Error Classification
- **Critical**: Service unavailable, data corruption
- **High**: Payment failures, authentication issues
- **Medium**: API errors, performance degradation
- **Low**: UI issues, non-critical features

### 9.2 Recovery Procedures
```bash
# Service restart
docker compose restart backend
docker compose restart ai-engine

# Database recovery
mongorestore --db halobuzz /backup/halobuzz-$(date +%Y%m%d)

# Cache clearing
redis-cli FLUSHALL

# Log analysis
docker compose logs --tail=100 backend | grep ERROR
```

### 9.3 Incident Response
1. **Detection**: Automated monitoring alerts
2. **Assessment**: Impact and severity evaluation
3. **Response**: Immediate mitigation actions
4. **Recovery**: Service restoration
5. **Post-Mortem**: Root cause analysis and prevention

## 10. Performance Optimization

### 10.1 Caching Strategy
- **Redis**: Session storage and frequently accessed data
- **CDN**: Static assets and media files
- **Database**: Query result caching
- **Application**: In-memory caching for hot data

### 10.2 Database Optimization
- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Index usage and query analysis
- **Data Archiving**: Historical data management
- **Sharding**: Horizontal scaling for large datasets

### 10.3 API Optimization
- **Response Compression**: Gzip compression for API responses
- **Pagination**: Efficient data retrieval
- **Rate Limiting**: API abuse prevention
- **Caching Headers**: Browser and CDN caching

## 11. Compliance and Auditing

### 11.1 Data Privacy Compliance
- **GDPR**: European data protection compliance
- **CCPA**: California privacy law compliance
- **Local Laws**: Nepal and regional regulations
- **Data Retention**: Automated data lifecycle management

### 11.2 Audit Logging
```javascript
// Audit log structure
const auditLog = {
  timestamp: new Date(),
  userId: 'user_id',
  action: 'action_type',
  resource: 'resource_id',
  ipAddress: 'client_ip',
  userAgent: 'client_user_agent',
  result: 'success|failure',
  details: 'additional_info'
};
```

### 11.3 Security Auditing
- **Access Logs**: User authentication and authorization
- **API Logs**: Request/response logging
- **Payment Logs**: Transaction audit trail
- **Moderation Logs**: Content moderation decisions

## 12. Disaster Recovery

### 12.1 Backup and Recovery
- **Database Backups**: Daily automated backups
- **Code Repositories**: Git-based version control
- **Configuration**: Environment-specific configs
- **Media Files**: S3-compatible storage with replication

### 12.2 Business Continuity
- **Multi-Region Deployment**: Geographic redundancy
- **Load Balancing**: Traffic distribution
- **Failover Mechanisms**: Automatic service switching
- **Recovery Time Objective**: < 4 hours
- **Recovery Point Objective**: < 1 hour

### 12.3 Communication Plan
- **Status Page**: Public service status updates
- **User Notifications**: In-app and email notifications
- **Team Communication**: Slack/Teams alerts
- **Escalation Procedures**: On-call rotation and escalation

## 13. Scaling and Growth

### 13.1 Horizontal Scaling
- **Load Balancers**: Multiple backend instances
- **Database Sharding**: Distributed data storage
- **CDN Expansion**: Global content delivery
- **Microservices**: Service decomposition

### 13.2 Performance Monitoring
- **APM Tools**: Application performance monitoring
- **Infrastructure Monitoring**: Server and network metrics
- **User Experience**: Real user monitoring
- **Business Metrics**: User engagement and revenue

### 13.3 Capacity Planning
- **Resource Monitoring**: CPU, memory, storage usage
- **Growth Projections**: User and data growth estimates
- **Infrastructure Scaling**: Proactive resource allocation
- **Cost Optimization**: Efficient resource utilization

---

**Last Updated**: September 1, 2025  
**Version**: 0.1.0  
**Maintained By**: HaloBuzz Operations Team

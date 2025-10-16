# HaloBuzz Backend API

A production-ready Node.js backend for the HaloBuzz platform, featuring real-time gaming, live streaming, gift economy, and comprehensive admin management.

## 🚀 Features

### Core Features
- **Real-time Gaming Platform** - Multiplayer games with AI opponents
- **Live Streaming** - WebSocket-based live streaming with real-time interactions
- **Gift Economy** - Advanced gift system with dynamic pricing and multipliers
- **User Management** - Complete user lifecycle with KYC, trust scores, and reputation
- **Admin Dashboard** - Comprehensive admin tools with audit logging
- **GDPR Compliance** - Data export and deletion capabilities

### Technical Features
- **Real-time Notifications** - MongoDB Change Streams + WebSocket integration
- **Performance Optimization** - In-memory caching, database indexing, .lean() queries
- **Security** - JWT authentication, RBAC, rate limiting, input validation
- **Monitoring** - Comprehensive metrics, health checks, error tracking
- **Testing** - Unit tests, E2E tests, performance tests
- **Data Management** - Seed scripts, migration utilities, backup systems

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB 5.0+
- Redis 6.0+
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/halobuzz-backend.git
   cd halobuzz-backend/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Configure your environment variables:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/halobuzz
   REDIS_URL=redis://localhost:6379
   
   # Security
   JWT_SECRET=your-super-secret-jwt-key
   
   # Server
   PORT=3000
   NODE_ENV=development
   
   # CORS
   CORS_ALLOW=http://localhost:3000,http://localhost:3001
   ```

4. **Database Setup**
   ```bash
   # Run migrations
   npm run migrate migrate
   
   # Seed development data
   npm run seed
   ```

5. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm run build
   npm start
   ```

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication
All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

### Core Endpoints

#### Users
- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update user profile
- `POST /users/kyc` - Submit KYC documents
- `GET /users/stats` - Get user statistics

#### Gifts
- `GET /gifts/packages` - Get available gift packages
- `POST /gifts/send` - Send a gift
- `GET /gifts/sent` - Get sent gifts
- `GET /gifts/received` - Get received gifts
- `GET /gifts/:id` - Get gift details

#### Live Streaming
- `POST /streams/start` - Start a live stream
- `POST /streams/end` - End a live stream
- `GET /streams/live` - Get active streams
- `GET /streams/:id` - Get stream details

#### Games
- `GET /games/available` - Get available games
- `POST /games/start` - Start a game session
- `POST /games/end` - End a game session
- `GET /games/sessions` - Get game sessions

#### Admin (Requires admin role)
- `GET /admin/users` - List users
- `GET /admin/users/:id/export` - Export user data (GDPR)
- `DELETE /admin/users/:id/delete` - Delete user data (GDPR)
- `GET /admin/analytics/dashboard` - Get analytics dashboard
- `GET /admin/system/metrics` - Get system metrics

### WebSocket Events

#### Connection
```javascript
const socket = io('http://localhost:3000/live', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

#### Events
- `gift:received` - Gift received notification
- `stream:started` - Stream started notification
- `user:status_change` - User online/offline status
- `notification:new` - New notification

## 🧪 Testing

### Run Tests
```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# E2E tests only
npm run test:e2e

# Coverage report
npm run test:coverage
```

### Test Structure
```
src/__tests__/
├── unit/           # Unit tests
├── e2e/           # End-to-end tests
├── integration/   # Integration tests
└── security/      # Security tests
```

## 🔧 Development

### Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
npm run seed         # Seed database
npm run migrate      # Run migrations
```

### Code Structure
```
src/
├── config/         # Configuration files
├── middleware/     # Express middleware
├── models/         # Mongoose models
├── routes/         # API routes
├── services/       # Business logic
├── utils/          # Utility functions
└── __tests__/      # Test files
```

### Key Services
- **AdvancedGiftEconomyService** - Gift economy management
- **ChangeStreamService** - Real-time database monitoring
- **RealtimeNotificationService** - WebSocket notifications
- **AIGameOrchestrationService** - Game AI and balancing
- **FortressSecuritySystem** - Security monitoring

## 📊 Monitoring

### Health Checks
- `GET /healthz` - Basic health check
- `GET /api/v1/monitoring/health` - Detailed health status
- `GET /api/v1/monitoring/system/metrics` - System metrics
- `GET /api/v1/monitoring/database/health` - Database health
- `GET /api/v1/monitoring/redis/health` - Redis health

### Metrics
- Memory usage and CPU utilization
- Database connection status and performance
- Redis cache hit rates
- Change stream lag monitoring
- Application metrics (users, gifts, streams)

## 🔒 Security

### Features
- JWT-based authentication
- Role-based access control (RBAC)
- Rate limiting (100 req/min global)
- Input validation and sanitization
- CORS protection
- Security headers (Helmet)
- Audit logging for admin actions

### Roles
- `user` - Regular user
- `moderator` - Content moderation
- `admin` - Administrative access
- `super_admin` - Full system access

## 🌍 GDPR Compliance

### Data Export
```bash
GET /api/v1/admin/users/:id/export
```
Returns complete user data package including:
- Personal information
- Activity data (gifts, streams, games)
- System data (audit logs, statistics)

### Data Deletion
```bash
DELETE /api/v1/admin/users/:id/delete
```
- Permanently deletes user account
- Anonymizes related records
- Maintains audit trail
- Requires confirmation

## 🚀 Deployment

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Performance indexes created
- [ ] SSL certificates installed
- [ ] Monitoring configured
- [ ] Backup strategy implemented

### Docker Deployment
```bash
# Build image
docker build -t halobuzz-backend .

# Run with docker-compose
docker-compose up -d
```

### Environment Variables (Production)
```env
NODE_ENV=production
MONGODB_URI=mongodb://your-mongo-cluster/halobuzz
REDIS_URL=redis://your-redis-cluster:6379
JWT_SECRET=your-production-jwt-secret
PORT=3000
CORS_ALLOW=https://your-frontend-domain.com
```

## 📈 Performance Optimization

### Database
- Compound indexes on frequently queried fields
- `.lean()` queries for read-only operations
- Connection pooling
- Query optimization

### Caching
- Redis for session storage
- In-memory caching for frequently accessed data
- Cache invalidation strategies

### Real-time Features
- MongoDB Change Streams for live updates
- WebSocket connection management
- Event-driven architecture

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check MongoDB URI
   - Verify network connectivity
   - Check authentication credentials

2. **Redis Connection Failed**
   - Check Redis URL
   - Verify Redis server is running
   - Check firewall settings

3. **JWT Token Invalid**
   - Verify JWT_SECRET is set
   - Check token expiration
   - Ensure proper token format

4. **WebSocket Connection Failed**
   - Check CORS settings
   - Verify authentication token
   - Check firewall/load balancer config

### Debug Mode
```bash
DEBUG=halobuzz:* npm run dev
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

### Code Standards
- Follow ESLint configuration
- Use TypeScript strict mode
- Write comprehensive tests
- Document new features
- Follow existing code patterns

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the API documentation
- Contact the development team

---

**Built with ❤️ for the HaloBuzz community**

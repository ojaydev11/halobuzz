# HaloBuzz Production Command Cheatsheet

## 🚀 Quick Start Commands

### Environment Setup
```bash
# Clone and setup
git clone https://github.com/halobuzz/halobuzz-platform.git
cd halobuzz-platform

# Install dependencies
npm install
cd backend && npm install
cd ../apps/halobuzz-mobile && npm install
cd ../admin && npm install
cd ../ai-engine && npm install
```

### Development Mode
```bash
# Start all services
npm run dev:backend    # Backend API on port 4000
npm run dev:ai         # AI Engine on port 5020
npm run dev:mobile     # Mobile app (Expo)
npm run dev:admin      # Admin panel on port 3000
```

## 🔧 Build Commands

### Backend Build
```bash
cd backend
npm run build          # Build TypeScript
npm run start          # Start production server
npm run test           # Run all tests
npm run test:coverage  # Run tests with coverage
npm run lint           # Run ESLint
npm run type-check     # TypeScript type checking
```

### Mobile App Build
```bash
cd apps/halobuzz-mobile
npm run build:ios      # Build iOS app
npm run build:android  # Build Android app
npm run test           # Run tests
npm run typecheck      # TypeScript checking
npm run analyze:bundle # Analyze bundle size
```

### Admin Panel Build
```bash
cd admin
npm run build          # Build Next.js app
npm run start          # Start production server
npm run lint           # Run ESLint
```

## 🧪 Testing Commands

### Backend Testing
```bash
cd backend
npm run test:unit      # Unit tests only
npm run test:integration # Integration tests
npm run test:e2e       # End-to-end tests
npm run test:security  # Security tests
npm run test:load      # Load testing
npm run test:coverage  # Coverage report
```

### Mobile Testing
```bash
cd apps/halobuzz-mobile
npm run test           # Jest tests
npm run test:coverage  # Coverage report
npm run test:performance # Performance tests
```

### Load Testing
```bash
cd backend
npm run test:load:basic    # Basic load test
npm run test:load:stress   # Stress test
npm run test:smoke         # Smoke test
```

## 🗄️ Database Commands

### MongoDB Operations
```bash
# Connect to MongoDB
mongosh "mongodb+srv://user:pass@cluster.mongodb.net/halobuzz"

# Add indexes
node scripts/add-indexes.js

# Run migrations
node scripts/migrate.js

# Backup database
npm run backup:create

# Restore database
npm run backup:restore
```

### Redis Operations
```bash
# Connect to Redis
redis-cli

# Check Redis health
redis-cli ping

# Clear cache
redis-cli FLUSHALL
```

## 🔒 Security Commands

### Security Audit
```bash
# Backend security
cd backend
npm audit
npm audit fix
npm run security:check

# Mobile security
cd apps/halobuzz-mobile
npm audit
npm audit fix
```

### Security Testing
```bash
# Run security tests
npm run test:security

# Check for vulnerabilities
npm run audit

# Security scan
npm run test:security:lint
```

## 📱 Mobile App Commands

### Expo Development
```bash
cd apps/halobuzz-mobile
npx expo start          # Start development server
npx expo start --tunnel # Start with tunnel
npx expo start --web    # Start web version
```

### EAS Build
```bash
# Build for development
npx eas build -p ios --profile development
npx eas build -p android --profile development

# Build for preview
npx eas build -p ios --profile preview
npx eas build -p android --profile preview

# Build for production
npx eas build -p ios --profile production
npx eas build -p android --profile production
```

### App Store Submission
```bash
# Submit to App Store
npx eas submit -p ios

# Submit to Google Play
npx eas submit -p android
```

## 🚀 Deployment Commands

### Staging Deployment
```bash
# Deploy to staging
npm run deploy:staging

# Test staging
npm run test:smoke:staging
```

### Production Deployment
```bash
# Deploy to production
npm run deploy:production

# Test production
npm run test:smoke:production
```

### Docker Commands
```bash
# Build Docker images
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📊 Monitoring Commands

### Health Checks
```bash
# Backend health
curl -f http://localhost:4000/healthz

# AI Engine health
curl -f http://localhost:5020/healthz

# Admin health
curl -f http://localhost:3000/api/health

# Database health
npm run monitoring:health
```

### Performance Monitoring
```bash
# Check performance
npm run perf:baseline
npm run perf:compare
npm run perf:budgets

# Memory usage
npm run test:memory

# Startup time
npm run test:startup
```

## 🔧 Maintenance Commands

### Cleanup Operations
```bash
# Clear caches
npm run clear:cache

# Clean builds
npm run clean

# Reset database
npm run db:reset

# Clear logs
npm run logs:clear
```

### Backup Operations
```bash
# Create backup
npm run backup:create

# Restore backup
npm run backup:restore

# List backups
npm run backup:list
```

## 🐛 Debugging Commands

### Debug Mode
```bash
# Backend debug
cd backend
DEBUG=* npm run dev

# Mobile debug
cd apps/halobuzz-mobile
npx expo start --dev-client
```

### Log Analysis
```bash
# View logs
tail -f logs/app.log
tail -f logs/error.log

# Search logs
grep "ERROR" logs/app.log
grep "WARN" logs/app.log
```

## 📈 Analytics Commands

### Analytics Setup
```bash
# Generate analytics report
npm run analytics:report

# Export analytics data
npm run analytics:export

# Clear analytics cache
npm run analytics:clear
```

### Business Intelligence
```bash
# Generate business report
npm run business:report

# Run simulations
npm run business:simulate

# Export business data
npm run business:export
```

## 🔄 CI/CD Commands

### GitHub Actions
```bash
# Trigger CI pipeline
git push origin main

# Check CI status
gh run list
gh run view

# Download artifacts
gh run download
```

### Local CI Simulation
```bash
# Run full CI pipeline locally
npm run ci:local

# Run specific CI steps
npm run ci:test
npm run ci:build
npm run ci:deploy
```

## 🛠️ Development Tools

### Code Quality
```bash
# Format code
npm run format

# Lint all projects
npm run lint:all

# Type check all projects
npm run typecheck:all

# Fix linting issues
npm run lint:fix
```

### Bundle Analysis
```bash
# Analyze bundle size
npm run analyze:bundle

# Optimize bundle
npm run optimize:bundle

# Check bundle budgets
npm run perf:budgets
```

## 📋 Environment Management

### Environment Variables
```bash
# Check environment
npm run env:check

# Validate environment
npm run env:validate

# Generate .env files
npm run env:generate
```

### Configuration
```bash
# Update configuration
npm run config:update

# Validate configuration
npm run config:validate

# Reset configuration
npm run config:reset
```

## 🚨 Emergency Commands

### Emergency Procedures
```bash
# Emergency rollback
npm run rollback:emergency

# Emergency shutdown
npm run emergency:shutdown

# Emergency backup
npm run emergency:backup

# Emergency restore
npm run emergency:restore
```

### Incident Response
```bash
# Start incident response
npm run incident:start

# End incident response
npm run incident:end

# Generate incident report
npm run incident:report
```

## 📚 Documentation Commands

### Generate Documentation
```bash
# Generate API docs
npm run docs:api

# Generate code docs
npm run docs:code

# Generate deployment docs
npm run docs:deploy
```

### Update Documentation
```bash
# Update README
npm run docs:update

# Validate documentation
npm run docs:validate

# Deploy documentation
npm run docs:deploy
```

---

## 🎯 Quick Reference

### Most Used Commands
```bash
# Development
npm run dev:backend
npm run dev:mobile

# Testing
npm run test
npm run test:coverage

# Building
npm run build
npm run build:ios
npm run build:android

# Deployment
npm run deploy:staging
npm run deploy:production

# Monitoring
npm run monitoring:health
npm run logs:view
```

### Troubleshooting
```bash
# Clear everything and restart
npm run clean && npm install && npm run dev:backend

# Check all services
npm run health:check

# View all logs
npm run logs:all

# Reset everything
npm run reset:all
```

---

*Keep this cheatsheet handy for quick reference during development and deployment.*

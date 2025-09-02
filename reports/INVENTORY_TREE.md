# HaloBuzz Codebase Inventory Tree

## Executive Summary
- **Monorepo Structure**: 4 workspaces (backend, ai-engine, mobile, admin)
- **Package Manager**: pnpm (lockfiles present in all workspaces)
- **Node Version**: v22.18.0 (⚠️ mismatch with engines: 20.x - .nvmrc created)
- **TypeScript**: 5 workspaces with tsconfig.json
- **Testing**: Jest in backend & ai-engine
- **Build Status**: Backend has dist/ folder (transpiled)

## Root Level Structure
```
halobuzz/
├── 📦 package.json (monorepo root, pnpm workspaces)
├── 🐳 docker-compose.yml (multi-service orchestration)
├── 📋 .nvmrc (Node 20 - created for version alignment)
├── 📚 docs/ (architecture, deployment, security guides)
├── 🔧 scripts/ (smoke tests, security tests)
├── 📊 reports/ (audit reports, build errors)
└── 🌍 env.*.example (environment templates)
```

## Workspace Breakdown

### 🔧 Backend (`backend/`)
**Purpose**: Core API, real-time services, business logic
- **Size**: ~42 services, 26 routes, 14 models, 7 middleware
- **Key Files**:
  - `src/index.ts` - Main server entry
  - `src/config/` - Database, Redis, Socket, Logger configs
  - `src/models/` - MongoDB schemas (User, Stream, Gift, etc.)
  - `src/routes/` - Express routes (auth, streams, payments, etc.)
  - `src/services/` - Business logic services
  - `src/middleware/` - Auth, security, rate limiting
  - `src/cron/` - Scheduled jobs (OG bonus, throne expiry)
  - `scripts/seeds/` - Database seeding scripts
- **Build**: ✅ Has dist/ folder (transpiled)
- **Testing**: ✅ Jest with 19 test files (security-focused)

### 🤖 AI Engine (`ai-engine/`)
**Purpose**: AI services, moderation, engagement, recommendations
- **Size**: ~15 services, 12 routes, 1 model
- **Key Files**:
  - `src/index.ts` - AI service entry
  - `src/routes/` - AI endpoints (moderation, engagement, etc.)
  - `src/services/` - AI business logic
  - `src/middleware/` - AI auth & security
  - `src/components/` - AI feature components
- **Build**: ❌ No dist/ folder
- **Testing**: ✅ Jest with security tests

### 📱 Mobile (`mobile/`)
**Purpose**: React Native app for users
- **Size**: 24 screens, 7 navigation files, 12 Redux slices
- **Key Files**:
  - `App.tsx` - Main app entry
  - `src/navigation/` - Tab & stack navigators
  - `src/screens/` - UI screens (live, games, profile, etc.)
  - `src/store/` - Redux state management
  - `src/services/` - API & socket services
- **Build**: ❌ No build artifacts
- **Testing**: ✅ Jest with 1 test file

### 🖥️ Admin (`admin/`)
**Purpose**: Next.js admin dashboard
- **Size**: 7 dashboard pages, 11 API routes
- **Key Files**:
  - `pages/` - Next.js pages (dashboard, login)
  - `pages/api/` - Admin API endpoints
  - `lib/` - API client & cookie utilities
  - `components/` - UI components
- **Build**: ❌ No build artifacts
- **Testing**: ❌ No test files

## Configuration Files Inventory

### TypeScript Configs
- `backend/tsconfig.json` ✅
- `ai-engine/tsconfig.json` ✅
- `mobile/tsconfig.json` ✅
- `admin/tsconfig.json` ✅
- `backend/scripts/tsconfig.json` ✅

### Jest Configs
- `backend/jest.config.js` ✅
- `ai-engine/jest.config.js` ✅

### ESLint Configs
- ❌ No .eslintrc files found (likely using package.json configs)

### Docker & Deployment
- `backend/Dockerfile` ✅
- `ai-engine/Dockerfile` ✅
- `docker-compose.yml` ✅
- `admin/vercel.json` ✅

## Key Directories by Purpose

### 🗄️ Data Layer
- `backend/src/models/` - MongoDB schemas
- `backend/scripts/seeds/` - Database seeding
- `ai-engine/src/models/` - AI data types

### 🛣️ API Layer
- `backend/src/routes/` - REST endpoints
- `backend/src/middleware/` - Request processing
- `admin/pages/api/` - Admin API routes

### 🔄 Real-time Layer
- `backend/src/config/socket.ts` - Socket.IO config
- `mobile/src/services/socketService.ts` - Client socket

### ⏰ Scheduled Tasks
- `backend/src/cron/` - Cron jobs
- `backend/src/services/CronSecurityService.ts` - Security monitoring

### 🧪 Testing
- `backend/src/__tests__/` - Backend tests (19 files)
- `ai-engine/src/__tests__/` - AI tests (1 file)
- `mobile/src/__tests__/` - Mobile tests (1 file)

### 📚 Documentation
- `docs/` - Architecture, deployment, security
- `reports/` - Audit reports, build errors
- `README.md` files in each workspace

### 🔧 Scripts & Automation
- `scripts/` - Smoke tests, security tests
- `backend/scripts/` - Load tests, backup scripts

## File Size Indicators
- **Backend**: Largest codebase (~100+ files in src/)
- **Mobile**: Medium size (~50+ files in src/)
- **AI Engine**: Medium size (~40+ files in src/)
- **Admin**: Smallest (~20+ files)

## Missing/Incomplete Areas
- ❌ ESLint config files (using package.json)
- ❌ Build artifacts in ai-engine, mobile, admin
- ❌ Admin test files
- ❌ Mobile build configuration
- ⚠️ Node version mismatch (v22 vs v20)

## Next Steps for Inventory
1. Run build commands to generate missing dist/ folders
2. Check for missing configuration files
3. Validate all workspace dependencies
4. Review test coverage gaps


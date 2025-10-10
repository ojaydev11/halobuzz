# HaloBuzz Admin Dashboard - Implementation Plan

## Architecture Overview

**Framework:** Next.js 14 (App Router)
**UI:** shadcn/ui + Tailwind CSS
**Charts:** Recharts
**State:** React Query (TanStack Query)
**Animations:** Framer Motion
**Testing:** Playwright (E2E)

---

## Route Structure

```
/admin
├── layout.tsx                    # Auth wrapper, nav, RBAC check
├── page.tsx                      # Redirect to /overview
├── overview/
│   └── page.tsx                  # Dashboard home (KPIs)
├── users/
│   ├── page.tsx                  # User table
│   └── [id]/
│       └── page.tsx              # User detail/drill-down
├── economy/
│   ├── page.tsx                  # Ledger, orders, config
│   ├── payouts/
│   │   └── page.tsx              # Payout queue
│   └── config/
│       └── page.tsx              # Coin packs, OG tiers (Super Admin)
├── live/
│   ├── page.tsx                  # Live sessions
│   └── reels/
│       └── page.tsx              # Reels management
├── games/
│   ├── page.tsx                  # Game KPIs
│   └── tournaments/
│       ├── page.tsx              # Tournament list
│       └── [id]/
│           └── page.tsx          # Tournament detail
├── moderation/
│   └── page.tsx                  # Flag queue
├── system/                       # Super Admin only
│   ├── page.tsx                  # Feature flags, kill switches
│   ├── config/
│   │   └── page.tsx              # Rate limits, CORS, JWT
│   └── secrets/
│       └── page.tsx              # Masked secrets, rotation
└── halo-ai/                      # Super Admin only
    └── page.tsx                  # AI console
```

---

## Component Architecture

```
apps/admin/
├── app/
│   ├── admin/                    # Admin routes
│   ├── api/                      # API routes (proxy to backend)
│   │   └── admin/
│   │       ├── users/
│   │       ├── economy/
│   │       ├── live/
│   │       ├── games/
│   │       ├── moderation/
│   │       ├── system/
│   │       └── halo-ai/
│   └── layout.tsx
├── components/
│   ├── admin/
│   │   ├── layout/
│   │   │   ├── AdminNav.tsx     # Sidebar navigation
│   │   │   ├── AdminHeader.tsx  # Top bar with user menu
│   │   │   └── CommandPalette.tsx # ⌘K search
│   │   ├── overview/
│   │   │   ├── KPICard.tsx      # Metric card with trend
│   │   │   ├── RevenueChart.tsx # Revenue over time
│   │   │   ├── SafetyMetrics.tsx
│   │   │   └── InfraMetrics.tsx # Super Admin only
│   │   ├── users/
│   │   │   ├── UserTable.tsx    # Data table
│   │   │   ├── UserActions.tsx  # Ban, KYC, role change
│   │   │   └── UserProfile.tsx  # Drill-down detail
│   │   ├── economy/
│   │   │   ├── LedgerView.tsx   # Double-entry display
│   │   │   ├── OrdersTable.tsx  # IAP + Stripe
│   │   │   ├── PayoutQueue.tsx  # Approve/reject
│   │   │   └── CoinPackConfig.tsx # Super Admin
│   │   ├── live/
│   │   │   ├── LiveSessionsTable.tsx
│   │   │   ├── ReelsGrid.tsx
│   │   │   └── ContentActions.tsx
│   │   ├── games/
│   │   │   ├── GameKPIs.tsx
│   │   │   ├── TournamentTable.tsx
│   │   │   └── TournamentForm.tsx
│   │   ├── moderation/
│   │   │   ├── FlagQueue.tsx
│   │   │   ├── FlagCard.tsx
│   │   │   └── PolicyConfig.tsx # Super Admin
│   │   ├── system/              # Super Admin only
│   │   │   ├── FeatureFlags.tsx
│   │   │   ├── KillSwitches.tsx
│   │   │   ├── RateLimits.tsx
│   │   │   └── SecretsManager.tsx
│   │   └── halo-ai/             # Super Admin only
│   │       ├── AIChat.tsx       # Chat interface
│   │       ├── AIInsightCard.tsx # Risk/anomaly cards
│   │       ├── AIActionButton.tsx # One-click apply
│   │       └── AIExport.tsx     # PDF/Notion
│   ├── ui/                       # shadcn components
│   └── shared/
│       ├── DataTable.tsx         # Reusable table
│       ├── ChartWrapper.tsx      # Skeleton loader
│       └── RBACGate.tsx          # Permission check
├── lib/
│   ├── auth/
│   │   ├── session.ts            # JWT validation
│   │   ├── rbac.ts               # Permission checks
│   │   └── middleware.ts         # Route protection
│   ├── api/
│   │   ├── client.ts             # Axios instance
│   │   └── endpoints.ts          # API definitions
│   └── utils/
│       ├── audit.ts              # Audit logging
│       └── optimistic.ts         # Optimistic updates
├── hooks/
│   ├── useAdmin.ts               # Admin session
│   ├── useRBAC.ts                # Permission hook
│   └── useAuditLog.ts            # Audit logger
└── types/
    ├── admin.ts                  # Admin types
    ├── rbac.ts                   # Permission types
    └── api.ts                    # API response types
```

---

## Backend API Endpoints

### Authentication
```
POST   /api/v1/admin/auth/login
POST   /api/v1/admin/auth/refresh
POST   /api/v1/admin/auth/logout
GET    /api/v1/admin/auth/me
```

### Users & Creators
```
GET    /api/v1/admin/users
GET    /api/v1/admin/users/:id
PUT    /api/v1/admin/users/:id
POST   /api/v1/admin/users/:id/ban
POST   /api/v1/admin/users/:id/unban
POST   /api/v1/admin/users/:id/kyc/approve
POST   /api/v1/admin/users/:id/kyc/reject
POST   /api/v1/admin/users/:id/reset-2fa
GET    /api/v1/admin/users/:id/sessions
GET    /api/v1/admin/users/:id/purchases
GET    /api/v1/admin/users/:id/reports
```

### Economy & Payments
```
GET    /api/v1/admin/economy/ledger
GET    /api/v1/admin/economy/orders
POST   /api/v1/admin/economy/refunds
GET    /api/v1/admin/economy/coin-packs
PUT    /api/v1/admin/economy/coin-packs/:id     # Super Admin
GET    /api/v1/admin/economy/og-tiers
PUT    /api/v1/admin/economy/og-tiers/:id       # Super Admin
GET    /api/v1/admin/economy/payouts
POST   /api/v1/admin/economy/payouts/:id/approve
POST   /api/v1/admin/economy/payouts/:id/reject
GET    /api/v1/admin/economy/export/ledger
```

### Live & Reels
```
GET    /api/v1/admin/live/sessions
POST   /api/v1/admin/live/sessions/:id/force-end
POST   /api/v1/admin/live/sessions/:id/ghost-mute
GET    /api/v1/admin/reels
POST   /api/v1/admin/reels/:id/takedown
GET    /api/v1/admin/reels/:id/nsfw-score
```

### Games & Tournaments
```
GET    /api/v1/admin/games/kpis
GET    /api/v1/admin/tournaments
POST   /api/v1/admin/tournaments
PUT    /api/v1/admin/tournaments/:id
DELETE /api/v1/admin/tournaments/:id
GET    /api/v1/admin/games/anti-fraud/queue
POST   /api/v1/admin/games/players/:id/shadow-ban
GET    /api/v1/admin/games/replays/:id/hash
```

### Moderation & Safety
```
GET    /api/v1/admin/moderation/flags
POST   /api/v1/admin/moderation/flags/:id/resolve
POST   /api/v1/admin/moderation/flags/:id/action
GET    /api/v1/admin/moderation/policies        # Super Admin
PUT    /api/v1/admin/moderation/policies/:id    # Super Admin
GET    /api/v1/admin/moderation/escalations
```

### System & Config (Super Admin)
```
GET    /api/v1/admin/system/status
GET    /api/v1/admin/system/feature-flags
PUT    /api/v1/admin/system/feature-flags/:key
GET    /api/v1/admin/system/rate-limits
PUT    /api/v1/admin/system/rate-limits/:key
GET    /api/v1/admin/system/secrets
POST   /api/v1/admin/system/secrets/:id/rotate
POST   /api/v1/admin/system/maintenance
POST   /api/v1/admin/system/kill-switch
GET    /api/v1/admin/system/backups
```

### Halo-AI Console (Super Admin)
```
POST   /api/v1/admin/halo-ai/query
GET    /api/v1/admin/halo-ai/insights
POST   /api/v1/admin/halo-ai/actions/:id/apply
POST   /api/v1/admin/halo-ai/export
```

### Audit Log
```
GET    /api/v1/admin/audit
GET    /api/v1/admin/audit/:id
```

---

## Data Models

### Admin User
```typescript
interface AdminUser {
  id: string;
  email: string;
  role: 'super_admin' | 'admin';
  scopes: string[];
  name: string;
  avatar?: string;
  createdAt: Date;
  lastLoginAt: Date;
  twoFactorEnabled: boolean;
}
```

### Audit Log Entry
```typescript
interface AuditLogEntry {
  id: string;
  adminId: string;
  adminEmail: string;
  adminRole: 'super_admin' | 'admin';
  action: string;
  resource: string;
  resourceId?: string;
  changes?: {
    before: any;
    after: any;
  };
  metadata?: any;
  ip: string;
  userAgent: string;
  timestamp: Date;
}
```

---

## Implementation Phases

### Phase 1: Foundation (Day 1)
- [x] RBAC matrix documented
- [ ] Setup Next.js admin app structure
- [ ] Install dependencies (shadcn, Recharts, React Query)
- [ ] Create auth middleware
- [ ] Implement JWT validation
- [ ] Build admin layout with nav
- [ ] Create RBAC gate components
- [ ] Setup audit logging utility

### Phase 2: Overview Dashboard (Day 1-2)
- [ ] KPI cards with live data
- [ ] Revenue charts (Recharts)
- [ ] Safety metrics display
- [ ] Infra metrics (Super Admin)
- [ ] Anomaly detection badges
- [ ] 7/30-day trend sparklines
- [ ] Real API integration

### Phase 3: Users & Economy (Day 2-3)
- [ ] User data table with filters
- [ ] User actions (ban, KYC, role change)
- [ ] User profile drill-down
- [ ] Economy ledger view
- [ ] Orders table (IAP + Stripe)
- [ ] Payout queue with approval flow
- [ ] Coin pack config (Super Admin)
- [ ] CSV export functionality

### Phase 4: Live, Games, Moderation (Day 3-4)
- [ ] Live sessions table
- [ ] Force end/ghost mute actions
- [ ] Reels grid with takedown
- [ ] Game KPIs dashboard
- [ ] Tournament CRUD
- [ ] Anti-fraud queue
- [ ] Flag queue with ML scores
- [ ] Moderation actions

### Phase 5: System & Halo-AI (Day 4-5)
- [ ] Feature flags manager
- [ ] Kill switches UI
- [ ] Rate limits config
- [ ] Secrets manager (masked)
- [ ] Halo-AI chat interface
- [ ] AI insight cards
- [ ] AI action buttons
- [ ] PDF/Notion export

### Phase 6: Polish & Testing (Day 5-6)
- [ ] Command palette (⌘K)
- [ ] Saved views for tables
- [ ] Dark/light theme
- [ ] Animations (Framer Motion)
- [ ] Skeleton loaders
- [ ] Error boundaries
- [ ] Toast notifications
- [ ] Accessibility audit
- [ ] E2E tests (Playwright)
- [ ] Performance optimization

---

## Tech Stack Details

### Dependencies
```json
{
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "react-dom": "18.x",
    "typescript": "5.x",
    "@tanstack/react-query": "^5.x",
    "@radix-ui/react-*": "latest",
    "recharts": "^2.x",
    "framer-motion": "^10.x",
    "axios": "^1.x",
    "zod": "^3.x",
    "date-fns": "^3.x",
    "lucide-react": "latest",
    "cmdk": "^0.2.x",
    "tailwindcss": "^3.x",
    "tailwind-merge": "^2.x",
    "class-variance-authority": "^0.7.x"
  },
  "devDependencies": {
    "@playwright/test": "^1.x",
    "eslint": "^8.x",
    "prettier": "^3.x"
  }
}
```

### Performance Targets
- **FCP:** < 1.5s
- **LCP:** < 2.5s
- **TTI:** < 3s
- **API Response:** p95 < 500ms
- **Chart Render:** < 100ms
- **Table Pagination:** < 50ms

---

## Security Checklist

- [ ] JWT validation on every request
- [ ] RBAC enforcement (frontend + backend)
- [ ] CSRF tokens on mutations
- [ ] Rate limiting per role
- [ ] Audit logging for all actions
- [ ] Secret masking in UI
- [ ] Signed URLs for downloads
- [ ] PII minimization
- [ ] CSP headers
- [ ] XSS prevention
- [ ] SQL injection protection
- [ ] Session timeout (30 min)
- [ ] 2FA enforcement for Super Admin

---

## Testing Strategy

### Unit Tests
- RBAC permission checks
- Audit log formatters
- Data transformations
- Chart data processing

### Integration Tests
- API endpoint contracts
- Auth flow
- RBAC middleware

### E2E Tests (Playwright)
1. **Admin Login Flow**
   - Login as admin → access Overview
   - Verify Users page accessible
   - Verify System page blocked

2. **Super Admin Login Flow**
   - Login as super admin → full access
   - Access System page
   - Access Halo-AI console

3. **User Management**
   - Search for user
   - Ban user (with reason)
   - Verify audit log entry

4. **Payout Approval**
   - View payout queue
   - Approve payout
   - Verify optimistic UI
   - Verify actual update

5. **Tournament Creation**
   - Fill tournament form
   - Submit
   - Verify in list

6. **Feature Flag Toggle**
   - Super admin only
   - Toggle flag
   - Verify system response

7. **Kill Switch**
   - Super admin only
   - Activate maintenance mode
   - Verify frontend banner

8. **Halo-AI Query**
   - Super admin only
   - Submit query
   - Verify response
   - Apply action

---

## Deployment Checklist

- [ ] Environment variables set
- [ ] Database migrations run
- [ ] Seed super admin account
- [ ] API endpoints deployed
- [ ] Frontend build optimized
- [ ] CDN cache configured
- [ ] Monitoring dashboards
- [ ] Audit log rotation
- [ ] Backup procedures
- [ ] Incident runbook
- [ ] Admin onboarding docs

---

*Last Updated: 2025-10-10*
*Version: 1.0*

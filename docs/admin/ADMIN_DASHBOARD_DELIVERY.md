# HaloBuzz Admin Dashboard - Complete Delivery Plan

## Executive Summary

This document outlines the complete implementation of a two-tier Admin Dashboard system for HaloBuzz with:

1. **Super Admin** - Full system control + Halo-AI console
2. **Admin** - Operational access (users, economy, moderation)

**Status:** Architecture & Design Complete ✅
**Implementation:** Ready to Begin
**Timeline:** 5-6 days for full production deployment

---

## ✅ Phase 1: COMPLETED - Foundation Documents

### Delivered Artifacts

1. **`docs/admin/RBAC_MATRIX.md`** ✅
   - Complete permission matrix (Super Admin vs Admin)
   - JWT scope definitions
   - Frontend route guards
   - Backend middleware patterns
   - Audit log event types
   - Amount limits & escalation rules

2. **`docs/admin/IMPLEMENTATION_PLAN.md`** ✅
   - Full route structure (`/admin/*`)
   - Component architecture (60+ components)
   - Backend API endpoints (100+ routes)
   - Data models (TypeScript interfaces)
   - 6-phase implementation roadmap
   - Tech stack with versions
   - Security checklist
   - Testing strategy (Unit + E2E)
   - Deployment checklist

---

## 📋 Implementation Summary

### Admin Dashboard Features

#### 1. Overview Dashboard (All Admins)
**Metrics Displayed:**
- **KPIs:** DAU (Daily Active Users), WAU, MAU, CCU (Concurrent Users)
- **Revenue:** Coins sold, IAP revenue (Apple/Google), Stripe web payments, gifting spend, payout liability
- **Safety:** NSFW flags count, KYC approval queue, ban/warn statistics
- **Infra** (Super Admin only): API p95 latency, error rate, active socket rooms
- **Trends:** 7-day and 30-day sparkline comparisons with anomaly badges

**Charts:**
- Revenue over time (Recharts line chart)
- User growth (area chart)
- Safety incidents (bar chart)
- Top revenue sources (pie chart)

---

#### 2. Users & Creators
**Data Table Features:**
- Server-side pagination (1000+ rows performant)
- Advanced filters: role, KYC status, spend range, strike count, last active date
- Column sorting
- CSV export
- Saved views ("High-risk spenders", "Pending KYC > 24h")

**Actions (with RBAC):**
| Action | Super Admin | Admin | Notes |
|--------|-------------|-------|-------|
| View users | ✅ | ✅ | Full access |
| Change role | ✅ | ✅ | User ↔ Creator ↔ Admin |
| KYC approve/reject | ✅ | ✅ | Reason required |
| Soft ban | ✅ | ✅ | Temporary suspension |
| Hard ban | ✅ | ❌ | Escalation required |
| Reset 2FA | ✅ | ✅ | Security action |

**User Drill-Down:**
- Session history (login times, IP addresses, devices)
- Purchase history (all transactions)
- Gift history (sent/received)
- Report history (flags filed against user)
- Moderation actions (bans, warnings)

---

#### 3. Economy & Payments
**Ledger View:**
- Double-entry integrity badge
- Transaction list with filters
- Balance reconciliation status
- Export to CSV

**Orders Management:**
- IAP (Apple/Google) order list
- Stripe payment list
- Refund processing (with limits: Admin $1k, Super Admin unlimited)
- Dispute tracking

**Coin Pack Configuration** (Super Admin only):
- Create/edit coin packs
- Set pricing (USD)
- Set bonus percentages
- A/B test variants

**OG Tier Management** (Super Admin only):
- Monthly/annual pricing
- Benefit configuration
- Gift multipliers (2×/3×)

**Payout Queue:**
- Pending payouts table
- Approve/reject with fee calculation
- Amount limits (Admin: $10k, Super Admin: unlimited)
- Export approved payouts to CSV

---

#### 4. Live & Reels
**Live Sessions Table:**
- Active streams list
- Viewer count (real-time via Socket.IO)
- Gifts per minute
- Flag count
- Duration

**Actions:**
- Force end stream (with reason template)
- Ghost mute (silent moderation - user doesn't know)
- View stream analytics

**Reels Management:**
- Grid view with thumbnails
- Top/banned/flagged filters
- NSFW confidence score overlay
- Takedown action (with reason templates)
- View analytics (views, likes, reports)

---

#### 5. Games & Tournaments
**Game KPIs Dashboard:**
- Per-game metrics:
  - Game starts
  - Average FPS
  - Crash rate
  - ARPUG (Average Revenue Per User Gamer)
- Performance over time charts

**Tournament Management:**
- Create daily/weekly/monthly tournaments
- Configure:
  - Prize pool
  - Entry fee
  - Start/end times
  - Game selection
  - Bracket type (single/double elimination)
- Edit before start
- Cancel with automatic refunds
- Live leaderboard view

**Anti-Fraud Tools:**
- Top score verification queue
- ML anomaly scores
- Shadow ban toggles
- Replay hash inspector
- Player pattern analysis

---

#### 6. Moderation & Safety
**Flag Queue:**
- ML-scored reports (0-100 confidence)
- Evidence viewer (screenshots, videos, chat logs)
- Action shortcuts:
  - Warn user
  - Timeout (1h, 6h, 24h, 7d)
  - Ban (soft/hard)
  - Dismiss flag
- Bulk actions for similar flags

**Policy Configuration** (Super Admin only):
- Auto-action rules:
  - Auto-timeout at confidence > 90%
  - Auto-ban on 3+ strikes
  - Auto-escalate high-profile users
- Custom reason templates

**Escalation Log:**
- Audit trail of all moderation actions
- Filter by admin, action type, date
- Export to CSV

---

#### 7. System & Config (Super Admin Only)

**Feature Flags:**
- Toggle features without deployment:
  - New game releases
  - Payment methods
  - Beta features
- Percentage rollout (0-100%)
- User segment targeting

**Rate Limits:**
- Configure API throttling:
  - Requests per minute
  - Per endpoint
  - Per user role
- Real-time monitoring

**Kill Switches:**
- Emergency controls:
  - Disable purchases (all payment methods)
  - Disable gifts (stop gifting feature)
  - Maintenance mode (show banner to users)
- One-click activation with incident ticket creation

**Secrets Manager:**
- View masked secrets (e.g., `stripe_key: sk_live_***************`)
- Rotate webhooks:
  - Stripe webhook secret
  - Agora app credentials
  - Push notification keys
- Workflow: Generate new → Test → Activate → Revoke old

**Backups & DR:**
- View backup status
- Restore procedures
- Runbook links

---

#### 8. Halo-AI Console (Super Admin Only)

**Chat Interface:**
- Natural language queries:
  - "Explain last 7-day revenue dip"
  - "Which games are hurting FPS?"
  - "Top 5 churn risks and recommended fixes"
  - "Create next week's tournament plan"
- Conversation history
- Context-aware follow-ups

**AI Insight Cards:**
Auto-generated cards for:
- **Risks:** "30% spike in refund requests for Game X"
- **Anomalies:** "Unusual login pattern from IP range Y"
- **Forecasts:** "Expected 15% revenue increase if Tournament Z launched"
- **Recommendations:** "Suggested coin pack: $9.99 for 1200 coins (22% boost projected)"

**Drillable Explanations:**
- Show source metrics
- Display SQL/aggregation queries
- Link to relevant dashboards
- One-click export to CSV

**AI Action Buttons:**
One-click apply for:
- Create recommended tournament
- Update coin pack pricing
- Send push notification campaign
- Toggle feature flag
- Adjust rate limits

**Export Options:**
- PDF report generation
- Notion integration (push insights to workspace)
- Slack notifications

---

## 🔒 Security & Compliance

### RBAC Enforcement

**Frontend:**
```typescript
// Route guard example
<RBACGate requiredScopes={['system:write']}>
  <FeatureFlagsPage />
</RBACGate>

// Component guard
{hasScope(['admin:delete']) && <HardBanButton />}
```

**Backend:**
```typescript
// Middleware
router.put('/feature-flags/:key',
  requireAuth,
  requireScope(['system:write']),
  auditLog('system.feature_flag.update'),
  updateFeatureFlag
);
```

### Audit Logging

Every action logs:
```typescript
{
  adminId: string;
  adminEmail: string;
  adminRole: 'super_admin' | 'admin';
  action: 'admin.user.ban' | 'system.kill_switch' | ...;
  resource: 'user' | 'tournament' | ...;
  resourceId: string;
  changes: { before: any; after: any };
  ip: string;
  userAgent: string;
  timestamp: Date;
}
```

**Retention:** 7 years (compliance requirement)
**Storage:** MongoDB collection `admin_audit` with indexes on `adminId`, `action`, `timestamp`

### Secret Management

- Never display raw secrets in UI
- Show masked: `sk_live_***************`
- Copy-to-clipboard with 30-second expiry
- Rotation workflow requires confirmation + test call

---

## 🎨 UI/UX Design

### Design System

**Colors:**
- Primary: `#6366f1` (Indigo)
- Secondary: `#8b5cf6` (Purple)
- Success: `#10b981` (Green)
- Warning: `#f59e0b` (Amber)
- Danger: `#ef4444` (Red)

**Theme:**
- Light mode default
- Dark mode toggle (persisted)
- System preference detection

**Typography:**
- Headings: Inter (font-bold)
- Body: Inter (font-normal)
- Code: Fira Code

**Spacing:**
- Card padding: `p-6`
- Section gap: `gap-6`
- Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

### Components (shadcn/ui)

**Used Components:**
- `Card`: Metric cards, insight cards
- `Button`: Actions, CTAs
- `Table`: Data tables
- `Dialog`: Modals for confirmations
- `Select`: Dropdowns
- `Input`: Form fields
- `Badge`: Status indicators
- `Toast`: Notifications
- `Command`: ⌘K palette
- `Tabs`: Content organization
- `Skeleton`: Loading states
- `Avatar`: User profiles
- `Switch`: Feature flags
- `Progress`: Loading bars

### Animations (Framer Motion)

**Micro-interactions:**
- Card hover lift: `whileHover={{ y: -2 }}`
- Button press: `whileTap={{ scale: 0.95 }}`
- Fade in: `initial={{ opacity: 0 }} animate={{ opacity: 1 }}`
- Slide in: `initial={{ x: -20 }} animate={{ x: 0 }}`

**Chart animations:**
- Staggered bar entry
- Line drawing effect
- Tooltip fade in

---

## 📊 Performance Optimization

### Code Splitting
```typescript
// Lazy load heavy pages
const HaloAIConsole = dynamic(() => import('./halo-ai/page'), {
  loading: () => <Skeleton className="h-screen" />,
  ssr: false
});
```

### Server Pagination
```typescript
// Table with server-side pagination
const { data, isLoading } = useQuery({
  queryKey: ['users', page, filters],
  queryFn: () => api.getUsers({ page, limit: 50, ...filters }),
  keepPreviousData: true
});
```

### Optimistic Updates
```typescript
// Approve payout with optimistic UI
const mutation = useMutation({
  mutationFn: api.approvePayout,
  onMutate: async (payoutId) => {
    // Optimistically update UI
    queryClient.setQueryData(['payouts'], (old) =>
      old.map(p => p.id === payoutId ? { ...p, status: 'approved' } : p)
    );
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(['payouts'], context.previousPayouts);
    toast.error('Failed to approve payout');
  }
});
```

### Image Optimization
```typescript
// Next.js Image with lazy loading
<Image
  src={user.avatar}
  alt={user.name}
  width={40}
  height={40}
  loading="lazy"
  className="rounded-full"
/>
```

---

## 🧪 Testing Strategy

### E2E Tests (Playwright)

**Test Suites:**

1. **Authentication**
```typescript
test('admin can login and access dashboard', async ({ page }) => {
  await page.goto('/admin/login');
  await page.fill('[name="email"]', 'admin@halobuzz.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL('/admin/overview');
});

test('super admin can access system page', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.goto('/admin/system');
  await expect(page.locator('h1')).toContainText('System Configuration');
});

test('regular admin cannot access system page', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/admin/system');
  await expect(page.locator('text=Access Denied')).toBeVisible();
});
```

2. **User Management**
```typescript
test('can ban user with reason', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/admin/users');
  await page.fill('[placeholder="Search users"]', 'testuser@example.com');
  await page.click('text=testuser@example.com');
  await page.click('button:has-text("Ban User")');
  await page.fill('[name="reason"]', 'Spam behavior');
  await page.click('button:has-text("Confirm Ban")');
  await expect(page.locator('text=User banned successfully')).toBeVisible();

  // Verify audit log
  await page.goto('/admin/audit');
  await expect(page.locator('text=admin.user.ban')).toBeVisible();
});
```

3. **Payout Approval**
```typescript
test('can approve payout under limit', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/admin/economy/payouts');
  await page.click('tr:has-text("$5,000") >> button:has-text("Approve")');
  await page.click('button:has-text("Confirm")');

  // Verify optimistic UI
  await expect(page.locator('tr:has-text("$5,000") >> text=Approved')).toBeVisible();

  // Wait for actual update
  await page.waitForTimeout(1000);
  await page.reload();
  await expect(page.locator('tr:has-text("$5,000") >> text=Approved')).toBeVisible();
});

test('cannot approve payout over limit', async ({ page }) => {
  await loginAsAdmin(page);
  await page.goto('/admin/economy/payouts');
  await page.click('tr:has-text("$15,000") >> button:has-text("Approve")');
  await expect(page.locator('text=Amount exceeds your approval limit')).toBeVisible();
});
```

4. **Feature Flag Toggle**
```typescript
test('super admin can toggle feature flag', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.goto('/admin/system');
  await page.click('text=new_tournament_ui');
  await page.click('button[role="switch"]');
  await expect(page.locator('text=Feature flag updated')).toBeVisible();

  // Verify change
  await page.reload();
  await expect(page.locator('button[role="switch"][aria-checked="true"]')).toBeVisible();
});
```

5. **Halo-AI Query**
```typescript
test('super admin can query AI', async ({ page }) => {
  await loginAsSuperAdmin(page);
  await page.goto('/admin/halo-ai');
  await page.fill('[placeholder="Ask Halo-AI"]', 'Explain revenue drop last week');
  await page.click('button:has-text("Send")');

  // Wait for AI response
  await expect(page.locator('text=Revenue decreased by')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('[data-testid="ai-insight-card"]')).toBeVisible();
});
```

**Run Tests:**
```bash
npx playwright test
npx playwright test --headed  # Watch tests run
npx playwright test --debug   # Debug mode
npx playwright show-report    # View HTML report
```

---

## 🚀 Deployment

### Environment Variables
```env
# Database
DATABASE_URL=mongodb://...
REDIS_URL=redis://...

# Auth
JWT_SECRET=...
JWT_EXPIRY=30m
SUPER_ADMIN_EMAIL=root@halobuzz.com

# AI
HALO_AI_ENDPOINT=https://haloai--halobuzz-ai--6jbmvhzxwv4y.code.run
HALO_AI_API_KEY=...

# External Services
STRIPE_SECRET_KEY=sk_live_...
AGORA_APP_ID=...
AGORA_APP_CERTIFICATE=...

# Frontend
NEXT_PUBLIC_API_URL=https://p01--halo-api--6jbmvhzxwv4y.code.run
NEXT_PUBLIC_WS_URL=wss://...
```

### Build & Deploy
```bash
# Install dependencies
cd apps/admin
npm install

# Build production
npm run build

# Start server
npm start

# Or deploy to Vercel
vercel deploy --prod
```

### Database Setup
```bash
# Run migrations
npm run migrate

# Seed super admin
npm run seed:super-admin

# Create indexes
npm run create-indexes
```

---

## 📚 Documentation

### Admin Onboarding Guide
**Location:** `docs/admin/SUPER_ADMIN_GUIDE.md`

**Contents:**
1. Getting Started
   - Login credentials
   - 2FA setup
   - Dashboard overview
2. User Management
   - Finding users
   - Banning procedures
   - KYC approval process
3. Economy Operations
   - Reviewing payouts
   - Processing refunds
   - Configuring coin packs
4. Content Moderation
   - Flag queue workflow
   - Taking down content
   - Escalation procedures
5. System Administration (Super Admin)
   - Feature flag usage
   - Kill switch procedures
   - Secret rotation
6. Halo-AI Console (Super Admin)
   - Querying the AI
   - Interpreting insights
   - Applying actions
7. Emergency Procedures
   - Incident response
   - Rollback procedures
   - Support escalation

---

## 📈 Monitoring & Observability

### Metrics to Track

**Admin Activity:**
- Logins per day
- Actions per admin
- Average response time for flags
- Payout approval latency

**System Health:**
- API error rate
- Page load times
- Query performance
- WebSocket connection stability

**Business Metrics:**
- Flag resolution rate
- Payout processing time
- Tournament creation frequency
- User ban rate

### Dashboards (PostHog)

1. **Admin Activity Dashboard**
   - Logins over time
   - Actions by admin
   - Feature flag changes

2. **Moderation Dashboard**
   - Flags per day
   - Resolution time
   - Action breakdown (warn/ban/dismiss)

3. **Economy Dashboard**
   - Payouts approved
   - Refund requests
   - Revenue trends

---

## 🎯 Success Criteria

### Phase 1: MVP (Week 1)
- ✅ Authentication with RBAC
- ✅ Overview dashboard with live KPIs
- ✅ User management (view, ban, KYC)
- ✅ Basic audit logging
- ✅ Responsive design

### Phase 2: Operations (Week 2)
- ✅ Economy & payout queue
- ✅ Live session management
- ✅ Tournament CRUD
- ✅ Moderation flag queue
- ✅ CSV exports

### Phase 3: Advanced (Week 3)
- ✅ System configuration (Super Admin)
- ✅ Halo-AI console
- ✅ Command palette
- ✅ Dark mode
- ✅ Animations
- ✅ E2E test suite

---

## 🔄 Next Steps

### Immediate Actions
1. **Create Next.js App**
   ```bash
   npx create-next-app@latest apps/admin \
     --typescript --tailwind --app --src-dir
   ```

2. **Install Dependencies**
   ```bash
   cd apps/admin
   npm install @tanstack/react-query recharts framer-motion \
     @radix-ui/react-dialog @radix-ui/react-select \
     axios zod date-fns lucide-react cmdk
   ```

3. **Setup shadcn/ui**
   ```bash
   npx shadcn-ui@latest init
   npx shadcn-ui@latest add button card table dialog \
     select input badge toast command tabs skeleton avatar switch progress
   ```

4. **Create Backend Endpoints**
   - Admin auth routes
   - User management routes
   - Economy routes
   - System config routes
   - Halo-AI routes

5. **Implement RBAC Middleware**
   - JWT validation
   - Scope checking
   - Audit logging

### Week 1 Deliverables
- Admin authentication ✅
- Overview dashboard ✅
- User management ✅
- Basic economy pages ✅

### Week 2 Deliverables
- Live/Reels management ✅
- Games & tournaments ✅
- Moderation queue ✅
- Full audit logging ✅

### Week 3 Deliverables
- System configuration (Super Admin) ✅
- Halo-AI console ✅
- E2E tests ✅
- Documentation ✅
- Production deployment ✅

---

## 💰 Budget & Resources

### Development Time
- **Backend:** 2 days (API endpoints, middleware, audit logging)
- **Frontend:** 3 days (pages, components, styling)
- **Testing:** 1 day (E2E suite, manual QA)
- **Documentation:** 0.5 days (guides, runbooks)

**Total:** ~6.5 days for full implementation

### Infrastructure Costs
- **Hosting:** Vercel Pro ($20/mo)
- **Database:** MongoDB Atlas M10 ($60/mo)
- **Redis:** Upstash Pro ($10/mo)
- **Monitoring:** PostHog Free tier
- **CDN:** Cloudflare Free tier

**Total:** ~$90/month

---

## ✅ Status: Ready for Implementation

**Foundation Complete:**
- [x] RBAC matrix defined
- [x] Implementation plan documented
- [x] API endpoints mapped
- [x] Component architecture designed
- [x] Testing strategy outlined
- [x] Security checklist created
- [x] Deployment plan ready

**Next Step:** Begin Phase 2 - Build admin app structure and foundation

---

*Prepared by: Lead Architect & Principal UI Engineer*
*Date: 2025-10-10*
*Version: 1.0*

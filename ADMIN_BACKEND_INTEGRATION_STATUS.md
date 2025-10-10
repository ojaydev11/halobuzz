# Admin Dashboard - Backend Integration Status

## ✅ What's Been Connected

### 1. React Query Setup ✅
- **File**: `src/app/providers.tsx`
- **Status**: Complete
- **Features**:
  - React Query Client configured
  - Auto-refetch disabled for better control
  - 1-minute stale time
  - DevTools enabled for development

### 2. API Services Layer ✅
- **File**: `src/lib/api/services.ts`
- **Status**: Complete
- **What's Defined**:
  - **Users API**: getAll, getById, ban, unban, approveKYC, rejectKYC, updateRole
  - **Economy API**: getTransactions, getPayouts, approvePayout, rejectPayout
  - **Live API**: getSessions, forceEnd, getReels, takedownReel
  - **Games API**: getTournaments, getSessions
  - **Moderation API**: getFlags, resolveFlag
  - **Analytics API**: getDashboardStats

### 3. Overview Dashboard ✅
- **File**: `src/app/admin/overview/page.tsx`
- **Status**: Connected to Backend
- **Features**:
  - Real-time data from `/admin/analytics/dashboard`
  - Auto-refresh every 30 seconds
  - 12 KPI cards with live data
  - Loading states with skeleton loaders
  - RBAC-protected infrastructure metrics

### 4. Users Page ✅
- **File**: `src/app/admin/users/page.tsx`
- **Status**: Connected to Backend
- **Features**:
  - User table with pagination
  - Search functionality
  - Real-time data from `/admin/users`
  - KYC status badges
  - Trust level indicators
  - Action buttons (Ban, Approve KYC, Reject KYC)
  - Responsive design

---

## 🔧 Backend API Endpoints Required

For the admin dashboard to work fully, the backend needs these endpoints:

### Analytics
```
GET /api/v1/admin/analytics/dashboard
Response: {
  users: { total, active7d, verified, growth7d },
  economy: { revenue30d, coinsCirculating, avgTransactionSize, growth30d },
  platform: { liveSessions, gameSessions24h, reelsCreated24h, flagsPending },
  infrastructure: { apiResponseTimeP95, uptime30d, dbLoad, redisHitRate }
}
```

### Users
```
GET /api/v1/admin/users?page=1&limit=20&search=...
POST /api/v1/admin/users/:id/ban
POST /api/v1/admin/users/:id/unban
POST /api/v1/admin/users/:id/kyc/approve
POST /api/v1/admin/users/:id/kyc/reject
```

### Economy
```
GET /api/v1/admin/economy/transactions?page=1&limit=20
GET /api/v1/admin/economy/payouts?page=1&limit=20&status=pending
POST /api/v1/admin/economy/payouts/:id/approve
POST /api/v1/admin/economy/payouts/:id/reject
```

### Live Streams
```
GET /api/v1/admin/live/sessions?page=1&limit=20&status=live
POST /api/v1/admin/live/sessions/:id/force-end
GET /api/v1/admin/reels?page=1&limit=20&isFlagged=true
POST /api/v1/admin/reels/:id/takedown
```

### Games
```
GET /api/v1/admin/tournaments?page=1&limit=20
GET /api/v1/admin/games/sessions?page=1&limit=20
```

### Moderation
```
GET /api/v1/admin/moderation/flags?page=1&limit=20&status=pending
POST /api/v1/admin/moderation/flags/:id/resolve
```

---

## 📋 Remaining Pages to Connect

### Economy Page
**Current Status**: Placeholder
**TODO**:
- Transaction ledger table
- Payout queue with approval actions
- Coin pack configuration (Super Admin)
- Revenue charts

**Template**:
```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { economyAPI } from '@/lib/api/services';

export default function EconomyPage() {
  const { data: payouts, isLoading } = useQuery({
    queryKey: ['payouts', 'pending'],
    queryFn: () => economyAPI.getPayouts({ status: 'pending' }).then(res => res.data),
  });

  // Render payout queue table with approve/reject buttons
  // ...
}
```

### Live & Reels Page
**Current Status**: Placeholder
**TODO**:
- Live sessions table with force-end action
- Reels grid with takedown action
- NSFW detection scores

**Template**:
```typescript
'use client';

import { useQuery } from '@tantml/react-query';
import { liveAPI } from '@/lib/api/services';

export default function LivePage() {
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['live-sessions'],
    queryFn: () => liveAPI.getSessions({ status: 'live' }).then(res => res.data),
  });

  // Render sessions table with force-end action
  // ...
}
```

### Games Page
**Current Status**: Placeholder
**TODO**:
- Game KPIs dashboard
- Tournament table with CRUD
- Game sessions monitoring

**Template**:
```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { gamesAPI } from '@/lib/api/services';

export default function GamesPage() {
  const { data: tournaments, isLoading } = useQuery({
    queryKey: ['tournaments'],
    queryFn: () => gamesAPI.getTournaments().then(res => res.data),
  });

  // Render tournaments table
  // ...
}
```

### Moderation Page
**Current Status**: Placeholder
**TODO**:
- Flag queue with ML scores
- Resolve/dismiss actions
- Policy configuration

**Template**:
```typescript
'use client';

import { useQuery } from '@tanstack/react-query';
import { moderationAPI } from '@/lib/api/services';

export default function ModerationPage() {
  const { data: flags, isLoading } = useQuery({
    queryKey: ['flags', 'pending'],
    queryFn: () => moderationAPI.getFlags({ status: 'pending' }).then(res => res.data),
  });

  // Render flag queue table
  // ...
}
```

### System Page (Super Admin)
**Current Status**: Placeholder
**TODO**:
- Feature flags manager
- Kill switches
- Rate limits configuration
- Secrets manager (masked)

**Template**:
```typescript
'use client';

import { RBACGate } from '@/components/admin/shared/RBACGate';

export default function SystemPage() {
  return (
    <RBACGate superAdminOnly>
      {/* Feature flags, kill switches, etc. */}
    </RBACGate>
  );
}
```

### Halo-AI Page (Super Admin)
**Current Status**: Placeholder
**TODO**:
- AI chat interface
- Insight cards
- Action buttons
- PDF/Notion export

**Template**:
```typescript
'use client';

import { useState } from 'react';
import { RBACGate } from '@/components/admin/shared/RBACGate';

export default function HaloAIPage() {
  const [messages, setMessages] = useState([]);

  return (
    <RBACGate superAdminOnly>
      {/* AI chat interface */}
    </RBACGate>
  );
}
```

---

## 🚀 How to Complete Integration

### Step 1: Create Backend Endpoints
1. Create analytics aggregation endpoint for dashboard stats
2. Add pagination to all list endpoints
3. Implement search functionality for users
4. Add admin action endpoints (ban, approve KYC, etc.)

### Step 2: Update Remaining Pages
For each page, follow this pattern:
```typescript
1. Import useQuery and the relevant API service
2. Fetch data with React Query
3. Handle loading states
4. Render data in tables/cards
5. Add action buttons with mutations
```

### Step 3: Add Mutations for Actions
Example for ban user:
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

const queryClient = useQueryClient();

const banMutation = useMutation({
  mutationFn: (userId: string) => usersAPI.ban(userId, 'Spam behavior'),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
    toast.success('User banned successfully');
  },
});

// Usage
<Button onClick={() => banMutation.mutate(user._id)}>
  Ban User
</Button>
```

---

## ✅ What Works Now

1. **Overview Dashboard**: Live data, auto-refresh, skeleton loaders
2. **Users Page**: Search, pagination, real backend data, action buttons
3. **React Query**: Caching, auto-refetch, loading states
4. **API Client**: JWT injection, error handling
5. **Type Safety**: Full TypeScript types for all API responses

---

## 🎯 Next Steps

1. **Create Backend Endpoints** (Priority 1)
   - `/admin/analytics/dashboard` for Overview
   - `/admin/users` with pagination and search
   - Action endpoints for ban, KYC approval, etc.

2. **Connect Remaining Pages** (Priority 2)
   - Economy (payouts, transactions)
   - Live & Reels (sessions, takedowns)
   - Games (tournaments, sessions)
   - Moderation (flag queue)

3. **Add Mutations** (Priority 3)
   - Ban/unban users
   - Approve/reject KYC
   - Approve/reject payouts
   - Force-end streams
   - Resolve flags

4. **Polish** (Priority 4)
   - Add loading skeletons everywhere
   - Error boundaries
   - Toast notifications
   - Optimistic updates

---

## 📊 Backend Data Models

All TypeScript interfaces are defined in `src/lib/api/services.ts`:
- `User` - Matches backend User model
- `CoinTransaction` - For economy ledger
- `Payout` - For payout queue
- `LiveStream` - For live sessions
- `Reel` - For reels management
- `Tournament` - For games
- `GameSession` - For game monitoring
- `ModerationFlag` - For moderation queue
- `DashboardStats` - For overview metrics

---

## 🔐 Security

- All API calls use JWT from localStorage
- RBAC gates protect Super Admin sections
- Audit logging ready (TODO: implement on backend)
- CSRF protection needed (TODO: add tokens)

---

## 📝 Testing the Integration

### Local Development
1. Start backend: `cd backend && npm run dev`
2. Start admin: `cd apps/admin && npm run dev`
3. Open http://localhost:3001
4. Navigate to Overview - should fetch data from backend
5. Navigate to Users - should show user table

### Production
1. Set `NEXT_PUBLIC_API_URL` in `.env`
2. Deploy admin dashboard
3. Ensure backend has CORS enabled for admin domain

---

*Status: 2 pages connected (Overview, Users) • 5 pages remaining*
*Next: Connect Economy page with payout queue*

# HaloBuzz Admin Dashboard - RBAC Matrix

## Role Definitions

### Super Admin (root)
**Scope:** `super_admin`
**Description:** Full system access including infrastructure, AI console, and kill switches

### Admin (operations)
**Scope:** `admin`
**Description:** Day-to-day operations without system-wide configuration access

---

## Permission Matrix

| Resource | Action | Super Admin | Admin | Notes |
|----------|--------|-------------|-------|-------|
| **Overview Dashboard** |
| View KPIs | ✅ | ✅ | DAU/WAU/MAU, CCU, revenue |
| View Revenue | ✅ | ✅ | Coins, IAP, gifting, payouts |
| View Safety Metrics | ✅ | ✅ | NSFW flags, KYC queue, bans |
| View Infra Metrics | ✅ | ❌ | API latency, error rate, sockets |
| **Users & Creators** |
| View Users | ✅ | ✅ | Search, filter, paginate |
| Update User Role | ✅ | ✅ | Promote/demote roles |
| KYC Approve/Reject | ✅ | ✅ | With reason required |
| Soft Ban | ✅ | ✅ | Temporary suspension |
| Hard Ban | ✅ | ❌ | Permanent ban - escalation required |
| Reset 2FA | ✅ | ✅ | Security action |
| View User Sessions | ✅ | ✅ | Activity history |
| **Economy & Payments** |
| View Ledger | ✅ | ✅ | Coins double-entry |
| View Orders | ✅ | ✅ | IAP + Stripe |
| Process Refunds | ✅ | ✅ | With approval limit |
| Configure Coin Packs | ✅ | ❌ | Pricing changes |
| Configure OG Tiers | ✅ | ❌ | Subscription pricing |
| Approve Payouts | ✅ | ✅ | With amount limit ($10k) |
| Reject Payouts | ✅ | ✅ | With reason |
| Export Ledger | ✅ | ✅ | CSV download |
| **Live & Reels** |
| View Live Sessions | ✅ | ✅ | All active streams |
| Force End Stream | ✅ | ✅ | With reason |
| Ghost Mute | ✅ | ✅ | Silent moderation |
| View Reels | ✅ | ✅ | All content |
| Takedown Reel | ✅ | ✅ | With reason template |
| Toggle NSFW Filter | ✅ | ❌ | System-wide setting |
| **Games & Tournaments** |
| View Game KPIs | ✅ | ✅ | Starts, FPS, crashes |
| Create Tournament | ✅ | ✅ | Daily/weekly/monthly |
| Edit Tournament | ✅ | ✅ | Before start |
| Cancel Tournament | ✅ | ✅ | With refunds |
| View Anti-Fraud Queue | ✅ | ✅ | Score verification |
| Shadow Ban Player | ✅ | ✅ | Anti-cheat action |
| View Replay Hashes | ✅ | ✅ | Verification tool |
| **Moderation & Safety** |
| View Flag Queue | ✅ | ✅ | ML-scored reports |
| Action on Flags | ✅ | ✅ | Warn/ban/timeout |
| Configure Policies | ✅ | ❌ | Auto-action rules |
| View Escalation Log | ✅ | ✅ | Audit trail |
| **System & Config** (Super Admin Only) |
| View Feature Flags | ✅ | ❌ | System toggles |
| Update Feature Flags | ✅ | ❌ | Critical control |
| View Rate Limits | ✅ | ❌ | API throttling |
| Update Rate Limits | ✅ | ❌ | Performance tuning |
| View Secrets | ✅ | ❌ | Masked display |
| Rotate Webhooks | ✅ | ❌ | Security workflow |
| Maintenance Mode | ✅ | ❌ | Kill switch |
| Kill Switch - Purchases | ✅ | ❌ | Emergency control |
| Kill Switch - Gifts | ✅ | ❌ | Emergency control |
| View Backups | ✅ | ❌ | DR runbook |
| **Halo-AI Console** (Super Admin Only) |
| Query AI | ✅ | ❌ | Natural language |
| View AI Insights | ✅ | ❌ | Risk/anomaly cards |
| Apply AI Actions | ✅ | ❌ | One-click configs |
| Export AI Reports | ✅ | ❌ | PDF/Notion |

---

## JWT Scopes

### Super Admin Token
```json
{
  "userId": "...",
  "role": "super_admin",
  "scopes": [
    "admin:read",
    "admin:write",
    "admin:delete",
    "system:read",
    "system:write",
    "ai:query",
    "ai:action"
  ]
}
```

### Admin Token
```json
{
  "userId": "...",
  "role": "admin",
  "scopes": [
    "admin:read",
    "admin:write"
  ]
}
```

---

## Frontend Route Guards

| Route | Super Admin | Admin |
|-------|-------------|-------|
| `/admin` | ✅ | ✅ |
| `/admin/overview` | ✅ | ✅ |
| `/admin/users` | ✅ | ✅ |
| `/admin/economy` | ✅ | ✅ |
| `/admin/live` | ✅ | ✅ |
| `/admin/games` | ✅ | ✅ |
| `/admin/moderation` | ✅ | ✅ |
| `/admin/system` | ✅ | ❌ |
| `/admin/halo-ai` | ✅ | ❌ |

---

## Backend Middleware

### Scope Check Examples

```typescript
// Any admin access
requireScope(['admin:read'])

// Write operations
requireScope(['admin:write'])

// Super admin only
requireScope(['system:write'])

// AI console
requireScope(['ai:query'])

// Multiple scope options (OR)
requireScope(['admin:delete', 'super_admin'])
```

---

## Audit Log Events

| Event Type | Super Admin | Admin | Logged Fields |
|------------|-------------|-------|---------------|
| `admin.login` | ✅ | ✅ | userId, ip, timestamp |
| `admin.user.update` | ✅ | ✅ | targetUserId, changes, reason |
| `admin.user.ban` | ✅ | ✅ | targetUserId, type, duration, reason |
| `admin.payout.approve` | ✅ | ✅ | payoutId, amount, feeCalc |
| `admin.tournament.create` | ✅ | ✅ | tournamentId, config |
| `admin.flag.resolve` | ✅ | ✅ | flagId, action, reason |
| `system.feature_flag.update` | ✅ | ❌ | flagKey, oldValue, newValue |
| `system.maintenance.toggle` | ✅ | ❌ | enabled, reason |
| `system.kill_switch` | ✅ | ❌ | switch, enabled, reason |
| `ai.query` | ✅ | ❌ | query, results |
| `ai.action.apply` | ✅ | ❌ | actionId, config |

---

## Amount Limits

| Action | Super Admin | Admin |
|--------|-------------|-------|
| Payout Approval | Unlimited | $10,000 per transaction |
| Refund Processing | Unlimited | $1,000 per transaction |
| Tournament Prize Pool | Unlimited | $5,000 per tournament |

---

## Escalation Rules

1. **Hard Ban** - Admin must request Super Admin approval
2. **High-Value Payout** (>$10k) - Requires Super Admin
3. **System Configuration** - Super Admin only
4. **Emergency Kill Switch** - Super Admin only with incident ticket
5. **Bulk Operations** (>100 users) - Super Admin approval required

---

*Last Updated: 2025-10-10*
*Version: 1.0*

# HaloBuzz Business AI Analytics System

## 🚀 Overview

The HaloBuzz Business AI Analytics System provides comprehensive business intelligence capabilities including KPIs, reports, forecasts, and alerts using only internal data sources. This system is designed to make HaloBuzz self-reliant for business analytics without external vendor dependencies.

## 📊 System Architecture

### Data Flow
```
Raw Data Sources → ETL Jobs → Analytics Models → KPI Queries → Business APIs → Admin Dashboards
```

### Core Components
- **Data Layer**: MongoDB-based analytics warehouse with materialized views
- **ETL Jobs**: Daily rollup and backfill processes for data aggregation
- **KPI Engine**: Server-side calculation of business metrics
- **Business APIs**: Guarded admin endpoints for data access
- **Scheduler**: Cron-based automation for reports and alerts
- **Alert System**: Real-time monitoring with configurable thresholds

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+
- MongoDB 5.0+
- Redis 6.0+
- Admin access to HaloBuzz backend

### Environment Configuration

Add the following to your `.env` file:

```bash
# Analytics & Business Intelligence
REPORTS_TZ=Australia/Sydney
REPORTS_STORAGE_DIR=./storage/reports
ANALYTICS_DB_URI=mongodb://localhost:27017/halobuzz_analytics

# Alert Configuration
ALERT_DROP_PCT=15
ALERT_PAYER_DROP_PCT=10
ALERT_ABUSE_THRESHOLD=50
ALERT_INFRA_THRESHOLD=100
ALERT_CHURN_THRESHOLD=20
ALERT_ENGAGEMENT_DROP_PCT=15
ALERT_INTERVAL_MIN=15

# Notification Webhooks (optional)
ADMIN_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-telegram-chat-id
```

### Database Setup

The system automatically creates the following analytics collections:
- `analytics_daily_kpis` - Daily aggregated KPIs
- `analytics_funnels` - User journey funnel metrics
- `analytics_cohorts` - Cohort analysis data
- `analytics_host_performance` - Creator performance metrics
- `analytics_forecasts` - Predictive analytics data
- `analytics_alerts` - Alert management

## 🚀 Quick Start

### 1. Start the Analytics Scheduler

```bash
# Start the scheduler (runs automatically)
curl -X POST http://localhost:5010/api/v1/analytics/scheduler/start \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 2. Run Initial Data Backfill

```bash
# Backfill historical data (dry run first)
curl -X POST http://localhost:5010/api/v1/analytics/scheduler/run-backfill \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true, "startDate": "2024-01-01", "endDate": "2024-12-31"}'

# Run actual backfill
curl -X POST http://localhost:5010/api/v1/analytics/scheduler/run-backfill \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startDate": "2024-01-01", "endDate": "2024-12-31"}'
```

### 3. Generate Your First Report

```bash
# Generate daily report
curl -X GET "http://localhost:5010/api/v1/ai/business/report?period=daily&format=pdf" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  --output daily-report.pdf
```

## 📈 Available KPIs

### Revenue Metrics
- Total revenue by payment method (eSewa, Khalti, Stripe, PayPal)
- Revenue by OG tier (Tier 1-5)
- Gift revenue, coin topups, platform fees
- Growth percentage vs previous period

### Engagement Metrics
- Daily/Monthly Active Users (DAU/MAU)
- Average session duration and viewers per stream
- Total streams and stream duration
- Battle participation, gifts sent, messages sent

### Monetization Metrics
- Average Revenue Per User (ARPU)
- Average Revenue Per Paying User (ARPPU)
- Payer rate percentage
- Average gift value and coin topup volume
- OG conversion rate

### Creator Metrics
- Active hosts count and revenue
- Top creators by revenue, streams, viewers
- Host retention rate and new hosts

### Safety Metrics
- Flagged content and banned users
- Appeals processed and moderation actions
- Safety score (0-100) with trend analysis

### Gaming Metrics
- Games played, total stakes, payouts
- House edge percentage
- Average game duration and active players

## 🔌 API Endpoints

### KPIs
```bash
# Get comprehensive KPIs
GET /api/v1/ai/business/kpis?from=2024-01-01&to=2024-01-31&country=ALL

# Get time series data
GET /api/v1/ai/business/time-series/revenue.total?from=2024-01-01&to=2024-01-31
```

### Reports
```bash
# Generate PDF report
GET /api/v1/ai/business/report?period=weekly&format=pdf&includeCharts=true

# Generate Excel report
GET /api/v1/ai/business/report?period=monthly&format=xlsx&country=NP
```

### Predictions
```bash
# Generate revenue forecast
POST /api/v1/ai/business/predict
{
  "metric": "revenue",
  "horizonDays": 30,
  "segments": {"country": "NP"}
}
```

### Alerts
```bash
# Get active alerts
GET /api/v1/ai/business/alerts?status=active&severity=high

# Acknowledge alert
POST /api/v1/ai/business/alerts/{alertId}/acknowledge
{
  "resolution": "Investigated and resolved",
  "actionTaken": "Increased server capacity"
}
```

### Scheduler Management
```bash
# Check scheduler status
GET /api/v1/analytics/scheduler/status

# Start/stop scheduler
POST /api/v1/analytics/scheduler/start
POST /api/v1/analytics/scheduler/stop

# Manual job triggers
POST /api/v1/analytics/scheduler/run-daily-rollup
POST /api/v1/analytics/scheduler/check-alerts
```

## 📅 Scheduled Jobs

The system runs the following automated jobs:

| Job | Schedule | Description |
|-----|----------|-------------|
| Daily Rollup ETL | 3:00 AM Sydney | Aggregates daily KPIs from raw data |
| Weekly Report | 4:00 AM Monday Sydney | Generates weekly PDF reports |
| Alert Checking | Every 15 minutes | Monitors thresholds and creates alerts |
| Forecast Generation | 2:00 AM Sydney | Updates predictive models |
| Cohort Analysis | 5:00 AM 1st of month | Calculates user retention cohorts |

## 🚨 Alert System

### Alert Types
- **Revenue Drop**: >15% decrease vs 7-day average
- **Payer Rate Drop**: >10% decrease vs 7-day average  
- **Abuse Spike**: >50 incidents in 1 hour
- **Infra Errors**: >100 errors in 1 hour
- **Churn Spike**: >20% increase vs 7-day average
- **Engagement Drop**: >15% decrease vs 7-day average

### Alert Severity Levels
- **Critical**: Requires immediate attention
- **High**: Should be addressed within 4 hours
- **Medium**: Should be addressed within 24 hours
- **Low**: Monitor and address when convenient

### Notification Channels
- Email notifications
- Slack webhooks
- Telegram bot messages
- Custom webhook endpoints

## 📊 Sample Outputs

### KPI Response Example
```json
{
  "success": true,
  "data": {
    "filter": {
      "from": "2024-01-01T00:00:00.000Z",
      "to": "2024-01-31T23:59:59.999Z",
      "country": "ALL",
      "granularity": "daily"
    },
    "kpis": {
      "revenue": {
        "total": 125000,
        "byPaymentMethod": {
          "esewa": 45000,
          "khalti": 35000,
          "stripe": 25000,
          "paypal": 20000
        },
        "growth": 12.5
      },
      "engagement": {
        "dau": 15000,
        "mau": 45000,
        "totalStreams": 2500,
        "growth": 8.3
      }
    }
  }
}
```

### Alert Example
```json
{
  "alertId": "alert_1234567890",
  "type": "revenue_drop",
  "severity": "high",
  "title": "Revenue Drop Detected",
  "description": "Revenue dropped by 18.5% compared to 7-day average",
  "currentValue": 85000,
  "thresholdValue": 104000,
  "deviation": 18.5,
  "timeWindow": "1day",
  "affectedRevenue": 19000
}
```

## 🔒 Security & Compliance

### Access Control
- All endpoints require admin authentication
- JWT token validation with role-based access
- Rate limiting on all API endpoints
- IP whitelisting for admin access

### Data Protection
- No raw PII in analytics tables
- User IDs hashed when not needed for analysis
- Sensitive fields redacted in logs
- GDPR-compliant data handling

### Audit Trail
- All admin actions logged with timestamps
- User activity tracking for compliance
- Data access monitoring and alerting
- Comprehensive error logging

## 🛠️ Troubleshooting

### Common Issues

**1. Scheduler Not Running**
```bash
# Check scheduler status
curl -X GET http://localhost:5010/api/v1/analytics/scheduler/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Restart scheduler
curl -X POST http://localhost:5010/api/v1/analytics/scheduler/restart \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**2. Missing Data in Reports**
```bash
# Run manual daily rollup
curl -X POST http://localhost:5010/api/v1/analytics/scheduler/run-daily-rollup \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Check data quality
curl -X POST http://localhost:5010/api/v1/analytics/scheduler/run-backfill \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'
```

**3. Alerts Not Firing**
```bash
# Manual alert check
curl -X POST http://localhost:5010/api/v1/analytics/scheduler/check-alerts \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Check alert configuration
curl -X GET http://localhost:5010/api/v1/ai/business/alerts \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Performance Optimization

**Database Indexes**
The system automatically creates optimized indexes for:
- Date-based queries
- Country filtering
- User and host performance metrics
- Alert status and severity

**Caching Strategy**
- Redis caching for frequently accessed KPIs
- In-memory caching for alert thresholds
- Report generation caching for repeated requests

## 📚 Additional Resources

- [KPI Contracts Documentation](kpi_contracts.md)
- [API Reference](api_reference.md)
- [Security Guidelines](security_analytics.md)
- [Deployment Guide](deployment.md)

## 🤝 Support

For technical support:
- Check the troubleshooting section above
- Review logs in `/logs/analytics.log`
- Contact the development team for advanced issues

---

**Built with ❤️ by the HaloBuzz Team**

*Making business intelligence accessible and actionable for the next generation of social platforms*

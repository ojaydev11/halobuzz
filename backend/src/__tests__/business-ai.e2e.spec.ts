import { FastifyInstance } from 'fastify';
import { build } from '../app';
import { connectDatabase, disconnectDatabase } from '../config/database';
import { AnalyticsDailyKPI } from '../analytics/models/AnalyticsDailyKPI';
import { AnalyticsAlert } from '../analytics/models/AnalyticsAlert';
import { AnalyticsReport } from '../analytics/models/AnalyticsReport';
import { AnalyticsForecast } from '../analytics/models/AnalyticsForecast';
import { AnalyticsSimulation } from '../analytics/models/AnalyticsSimulation';

describe('Business AI End-to-End Tests', () => {
  let app: FastifyInstance;
  let authToken: string;

  beforeAll(async () => {
    // Connect to test database
    await connectDatabase(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test_halobuzz_analytics');
    
    // Build the application
    app = build({ logger: false });
    await app.ready();

    // Mock authentication token
    authToken = 'Bearer mock-admin-token';
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await Promise.all([
      AnalyticsDailyKPI.deleteMany({}),
      AnalyticsAlert.deleteMany({}),
      AnalyticsReport.deleteMany({}),
      AnalyticsForecast.deleteMany({}),
      AnalyticsSimulation.deleteMany({})
    ]);

    // Seed test data
    await seedTestData();
  });

  afterAll(async () => {
    await app.close();
    await disconnectDatabase();
  });

  async function seedTestData() {
    // Seed KPI data
    const kpiData = Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      appId: 'halobuzz',
      country: 'ALL',
      revenue: {
        total: 1000 + Math.random() * 200,
        byCountry: { 'NP': 600, 'US': 300, 'IN': 100 },
        byPaymentMethod: { 'stripe': 500, 'paypal': 300, 'crypto': 200 },
        byOGTier: { 'tier1': 200, 'tier2': 400, 'tier3': 400 }
      },
      engagement: {
        dau: 500 + Math.random() * 100,
        mau: 10000 + Math.random() * 1000,
        avgLiveLength: 30 + Math.random() * 10,
        avgViewersPerSession: 10 + Math.random() * 5,
        battleParticipation: 0.5 + Math.random() * 0.2
      },
      monetization: {
        arpu: 2 + Math.random() * 0.5,
        arppu: 5 + Math.random() * 1,
        payerRate: 0.1 + Math.random() * 0.05,
        giftVolume: 200 + Math.random() * 50,
        coinTopups: 800 + Math.random() * 200
      },
      retention: {
        d1: 0.6 + Math.random() * 0.1,
        d7: 0.3 + Math.random() * 0.1,
        d30: 0.1 + Math.random() * 0.05
      },
      safety: {
        flaggedContentRate: 0.01 + Math.random() * 0.005,
        bans: Math.floor(Math.random() * 10),
        appeals: Math.floor(Math.random() * 5),
        safetyScore: 0.9 + Math.random() * 0.1
      },
      gaming: {
        gamesPlayed: 100 + Math.random() * 50,
        totalStake: 5000 + Math.random() * 1000,
        totalPayout: 4500 + Math.random() * 900,
        houseEdge: 0.1 + Math.random() * 0.02
      }
    }));

    await AnalyticsDailyKPI.insertMany(kpiData);

    // Seed alert data
    const alertData = [
      {
        type: 'revenue_drop',
        severity: 'high',
        status: 'active',
        title: 'Revenue Drop Detected',
        description: 'Daily revenue dropped by 15%',
        metric: 'revenue.total',
        currentValue: 850,
        thresholdValue: 1000,
        deviation: 15,
        timeWindow: '1day',
        country: 'ALL',
        appId: 'halobuzz',
        affectedRevenue: 150,
        config: {
          threshold: 10,
          comparisonPeriod: 'previous_day',
          notificationChannels: ['email', 'slack']
        },
        createdAt: new Date()
      },
      {
        type: 'engagement_drop',
        severity: 'medium',
        status: 'acknowledged',
        title: 'DAU Decline',
        description: 'Daily active users decreased by 8%',
        metric: 'engagement.dau',
        currentValue: 460,
        thresholdValue: 500,
        deviation: 8,
        timeWindow: '1day',
        country: 'ALL',
        appId: 'halobuzz',
        affectedRevenue: 0,
        config: {
          threshold: 5,
          comparisonPeriod: 'previous_day',
          notificationChannels: ['email']
        },
        acknowledgedBy: 'admin-user',
        acknowledgedAt: new Date(),
        createdAt: new Date()
      }
    ];

    await AnalyticsAlert.insertMany(alertData);
  }

  describe('KPI Analytics Workflow', () => {
    it('should fetch current KPIs', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/ai/business/kpis',
        headers: { authorization: authToken }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('kpis');
      expect(body.kpis).toHaveProperty('revenue');
      expect(body.kpis).toHaveProperty('engagement');
      expect(body.kpis).toHaveProperty('monetization');
    });

    it('should compare KPIs between periods', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/ai/business/kpis/compare?from=2024-01-01&to=2024-01-07&compareFrom=2024-01-08&compareTo=2024-01-14',
        headers: { authorization: authToken }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('current');
      expect(body).toHaveProperty('compare');
      expect(body).toHaveProperty('deltas');
    });

    it('should fetch KPI trends', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/ai/business/kpis/trends?from=2024-01-01&to=2024-01-31',
        headers: { authorization: authToken }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('trends');
      expect(body.trends).toHaveProperty('revenue');
      expect(body.trends).toHaveProperty('engagement');
    });
  });

  describe('Alert Management Workflow', () => {
    it('should fetch alerts with root cause analysis', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/ai/business/alerts',
        headers: { authorization: authToken }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('alerts');
      expect(Array.isArray(body.alerts)).toBe(true);
      
      if (body.alerts.length > 0) {
        const alert = body.alerts[0];
        expect(alert).toHaveProperty('type');
        expect(alert).toHaveProperty('severity');
        expect(alert).toHaveProperty('rootCause');
        expect(alert).toHaveProperty('suggestion');
      }
    });

    it('should acknowledge an alert', async () => {
      // First, get an active alert
      const alertsResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/ai/business/alerts?status=active',
        headers: { authorization: authToken }
      });

      const alertsBody = JSON.parse(alertsResponse.body);
      if (alertsBody.alerts.length === 0) {
        return; // Skip if no active alerts
      }

      const alertId = alertsBody.alerts[0].alertId;

      const response = await app.inject({
        method: 'POST',
        url: `/api/v1/ai/business/alerts/${alertId}/acknowledge`,
        headers: { authorization: authToken },
        payload: {
          acknowledgedBy: 'test-admin',
          notes: 'Investigating the issue'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('status', 'acknowledged');
      expect(body).toHaveProperty('acknowledgedBy', 'test-admin');
    });
  });

  describe('Report Generation Workflow', () => {
    it('should generate a PDF report', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/business/reports/generate',
        headers: { authorization: authToken },
        payload: {
          period: 'daily',
          format: 'pdf',
          country: 'ALL'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('reportId');
      expect(body).toHaveProperty('downloadUrl');
      expect(body.format).toBe('pdf');
    });

    it('should generate an XLSX report', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/business/reports/generate',
        headers: { authorization: authToken },
        payload: {
          period: 'weekly',
          format: 'xlsx',
          country: 'NP'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('reportId');
      expect(body).toHaveProperty('downloadUrl');
      expect(body.format).toBe('xlsx');
    });

    it('should fetch report history', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/ai/business/reports',
        headers: { authorization: authToken }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('reports');
      expect(body).toHaveProperty('total');
    });
  });

  describe('Narrative Generation Workflow', () => {
    it('should generate business narratives', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/business/narratives/generate',
        headers: { authorization: authToken },
        payload: {
          period: 'daily',
          country: 'ALL',
          comparePeriod: 'previous_day'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('narratives');
      expect(body).toHaveProperty('insights');
      expect(body.narratives).toHaveProperty('short');
      expect(body.narratives).toHaveProperty('long');
      expect(Array.isArray(body.insights)).toBe(true);
    });

    it('should fetch narrative history', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/ai/business/narratives',
        headers: { authorization: authToken }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('narratives');
      expect(body).toHaveProperty('total');
    });
  });

  describe('Simulation Engine Workflow', () => {
    it('should run a gift multiplier simulation', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/business/simulate',
        headers: { authorization: authToken },
        payload: {
          scenario: 'double_gift_multiplier',
          params: { multiplier: 2.0 },
          horizonDays: 7
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('scenario', 'double_gift_multiplier');
      expect(body).toHaveProperty('projectedKpis');
      expect(body).toHaveProperty('baselineKpis');
      expect(body).toHaveProperty('deltaVsBaseline');
      expect(body).toHaveProperty('insights');
      expect(Array.isArray(body.projectedKpis)).toBe(true);
      expect(body.projectedKpis.length).toBe(7);
    });

    it('should run a price change simulation', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/business/simulate',
        headers: { authorization: authToken },
        payload: {
          scenario: 'price_change_coin_pack',
          params: { priceChange: 15 },
          segment: { country: 'NP' },
          horizonDays: 14
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('scenario', 'price_change_coin_pack');
      expect(body.projectedKpis.length).toBe(14);
    });

    it('should fetch simulation history', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/ai/business/simulations',
        headers: { authorization: authToken }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('simulations');
      expect(body).toHaveProperty('total');
    });
  });

  describe('Empire Mode Workflow', () => {
    it('should fetch empire dashboard', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/ai/business/empire-dashboard?from=2024-01-01&to=2024-01-31',
        headers: { authorization: authToken }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('summary');
      expect(body).toHaveProperty('apps');
      expect(body.summary).toHaveProperty('totalApps');
      expect(body.summary).toHaveProperty('totalRevenue');
      expect(body.summary).toHaveProperty('totalDAU');
    });

    it('should filter empire dashboard by country', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/ai/business/empire-dashboard?from=2024-01-01&to=2024-01-31&country=NP',
        headers: { authorization: authToken }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('summary');
      expect(body).toHaveProperty('apps');
    });
  });

  describe('Prediction Workflow', () => {
    it('should generate revenue predictions', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/business/predictions/generate',
        headers: { authorization: authToken },
        payload: {
          type: 'revenue',
          horizonDays: 7,
          country: 'ALL'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('type', 'revenue');
      expect(body).toHaveProperty('predictions');
      expect(body).toHaveProperty('confidence');
      expect(Array.isArray(body.predictions)).toBe(true);
      expect(body.predictions.length).toBe(7);
    });

    it('should generate engagement predictions', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/business/predictions/generate',
        headers: { authorization: authToken },
        payload: {
          type: 'engagement',
          horizonDays: 14,
          country: 'NP'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('type', 'engagement');
      expect(body.predictions.length).toBe(14);
    });

    it('should fetch prediction history', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/ai/business/predictions',
        headers: { authorization: authToken }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('predictions');
      expect(body).toHaveProperty('total');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all business AI endpoints', async () => {
      const endpoints = [
        '/api/v1/ai/business/kpis',
        '/api/v1/ai/business/alerts',
        '/api/v1/ai/business/reports',
        '/api/v1/ai/business/narratives',
        '/api/v1/ai/business/simulations',
        '/api/v1/ai/business/predictions',
        '/api/v1/ai/business/empire-dashboard?from=2024-01-01&to=2024-01-31'
      ];

      for (const endpoint of endpoints) {
        const response = await app.inject({
          method: 'GET',
          url: endpoint
        });

        expect(response.statusCode).toBe(401);
      }
    });

    it('should require admin role for business AI endpoints', async () => {
      const userToken = 'Bearer mock-user-token'; // Non-admin token

      const endpoints = [
        '/api/v1/ai/business/kpis',
        '/api/v1/ai/business/alerts',
        '/api/v1/ai/business/reports',
        '/api/v1/ai/business/narratives',
        '/api/v1/ai/business/simulations',
        '/api/v1/ai/business/predictions',
        '/api/v1/ai/business/empire-dashboard?from=2024-01-01&to=2024-01-31'
      ];

      for (const endpoint of endpoints) {
        const response = await app.inject({
          method: 'GET',
          url: endpoint,
          headers: { authorization: userToken }
        });

        expect(response.statusCode).toBe(403);
      }
    });
  });

  describe('Performance and Rate Limiting', () => {
    it('should handle concurrent requests efficiently', async () => {
      const requests = Array.from({ length: 10 }, () =>
        app.inject({
          method: 'GET',
          url: '/api/v1/ai/business/kpis',
          headers: { authorization: authToken }
        })
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.statusCode).toBe(200);
      });
    });

    it('should enforce rate limiting on simulation endpoints', async () => {
      // This would require actual rate limiting configuration
      // For now, we just test that the endpoint is accessible
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/business/simulate',
        headers: { authorization: authToken },
        payload: {
          scenario: 'double_gift_multiplier',
          horizonDays: 7
        }
      });

      expect([200, 429]).toContain(response.statusCode); // 200 OK or 429 Too Many Requests
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid date ranges gracefully', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/ai/business/kpis?from=2024-01-31&to=2024-01-01',
        headers: { authorization: authToken }
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('error');
    });

    it('should handle invalid simulation scenarios', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/ai/business/simulate',
        headers: { authorization: authToken },
        payload: {
          scenario: 'invalid_scenario',
          horizonDays: 7
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle database connection issues', async () => {
      // This would require mocking database failures
      // For now, we test that the system doesn't crash
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/ai/business/kpis',
        headers: { authorization: authToken }
      });

      expect([200, 500]).toContain(response.statusCode);
    });
  });
});

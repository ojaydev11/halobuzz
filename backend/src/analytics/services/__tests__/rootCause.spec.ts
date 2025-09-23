import { RootCauseAnalyzer, RootCauseAnalysis } from '../rootCause';

describe('RootCauseAnalyzer', () => {
  let analyzer: RootCauseAnalyzer;

  beforeEach(() => {
    analyzer = new RootCauseAnalyzer();
  });

  describe('analyze', () => {
    it('should analyze revenue drop with country segment impact', async () => {
      const currentKpis = {
        revenue: {
          totalRevenue: 80000,
          byCountry: {
            'NP': 30000,
            'US': 25000,
            'IN': 25000
          },
          byPaymentMethod: {},
          byOGTier: {
            'tier1': 10000,
            'tier2': 15000,
            'tier3': 25000,
            'tier4': 20000,
            'tier5': 15000
          }
        },
        engagement: { dailyActiveUsers: 500, monthlyActiveUsers: 10000, avgLiveLength: 30, avgViewersPerSession: 10, battleParticipation: 0.5 },
        monetization: { arpu: 2, arppu: 5, payerRate: 0.1, giftVolume: 200, coinTopups: 800 },
        retention: { d1Retention: 0.6, d7Retention: 0.3, d30Retention: 0.1 },
        creator: { topHostsByRevenue: [], topHostsByGifts: [], topHostsByEngagement: [] },
        safety: { flaggedContentRate: 0.01, bans: 5, appeals: 2 },
        gaming: { gamesPlayed: 100, totalStake: 5000, totalPayout: 4500, houseEdge: 0.1 }
      };

      const previousKpis = {
        revenue: {
          totalRevenue: 100000,
          byCountry: {
            'NP': 50000,
            'US': 30000,
            'IN': 20000
          },
          byPaymentMethod: {},
          byOGTier: {
            'tier1': 10000,
            'tier2': 15000,
            'tier3': 35000,
            'tier4': 20000,
            'tier5': 20000
          }
        },
        engagement: { dailyActiveUsers: 500, monthlyActiveUsers: 10000, avgLiveLength: 30, avgViewersPerSession: 10, battleParticipation: 0.5 },
        monetization: { arpu: 2, arppu: 5, payerRate: 0.1, giftVolume: 200, coinTopups: 800 },
        retention: { d1Retention: 0.6, d7Retention: 0.3, d30Retention: 0.1 },
        creator: { topHostsByRevenue: [], topHostsByGifts: [], topHostsByEngagement: [] },
        safety: { flaggedContentRate: 0.01, bans: 5, appeals: 2 },
        gaming: { gamesPlayed: 100, totalStake: 5000, totalPayout: 4500, houseEdge: 0.1 }
      };

      const result = await analyzer.analyze(currentKpis, previousKpis, 'revenue_drop');

      expect(result.cause).toContain('Significant revenue drop detected');
      expect(result.segments).toHaveLength(2);
      expect(result.segments[0].segment).toBe('Country: NP');
      expect(result.segments[0].impactPct).toBeGreaterThan(10);
      expect(result.suggestion).toContain('Investigate recent marketing campaigns');
    });

    it('should analyze payer rate drop', async () => {
      const currentKpis = {
        revenue: { totalRevenue: 100000, byCountry: {}, byPaymentMethod: {}, byOGTier: {} },
        engagement: { dailyActiveUsers: 500, monthlyActiveUsers: 10000, avgLiveLength: 30, avgViewersPerSession: 10, battleParticipation: 0.5 },
        monetization: { arpu: 2, arppu: 5, payerRate: 0.05, giftVolume: 200, coinTopups: 800 },
        retention: { d1Retention: 0.6, d7Retention: 0.3, d30Retention: 0.1 },
        creator: { topHostsByRevenue: [], topHostsByGifts: [], topHostsByEngagement: [] },
        safety: { flaggedContentRate: 0.01, bans: 5, appeals: 2 },
        gaming: { gamesPlayed: 100, totalStake: 5000, totalPayout: 4500, houseEdge: 0.1 }
      };

      const previousKpis = {
        revenue: { totalRevenue: 100000, byCountry: {}, byPaymentMethod: {}, byOGTier: {} },
        engagement: { dailyActiveUsers: 500, monthlyActiveUsers: 10000, avgLiveLength: 30, avgViewersPerSession: 10, battleParticipation: 0.5 },
        monetization: { arpu: 2, arppu: 5, payerRate: 0.08, giftVolume: 200, coinTopups: 800 },
        retention: { d1Retention: 0.6, d7Retention: 0.3, d30Retention: 0.1 },
        creator: { topHostsByRevenue: [], topHostsByGifts: [], topHostsByEngagement: [] },
        safety: { flaggedContentRate: 0.01, bans: 5, appeals: 2 },
        gaming: { gamesPlayed: 100, totalStake: 5000, totalPayout: 4500, houseEdge: 0.1 }
      };

      const result = await analyzer.analyze(currentKpis, previousKpis, 'payer_rate_drop');

      expect(result.cause).toBe('Payer rate has declined.');
      expect(result.suggestion).toContain('Review recent changes to monetization features');
    });

    it('should analyze abuse spike', async () => {
      const currentKpis = {
        revenue: { totalRevenue: 100000, byCountry: {}, byPaymentMethod: {}, byOGTier: {} },
        engagement: { dailyActiveUsers: 500, monthlyActiveUsers: 10000, avgLiveLength: 30, avgViewersPerSession: 10, battleParticipation: 0.5 },
        monetization: { arpu: 2, arppu: 5, payerRate: 0.1, giftVolume: 200, coinTopups: 800 },
        retention: { d1Retention: 0.6, d7Retention: 0.3, d30Retention: 0.1 },
        creator: { topHostsByRevenue: [], topHostsByGifts: [], topHostsByEngagement: [] },
        safety: { flaggedContentRate: 0.03, bans: 5, appeals: 2 },
        gaming: { gamesPlayed: 100, totalStake: 5000, totalPayout: 4500, houseEdge: 0.1 }
      };

      const previousKpis = {
        revenue: { totalRevenue: 100000, byCountry: {}, byPaymentMethod: {}, byOGTier: {} },
        engagement: { dailyActiveUsers: 500, monthlyActiveUsers: 10000, avgLiveLength: 30, avgViewersPerSession: 10, battleParticipation: 0.5 },
        monetization: { arpu: 2, arppu: 5, payerRate: 0.1, giftVolume: 200, coinTopups: 800 },
        retention: { d1Retention: 0.6, d7Retention: 0.3, d30Retention: 0.1 },
        creator: { topHostsByRevenue: [], topHostsByGifts: [], topHostsByEngagement: [] },
        safety: { flaggedContentRate: 0.01, bans: 5, appeals: 2 },
        gaming: { gamesPlayed: 100, totalStake: 5000, totalPayout: 4500, houseEdge: 0.1 }
      };

      const result = await analyzer.analyze(currentKpis, previousKpis, 'abuse_spike');

      expect(result.cause).toBe('Significant spike in flagged content/abuse reports.');
      expect(result.suggestion).toContain('Increase moderation efforts');
    });

    it('should analyze engagement drop', async () => {
      const currentKpis = {
        revenue: { totalRevenue: 100000, byCountry: {}, byPaymentMethod: {}, byOGTier: {} },
        engagement: { dailyActiveUsers: 400, monthlyActiveUsers: 10000, avgLiveLength: 30, avgViewersPerSession: 10, battleParticipation: 0.5 },
        monetization: { arpu: 2, arppu: 5, payerRate: 0.1, giftVolume: 200, coinTopups: 800 },
        retention: { d1Retention: 0.6, d7Retention: 0.3, d30Retention: 0.1 },
        creator: { topHostsByRevenue: [], topHostsByGifts: [], topHostsByEngagement: [] },
        safety: { flaggedContentRate: 0.01, bans: 5, appeals: 2 },
        gaming: { gamesPlayed: 100, totalStake: 5000, totalPayout: 4500, houseEdge: 0.1 }
      };

      const previousKpis = {
        revenue: { totalRevenue: 100000, byCountry: {}, byPaymentMethod: {}, byOGTier: {} },
        engagement: { dailyActiveUsers: 500, monthlyActiveUsers: 10000, avgLiveLength: 30, avgViewersPerSession: 10, battleParticipation: 0.5 },
        monetization: { arpu: 2, arppu: 5, payerRate: 0.1, giftVolume: 200, coinTopups: 800 },
        retention: { d1Retention: 0.6, d7Retention: 0.3, d30Retention: 0.1 },
        creator: { topHostsByRevenue: [], topHostsByGifts: [], topHostsByEngagement: [] },
        safety: { flaggedContentRate: 0.01, bans: 5, appeals: 2 },
        gaming: { gamesPlayed: 100, totalStake: 5000, totalPayout: 4500, houseEdge: 0.1 }
      };

      const result = await analyzer.analyze(currentKpis, previousKpis, 'engagement_drop');

      expect(result.cause).toBe('Daily Active Users (DAU) have significantly dropped.');
      expect(result.suggestion).toContain('Investigate recent app updates');
    });

    it('should handle unknown alert type', async () => {
      const currentKpis = {
        revenue: { totalRevenue: 100000, byCountry: {}, byPaymentMethod: {}, byOGTier: {} },
        engagement: { dailyActiveUsers: 500, monthlyActiveUsers: 10000, avgLiveLength: 30, avgViewersPerSession: 10, battleParticipation: 0.5 },
        monetization: { arpu: 2, arppu: 5, payerRate: 0.1, giftVolume: 200, coinTopups: 800 },
        retention: { d1Retention: 0.6, d7Retention: 0.3, d30Retention: 0.1 },
        creator: { topHostsByRevenue: [], topHostsByGifts: [], topHostsByEngagement: [] },
        safety: { flaggedContentRate: 0.01, bans: 5, appeals: 2 },
        gaming: { gamesPlayed: 100, totalStake: 5000, totalPayout: 4500, houseEdge: 0.1 }
      };

      const previousKpis = {
        revenue: { totalRevenue: 100000, byCountry: {}, byPaymentMethod: {}, byOGTier: {} },
        engagement: { dailyActiveUsers: 500, monthlyActiveUsers: 10000, avgLiveLength: 30, avgViewersPerSession: 10, battleParticipation: 0.5 },
        monetization: { arpu: 2, arppu: 5, payerRate: 0.1, giftVolume: 200, coinTopups: 800 },
        retention: { d1Retention: 0.6, d7Retention: 0.3, d30Retention: 0.1 },
        creator: { topHostsByRevenue: [], topHostsByGifts: [], topHostsByEngagement: [] },
        safety: { flaggedContentRate: 0.01, bans: 5, appeals: 2 },
        gaming: { gamesPlayed: 100, totalStake: 5000, totalPayout: 4500, houseEdge: 0.1 }
      };

      const result = await analyzer.analyze(currentKpis, previousKpis, 'unknown_alert_type');

      expect(result.cause).toBe('Unknown cause. Further investigation needed.');
      expect(result.suggestion).toBe('Monitor relevant KPIs and user feedback.');
    });

    it('should sort segments by impact percentage', async () => {
      const currentKpis = {
        revenue: {
          totalRevenue: 50000,
          byCountry: {
            'NP': 10000,
            'US': 20000,
            'IN': 20000
          },
          byPaymentMethod: {},
          byOGTier: {
            'tier1': 5000,
            'tier2': 10000,
            'tier3': 15000,
            'tier4': 10000,
            'tier5': 10000
          }
        },
        engagement: { dailyActiveUsers: 500, monthlyActiveUsers: 10000, avgLiveLength: 30, avgViewersPerSession: 10, battleParticipation: 0.5 },
        monetization: { arpu: 2, arppu: 5, payerRate: 0.1, giftVolume: 200, coinTopups: 800 },
        retention: { d1Retention: 0.6, d7Retention: 0.3, d30Retention: 0.1 },
        creator: { topHostsByRevenue: [], topHostsByGifts: [], topHostsByEngagement: [] },
        safety: { flaggedContentRate: 0.01, bans: 5, appeals: 2 },
        gaming: { gamesPlayed: 100, totalStake: 5000, totalPayout: 4500, houseEdge: 0.1 }
      };

      const previousKpis = {
        revenue: {
          totalRevenue: 100000,
          byCountry: {
            'NP': 50000,
            'US': 30000,
            'IN': 20000
          },
          byPaymentMethod: {},
          byOGTier: {
            'tier1': 10000,
            'tier2': 15000,
            'tier3': 35000,
            'tier4': 20000,
            'tier5': 20000
          }
        },
        engagement: { dailyActiveUsers: 500, monthlyActiveUsers: 10000, avgLiveLength: 30, avgViewersPerSession: 10, battleParticipation: 0.5 },
        monetization: { arpu: 2, arppu: 5, payerRate: 0.1, giftVolume: 200, coinTopups: 800 },
        retention: { d1Retention: 0.6, d7Retention: 0.3, d30Retention: 0.1 },
        creator: { topHostsByRevenue: [], topHostsByGifts: [], topHostsByEngagement: [] },
        safety: { flaggedContentRate: 0.01, bans: 5, appeals: 2 },
        gaming: { gamesPlayed: 100, totalStake: 5000, totalPayout: 4500, houseEdge: 0.1 }
      };

      const result = await analyzer.analyze(currentKpis, previousKpis, 'revenue_drop');

      expect(result.segments).toHaveLength(2);
      expect(result.segments[0].impactPct).toBeGreaterThan(result.segments[1].impactPct);
    });
  });
});

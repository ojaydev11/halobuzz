import { NarrativeGenerator, KPISnapshot } from '../narratives';

describe('NarrativeGenerator', () => {
  let generator: NarrativeGenerator;

  beforeEach(() => {
    generator = new NarrativeGenerator();
  });

  describe('generateNarratives', () => {
    it('should generate narratives from KPI snapshot', () => {
      const kpis: KPISnapshot = {
        revenue: {
          total: 125000,
          growth: 12.5,
          byPaymentMethod: {
            esewa: 45000,
            khalti: 35000,
            stripe: 25000,
            paypal: 20000
          },
          byOGTier: {
            tier1: 15000,
            tier2: 25000,
            tier3: 35000,
            tier4: 30000,
            tier5: 20000
          }
        },
        engagement: {
          dau: 15000,
          mau: 45000,
          totalStreams: 2500,
          growth: 8.3
        },
        monetization: {
          arpu: 8.33,
          arppu: 125.0,
          payerRate: 6.67,
          growth: 15.2
        },
        creators: {
          activeHosts: 250,
          topHostRevenue: 5000,
          avgHostRevenue: 500
        },
        safety: {
          safetyScore: 87.5,
          flaggedContent: 25,
          trend: 'improving' as const
        },
        gaming: {
          gamesPlayed: 5000,
          revenue: 30000,
          houseEdge: 40.0
        }
      };

      const result = generator.generateNarratives(kpis);

      expect(result).toHaveProperty('short');
      expect(result).toHaveProperty('long');
      expect(result).toHaveProperty('insights');
      expect(Array.isArray(result.long)).toBe(true);
      expect(Array.isArray(result.insights)).toBe(true);
      expect(result.short.length).toBeGreaterThan(0);
      expect(result.long.length).toBeGreaterThan(0);
    });

    it('should generate comparison narratives', () => {
      const current: KPISnapshot = {
        revenue: {
          total: 125000,
          growth: 12.5,
          byPaymentMethod: {
            esewa: 45000,
            khalti: 35000,
            stripe: 25000,
            paypal: 20000
          },
          byOGTier: {
            tier1: 15000,
            tier2: 25000,
            tier3: 35000,
            tier4: 30000,
            tier5: 20000
          }
        },
        engagement: {
          dau: 15000,
          mau: 45000,
          totalStreams: 2500,
          growth: 8.3
        },
        monetization: {
          arpu: 8.33,
          arppu: 125.0,
          payerRate: 6.67,
          growth: 15.2
        },
        creators: {
          activeHosts: 250,
          topHostRevenue: 5000,
          avgHostRevenue: 500
        },
        safety: {
          safetyScore: 87.5,
          flaggedContent: 25,
          trend: 'improving' as const
        },
        gaming: {
          gamesPlayed: 5000,
          revenue: 30000,
          houseEdge: 40.0
        }
      };

      const previous: KPISnapshot = {
        revenue: {
          total: 110000,
          growth: 0,
          byPaymentMethod: {
            esewa: 40000,
            khalti: 30000,
            stripe: 25000,
            paypal: 15000
          },
          byOGTier: {
            tier1: 12000,
            tier2: 20000,
            tier3: 30000,
            tier4: 28000,
            tier5: 20000
          }
        },
        engagement: {
          dau: 14000,
          mau: 42000,
          totalStreams: 2300,
          growth: 0
        },
        monetization: {
          arpu: 7.5,
          arppu: 120.0,
          payerRate: 6.0,
          growth: 0
        },
        creators: {
          activeHosts: 240,
          topHostRevenue: 4800,
          avgHostRevenue: 480
        },
        safety: {
          safetyScore: 85.0,
          flaggedContent: 30,
          trend: 'stable' as const
        },
        gaming: {
          gamesPlayed: 4500,
          revenue: 27000,
          houseEdge: 40.0
        }
      };

      const result = generator.generateNarratives(current, previous);

      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.insights[0]).toHaveProperty('metric');
      expect(result.insights[0]).toHaveProperty('direction');
      expect(result.insights[0]).toHaveProperty('magnitude');
      expect(result.insights[0]).toHaveProperty('confidence');
      expect(result.insights[0]).toHaveProperty('description');
    });

    it('should handle zero values gracefully', () => {
      const kpis: KPISnapshot = {
        revenue: {
          total: 0,
          growth: 0,
          byPaymentMethod: {
            esewa: 0,
            khalti: 0,
            stripe: 0,
            paypal: 0
          },
          byOGTier: {
            tier1: 0,
            tier2: 0,
            tier3: 0,
            tier4: 0,
            tier5: 0
          }
        },
        engagement: {
          dau: 0,
          mau: 0,
          totalStreams: 0,
          growth: 0
        },
        monetization: {
          arpu: 0,
          arppu: 0,
          payerRate: 0,
          growth: 0
        },
        creators: {
          activeHosts: 0,
          topHostRevenue: 0,
          avgHostRevenue: 0
        },
        safety: {
          safetyScore: 0,
          flaggedContent: 0,
          trend: 'stable' as const
        },
        gaming: {
          gamesPlayed: 0,
          revenue: 0,
          houseEdge: 0
        }
      };

      const result = generator.generateNarratives(kpis);

      expect(result).toHaveProperty('short');
      expect(result).toHaveProperty('long');
      expect(result).toHaveProperty('insights');
      expect(result.short.length).toBeGreaterThan(0);
    });
  });

  describe('insight generation', () => {
    it('should generate insights with correct structure', () => {
      const current: KPISnapshot = {
        revenue: {
          total: 125000,
          growth: 12.5,
          byPaymentMethod: {
            esewa: 45000,
            khalti: 35000,
            stripe: 25000,
            paypal: 20000
          },
          byOGTier: {
            tier1: 15000,
            tier2: 25000,
            tier3: 35000,
            tier4: 30000,
            tier5: 20000
          }
        },
        engagement: {
          dau: 15000,
          mau: 45000,
          totalStreams: 2500,
          growth: 8.3
        },
        monetization: {
          arpu: 8.33,
          arppu: 125.0,
          payerRate: 6.67,
          growth: 15.2
        },
        creators: {
          activeHosts: 250,
          topHostRevenue: 5000,
          avgHostRevenue: 500
        },
        safety: {
          safetyScore: 87.5,
          flaggedContent: 25,
          trend: 'improving' as const
        },
        gaming: {
          gamesPlayed: 5000,
          revenue: 30000,
          houseEdge: 40.0
        }
      };

      const previous: KPISnapshot = {
        revenue: {
          total: 110000,
          growth: 0,
          byPaymentMethod: {
            esewa: 40000,
            khalti: 30000,
            stripe: 25000,
            paypal: 15000
          },
          byOGTier: {
            tier1: 12000,
            tier2: 20000,
            tier3: 30000,
            tier4: 28000,
            tier5: 20000
          }
        },
        engagement: {
          dau: 14000,
          mau: 42000,
          totalStreams: 2300,
          growth: 0
        },
        monetization: {
          arpu: 7.5,
          arppu: 120.0,
          payerRate: 6.0,
          growth: 0
        },
        creators: {
          activeHosts: 240,
          topHostRevenue: 4800,
          avgHostRevenue: 480
        },
        safety: {
          safetyScore: 85.0,
          flaggedContent: 30,
          trend: 'stable' as const
        },
        gaming: {
          gamesPlayed: 4500,
          revenue: 27000,
          houseEdge: 40.0
        }
      };

      const result = generator.generateNarratives(current, previous);
      const insight = result.insights[0];

      expect(insight).toHaveProperty('metric');
      expect(insight).toHaveProperty('direction');
      expect(['up', 'down', 'stable']).toContain(insight.direction);
      expect(insight).toHaveProperty('magnitude');
      expect(typeof insight.magnitude).toBe('number');
      expect(insight).toHaveProperty('confidence');
      expect(insight.confidence).toBeGreaterThanOrEqual(0);
      expect(insight.confidence).toBeLessThanOrEqual(100);
      expect(insight).toHaveProperty('description');
      expect(typeof insight.description).toBe('string');
    });
  });
});

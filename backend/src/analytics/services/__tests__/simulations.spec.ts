import { SimulationEngine, SimulationRequest, SimulationResult } from '../simulations';
import { AnalyticsForecast } from '../../models/AnalyticsForecast';

// Mock the AnalyticsForecast model
jest.mock('../../models/AnalyticsForecast', () => ({
  AnalyticsForecast: {
    create: jest.fn()
  }
}));

describe('SimulationEngine', () => {
  let simulationEngine: SimulationEngine;

  beforeEach(() => {
    simulationEngine = new SimulationEngine();
    jest.clearAllMocks();
  });

  describe('runSimulation', () => {
    it('should run double_gift_multiplier simulation successfully', async () => {
      const request: SimulationRequest = {
        scenario: 'double_gift_multiplier',
        params: { multiplier: 2.0 },
        horizonDays: 7
      };

      const result = await simulationEngine.runSimulation(request);

      expect(result.scenario).toBe('double_gift_multiplier');
      expect(result.projectedKpis).toHaveLength(7);
      expect(result.baselineKpis).toHaveLength(7);
      expect(result.insights).toContain('Simulated 20% increase in gift-related revenue due to double gift multiplier.');
      expect(result.deltaVsBaseline.revenue.totalRevenue).toBeGreaterThan(0);
    });

    it('should run price_change_coin_pack simulation successfully', async () => {
      const request: SimulationRequest = {
        scenario: 'price_change_coin_pack',
        params: { priceChange: 10 },
        horizonDays: 14
      };

      const result = await simulationEngine.runSimulation(request);

      expect(result.scenario).toBe('price_change_coin_pack');
      expect(result.projectedKpis).toHaveLength(14);
      expect(result.baselineKpis).toHaveLength(14);
      expect(result.insights).toContain('Simulated 10% increase in coin pack revenue due to price change.');
    });

    it('should run og_tier_promo simulation successfully', async () => {
      const request: SimulationRequest = {
        scenario: 'og_tier_promo',
        params: { discountPercent: 20 },
        horizonDays: 30
      };

      const result = await simulationEngine.runSimulation(request);

      expect(result.scenario).toBe('og_tier_promo');
      expect(result.projectedKpis).toHaveLength(30);
      expect(result.baselineKpis).toHaveLength(30);
      expect(result.insights).toContain('Simulated 15% increase in OG tier subscription revenue due to promotion.');
    });

    it('should run festival_skin_push simulation successfully', async () => {
      const request: SimulationRequest = {
        scenario: 'festival_skin_push',
        params: { durationDays: 7 },
        horizonDays: 7
      };

      const result = await simulationEngine.runSimulation(request);

      expect(result.scenario).toBe('festival_skin_push');
      expect(result.projectedKpis).toHaveLength(7);
      expect(result.baselineKpis).toHaveLength(7);
      expect(result.insights).toContain('Simulated 5% increase in revenue from festival skin push.');
    });

    it('should handle segment filtering', async () => {
      const request: SimulationRequest = {
        scenario: 'double_gift_multiplier',
        segment: { country: 'NP', og: 'tier3' },
        horizonDays: 7
      };

      const result = await simulationEngine.runSimulation(request);

      expect(result.scenario).toBe('double_gift_multiplier');
      expect(result.projectedKpis).toHaveLength(7);
      expect(result.baselineKpis).toHaveLength(7);
    });

    it('should store simulation snapshot', async () => {
      const request: SimulationRequest = {
        scenario: 'double_gift_multiplier',
        horizonDays: 7
      };

      await simulationEngine.runSimulation(request);

      expect(AnalyticsForecast.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'simulation',
          scenario: 'double_gift_multiplier',
          horizonDays: 7,
          projectedKpis: expect.any(Array),
          baselineKpis: expect.any(Array),
          deltaVsBaseline: expect.any(Object),
          createdAt: expect.any(Date)
        })
      );
    });

    it('should handle maximum horizon days', async () => {
      const request: SimulationRequest = {
        scenario: 'double_gift_multiplier',
        horizonDays: 60
      };

      const result = await simulationEngine.runSimulation(request);

      expect(result.projectedKpis).toHaveLength(60);
      expect(result.baselineKpis).toHaveLength(60);
    });

    it('should calculate correct delta vs baseline', async () => {
      const request: SimulationRequest = {
        scenario: 'double_gift_multiplier',
        horizonDays: 7
      };

      const result = await simulationEngine.runSimulation(request);

      // Calculate expected delta
      let expectedTotalBaseline = 0;
      let expectedTotalProjected = 0;

      for (let i = 0; i < 7; i++) {
        const baselineRevenue = 1000 + i * 5;
        const projectedRevenue = baselineRevenue * 1.20;
        expectedTotalBaseline += baselineRevenue;
        expectedTotalProjected += projectedRevenue;
      }

      const expectedDelta = expectedTotalProjected - expectedTotalBaseline;

      expect(result.deltaVsBaseline.revenue.totalRevenue).toBeCloseTo(expectedDelta, 2);
    });

    it('should remove duplicate insights', async () => {
      const request: SimulationRequest = {
        scenario: 'double_gift_multiplier',
        horizonDays: 7
      };

      const result = await simulationEngine.runSimulation(request);

      // Should have unique insights
      const uniqueInsights = [...new Set(result.insights)];
      expect(result.insights).toEqual(uniqueInsights);
    });

    it('should handle unknown scenario gracefully', async () => {
      const request = {
        scenario: 'unknown_scenario' as any,
        horizonDays: 7
      };

      const result = await simulationEngine.runSimulation(request);

      expect(result.scenario).toBe('unknown_scenario');
      expect(result.projectedKpis).toHaveLength(7);
      expect(result.baselineKpis).toHaveLength(7);
      // Should not have any insights for unknown scenario
      expect(result.insights).toHaveLength(0);
    });
  });
});

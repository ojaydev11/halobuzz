import { logger } from '../../config/logger';
import { AnalyticsDailyKPI } from '../models/AnalyticsDailyKPI';
import { AnalyticsSimulation } from '../models/AnalyticsSimulation';

export interface SimulationRequest {
  scenario: 'double_gift_multiplier' | 'price_change_coin_pack' | 'og_tier_promo' | 'festival_skin_push';
  params?: Record<string, number | string>;
  segment?: { country?: string; og?: string };
  horizonDays: number; // 7-60
}

export interface SimulationResult {
  scenario: string;
  params: Record<string, any>;
  segment: Record<string, any>;
  horizonDays: number;
  baseline: {
    revenue: number;
    payerRate: number;
    arppu: number;
    engagement: number;
  };
  projected: {
    revenue: number;
    payerRate: number;
    arppu: number;
    engagement: number;
  };
  delta: {
    revenue: number;
    payerRate: number;
    arppu: number;
    engagement: number;
  };
  dailyProjections: Array<{
    date: string;
    revenue: number;
    payerRate: number;
    arppu: number;
    engagement: number;
  }>;
  confidence: number;
  assumptions: string[];
  generatedAt: Date;
}

export class SimulationEngine {
  /**
   * Run a business simulation scenario
   */
  async runSimulation(request: SimulationRequest): Promise<SimulationResult> {
    try {
      logger.info('Running simulation', { scenario: request.scenario, horizonDays: request.horizonDays });

      // Get baseline data
      const baseline = await this.getBaselineData(request.segment);

      // Run scenario-specific simulation
      let result: SimulationResult;
      switch (request.scenario) {
        case 'double_gift_multiplier':
          result = await this.simulateDoubleGiftMultiplier(request, baseline);
          break;
        case 'price_change_coin_pack':
          result = await this.simulatePriceChangeCoinPack(request, baseline);
          break;
        case 'og_tier_promo':
          result = await this.simulateOGTierPromo(request, baseline);
          break;
        case 'festival_skin_push':
          result = await this.simulateFestivalSkinPush(request, baseline);
          break;
        default:
          throw new Error(`Unknown scenario: ${request.scenario}`);
      }

      // Save simulation result
      await this.saveSimulation(result);

      return result;

    } catch (error) {
      logger.error('Simulation failed:', error);
      throw error;
    }
  }

  /**
   * Get baseline data for simulation
   */
  private async getBaselineData(segment?: { country?: string; og?: string }): Promise<any> {
    const matchCondition: any = {
      date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    };

    if (segment?.country && segment.country !== 'ALL') {
      matchCondition.country = segment.country;
    }

    const baselineData = await AnalyticsDailyKPI.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          avgRevenue: { $avg: '$revenue.total' },
          avgPayerRate: { $avg: '$monetization.payerRate' },
          avgARPPU: { $avg: '$monetization.arppu' },
          avgEngagement: { $avg: '$engagement.dau' }
        }
      }
    ]);

    return baselineData[0] || {
      avgRevenue: 4000,
      avgPayerRate: 6.5,
      avgARPPU: 120,
      avgEngagement: 15000
    };
  }

  /**
   * Simulate double gift multiplier scenario
   */
  private async simulateDoubleGiftMultiplier(request: SimulationRequest, baseline: any): Promise<SimulationResult> {
    const multiplier = request.params?.multiplier || 2.0;
    const adoptionRate = request.params?.adoptionRate || 0.3; // 30% adoption
    const horizonDays = request.horizonDays;

    // Calculate impact
    const giftRevenueImpact = baseline.avgRevenue * 0.4 * adoptionRate * (multiplier - 1); // 40% of revenue from gifts
    const engagementImpact = baseline.avgEngagement * adoptionRate * 0.15; // 15% engagement boost

    const dailyProjections = this.generateDailyProjections(
      baseline,
      {
        revenue: giftRevenueImpact,
        payerRate: 0, // No direct impact on payer rate
        arppu: giftRevenueImpact / baseline.avgEngagement * 100, // ARPPU increase
        engagement: engagementImpact
      },
      horizonDays
    );

    return {
      scenario: 'double_gift_multiplier',
      params: { multiplier, adoptionRate },
      segment: request.segment || {},
      horizonDays,
      baseline: {
        revenue: baseline.avgRevenue,
        payerRate: baseline.avgPayerRate,
        arppu: baseline.avgARPPU,
        engagement: baseline.avgEngagement
      },
      projected: {
        revenue: baseline.avgRevenue + giftRevenueImpact,
        payerRate: baseline.avgPayerRate,
        arppu: baseline.avgARPPU + (giftRevenueImpact / baseline.avgEngagement * 100),
        engagement: baseline.avgEngagement + engagementImpact
      },
      delta: {
        revenue: giftRevenueImpact,
        payerRate: 0,
        arppu: giftRevenueImpact / baseline.avgEngagement * 100,
        engagement: engagementImpact
      },
      dailyProjections,
      confidence: 75,
      assumptions: [
        `${adoptionRate * 100}% of users adopt the double gift multiplier`,
        `Gift revenue represents 40% of total revenue`,
        `Engagement increases by 15% for adopting users`,
        `No impact on payer conversion rate`
      ],
      generatedAt: new Date()
    };
  }

  /**
   * Simulate price change for coin packs
   */
  private async simulatePriceChangeCoinPack(request: SimulationRequest, baseline: any): Promise<SimulationResult> {
    const priceChange = request.params?.priceChange || -0.2; // 20% price reduction
    const elasticity = request.params?.elasticity || 1.5; // Price elasticity
    const horizonDays = request.horizonDays;

    // Calculate impact based on price elasticity
    const volumeChange = Math.abs(priceChange) * elasticity;
    const revenueImpact = baseline.avgRevenue * 0.3 * (1 + priceChange) * (1 + volumeChange) - baseline.avgRevenue * 0.3; // 30% of revenue from coin packs
    const payerRateImpact = baseline.avgPayerRate * volumeChange * 0.5; // 50% of volume change affects payer rate

    const dailyProjections = this.generateDailyProjections(
      baseline,
      {
        revenue: revenueImpact,
        payerRate: payerRateImpact,
        arppu: revenueImpact / baseline.avgEngagement * 100,
        engagement: baseline.avgEngagement * volumeChange * 0.1 // 10% engagement boost from lower prices
      },
      horizonDays
    );

    return {
      scenario: 'price_change_coin_pack',
      params: { priceChange, elasticity },
      segment: request.segment || {},
      horizonDays,
      baseline: {
        revenue: baseline.avgRevenue,
        payerRate: baseline.avgPayerRate,
        arppu: baseline.avgARPPU,
        engagement: baseline.avgEngagement
      },
      projected: {
        revenue: baseline.avgRevenue + revenueImpact,
        payerRate: baseline.avgPayerRate + payerRateImpact,
        arppu: baseline.avgARPPU + (revenueImpact / baseline.avgEngagement * 100),
        engagement: baseline.avgEngagement + (baseline.avgEngagement * volumeChange * 0.1)
      },
      delta: {
        revenue: revenueImpact,
        payerRate: payerRateImpact,
        arppu: revenueImpact / baseline.avgEngagement * 100,
        engagement: baseline.avgEngagement * volumeChange * 0.1
      },
      dailyProjections,
      confidence: 80,
      assumptions: [
        `Price elasticity of ${elasticity} for coin pack purchases`,
        `Coin pack revenue represents 30% of total revenue`,
        `Volume increase of ${(volumeChange * 100).toFixed(1)}% due to price change`,
        `Payer rate increases proportionally with volume`
      ],
      generatedAt: new Date()
    };
  }

  /**
   * Simulate OG tier promotion
   */
  private async simulateOGTierPromo(request: SimulationRequest, baseline: any): Promise<SimulationResult> {
    const discountRate = request.params?.discountRate || 0.3; // 30% discount
    const targetTier = request.params?.targetTier || 'tier3';
    const conversionRate = request.params?.conversionRate || 0.15; // 15% conversion
    const horizonDays = request.horizonDays;

    // Calculate impact
    const ogRevenueImpact = baseline.avgRevenue * 0.25 * conversionRate * (1 - discountRate); // 25% of revenue from OG tiers
    const engagementImpact = baseline.avgEngagement * conversionRate * 0.25; // 25% engagement boost for new OG users

    const dailyProjections = this.generateDailyProjections(
      baseline,
      {
        revenue: ogRevenueImpact,
        payerRate: baseline.avgPayerRate * conversionRate * 0.3, // 30% of conversions become payers
        arppu: ogRevenueImpact / baseline.avgEngagement * 100,
        engagement: engagementImpact
      },
      horizonDays
    );

    return {
      scenario: 'og_tier_promo',
      params: { discountRate, targetTier, conversionRate },
      segment: request.segment || {},
      horizonDays,
      baseline: {
        revenue: baseline.avgRevenue,
        payerRate: baseline.avgPayerRate,
        arppu: baseline.avgARPPU,
        engagement: baseline.avgEngagement
      },
      projected: {
        revenue: baseline.avgRevenue + ogRevenueImpact,
        payerRate: baseline.avgPayerRate + (baseline.avgPayerRate * conversionRate * 0.3),
        arppu: baseline.avgARPPU + (ogRevenueImpact / baseline.avgEngagement * 100),
        engagement: baseline.avgEngagement + engagementImpact
      },
      delta: {
        revenue: ogRevenueImpact,
        payerRate: baseline.avgPayerRate * conversionRate * 0.3,
        arppu: ogRevenueImpact / baseline.avgEngagement * 100,
        engagement: engagementImpact
      },
      dailyProjections,
      confidence: 70,
      assumptions: [
        `${conversionRate * 100}% of eligible users convert to ${targetTier}`,
        `OG tier revenue represents 25% of total revenue`,
        `30% of conversions become new payers`,
        `New OG users show 25% higher engagement`
      ],
      generatedAt: new Date()
    };
  }

  /**
   * Simulate festival skin push
   */
  private async simulateFestivalSkinPush(request: SimulationRequest, baseline: any): Promise<SimulationResult> {
    const skinPrice = request.params?.skinPrice || 500; // 500 coins per skin
    const adoptionRate = request.params?.adoptionRate || 0.2; // 20% adoption
    const festivalDuration = request.params?.festivalDuration || 7; // 7 days
    const horizonDays = request.horizonDays;

    // Calculate impact
    const skinRevenueImpact = baseline.avgEngagement * adoptionRate * skinPrice * 0.1; // 10% of adopters buy skins
    const engagementImpact = baseline.avgEngagement * adoptionRate * 0.2; // 20% engagement boost during festival

    const dailyProjections = this.generateDailyProjections(
      baseline,
      {
        revenue: skinRevenueImpact,
        payerRate: baseline.avgPayerRate * adoptionRate * 0.2, // 20% of adopters become payers
        arppu: skinRevenueImpact / baseline.avgEngagement * 100,
        engagement: engagementImpact
      },
      horizonDays
    );

    return {
      scenario: 'festival_skin_push',
      params: { skinPrice, adoptionRate, festivalDuration },
      segment: request.segment || {},
      horizonDays,
      baseline: {
        revenue: baseline.avgRevenue,
        payerRate: baseline.avgPayerRate,
        arppu: baseline.avgARPPU,
        engagement: baseline.avgEngagement
      },
      projected: {
        revenue: baseline.avgRevenue + skinRevenueImpact,
        payerRate: baseline.avgPayerRate + (baseline.avgPayerRate * adoptionRate * 0.2),
        arppu: baseline.avgARPPU + (skinRevenueImpact / baseline.avgEngagement * 100),
        engagement: baseline.avgEngagement + engagementImpact
      },
      delta: {
        revenue: skinRevenueImpact,
        payerRate: baseline.avgPayerRate * adoptionRate * 0.2,
        arppu: skinRevenueImpact / baseline.avgEngagement * 100,
        engagement: engagementImpact
      },
      dailyProjections,
      confidence: 65,
      assumptions: [
        `${adoptionRate * 100}% of users adopt festival skins`,
        `Skin price of ${skinPrice} coins per skin`,
        `10% of adopters purchase skins`,
        `20% engagement boost during festival period`
      ],
      generatedAt: new Date()
    };
  }

  /**
   * Generate daily projections for the simulation horizon
   */
  private generateDailyProjections(
    baseline: any,
    dailyImpact: any,
    horizonDays: number
  ): Array<{
    date: string;
    revenue: number;
    payerRate: number;
    arppu: number;
    engagement: number;
  }> {
    const projections = [];
    const startDate = new Date();

    for (let i = 0; i < horizonDays; i++) {
      const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      
      // Apply gradual adoption curve (starts low, peaks mid-period, tapers off)
      const adoptionCurve = Math.sin((i / horizonDays) * Math.PI) * 0.8 + 0.2;
      
      projections.push({
        date: date.toISOString().split('T')[0],
        revenue: baseline.avgRevenue + (dailyImpact.revenue * adoptionCurve),
        payerRate: baseline.avgPayerRate + (dailyImpact.payerRate * adoptionCurve),
        arppu: baseline.avgARPPU + (dailyImpact.arppu * adoptionCurve),
        engagement: baseline.avgEngagement + (dailyImpact.engagement * adoptionCurve)
      });
    }

    return projections;
  }

  /**
   * Save simulation result to database
   */
  private async saveSimulation(result: SimulationResult): Promise<void> {
    try {
      const simulation = new AnalyticsSimulation({
        scenario: result.scenario,
        params: result.params,
        segment: result.segment,
        horizonDays: result.horizonDays,
        baseline: result.baseline,
        projected: result.projected,
        delta: result.delta,
        dailyProjections: result.dailyProjections,
        confidence: result.confidence,
        assumptions: result.assumptions,
        generatedAt: result.generatedAt
      });

      await simulation.save();
      logger.info('Simulation saved to database', { scenario: result.scenario });

    } catch (error) {
      logger.error('Failed to save simulation:', error);
      // Don't throw error, simulation can still be returned
    }
  }
}

export default SimulationEngine;

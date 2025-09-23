import { logger } from '../../config/logger';
import { KPIMetrics } from '../queries/kpis';

export interface KPISnapshot {
  revenue: {
    total: number;
    growth: number;
    byPaymentMethod: {
      esewa: number;
      khalti: number;
      stripe: number;
      paypal: number;
    };
    byOGTier: {
      tier1: number;
      tier2: number;
      tier3: number;
      tier4: number;
      tier5: number;
    };
  };
  engagement: {
    dau: number;
    mau: number;
    totalStreams: number;
    growth: number;
  };
  monetization: {
    arpu: number;
    arppu: number;
    payerRate: number;
    growth: number;
  };
  creators: {
    activeHosts: number;
    topHostRevenue: number;
    avgHostRevenue: number;
  };
  safety: {
    safetyScore: number;
    flaggedContent: number;
    trend: 'improving' | 'stable' | 'declining';
  };
  gaming: {
    gamesPlayed: number;
    revenue: number;
    houseEdge: number;
  };
}

export interface Insight {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  magnitude: number; // percentage change
  segment?: string;
  confidence: number; // 0-100
  description: string;
}

export interface NarrativeResult {
  short: string;
  long: string[];
  insights: Insight[];
}

export class NarrativeGenerator {
  /**
   * Generate executive narratives from KPI snapshots
   */
  generateNarratives(kpis: KPISnapshot, compare?: KPISnapshot): NarrativeResult {
    try {
      logger.info('Generating narratives from KPI snapshot');

      const insights = this.generateInsights(kpis, compare);
      const short = this.generateShortNarrative(insights);
      const long = this.generateLongNarrative(insights, kpis);

      return {
        short,
        long,
        insights
      };

    } catch (error) {
      logger.error('Failed to generate narratives:', error);
      throw error;
    }
  }

  /**
   * Generate insights from KPI comparison
   */
  private generateInsights(kpis: KPISnapshot, compare?: KPISnapshot): Insight[] {
    const insights: Insight[] = [];

    if (!compare) {
      // No comparison data, generate baseline insights
      return this.generateBaselineInsights(kpis);
    }

    // Revenue insights
    if (kpis.revenue.growth !== 0) {
      insights.push({
        metric: 'revenue.total',
        direction: kpis.revenue.growth > 0 ? 'up' : 'down',
        magnitude: Math.abs(kpis.revenue.growth),
        confidence: this.calculateConfidence(kpis.revenue.total, compare.revenue.total),
        description: `Revenue ${kpis.revenue.growth > 0 ? 'increased' : 'decreased'} by ${Math.abs(kpis.revenue.growth).toFixed(1)}%`
      });
    }

    // Engagement insights
    if (kpis.engagement.growth !== 0) {
      insights.push({
        metric: 'engagement.dau',
        direction: kpis.engagement.growth > 0 ? 'up' : 'down',
        magnitude: Math.abs(kpis.engagement.growth),
        confidence: this.calculateConfidence(kpis.engagement.dau, compare.engagement.dau),
        description: `Daily active users ${kpis.engagement.growth > 0 ? 'increased' : 'decreased'} by ${Math.abs(kpis.engagement.growth).toFixed(1)}%`
      });
    }

    // Monetization insights
    if (kpis.monetization.growth !== 0) {
      insights.push({
        metric: 'monetization.arpu',
        direction: kpis.monetization.growth > 0 ? 'up' : 'down',
        magnitude: Math.abs(kpis.monetization.growth),
        confidence: this.calculateConfidence(kpis.monetization.arpu, compare.monetization.arpu),
        description: `ARPU ${kpis.monetization.growth > 0 ? 'increased' : 'decreased'} by ${Math.abs(kpis.monetization.growth).toFixed(1)}%`
      });
    }

    // Payment method insights
    const paymentMethods = ['esewa', 'khalti', 'stripe', 'paypal'] as const;
    paymentMethods.forEach(method => {
      const current = kpis.revenue.byPaymentMethod[method];
      const previous = compare.revenue.byPaymentMethod[method];
      if (previous > 0) {
        const change = ((current - previous) / previous) * 100;
        if (Math.abs(change) > 5) { // Only include significant changes
          insights.push({
            metric: `revenue.byPaymentMethod.${method}`,
            direction: change > 0 ? 'up' : 'down',
            magnitude: Math.abs(change),
            segment: method.toUpperCase(),
            confidence: this.calculateConfidence(current, previous),
            description: `${method.toUpperCase()} revenue ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)}%`
          });
        }
      }
    });

    // OG tier insights
    const ogTiers = ['tier1', 'tier2', 'tier3', 'tier4', 'tier5'] as const;
    ogTiers.forEach(tier => {
      const current = kpis.revenue.byOGTier[tier];
      const previous = compare.revenue.byOGTier[tier];
      if (previous > 0) {
        const change = ((current - previous) / previous) * 100;
        if (Math.abs(change) > 10) { // Only include significant changes
          insights.push({
            metric: `revenue.byOGTier.${tier}`,
            direction: change > 0 ? 'up' : 'down',
            magnitude: Math.abs(change),
            segment: tier.toUpperCase(),
            confidence: this.calculateConfidence(current, previous),
            description: `OG ${tier} revenue ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)}%`
          });
        }
      }
    });

    // Safety insights
    if (kpis.safety.trend !== 'stable') {
      insights.push({
        metric: 'safety.safetyScore',
        direction: kpis.safety.trend === 'improving' ? 'up' : 'down',
        magnitude: Math.abs(100 - kpis.safety.safetyScore),
        confidence: 85,
        description: `Safety score is ${kpis.safety.trend} with score of ${kpis.safety.safetyScore.toFixed(1)}`
      });
    }

    return insights.sort((a, b) => b.magnitude - a.magnitude); // Sort by magnitude
  }

  /**
   * Generate baseline insights when no comparison data
   */
  private generateBaselineInsights(kpis: KPISnapshot): Insight[] {
    const insights: Insight[] = [];

    // Revenue insights
    insights.push({
      metric: 'revenue.total',
      direction: 'stable',
      magnitude: 0,
      confidence: 100,
      description: `Total revenue of ${kpis.revenue.total.toLocaleString()} NPR`
    });

    // Engagement insights
    insights.push({
      metric: 'engagement.dau',
      direction: 'stable',
      magnitude: 0,
      confidence: 100,
      description: `${kpis.engagement.dau.toLocaleString()} daily active users`
    });

    // Monetization insights
    insights.push({
      metric: 'monetization.arpu',
      direction: 'stable',
      magnitude: 0,
      confidence: 100,
      description: `ARPU of ${kpis.monetization.arpu.toFixed(2)} NPR`
    });

    // Top payment method
    const paymentMethods = Object.entries(kpis.revenue.byPaymentMethod);
    const topPaymentMethod = paymentMethods.reduce((max, [method, amount]) => 
      amount > max[1] ? [method, amount] : max, ['', 0]);

    if (topPaymentMethod[1] > 0) {
      insights.push({
        metric: 'revenue.byPaymentMethod',
        direction: 'stable',
        magnitude: 0,
        segment: topPaymentMethod[0].toUpperCase(),
        confidence: 100,
        description: `${topPaymentMethod[0].toUpperCase()} leads with ${topPaymentMethod[1].toLocaleString()} NPR`
      });
    }

    return insights;
  }

  /**
   * Generate short narrative (2-3 sentences)
   */
  private generateShortNarrative(insights: Insight[]): string {
    if (insights.length === 0) {
      return "HaloBuzz shows stable performance across all key metrics with consistent user engagement and revenue generation.";
    }

    const topInsights = insights.slice(0, 3);
    const positiveInsights = topInsights.filter(i => i.direction === 'up');
    const negativeInsights = topInsights.filter(i => i.direction === 'down');

    let narrative = "";

    if (positiveInsights.length > 0) {
      const topPositive = positiveInsights[0];
      narrative += `HaloBuzz shows strong growth with ${topPositive.description.toLowerCase()}. `;
    }

    if (negativeInsights.length > 0) {
      const topNegative = negativeInsights[0];
      narrative += `However, ${topNegative.description.toLowerCase()}. `;
    }

    if (positiveInsights.length > 1) {
      narrative += `Overall performance indicates positive momentum across multiple metrics.`;
    } else if (negativeInsights.length > 1) {
      narrative += `Multiple areas require attention to maintain growth trajectory.`;
    } else {
      narrative += `The platform maintains steady performance with balanced growth indicators.`;
    }

    return narrative.trim();
  }

  /**
   * Generate long narrative (4-8 bullet points)
   */
  private generateLongNarrative(insights: Insight[], kpis: KPISnapshot): string[] {
    const narrative: string[] = [];

    // Revenue summary
    narrative.push(`💰 Revenue Performance: ${kpis.revenue.total.toLocaleString()} NPR total revenue${kpis.revenue.growth !== 0 ? ` (${kpis.revenue.growth > 0 ? '+' : ''}${kpis.revenue.growth.toFixed(1)}% growth)` : ''}`);

    // Engagement summary
    narrative.push(`👥 User Engagement: ${kpis.engagement.dau.toLocaleString()} daily active users${kpis.engagement.growth !== 0 ? ` (${kpis.engagement.growth > 0 ? '+' : ''}${kpis.engagement.growth.toFixed(1)}% growth)` : ''} with ${kpis.engagement.totalStreams.toLocaleString()} total streams`);

    // Monetization summary
    narrative.push(`💳 Monetization: ARPU of ${kpis.monetization.arpu.toFixed(2)} NPR with ${kpis.monetization.payerRate.toFixed(1)}% payer rate${kpis.monetization.growth !== 0 ? ` (${kpis.monetization.growth > 0 ? '+' : ''}${kpis.monetization.growth.toFixed(1)}% growth)` : ''}`);

    // Creator summary
    narrative.push(`🎭 Creator Economy: ${kpis.creators.activeHosts.toLocaleString()} active hosts generating average revenue of ${kpis.creators.avgHostRevenue.toFixed(0)} NPR`);

    // Safety summary
    narrative.push(`🛡️ Safety & Trust: Safety score of ${kpis.safety.safetyScore.toFixed(1)}/100 with ${kpis.safety.flaggedContent} flagged content items (trend: ${kpis.safety.trend})`);

    // Gaming summary
    narrative.push(`🎮 Gaming Performance: ${kpis.gaming.gamesPlayed.toLocaleString()} games played generating ${kpis.gaming.revenue.toLocaleString()} NPR revenue with ${kpis.gaming.houseEdge.toFixed(1)}% house edge`);

    // Top insights
    if (insights.length > 0) {
      const topInsights = insights.slice(0, 3);
      narrative.push(`📈 Key Insights: ${topInsights.map(i => i.description).join('; ')}`);
    }

    // Payment method breakdown
    const paymentMethods = Object.entries(kpis.revenue.byPaymentMethod)
      .filter(([_, amount]) => amount > 0)
      .sort(([_, a], [__, b]) => b - a);
    
    if (paymentMethods.length > 0) {
      const topMethod = paymentMethods[0];
      narrative.push(`💳 Payment Leader: ${topMethod[0].toUpperCase()} dominates with ${topMethod[1].toLocaleString()} NPR (${((topMethod[1] / kpis.revenue.total) * 100).toFixed(1)}% of total)`);
    }

    return narrative.slice(0, 8); // Limit to 8 bullet points
  }

  /**
   * Calculate confidence score based on data quality
   */
  private calculateConfidence(current: number, previous: number): number {
    if (previous === 0) return 50; // Low confidence for zero baseline
    
    const ratio = current / previous;
    if (ratio < 0.1 || ratio > 10) return 60; // Low confidence for extreme changes
    if (ratio < 0.5 || ratio > 2) return 75; // Medium confidence for large changes
    return 90; // High confidence for reasonable changes
  }
}

export default NarrativeGenerator;

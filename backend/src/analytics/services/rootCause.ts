import { logger } from '../../config/logger';
import { AnalyticsDailyKPI } from '../models/AnalyticsDailyKPI';
import { AnalyticsFunnel } from '../models/AnalyticsFunnel';
import { AnalyticsCohort } from '../models/AnalyticsCohort';

export interface RootCauseAnalysis {
  cause: string;
  segments: Array<{
    segment: string;
    impactPct: number;
    description: string;
  }>;
  suggestion: string;
  confidence: number;
  analysisType: string;
}

export interface AlertContext {
  type: string;
  metric: string;
  currentValue: number;
  thresholdValue: number;
  deviation: number;
  timeWindow: string;
  country?: string;
}

export class RootCauseAnalyzer {
  /**
   * Analyze root cause for an alert
   */
  async analyzeRootCause(alertContext: AlertContext): Promise<RootCauseAnalysis> {
    try {
      logger.info('Analyzing root cause for alert', { type: alertContext.type, metric: alertContext.metric });

      // Get recent data for analysis
      const recentData = await this.getRecentData(alertContext);
      
      // Analyze based on alert type
      let analysis: RootCauseAnalysis;
      switch (alertContext.type) {
        case 'revenue_drop':
          analysis = await this.analyzeRevenueDrop(alertContext, recentData);
          break;
        case 'payer_rate_drop':
          analysis = await this.analyzePayerRateDrop(alertContext, recentData);
          break;
        case 'abuse_spike':
          analysis = await this.analyzeAbuseSpike(alertContext, recentData);
          break;
        case 'engagement_drop':
          analysis = await this.analyzeEngagementDrop(alertContext, recentData);
          break;
        case 'churn_spike':
          analysis = await this.analyzeChurnSpike(alertContext, recentData);
          break;
        case 'infra_error':
          analysis = await this.analyzeInfraError(alertContext, recentData);
          break;
        default:
          analysis = this.generateGenericAnalysis(alertContext);
      }

      return analysis;

    } catch (error) {
      logger.error('Root cause analysis failed:', error);
      return this.generateGenericAnalysis(alertContext);
    }
  }

  /**
   * Get recent data for analysis
   */
  private async getRecentData(alertContext: AlertContext): Promise<any> {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twentyEightDaysAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

    const matchCondition: any = {
      date: { $gte: sevenDaysAgo, $lte: now }
    };

    if (alertContext.country && alertContext.country !== 'ALL') {
      matchCondition.country = alertContext.country;
    }

    const [recentKPIs, historicalKPIs, funnelData, cohortData] = await Promise.all([
      AnalyticsDailyKPI.find(matchCondition).sort({ date: -1 }).limit(7),
      AnalyticsDailyKPI.find({
        ...matchCondition,
        date: { $gte: twentyEightDaysAgo, $lt: sevenDaysAgo }
      }).sort({ date: -1 }).limit(21),
      AnalyticsFunnel.find(matchCondition).sort({ date: -1 }).limit(7),
      AnalyticsCohort.findOne({ country: alertContext.country || 'ALL' }).sort({ cohortDate: -1 })
    ]);

    return {
      recentKPIs,
      historicalKPIs,
      funnelData,
      cohortData
    };
  }

  /**
   * Analyze revenue drop root cause
   */
  private async analyzeRevenueDrop(alertContext: AlertContext, data: any): Promise<RootCauseAnalysis> {
    const segments: Array<{ segment: string; impactPct: number; description: string }> = [];
    let primaryCause = 'Unknown revenue decline';
    let suggestion = 'Investigate payment gateway issues and user behavior patterns';

    // Analyze payment method contribution
    if (data.recentKPIs.length > 0 && data.historicalKPIs.length > 0) {
      const recent = data.recentKPIs[0];
      const historical = data.historicalKPIs.reduce((sum: any, kpi: any) => ({
        revenue: sum.revenue + kpi.revenue.total,
        byPaymentMethod: {
          esewa: sum.byPaymentMethod.esewa + kpi.revenue.byPaymentMethod.esewa,
          khalti: sum.byPaymentMethod.khalti + kpi.revenue.byPaymentMethod.khalti,
          stripe: sum.byPaymentMethod.stripe + kpi.revenue.byPaymentMethod.stripe,
          paypal: sum.byPaymentMethod.paypal + kpi.revenue.byPaymentMethod.paypal
        }
      }), { revenue: 0, byPaymentMethod: { esewa: 0, khalti: 0, stripe: 0, paypal: 0 } });

      const avgHistorical = {
        revenue: historical.revenue / data.historicalKPIs.length,
        byPaymentMethod: {
          esewa: historical.byPaymentMethod.esewa / data.historicalKPIs.length,
          khalti: historical.byPaymentMethod.khalti / data.historicalKPIs.length,
          stripe: historical.byPaymentMethod.stripe / data.historicalKPIs.length,
          paypal: historical.byPaymentMethod.paypal / data.historicalKPIs.length
        }
      };

      // Check payment method impacts
      const paymentMethods = ['esewa', 'khalti', 'stripe', 'paypal'] as const;
      paymentMethods.forEach(method => {
        const recentAmount = recent.revenue.byPaymentMethod[method];
        const historicalAmount = avgHistorical.byPaymentMethod[method];
        if (historicalAmount > 0) {
          const impact = ((recentAmount - historicalAmount) / historicalAmount) * 100;
          if (Math.abs(impact) > 10) {
            segments.push({
              segment: method.toUpperCase(),
              impactPct: Math.abs(impact),
              description: `${method.toUpperCase()} revenue ${impact > 0 ? 'increased' : 'decreased'} by ${Math.abs(impact).toFixed(1)}%`
            });
          }
        }
      });

      // Determine primary cause
      const largestImpact = segments.reduce((max, seg) => seg.impactPct > max.impactPct ? seg : max, { impactPct: 0, segment: '', description: '' });
      if (largestImpact.impactPct > 20) {
        primaryCause = `Primary revenue decline from ${largestImpact.segment} payment method`;
        suggestion = `Contact ${largestImpact.segment} support to investigate payment processing issues`;
      }
    }

    return {
      cause: primaryCause,
      segments,
      suggestion,
      confidence: segments.length > 0 ? 80 : 60,
      analysisType: 'revenue_drop'
    };
  }

  /**
   * Analyze payer rate drop root cause
   */
  private async analyzePayerRateDrop(alertContext: AlertContext, data: any): Promise<RootCauseAnalysis> {
    const segments: Array<{ segment: string; impactPct: number; description: string }> = [];
    let primaryCause = 'Unknown payer rate decline';
    let suggestion = 'Review payment gateway performance and user onboarding flow';

    // Analyze funnel data
    if (data.funnelData.length > 0) {
      const recentFunnel = data.funnelData[0];
      
      // Check signup to first payment conversion
      if (recentFunnel.signupToFirstPayment) {
        const conversionRate = recentFunnel.signupToFirstPayment.conversionRate;
        if (conversionRate < 5) {
          segments.push({
            segment: 'Signup Conversion',
            impactPct: 100 - conversionRate,
            description: `Signup to payment conversion rate is only ${conversionRate.toFixed(1)}%`
          });
          primaryCause = 'Low signup to payment conversion rate';
          suggestion = 'Improve onboarding flow and payment gateway integration';
        }
      }
    }

    // Analyze cohort data
    if (data.cohortData) {
      const cohort = data.cohortData;
      if (cohort.retention.d7 < 20) {
        segments.push({
          segment: 'User Retention',
          impactPct: 100 - cohort.retention.d7,
          description: `7-day retention rate is only ${cohort.retention.d7.toFixed(1)}%`
        });
        if (primaryCause === 'Unknown payer rate decline') {
          primaryCause = 'Poor user retention affecting payer conversion';
          suggestion = 'Focus on improving user engagement and retention strategies';
        }
      }
    }

    return {
      cause: primaryCause,
      segments,
      suggestion,
      confidence: segments.length > 0 ? 75 : 60,
      analysisType: 'payer_rate_drop'
    };
  }

  /**
   * Analyze abuse spike root cause
   */
  private async analyzeAbuseSpike(alertContext: AlertContext, data: any): Promise<RootCauseAnalysis> {
    const segments: Array<{ segment: string; impactPct: number; description: string }> = [];
    let primaryCause = 'Increased content violations detected';
    let suggestion = 'Review moderation policies and increase automated content screening';

    // Analyze recent safety metrics
    if (data.recentKPIs.length > 0) {
      const recent = data.recentKPIs[0];
      const flaggedContent = recent.safety.flaggedContent;
      const bannedUsers = recent.safety.bannedUsers;
      
      if (flaggedContent > 50) {
        segments.push({
          segment: 'Content Moderation',
          impactPct: Math.min(100, flaggedContent * 2),
          description: `${flaggedContent} content items flagged in recent period`
        });
      }

      if (bannedUsers > 10) {
        segments.push({
          segment: 'User Bans',
          impactPct: Math.min(100, bannedUsers * 5),
          description: `${bannedUsers} users banned in recent period`
        });
      }

      if (flaggedContent > 100) {
        primaryCause = 'Massive content violation spike detected';
        suggestion = 'Implement emergency moderation protocols and review content policies';
      }
    }

    return {
      cause: primaryCause,
      segments,
      suggestion,
      confidence: segments.length > 0 ? 85 : 70,
      analysisType: 'abuse_spike'
    };
  }

  /**
   * Analyze engagement drop root cause
   */
  private async analyzeEngagementDrop(alertContext: AlertContext, data: any): Promise<RootCauseAnalysis> {
    const segments: Array<{ segment: string; impactPct: number; description: string }> = [];
    let primaryCause = 'User engagement decline detected';
    let suggestion = 'Review content quality and user experience improvements';

    // Analyze engagement metrics
    if (data.recentKPIs.length > 0 && data.historicalKPIs.length > 0) {
      const recent = data.recentKPIs[0];
      const historical = data.historicalKPIs.reduce((sum: any, kpi: any) => ({
        totalStreams: sum.totalStreams + kpi.engagement.totalStreams,
        totalViewers: sum.totalViewers + kpi.engagement.totalViewers,
        giftSent: sum.giftSent + kpi.engagement.giftSent
      }), { totalStreams: 0, totalViewers: 0, giftSent: 0 });

      const avgHistorical = {
        totalStreams: historical.totalStreams / data.historicalKPIs.length,
        totalViewers: historical.totalViewers / data.historicalKPIs.length,
        giftSent: historical.giftSent / data.historicalKPIs.length
      };

      // Check stream activity
      const streamImpact = ((recent.engagement.totalStreams - avgHistorical.totalStreams) / avgHistorical.totalStreams) * 100;
      if (streamImpact < -15) {
        segments.push({
          segment: 'Stream Activity',
          impactPct: Math.abs(streamImpact),
          description: `Stream count decreased by ${Math.abs(streamImpact).toFixed(1)}%`
        });
        primaryCause = 'Significant drop in stream creation activity';
        suggestion = 'Investigate stream creation barriers and creator incentives';
      }

      // Check viewer engagement
      const viewerImpact = ((recent.engagement.totalViewers - avgHistorical.totalViewers) / avgHistorical.totalViewers) * 100;
      if (viewerImpact < -20) {
        segments.push({
          segment: 'Viewer Engagement',
          impactPct: Math.abs(viewerImpact),
          description: `Viewer count decreased by ${Math.abs(viewerImpact).toFixed(1)}%`
        });
        if (primaryCause === 'User engagement decline detected') {
          primaryCause = 'Significant drop in viewer engagement';
          suggestion = 'Review content discovery algorithms and user experience';
        }
      }
    }

    return {
      cause: primaryCause,
      segments,
      suggestion,
      confidence: segments.length > 0 ? 80 : 65,
      analysisType: 'engagement_drop'
    };
  }

  /**
   * Analyze churn spike root cause
   */
  private async analyzeChurnSpike(alertContext: AlertContext, data: any): Promise<RootCauseAnalysis> {
    const segments: Array<{ segment: string; impactPct: number; description: string }> = [];
    let primaryCause = 'User churn rate increase detected';
    let suggestion = 'Analyze user feedback and improve retention strategies';

    // Analyze cohort data
    if (data.cohortData) {
      const cohort = data.cohortData;
      
      if (cohort.churn.churnRate > 20) {
        segments.push({
          segment: 'Cohort Churn',
          impactPct: cohort.churn.churnRate,
          description: `Churn rate of ${cohort.churn.churnRate.toFixed(1)}% in recent cohort`
        });
        primaryCause = 'High churn rate in recent user cohort';
        suggestion = 'Focus on improving onboarding experience and early user engagement';
      }

      if (cohort.retention.d7 < 25) {
        segments.push({
          segment: 'Early Retention',
          impactPct: 100 - cohort.retention.d7,
          description: `7-day retention only ${cohort.retention.d7.toFixed(1)}%`
        });
        if (primaryCause === 'User churn rate increase detected') {
          primaryCause = 'Poor early retention leading to high churn';
          suggestion = 'Improve first-week user experience and engagement features';
        }
      }
    }

    return {
      cause: primaryCause,
      segments,
      suggestion,
      confidence: segments.length > 0 ? 75 : 60,
      analysisType: 'churn_spike'
    };
  }

  /**
   * Analyze infrastructure error root cause
   */
  private async analyzeInfraError(alertContext: AlertContext, data: any): Promise<RootCauseAnalysis> {
    const segments: Array<{ segment: string; impactPct: number; description: string }> = [];
    let primaryCause = 'Infrastructure error spike detected';
    let suggestion = 'Check server logs and infrastructure monitoring systems';

    // This would typically analyze error logs, but for now we'll provide generic analysis
    segments.push({
      segment: 'System Errors',
      impactPct: Math.min(100, alertContext.currentValue / 10),
      description: `${alertContext.currentValue} infrastructure errors detected`
    });

    if (alertContext.currentValue > 500) {
      primaryCause = 'Critical infrastructure failure detected';
      suggestion = 'Immediate infrastructure review required - check all critical systems';
    } else if (alertContext.currentValue > 200) {
      primaryCause = 'Significant infrastructure issues detected';
      suggestion = 'Review server performance and database connectivity';
    }

    return {
      cause: primaryCause,
      segments,
      suggestion,
      confidence: 90,
      analysisType: 'infra_error'
    };
  }

  /**
   * Generate generic analysis when specific analysis fails
   */
  private generateGenericAnalysis(alertContext: AlertContext): RootCauseAnalysis {
    return {
      cause: `Alert triggered for ${alertContext.metric}`,
      segments: [{
        segment: 'System',
        impactPct: Math.abs(alertContext.deviation),
        description: `Deviation of ${alertContext.deviation.toFixed(1)}% from threshold`
      }],
      suggestion: 'Review system metrics and investigate potential causes',
      confidence: 50,
      analysisType: 'generic'
    };
  }
}

export default RootCauseAnalyzer;

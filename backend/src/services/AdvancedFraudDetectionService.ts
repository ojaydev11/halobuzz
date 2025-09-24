import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AnalyticsEvent } from '../analytics/models/AnalyticsEvent';
import { User } from '../models/User';
import { RedisService } from './RedisService';
import { Logger } from '@nestjs/common';

interface FraudPattern {
  patternId: string;
  name: string;
  description: string;
  type: 'behavioral' | 'transactional' | 'account' | 'content' | 'network';
  severity: 'low' | 'medium' | 'high' | 'critical';
  conditions: Array<{
    field: string;
    operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'regex';
    value: any;
    weight: number;
  }>;
  threshold: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface FraudAlert {
  alertId: string;
  userId: string;
  patternId: string;
  patternName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  description: string;
  evidence: Array<{
    field: string;
    value: any;
    expectedValue: any;
    deviation: number;
  }>;
  status: 'new' | 'investigating' | 'resolved' | 'false_positive';
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolution?: string;
}

interface RiskScore {
  userId: string;
  overallScore: number;
  categoryScores: {
    behavioral: number;
    transactional: number;
    account: number;
    content: number;
    network: number;
  };
  factors: Array<{
    factor: string;
    score: number;
    weight: number;
    description: string;
  }>;
  lastUpdated: Date;
  trend: 'increasing' | 'decreasing' | 'stable';
}

interface FraudMetrics {
  totalAlerts: number;
  alertsBySeverity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  alertsByType: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
  resolutionRate: number;
  falsePositiveRate: number;
  averageResolutionTime: number;
  topFraudPatterns: Array<{
    patternId: string;
    patternName: string;
    count: number;
    successRate: number;
  }>;
  riskDistribution: Array<{
    riskLevel: string;
    userCount: number;
    percentage: number;
  }>;
}

interface AnomalyDetection {
  userId: string;
  anomalies: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    score: number;
    timestamp: Date;
    data: any;
  }>;
  overallAnomalyScore: number;
  lastAnalyzed: Date;
}

@Injectable()
export class AdvancedFraudDetectionService {
  private readonly logger = new Logger(AdvancedFraudDetectionService.name);

  constructor(
    @InjectModel('AnalyticsEvent') private analyticsEventModel: Model<AnalyticsEvent>,
    @InjectModel('User') private userModel: Model<User>,
    private redisService: RedisService,
  ) {}

  /**
   * Create fraud detection pattern
   */
  async createFraudPattern(pattern: Omit<FraudPattern, 'patternId' | 'createdAt' | 'updatedAt'>): Promise<FraudPattern> {
    try {
      const patternId = `fraud_pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const fraudPattern: FraudPattern = {
        ...pattern,
        patternId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store pattern
      await this.redisService.hset(`fraud_pattern:${patternId}`, {
        config: JSON.stringify(fraudPattern),
        isActive: pattern.isActive.toString(),
      });

      this.logger.log(`Created fraud pattern: ${patternId} - ${pattern.name}`);
      
      return fraudPattern;
    } catch (error) {
      this.logger.error('Error creating fraud pattern:', error);
      throw error;
    }
  }

  /**
   * Analyze user for fraud patterns
   */
  async analyzeUserForFraud(userId: string): Promise<FraudAlert[]> {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Get user data for analysis
      const userData = await this.getUserDataForAnalysis(userId);
      
      // Get active fraud patterns
      const fraudPatterns = await this.getActiveFraudPatterns();
      
      const alerts: FraudAlert[] = [];

      // Analyze against each pattern
      for (const pattern of fraudPatterns) {
        const alert = await this.analyzePattern(userId, pattern, userData);
        if (alert) {
          alerts.push(alert);
        }
      }

      // Store alerts
      for (const alert of alerts) {
        await this.storeFraudAlert(alert);
      }

      // Log analysis
      await this.logFraudAnalysis(userId, alerts.length);

      return alerts;
    } catch (error) {
      this.logger.error('Error analyzing user for fraud:', error);
      return [];
    }
  }

  /**
   * Calculate user risk score
   */
  async calculateRiskScore(userId: string): Promise<RiskScore> {
    try {
      const userData = await this.getUserDataForAnalysis(userId);
      
      // Calculate category scores
      const behavioralScore = await this.calculateBehavioralScore(userData);
      const transactionalScore = await this.calculateTransactionalScore(userData);
      const accountScore = await this.calculateAccountScore(userData);
      const contentScore = await this.calculateContentScore(userData);
      const networkScore = await this.calculateNetworkScore(userData);

      // Calculate overall score
      const overallScore = (
        behavioralScore * 0.3 +
        transactionalScore * 0.25 +
        accountScore * 0.2 +
        contentScore * 0.15 +
        networkScore * 0.1
      );

      // Get risk factors
      const factors = await this.getRiskFactors(userData);

      // Determine trend
      const trend = await this.getRiskTrend(userId, overallScore);

      const riskScore: RiskScore = {
        userId,
        overallScore,
        categoryScores: {
          behavioral: behavioralScore,
          transactional: transactionalScore,
          account: accountScore,
          content: contentScore,
          network: networkScore,
        },
        factors,
        lastUpdated: new Date(),
        trend,
      };

      // Cache risk score
      await this.cacheRiskScore(userId, riskScore);

      return riskScore;
    } catch (error) {
      this.logger.error('Error calculating risk score:', error);
      throw error;
    }
  }

  /**
   * Detect anomalies in user behavior
   */
  async detectAnomalies(userId: string): Promise<AnomalyDetection> {
    try {
      const userData = await this.getUserDataForAnalysis(userId);
      
      const anomalies = [];

      // Detect behavioral anomalies
      const behavioralAnomalies = await this.detectBehavioralAnomalies(userData);
      anomalies.push(...behavioralAnomalies);

      // Detect transactional anomalies
      const transactionalAnomalies = await this.detectTransactionalAnomalies(userData);
      anomalies.push(...transactionalAnomalies);

      // Detect network anomalies
      const networkAnomalies = await this.detectNetworkAnomalies(userData);
      anomalies.push(...networkAnomalies);

      // Calculate overall anomaly score
      const overallAnomalyScore = anomalies.length > 0 ? 
        anomalies.reduce((sum, anomaly) => sum + anomaly.score, 0) / anomalies.length : 0;

      const anomalyDetection: AnomalyDetection = {
        userId,
        anomalies,
        overallAnomalyScore,
        lastAnalyzed: new Date(),
      };

      // Store anomaly detection
      await this.storeAnomalyDetection(userId, anomalyDetection);

      return anomalyDetection;
    } catch (error) {
      this.logger.error('Error detecting anomalies:', error);
      throw error;
    }
  }

  /**
   * Get fraud metrics
   */
  async getFraudMetrics(timeRange: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<FraudMetrics> {
    try {
      const timeRangeMs = this.getTimeRangeMs(timeRange);
      const startTime = new Date(Date.now() - timeRangeMs);

      // Get fraud alerts
      const alerts = await this.analyticsEventModel.find({
        eventType: 'fraud_alert',
        timestamp: { $gte: startTime },
      });

      const totalAlerts = alerts.length;

      // Calculate alerts by severity
      const alertsBySeverity = {
        low: alerts.filter(alert => alert.metadata.severity === 'low').length,
        medium: alerts.filter(alert => alert.metadata.severity === 'medium').length,
        high: alerts.filter(alert => alert.metadata.severity === 'high').length,
        critical: alerts.filter(alert => alert.metadata.severity === 'critical').length,
      };

      // Calculate alerts by type
      const alertsByType = {};
      for (const alert of alerts) {
        const type = alert.metadata.patternType || 'unknown';
        alertsByType[type] = (alertsByType[type] || 0) + 1;
      }

      const alertsByTypeArray = Object.entries(alertsByType).map(([type, count]) => ({
        type,
        count: count as number,
        percentage: totalAlerts > 0 ? ((count as number) / totalAlerts) * 100 : 0,
      }));

      // Calculate resolution metrics
      const resolvedAlerts = alerts.filter(alert => alert.metadata.status === 'resolved');
      const resolutionRate = totalAlerts > 0 ? (resolvedAlerts.length / totalAlerts) * 100 : 0;

      const falsePositiveAlerts = alerts.filter(alert => alert.metadata.status === 'false_positive');
      const falsePositiveRate = totalAlerts > 0 ? (falsePositiveAlerts.length / totalAlerts) * 100 : 0;

      // Calculate average resolution time
      const resolutionTimes = resolvedAlerts.map(alert => {
        const createdAt = new Date(alert.metadata.createdAt);
        const resolvedAt = new Date(alert.metadata.resolvedAt);
        return resolvedAt.getTime() - createdAt.getTime();
      });

      const averageResolutionTime = resolutionTimes.length > 0 ? 
        resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length : 0;

      // Get top fraud patterns
      const patternCounts = {};
      for (const alert of alerts) {
        const patternId = alert.metadata.patternId;
        patternCounts[patternId] = (patternCounts[patternId] || 0) + 1;
      }

      const topFraudPatterns = Object.entries(patternCounts)
        .map(([patternId, count]) => ({
          patternId,
          patternName: `Pattern ${patternId}`,
          count: count as number,
          successRate: 80 + Math.random() * 15, // Mock success rate
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Get risk distribution
      const riskDistribution = [
        { riskLevel: 'low', userCount: 1000, percentage: 60 },
        { riskLevel: 'medium', userCount: 500, percentage: 30 },
        { riskLevel: 'high', userCount: 150, percentage: 9 },
        { riskLevel: 'critical', userCount: 50, percentage: 1 },
      ];

      return {
        totalAlerts,
        alertsBySeverity,
        alertsByType: alertsByTypeArray,
        resolutionRate,
        falsePositiveRate,
        averageResolutionTime,
        topFraudPatterns,
        riskDistribution,
      };
    } catch (error) {
      this.logger.error('Error getting fraud metrics:', error);
      return {
        totalAlerts: 0,
        alertsBySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
        alertsByType: [],
        resolutionRate: 0,
        falsePositiveRate: 0,
        averageResolutionTime: 0,
        topFraudPatterns: [],
        riskDistribution: [],
      };
    }
  }

  /**
   * Resolve fraud alert
   */
  async resolveFraudAlert(alertId: string, resolvedBy: string, resolution: string): Promise<boolean> {
    try {
      // Update alert status
      await this.analyticsEventModel.updateOne(
        { 'metadata.alertId': alertId },
        {
          $set: {
            'metadata.status': 'resolved',
            'metadata.resolvedBy': resolvedBy,
            'metadata.resolution': resolution,
            'metadata.resolvedAt': new Date(),
          },
        }
      );

      // Log resolution
      await this.analyticsEventModel.create({
        eventType: 'fraud_alert_resolved',
        metadata: {
          alertId,
          resolvedBy,
          resolution,
        },
        timestamp: new Date(),
        appId: 'halobuzz',
      });

      this.logger.log(`Resolved fraud alert: ${alertId} by ${resolvedBy}`);
      
      return true;
    } catch (error) {
      this.logger.error('Error resolving fraud alert:', error);
      return false;
    }
  }

  /**
   * Get user data for analysis
   */
  private async getUserDataForAnalysis(userId: string): Promise<any> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const [user, events] = await Promise.all([
      this.userModel.findById(userId),
      this.analyticsEventModel.find({
        userId,
        timestamp: { $gte: thirtyDaysAgo },
      }),
    ]);

    return {
      user,
      events,
      totalEvents: events.length,
      eventTypes: [...new Set(events.map(e => e.eventType))],
      recentActivity: events.filter(e => 
        new Date(e.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
      ).length,
    };
  }

  /**
   * Get active fraud patterns
   */
  private async getActiveFraudPatterns(): Promise<FraudPattern[]> {
    // Mock active patterns - in real implementation, this would fetch from Redis
    return [
      {
        patternId: 'pattern_1',
        name: 'Rapid Account Creation',
        description: 'Multiple accounts created from same IP',
        type: 'account',
        severity: 'high',
        conditions: [
          { field: 'accounts_per_ip', operator: 'greater_than', value: 5, weight: 0.8 },
          { field: 'time_window', operator: 'less_than', value: 3600, weight: 0.2 },
        ],
        threshold: 0.7,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        patternId: 'pattern_2',
        name: 'Suspicious Transaction Pattern',
        description: 'Unusual transaction amounts or frequency',
        type: 'transactional',
        severity: 'medium',
        conditions: [
          { field: 'transaction_amount', operator: 'greater_than', value: 1000, weight: 0.6 },
          { field: 'transaction_frequency', operator: 'greater_than', value: 10, weight: 0.4 },
        ],
        threshold: 0.6,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  /**
   * Analyze pattern against user data
   */
  private async analyzePattern(userId: string, pattern: FraudPattern, userData: any): Promise<FraudAlert | null> {
    let totalScore = 0;
    const evidence = [];

    for (const condition of pattern.conditions) {
      const fieldValue = this.getFieldValue(userData, condition.field);
      const conditionScore = this.evaluateCondition(fieldValue, condition);
      
      if (conditionScore > 0) {
        totalScore += conditionScore * condition.weight;
        evidence.push({
          field: condition.field,
          value: fieldValue,
          expectedValue: condition.value,
          deviation: conditionScore,
        });
      }
    }

    if (totalScore >= pattern.threshold) {
      return {
        alertId: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        patternId: pattern.patternId,
        patternName: pattern.name,
        severity: pattern.severity,
        score: totalScore,
        description: pattern.description,
        evidence,
        status: 'new',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return null;
  }

  /**
   * Get field value from user data
   */
  private getFieldValue(userData: any, field: string): any {
    // Mock field value extraction - in real implementation, this would be more sophisticated
    switch (field) {
      case 'accounts_per_ip':
        return Math.floor(Math.random() * 10);
      case 'time_window':
        return Math.floor(Math.random() * 7200);
      case 'transaction_amount':
        return Math.floor(Math.random() * 2000);
      case 'transaction_frequency':
        return Math.floor(Math.random() * 20);
      default:
        return 0;
    }
  }

  /**
   * Evaluate condition
   */
  private evaluateCondition(fieldValue: any, condition: any): number {
    switch (condition.operator) {
      case 'greater_than':
        return fieldValue > condition.value ? 1 : 0;
      case 'less_than':
        return fieldValue < condition.value ? 1 : 0;
      case 'equals':
        return fieldValue === condition.value ? 1 : 0;
      case 'contains':
        return fieldValue && fieldValue.includes(condition.value) ? 1 : 0;
      case 'regex':
        return new RegExp(condition.value).test(fieldValue) ? 1 : 0;
      default:
        return 0;
    }
  }

  /**
   * Store fraud alert
   */
  private async storeFraudAlert(alert: FraudAlert): Promise<void> {
    await this.analyticsEventModel.create({
      userId: alert.userId,
      eventType: 'fraud_alert',
      metadata: {
        alertId: alert.alertId,
        patternId: alert.patternId,
        patternName: alert.patternName,
        severity: alert.severity,
        score: alert.score,
        description: alert.description,
        evidence: alert.evidence,
        status: alert.status,
        createdAt: alert.createdAt,
      },
      timestamp: new Date(),
      appId: 'halobuzz',
    });
  }

  /**
   * Log fraud analysis
   */
  private async logFraudAnalysis(userId: string, alertCount: number): Promise<void> {
    await this.analyticsEventModel.create({
      userId,
      eventType: 'fraud_analysis',
      metadata: {
        alertCount,
        analysisType: 'user_analysis',
      },
      timestamp: new Date(),
      appId: 'halobuzz',
    });
  }

  /**
   * Calculate behavioral score
   */
  private async calculateBehavioralScore(userData: any): Promise<number> {
    // Mock behavioral score calculation
    const recentActivity = userData.recentActivity;
    const totalEvents = userData.totalEvents;
    
    if (recentActivity > 100) return 0.9; // High risk
    if (recentActivity > 50) return 0.6; // Medium risk
    if (recentActivity > 20) return 0.3; // Low risk
    return 0.1; // Very low risk
  }

  /**
   * Calculate transactional score
   */
  private async calculateTransactionalScore(userData: any): Promise<number> {
    // Mock transactional score calculation
    const paymentEvents = userData.events.filter(e => e.eventType.includes('payment'));
    const totalAmount = paymentEvents.reduce((sum, event) => sum + (event.metadata.amount || 0), 0);
    
    if (totalAmount > 10000) return 0.8; // High risk
    if (totalAmount > 5000) return 0.5; // Medium risk
    if (totalAmount > 1000) return 0.2; // Low risk
    return 0.1; // Very low risk
  }

  /**
   * Calculate account score
   */
  private async calculateAccountScore(userData: any): Promise<number> {
    // Mock account score calculation
    const user = userData.user;
    const accountAge = Date.now() - new Date(user.createdAt).getTime();
    const daysSinceCreation = accountAge / (1000 * 60 * 60 * 24);
    
    if (daysSinceCreation < 1) return 0.9; // High risk
    if (daysSinceCreation < 7) return 0.6; // Medium risk
    if (daysSinceCreation < 30) return 0.3; // Low risk
    return 0.1; // Very low risk
  }

  /**
   * Calculate content score
   */
  private async calculateContentScore(userData: any): Promise<number> {
    // Mock content score calculation
    const contentEvents = userData.events.filter(e => 
      e.eventType.includes('content') && e.eventType !== 'content_watch'
    );
    
    if (contentEvents.length > 100) return 0.8; // High risk
    if (contentEvents.length > 50) return 0.5; // Medium risk
    if (contentEvents.length > 20) return 0.2; // Low risk
    return 0.1; // Very low risk
  }

  /**
   * Calculate network score
   */
  private async calculateNetworkScore(userData: any): Promise<number> {
    // Mock network score calculation
    const uniqueIPs = new Set(userData.events.map(e => e.metadata.ip)).size;
    
    if (uniqueIPs > 10) return 0.9; // High risk
    if (uniqueIPs > 5) return 0.6; // Medium risk
    if (uniqueIPs > 2) return 0.3; // Low risk
    return 0.1; // Very low risk
  }

  /**
   * Get risk factors
   */
  private async getRiskFactors(userData: any): Promise<Array<{
    factor: string;
    score: number;
    weight: number;
    description: string;
  }>> {
    return [
      {
        factor: 'recent_activity',
        score: userData.recentActivity > 50 ? 0.8 : 0.2,
        weight: 0.3,
        description: 'High recent activity detected',
      },
      {
        factor: 'account_age',
        score: userData.user ? (Date.now() - new Date(userData.user.createdAt).getTime()) / (1000 * 60 * 60 * 24) < 7 ? 0.9 : 0.1 : 0.5,
        weight: 0.2,
        description: 'New account detected',
      },
      {
        factor: 'event_diversity',
        score: userData.eventTypes.length > 10 ? 0.7 : 0.3,
        weight: 0.2,
        description: 'Diverse event types',
      },
      {
        factor: 'total_events',
        score: userData.totalEvents > 100 ? 0.6 : 0.2,
        weight: 0.3,
        description: 'High total event count',
      },
    ];
  }

  /**
   * Get risk trend
   */
  private async getRiskTrend(userId: string, currentScore: number): Promise<'increasing' | 'decreasing' | 'stable'> {
    // Mock trend calculation
    const previousScore = 0.5; // Would be fetched from historical data
    
    if (currentScore > previousScore + 0.1) return 'increasing';
    if (currentScore < previousScore - 0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Cache risk score
   */
  private async cacheRiskScore(userId: string, riskScore: RiskScore): Promise<void> {
    const cacheKey = `risk_score:${userId}`;
    await this.redisService.setex(cacheKey, 3600, JSON.stringify(riskScore)); // 1 hour cache
  }

  /**
   * Detect behavioral anomalies
   */
  private async detectBehavioralAnomalies(userData: any): Promise<Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    score: number;
    timestamp: Date;
    data: any;
  }>> {
    const anomalies = [];

    // Detect unusual activity patterns
    if (userData.recentActivity > 100) {
      anomalies.push({
        type: 'behavioral',
        description: 'Unusually high activity detected',
        severity: 'high',
        score: 0.8,
        timestamp: new Date(),
        data: { recentActivity: userData.recentActivity },
      });
    }

    // Detect rapid event generation
    const eventsPerMinute = userData.totalEvents / 30; // 30 days
    if (eventsPerMinute > 10) {
      anomalies.push({
        type: 'behavioral',
        description: 'Rapid event generation detected',
        severity: 'medium',
        score: 0.6,
        timestamp: new Date(),
        data: { eventsPerMinute },
      });
    }

    return anomalies;
  }

  /**
   * Detect transactional anomalies
   */
  private async detectTransactionalAnomalies(userData: any): Promise<Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    score: number;
    timestamp: Date;
    data: any;
  }>> {
    const anomalies = [];

    // Detect unusual payment patterns
    const paymentEvents = userData.events.filter(e => e.eventType.includes('payment'));
    const totalAmount = paymentEvents.reduce((sum, event) => sum + (event.metadata.amount || 0), 0);
    
    if (totalAmount > 5000) {
      anomalies.push({
        type: 'transactional',
        description: 'High payment amount detected',
        severity: 'medium',
        score: 0.7,
        timestamp: new Date(),
        data: { totalAmount },
      });
    }

    return anomalies;
  }

  /**
   * Detect network anomalies
   */
  private async detectNetworkAnomalies(userData: any): Promise<Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    score: number;
    timestamp: Date;
    data: any;
  }>> {
    const anomalies = [];

    // Detect multiple IP addresses
    const uniqueIPs = new Set(userData.events.map(e => e.metadata.ip)).size;
    
    if (uniqueIPs > 5) {
      anomalies.push({
        type: 'network',
        description: 'Multiple IP addresses detected',
        severity: 'medium',
        score: 0.6,
        timestamp: new Date(),
        data: { uniqueIPs },
      });
    }

    return anomalies;
  }

  /**
   * Store anomaly detection
   */
  private async storeAnomalyDetection(userId: string, anomalyDetection: AnomalyDetection): Promise<void> {
    await this.analyticsEventModel.create({
      userId,
      eventType: 'anomaly_detection',
      metadata: {
        anomalies: anomalyDetection.anomalies,
        overallAnomalyScore: anomalyDetection.overallAnomalyScore,
        lastAnalyzed: anomalyDetection.lastAnalyzed,
      },
      timestamp: new Date(),
      appId: 'halobuzz',
    });
  }

  /**
   * Get time range in milliseconds
   */
  private getTimeRangeMs(timeRange: string): number {
    switch (timeRange) {
      case 'hour':
        return 60 * 60 * 1000;
      case 'day':
        return 24 * 60 * 60 * 1000;
      case 'week':
        return 7 * 24 * 60 * 60 * 1000;
      case 'month':
        return 30 * 24 * 60 * 60 * 1000;
      default:
        return 24 * 60 * 60 * 1000;
    }
  }
}

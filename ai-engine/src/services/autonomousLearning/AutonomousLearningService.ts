import mongoose, { Document, Schema } from 'mongoose';
import logger from '../../utils/logger';
import { aiModelManager } from '../../utils/ai-models';

// Interfaces for Autonomous Learning
export interface LearningMetric {
  metricId: string;
  name: string;
  value: number;
  target: number;
  unit: string;
  category: 'performance' | 'accuracy' | 'efficiency' | 'user_satisfaction';
  timestamp: Date;
  context: Record<string, any>;
}

export interface ImprovementAction {
  actionId: string;
  type: 'algorithm_update' | 'parameter_tuning' | 'model_retrain' | 'feature_addition' | 'optimization';
  description: string;
  targetMetric: string;
  expectedImprovement: number;
  confidence: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  results?: any;
}

export interface LearningCycle {
  cycleId: string;
  startTime: Date;
  endTime?: Date;
  metrics: LearningMetric[];
  actions: ImprovementAction[];
  overallImprovement: number;
  status: 'running' | 'completed' | 'failed';
  insights: string[];
}

export interface PerformanceProfile {
  serviceName: string;
  currentMetrics: Map<string, LearningMetric>;
  historicalTrends: Map<string, number[]>;
  improvementActions: ImprovementAction[];
  lastOptimization: Date;
  optimizationFrequency: number; // hours
  autoOptimizationEnabled: boolean;
}

export interface LearningInsight {
  insightId: string;
  type: 'pattern' | 'anomaly' | 'opportunity' | 'risk';
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  timestamp: Date;
  source: string;
}

export interface AutonomousLearningRequest {
  serviceName: string;
  metrics: LearningMetric[];
  context?: Record<string, any>;
  forceOptimization?: boolean;
}

export interface AutonomousLearningResponse {
  cycleId: string;
  actions: ImprovementAction[];
  insights: LearningInsight[];
  expectedImprovement: number;
  confidence: number;
  nextOptimization: Date;
}

// MongoDB Schemas
const LearningMetricSchema = new Schema({
  metricId: { type: String, required: true },
  name: { type: String, required: true },
  value: { type: Number, required: true },
  target: { type: Number, required: true },
  unit: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['performance', 'accuracy', 'efficiency', 'user_satisfaction'],
    required: true 
  },
  timestamp: { type: Date, default: Date.now },
  context: { type: Schema.Types.Mixed, default: {} }
});

const ImprovementActionSchema = new Schema({
  actionId: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['algorithm_update', 'parameter_tuning', 'model_retrain', 'feature_addition', 'optimization'],
    required: true 
  },
  description: { type: String, required: true },
  targetMetric: { type: String, required: true },
  expectedImprovement: { type: Number, required: true },
  confidence: { type: Number, min: 0, max: 1, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'in_progress', 'completed', 'failed'],
    default: 'pending' 
  },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  results: { type: Schema.Types.Mixed }
});

const LearningCycleSchema = new Schema({
  cycleId: { type: String, required: true, unique: true },
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  metrics: [LearningMetricSchema],
  actions: [ImprovementActionSchema],
  overallImprovement: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['running', 'completed', 'failed'],
    default: 'running' 
  },
  insights: [{ type: String }]
}, {
  timestamps: true
});

const PerformanceProfileSchema = new Schema({
  serviceName: { type: String, required: true, unique: true },
  currentMetrics: { type: Schema.Types.Mixed, default: {} },
  historicalTrends: { type: Schema.Types.Mixed, default: {} },
  improvementActions: [ImprovementActionSchema],
  lastOptimization: { type: Date, default: Date.now },
  optimizationFrequency: { type: Number, default: 24 }, // hours
  autoOptimizationEnabled: { type: Boolean, default: true }
}, {
  timestamps: true
});

const LearningInsightSchema = new Schema({
  insightId: { type: String, required: true, unique: true },
  type: { 
    type: String, 
    enum: ['pattern', 'anomaly', 'opportunity', 'risk'],
    required: true 
  },
  description: { type: String, required: true },
  confidence: { type: Number, min: 0, max: 1, required: true },
  impact: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'],
    required: true 
  },
  recommendations: [{ type: String }],
  timestamp: { type: Date, default: Date.now },
  source: { type: String, required: true }
});

// Create models
const LearningCycleModel = mongoose.model<LearningCycle & Document>('LearningCycle', LearningCycleSchema);
const PerformanceProfileModel = mongoose.model<PerformanceProfile & Document>('PerformanceProfile', PerformanceProfileSchema);
const LearningInsightModel = mongoose.model<LearningInsight & Document>('LearningInsight', LearningInsightSchema);

export class AutonomousLearningService {
  private static instance: AutonomousLearningService;
  private performanceProfiles: Map<string, PerformanceProfile> = new Map();
  private activeCycles: Map<string, LearningCycle> = new Map();
  private optimizationScheduler: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeOptimizationScheduler();
    logger.info('AutonomousLearningService initialized');
  }

  static getInstance(): AutonomousLearningService {
    if (!AutonomousLearningService.instance) {
      AutonomousLearningService.instance = new AutonomousLearningService();
    }
    return AutonomousLearningService.instance;
  }

  /**
   * Start autonomous learning cycle for a service
   */
  async startLearningCycle(request: AutonomousLearningRequest): Promise<AutonomousLearningResponse> {
    try {
      logger.info('Starting autonomous learning cycle', { serviceName: request.serviceName });

      const cycleId = this.generateCycleId(request.serviceName);
      
      // Create learning cycle
      const cycle: LearningCycle = {
        cycleId,
        startTime: new Date(),
        metrics: request.metrics,
        actions: [],
        overallImprovement: 0,
        status: 'running',
        insights: []
      };

      // Analyze current performance
      const performanceAnalysis = await this.analyzePerformance(request.metrics);
      
      // Generate improvement actions
      const actions = await this.generateImprovementActions(performanceAnalysis, request);
      
      // Extract learning insights
      const insights = await this.extractLearningInsights(request.metrics, performanceAnalysis);
      
      // Calculate expected improvement
      const expectedImprovement = this.calculateExpectedImprovement(actions);
      
      // Calculate confidence
      const confidence = this.calculateConfidence(actions, insights);
      
      // Schedule next optimization
      const nextOptimization = this.calculateNextOptimization(request.serviceName);

      // Update cycle with actions and insights
      cycle.actions = actions;
      cycle.insights = insights.map(i => i.description);

      // Save cycle
      await this.saveLearningCycle(cycle);
      
      // Update performance profile
      await this.updatePerformanceProfile(request.serviceName, request.metrics, actions);

      // Cache active cycle
      this.activeCycles.set(cycleId, cycle);

      return {
        cycleId,
        actions,
        insights,
        expectedImprovement,
        confidence,
        nextOptimization
      };

    } catch (error) {
      logger.error('Error starting learning cycle:', error);
      throw error;
    }
  }

  /**
   * Execute improvement actions
   */
  async executeImprovementAction(actionId: string): Promise<void> {
    try {
      logger.info('Executing improvement action', { actionId });

      // Find the action
      const cycle = Array.from(this.activeCycles.values())
        .find(c => c.actions.some(a => a.actionId === actionId));
      
      if (!cycle) {
        throw new Error('Action not found in active cycles');
      }

      const action = cycle.actions.find(a => a.actionId === actionId);
      if (!action) {
        throw new Error('Action not found');
      }

      // Update action status
      action.status = 'in_progress';
      
      // Execute the action based on type
      const results = await this.executeActionByType(action);
      
      // Update action with results
      action.status = results.success ? 'completed' : 'failed';
      action.completedAt = new Date();
      action.results = results;

      // Update cycle
      await this.updateLearningCycle(cycle);

      // If action completed successfully, trigger metric re-evaluation
      if (results.success) {
        await this.triggerMetricReevaluation(cycle.cycleId);
      }

    } catch (error) {
      logger.error('Error executing improvement action:', error);
      throw error;
    }
  }

  /**
   * Monitor and optimize performance continuously
   */
  async monitorPerformance(serviceName: string): Promise<void> {
    try {
      logger.info('Monitoring performance', { serviceName });

      // Get current performance profile
      const profile = await this.getPerformanceProfile(serviceName);
      
      // Check if optimization is needed
      const needsOptimization = this.needsOptimization(profile);
      
      if (needsOptimization) {
        logger.info('Performance optimization needed', { serviceName });
        
        // Start optimization cycle
        const metrics = await this.collectCurrentMetrics(serviceName);
        
        await this.startLearningCycle({
          serviceName,
          metrics,
          context: { triggeredBy: 'performance_monitoring' }
        });
      }

    } catch (error) {
      logger.error('Error monitoring performance:', error);
    }
  }

  /**
   * Get learning insights and recommendations
   */
  async getLearningInsights(serviceName?: string, timeRange?: { start: Date; end: Date }): Promise<LearningInsight[]> {
    try {
      const query: any = {};
      
      if (serviceName) {
        query.source = serviceName;
      }
      
      if (timeRange) {
        query.timestamp = {
          $gte: timeRange.start,
          $lte: timeRange.end
        };
      }

      const insights = await LearningInsightModel.find(query)
        .sort({ timestamp: -1 })
        .limit(50)
        .lean();

      return insights;

    } catch (error) {
      logger.error('Error getting learning insights:', error);
      return [];
    }
  }

  /**
   * Get performance analytics
   */
  async getPerformanceAnalytics(serviceName: string): Promise<any> {
    try {
      const profile = await this.getPerformanceProfile(serviceName);
      const recentCycles = await LearningCycleModel.find({ 
        'metrics.name': { $exists: true },
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
      }).lean();

      return {
        serviceName,
        currentMetrics: Object.fromEntries(profile.currentMetrics),
        historicalTrends: Object.fromEntries(profile.historicalTrends),
        recentImprovements: recentCycles.map(c => ({
          cycleId: c.cycleId,
          improvement: c.overallImprovement,
          actions: c.actions.length,
          status: c.status
        })),
        lastOptimization: profile.lastOptimization,
        autoOptimizationEnabled: profile.autoOptimizationEnabled
      };

    } catch (error) {
      logger.error('Error getting performance analytics:', error);
      throw error;
    }
  }

  // Private helper methods
  private async analyzePerformance(metrics: LearningMetric[]): Promise<any> {
    try {
      const analysis = {
        overallScore: 0,
        strengths: [] as string[],
        weaknesses: [] as string[],
        trends: {} as Record<string, string>,
        recommendations: [] as string[]
      };

      for (const metric of metrics) {
        const performanceRatio = metric.value / metric.target;
        
        if (performanceRatio >= 0.9) {
          analysis.strengths.push(metric.name);
        } else if (performanceRatio < 0.7) {
          analysis.weaknesses.push(metric.name);
        }

        analysis.trends[metric.name] = performanceRatio > 1 ? 'improving' : 'declining';
      }

      analysis.overallScore = metrics.reduce((sum, m) => sum + (m.value / m.target), 0) / metrics.length;

      return analysis;

    } catch (error) {
      logger.error('Error analyzing performance:', error);
      return { overallScore: 0, strengths: [], weaknesses: [], trends: {}, recommendations: [] };
    }
  }

  private async generateImprovementActions(analysis: any, request: AutonomousLearningRequest): Promise<ImprovementAction[]> {
    try {
      const actions: ImprovementAction[] = [];

      // Generate actions for weaknesses
      for (const weakness of analysis.weaknesses) {
        const action: ImprovementAction = {
          actionId: this.generateActionId(),
          type: 'parameter_tuning',
          description: `Optimize ${weakness} performance`,
          targetMetric: weakness,
          expectedImprovement: 0.15,
          confidence: 0.7,
          status: 'pending',
          createdAt: new Date()
        };
        actions.push(action);
      }

      // Generate optimization actions
      if (analysis.overallScore < 0.8) {
        const action: ImprovementAction = {
          actionId: this.generateActionId(),
          type: 'optimization',
          description: 'General performance optimization',
          targetMetric: 'overall',
          expectedImprovement: 0.1,
          confidence: 0.6,
          status: 'pending',
          createdAt: new Date()
        };
        actions.push(action);
      }

      return actions;

    } catch (error) {
      logger.error('Error generating improvement actions:', error);
      return [];
    }
  }

  private async extractLearningInsights(metrics: LearningMetric[], analysis: any): Promise<LearningInsight[]> {
    try {
      const insights: LearningInsight[] = [];

      // Performance insight
      if (analysis.overallScore < 0.7) {
        insights.push({
          insightId: this.generateInsightId(),
          type: 'risk',
          description: `Performance below target (${(analysis.overallScore * 100).toFixed(1)}%)`,
          confidence: 0.9,
          impact: 'high',
          recommendations: ['Immediate optimization required', 'Review algorithm parameters'],
          timestamp: new Date(),
          source: 'performance_analysis'
        });
      }

      // Trend insight
      const decliningMetrics = Object.entries(analysis.trends)
        .filter(([_, trend]) => trend === 'declining')
        .map(([metric, _]) => metric);
      
      if (decliningMetrics.length > 0) {
        insights.push({
          insightId: this.generateInsightId(),
          type: 'anomaly',
          description: `Declining performance in: ${decliningMetrics.join(', ')}`,
          confidence: 0.8,
          impact: 'medium',
          recommendations: ['Investigate root causes', 'Implement corrective measures'],
          timestamp: new Date(),
          source: 'trend_analysis'
        });
      }

      return insights;

    } catch (error) {
      logger.error('Error extracting learning insights:', error);
      return [];
    }
  }

  private async executeActionByType(action: ImprovementAction): Promise<any> {
    try {
      switch (action.type) {
        case 'parameter_tuning':
          return await this.executeParameterTuning(action);
        case 'optimization':
          return await this.executeOptimization(action);
        case 'algorithm_update':
          return await this.executeAlgorithmUpdate(action);
        case 'model_retrain':
          return await this.executeModelRetrain(action);
        case 'feature_addition':
          return await this.executeFeatureAddition(action);
        default:
          return { success: false, error: 'Unknown action type' };
      }

    } catch (error) {
      logger.error('Error executing action by type:', error);
      return { success: false, error: error.message };
    }
  }

  private async executeParameterTuning(action: ImprovementAction): Promise<any> {
    // Simulate parameter tuning
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true, improvement: 0.12, message: 'Parameters optimized' };
  }

  private async executeOptimization(action: ImprovementAction): Promise<any> {
    // Simulate optimization
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { success: true, improvement: 0.08, message: 'System optimized' };
  }

  private async executeAlgorithmUpdate(action: ImprovementAction): Promise<any> {
    // Simulate algorithm update
    await new Promise(resolve => setTimeout(resolve, 3000));
    return { success: true, improvement: 0.15, message: 'Algorithm updated' };
  }

  private async executeModelRetrain(action: ImprovementAction): Promise<any> {
    // Simulate model retraining
    await new Promise(resolve => setTimeout(resolve, 5000));
    return { success: true, improvement: 0.20, message: 'Model retrained' };
  }

  private async executeFeatureAddition(action: ImprovementAction): Promise<any> {
    // Simulate feature addition
    await new Promise(resolve => setTimeout(resolve, 1500));
    return { success: true, improvement: 0.10, message: 'Feature added' };
  }

  private async getPerformanceProfile(serviceName: string): Promise<PerformanceProfile> {
    try {
      let profile = await PerformanceProfileModel.findOne({ serviceName }).lean();
      
      if (!profile) {
        // Create default profile
        profile = {
          serviceName,
          currentMetrics: new Map(),
          historicalTrends: new Map(),
          improvementActions: [],
          lastOptimization: new Date(),
          optimizationFrequency: 24,
          autoOptimizationEnabled: true
        };
        
        await PerformanceProfileModel.create(profile);
      }

      return profile as PerformanceProfile;

    } catch (error) {
      logger.error('Error getting performance profile:', error);
      throw error;
    }
  }

  private async updatePerformanceProfile(serviceName: string, metrics: LearningMetric[], actions: ImprovementAction[]): Promise<void> {
    try {
      await PerformanceProfileModel.findOneAndUpdate(
        { serviceName },
        {
          $set: {
            currentMetrics: Object.fromEntries(metrics.map(m => [m.name, m])),
            improvementActions: actions,
            lastOptimization: new Date()
          }
        },
        { upsert: true }
      );

    } catch (error) {
      logger.error('Error updating performance profile:', error);
    }
  }

  private async saveLearningCycle(cycle: LearningCycle): Promise<void> {
    try {
      await LearningCycleModel.findOneAndUpdate(
        { cycleId: cycle.cycleId },
        cycle,
        { upsert: true }
      );

    } catch (error) {
      logger.error('Error saving learning cycle:', error);
    }
  }

  private async updateLearningCycle(cycle: LearningCycle): Promise<void> {
    try {
      await LearningCycleModel.findOneAndUpdate(
        { cycleId: cycle.cycleId },
        cycle
      );

    } catch (error) {
      logger.error('Error updating learning cycle:', error);
    }
  }

  private async collectCurrentMetrics(serviceName: string): Promise<LearningMetric[]> {
    // Simulate metric collection
    return [
      {
        metricId: 'response_time',
        name: 'Response Time',
        value: 150,
        target: 100,
        unit: 'ms',
        category: 'performance',
        timestamp: new Date(),
        context: { service: serviceName }
      },
      {
        metricId: 'accuracy',
        name: 'Accuracy',
        value: 0.85,
        target: 0.95,
        unit: 'ratio',
        category: 'accuracy',
        timestamp: new Date(),
        context: { service: serviceName }
      }
    ];
  }

  private async triggerMetricReevaluation(cycleId: string): Promise<void> {
    // Trigger re-evaluation of metrics after action completion
    logger.info('Triggering metric re-evaluation', { cycleId });
  }

  private initializeOptimizationScheduler(): void {
    // Run optimization check every hour
    this.optimizationScheduler = setInterval(async () => {
      try {
        const profiles = await PerformanceProfileModel.find({ autoOptimizationEnabled: true }).lean();
        
        for (const profile of profiles) {
          await this.monitorPerformance(profile.serviceName);
        }
      } catch (error) {
        logger.error('Error in optimization scheduler:', error);
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  private needsOptimization(profile: PerformanceProfile): boolean {
    const timeSinceLastOptimization = Date.now() - profile.lastOptimization.getTime();
    const optimizationInterval = profile.optimizationFrequency * 60 * 60 * 1000; // Convert hours to ms
    
    return timeSinceLastOptimization >= optimizationInterval;
  }

  private calculateExpectedImprovement(actions: ImprovementAction[]): number {
    return actions.reduce((sum, action) => sum + action.expectedImprovement, 0);
  }

  private calculateConfidence(actions: ImprovementAction[], insights: LearningInsight[]): number {
    const actionConfidence = actions.reduce((sum, action) => sum + action.confidence, 0) / actions.length;
    const insightConfidence = insights.reduce((sum, insight) => sum + insight.confidence, 0) / insights.length;
    
    return (actionConfidence + insightConfidence) / 2;
  }

  private calculateNextOptimization(serviceName: string): Date {
    const now = new Date();
    return new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
  }

  private generateCycleId(serviceName: string): string {
    return `${serviceName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateInsightId(): string {
    return `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup method for graceful shutdown
   */
  async cleanup(): Promise<void> {
    if (this.optimizationScheduler) {
      clearInterval(this.optimizationScheduler);
    }
    logger.info('AutonomousLearningService cleaned up');
  }
}

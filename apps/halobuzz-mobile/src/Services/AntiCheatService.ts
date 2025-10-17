/**
 * Advanced Anti-Cheat Service for E-Sports Competition
 * Professional-grade cheat detection and prevention system
 */

import { gamesAPI } from './GamesAPI';
import { socketManager } from './SocketManager';
import { useAuth } from '@/store/AuthContext';

export interface CheatDetectionResult {
  isCheating: boolean;
  confidence: number;
  violations: Violation[];
  action: 'none' | 'warn' | 'kick' | 'ban';
}

export interface Violation {
  type: ViolationType;
  severity: 'low' | 'medium' | 'high';
  timestamp: number;
  details: any;
}

export type ViolationType = 
  | 'impossible_reaction_time'
  | 'perfect_accuracy'
  | 'speed_hack'
  | 'aimbot'
  | 'macro_usage'
  | 'multiple_accounts'
  | 'vpn_usage'
  | 'hardware_fingerprint_mismatch';

export class AntiCheatService {
  private static instance: AntiCheatService;
  private playerHistory: Map<string, PlayerHistory> = new Map();
  private violationThresholds = {
    low: 3,
    medium: 2,
    high: 1
  };

  // Statistical baselines for human performance
  private readonly HUMAN_BASELINES = {
    minReactionTime: 120, // ms
    maxReactionTime: 500, // ms
    reactionTimeStdDev: 45, // ms
    maxAccuracy: 0.95,
    minAccuracy: 0.3,
    maxClicksPerSecond: 15,
    maxScoreConsistency: 0.85
  };

  // Machine learning model for anomaly detection
  private mlModel: any = null;
  private trainingData: any[] = [];

  private constructor() {
    this.initializeMLModel();
    this.setupRealTimeMonitoring();
  }

  static getInstance(): AntiCheatService {
    if (!AntiCheatService.instance) {
      AntiCheatService.instance = new AntiCheatService();
    }
    return AntiCheatService.instance;
  }

  /**
   * Initialize machine learning model for anomaly detection
   */
  private async initializeMLModel() {
    // Simplified ML model for browser environment
    this.mlModel = {
      predict: (features: number[]) => {
        // Anomaly detection based on statistical outliers
        const reactionTime = features[0];
        const accuracy = features[1];
        const consistency = features[2];

        let anomalyScore = 0;

        // Reaction time analysis
        if (reactionTime < this.HUMAN_BASELINES.minReactionTime) {
          anomalyScore += 0.4;
        }
        if (accuracy > this.HUMAN_BASELINES.maxAccuracy) {
          anomalyScore += 0.3;
        }
        if (consistency > this.HUMAN_BASELINES.maxScoreConsistency) {
          anomalyScore += 0.3;
        }

        return {
          isAnomaly: anomalyScore > 0.7,
          confidence: Math.min(anomalyScore, 1.0)
        };
      },
      
      train: (data: any[]) => {
        this.trainingData = [...this.trainingData, ...data];
        console.log(`ML Model trained with ${this.trainingData.length} samples`);
      }
    };
  }

  /**
   * Set up real-time monitoring for suspicious activities
   */
  private setupRealTimeMonitoring() {
    // Monitor for impossible patterns
    setInterval(() => {
      this.playerHistory.forEach((history, playerId) => {
        this.analyzePlayerPatterns(playerId, history);
      });
    }, 5000); // Check every 5 seconds
  }

  /**
   * Analyze player behavior for cheating patterns
   */
  public async analyzePlayerBehavior(
    playerId: string, 
    gameData: GameData
  ): Promise<CheatDetectionResult> {
    
    const violations: Violation[] = [];
    let totalConfidence = 0;

    // 1. Reaction Time Analysis
    const reactionAnalysis = this.analyzeReactionTime(gameData.reactionTimes);
    if (reactionAnalysis.isSuspicious) {
      violations.push({
        type: 'impossible_reaction_time',
        severity: reactionAnalysis.confidence > 0.8 ? 'high' : 'medium',
        timestamp: Date.now(),
        details: {
          avgReactionTime: reactionAnalysis.avg,
          minReactionTime: reactionAnalysis.min,
          confidence: reactionAnalysis.confidence
        }
      });
      totalConfidence += reactionAnalysis.confidence;
    }

    // 2. Accuracy Analysis
    const accuracyAnalysis = this.analyzeAccuracy(gameData.accuracyHistory);
    if (accuracyAnalysis.isSuspicious) {
      violations.push({
        type: 'perfect_accuracy',
        severity: accuracyAnalysis.confidence > 0.8 ? 'high' : 'medium',
        timestamp: Date.now(),
        details: {
          accuracy: accuracyAnalysis.accuracy,
          consistency: accuracyAnalysis.consistency,
          confidence: accuracyAnalysis.confidence
        }
      });
      totalConfidence += accuracyAnalysis.confidence;
    }

    // 3. Speed Analysis
    const speedAnalysis = this.analyzeSpeed(gameData.actions);
    if (speedAnalysis.isSuspicious) {
      violations.push({
        type: 'speed_hack',
        severity: speedAnalysis.confidence > 0.8 ? 'high' : 'medium',
        timestamp: Date.now(),
        details: {
          actionsPerSecond: speedAnalysis.actionsPerSecond,
          maxSpeed: speedAnalysis.maxSpeed,
          confidence: speedAnalysis.confidence
        }
      });
      totalConfidence += speedAnalysis.confidence;
    }

    // 4. Machine Learning Anomaly Detection
    if (this.mlModel && gameData.features) {
      const mlResult = this.mlModel.predict(gameData.features);
      if (mlResult.isAnomaly) {
        violations.push({
          type: 'macro_usage',
          severity: mlResult.confidence > 0.8 ? 'high' : 'medium',
          timestamp: Date.now(),
          details: {
            mlConfidence: mlResult.confidence,
            features: gameData.features
          }
        });
        totalConfidence += mlResult.confidence;
      }
    }

    // 5. Hardware Fingerprinting
    const hardwareCheck = await this.verifyHardwareFingerprint(playerId, gameData.hardware);
    if (!hardwareCheck.isValid) {
      violations.push({
        type: 'hardware_fingerprint_mismatch',
        severity: 'high',
        timestamp: Date.now(),
        details: {
          reason: hardwareCheck.reason,
          expected: hardwareCheck.expected,
          actual: hardwareCheck.actual
        }
      });
      totalConfidence += 0.8;
    }

    // Determine action based on violations
    const action = this.determineAction(violations, totalConfidence);

    // Update player history
    this.updatePlayerHistory(playerId, violations);

    return {
      isCheating: action !== 'none',
      confidence: Math.min(totalConfidence, 1.0),
      violations,
      action
    };
  }

  /**
   * Analyze reaction times for impossible human performance
   */
  private analyzeReactionTime(reactionTimes: number[]): {
    isSuspicious: boolean;
    confidence: number;
    avg: number;
    min: number;
  } {
    if (!reactionTimes || reactionTimes.length === 0) {
      return { isSuspicious: false, confidence: 0, avg: 0, min: 0 };
    }

    const avg = reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length;
    const min = Math.min(...reactionTimes);
    
    // Check for impossible reaction times (< 100ms)
    if (min < 100) {
      const confidence = Math.min(1.0, (100 - min) / 50);
      return { isSuspicious: true, confidence, avg, min };
    }

    // Check for unnaturally consistent times (low variance)
    const variance = this.calculateVariance(reactionTimes);
    if (variance < 100 && avg < 200) { // Very low variance with fast times
      return { isSuspicious: true, confidence: 0.6, avg, min };
    }

    return { isSuspicious: false, confidence: 0, avg, min };
  }

  /**
   * Analyze accuracy patterns for aimbot detection
   */
  private analyzeAccuracy(accuracyHistory: number[]): {
    isSuspicious: boolean;
    confidence: number;
    accuracy: number;
    consistency: number;
  } {
    if (!accuracyHistory || accuracyHistory.length === 0) {
      return { isSuspicious: false, confidence: 0, accuracy: 0, consistency: 0 };
    }

    const accuracy = accuracyHistory[accuracyHistory.length - 1];
    const avgAccuracy = accuracyHistory.reduce((a, b) => a + b, 0) / accuracyHistory.length;
    const consistency = 1 - (this.calculateVariance(accuracyHistory) / 0.25); // Normalized

    // Check for impossible accuracy (> 98%)
    if (accuracy > 0.98) {
      const confidence = Math.min(1.0, (accuracy - 0.98) * 50);
      return { isSuspicious: true, confidence, accuracy, consistency };
    }

    // Check for unnaturally consistent accuracy
    if (consistency > 0.95 && avgAccuracy > 0.9) {
      return { isSuspicious: true, confidence: 0.7, accuracy, consistency };
    }

    return { isSuspicious: false, confidence: 0, accuracy, consistency };
  }

  /**
   * Analyze speed for macro/automation detection
   */
  private analyzeSpeed(actions: ActionData[]): {
    isSuspicious: boolean;
    confidence: number;
    actionsPerSecond: number;
    maxSpeed: number;
  } {
    if (!actions || actions.length === 0) {
      return { isSuspicious: false, confidence: 0, actionsPerSecond: 0, maxSpeed: 0 };
    }

    // Calculate actions per second
    const timeSpan = actions[actions.length - 1].timestamp - actions[0].timestamp;
    const actionsPerSecond = actions.length / (timeSpan / 1000);
    
    // Check for inhuman speed (> 15 actions per second)
    if (actionsPerSecond > this.HUMAN_BASELINES.maxClicksPerSecond) {
      const confidence = Math.min(1.0, (actionsPerSecond - this.HUMAN_BASELINES.maxClicksPerSecond) / 10);
      return { isSuspicious: true, confidence, actionsPerSecond, maxSpeed: actionsPerSecond };
    }

    // Check for unnaturally consistent timing (macro detection)
    const timingVariance = this.calculateVariance(actions.map(a => a.timestamp));
    if (timingVariance < 50 && actionsPerSecond > 8) {
      return { isSuspicious: true, confidence: 0.8, actionsPerSecond, maxSpeed: actionsPerSecond };
    }

    return { isSuspicious: false, confidence: 0, actionsPerSecond, maxSpeed: actionsPerSecond };
  }

  /**
   * Verify hardware fingerprint to prevent multiple accounts
   */
  private async verifyHardwareFingerprint(
    playerId: string, 
    hardware: HardwareData
  ): Promise<{
    isValid: boolean;
    reason?: string;
    expected?: any;
    actual?: any;
  }> {
    try {
      const response = await gamesAPI.verifyHardwareFingerprint(playerId, hardware);
      return response.data;
    } catch (error) {
      console.error('Hardware verification failed:', error);
      return { isValid: true }; // Fail open for now
    }
  }

  /**
   * Determine appropriate action based on violations
   */
  private determineAction(violations: Violation[], confidence: number): 'none' | 'warn' | 'kick' | 'ban' {
    if (violations.length === 0) return 'none';

    // Count violations by severity
    const highSeverity = violations.filter(v => v.severity === 'high').length;
    const mediumSeverity = violations.filter(v => v.severity === 'medium').length;
    const lowSeverity = violations.filter(v => v.severity === 'low').length;

    // Check thresholds
    if (highSeverity >= this.violationThresholds.high) return 'ban';
    if (mediumSeverity >= this.violationThresholds.medium) return 'kick';
    if (lowSeverity >= this.violationThresholds.low) return 'warn';
    if (confidence > 0.8) return 'warn';

    return 'none';
  }

  /**
   * Update player history for pattern analysis
   */
  private updatePlayerHistory(playerId: string, violations: Violation[]) {
    if (!this.playerHistory.has(playerId)) {
      this.playerHistory.set(playerId, {
        violations: [],
        totalViolations: 0,
        lastViolation: 0,
        riskScore: 0
      });
    }

    const history = this.playerHistory.get(playerId)!;
    history.violations.push(...violations);
    history.totalViolations += violations.length;
    history.lastViolation = Date.now();
    
    // Calculate risk score
    history.riskScore = Math.min(100, history.totalViolations * 10);
  }

  /**
   * Analyze long-term player patterns
   */
  private analyzePlayerPatterns(playerId: string, history: PlayerHistory) {
    // Detect patterns of escalating violations
    const recentViolations = history.violations.filter(
      v => Date.now() - v.timestamp < 86400000 // Last 24 hours
    );

    if (recentViolations.length > 5) {
      console.warn(`Player ${playerId} showing suspicious pattern: ${recentViolations.length} violations in 24h`);
      
      // Auto-ban for excessive violations
      if (recentViolations.length > 10) {
        this.takeAction(playerId, 'ban', 'Excessive violations detected');
      }
    }
  }

  /**
   * Take action against detected cheaters
   */
  public async takeAction(playerId: string, action: 'warn' | 'kick' | 'ban', reason: string) {
    try {
      await gamesAPI.takeAntiCheatAction(playerId, action, reason);
      
      // Broadcast to game room if player is in one
      const currentRoom = socketManager.getCurrentRoom();
      if (currentRoom) {
        socketManager.broadcastAntiCheatAction(currentRoom, playerId, action, reason);
      }

      console.log(`Anti-cheat action taken: ${action} against ${playerId} - ${reason}`);
    } catch (error) {
      console.error('Failed to take anti-cheat action:', error);
    }
  }

  /**
   * Get player risk score
   */
  public getPlayerRiskScore(playerId: string): number {
    const history = this.playerHistory.get(playerId);
    return history ? history.riskScore : 0;
  }

  /**
   * Calculate statistical variance
   */
  private calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Train ML model with new data
   */
  public trainMLModel(trainingData: any[]) {
    if (this.mlModel) {
      this.mlModel.train(trainingData);
    }
  }
}

// Interfaces for data structures
interface GameData {
  playerId: string;
  gameId: string;
  reactionTimes: number[];
  accuracyHistory: number[];
  actions: ActionData[];
  features?: number[];
  hardware?: HardwareData;
}

interface ActionData {
  timestamp: number;
  type: string;
  x?: number;
  y?: number;
}

interface HardwareData {
  deviceId: string;
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  cores: number;
  memory: number;
}

interface PlayerHistory {
  violations: Violation[];
  totalViolations: number;
  lastViolation: number;
  riskScore: number;
}

// Export singleton instance
export const antiCheatService = AntiCheatService.getInstance();
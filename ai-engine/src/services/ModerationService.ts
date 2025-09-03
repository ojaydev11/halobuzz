import { 
  NSFWScanResult, 
  AgeEstimateResult, 
  ProfanityResult, 
  PolicyAction, 
  AIWarningEvent,
  ModerationRequest,
  ServiceResponse
} from 'models/types';
import { aiModelManager } from '../utils/ai-models';
import logger from '../utils/logger';
import { EventEmitter } from 'events';

export class ModerationService extends EventEmitter {
  private static instance: ModerationService;
  private warningThresholds = {
    nsfw: 0.7,
    age: 13,
    profanity: 0.6,
    toxicity: 0.8
  };

  private constructor() {
    super();
    logger.info('ModerationService initialized');
  }

  static getInstance(): ModerationService {
    if (!ModerationService.instance) {
      ModerationService.instance = new ModerationService();
    }
    return ModerationService.instance;
  }

  /**
   * Scan video frames or stream for NSFW content
   */
  async nsfw_frame_scan(videoUrl?: string, streamFrames?: Buffer[]): Promise<NSFWScanResult[]> {
    try {
      logger.info('Starting NSFW frame scan', { videoUrl, frameCount: streamFrames?.length });

      let frames: Buffer[] = [];

      if (videoUrl) {
        // Extract frames from video URL
        frames = await this.extractFramesFromVideo(videoUrl);
      } else if (streamFrames) {
        frames = streamFrames;
      } else {
        throw new Error('Either videoUrl or streamFrames must be provided');
      }

      // Process frames in batches to avoid memory issues
      const batchSize = 10;
      const results: NSFWScanResult[] = [];

      for (let i = 0; i < frames.length; i += batchSize) {
        const batch = frames.slice(i, i + batchSize);
        const batchResults = await aiModelManager.nsfwScan(batch);
        results.push(...batchResults);
      }

      // Aggregate results
      const aggregatedResult = this.aggregateNSFWResults(results);
      
      logger.info('NSFW scan completed', { 
        totalFrames: frames.length, 
        nsfwFrames: results.filter(r => r.label !== 'safe').length,
        maxScore: Math.max(...results.map(r => r.score || 0))
      });

      return results;
    } catch (error) {
      logger.error('NSFW frame scan failed:', error);
      throw error;
    }
  }

  /**
   * Estimate age from face frame
   */
  async age_estimate(faceFrame: Buffer): Promise<AgeEstimateResult> {
    try {
      logger.info('Starting age estimation');

      const result = await aiModelManager.ageEstimate(faceFrame);

      // Check if age is below threshold
      if ((result.ageEstimate || result.estimatedAge) < this.warningThresholds.age) {
        logger.warn('Potential underage user detected', { 
          estimatedAge: result.ageEstimate || result.estimatedAge,
          confidence: result.confidence 
        });
      }

      logger.info('Age estimation completed', { 
        estimatedAge: result.ageEstimate,
        confidence: result.confidence 
      });

      return result;
    } catch (error) {
      logger.error('Age estimation failed:', error);
      throw error;
    }
  }

  /**
   * Check real-time audio for profanity
   */
  async asr_profanity(realtime_audio: Buffer): Promise<ProfanityResult> {
    try {
      logger.info('Starting profanity detection');

      const result = await aiModelManager.profanityCheck(realtime_audio);

      // Log high severity profanity
      if (result.severity === 'high' || result.severity === 'critical') {
        logger.warn('High severity profanity detected', { 
          badnessScore: result.badnessScore,
          severity: result.severity,
          detectedWords: result.detectedWords 
        });
      }

      logger.info('Profanity detection completed', { 
        badnessScore: result.badnessScore,
        severity: result.severity 
      });

      return result;
    } catch (error) {
      logger.error('Profanity detection failed:', error);
      throw error;
    }
  }

  /**
   * Enforce policies based on subject analysis
   */
  async policy_enforcer(subject: any): Promise<PolicyAction> {
    try {
      logger.info('Starting policy enforcement', { subjectType: typeof subject });

      let action: PolicyAction = {
        action: 'none',
        reason: 'No violations detected',
        severity: 'low',
        timestamp: Date.now(),
        confidence: 1.0
      };

      // Analyze different types of subjects
      if (typeof subject === 'string') {
        // Text analysis
        const textAnalysis = await aiModelManager.textAnalysis(subject);
        
        if (textAnalysis.toxicity > this.warningThresholds.toxicity) {
          action = {
            action: 'ban',
            reason: 'High toxicity content detected',
            severity: 'high',
            timestamp: Date.now(),
            duration: 86400, // 24 hours
            confidence: textAnalysis.toxicity
          };
        } else if (textAnalysis.toxicity > this.warningThresholds.profanity) {
          action = {
            action: 'warn',
            reason: 'Moderate toxicity content detected',
            severity: 'medium',
            timestamp: Date.now(),
            confidence: textAnalysis.toxicity
          };
        }
      } else if (subject.nsfwResults) {
        // NSFW content analysis
        const maxScore = Math.max(...subject.nsfwResults.map((r: NSFWScanResult) => r.score || 0));
        
        if (maxScore > this.warningThresholds.nsfw) {
          action = {
            action: 'blur',
            reason: 'NSFW content detected',
            severity: 'high',
            timestamp: Date.now(),
            confidence: maxScore
          };
        }
      } else if (subject.ageResult) {
        // Age verification
        const ageResult = subject.ageResult as AgeEstimateResult;
        
        if ((ageResult.ageEstimate || ageResult.estimatedAge) < this.warningThresholds.age) {
          action = {
            action: 'ban',
            reason: 'Underage user detected',
            severity: 'critical',
            timestamp: Date.now(),
            duration: 604800, // 7 days
            confidence: ageResult.confidence
          };
        }
      } else if (subject.profanityResult) {
        // Profanity analysis
        const profanityResult = subject.profanityResult as ProfanityResult;
        
        if ((profanityResult.badnessScore || 0) > this.warningThresholds.profanity) {
          action = {
            action: profanityResult.severity === 'critical' ? 'ban' : 'timeout',
            reason: `Profanity detected (${profanityResult.severity})`,
            severity: profanityResult.severity || 'medium',
            timestamp: Date.now(),
            duration: profanityResult.severity === 'critical' ? 86400 : 3600,
            confidence: profanityResult.badnessScore || 0
          };
        }
      }

      // Emit warning event if action is not 'none'
      if (action.action !== 'none') {
        const warningEvent: AIWarningEvent = {
          type: 'moderation_warning',
          userId: subject.userId || 'unknown',
          severity: action.severity,
          details: { action },
          timestamp: Date.now()
        };

        this.emit('ai:warning', warningEvent);
        logger.warn('Policy violation detected', { action, subject });
      }

      logger.info('Policy enforcement completed', { action });
      return action;
    } catch (error) {
      logger.error('Policy enforcement failed:', error);
      throw error;
    }
  }

  /**
   * Process moderation request
   */
  async processModerationRequest(request: ModerationRequest): Promise<ServiceResponse<any>> {
    const requestId = this.generateRequestId();
    
    try {
      logger.info('Processing moderation request', { requestId, type: request.type });

      let result: any;

      switch (request.type) {
        case 'nsfw_scan':
          result = await this.nsfw_frame_scan(request.data.videoUrl as string, request.data.streamFrames as Buffer[]);
          break;
        case 'age_estimate':
          if (!request.data.faceFrame) {
            throw new Error('faceFrame is required for age estimation');
          }
          result = await this.age_estimate(request.data.faceFrame as Buffer);
          break;
        case 'profanity_check':
          if (!request.data.realtimeAudio) {
            throw new Error('realtimeAudio is required for profanity check');
          }
          result = await this.asr_profanity(request.data.realtimeAudio as Buffer);
          break;
        case 'policy_enforce':
          result = await this.policy_enforcer(request.data.subject);
          break;
        default:
          throw new Error(`Unknown moderation request type: ${request.type}`);
      }

      return {
        success: true,
        data: result,
        timestamp: Date.now(),
        requestId
      };
    } catch (error) {
      logger.error('Moderation request failed', { requestId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
        requestId
      };
    }
  }

  /**
   * Extract frames from video URL
   */
  private async extractFramesFromVideo(videoUrl: string): Promise<Buffer[]> {
    // Placeholder for video frame extraction
    // In production, this would use ffmpeg or similar
    logger.info('Extracting frames from video', { videoUrl });
    
    // Simulate frame extraction
    const frameCount = 30; // 1 second at 30fps
    const frames: Buffer[] = [];
    
    for (let i = 0; i < frameCount; i++) {
      frames.push(Buffer.from(`frame_${i}`));
    }
    
    return frames;
  }

  /**
   * Aggregate NSFW scan results
   */
  private aggregateNSFWResults(results: NSFWScanResult[]): NSFWScanResult {
    const avgScore = results.reduce((sum, r) => sum + (r.score || 0), 0) / results.length;
    const maxScore = Math.max(...results.map(r => r.score || 0));
    const nsfwCount = results.filter(r => r.label !== 'safe').length;
    
    let label: NSFWScanResult['label'] = 'safe';
    if (maxScore > 0.8) label = 'nsfw';
    else if (maxScore > 0.6) label = 'explicit';
    else if (maxScore > 0.4) label = 'violence';
    
    return {
      isNSFW: maxScore > 0.6,
      confidence: avgScore,
      categories: nsfwCount > 0 ? ['nsfw'] : [],
      timestamp: Date.now(),
      label,
      score: maxScore
    };
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `mod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update warning thresholds
   */
  updateThresholds(thresholds: Partial<typeof this.warningThresholds>): void {
    this.warningThresholds = { ...this.warningThresholds, ...thresholds };
    logger.info('Updated warning thresholds', { thresholds: this.warningThresholds });
  }

  /**
   * Get current thresholds
   */
  getThresholds(): typeof this.warningThresholds {
    return { ...this.warningThresholds };
  }
}

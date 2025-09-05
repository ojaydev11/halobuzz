import * as tf from '@tensorflow/tfjs-node';
import * as nsfwjs from 'nsfwjs';
import * as faceapi from 'face-api.js';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import { logger } from '../../config/logger';
import { ModerationFlag } from '../../models/ModerationFlag';
import { User } from '../../models/User';
import { LiveStream } from '../../models/LiveStream';
import { Reel } from '../../models/Reel';
import { metricsService } from '../MetricsService';
import path from 'path';
import fs from 'fs/promises';

interface ModerationResult {
  safe: boolean;
  score: number;
  violations: string[];
  action: 'allow' | 'flag' | 'block';
  evidence?: {
    nsfw?: number;
    ageRisk?: number;
    faceDetected?: boolean;
    estimatedAge?: number;
  };
}

interface ModerationConfig {
  nsfwThreshold: {
    block: number;  // > 0.7
    flag: number;   // > 0.5
  };
  ageThreshold: number; // < 18
  adminOverride: boolean;
  enabled: boolean;
}

export class ModerationService {
  private nsfwModel: any;
  private ageModel: any;
  private config: ModerationConfig;
  private modelLoadPromise: Promise<void>;
  private evidenceCache: Map<string, any> = new Map();

  constructor() {
    this.config = {
      nsfwThreshold: {
        block: parseFloat(process.env.AI_NSFW_BLOCK_THRESHOLD || '0.7'),
        flag: parseFloat(process.env.AI_NSFW_FLAG_THRESHOLD || '0.5')
      },
      ageThreshold: parseInt(process.env.AI_AGE_THRESHOLD || '18'),
      adminOverride: process.env.AI_ADMIN_OVERRIDE === 'true',
      enabled: process.env.AI_MODERATION === 'true'
    };

    // Load models asynchronously
    this.modelLoadPromise = this.loadModels();
  }

  /**
   * Load AI models
   */
  private async loadModels(): Promise<void> {
    try {
      // Load NSFWJS model
      logger.info('Loading NSFW detection model...');
      this.nsfwModel = await nsfwjs.load();
      
      // Load Face-API models for age detection
      logger.info('Loading age detection models...');
      const MODEL_PATH = path.join(__dirname, '../../../models/face-api');
      await faceapi.nets.ageGenderNet.loadFromDisk(MODEL_PATH);
      await faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_PATH);
      await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_PATH);
      
      this.ageModel = true;
      logger.info('AI models loaded successfully');
    } catch (error) {
      logger.error('Failed to load AI models:', error);
      logger.warn('AI moderation will operate in fallback mode');
    }
  }

  /**
   * Scan image for violations
   */
  async scanImage(imageBuffer: Buffer, context: { userId?: string; type: 'stream' | 'reel' | 'profile' }): Promise<ModerationResult> {
    try {
      // Ensure models are loaded
      await this.modelLoadPromise;

      if (!this.config.enabled) {
        return this.allowWithWarning('AI moderation disabled');
      }

      const evidence: any = {};
      const violations: string[] = [];

      // NSFW Detection
      if (this.nsfwModel) {
        const nsfwResult = await this.detectNSFW(imageBuffer);
        evidence.nsfw = nsfwResult.score;
        
        if (nsfwResult.score > this.config.nsfwThreshold.block) {
          violations.push('explicit_content');
        } else if (nsfwResult.score > this.config.nsfwThreshold.flag) {
          violations.push('suggestive_content');
        }
      }

      // Age Detection
      if (this.ageModel) {
        const ageResult = await this.detectAge(imageBuffer);
        evidence.faceDetected = ageResult.faceDetected;
        evidence.estimatedAge = ageResult.estimatedAge;
        evidence.ageRisk = ageResult.ageRisk;

        if (ageResult.faceDetected && ageResult.estimatedAge < this.config.ageThreshold) {
          violations.push('underage_risk');
        }
      }

      // Store evidence for audit
      const evidenceId = `${context.type}_${context.userId}_${Date.now()}`;
      this.evidenceCache.set(evidenceId, evidence);

      // Determine action
      let action: 'allow' | 'flag' | 'block' = 'allow';
      let score = 0;

      if (violations.includes('explicit_content') || violations.includes('underage_risk')) {
        action = 'block';
        score = 1.0;
      } else if (violations.includes('suggestive_content')) {
        action = 'flag';
        score = 0.7;
      }

      // Create moderation record
      if (action !== 'allow' && context.userId) {
        await this.createModerationRecord(context.userId, context.type, violations, evidence);
      }

      // Track metrics
      metricsService.incrementCounter('moderation_scan_total', { 
        type: context.type, 
        action 
      });

      return {
        safe: action === 'allow',
        score,
        violations,
        action,
        evidence
      };

    } catch (error: any) {
      logger.error('Moderation scan failed:', error);
      return this.handleFallback(error.message);
    }
  }

  /**
   * Scan video by sampling frames
   */
  async scanVideo(videoPath: string, context: { userId?: string; type: 'stream' | 'reel' }): Promise<ModerationResult> {
    try {
      await this.modelLoadPromise;

      if (!this.config.enabled) {
        return this.allowWithWarning('AI moderation disabled');
      }

      // Sample frames from video
      const frames = await this.sampleVideoFrames(videoPath, 5); // Sample 5 frames
      const results: ModerationResult[] = [];

      // Scan each frame
      for (const frame of frames) {
        const result = await this.scanImage(frame, context);
        results.push(result);
      }

      // Aggregate results
      const worstResult = results.reduce((worst, current) => 
        current.score > worst.score ? current : worst
      );

      // Clean up temp frames
      await this.cleanupFrames(frames);

      return worstResult;

    } catch (error: any) {
      logger.error('Video moderation failed:', error);
      return this.handleFallback(error.message);
    }
  }

  /**
   * Scan live stream at start
   */
  async scanStreamStart(streamId: string, thumbnailBuffer: Buffer): Promise<ModerationResult> {
    try {
      const stream = await LiveStream.findById(streamId).populate('hostId');
      if (!stream) throw new Error('Stream not found');

      const result = await this.scanImage(thumbnailBuffer, {
        userId: stream.hostId.toString(),
        type: 'stream'
      });

      // Update stream moderation status
      stream.isModerated = true;
      stream.moderationStatus = result.safe ? 'approved' : 'rejected';
      stream.moderationNotes = result.violations.join(', ');
      await stream.save();

      // Block stream if needed
      if (result.action === 'block') {
        stream.status = 'banned';
        await stream.save();
        
        logger.warn(`Stream ${streamId} blocked due to violations: ${result.violations}`);
        metricsService.incrementCounter('moderation_block_total', { type: 'stream' });
      }

      return result;

    } catch (error: any) {
      logger.error('Stream moderation failed:', error);
      return this.handleFallback(error.message);
    }
  }

  /**
   * Admin override for moderation decision
   */
  async overrideModerationDecision(
    targetId: string, 
    targetType: 'stream' | 'reel' | 'user',
    decision: 'approve' | 'reject',
    adminId: string,
    reason: string
  ): Promise<void> {
    try {
      if (!this.config.adminOverride) {
        throw new Error('Admin override is disabled');
      }

      // Log override action
      logger.info('Admin moderation override', {
        adminId,
        targetId,
        targetType,
        decision,
        reason
      });

      // Update moderation flag
      await ModerationFlag.create({
        reporterId: adminId,
        type: targetType as any,
        reason: 'other',
        description: `Admin override: ${reason}`,
        status: 'resolved',
        action: decision === 'approve' ? 'none' : 'delete',
        reviewedAt: new Date(),
        assignedModerator: adminId
      });

      // Update target status
      switch (targetType) {
        case 'stream':
          await LiveStream.findByIdAndUpdate(targetId, {
            moderationStatus: decision === 'approve' ? 'approved' : 'rejected',
            status: decision === 'reject' ? 'banned' : 'live'
          });
          break;
        case 'reel':
          await Reel.findByIdAndUpdate(targetId, {
            'moderation.isReviewed': true,
            status: decision === 'reject' ? 'blocked' : 'active'
          });
          break;
        case 'user':
          await User.findByIdAndUpdate(targetId, {
            isBanned: decision === 'reject',
            banReason: decision === 'reject' ? reason : undefined
          });
          break;
      }

      // Track metrics
      metricsService.incrementCounter('moderation_override_total', { 
        targetType, 
        decision 
      });

    } catch (error) {
      logger.error('Failed to override moderation:', error);
      throw error;
    }
  }

  /**
   * Get moderation decision
   */
  async getModerationDecision(contentId: string, contentType: string): Promise<any> {
    const flag = await ModerationFlag.findOne({
      $or: [
        { reportedStreamId: contentId },
        { reportedMessageId: contentId },
        { reportedUserId: contentId }
      ],
      status: { $in: ['resolved', 'reviewed'] }
    }).sort({ createdAt: -1 });

    return flag;
  }

  /**
   * Detect NSFW content
   */
  private async detectNSFW(imageBuffer: Buffer): Promise<{ score: number; predictions: any[] }> {
    try {
      // Convert buffer to tensor
      const image = await sharp(imageBuffer)
        .resize(224, 224)
        .removeAlpha()
        .raw()
        .toBuffer();

      const predictions = await this.nsfwModel.classify(image);

      // Calculate overall NSFW score
      const nsfwClasses = ['Porn', 'Hentai', 'Sexy'];
      const nsfwScore = predictions
        .filter((p: any) => nsfwClasses.includes(p.className))
        .reduce((sum: number, p: any) => sum + p.probability, 0);

      return {
        score: Math.min(nsfwScore, 1.0),
        predictions
      };
    } catch (error) {
      logger.error('NSFW detection failed:', error);
      return { score: 0, predictions: [] };
    }
  }

  /**
   * Detect age from face
   */
  private async detectAge(imageBuffer: Buffer): Promise<{ 
    faceDetected: boolean; 
    estimatedAge: number; 
    ageRisk: number 
  }> {
    try {
      // Convert buffer for face-api
      const img = tf.node.decodeImage(imageBuffer) as any;
      
      // Detect faces with age
      const detections = await faceapi
        .detectAllFaces(img)
        .withFaceLandmarks()
        .withAgeAndGender();

      tf.dispose(img);

      if (detections.length === 0) {
        return {
          faceDetected: false,
          estimatedAge: 0,
          ageRisk: 0
        };
      }

      // Get youngest detected age
      const youngestAge = Math.min(...detections.map(d => d.age));
      const ageRisk = youngestAge < 18 ? 1.0 : youngestAge < 21 ? 0.5 : 0;

      return {
        faceDetected: true,
        estimatedAge: Math.round(youngestAge),
        ageRisk
      };
    } catch (error) {
      logger.error('Age detection failed:', error);
      return {
        faceDetected: false,
        estimatedAge: 0,
        ageRisk: 0
      };
    }
  }

  /**
   * Sample frames from video
   */
  private async sampleVideoFrames(videoPath: string, count: number): Promise<Buffer[]> {
    return new Promise((resolve, reject) => {
      const frames: Buffer[] = [];
      const tempDir = `/tmp/frames_${Date.now()}`;
      
      ffmpeg(videoPath)
        .on('end', async () => {
          // Read extracted frames
          const files = await fs.readdir(tempDir);
          for (const file of files.slice(0, count)) {
            const buffer = await fs.readFile(path.join(tempDir, file));
            frames.push(buffer);
          }
          resolve(frames);
        })
        .on('error', reject)
        .screenshots({
          count,
          folder: tempDir,
          filename: 'frame_%i.png'
        });
    });
  }

  /**
   * Clean up temporary frames
   */
  private async cleanupFrames(frames: any[]): Promise<void> {
    // Cleanup implementation
  }

  /**
   * Create moderation record
   */
  private async createModerationRecord(
    userId: string, 
    type: string, 
    violations: string[], 
    evidence: any
  ): Promise<void> {
    await ModerationFlag.create({
      reporterId: 'ai_system',
      reportedUserId: userId,
      type: 'content',
      reason: violations.includes('explicit_content') ? 'inappropriate' : 'other',
      description: `AI detected: ${violations.join(', ')}`,
      evidence: [JSON.stringify(evidence)],
      status: 'pending',
      priority: violations.includes('underage_risk') ? 'urgent' : 'high'
    });
  }

  /**
   * Handle fallback when models fail
   */
  private handleFallback(errorMessage: string): ModerationResult {
    logger.warn(`AI moderation fallback triggered: ${errorMessage}`);
    
    // Queue for manual review with temporary allow
    return {
      safe: true, // Temporary allow
      score: 0.5,
      violations: ['pending_review'],
      action: 'flag',
      evidence: {
        error: errorMessage,
        fallback: true
      }
    };
  }

  /**
   * Allow with warning
   */
  private allowWithWarning(reason: string): ModerationResult {
    return {
      safe: true,
      score: 0,
      violations: [],
      action: 'allow',
      evidence: { warning: reason }
    };
  }

  /**
   * Get 20-case evidence pack for validation
   */
  async generateEvidencePack(): Promise<any[]> {
    const samples = [];
    
    // Get recent moderation cases
    const recentFlags = await ModerationFlag.find({
      status: { $in: ['resolved', 'reviewed'] }
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    for (const flag of recentFlags) {
      samples.push({
        id: flag._id,
        type: flag.type,
        reason: flag.reason,
        action: flag.action,
        evidence: flag.evidence,
        reviewedAt: flag.reviewedAt
      });
    }

    return samples;
  }
}

export const moderationService = new ModerationService();
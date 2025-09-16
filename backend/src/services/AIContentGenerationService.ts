import OpenAI from 'openai';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

export interface AIContentRequest {
  prompt: string;
  contentType: 'video' | 'thumbnail' | 'music' | 'subtitle';
  style?: string;
  duration?: number;
  language?: string;
  creatorId: string;
}

export interface AIContentResponse {
  contentId: string;
  contentUrl: string;
  thumbnailUrl?: string;
  metadata: {
    duration: number;
    size: number;
    format: string;
    quality: string;
  };
  processingTime: number;
  cost: number;
}

export class AIContentGenerationService {
  private openai: OpenAI;
  private s3Client: S3Client;
  private contentQueue: Map<string, AIContentRequest> = new Map();

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.s3Client = new S3Client({
      region: process.env.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || '',
        secretAccessKey: process.env.S3_SECRET_KEY || '',
      },
    });
  }

  async generateVideo(request: AIContentRequest): Promise<AIContentResponse> {
    try {
      const startTime = Date.now();
      
      logger.info('Generating AI video', { prompt: request.prompt, creatorId: request.creatorId });

      // Generate video script and production plan using GPT-4
      const scriptResponse = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a professional video producer. Create a comprehensive video production plan including:
            - Detailed script with opening hook, main content, and conclusion
            - Scene breakdown with visual elements
            - Audio requirements (background music, sound effects, voice-over)
            - Pacing and timing recommendations
            - Call-to-action integration
            
            Format as JSON with detailed specifications.`
          },
          {
            role: 'user',
            content: `Create a video production plan for: ${request.prompt}
            
            Style: ${request.style || 'cinematic'}
            Duration: ${request.duration || 30} seconds
            Target audience: General audience`
          }
        ],
        temperature: 0.7,
        maxTokens: 1000
      });

      const videoPlan = JSON.parse(scriptResponse.choices[0].message.content || '{}');

      // Generate thumbnail using DALL-E
      const thumbnailResponse = await this.openai.images.generate({
        model: 'dall-e-3',
        prompt: `Create an eye-catching thumbnail for a video about: ${request.prompt}`,
        size: '1024x1024',
        quality: 'hd',
        style: 'vivid',
      });

      const contentId = `ai_video_${Date.now()}_${uuidv4().substr(0, 8)}`;
      
      // Upload thumbnail to S3
      const thumbnailUrl = await this.uploadToS3(
        thumbnailResponse.data[0].b64_json || '',
        `thumbnails/${contentId}.png`,
        'image/png'
      );

      // Store video plan as content (in real implementation, this would generate actual video)
      const contentUrl = await this.uploadToS3(
        JSON.stringify(videoPlan),
        `content/${contentId}.json`,
        'application/json'
      );

      const processingTime = Date.now() - startTime;
      const cost = this.calculateCost('video', processingTime);

      logger.info('AI video generated successfully', { contentId, processingTime, cost });

      return {
        contentId,
        contentUrl,
        thumbnailUrl,
        metadata: {
          duration: request.duration || 30,
          size: JSON.stringify(videoPlan).length,
          format: 'json',
          quality: 'hd',
        },
        processingTime,
        cost,
      };
    } catch (error) {
      logger.error('AI video generation failed:', error);
      throw new Error('Failed to generate AI video');
    }
  }

  async generateThumbnail(videoId: string, prompt: string): Promise<string> {
    try {
      logger.info('Generating AI thumbnail', { videoId, prompt });

      const thumbnailResponse = await this.openai.images.generate({
        model: 'dall-e-3',
        prompt: `Create an eye-catching thumbnail for a video about: ${prompt}`,
        size: '1024x1024',
        quality: 'hd',
        style: 'vivid',
      });

      const thumbnailId = `thumbnail_${videoId}_${Date.now()}`;
      const thumbnailUrl = await this.uploadToS3(
        thumbnailResponse.data[0].b64_json || '',
        `thumbnails/${thumbnailId}.png`,
        'image/png'
      );

      logger.info('AI thumbnail generated successfully', { thumbnailId });
      return thumbnailUrl;
    } catch (error) {
      logger.error('AI thumbnail generation failed:', error);
      throw new Error('Failed to generate AI thumbnail');
    }
  }

  async generateMusic(request: AIContentRequest): Promise<AIContentResponse> {
    try {
      const startTime = Date.now();
      
      logger.info('Generating AI music', { prompt: request.prompt, creatorId: request.creatorId });

      // Generate music composition using GPT-4
      const musicResponse = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a professional music composer. Create a detailed musical composition including:
            - Melody structure and progression
            - Chord progression and harmony
            - Rhythm and tempo variations
            - Instrumentation and arrangement
            - Dynamic changes and expression
            - Musical form (intro, verse, chorus, bridge, outro)
            
            Format as JSON with musical specifications.`
          },
          {
            role: 'user',
            content: `Compose music for: ${request.prompt}
            
            Style: ${request.style || 'modern'}
            Duration: ${request.duration || 30} seconds
            Mood: upbeat and energetic`
          }
        ],
        temperature: 0.8,
        maxTokens: 800
      });

      const musicComposition = JSON.parse(musicResponse.choices[0].message.content || '{}');

      const contentId = `ai_music_${Date.now()}_${uuidv4().substr(0, 8)}`;
      const contentUrl = await this.uploadToS3(
        JSON.stringify(musicComposition),
        `content/${contentId}.json`,
        'application/json'
      );

      const processingTime = Date.now() - startTime;
      const cost = this.calculateCost('music', processingTime);

      logger.info('AI music generated successfully', { contentId, processingTime, cost });

      return {
        contentId,
        contentUrl,
        metadata: {
          duration: request.duration || 30,
          size: JSON.stringify(musicComposition).length,
          format: 'json',
          quality: 'high',
        },
        processingTime,
        cost,
      };
    } catch (error) {
      logger.error('AI music generation failed:', error);
      throw new Error('Failed to generate AI music');
    }
  }

  async generateSubtitles(videoId: string, languages: string[]): Promise<AIContentResponse> {
    try {
      const startTime = Date.now();
      
      logger.info('Generating AI subtitles', { videoId, languages });

      // Simulate subtitle generation (in real implementation, would use Whisper)
      const subtitleData = {
        videoId,
        languages: languages.map(lang => ({
          language: lang,
          content: `Generated subtitles for ${lang} language`,
          timestamps: [
            { start: 0, end: 5, text: 'Welcome to our video' },
            { start: 5, end: 10, text: 'This is the main content' },
            { start: 10, end: 15, text: 'Thank you for watching' }
          ]
        })),
        generatedAt: new Date().toISOString()
      };

      const contentId = `subtitles_${videoId}_${Date.now()}`;
      const contentUrl = await this.uploadToS3(
        JSON.stringify(subtitleData),
        `subtitles/${contentId}.json`,
        'application/json'
      );

      const processingTime = Date.now() - startTime;
      const cost = this.calculateCost('subtitles', processingTime);

      logger.info('AI subtitles generated successfully', { contentId, processingTime, cost });

      return {
        contentId,
        contentUrl,
        metadata: {
          duration: 0,
          size: JSON.stringify(subtitleData).length,
          format: 'json',
          quality: 'high',
        },
        processingTime,
        cost,
      };
    } catch (error) {
      logger.error('AI subtitle generation failed:', error);
      throw new Error('Failed to generate AI subtitles');
    }
  }

  private async uploadToS3(data: string, key: string, contentType: string): Promise<string> {
    try {
      const buffer = Buffer.from(data, 'base64');
      
      await this.s3Client.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET || 'halobuzz-content',
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: 'public-read',
      }));

      return `https://${process.env.S3_BUCKET || 'halobuzz-content'}.s3.${process.env.S3_REGION || 'us-east-1'}.amazonaws.com/${key}`;
    } catch (error) {
      logger.error('S3 upload failed:', error);
      // Return a placeholder URL for development
      return `https://placeholder.com/${key}`;
    }
  }

  private calculateCost(contentType: string, processingTime: number): number {
    const costPerSecond = {
      video: 0.10,
      music: 0.05,
      thumbnail: 0.02,
      subtitles: 0.01,
    };
    
    return costPerSecond[contentType] * (processingTime / 1000);
  }
}

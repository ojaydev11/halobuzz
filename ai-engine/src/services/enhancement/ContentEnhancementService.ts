import logger from '../../utils/logger';
import { aiModelManager } from '../../utils/ai-models';
import sharp from 'sharp';

export interface ThumbnailOptions {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  engagementScore: number;
  a_b_test_group: string;
  generatedAt: Date;
}

export interface EditingSuggestions {
  cuts: Array<{
    startTime: number;
    endTime: number;
    reason: string;
    confidence: number;
  }>;
  transitions: Array<{
    position: number;
    type: string;
    reason: string;
  }>;
  effects: Array<{
    type: string;
    intensity: number;
    reason: string;
  }>;
  audio: {
    volumeAdjustments: Array<{
      startTime: number;
      endTime: number;
      adjustment: number;
    }>;
    backgroundMusic: {
      suggested: boolean;
      genre: string;
      intensity: number;
    };
  };
  overallScore: number;
  suggestions: string[];
}

export interface ContentMetadata {
  title: string;
  description: string;
  hashtags: string[];
  category: string;
  tags: string[];
  targetAudience: string[];
  optimalPostingTime: Date;
  engagementPrediction: {
    likes: number;
    shares: number;
    comments: number;
    views: number;
  };
  culturalAdaptations: Array<{
    language: string;
    region: string;
    adaptedTitle: string;
    adaptedDescription: string;
    adaptedHashtags: string[];
  }>;
}

export interface Subtitles {
  language: string;
  segments: Array<{
    startTime: number;
    endTime: number;
    text: string;
    confidence: number;
  }>;
  totalDuration: number;
  generatedAt: Date;
}

export interface EnhancementRequest {
  contentId: string;
  contentType: 'video' | 'image' | 'audio' | 'text';
  contentBuffer?: Buffer;
  contentUrl?: string;
  targetLanguages?: string[];
  enhancementTypes: ('thumbnails' | 'editing' | 'metadata' | 'subtitles')[];
  creatorPreferences?: {
    style: string;
    brandColors: string[];
    targetAudience: string[];
  };
}

export class AIContentEnhancer {
  private static instance: AIContentEnhancer;
  private thumbnailCache: Map<string, ThumbnailOptions[]> = new Map();
  private metadataCache: Map<string, ContentMetadata> = new Map();
  private subtitleCache: Map<string, Subtitles[]> = new Map();

  private constructor() {
    logger.info('AIContentEnhancer initialized');
  }

  static getInstance(): AIContentEnhancer {
    if (!AIContentEnhancer.instance) {
      AIContentEnhancer.instance = new AIContentEnhancer();
    }
    return AIContentEnhancer.instance;
  }

  /**
   * Auto-generate thumbnails with A/B testing
   */
  async generateSmartThumbnails(videoId: string): Promise<ThumbnailOptions[]> {
    try {
      // Check cache first
      const cached = this.thumbnailCache.get(videoId);
      if (cached) {
        logger.info(`Returning cached thumbnails for video ${videoId}`);
        return cached;
      }

      // Get video metadata
      const videoMetadata = await this.getVideoMetadata(videoId);
      if (!videoMetadata) {
        throw new Error(`Video metadata not found for ${videoId}`);
      }

      const thumbnails: ThumbnailOptions[] = [];

      // Generate multiple thumbnail variations
      const variations = [
        { style: 'dramatic', focus: 'face', color: 'vibrant' },
        { style: 'minimal', focus: 'action', color: 'muted' },
        { style: 'text_overlay', focus: 'scene', color: 'high_contrast' },
        { style: 'split_screen', focus: 'multiple', color: 'balanced' },
        { style: 'close_up', focus: 'emotion', color: 'warm' }
      ];

      for (let i = 0; i < variations.length; i++) {
        const variation = variations[i];
        const thumbnail = await this.generateThumbnailVariation(
          videoMetadata,
          variation,
          `group_${i % 2 === 0 ? 'A' : 'B'}`
        );
        thumbnails.push(thumbnail);
      }

      // Score thumbnails using AI
      const scoredThumbnails = await this.scoreThumbnails(thumbnails, videoMetadata);
      
      // Cache results
      this.thumbnailCache.set(videoId, scoredThumbnails);

      logger.info(`Generated ${scoredThumbnails.length} smart thumbnails for video ${videoId}`);
      return scoredThumbnails;
    } catch (error) {
      logger.error('Error generating smart thumbnails:', error);
      throw error;
    }
  }

  /**
   * Real-time auto-editing suggestions
   */
  async suggestEdits(videoBuffer: Buffer): Promise<EditingSuggestions> {
    try {
      // Analyze video content using AI
      const analysis = await this.analyzeVideoContent(videoBuffer);
      
      const suggestions: EditingSuggestions = {
        cuts: [],
        transitions: [],
        effects: [],
        audio: {
          volumeAdjustments: [],
          backgroundMusic: {
            suggested: false,
            genre: '',
            intensity: 0
          }
        },
        overallScore: 0,
        suggestions: []
      };

      // Generate cut suggestions
      suggestions.cuts = await this.generateCutSuggestions(analysis);
      
      // Generate transition suggestions
      suggestions.transitions = await this.generateTransitionSuggestions(analysis);
      
      // Generate effect suggestions
      suggestions.effects = await this.generateEffectSuggestions(analysis);
      
      // Generate audio suggestions
      suggestions.audio = await this.generateAudioSuggestions(analysis);
      
      // Calculate overall score
      suggestions.overallScore = this.calculateOverallScore(analysis);
      
      // Generate general suggestions
      suggestions.suggestions = await this.generateGeneralSuggestions(analysis);

      logger.info('Generated editing suggestions', {
        cutsCount: suggestions.cuts.length,
        transitionsCount: suggestions.transitions.length,
        effectsCount: suggestions.effects.length,
        overallScore: suggestions.overallScore
      });

      return suggestions;
    } catch (error) {
      logger.error('Error generating editing suggestions:', error);
      throw error;
    }
  }

  /**
   * AI-powered hashtag and title suggestions
   */
  async generateContentMetadata(content: any): Promise<ContentMetadata> {
    try {
      const contentId = content.id || 'temp_' + Date.now();
      
      // Check cache first
      const cached = this.metadataCache.get(contentId);
      if (cached) {
        logger.info(`Returning cached metadata for content ${contentId}`);
        return cached;
      }

      // Analyze content using AI
      const analysis = await this.analyzeContentForMetadata(content);
      
      const metadata: ContentMetadata = {
        title: await this.generateOptimalTitle(analysis),
        description: await this.generateOptimalDescription(analysis),
        hashtags: await this.generateHashtags(analysis),
        category: await this.determineCategory(analysis),
        tags: await this.generateTags(analysis),
        targetAudience: await this.identifyTargetAudience(analysis),
        optimalPostingTime: await this.calculateOptimalPostingTime(analysis),
        engagementPrediction: await this.predictEngagement(analysis),
        culturalAdaptations: await this.generateCulturalAdaptations(analysis)
      };

      // Cache results
      this.metadataCache.set(contentId, metadata);

      logger.info('Generated content metadata', {
        contentId,
        hashtagsCount: metadata.hashtags.length,
        targetAudienceCount: metadata.targetAudience.length,
        culturalAdaptationsCount: metadata.culturalAdaptations.length
      });

      return metadata;
    } catch (error) {
      logger.error('Error generating content metadata:', error);
      throw error;
    }
  }

  /**
   * Automatic subtitle generation in multiple languages
   */
  async generateSubtitles(audioBuffer: Buffer, targetLanguages: string[]): Promise<Subtitles[]> {
    try {
      const cacheKey = `subtitles_${Buffer.from(audioBuffer).toString('base64').slice(0, 20)}`;
      
      // Check cache first
      const cached = this.subtitleCache.get(cacheKey);
      if (cached) {
        logger.info('Returning cached subtitles');
        return cached;
      }

      const subtitles: Subtitles[] = [];

      // Generate subtitles for each target language
      for (const language of targetLanguages) {
        const subtitle = await this.generateSubtitleForLanguage(audioBuffer, language);
        subtitles.push(subtitle);
      }

      // Cache results
      this.subtitleCache.set(cacheKey, subtitles);

      logger.info(`Generated subtitles for ${targetLanguages.length} languages`, {
        languages: targetLanguages,
        totalSegments: subtitles.reduce((sum, sub) => sum + sub.segments.length, 0)
      });

      return subtitles;
    } catch (error) {
      logger.error('Error generating subtitles:', error);
      throw error;
    }
  }

  /**
   * Enhance content with multiple AI-powered features
   */
  async enhanceContent(request: EnhancementRequest): Promise<{
    thumbnails?: ThumbnailOptions[];
    editingSuggestions?: EditingSuggestions;
    metadata?: ContentMetadata;
    subtitles?: Subtitles[];
  }> {
    try {
      const results: any = {};

      // Generate thumbnails if requested
      if (request.enhancementTypes.includes('thumbnails')) {
        results.thumbnails = await this.generateSmartThumbnails(request.contentId);
      }

      // Generate editing suggestions if requested
      if (request.enhancementTypes.includes('editing') && request.contentBuffer) {
        results.editingSuggestions = await this.suggestEdits(request.contentBuffer);
      }

      // Generate metadata if requested
      if (request.enhancementTypes.includes('metadata')) {
        const contentData = await this.getContentData(request.contentId, request.contentUrl);
        results.metadata = await this.generateContentMetadata(contentData);
      }

      // Generate subtitles if requested
      if (request.enhancementTypes.includes('subtitles') && request.contentBuffer) {
        results.subtitles = await this.generateSubtitles(
          request.contentBuffer,
          request.targetLanguages || ['en']
        );
      }

      logger.info('Content enhancement completed', {
        contentId: request.contentId,
        enhancementTypes: request.enhancementTypes,
        resultsCount: Object.keys(results).length
      });

      return results;
    } catch (error) {
      logger.error('Error enhancing content:', error);
      throw error;
    }
  }

  // Private helper methods
  private async generateThumbnailVariation(
    videoMetadata: any,
    variation: any,
    testGroup: string
  ): Promise<ThumbnailOptions> {
    try {
      // Mock thumbnail generation - in real implementation, use video processing
      const thumbnailUrl = `https://example.com/thumbnails/${videoMetadata.id}_${variation.style}.jpg`;
      
      const prompt = `
        Generate a compelling thumbnail title and description for this video:
        Title: ${videoMetadata.title}
        Category: ${videoMetadata.category}
        Style: ${variation.style}
        Focus: ${variation.focus}
        Color: ${variation.color}
        
        Create an engaging title (max 60 chars) and description (max 120 chars) that will increase click-through rate.
      `;

      const aiResponse = await aiModelManager.generateText(prompt);
      const [title, description] = aiResponse.split('\n').slice(0, 2);

      return {
        id: `thumb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        imageUrl: thumbnailUrl,
        title: title?.trim() || videoMetadata.title,
        description: description?.trim() || videoMetadata.description,
        engagementScore: Math.random() * 0.4 + 0.6, // 0.6-1.0
        a_b_test_group: testGroup,
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Error generating thumbnail variation:', error);
      throw error;
    }
  }

  private async scoreThumbnails(thumbnails: ThumbnailOptions[], videoMetadata: any): Promise<ThumbnailOptions[]> {
    try {
      const scoredThumbnails = await Promise.all(
        thumbnails.map(async (thumbnail) => {
          const prompt = `
            Score this thumbnail for engagement potential (0-1):
            Title: ${thumbnail.title}
            Description: ${thumbnail.description}
            Video Category: ${videoMetadata.category}
            Video Title: ${videoMetadata.title}
            
            Consider: click-through potential, emotional appeal, clarity, relevance.
            Return only a number between 0 and 1.
          `;

          const scoreResponse = await aiModelManager.generateText(prompt);
          const score = parseFloat(scoreResponse.trim());
          
          return {
            ...thumbnail,
            engagementScore: isNaN(score) ? thumbnail.engagementScore : Math.max(0, Math.min(1, score))
          };
        })
      );

      return scoredThumbnails.sort((a, b) => b.engagementScore - a.engagementScore);
    } catch (error) {
      logger.error('Error scoring thumbnails:', error);
      return thumbnails;
    }
  }

  private async analyzeVideoContent(videoBuffer: Buffer): Promise<any> {
    // Mock video analysis - in real implementation, use video processing libraries
    return {
      duration: 120,
      scenes: [
        { startTime: 0, endTime: 30, type: 'intro', energy: 0.7 },
        { startTime: 30, endTime: 90, type: 'main_content', energy: 0.9 },
        { startTime: 90, endTime: 120, type: 'outro', energy: 0.6 }
      ],
      audioLevels: [
        { time: 0, level: 0.8 },
        { time: 60, level: 0.6 },
        { time: 120, level: 0.7 }
      ],
      visualComplexity: 0.7,
      motionIntensity: 0.8,
      colorVibrancy: 0.6
    };
  }

  private async generateCutSuggestions(analysis: any): Promise<Array<{
    startTime: number;
    endTime: number;
    reason: string;
    confidence: number;
  }>> {
    const cuts = [];
    
    // Find low-energy segments to cut
    for (const scene of analysis.scenes) {
      if (scene.energy < 0.5) {
        cuts.push({
          startTime: scene.startTime,
          endTime: scene.endTime,
          reason: 'Low energy segment',
          confidence: 0.8
        });
      }
    }

    return cuts;
  }

  private async generateTransitionSuggestions(analysis: any): Promise<Array<{
    position: number;
    type: string;
    reason: string;
  }>> {
    const transitions = [];
    
    for (let i = 0; i < analysis.scenes.length - 1; i++) {
      const currentScene = analysis.scenes[i];
      const nextScene = analysis.scenes[i + 1];
      
      if (Math.abs(currentScene.energy - nextScene.energy) > 0.3) {
        transitions.push({
          position: currentScene.endTime,
          type: 'fade',
          reason: 'Energy level change'
        });
      }
    }

    return transitions;
  }

  private async generateEffectSuggestions(analysis: any): Promise<Array<{
    type: string;
    intensity: number;
    reason: string;
  }>> {
    const effects = [];
    
    if (analysis.colorVibrancy < 0.5) {
      effects.push({
        type: 'color_enhancement',
        intensity: 0.3,
        reason: 'Low color vibrancy'
      });
    }

    if (analysis.motionIntensity > 0.8) {
      effects.push({
        type: 'stabilization',
        intensity: 0.2,
        reason: 'High motion intensity'
      });
    }

    return effects;
  }

  private async generateAudioSuggestions(analysis: any): Promise<{
    volumeAdjustments: Array<{
      startTime: number;
      endTime: number;
      adjustment: number;
    }>;
    backgroundMusic: {
      suggested: boolean;
      genre: string;
      intensity: number;
    };
  }> {
    const volumeAdjustments = [];
    
    for (const audioLevel of analysis.audioLevels) {
      if (audioLevel.level < 0.5) {
        volumeAdjustments.push({
          startTime: audioLevel.time,
          endTime: audioLevel.time + 10,
          adjustment: 0.2
        });
      }
    }

    return {
      volumeAdjustments,
      backgroundMusic: {
        suggested: analysis.visualComplexity > 0.7,
        genre: 'upbeat',
        intensity: 0.3
      }
    };
  }

  private calculateOverallScore(analysis: any): number {
    const energyScore = analysis.scenes.reduce((sum: number, scene: any) => sum + scene.energy, 0) / analysis.scenes.length;
    const audioScore = analysis.audioLevels.reduce((sum: number, level: any) => sum + level.level, 0) / analysis.audioLevels.length;
    const visualScore = (analysis.colorVibrancy + (1 - analysis.motionIntensity)) / 2;
    
    return (energyScore * 0.4 + audioScore * 0.3 + visualScore * 0.3);
  }

  private async generateGeneralSuggestions(analysis: any): Promise<string[]> {
    const suggestions = [];
    
    if (analysis.scenes.length > 5) {
      suggestions.push('Consider reducing the number of scenes for better flow');
    }
    
    if (analysis.visualComplexity > 0.8) {
      suggestions.push('High visual complexity - consider simplifying some scenes');
    }
    
    if (analysis.motionIntensity > 0.9) {
      suggestions.push('Very high motion - consider adding stabilization');
    }

    return suggestions;
  }

  private async analyzeContentForMetadata(content: any): Promise<any> {
    // Mock content analysis
    return {
      title: content.title || 'Untitled Content',
      description: content.description || '',
      category: content.category || 'general',
      tags: content.tags || [],
      duration: content.duration || 0,
      creatorId: content.creatorId,
      createdAt: content.createdAt || new Date(),
      viewCount: content.viewCount || 0,
      likeCount: content.likeCount || 0
    };
  }

  private async generateOptimalTitle(analysis: any): Promise<string> {
    const prompt = `
      Generate an engaging, SEO-optimized title for this content:
      Current Title: ${analysis.title}
      Category: ${analysis.category}
      Tags: ${analysis.tags.join(', ')}
      
      Requirements:
      - 50-60 characters max
      - Include relevant keywords
      - Create emotional appeal
      - Be click-worthy
      
      Return only the title.
    `;

    const response = await aiModelManager.generateText(prompt);
    return response.trim() || analysis.title;
  }

  private async generateOptimalDescription(analysis: any): Promise<string> {
    const prompt = `
      Generate an engaging description for this content:
      Title: ${analysis.title}
      Category: ${analysis.category}
      Current Description: ${analysis.description}
      
      Requirements:
      - 100-150 characters
      - Include call-to-action
      - Highlight key benefits
      - Be engaging and clear
      
      Return only the description.
    `;

    const response = await aiModelManager.generateText(prompt);
    return response.trim() || analysis.description;
  }

  private async generateHashtags(analysis: any): Promise<string[]> {
    const prompt = `
      Generate 10-15 relevant hashtags for this content:
      Title: ${analysis.title}
      Category: ${analysis.category}
      Tags: ${analysis.tags.join(', ')}
      
      Include:
      - 3-5 trending hashtags
      - 3-5 niche-specific hashtags
      - 2-3 branded hashtags
      - Mix of popular and less competitive tags
      
      Return only the hashtags, one per line, with # prefix.
    `;

    const response = await aiModelManager.generateText(prompt);
    return response.split('\n')
      .map(tag => tag.trim())
      .filter(tag => tag.startsWith('#'))
      .slice(0, 15);
  }

  private async determineCategory(analysis: any): Promise<string> {
    const prompt = `
      Determine the best category for this content:
      Title: ${analysis.title}
      Current Category: ${analysis.category}
      Tags: ${analysis.tags.join(', ')}
      
      Choose from: entertainment, education, lifestyle, gaming, music, dance, comedy, sports, news, technology, art, food, travel, fitness, beauty, fashion, business, science, nature, pets
      
      Return only the category name.
    `;

    const response = await aiModelManager.generateText(prompt);
    return response.trim().toLowerCase() || analysis.category;
  }

  private async generateTags(analysis: any): Promise<string[]> {
    const prompt = `
      Generate 5-8 relevant tags for this content:
      Title: ${analysis.title}
      Category: ${analysis.category}
      Current Tags: ${analysis.tags.join(', ')}
      
      Tags should be:
      - Specific and relevant
      - Searchable
      - Not too broad or too narrow
      - Include both general and specific terms
      
      Return only the tags, comma-separated.
    `;

    const response = await aiModelManager.generateText(prompt);
    return response.split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .slice(0, 8);
  }

  private async identifyTargetAudience(analysis: any): Promise<string[]> {
    const prompt = `
      Identify the target audience for this content:
      Title: ${analysis.title}
      Category: ${analysis.category}
      Tags: ${analysis.tags.join(', ')}
      
      Consider:
      - Age groups
      - Interests
      - Demographics
      - Psychographics
      
      Return 3-5 audience segments, one per line.
    `;

    const response = await aiModelManager.generateText(prompt);
    return response.split('\n')
      .map(audience => audience.trim())
      .filter(audience => audience.length > 0)
      .slice(0, 5);
  }

  private async calculateOptimalPostingTime(analysis: any): Promise<Date> {
    // Mock optimal posting time calculation
    const now = new Date();
    const optimalHour = 19; // 7 PM
    const optimalDate = new Date(now);
    optimalDate.setHours(optimalHour, 0, 0, 0);
    
    // If optimal time has passed today, set for tomorrow
    if (optimalDate <= now) {
      optimalDate.setDate(optimalDate.getDate() + 1);
    }
    
    return optimalDate;
  }

  private async predictEngagement(analysis: any): Promise<{
    likes: number;
    shares: number;
    comments: number;
    views: number;
  }> {
    // Mock engagement prediction based on content analysis
    const baseViews = 1000;
    const categoryMultiplier = this.getCategoryMultiplier(analysis.category);
    const titleScore = this.analyzeTitleEngagement(analysis.title);
    
    const predictedViews = Math.round(baseViews * categoryMultiplier * titleScore);
    
    return {
      views: predictedViews,
      likes: Math.round(predictedViews * 0.08),
      shares: Math.round(predictedViews * 0.02),
      comments: Math.round(predictedViews * 0.01)
    };
  }

  private async generateCulturalAdaptations(analysis: any): Promise<Array<{
    language: string;
    region: string;
    adaptedTitle: string;
    adaptedDescription: string;
    adaptedHashtags: string[];
  }>> {
    const adaptations = [];
    const targetRegions = ['es', 'fr', 'de', 'pt', 'ja', 'ko', 'zh'];
    
    for (const region of targetRegions) {
      const prompt = `
        Adapt this content for ${region} audience:
        Title: ${analysis.title}
        Description: ${analysis.description}
        Category: ${analysis.category}
        
        Create culturally appropriate:
        - Title (50-60 chars)
        - Description (100-150 chars)
        - 5 relevant hashtags
        
        Return in format:
        TITLE: [adapted title]
        DESCRIPTION: [adapted description]
        HASHTAGS: [hashtag1, hashtag2, hashtag3, hashtag4, hashtag5]
      `;

      try {
        const response = await aiModelManager.generateText(prompt);
        const lines = response.split('\n');
        
        const title = lines.find(line => line.startsWith('TITLE:'))?.replace('TITLE:', '').trim() || analysis.title;
        const description = lines.find(line => line.startsWith('DESCRIPTION:'))?.replace('DESCRIPTION:', '').trim() || analysis.description;
        const hashtagsLine = lines.find(line => line.startsWith('HASHTAGS:'))?.replace('HASHTAGS:', '').trim() || '';
        const hashtags = hashtagsLine.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

        adaptations.push({
          language: region,
          region: region,
          adaptedTitle: title,
          adaptedDescription: description,
          adaptedHashtags: hashtags
        });
      } catch (error) {
        logger.error(`Error adapting content for ${region}:`, error);
      }
    }

    return adaptations;
  }

  private async generateSubtitleForLanguage(audioBuffer: Buffer, language: string): Promise<Subtitles> {
    // Mock subtitle generation - in real implementation, use speech-to-text services
    const segments = [
      { startTime: 0, endTime: 5, text: 'Welcome to our amazing content', confidence: 0.95 },
      { startTime: 5, endTime: 10, text: 'Today we will explore something incredible', confidence: 0.92 },
      { startTime: 10, endTime: 15, text: 'Let me show you how this works', confidence: 0.88 }
    ];

    return {
      language,
      segments,
      totalDuration: 15,
      generatedAt: new Date()
    };
  }

  private async getVideoMetadata(videoId: string): Promise<any> {
    // Mock video metadata - in real implementation, fetch from database
    return {
      id: videoId,
      title: 'Sample Video Title',
      description: 'Sample video description',
      category: 'entertainment',
      duration: 120,
      thumbnail: 'https://example.com/thumbnail.jpg'
    };
  }

  private async getContentData(contentId: string, contentUrl?: string): Promise<any> {
    // Mock content data - in real implementation, fetch from database or URL
    return {
      id: contentId,
      title: 'Sample Content',
      description: 'Sample description',
      category: 'general',
      tags: ['sample', 'content'],
      creatorId: 'creator_1',
      createdAt: new Date(),
      viewCount: 0,
      likeCount: 0
    };
  }

  private getCategoryMultiplier(category: string): number {
    const multipliers: Record<string, number> = {
      entertainment: 1.2,
      gaming: 1.1,
      music: 1.0,
      dance: 1.0,
      comedy: 1.3,
      sports: 0.9,
      education: 0.8,
      lifestyle: 1.0,
      technology: 0.9,
      art: 0.7
    };
    return multipliers[category] || 1.0;
  }

  private analyzeTitleEngagement(title: string): number {
    // Simple title analysis - in real implementation, use more sophisticated NLP
    const engagementWords = ['amazing', 'incredible', 'shocking', 'secret', 'tips', 'tutorial', 'how to'];
    const hasEngagementWords = engagementWords.some(word => 
      title.toLowerCase().includes(word)
    );
    return hasEngagementWords ? 1.2 : 1.0;
  }
}

export default AIContentEnhancer;

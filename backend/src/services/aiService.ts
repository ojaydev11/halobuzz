import { logger } from '../config/logger';

export interface AIAnalysisOptions {
  content: string;
  type: 'moderation' | 'sentiment' | 'content_quality';
  context?: Record<string, any>;
}

export interface AIAnalysisResult {
  score: number;
  confidence: number;
  details: Record<string, any>;
  recommendations?: string[];
}

export class AIService {
  private static instance: AIService;

  public static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  async analyzeContent(options: AIAnalysisOptions): Promise<AIAnalysisResult> {
    try {
      logger.info('Analyzing content with AI', { type: options.type });
      
      // Use OpenAI API for content analysis
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        logger.warn('OpenAI API key not configured, using fallback analysis');
        return this.fallbackAnalysis(options);
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(options.type)
            },
            {
              role: 'user',
              content: options.content
            }
          ],
          max_tokens: 500,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const analysis = (data as any).choices[0]?.message?.content;
      
      return this.parseAIResponse(analysis, options.type);
    } catch (error) {
      logger.error('Failed to analyze content with AI, using fallback', { error, options });
      return this.fallbackAnalysis(options);
    }
  }

  private getSystemPrompt(type: string): string {
    const prompts = {
      moderation: `Analyze this content for inappropriate material, hate speech, violence, or harmful content. 
      Return a JSON response with: {"score": 0.0-1.0, "confidence": 0.0-1.0, "flagged": true/false, "reason": "explanation", "recommendations": ["action1", "action2"]}`,
      
      sentiment: `Analyze the sentiment of this content. 
      Return a JSON response with: {"score": -1.0 to 1.0, "confidence": 0.0-1.0, "sentiment": "positive/negative/neutral", "emotions": ["emotion1", "emotion2"]}`,
      
      content_quality: `Assess the quality and engagement potential of this content. 
      Return a JSON response with: {"score": 0.0-1.0, "confidence": 0.0-1.0, "quality": "high/medium/low", "recommendations": ["improvement1", "improvement2"]}`,
      
      kyc: `Verify the authenticity of these KYC documents. 
      Return a JSON response with: {"score": 0.0-1.0, "confidence": 0.0-1.0, "verified": true/false, "issues": ["issue1", "issue2"]}`
    };
    
    return prompts[type] || prompts.moderation;
  }

  private parseAIResponse(analysis: string, type: string): AIAnalysisResult {
    try {
      const parsed = JSON.parse(analysis);
      return {
        score: parsed.score || 0.5,
        confidence: parsed.confidence || 0.5,
        details: {
          type,
          ...parsed,
          rawAnalysis: analysis
        },
        recommendations: parsed.recommendations || []
      };
    } catch (error) {
      logger.warn('Failed to parse AI response, using fallback', { error, analysis });
      return this.fallbackAnalysis({ content: '', type: type as 'moderation' | 'sentiment' | 'content_quality' });
    }
  }

  private fallbackAnalysis(options: AIAnalysisOptions): AIAnalysisResult {
    // Basic keyword-based analysis as fallback
    const content = options.content.toLowerCase();
    let score = 0.5;
    let confidence = 0.3;
    const recommendations = [];

    // Basic moderation keywords
    if (options.type === 'moderation') {
      const flaggedWords = ['spam', 'scam', 'hate', 'violence', 'harassment', 'inappropriate'];
      const foundWords = flaggedWords.filter(word => content.includes(word));
      
      if (foundWords.length > 0) {
        score = Math.min(0.9, 0.5 + (foundWords.length * 0.1));
        confidence = 0.7;
        recommendations.push('Content contains potentially inappropriate language');
      }
    }

    // Basic sentiment analysis
    if (options.type === 'sentiment') {
      const positiveWords = ['good', 'great', 'amazing', 'love', 'happy', 'excellent'];
      const negativeWords = ['bad', 'terrible', 'hate', 'awful', 'disappointed', 'angry'];
      
      const positiveCount = positiveWords.filter(word => content.includes(word)).length;
      const negativeCount = negativeWords.filter(word => content.includes(word)).length;
      
      score = (positiveCount - negativeCount) / Math.max(1, positiveCount + negativeCount);
      confidence = 0.4;
    }

    return {
      score,
      confidence,
      details: {
        type: options.type,
        contentLength: options.content.length,
        fallback: true
      },
      recommendations
    };
  }

  async moderateContent(content: string): Promise<AIAnalysisResult> {
    return this.analyzeContent({
      content,
      type: 'moderation'
    });
  }

  async analyzeSentiment(content: string): Promise<AIAnalysisResult> {
    return this.analyzeContent({
      content,
      type: 'sentiment'
    });
  }

  async assessContentQuality(content: string): Promise<AIAnalysisResult> {
    return this.analyzeContent({
      content,
      type: 'content_quality'
    });
  }

  static async verifyKYC(documents: any): Promise<AIAnalysisResult> {
    const service = AIService.getInstance();
    return service.analyzeContent({
      content: JSON.stringify(documents),
      type: 'moderation'
    });
  }
}

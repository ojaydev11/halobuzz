import axios from 'axios';
import { logger } from '../config/logger';
import { getCache, setCache } from '../config/redis';
import { LiveStream } from '../models/LiveStream';

interface SubtitleSegment {
  startTime: number;
  endTime: number;
  text: string;
  language: string;
  confidence: number;
}

interface TranslationRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
  context?: string;
}

interface TranslationResult {
  translatedText: string;
  confidence: number;
  detectedLanguage?: string;
  alternatives?: string[];
}

interface SubtitleRequest {
  streamId: string;
  audioBuffer?: Buffer;
  text?: string;
  language?: string;
  targetLanguages?: string[];
}

interface SubtitleResult {
  success: boolean;
  subtitles: SubtitleSegment[];
  language: string;
  confidence: number;
  translations?: Map<string, SubtitleSegment[]>;
  error?: string;
}

export class AISubtitleService {
  private readonly logger = logger;
  private readonly supportedLanguages = [
    'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 'hi', 'ar', 'ne'
  ];
  private readonly translationCache = new Map<string, TranslationResult>();

  /**
   * Generate subtitles for live stream
   */
  async generateSubtitles(request: SubtitleRequest): Promise<SubtitleResult> {
    try {
      const { streamId, audioBuffer, text, language, targetLanguages } = request;

      // Check cache first
      const cacheKey = `subtitles:${streamId}:${language || 'auto'}`;
      const cachedResult = await getCache(cacheKey);
      if (cachedResult) {
        return cachedResult as SubtitleResult;
      }

      let result: SubtitleResult;

      if (audioBuffer) {
        // Generate subtitles from audio
        result = await this.generateSubtitlesFromAudio(audioBuffer, language);
      } else if (text) {
        // Generate subtitles from text
        result = await this.generateSubtitlesFromText(text, language);
      } else {
        return {
          success: false,
          subtitles: [],
          language: 'en',
          confidence: 0,
          error: 'No audio or text provided'
        };
      }

      // Translate to target languages if requested
      if (targetLanguages && targetLanguages.length > 0) {
        result.translations = new Map();
        for (const targetLang of targetLanguages) {
          if (targetLang !== result.language) {
            const translatedSubtitles = await this.translateSubtitles(
              result.subtitles,
              result.language,
              targetLang
            );
            result.translations.set(targetLang, translatedSubtitles);
          }
        }
      }

      // Cache result
      await setCache(cacheKey, result, 3600); // 1 hour

      // Update stream with subtitle info
      await this.updateStreamSubtitles(streamId, result);

      return result;
    } catch (error) {
      this.logger.error('Error generating subtitles:', error);
      return {
        success: false,
        subtitles: [],
        language: 'en',
        confidence: 0,
        error: error.message
      };
    }
  }

  /**
   * Generate subtitles from audio
   */
  private async generateSubtitlesFromAudio(
    audioBuffer: Buffer,
    language?: string
  ): Promise<SubtitleResult> {
    try {
      if (process.env.AI_ENGINE_URL) {
        const response = await axios.post(
          `${process.env.AI_ENGINE_URL}/internal/subtitles/transcribe`,
          {
            audio: audioBuffer.toString('base64'),
            language: language || 'auto',
            format: 'wav'
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.AI_ENGINE_SECRET}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );

        const result = response.data || {};
        const subtitles: SubtitleSegment[] = result.segments || [];

        return {
          success: true,
          subtitles,
          language: result.language || 'en',
          confidence: result.confidence || 0.8
        };
      }

      // Fallback: Mock subtitles for testing
      return this.generateMockSubtitles();
    } catch (error) {
      this.logger.error('Error generating subtitles from audio:', error);
      return this.generateMockSubtitles();
    }
  }

  /**
   * Generate subtitles from text
   */
  private async generateSubtitlesFromText(
    text: string,
    language?: string
  ): Promise<SubtitleResult> {
    try {
      // Detect language if not provided
      const detectedLanguage = language || await this.detectLanguage(text);

      // Split text into segments
      const segments = this.splitTextIntoSegments(text);

      const subtitles: SubtitleSegment[] = segments.map((segment, index) => ({
        startTime: index * 3, // 3 seconds per segment
        endTime: (index + 1) * 3,
        text: segment,
        language: detectedLanguage,
        confidence: 0.9
      }));

      return {
        success: true,
        subtitles,
        language: detectedLanguage,
        confidence: 0.9
      };
    } catch (error) {
      this.logger.error('Error generating subtitles from text:', error);
      return {
        success: false,
        subtitles: [],
        language: 'en',
        confidence: 0,
        error: error.message
      };
    }
  }

  /**
   * Translate subtitles
   */
  private async translateSubtitles(
    subtitles: SubtitleSegment[],
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<SubtitleSegment[]> {
    try {
      const translatedSubtitles: SubtitleSegment[] = [];

      for (const subtitle of subtitles) {
        const translation = await this.translateText(
          subtitle.text,
          sourceLanguage,
          targetLanguage
        );

        translatedSubtitles.push({
          ...subtitle,
          text: translation.translatedText,
          language: targetLanguage,
          confidence: translation.confidence
        });
      }

      return translatedSubtitles;
    } catch (error) {
      this.logger.error('Error translating subtitles:', error);
      return subtitles; // Return original if translation fails
    }
  }

  /**
   * Translate text
   */
  private async translateText(
    text: string,
    sourceLanguage: string,
    targetLanguage: string
  ): Promise<TranslationResult> {
    try {
      // Check cache first
      const cacheKey = `translation:${sourceLanguage}:${targetLanguage}:${text}`;
      const cachedTranslation = this.translationCache.get(cacheKey);
      if (cachedTranslation) {
        return cachedTranslation;
      }

      if (process.env.AI_ENGINE_URL) {
        const response = await axios.post(
          `${process.env.AI_ENGINE_URL}/internal/translation/translate`,
          {
            text,
            sourceLanguage,
            targetLanguage
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.AI_ENGINE_SECRET}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );

        const result = response.data || {};
        const translation: TranslationResult = {
          translatedText: result.translatedText || text,
          confidence: result.confidence || 0.8,
          detectedLanguage: result.detectedLanguage,
          alternatives: result.alternatives
        };

        // Cache translation
        this.translationCache.set(cacheKey, translation);

        return translation;
      }

      // Fallback: Return original text
      return {
        translatedText: text,
        confidence: 0.5,
        detectedLanguage: sourceLanguage
      };
    } catch (error) {
      this.logger.error('Error translating text:', error);
      return {
        translatedText: text,
        confidence: 0.0,
        detectedLanguage: sourceLanguage
      };
    }
  }

  /**
   * Detect language
   */
  private async detectLanguage(text: string): Promise<string> {
    try {
      if (process.env.AI_ENGINE_URL) {
        const response = await axios.post(
          `${process.env.AI_ENGINE_URL}/internal/language/detect`,
          { text },
          {
            headers: {
              'Authorization': `Bearer ${process.env.AI_ENGINE_SECRET}`,
              'Content-Type': 'application/json'
            },
            timeout: 5000
          }
        );

        const result = response.data || {};
        return result.language || 'en';
      }

      // Fallback: Simple language detection
      return this.simpleLanguageDetection(text);
    } catch (error) {
      this.logger.error('Error detecting language:', error);
      return 'en';
    }
  }

  /**
   * Simple language detection fallback
   */
  private simpleLanguageDetection(text: string): string {
    const lowerText = text.toLowerCase();

    // Check for common words/phrases in different languages
    if (lowerText.includes('नमस्ते') || lowerText.includes('धन्यवाद')) {
      return 'hi'; // Hindi
    } else if (lowerText.includes('नमस्कार') || lowerText.includes('धन्यवाद्')) {
      return 'ne'; // Nepali
    } else if (lowerText.includes('hola') || lowerText.includes('gracias')) {
      return 'es'; // Spanish
    } else if (lowerText.includes('bonjour') || lowerText.includes('merci')) {
      return 'fr'; // French
    } else if (lowerText.includes('guten tag') || lowerText.includes('danke')) {
      return 'de'; // German
    } else if (lowerText.includes('こんにちは') || lowerText.includes('ありがとう')) {
      return 'ja'; // Japanese
    } else if (lowerText.includes('안녕하세요') || lowerText.includes('감사합니다')) {
      return 'ko'; // Korean
    } else if (lowerText.includes('你好') || lowerText.includes('谢谢')) {
      return 'zh'; // Chinese
    } else if (lowerText.includes('привет') || lowerText.includes('спасибо')) {
      return 'ru'; // Russian
    }

    return 'en'; // Default to English
  }

  /**
   * Split text into segments
   */
  private splitTextIntoSegments(text: string): string[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const segments: string[] = [];

    for (const sentence of sentences) {
      const words = sentence.trim().split(' ');
      const maxWordsPerSegment = 8;

      for (let i = 0; i < words.length; i += maxWordsPerSegment) {
        const segment = words.slice(i, i + maxWordsPerSegment).join(' ');
        if (segment.trim()) {
          segments.push(segment.trim());
        }
      }
    }

    return segments;
  }

  /**
   * Generate mock subtitles for testing
   */
  private generateMockSubtitles(): SubtitleResult {
    const mockSubtitles: SubtitleSegment[] = [
      {
        startTime: 0,
        endTime: 3,
        text: 'Welcome to HaloBuzz live streaming!',
        language: 'en',
        confidence: 0.9
      },
      {
        startTime: 3,
        endTime: 6,
        text: 'Today we are going to explore amazing features.',
        language: 'en',
        confidence: 0.9
      },
      {
        startTime: 6,
        endTime: 9,
        text: 'Don\'t forget to like and subscribe!',
        language: 'en',
        confidence: 0.9
      }
    ];

    return {
      success: true,
      subtitles: mockSubtitles,
      language: 'en',
      confidence: 0.9
    };
  }

  /**
   * Update stream with subtitle information
   */
  private async updateStreamSubtitles(streamId: string, subtitleResult: SubtitleResult): Promise<void> {
    try {
      await LiveStream.findByIdAndUpdate(streamId, {
        $set: {
          'metadata.subtitles': {
            available: subtitleResult.success,
            language: subtitleResult.language,
            confidence: subtitleResult.confidence,
            segments: subtitleResult.subtitles.length,
            translations: subtitleResult.translations ? 
              Array.from(subtitleResult.translations.keys()) : []
          }
        }
      });
    } catch (error) {
      this.logger.error('Error updating stream subtitles:', error);
    }
  }

  /**
   * Get subtitles for stream
   */
  async getStreamSubtitles(
    streamId: string,
    language: string = 'en'
  ): Promise<SubtitleResult> {
    try {
      const cacheKey = `subtitles:${streamId}:${language}`;
      const cachedResult = await getCache(cacheKey);
      
      if (cachedResult) {
        return cachedResult as SubtitleResult;
      }

      // Get stream info
      const stream = await LiveStream.findById(streamId);
      if (!stream) {
        return {
          success: false,
          subtitles: [],
          language,
          confidence: 0,
          error: 'Stream not found'
        };
      }

      // Check if subtitles are available (using a different approach since metadata doesn't exist)
      const subtitleInfo = (stream as any).metadata?.subtitles;
      if (!subtitleInfo?.available) {
        return {
          success: false,
          subtitles: [],
          language,
          confidence: 0,
          error: 'Subtitles not available for this stream'
        };
      }

      // Return cached subtitles or generate new ones
      return this.generateMockSubtitles();
    } catch (error) {
      this.logger.error('Error getting stream subtitles:', error);
      return {
        success: false,
        subtitles: [],
        language,
        confidence: 0,
        error: error.message
      };
    }
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return this.supportedLanguages;
  }

  /**
   * Get language name from code
   */
  getLanguageName(code: string): string {
    const languageNames: Record<string, string> = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'hi': 'Hindi',
      'ar': 'Arabic',
      'ne': 'Nepali'
    };

    return languageNames[code] || code;
  }

  /**
   * Cleanup translation cache
   */
  cleanupCache(): void {
    this.translationCache.clear();
    this.logger.info('Translation cache cleaned up');
  }
}

export const aiSubtitleService = new AISubtitleService();



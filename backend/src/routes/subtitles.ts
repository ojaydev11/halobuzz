import express from 'express';
import { aiSubtitleService } from '../services/AISubtitleService';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

/**
 * @route POST /subtitles/generate
 * @desc Generate subtitles for content
 */
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { streamId, audioBuffer, text, language, targetLanguages } = req.body;
    const userId = req.user?.id;

    if (!streamId) {
      return res.status(400).json({
        success: false,
        error: 'Stream ID is required'
      });
    }

    const result = await aiSubtitleService.generateSubtitles({
      streamId,
      audioBuffer: audioBuffer ? Buffer.from(audioBuffer, 'base64') : undefined,
      text,
      language,
      targetLanguages
    });

    res.json({
      success: result.success,
      data: result,
      error: result.error
    });
  } catch (error) {
    console.error('Error generating subtitles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate subtitles'
    });
  }
});

/**
 * @route GET /subtitles/stream/:streamId
 * @desc Get subtitles for stream
 */
router.get('/stream/:streamId', async (req, res) => {
  try {
    const { streamId } = req.params;
    const { language = 'en' } = req.query;

    const result = await aiSubtitleService.getStreamSubtitles(
      streamId,
      language as string
    );

    res.json({
      success: result.success,
      data: result,
      error: result.error
    });
  } catch (error) {
    console.error('Error getting stream subtitles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stream subtitles'
    });
  }
});

/**
 * @route POST /subtitles/translate
 * @desc Translate text
 */
router.post('/translate', authMiddleware, async (req, res) => {
  try {
    const { text, sourceLanguage, targetLanguage } = req.body;

    if (!text || !sourceLanguage || !targetLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Text, source language, and target language are required'
      });
    }

    // This would call the translation service
    // For now, return a mock response
    const result = {
      translatedText: text, // Mock translation
      confidence: 0.8,
      detectedLanguage: sourceLanguage
    };

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error translating text:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to translate text'
    });
  }
});

/**
 * @route GET /subtitles/languages
 * @desc Get supported languages
 */
router.get('/languages', async (req, res) => {
  try {
    const languages = aiSubtitleService.getSupportedLanguages();
    const languageNames = languages.map(code => ({
      code,
      name: aiSubtitleService.getLanguageName(code)
    }));

    res.json({
      success: true,
      languages: languageNames
    });
  } catch (error) {
    console.error('Error getting supported languages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get supported languages'
    });
  }
});

/**
 * @route POST /subtitles/detect-language
 * @desc Detect language of text
 */
router.post('/detect-language', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    // This would call the language detection service
    // For now, return a mock response
    const result = {
      language: 'en', // Mock detection
      confidence: 0.9
    };

    res.json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error detecting language:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect language'
    });
  }
});

export default router;


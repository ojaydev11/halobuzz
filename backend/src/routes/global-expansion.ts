import express from 'express';
import { query, validationResult } from 'express-validator';
import { globalExpansionService } from '../services/GlobalExpansionService';
import { logger } from '../config/logger';

const router = express.Router();

// Get all supported regions
router.get('/regions', async (req, res) => {
  try {
    const regions = globalExpansionService.getAllRegions();
    
    res.json({
      success: true,
      data: {
        regions,
        total: regions.length
      }
    });
  } catch (error) {
    logger.error('Failed to get regions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get regions'
    });
  }
});

// Get specific region configuration
router.get('/regions/:regionCode', [
  query('regionCode')
    .isLength({ min: 2, max: 2 })
    .withMessage('Region code must be 2 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { regionCode } = req.params;
    const region = globalExpansionService.getRegionConfig(regionCode.toUpperCase());
    
    if (!region) {
      return res.status(404).json({
        success: false,
        error: 'Region not found'
      });
    }

    res.json({
      success: true,
      data: {
        region
      }
    });
  } catch (error) {
    logger.error('Failed to get region:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get region'
    });
  }
});

// Get all supported languages
router.get('/languages', async (req, res) => {
  try {
    const languages = globalExpansionService.getSupportedLanguages();
    const localizations = globalExpansionService.getAllLocalizations();
    
    res.json({
      success: true,
      data: {
        languages,
        localizations,
        total: languages.length
      }
    });
  } catch (error) {
    logger.error('Failed to get languages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get languages'
    });
  }
});

// Get specific language configuration
router.get('/languages/:language', [
  query('language')
    .isLength({ min: 2, max: 5 })
    .withMessage('Language code must be 2-5 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { language } = req.params;
    const localization = globalExpansionService.getLocalizationConfig(language.toLowerCase());
    
    if (!localization) {
      return res.status(404).json({
        success: false,
        error: 'Language not supported'
      });
    }

    res.json({
      success: true,
      data: {
        localization
      }
    });
  } catch (error) {
    logger.error('Failed to get language:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get language'
    });
  }
});

// Format price for specific region
router.get('/format-price', [
  query('amount')
    .isNumeric()
    .withMessage('Amount must be numeric'),
  query('region')
    .isLength({ min: 2, max: 2 })
    .withMessage('Region code must be 2 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { amount, region } = req.query;
    const formattedPrice = globalExpansionService.formatPrice(
      parseFloat(amount as string),
      region as string
    );

    res.json({
      success: true,
      data: {
        originalAmount: parseFloat(amount as string),
        region: region as string,
        formattedPrice
      }
    });
  } catch (error) {
    logger.error('Failed to format price:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to format price'
    });
  }
});

// Translate text
router.get('/translate', [
  query('key')
    .isString()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Translation key is required'),
  query('language')
    .isLength({ min: 2, max: 5 })
    .withMessage('Language code must be 2-5 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { key, language } = req.query;
    const translation = globalExpansionService.translate(
      key as string,
      language as string
    );

    res.json({
      success: true,
      data: {
        key: key as string,
        language: language as string,
        translation
      }
    });
  } catch (error) {
    logger.error('Failed to translate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to translate'
    });
  }
});

// Get cultural features for region
router.get('/cultural/:regionCode', [
  query('regionCode')
    .isLength({ min: 2, max: 2 })
    .withMessage('Region code must be 2 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { regionCode } = req.params;
    const culturalFeatures = globalExpansionService.getCulturalFeatures(regionCode.toUpperCase());
    
    if (!culturalFeatures) {
      return res.status(404).json({
        success: false,
        error: 'Cultural features not found for this region'
      });
    }

    res.json({
      success: true,
      data: {
        regionCode: regionCode.toUpperCase(),
        culturalFeatures
      }
    });
  } catch (error) {
    logger.error('Failed to get cultural features:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get cultural features'
    });
  }
});

// Get payment methods for region
router.get('/payment-methods/:regionCode', [
  query('regionCode')
    .isLength({ min: 2, max: 2 })
    .withMessage('Region code must be 2 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { regionCode } = req.params;
    const paymentMethods = globalExpansionService.getPaymentMethods(regionCode.toUpperCase());

    res.json({
      success: true,
      data: {
        regionCode: regionCode.toUpperCase(),
        paymentMethods
      }
    });
  } catch (error) {
    logger.error('Failed to get payment methods:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get payment methods'
    });
  }
});

// Detect user region
router.post('/detect-region', async (req, res) => {
  try {
    const { ip, userAgent } = req.body;
    
    if (!ip) {
      return res.status(400).json({
        success: false,
        error: 'IP address is required'
      });
    }

    const detectedRegion = globalExpansionService.detectUserRegion(
      ip,
      userAgent || ''
    );

    const regionConfig = globalExpansionService.getRegionConfig(detectedRegion);

    res.json({
      success: true,
      data: {
        detectedRegion,
        regionConfig,
        confidence: 0.85 // Mock confidence score
      }
    });
  } catch (error) {
    logger.error('Failed to detect region:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect region'
    });
  }
});

// Update exchange rates
router.post('/update-exchange-rates', async (req, res) => {
  try {
    await globalExpansionService.updateExchangeRates();
    
    res.json({
      success: true,
      message: 'Exchange rates updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update exchange rates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update exchange rates'
    });
  }
});

// Get global expansion status
router.get('/status', async (req, res) => {
  try {
    const regions = globalExpansionService.getAllRegions();
    const languages = globalExpansionService.getSupportedLanguages();
    
    const status = {
      totalRegions: regions.length,
      totalLanguages: languages.length,
      supportedCurrencies: [...new Set(regions.map(r => r.currency))],
      supportedPaymentMethods: [...new Set(regions.flatMap(r => r.paymentMethods))],
      lastUpdated: new Date().toISOString()
    };

    res.json({
      success: true,
      data: {
        status
      }
    });
  } catch (error) {
    logger.error('Failed to get expansion status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get expansion status'
    });
  }
});

export default router;

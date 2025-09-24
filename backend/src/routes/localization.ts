import express from 'express';
import { body, validationResult } from 'express-validator';
import { logger } from '../config/logger';
import { AuthenticatedRequest } from '../middleware/auth';
import localizationService from '../services/LocalizationService';

const router = express.Router();

// Get supported locales
router.get('/locales', async (req: AuthenticatedRequest, res) => {
  try {
    const locales = localizationService.getSupportedLocales();

    res.json({
      success: true,
      data: locales
    });

  } catch (error) {
    logger.error('Error getting supported locales:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get locales'
    });
  }
});

// Get locale configuration
router.get('/locale/:localeCode', async (req: AuthenticatedRequest, res) => {
  try {
    const { localeCode } = req.params;
    const locale = await localizationService.getLocaleConfig(localeCode);

    if (!locale) {
      return res.status(404).json({
        success: false,
        error: 'Locale not found'
      });
    }

    res.json({
      success: true,
      data: locale
    });

  } catch (error) {
    logger.error('Error getting locale config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get locale configuration'
    });
  }
});

// Translate text
router.post('/translate', [
  body('key')
    .notEmpty()
    .withMessage('Translation key is required'),
  body('locale')
    .notEmpty()
    .withMessage('Locale code is required'),
  body('params')
    .optional()
    .isObject()
    .withMessage('Parameters must be an object')
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { key, locale, params } = req.body;
    const translation = await localizationService.translate(key, locale, params);

    res.json({
      success: true,
      data: {
        key,
        locale,
        translation,
        params
      }
    });

  } catch (error) {
    logger.error('Error translating text:', error);
    res.status(500).json({
      success: false,
      error: 'Translation failed'
    });
  }
});

// Get geo location
router.get('/geo-location', async (req: AuthenticatedRequest, res) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || '127.0.0.1';
    const geoLocation = await localizationService.getGeoLocation(ipAddress);

    if (!geoLocation) {
      return res.status(404).json({
        success: false,
        error: 'Geo location not found'
      });
    }

    res.json({
      success: true,
      data: geoLocation
    });

  } catch (error) {
    logger.error('Error getting geo location:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get geo location'
    });
  }
});

// Check content allowance
router.post('/content-check', [
  body('countryCode')
    .notEmpty()
    .withMessage('Country code is required'),
  body('contentType')
    .notEmpty()
    .withMessage('Content type is required'),
  body('category')
    .notEmpty()
    .withMessage('Category is required'),
  body('userAge')
    .optional()
    .isInt({ min: 0, max: 120 })
    .withMessage('Valid age is required')
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { countryCode, contentType, category, userAge } = req.body;
    const result = await localizationService.isContentAllowed(
      countryCode,
      contentType,
      category,
      userAge
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Error checking content allowance:', error);
    res.status(500).json({
      success: false,
      error: 'Content check failed'
    });
  }
});

// Format currency
router.post('/format-currency', [
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Valid amount is required'),
  body('locale')
    .notEmpty()
    .withMessage('Locale code is required')
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { amount, locale } = req.body;
    const formatted = localizationService.formatCurrency(amount, locale);

    res.json({
      success: true,
      data: {
        amount,
        locale,
        formatted
      }
    });

  } catch (error) {
    logger.error('Error formatting currency:', error);
    res.status(500).json({
      success: false,
      error: 'Currency formatting failed'
    });
  }
});

// Format date
router.post('/format-date', [
  body('date')
    .notEmpty()
    .withMessage('Date is required'),
  body('locale')
    .notEmpty()
    .withMessage('Locale code is required')
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { date, locale } = req.body;
    const dateObj = new Date(date);
    
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format'
      });
    }

    const formatted = localizationService.formatDate(dateObj, locale);

    res.json({
      success: true,
      data: {
        originalDate: date,
        locale,
        formatted
      }
    });

  } catch (error) {
    logger.error('Error formatting date:', error);
    res.status(500).json({
      success: false,
      error: 'Date formatting failed'
    });
  }
});

// Get supported countries
router.get('/countries', async (req: AuthenticatedRequest, res) => {
  try {
    const countries = localizationService.getSupportedCountries();

    res.json({
      success: true,
      data: countries
    });

  } catch (error) {
    logger.error('Error getting supported countries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get countries'
    });
  }
});

export default router;

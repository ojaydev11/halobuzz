import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { logger } from '../config/logger';
import { AuthenticatedRequest } from '../middleware/auth';
import KPIService from '../analytics/queries/kpis';
import { PredictiveAnalyticsService } from '../services/PredictiveAnalyticsService';
import { ReportGeneratorService } from '../services/ReportGeneratorService';
import { AlertService } from '../services/AlertService';

const router = express.Router();
const kpiService = new KPIService();
const predictiveService = new PredictiveAnalyticsService();
const reportService = new ReportGeneratorService();
const alertService = new AlertService();

// Middleware to check admin role
const requireAdmin = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
  next();
};

// Apply admin middleware to all routes
router.use(requireAdmin);

/**
 * @route GET /api/ai/business/kpis
 * @desc Get comprehensive KPI metrics
 */
router.get('/kpis', [
  query('from')
    .isISO8601()
    .withMessage('From date must be valid ISO8601 format'),
  query('to')
    .isISO8601()
    .withMessage('To date must be valid ISO8601 format'),
  query('country')
    .optional()
    .isString()
    .withMessage('Country must be a string'),
  query('granularity')
    .optional()
    .isIn(['daily', 'weekly', 'monthly'])
    .withMessage('Granularity must be daily, weekly, or monthly')
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { from, to, country, granularity } = req.query;

    const filter = {
      from: new Date(from as string),
      to: new Date(to as string),
      country: country as string || 'ALL',
      granularity: (granularity as string) || 'daily'
    };

    logger.info('Fetching KPIs', { filter, userId: req.user?.userId });

    const kpis = await kpiService.getKPIs(filter);

    res.json({
      success: true,
      data: {
        filter,
        kpis,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to fetch KPIs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch KPIs'
    });
  }
});

/**
 * @route GET /api/ai/business/cohorts
 * @desc Get cohort analysis data
 */
router.get('/cohorts', [
  query('granularity')
    .isIn(['week', 'month'])
    .withMessage('Granularity must be week or month'),
  query('country')
    .optional()
    .isString()
    .withMessage('Country must be a string')
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { granularity, country } = req.query;

    logger.info('Fetching cohort data', { granularity, country, userId: req.user?.userId });

    // Import cohort model
    const { AnalyticsCohort } = await import('../analytics/models/AnalyticsCohort');

    const cohorts = await AnalyticsCohort.find({
      granularity,
      ...(country && country !== 'ALL' && { country })
    }).sort({ cohortDate: -1 }).limit(12);

    res.json({
      success: true,
      data: {
        granularity,
        country: country || 'ALL',
        cohorts,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to fetch cohort data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cohort data'
    });
  }
});

/**
 * @route POST /api/ai/business/predict
 * @desc Generate predictions for business metrics
 */
router.post('/predict', [
  body('metric')
    .isIn(['revenue', 'churn', 'topup', 'dau', 'engagement', 'streams', 'gifts', 'og_conversion'])
    .withMessage('Metric must be one of: revenue, churn, topup, dau, engagement, streams, gifts, og_conversion'),
  body('horizonDays')
    .isInt({ min: 1, max: 90 })
    .withMessage('Horizon days must be between 1 and 90'),
  body('segments')
    .optional()
    .isObject()
    .withMessage('Segments must be an object'),
  body('segments.country')
    .optional()
    .isString()
    .withMessage('Country segment must be a string'),
  body('segments.ogTier')
    .optional()
    .isInt({ min: 0, max: 5 })
    .withMessage('OG tier segment must be between 0 and 5')
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { metric, horizonDays, segments } = req.body;

    logger.info('Generating prediction', { metric, horizonDays, segments, userId: req.user?.userId });

    const prediction = await predictiveService.generatePrediction({
      metric,
      horizonDays,
      segments: segments || {},
      userId: req.user?.userId
    });

    res.json({
      success: true,
      data: {
        metric,
        horizonDays,
        segments: segments || {},
        prediction,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to generate prediction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate prediction'
    });
  }
});

/**
 * @route GET /api/ai/business/report
 * @desc Generate business reports (PDF/XLSX)
 */
router.get('/report', [
  query('period')
    .isIn(['daily', 'weekly', 'monthly'])
    .withMessage('Period must be daily, weekly, or monthly'),
  query('format')
    .isIn(['pdf', 'xlsx'])
    .withMessage('Format must be pdf or xlsx'),
  query('country')
    .optional()
    .isString()
    .withMessage('Country must be a string'),
  query('includeCharts')
    .optional()
    .isBoolean()
    .withMessage('Include charts must be boolean')
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { period, format, country, includeCharts } = req.query;

    logger.info('Generating report', { period, format, country, userId: req.user?.userId });

    const reportOptions = {
      period: period as string,
      format: format as string,
      country: country as string || 'ALL',
      includeCharts: includeCharts === 'true',
      userId: req.user?.userId
    };

    const report = await reportService.generateReport(reportOptions);

    // Set appropriate headers based on format
    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="halobuzz-${period}-report.pdf"`);
    } else {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="halobuzz-${period}-report.xlsx"`);
    }

    res.send(report);

  } catch (error) {
    logger.error('Failed to generate report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report'
    });
  }
});

/**
 * @route GET /api/ai/business/alerts
 * @desc Get active alerts
 */
router.get('/alerts', [
  query('since')
    .optional()
    .isISO8601()
    .withMessage('Since date must be valid ISO8601 format'),
  query('status')
    .optional()
    .isIn(['active', 'acknowledged', 'resolved', 'dismissed'])
    .withMessage('Status must be active, acknowledged, resolved, or dismissed'),
  query('severity')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Severity must be low, medium, high, or critical')
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { since, status, severity } = req.query;

    logger.info('Fetching alerts', { since, status, severity, userId: req.user?.userId });

    const alerts = await alertService.getAlerts({
      since: since ? new Date(since as string) : undefined,
      status: status as string,
      severity: severity as string
    });

    res.json({
      success: true,
      data: {
        alerts,
        filters: { since, status, severity },
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to fetch alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alerts'
    });
  }
});

/**
 * @route POST /api/ai/business/alerts/:alertId/acknowledge
 * @desc Acknowledge an alert
 */
router.post('/alerts/:alertId/acknowledge', [
  body('resolution')
    .optional()
    .isString()
    .withMessage('Resolution must be a string'),
  body('actionTaken')
    .optional()
    .isString()
    .withMessage('Action taken must be a string')
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { alertId } = req.params;
    const { resolution, actionTaken } = req.body;

    logger.info('Acknowledging alert', { alertId, userId: req.user?.userId });

    const result = await alertService.acknowledgeAlert(alertId, {
      resolvedBy: req.user?.userId,
      resolution,
      actionTaken
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to acknowledge alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alert'
    });
  }
});

/**
 * @route GET /api/ai/business/time-series/:metric
 * @desc Get time series data for a specific metric
 */
router.get('/time-series/:metric', [
  query('from')
    .isISO8601()
    .withMessage('From date must be valid ISO8601 format'),
  query('to')
    .isISO8601()
    .withMessage('To date must be valid ISO8601 format'),
  query('country')
    .optional()
    .isString()
    .withMessage('Country must be a string')
], async (req: AuthenticatedRequest, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { metric } = req.params;
    const { from, to, country } = req.query;

    const filter = {
      from: new Date(from as string),
      to: new Date(to as string),
      country: country as string || 'ALL'
    };

    logger.info('Fetching time series data', { metric, filter, userId: req.user?.userId });

    const timeSeriesData = await kpiService.getKPITimeSeries(metric, filter);

    res.json({
      success: true,
      data: {
        metric,
        filter,
        timeSeries: timeSeriesData,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Failed to fetch time series data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch time series data'
    });
  }
});

/**
 * @route GET /api/ai/business/health
 * @desc Get analytics system health status
 */
router.get('/health', async (req: AuthenticatedRequest, res) => {
  try {
    logger.info('Checking analytics system health', { userId: req.user?.userId });

    const health = await alertService.getSystemHealth();

    res.json({
      success: true,
      data: health
    });

  } catch (error) {
    logger.error('Failed to check system health:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check system health'
    });
  }
});

export default router;

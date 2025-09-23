import express from 'express';
import { logger } from '../config/logger';
import { AuthenticatedRequest } from '../middleware/auth';
import AnalyticsScheduler from '../analytics/jobs/scheduler';

const router = express.Router();

// Global scheduler instance
let scheduler: AnalyticsScheduler | null = null;

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
 * @route GET /api/analytics/scheduler/status
 * @desc Get scheduler status
 */
router.get('/status', async (req: AuthenticatedRequest, res) => {
  try {
    if (!scheduler) {
      return res.json({
        success: true,
        data: {
          isRunning: false,
          scheduledJobs: 0,
          timezone: 'Australia/Sydney',
          jobs: []
        }
      });
    }

    const status = scheduler.getStatus();

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Failed to get scheduler status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get scheduler status'
    });
  }
});

/**
 * @route POST /api/analytics/scheduler/start
 * @desc Start the analytics scheduler
 */
router.post('/start', async (req: AuthenticatedRequest, res) => {
  try {
    if (scheduler && scheduler.getStatus().isRunning) {
      return res.status(400).json({
        success: false,
        error: 'Scheduler is already running'
      });
    }

    scheduler = new AnalyticsScheduler();
    scheduler.start();

    logger.info('Analytics scheduler started by admin', { userId: req.user?.userId });

    res.json({
      success: true,
      message: 'Analytics scheduler started successfully',
      data: scheduler.getStatus()
    });

  } catch (error) {
    logger.error('Failed to start scheduler:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start scheduler'
    });
  }
});

/**
 * @route POST /api/analytics/scheduler/stop
 * @desc Stop the analytics scheduler
 */
router.post('/stop', async (req: AuthenticatedRequest, res) => {
  try {
    if (!scheduler || !scheduler.getStatus().isRunning) {
      return res.status(400).json({
        success: false,
        error: 'Scheduler is not running'
      });
    }

    scheduler.stop();
    scheduler = null;

    logger.info('Analytics scheduler stopped by admin', { userId: req.user?.userId });

    res.json({
      success: true,
      message: 'Analytics scheduler stopped successfully'
    });

  } catch (error) {
    logger.error('Failed to stop scheduler:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop scheduler'
    });
  }
});

/**
 * @route POST /api/analytics/scheduler/restart
 * @desc Restart the analytics scheduler
 */
router.post('/restart', async (req: AuthenticatedRequest, res) => {
  try {
    // Stop if running
    if (scheduler && scheduler.getStatus().isRunning) {
      scheduler.stop();
    }

    // Start fresh
    scheduler = new AnalyticsScheduler();
    scheduler.start();

    logger.info('Analytics scheduler restarted by admin', { userId: req.user?.userId });

    res.json({
      success: true,
      message: 'Analytics scheduler restarted successfully',
      data: scheduler.getStatus()
    });

  } catch (error) {
    logger.error('Failed to restart scheduler:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restart scheduler'
    });
  }
});

/**
 * @route POST /api/analytics/scheduler/run-daily-rollup
 * @desc Manually trigger daily rollup
 */
router.post('/run-daily-rollup', async (req: AuthenticatedRequest, res) => {
  try {
    const { DailyRollupETL } = await import('../analytics/etl/dailyRollup');
    
    const dailyETL = new DailyRollupETL({
      country: req.body.country || 'ALL',
      forceRebuild: req.body.forceRebuild || false
    });

    logger.info('Manual daily rollup triggered by admin', { 
      userId: req.user?.userId,
      country: req.body.country || 'ALL',
      forceRebuild: req.body.forceRebuild || false
    });

    await dailyETL.execute();

    res.json({
      success: true,
      message: 'Daily rollup completed successfully'
    });

  } catch (error) {
    logger.error('Failed to run daily rollup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run daily rollup'
    });
  }
});

/**
 * @route POST /api/analytics/scheduler/run-backfill
 * @desc Manually trigger backfill
 */
router.post('/run-backfill', async (req: AuthenticatedRequest, res) => {
  try {
    const { RebuildBackfillETL } = await import('../analytics/etl/rebuildBackfill');
    
    const backfillETL = new RebuildBackfillETL({
      startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
      endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      country: req.body.country || 'ALL',
      batchSize: req.body.batchSize || 7,
      dryRun: req.body.dryRun || false
    });

    logger.info('Manual backfill triggered by admin', { 
      userId: req.user?.userId,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
      country: req.body.country || 'ALL',
      dryRun: req.body.dryRun || false
    });

    if (req.body.dryRun) {
      const analysis = await backfillETL.getDataQualityMetrics();
      return res.json({
        success: true,
        message: 'Backfill dry run completed',
        data: analysis
      });
    }

    await backfillETL.execute();

    res.json({
      success: true,
      message: 'Backfill completed successfully'
    });

  } catch (error) {
    logger.error('Failed to run backfill:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to run backfill'
    });
  }
});

/**
 * @route POST /api/analytics/scheduler/check-alerts
 * @desc Manually trigger alert checking
 */
router.post('/check-alerts', async (req: AuthenticatedRequest, res) => {
  try {
    const { AlertService } = await import('../services/AlertService');
    
    const alertService = new AlertService();

    logger.info('Manual alert checking triggered by admin', { userId: req.user?.userId });

    await alertService.checkAlerts();

    res.json({
      success: true,
      message: 'Alert checking completed successfully'
    });

  } catch (error) {
    logger.error('Failed to check alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check alerts'
    });
  }
});

/**
 * @route POST /api/analytics/scheduler/generate-report
 * @desc Manually trigger report generation
 */
router.post('/generate-report', async (req: AuthenticatedRequest, res) => {
  try {
    const { ReportGeneratorService } = await import('../services/ReportGeneratorService');
    
    const reportService = new ReportGeneratorService();

    const reportOptions = {
      period: req.body.period || 'daily',
      format: req.body.format || 'pdf',
      country: req.body.country || 'ALL',
      includeCharts: req.body.includeCharts || true,
      userId: req.user?.userId || 'admin'
    };

    logger.info('Manual report generation triggered by admin', { 
      userId: req.user?.userId,
      options: reportOptions
    });

    const report = await reportService.generateReport(reportOptions);

    // Set appropriate headers based on format
    if (reportOptions.format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="halobuzz-${reportOptions.period}-report.pdf"`);
    } else {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="halobuzz-${reportOptions.period}-report.xlsx"`);
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

export default router;

import { Router, Response } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { AdvancedFraudDetectionService } from '../services/AdvancedFraudDetectionService';
import { requireAuth, requireAdmin } from '../middleware/enhancedSecurity';
import { validateInput } from '../middleware/enhancedSecurity';
import { createRateLimit } from '../middleware/enhancedSecurity';
import { getMongoDB } from '@/config/database';
import { getRedisClient } from '@/config/redis';
import { logger } from '@/config/logger';

const router = Router();

interface FraudPatternRequest {
  name: string;
  description: string;
  type: 'behavioral' | 'transactional' | 'account' | 'content' | 'network';
  severity: 'low' | 'medium' | 'high' | 'critical';
  conditions: Array<{
    field: string;
    operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'regex';
    value: any;
    weight: number;
  }>;
  threshold: number;
  isActive: boolean;
}

interface FraudAlertResolutionRequest {
  alertId: string;
  resolution: string;
}

interface FraudAnalysisRequest {
  userId: string;
}

// Initialize service with MongoDB and Redis
let fraudDetectionService: AdvancedFraudDetectionService;

const initializeService = async () => {
  if (!fraudDetectionService) {
    const db = await getMongoDB();
    const redis = await getRedisClient();
    
    fraudDetectionService = new AdvancedFraudDetectionService(
      db.collection('analytics_events'),
      db.collection('users'),
      redis,
    );
  }
  return fraudDetectionService;
};

  // Rate limiting for fraud detection endpoints
  const fraudRateLimit = createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 requests per minute
    message: 'Too many fraud detection requests, please try again later',
  });

  const adminRateLimit = createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: 'Too many admin requests, please try again later',
  });

  /**
   * POST /api/v1/fraud-detection/patterns
   * Create fraud detection pattern (admin only)
   */
router.post('/fraud-detection/patterns',
  requireAuth,
  requireAdmin,
  adminRateLimit,
  validateInput,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const patternData = req.body as FraudPatternRequest;

      const service = await initializeService();
      const pattern = await service.createFraudPattern(patternData);

      return res.json({
        success: true,
        data: pattern
      });
    } catch (error) {
      logger.error('Error creating fraud pattern:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create fraud pattern'
      });
    }
  }
);

/**
 * GET /api/v1/fraud-detection/patterns
 * Get all fraud detection patterns (admin only)
 */
router.get('/fraud-detection/patterns',
  requireAuth,
  requireAdmin,
  adminRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const service = await initializeService();
      const patterns = await service.getAllFraudPatterns();

      return res.json({
        success: true,
        data: patterns
      });
    } catch (error) {
      logger.error('Error getting fraud patterns:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get fraud patterns'
      });
    }
  }
);

/**
 * PUT /api/v1/fraud-detection/patterns/:patternId
 * Update fraud detection pattern (admin only)
 */
router.put('/fraud-detection/patterns/:patternId',
  requireAuth,
  requireAdmin,
  adminRateLimit,
  validateInput,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { patternId } = req.params;
      const patternData = req.body as Partial<FraudPatternRequest>;

      const service = await initializeService();
      const pattern = await service.updateFraudPattern(patternId, patternData);

      return res.json({
        success: true,
        data: pattern
      });
    } catch (error) {
      logger.error('Error updating fraud pattern:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to update fraud pattern'
      });
    }
  }
);

/**
 * DELETE /api/v1/fraud-detection/patterns/:patternId
 * Delete fraud detection pattern (admin only)
 */
router.delete('/fraud-detection/patterns/:patternId',
  requireAuth,
  requireAdmin,
  adminRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { patternId } = req.params;

      const service = await initializeService();
      await service.deleteFraudPattern(patternId);

      return res.json({
        success: true,
        message: 'Fraud pattern deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting fraud pattern:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete fraud pattern'
      });
    }
  }
);

/**
 * GET /api/v1/fraud-detection/alerts
 * Get fraud alerts (admin only)
 */
router.get('/fraud-detection/alerts',
  requireAuth,
  requireAdmin,
  adminRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { status, severity, limit = 50 } = req.query;

      const service = await initializeService();
      const alerts = await service.getFraudAlerts({
        status: status as string,
        severity: severity as string,
        limit: parseInt(limit as string)
      });

      return res.json({
        success: true,
        data: alerts
      });
    } catch (error) {
      logger.error('Error getting fraud alerts:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get fraud alerts'
      });
    }
  }
);

/**
 * POST /api/v1/fraud-detection/alerts/:alertId/resolve
 * Resolve fraud alert (admin only)
 */
router.post('/fraud-detection/alerts/:alertId/resolve',
  requireAuth,
  requireAdmin,
  adminRateLimit,
  validateInput,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { alertId } = req.params;
      const { resolution } = req.body as FraudAlertResolutionRequest;

      const service = await initializeService();
      await service.resolveFraudAlert(alertId, resolution);

      return res.json({
        success: true,
        message: 'Fraud alert resolved successfully'
      });
    } catch (error) {
      logger.error('Error resolving fraud alert:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to resolve fraud alert'
      });
    }
  }
);

/**
 * POST /api/v1/fraud-detection/analyze
 * Analyze user for fraud (admin only)
 */
router.post('/fraud-detection/analyze',
  requireAuth,
  requireAdmin,
  fraudRateLimit,
  validateInput,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.body as FraudAnalysisRequest;

      const service = await initializeService();
      const analysis = await service.analyzeUserFraud(userId);

      return res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      logger.error('Error analyzing user fraud:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to analyze user fraud'
      });
    }
  }
);

/**
 * GET /api/v1/fraud-detection/analytics
 * Get fraud detection analytics (admin only)
 */
router.get('/fraud-detection/analytics',
  requireAuth,
  requireAdmin,
  adminRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const service = await initializeService();
      const analytics = await service.getFraudAnalytics();

      return res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Error getting fraud analytics:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get fraud analytics'
      });
    }
  }
);

/**
 * POST /api/v1/fraud-detection/risk-score
 * Calculate fraud risk score
 */
router.post('/fraud-detection/risk-score',
  requireAuth,
  fraudRateLimit,
  validateInput,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId, transactionData } = req.body;

      const service = await initializeService();
      const riskScore = await service.calculateRiskScore(userId, transactionData);

      return res.json({
          success: true,
        data: riskScore
      });
    } catch (error) {
      logger.error('Error calculating risk score:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to calculate risk score'
      });
    }
  }
);

/**
 * GET /api/v1/fraud-detection/patterns/:patternId/test
 * Test fraud pattern (admin only)
 */
router.get('/fraud-detection/patterns/:patternId/test',
  requireAuth,
  requireAdmin,
  adminRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { patternId } = req.params;
      const { testData } = req.query;

      const service = await initializeService();
      const testResult = await service.testFraudPattern(patternId, testData as any);

      return res.json({
        success: true,
        data: testResult
      });
    } catch (error) {
      logger.error('Error testing fraud pattern:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to test fraud pattern'
      });
    }
  }
);

/**
 * POST /api/v1/fraud-detection/whitelist
 * Add user to fraud whitelist (admin only)
 */
router.post('/fraud-detection/whitelist',
  requireAuth,
  requireAdmin,
  adminRateLimit,
  validateInput,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId, reason } = req.body;

      const service = await initializeService();
      await service.addToWhitelist(userId, reason);

      return res.json({
        success: true,
        message: 'User added to whitelist successfully'
      });
    } catch (error) {
      logger.error('Error adding user to whitelist:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to add user to whitelist'
      });
    }
  }
);

/**
 * DELETE /api/v1/fraud-detection/whitelist/:userId
 * Remove user from fraud whitelist (admin only)
 */
router.delete('/fraud-detection/whitelist/:userId',
  requireAuth,
  requireAdmin,
  adminRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { userId } = req.params;

      const service = await initializeService();
      await service.removeFromWhitelist(userId);

      return res.json({
        success: true,
        message: 'User removed from whitelist successfully'
      });
    } catch (error) {
      logger.error('Error removing user from whitelist:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to remove user from whitelist'
      });
    }
}
);

export default router;
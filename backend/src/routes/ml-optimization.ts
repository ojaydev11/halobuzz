import { Router, Response } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { MachineLearningOptimizationService } from '../services/MachineLearningOptimizationService';
import { requireAuth, requireAdmin } from '../middleware/enhancedSecurity';
import { validateInput } from '../middleware/enhancedSecurity';
import { createRateLimit } from '../middleware/enhancedSecurity';
import { getMongoDB } from '@/config/database';
import { getRedisClient } from '@/config/redis';
import { logger } from '@/config/logger';

const router = Router();

interface ABTestCreateRequest {
  name: string;
  description: string;
  hypothesis: string;
  variants: Array<{
    variantId: string;
    name: string;
    weight: number;
    config: any;
  }>;
  targetAudience: {
    userSegments?: string[];
    demographics?: {
      ageRange?: [number, number];
      location?: string[];
      deviceType?: string[];
    };
    behavior?: {
      minEngagement?: number;
      minWatchTime?: number;
      minSessions?: number;
    };
  };
  metrics: Array<{
    metricName: string;
    metricType: 'conversion' | 'engagement' | 'revenue' | 'retention';
    targetValue?: number;
    isPrimary: boolean;
  }>;
  duration: number;
}

interface ModelTrainRequest {
  name: string;
  type: 'classification' | 'regression' | 'clustering';
  algorithm: 'random_forest' | 'neural_network' | 'linear_regression' | 'kmeans';
  features: string[];
  target: string;
  trainingData: any[];
}

interface PredictionRequest {
  modelId: string;
  inputData: any;
}

// Initialize service with MongoDB and Redis
let mlOptimizationService: MachineLearningOptimizationService;

const initializeService = async () => {
  if (!mlOptimizationService) {
    const db = await getMongoDB();
    const redis = await getRedisClient();
    
    mlOptimizationService = new MachineLearningOptimizationService(
      db.collection('analytics_events'),
      db.collection('users'),
      redis,
    );
  }
  return mlOptimizationService;
};

  // Rate limiting for ML endpoints
  const mlRateLimit = createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: 'Too many ML requests, please try again later',
  });

  const predictionRateLimit = createRateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 predictions per minute
    message: 'Too many prediction requests, please try again later',
  });

  /**
   * POST /api/v1/ml-optimization/ab-test/create
   * Create a new A/B test (admin only)
   */
router.post('/ml-optimization/ab-test/create',
  requireAuth,
  requireAdmin,
  mlRateLimit,
  validateInput,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const abTestData = req.body as ABTestCreateRequest;

      const service = await initializeService();
      const abTest = await service.createABTest(abTestData);

      return res.json({
        success: true,
        data: abTest
      });
    } catch (error) {
      logger.error('Error creating A/B test:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create A/B test'
      });
    }
  }
);

/**
 * GET /api/v1/ml-optimization/ab-test/list
 * Get all A/B tests (admin only)
 */
router.get('/ml-optimization/ab-test/list',
  requireAuth,
  requireAdmin,
  mlRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const service = await initializeService();
      const abTests = await service.getAllABTests();

      return res.json({
        success: true,
        data: abTests
      });
    } catch (error) {
      logger.error('Error getting A/B tests:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get A/B tests'
      });
    }
  }
);

  /**
   * GET /api/v1/ml-optimization/ab-test/:testId/results
   * Get A/B test results (admin only)
   */
router.get('/ml-optimization/ab-test/:testId/results',
  requireAuth,
  requireAdmin,
  mlRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { testId } = req.params;

      const service = await initializeService();
      const results = await service.getABTestResults(testId);

      return res.json({
          success: true,
        data: results
      });
    } catch (error) {
      logger.error('Error getting A/B test results:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get A/B test results'
      });
    }
  }
);

/**
 * POST /api/v1/ml-optimization/model/train
 * Train a new ML model (admin only)
 */
router.post('/ml-optimization/model/train',
  requireAuth,
  requireAdmin,
  mlRateLimit,
  validateInput,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const modelData = req.body as ModelTrainRequest;

      const service = await initializeService();
      const model = await service.trainModel(modelData);

      return res.json({
          success: true,
        data: model
      });
    } catch (error) {
      logger.error('Error training model:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to train model'
      });
    }
  }
);

/**
 * GET /api/v1/ml-optimization/model/list
 * Get all trained models (admin only)
 */
router.get('/ml-optimization/model/list',
  requireAuth,
  requireAdmin,
  mlRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const service = await initializeService();
      const models = await service.getAllModels();

      return res.json({
        success: true,
        data: models
      });
    } catch (error) {
      logger.error('Error getting models:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get models'
      });
    }
  }
);

/**
 * POST /api/v1/ml-optimization/prediction
 * Make a prediction using a trained model
 */
router.post('/ml-optimization/prediction',
  requireAuth,
  predictionRateLimit,
  validateInput,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { modelId, inputData } = req.body as PredictionRequest;

      const service = await initializeService();
      const prediction = await service.makePrediction(modelId, inputData);

      return res.json({
        success: true,
        data: prediction
      });
    } catch (error) {
      logger.error('Error making prediction:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to make prediction'
      });
    }
  }
);

/**
 * GET /api/v1/ml-optimization/analytics
 * Get ML optimization analytics (admin only)
 */
router.get('/ml-optimization/analytics',
  requireAuth,
  requireAdmin,
  mlRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const service = await initializeService();
      const analytics = await service.getMLAnalytics();

      return res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Error getting ML analytics:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get ML analytics'
      });
    }
  }
);

/**
 * POST /api/v1/ml-optimization/feature-importance
 * Get feature importance for a model (admin only)
 */
router.post('/ml-optimization/feature-importance',
  requireAuth,
  requireAdmin,
  mlRateLimit,
  validateInput,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { modelId } = req.body;

      const service = await initializeService();
      const featureImportance = await service.getFeatureImportance(modelId);

      return res.json({
        success: true,
        data: featureImportance
      });
    } catch (error) {
      logger.error('Error getting feature importance:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get feature importance'
      });
    }
  }
);

/**
 * POST /api/v1/ml-optimization/model/retrain
 * Retrain an existing model (admin only)
 */
router.post('/ml-optimization/model/retrain',
  requireAuth,
  requireAdmin,
  mlRateLimit,
  validateInput,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { modelId, newTrainingData } = req.body;

      const service = await initializeService();
      const retrainedModel = await service.retrainModel(modelId, newTrainingData);

      return res.json({
        success: true,
        data: retrainedModel
      });
    } catch (error) {
      logger.error('Error retraining model:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrain model'
      });
    }
  }
);

/**
 * DELETE /api/v1/ml-optimization/model/:modelId
 * Delete a model (admin only)
 */
router.delete('/ml-optimization/model/:modelId',
  requireAuth,
  requireAdmin,
  mlRateLimit,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { modelId } = req.params;

      const service = await initializeService();
      await service.deleteModel(modelId);

      return res.json({
        success: true,
        message: 'Model deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting model:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete model'
      });
    }
  }
);

/**
 * POST /api/v1/ml-optimization/optimize
 * Run ML optimization (admin only)
 */
router.post('/ml-optimization/optimize',
  requireAuth,
  requireAdmin,
  mlRateLimit,
  validateInput,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { optimizationType, parameters } = req.body;

      const service = await initializeService();
      const optimization = await service.runOptimization(optimizationType, parameters);

      return res.json({
        success: true,
        data: optimization
      });
    } catch (error) {
      logger.error('Error running ML optimization:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to run ML optimization'
      });
    }
}
);

export default router;
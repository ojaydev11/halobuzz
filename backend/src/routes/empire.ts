import { Router, Response } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { AnalyticsDailyKPI } from '../analytics/models/AnalyticsDailyKPI';
import { AnalyticsAlert } from '../analytics/models/AnalyticsAlert';
import { AnalyticsForecast } from '../analytics/models/AnalyticsForecast';
import { AnalyticsSimulation } from '../analytics/models/AnalyticsSimulation';
import { SimulationEngine } from '../analytics/services/simulations';
import { logger } from '../config/logger';
import { authMiddleware } from '@/middleware/auth';
import { socialLimiter } from '@/middleware/security';

const router = Router();

// Apply authentication and rate limiting to all routes
router.use(authMiddleware);
router.use(socialLimiter);

interface EmpireDashboardQuery {
  from: string;
  to: string;
  country?: string;
  appId?: string;
}

interface EmpireKPISummary {
  appId: string;
  totalRevenue: number;
  totalDAU: number;
  totalMAU: number;
  avgARPU: number;
  avgPayerRate: number;
  totalAlerts: number;
  activeAlerts: number;
  safetyScore: number;
  growthRate: number;
}

interface EmpireDashboardResponse {
  summary: {
    totalApps: number;
    totalRevenue: number;
    totalDAU: number;
    totalMAU: number;
    avgARPU: number;
    avgPayerRate: number;
    totalAlerts: number;
    activeAlerts: number;
    avgSafetyScore: number;
    overallGrowthRate: number;
  };
  apps: EmpireKPISummary[];
  period: {
    from: string;
    to: string;
  };
  generatedAt: string;
}

// Get empire dashboard
router.get('/dashboard', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { from, to, country, appId } = req.query as EmpireDashboardQuery;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: 'from and to dates are required'
      });
    }

    const query: any = {
      date: {
        $gte: new Date(from),
        $lte: new Date(to)
      }
    };

    if (country) {
      query.country = country;
      }
      
      if (appId) {
      query.appId = appId;
    }

    // Get KPIs for the period
    const kpis = await AnalyticsDailyKPI.find(query).sort({ date: -1 });

    // Calculate summary
    const summary = {
      totalApps: 0,
      totalRevenue: 0,
      totalDAU: 0,
      totalMAU: 0,
      avgARPU: 0,
      avgPayerRate: 0,
      totalAlerts: 0,
      activeAlerts: 0,
      avgSafetyScore: 0,
      overallGrowthRate: 0
    };

      const apps: EmpireKPISummary[] = [];

    if (kpis.length > 0) {
      // Group by appId
      const appGroups = kpis.reduce((acc, kpi) => {
        if (!acc[kpi.appId]) {
          acc[kpi.appId] = [];
        }
        acc[kpi.appId].push(kpi);
        return acc;
      }, {} as Record<string, any[]>);

      // Calculate metrics for each app
      Object.entries(appGroups).forEach(([appId, appKpis]) => {
        const totalRevenue = appKpis.reduce((sum, kpi) => sum + (kpi.revenue || 0), 0);
        const totalDAU = appKpis.reduce((sum, kpi) => sum + (kpi.dau || 0), 0);
        const totalMAU = appKpis.reduce((sum, kpi) => sum + (kpi.mau || 0), 0);
        const avgARPU = totalDAU > 0 ? totalRevenue / totalDAU : 0;
        const avgPayerRate = appKpis.reduce((sum, kpi) => sum + (kpi.payerRate || 0), 0) / appKpis.length;
        const avgSafetyScore = appKpis.reduce((sum, kpi) => sum + (kpi.safetyScore || 0), 0) / appKpis.length;

        apps.push({
          appId,
          totalRevenue,
          totalDAU,
          totalMAU,
          avgARPU,
          avgPayerRate,
          totalAlerts: 0, // Would need to query alerts separately
          activeAlerts: 0,
          safetyScore: avgSafetyScore,
          growthRate: 0 // Would need to calculate growth rate
        });

        // Update summary
        summary.totalApps++;
        summary.totalRevenue += totalRevenue;
        summary.totalDAU += totalDAU;
        summary.totalMAU += totalMAU;
      });

      summary.avgARPU = summary.totalDAU > 0 ? summary.totalRevenue / summary.totalDAU : 0;
      summary.avgPayerRate = apps.length > 0 ? apps.reduce((sum, app) => sum + app.avgPayerRate, 0) / apps.length : 0;
      summary.avgSafetyScore = apps.length > 0 ? apps.reduce((sum, app) => sum + app.safetyScore, 0) / apps.length : 0;
    }

    const response: EmpireDashboardResponse = {
      summary,
      apps,
      period: { from, to },
      generatedAt: new Date().toISOString()
    };

    return res.json({
      success: true,
      data: response
    });
    } catch (error) {
    logger.error('Error getting empire dashboard:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get empire dashboard'
      });
    }
  });

// Get empire KPIs
router.get('/kpis', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { from, to, appId } = req.query;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: 'from and to dates are required'
      });
    }

    const query: any = {
      date: {
        $gte: new Date(from as string),
        $lte: new Date(to as string)
      }
    };

    if (appId) {
      query.appId = appId;
    }

    const kpis = await AnalyticsDailyKPI.find(query).sort({ date: -1 });

    return res.json({
      success: true,
      data: kpis
    });
    } catch (error) {
    logger.error('Error getting empire KPIs:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get empire KPIs'
      });
    }
  });

// Get empire alerts
router.get('/alerts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, severity, limit = 50 } = req.query;

    const query: any = {};
    if (status) {
      query.status = status;
    }
    if (severity) {
      query.severity = severity;
    }

    const alerts = await AnalyticsAlert.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string));

    return res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    logger.error('Error getting empire alerts:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get empire alerts'
    });
  }
});

// Get empire forecasts
router.get('/forecasts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { appId, limit = 10 } = req.query;

    const query: any = {};
    if (appId) {
      query.appId = appId;
    }

    const forecasts = await AnalyticsForecast.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string));

    return res.json({
      success: true,
      data: forecasts
    });
    } catch (error) {
    logger.error('Error getting empire forecasts:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get empire forecasts'
      });
    }
  });

// Run empire simulation
router.post('/simulation', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { simulationConfig } = req.body;

    const simulation = await SimulationEngine.runSimulation(simulationConfig);

    return res.json({
      success: true,
      data: simulation
    });
  } catch (error) {
    logger.error('Error running empire simulation:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to run empire simulation'
    });
  }
});

// Get empire simulation results
router.get('/simulation/:simulationId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { simulationId } = req.params;

    const simulation = await AnalyticsSimulation.findById(simulationId);

    if (!simulation) {
      return res.status(404).json({
        success: false,
        error: 'Simulation not found'
      });
    }

    return res.json({
      success: true,
      data: simulation
    });
  } catch (error) {
    logger.error('Error getting empire simulation:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get empire simulation'
    });
  }
});

export default router;
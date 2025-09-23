import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AnalyticsDailyKPI } from '../analytics/models/AnalyticsDailyKPI';
import { AnalyticsAlert } from '../analytics/models/AnalyticsAlert';
import { AnalyticsForecast } from '../analytics/models/AnalyticsForecast';
import { AnalyticsSimulation } from '../analytics/models/AnalyticsSimulation';
import { SimulationEngine } from '../analytics/services/simulations';
import { logger } from '../config/logger';

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

export async function empireRoutes(fastify: FastifyInstance) {
  // GET /api/v1/ai/business/empire-dashboard
  fastify.get('/empire-dashboard', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          from: { type: 'string', format: 'date' },
          to: { type: 'string', format: 'date' },
          country: { type: 'string' },
          appId: { type: 'string' }
        },
        required: ['from', 'to']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            summary: {
              type: 'object',
              properties: {
                totalApps: { type: 'number' },
                totalRevenue: { type: 'number' },
                totalDAU: { type: 'number' },
                totalMAU: { type: 'number' },
                avgARPU: { type: 'number' },
                avgPayerRate: { type: 'number' },
                totalAlerts: { type: 'number' },
                activeAlerts: { type: 'number' },
                avgSafetyScore: { type: 'number' },
                overallGrowthRate: { type: 'number' }
              }
            },
            apps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  appId: { type: 'string' },
                  totalRevenue: { type: 'number' },
                  totalDAU: { type: 'number' },
                  totalMAU: { type: 'number' },
                  avgARPU: { type: 'number' },
                  avgPayerRate: { type: 'number' },
                  totalAlerts: { type: 'number' },
                  activeAlerts: { type: 'number' },
                  safetyScore: { type: 'number' },
                  growthRate: { type: 'number' }
                }
              }
            },
            period: {
              type: 'object',
              properties: {
                from: { type: 'string' },
                to: { type: 'string' }
              }
            },
            generatedAt: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Querystring: EmpireDashboardQuery }>, reply: FastifyReply) => {
    try {
      const { from, to, country = 'ALL', appId } = request.query;
      
      logger.info('Generating empire dashboard', { from, to, country, appId });

      const fromDate = new Date(from);
      const toDate = new Date(to);

      // Build query filters
      const kpiFilter: any = {
        date: { $gte: fromDate, $lte: toDate }
      };
      
      if (country !== 'ALL') {
        kpiFilter.country = country;
      }
      
      if (appId) {
        kpiFilter.appId = appId;
      }

      // Get all unique app IDs in the system
      const uniqueAppIds = await AnalyticsDailyKPI.distinct('appId', kpiFilter);
      
      if (uniqueAppIds.length === 0) {
        return reply.status(404).send({
          error: 'No data found for the specified period',
          message: 'No analytics data available for the given date range and filters'
        });
      }

      const apps: EmpireKPISummary[] = [];
      let totalRevenue = 0;
      let totalDAU = 0;
      let totalMAU = 0;
      let totalARPU = 0;
      let totalPayerRate = 0;
      let totalAlerts = 0;
      let activeAlerts = 0;
      let totalSafetyScore = 0;
      let totalGrowthRate = 0;

      // Process each app
      for (const currentAppId of uniqueAppIds) {
        const appFilter = { ...kpiFilter, appId: currentAppId };
        
        // Get KPI data for this app
        const kpiData = await AnalyticsDailyKPI.find(appFilter).sort({ date: 1 });
        
        if (kpiData.length === 0) continue;

        // Calculate app-level metrics
        const appRevenue = kpiData.reduce((sum, kpi) => sum + kpi.revenue.total, 0);
        const appDAU = kpiData.reduce((sum, kpi) => sum + kpi.engagement.dau, 0);
        const appMAU = Math.max(...kpiData.map(kpi => kpi.engagement.mau));
        const appARPU = kpiData.reduce((sum, kpi) => sum + kpi.monetization.arpu, 0) / kpiData.length;
        const appPayerRate = kpiData.reduce((sum, kpi) => sum + kpi.monetization.payerRate, 0) / kpiData.length;
        const appSafetyScore = kpiData.reduce((sum, kpi) => sum + kpi.safety.safetyScore, 0) / kpiData.length;

        // Calculate growth rate (revenue growth from first to last period)
        const firstPeriodRevenue = kpiData[0]?.revenue.total || 0;
        const lastPeriodRevenue = kpiData[kpiData.length - 1]?.revenue.total || 0;
        const appGrowthRate = firstPeriodRevenue > 0 ? 
          ((lastPeriodRevenue - firstPeriodRevenue) / firstPeriodRevenue) * 100 : 0;

        // Get alert data for this app
        const alertFilter: any = {
          appId: currentAppId,
          createdAt: { $gte: fromDate, $lte: toDate }
        };
        
        if (country !== 'ALL') {
          alertFilter.country = country;
        }

        const appAlerts = await AnalyticsAlert.find(alertFilter);
        const appActiveAlerts = appAlerts.filter(alert => alert.status === 'active').length;

        const appSummary: EmpireKPISummary = {
          appId: currentAppId,
          totalRevenue: appRevenue,
          totalDAU: appDAU,
          totalMAU: appMAU,
          avgARPU: appARPU,
          avgPayerRate: appPayerRate,
          totalAlerts: appAlerts.length,
          activeAlerts: appActiveAlerts,
          safetyScore: appSafetyScore,
          growthRate: appGrowthRate
        };

        apps.push(appSummary);

        // Accumulate totals
        totalRevenue += appRevenue;
        totalDAU += appDAU;
        totalMAU += appMAU;
        totalARPU += appARPU;
        totalPayerRate += appPayerRate;
        totalAlerts += appAlerts.length;
        activeAlerts += appActiveAlerts;
        totalSafetyScore += appSafetyScore;
        totalGrowthRate += appGrowthRate;
      }

      // Calculate averages
      const avgARPU = apps.length > 0 ? totalARPU / apps.length : 0;
      const avgPayerRate = apps.length > 0 ? totalPayerRate / apps.length : 0;
      const avgSafetyScore = apps.length > 0 ? totalSafetyScore / apps.length : 0;
      const overallGrowthRate = apps.length > 0 ? totalGrowthRate / apps.length : 0;

      const response: EmpireDashboardResponse = {
        summary: {
          totalApps: apps.length,
          totalRevenue,
          totalDAU,
          totalMAU,
          avgARPU,
          avgPayerRate,
          totalAlerts,
          activeAlerts,
          avgSafetyScore,
          overallGrowthRate
        },
        apps,
        period: {
          from,
          to
        },
        generatedAt: new Date().toISOString()
      };

      logger.info('Empire dashboard generated successfully', { 
        totalApps: apps.length, 
        totalRevenue,
        totalDAU 
      });

      return reply.send(response);

    } catch (error) {
      logger.error('Error generating empire dashboard:', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to generate empire dashboard'
      });
    }
  });

  // GET /api/v1/ai/business/empire-dashboard/apps
  fastify.get('/empire-dashboard/apps', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            apps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  appId: { type: 'string' },
                  name: { type: 'string' },
                  status: { type: 'string' },
                  lastDataUpdate: { type: 'string' },
                  totalRevenue: { type: 'number' },
                  totalDAU: { type: 'number' },
                  activeAlerts: { type: 'number' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Get all unique app IDs with their latest data
      const apps = await AnalyticsDailyKPI.aggregate([
        {
          $group: {
            _id: '$appId',
            lastDataUpdate: { $max: '$date' },
            totalRevenue: { $sum: '$revenue.total' },
            totalDAU: { $sum: '$engagement.dau' }
          }
        },
        {
          $lookup: {
            from: 'analyticsalerts',
            localField: '_id',
            foreignField: 'appId',
            as: 'alerts'
          }
        },
        {
          $addFields: {
            activeAlerts: {
              $size: {
                $filter: {
                  input: '$alerts',
                  cond: { $eq: ['$$this.status', 'active'] }
                }
              }
            }
          }
        },
        {
          $project: {
            appId: '$_id',
            name: {
              $switch: {
                branches: [
                  { case: { $eq: ['$_id', 'halobuzz'] }, then: 'HaloBuzz' },
                  { case: { $eq: ['$_id', 'sewago'] }, then: 'SewaGo' },
                  { case: { $eq: ['$_id', 'solsnipepro'] }, then: 'SolSnipePro' },
                  { case: { $eq: ['$_id', 'nepvest'] }, then: 'Nepvest' }
                ],
                default: '$_id'
              }
            },
            status: {
              $cond: {
                if: { $gte: ['$lastDataUpdate', { $subtract: [new Date(), 24 * 60 * 60 * 1000] }] },
                then: 'active',
                else: 'inactive'
              }
            },
            lastDataUpdate: 1,
            totalRevenue: 1,
            totalDAU: 1,
            activeAlerts: 1
          }
        },
        {
          $sort: { totalRevenue: -1 }
        }
      ]);

      return reply.send({ apps });

    } catch (error) {
      logger.error('Error fetching empire apps:', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to fetch empire apps'
      });
    }
  });

  // POST /api/v1/ai/business/simulate
  fastify.post('/simulate', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    schema: {
      body: {
        type: 'object',
        properties: {
          scenario: {
            type: 'string',
            enum: ['double_gift_multiplier', 'price_change_coin_pack', 'og_tier_promo', 'festival_skin_push']
          },
          params: {
            type: 'object',
            properties: {
              multiplier: { type: 'number', minimum: 0.1, maximum: 5.0 },
              priceChange: { type: 'number', minimum: -50, maximum: 100 },
              discountPercent: { type: 'number', minimum: 0, maximum: 100 },
              durationDays: { type: 'number', minimum: 1, maximum: 30 }
            }
          },
          segment: {
            type: 'object',
            properties: {
              country: { type: 'string' },
              og: { type: 'string' }
            }
          },
          horizonDays: {
            type: 'number',
            minimum: 7,
            maximum: 60,
            default: 30
          }
        },
        required: ['scenario', 'horizonDays']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            scenario: { type: 'string' },
            projectedKpis: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string' },
                  kpis: { type: 'object' }
                }
              }
            },
            deltaVsBaseline: { type: 'object' },
            baselineKpis: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: { type: 'string' },
                  kpis: { type: 'object' }
                }
              }
            },
            insights: {
              type: 'array',
              items: { type: 'string' }
            },
            simulationId: { type: 'string' },
            generatedAt: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Body: {
      scenario: 'double_gift_multiplier' | 'price_change_coin_pack' | 'og_tier_promo' | 'festival_skin_push';
      params?: Record<string, number | string>;
      segment?: { country?: string; og?: string };
      horizonDays: number;
    }
  }>, reply: FastifyReply) => {
    try {
      const { scenario, params = {}, segment, horizonDays } = request.body;
      
      logger.info('Running simulation', { scenario, params, segment, horizonDays });

      // Validate horizon days against environment limit
      const maxHorizonDays = parseInt(process.env.SIM_MAX_HORIZON_DAYS || '60');
      if (horizonDays > maxHorizonDays) {
        return reply.status(400).send({
          error: 'Invalid horizon days',
          message: `Maximum horizon days allowed is ${maxHorizonDays}`,
          provided: horizonDays
        });
      }

      // Initialize simulation engine
      const simulationEngine = new SimulationEngine();

      // Run simulation
      const simulationResult = await simulationEngine.runSimulation({
        scenario,
        params,
        segment,
        horizonDays
      });

      // Store simulation snapshot
      const simulationSnapshot = await AnalyticsSimulation.create({
        scenario,
        params,
        segment,
        horizonDays,
        projectedKpis: simulationResult.projectedKpis,
        baselineKpis: simulationResult.baselineKpis,
        deltaVsBaseline: simulationResult.deltaVsBaseline,
        insights: simulationResult.insights,
        createdAt: new Date()
      });

      const response = {
        scenario: simulationResult.scenario,
        projectedKpis: simulationResult.projectedKpis,
        deltaVsBaseline: simulationResult.deltaVsBaseline,
        baselineKpis: simulationResult.baselineKpis,
        insights: simulationResult.insights,
        simulationId: simulationSnapshot._id.toString(),
        generatedAt: new Date().toISOString()
      };

      logger.info('Simulation completed successfully', { 
        scenario, 
        simulationId: simulationSnapshot._id,
        horizonDays 
      });

      return reply.send(response);

    } catch (error) {
      logger.error('Simulation failed:', error);
      return reply.status(500).send({
        error: 'Simulation failed',
        message: 'Failed to run simulation',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // GET /api/v1/ai/business/simulations
  fastify.get('/simulations', {
    preHandler: [fastify.authenticate, fastify.authorize(['admin'])],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          scenario: { type: 'string' },
          limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
          offset: { type: 'number', minimum: 0, default: 0 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            simulations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  simulationId: { type: 'string' },
                  scenario: { type: 'string' },
                  params: { type: 'object' },
                  segment: { type: 'object' },
                  horizonDays: { type: 'number' },
                  insights: { type: 'array', items: { type: 'string' } },
                  createdAt: { type: 'string' }
                }
              }
            },
            total: { type: 'number' },
            limit: { type: 'number' },
            offset: { type: 'number' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{
    Querystring: {
      scenario?: string;
      limit?: number;
      offset?: number;
    }
  }>, reply: FastifyReply) => {
    try {
      const { scenario, limit = 20, offset = 0 } = request.query;

      const filter: any = {};
      if (scenario) {
        filter.scenario = scenario;
      }

      const simulations = await AnalyticsSimulation.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(offset)
        .select('scenario params segment horizonDays insights createdAt')
        .lean();

      const total = await AnalyticsSimulation.countDocuments(filter);

      const response = {
        simulations: simulations.map(sim => ({
          simulationId: sim._id.toString(),
          scenario: sim.scenario,
          params: sim.params,
          segment: sim.segment,
          horizonDays: sim.horizonDays,
          insights: sim.insights,
          createdAt: sim.createdAt.toISOString()
        })),
        total,
        limit,
        offset
      };

      return reply.send(response);

    } catch (error) {
      logger.error('Failed to fetch simulations:', error);
      return reply.status(500).send({
        error: 'Failed to fetch simulations',
        message: 'Unable to retrieve simulation history'
      });
    }
  });
}

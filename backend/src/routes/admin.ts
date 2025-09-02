import express from 'express';
import { body, validationResult, query } from 'express-validator';
import { Gift } from '@/models/Gift';
import { Festival } from '@/models/Festival';
import { User } from '@/models/User';
import { Transaction } from '@/models/Transaction';
import { ModerationFlag } from '@/models/ModerationFlag';
import { setupLogger } from '@/config/logger';
import { getCache, setCache } from '@/config/redis';
import { reputationService } from '@/services/ReputationService';
import { requireCSRF, requireDeviceBinding, requireIPPinning } from '@/middleware/admin';
import { ageKycService } from '@/services/AgeKycService';
import { gamingControlsService } from '@/services/GamingControlsService';
import { socketSecurityService } from '@/services/SocketSecurityService';
import { cronSecurityService } from '@/services/CronSecurityService';
import { adminAuditService } from '@/services/AdminAuditService';
import flagsRouter from './admin/flags';

const logger = setupLogger();
const router: express.Router = express.Router();

// Feature flags management
router.use('/flags', flagsRouter);

// CSRF token endpoint
router.get('/csrf-token', (req, res) => {
  const csrfToken = req.session?.csrfToken || 'csrf-token-placeholder';
  res.json({
    success: true,
    csrfToken
  });
});

// ----- Overview Stats -----
router.get('/stats', async (req, res) => {
  try {
    // Very rough DAU/MAU using lastActiveAt
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [dau, mau, coinsSoldAgg, coinsSpentAgg, topHosts, recentViolations] = await Promise.all([
      User.countDocuments({ lastActiveAt: { $gte: dayAgo }, isBanned: false }),
      User.countDocuments({ lastActiveAt: { $gte: mau ? monthAgo : monthAgo }, isBanned: false }),
      Transaction.aggregate([
        { $match: { type: 'recharge', status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Transaction.aggregate([
        { $match: { type: { $in: ['gift_sent'] }, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      User.find({}).sort({ 'coins.totalEarned': -1 }).limit(5).select('username avatar coins.totalEarned'),
      ModerationFlag.find().sort({ createdAt: -1 }).limit(10)
    ]);

    const coinsSold = coinsSoldAgg[0]?.total || 0;
    const coinsSpent = coinsSpentAgg[0]?.total || 0;

    res.json({
      success: true,
      data: {
        dau, mau,
        coinsSold,
        coinsSpent,
        topHosts: topHosts.map(u => ({ id: u._id, username: u.username, totalEarned: u.coins?.totalEarned || 0 })),
        recentViolations
      }
    });
  } catch (error) {
    logger.error('Admin stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to load stats' });
  }
});

// ----- Gifts CRUD -----
router.get('/gifts', async (req, res) => {
  try {
    const gifts = await Gift.find({}).sort({ createdAt: -1 });
    res.json({ success: true, data: gifts });
  } catch (error) {
    logger.error('List gifts error:', error);
    res.status(500).json({ success: false, error: 'Failed to list gifts' });
  }
});

router.post('/gifts', [
  requireCSRF,
  body('name').isString().notEmpty(),
  body('description').isString().notEmpty(),
  body('icon').isString().notEmpty(),
  body('animation').isString().notEmpty(),
  body('priceCoins').isInt({ min: 1 }),
  body('priceUSD').isFloat({ min: 0 }),
  body('category').isString().notEmpty(),
  body('rarity').isIn(['common', 'rare', 'epic', 'legendary']),
  body('effects').optional().isObject(),
  body('isActive').optional().isBoolean(),
  body('isLimited').optional().isBoolean(),
  body('limitedQuantity').optional().isInt({ min: 1 }),
  body('animationLottieUrl').optional().isString(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const gift = await Gift.create({
      name: req.body.name,
      description: req.body.description,
      icon: req.body.icon,
      animation: req.body.animationLottieUrl || req.body.animation,
      priceCoins: req.body.priceCoins,
      priceUSD: req.body.priceUSD,
      category: req.body.category,
      rarity: req.body.rarity,
      isActive: req.body.isActive ?? true,
      isLimited: req.body.isLimited ?? false,
      limitedQuantity: req.body.limitedQuantity ?? null,
      effects: req.body.effects || { sound: '', visual: '', duration: 3000 }
    });

    res.status(201).json({ success: true, data: gift });
  } catch (error) {
    logger.error('Create gift error:', error);
    res.status(500).json({ success: false, error: 'Failed to create gift' });
  }
});

router.put('/gifts/:id', [requireCSRF], async (req, res) => {
  try {
    const update: any = { ...req.body };
    if (update.animationLottieUrl) {
      update.animation = update.animationLottieUrl;
      delete update.animationLottieUrl;
    }
    const gift = await Gift.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!gift) return res.status(404).json({ success: false, error: 'Gift not found' });
    res.json({ success: true, data: gift });
  } catch (error) {
    logger.error('Update gift error:', error);
    res.status(500).json({ success: false, error: 'Failed to update gift' });
  }
});

// ----- Festivals -----
router.get('/festivals', async (req, res) => {
  try {
    const festivals = await Festival.find({}).sort({ startDate: -1 }).populate('gifts', 'name');
    res.json({ success: true, data: festivals });
  } catch (error) {
    logger.error('List festivals error:', error);
    res.status(500).json({ success: false, error: 'Failed to list festivals' });
  }
});

router.patch('/festivals/:id/toggle', [requireCSRF], async (req, res) => {
  try {
    const fest = await Festival.findById(req.params.id);
    if (!fest) return res.status(404).json({ success: false, error: 'Festival not found' });
    fest.isActive = !fest.isActive;
    await fest.save();
    res.json({ success: true, data: fest });
  } catch (error) {
    logger.error('Toggle festival error:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle festival' });
  }
});

router.put('/festivals/:id', [requireCSRF], async (req, res) => {
  try {
    const update: any = { ...req.body };
    const fest = await Festival.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!fest) return res.status(404).json({ success: false, error: 'Festival not found' });
    res.json({ success: true, data: fest });
  } catch (error) {
    logger.error('Update festival error:', error);
    res.status(500).json({ success: false, error: 'Failed to update festival' });
  }
});

// ----- Pricing (simple key-value in Redis) -----
const PRICING_KEY = 'admin:pricing:v1';

router.get('/pricing', async (req, res) => {
  try {
    const pricing = await getCache<Record<string, any>>(PRICING_KEY);
    res.json({ success: true, data: pricing || { countries: {}, gateways: { esewa: true, khalti: true, stripe: false } } });
  } catch (error) {
    logger.error('Get pricing error:', error);
    res.status(500).json({ success: false, error: 'Failed to get pricing' });
  }
});

router.put('/pricing', [
  requireCSRF,
  body('countries').optional().isObject(),
  body('gateways').optional().isObject(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const current = (await getCache<Record<string, any>>(PRICING_KEY)) || {};
    const updated = { ...current, ...req.body };
    await setCache(PRICING_KEY, updated);
    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Update pricing error:', error);
    res.status(500).json({ success: false, error: 'Failed to update pricing' });
  }
});

// ----- Users -----
router.get('/users', [
  query('q').optional().isString(),
], async (req, res) => {
  try {
    const q = (req.query.q as string) || '';
    const filter = q
      ? {
          $or: [
            { email: { $regex: q, $options: 'i' } },
            { username: { $regex: q, $options: 'i' } },
            { phone: { $regex: q, $options: 'i' } }
          ]
        }
      : {};
    const users = await User.find(filter).limit(50).sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (error) {
    logger.error('Search users error:', error);
    res.status(500).json({ success: false, error: 'Failed to search users' });
  }
});

router.post('/users/:id/ban', [
  requireCSRF,
  body('ban').isBoolean(),
  body('reason').optional().isString(),
], async (req, res) => {
  try {
    const { ban, reason } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBanned: ban, banReason: ban ? (reason || 'Banned by admin') : null },
      { new: true }
    );
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: user });
  } catch (error) {
    logger.error('Ban user error:', error);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
});

router.post('/users/:id/trust', [
  requireCSRF,
  body('delta').isInt(),
], async (req, res) => {
  try {
    const { delta } = req.body;
    // Store a synthetic moderation_action with severity based on delta
    const type = 'moderation_action';
    const severity = Math.abs(delta);
    await reputationService.applyReputationDelta(req.params.id, type, { severity, action: delta >= 0 ? 'boost' : 'penalty' });
    const updatedUser = await User.findById(req.params.id);
    res.json({ success: true, data: updatedUser });
  } catch (error) {
    logger.error('Adjust trust error:', error);
    res.status(500).json({ success: false, error: 'Failed to adjust trust' });
  }
});

// ----- Transactions -----
router.get('/transactions', async (req, res) => {
  try {
    const { type, gateway, status, limit = '50' } = req.query as any;
    const filter: any = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (gateway) filter.paymentMethod = gateway;
    const tx = await Transaction.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit));
    const totals = await Transaction.aggregate([
      { $match: filter },
      { $group: { _id: '$currency', total: { $sum: '$amount' }, count: { $sum: 1 } } }
    ]);
    res.json({ success: true, data: { transactions: tx, totals } });
  } catch (error) {
    logger.error('List transactions error:', error);
    res.status(500).json({ success: false, error: 'Failed to list transactions' });
  }
});

// ----- KYC Management -----
router.get('/kyc/pending', async (req, res) => {
  try {
    const pendingSubmissions = await ageKycService.getPendingKycSubmissions();
    res.json({ success: true, data: pendingSubmissions });
  } catch (error) {
    logger.error('Get pending KYC submissions error:', error);
    res.status(500).json({ success: false, error: 'Failed to get pending KYC submissions' });
  }
});

router.get('/kyc/statistics', async (req, res) => {
  try {
    const stats = await ageKycService.getKycStatistics();
    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Get KYC statistics error:', error);
    res.status(500).json({ success: false, error: 'Failed to get KYC statistics' });
  }
});

router.post('/kyc/:userId/approve', [
  requireCSRF,
  body('reason').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { userId } = req.params;
    const adminId = req.user?.userId || 'unknown';
    const { reason } = req.body;

    const result = await ageKycService.approveKyc(userId, adminId);

    if (result.success) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(400).json({ success: false, error: result.message });
    }
  } catch (error) {
    logger.error('KYC approval error:', error);
    res.status(500).json({ success: false, error: 'Failed to approve KYC' });
  }
});

router.post('/kyc/:userId/reject', [
  requireCSRF,
  body('reason').isString().notEmpty().withMessage('Rejection reason is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { userId } = req.params;
    const adminId = req.user?.userId || 'unknown';
    const { reason } = req.body;

    const result = await ageKycService.rejectKyc(userId, reason, adminId);

    if (result.success) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(400).json({ success: false, error: result.message });
    }
  } catch (error) {
    logger.error('KYC rejection error:', error);
    res.status(500).json({ success: false, error: 'Failed to reject KYC' });
  }
});

// Gaming controls management
router.get('/gaming/limits', async (req, res) => {
  try {
    const limits = gamingControlsService.getLimits();
    res.json({ success: true, data: { limits } });
  } catch (error) {
    logger.error('Get gaming limits error:', error);
    res.status(500).json({ success: false, error: 'Failed to get gaming limits' });
  }
});

router.put('/gaming/limits', [requireCSRF], async (req, res) => {
  try {
    const { limits } = req.body;
    
    if (!limits || typeof limits !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid limits data' });
    }

    gamingControlsService.updateLimits(limits);
    
    res.json({ success: true, message: 'Gaming limits updated successfully' });
  } catch (error) {
    logger.error('Update gaming limits error:', error);
    res.status(500).json({ success: false, error: 'Failed to update gaming limits' });
  }
});

router.get('/gaming/sessions', async (req, res) => {
  try {
    const sessions = gamingControlsService.getActiveSessions();
    res.json({ success: true, data: { sessions } });
  } catch (error) {
    logger.error('Get gaming sessions error:', error);
    res.status(500).json({ success: false, error: 'Failed to get gaming sessions' });
  }
});

router.post('/gaming/sessions/:userId/end', [requireCSRF], async (req, res) => {
  try {
    const { userId } = req.params;
    
    const ended = gamingControlsService.forceEndSession(userId);
    
    if (ended) {
      res.json({ success: true, message: 'Gaming session ended successfully' });
    } else {
      res.status(404).json({ success: false, error: 'No active session found for user' });
    }
  } catch (error) {
    logger.error('End gaming session error:', error);
    res.status(500).json({ success: false, error: 'Failed to end gaming session' });
  }
});

// Socket security management
router.get('/socket/limits', async (req, res) => {
  try {
    const limits = socketSecurityService.getLimits();
    res.json({ success: true, data: { limits } });
  } catch (error) {
    logger.error('Get socket limits error:', error);
    res.status(500).json({ success: false, error: 'Failed to get socket limits' });
  }
});

router.put('/socket/limits', [requireCSRF], async (req, res) => {
  try {
    const { limits } = req.body;
    
    if (!limits || typeof limits !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid limits data' });
    }

    socketSecurityService.updateLimits(limits);
    
    res.json({ success: true, message: 'Socket limits updated successfully' });
  } catch (error) {
    logger.error('Update socket limits error:', error);
    res.status(500).json({ success: false, error: 'Failed to update socket limits' });
  }
});

router.get('/socket/sessions', async (req, res) => {
  try {
    const sessions = socketSecurityService.getActiveSessions();
    const ipConnections = socketSecurityService.getIPConnections();
    res.json({ success: true, data: { sessions, ipConnections } });
  } catch (error) {
    logger.error('Get socket sessions error:', error);
    res.status(500).json({ success: false, error: 'Failed to get socket sessions' });
  }
});

router.post('/socket/sessions/:userId/disconnect', [requireCSRF], async (req, res) => {
  try {
    const { userId } = req.params;
    
    const disconnected = socketSecurityService.forceDisconnect(userId);
    
    if (disconnected) {
      res.json({ success: true, message: 'Socket session disconnected successfully' });
    } else {
      res.status(404).json({ success: false, error: 'No active session found for user' });
    }
  } catch (error) {
    logger.error('Disconnect socket session error:', error);
    res.status(500).json({ success: false, error: 'Failed to disconnect socket session' });
  }
});

router.post('/socket/sessions/:userId/clear-violations', [requireCSRF], async (req, res) => {
  try {
    const { userId } = req.params;
    
    const cleared = socketSecurityService.clearViolations(userId);
    
    if (cleared) {
      res.json({ success: true, message: 'Violations cleared successfully' });
    } else {
      res.status(404).json({ success: false, error: 'No active session found for user' });
    }
  } catch (error) {
    logger.error('Clear violations error:', error);
    res.status(500).json({ success: false, error: 'Failed to clear violations' });
  }
});

router.get('/socket/violations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const violations = await socketSecurityService.getViolationHistory(userId);
    
    res.json({ success: true, data: { violations } });
  } catch (error) {
    logger.error('Get violation history error:', error);
    res.status(500).json({ success: false, error: 'Failed to get violation history' });
  }
});

// Cron security management
router.get('/cron/configs', async (req, res) => {
  try {
    const configs = cronSecurityService.getAllJobConfigs();
    res.json({ success: true, data: { configs } });
  } catch (error) {
    logger.error('Get cron configs error:', error);
    res.status(500).json({ success: false, error: 'Failed to get cron configs' });
  }
});

router.get('/cron/configs/:jobName', async (req, res) => {
  try {
    const { jobName } = req.params;
    const config = cronSecurityService.getJobConfig(jobName);
    
    if (config) {
      res.json({ success: true, data: { config } });
    } else {
      res.status(404).json({ success: false, error: 'Job configuration not found' });
    }
  } catch (error) {
    logger.error('Get cron config error:', error);
    res.status(500).json({ success: false, error: 'Failed to get cron config' });
  }
});

router.put('/cron/configs/:jobName', [requireCSRF], async (req, res) => {
  try {
    const { jobName } = req.params;
    const { config } = req.body;
    
    if (!config || typeof config !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid config data' });
    }

    // Validate timezone if provided
    if (config.timezone && !cronSecurityService.validateTimezone(config.timezone)) {
      return res.status(400).json({ success: false, error: 'Invalid timezone' });
    }

    cronSecurityService.updateJobConfig(jobName, config);
    
    res.json({ success: true, message: 'Cron job configuration updated successfully' });
  } catch (error) {
    logger.error('Update cron config error:', error);
    res.status(500).json({ success: false, error: 'Failed to update cron config' });
  }
});

router.get('/cron/executions', async (req, res) => {
  try {
    const activeExecutions = cronSecurityService.getActiveExecutions();
    res.json({ success: true, data: { activeExecutions } });
  } catch (error) {
    logger.error('Get cron executions error:', error);
    res.status(500).json({ success: false, error: 'Failed to get cron executions' });
  }
});

router.get('/cron/executions/:jobName/history', async (req, res) => {
  try {
    const { jobName } = req.params;
    const { limit = 10 } = req.query;
    
    const history = await cronSecurityService.getExecutionHistory(jobName, parseInt(limit as string));
    
    res.json({ success: true, data: { history } });
  } catch (error) {
    logger.error('Get cron execution history error:', error);
    res.status(500).json({ success: false, error: 'Failed to get cron execution history' });
  }
});

router.post('/cron/jobs/:jobName/stop', [requireCSRF], async (req, res) => {
  try {
    const { jobName } = req.params;
    
    const stopped = await cronSecurityService.forceStopJob(jobName);
    
    if (stopped) {
      res.json({ success: true, message: 'Cron job stopped successfully' });
    } else {
      res.status(404).json({ success: false, error: 'No active execution found for job' });
    }
  } catch (error) {
    logger.error('Stop cron job error:', error);
    res.status(500).json({ success: false, error: 'Failed to stop cron job' });
  }
});

router.post('/cron/jobs/:jobName/toggle', [requireCSRF], async (req, res) => {
  try {
    const { jobName } = req.params;
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, error: 'Invalid enabled value' });
    }
    
    const toggled = cronSecurityService.toggleJob(jobName, enabled);
    
    if (toggled) {
      res.json({ success: true, message: `Cron job ${enabled ? 'enabled' : 'disabled'} successfully` });
    } else {
      res.status(404).json({ success: false, error: 'Job configuration not found' });
    }
  } catch (error) {
    logger.error('Toggle cron job error:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle cron job' });
  }
});

router.get('/cron/timezones', async (req, res) => {
  try {
    const timezones = cronSecurityService.getSupportedTimezones();
    res.json({ success: true, data: { timezones } });
  } catch (error) {
    logger.error('Get timezones error:', error);
    res.status(500).json({ success: false, error: 'Failed to get timezones' });
  }
});

// Admin audit management
router.get('/audit/actions', async (req, res) => {
  try {
    const { adminId, action, resource, limit = 50, offset = 0 } = req.query;
    
    const actions = await adminAuditService.getActionHistory(
      adminId as string,
      action as string,
      resource as string,
      parseInt(limit as string),
      parseInt(offset as string)
    );
    
    res.json({ success: true, data: { actions } });
  } catch (error) {
    logger.error('Get admin actions error:', error);
    res.status(500).json({ success: false, error: 'Failed to get admin actions' });
  }
});

router.get('/audit/sessions', async (req, res) => {
  try {
    const sessions = adminAuditService.getActiveSessions();
    const stats = adminAuditService.getSessionStats();
    
    res.json({ success: true, data: { sessions, stats } });
  } catch (error) {
    logger.error('Get admin sessions error:', error);
    res.status(500).json({ success: false, error: 'Failed to get admin sessions' });
  }
});

router.get('/audit/report', async (req, res) => {
  try {
    const { startDate, endDate, adminId } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'Start date and end date are required' });
    }
    
    const report = await adminAuditService.generateActivityReport(
      new Date(startDate as string),
      new Date(endDate as string),
      adminId as string
    );
    
    res.json({ success: true, data: { report } });
  } catch (error) {
    logger.error('Generate audit report error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate audit report' });
  }
});

export default router;



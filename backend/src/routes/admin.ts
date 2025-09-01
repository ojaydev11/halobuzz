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

const logger = setupLogger();
const router = express.Router();

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

router.put('/gifts/:id', async (req, res) => {
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

router.patch('/festivals/:id/toggle', async (req, res) => {
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

router.put('/festivals/:id', async (req, res) => {
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

export default router;



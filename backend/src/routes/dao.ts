import { Router, Response } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { DAOGovernanceService } from '@/services/dao/DAOGovernanceService';
import { authMiddleware } from '@/middleware/auth';
import { socialLimiter } from '@/middleware/security';
import { logger } from '@/config/logger';

const router = Router();
const daoService = DAOGovernanceService.getInstance();

// Apply authentication and rate limiting to all routes
router.use(authMiddleware);
router.use(socialLimiter);

/**
 * @route POST /api/v1/dao/proposal
 * @desc Create a new DAO proposal
 */
router.post('/proposal', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, description, category, type, options } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!title || !description || !category || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const proposal = await daoService.createProposal(
      userId,
      title,
      description,
      category,
      type,
      options
    );

    res.status(201).json({
      success: true,
      data: proposal
    });
  } catch (error) {
    logger.error('Error creating DAO proposal', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to create DAO proposal' });
  }
});

/**
 * @route POST /api/v1/dao/proposal/:proposalId/start-voting
 * @desc Start voting on a proposal
 */
router.post('/proposal/:proposalId/start-voting', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { proposalId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const proposal = await daoService.startVoting(proposalId, userId);

    res.status(200).json({
      success: true,
      data: proposal
    });
  } catch (error) {
    logger.error('Error starting DAO voting', { error, proposalId: req.params.proposalId, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to start voting' });
  }
});

/**
 * @route POST /api/v1/dao/proposal/:proposalId/vote
 * @desc Cast a vote on a proposal
 */
router.post('/proposal/:proposalId/vote', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { proposalId } = req.params;
    const { choice } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!choice || !['support', 'oppose', 'abstain'].includes(choice)) {
      return res.status(400).json({ error: 'Valid choice is required' });
    }

    const vote = await daoService.castVote(proposalId, userId, choice);

    res.status(200).json({
      success: true,
      data: vote
    });
  } catch (error) {
    logger.error('Error casting DAO vote', { error, proposalId: req.params.proposalId, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to cast vote' });
  }
});

/**
 * @route POST /api/v1/dao/proposal/:proposalId/execute
 * @desc Execute a passed proposal
 */
router.post('/proposal/:proposalId/execute', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { proposalId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const proposal = await daoService.executeProposal(proposalId, userId);

    res.status(200).json({
      success: true,
      data: proposal
    });
  } catch (error) {
    logger.error('Error executing DAO proposal', { error, proposalId: req.params.proposalId, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to execute proposal' });
  }
});

/**
 * @route POST /api/v1/dao/delegate
 * @desc Delegate voting power
 */
router.post('/delegate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { delegateId, amount, coinId, expiresAt } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!delegateId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid delegate ID and amount are required' });
    }

    const delegation = await daoService.delegateVotingPower(
      userId,
      delegateId,
      amount,
      coinId,
      expiresAt ? new Date(expiresAt) : undefined
    );

    res.status(201).json({
      success: true,
      data: delegation
    });
  } catch (error) {
    logger.error('Error creating DAO delegation', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to create delegation' });
  }
});

/**
 * @route GET /api/v1/dao/treasury
 * @desc Get DAO treasury
 */
router.get('/treasury', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { treasuryId } = req.query;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const treasury = await daoService.getTreasury(treasuryId as string);

    res.status(200).json({
      success: true,
      data: treasury
    });
  } catch (error) {
    logger.error('Error getting DAO treasury', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to get treasury' });
  }
});

/**
 * @route GET /api/v1/dao/analytics
 * @desc Get DAO analytics
 */
router.get('/analytics', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const analytics = await daoService.getDAOAnalytics();

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error getting DAO analytics', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to get DAO analytics' });
  }
});

/**
 * @route GET /api/v1/dao/proposals/active
 * @desc Get active proposals
 */
router.get('/proposals/active', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const proposals = await daoService.getActiveProposals();

    res.status(200).json({
      success: true,
      data: proposals
    });
  } catch (error) {
    logger.error('Error getting active proposals', { error, userId: req.user?.userId });
    res.status(500).json({ error: 'Failed to get active proposals' });
  }
});

export default router;

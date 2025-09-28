import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { gamificationEngine } from '../services/GamificationAddictionEngine';
import { logger } from '../config/logger';

const router = express.Router();

// Get user engagement status
router.get('/engagement', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const engagement = await gamificationEngine.getUserEngagementStatus(userId);

    res.json({
      success: true,
      data: engagement
    });
  } catch (error) {
    logger.error('Error getting engagement status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get engagement status'
    });
  }
});

// Get achievement system
router.get('/achievements', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const achievements = await gamificationEngine.getAchievementSystem(userId);

    res.json({
      success: true,
      data: achievements
    });
  } catch (error) {
    logger.error('Error getting achievements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get achievements'
    });
  }
});

// Unlock achievement
router.post('/achievements/unlock', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { achievementId } = req.body;

    const result = await gamificationEngine.unlockAchievement(userId, achievementId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error unlocking achievement:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unlock achievement'
    });
  }
});

// Get reward system
router.get('/rewards', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const rewards = await gamificationEngine.getRewardSystem(userId);

    res.json({
      success: true,
      data: rewards
    });
  } catch (error) {
    logger.error('Error getting rewards:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get rewards'
    });
  }
});

// Claim daily reward
router.post('/rewards/daily/claim', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const result = await gamificationEngine.claimDailyReward(userId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error claiming daily reward:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to claim reward'
    });
  }
});

// Get streak system
router.get('/streaks', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const streaks = await gamificationEngine.getStreakSystem(userId);

    res.json({
      success: true,
      data: streaks
    });
  } catch (error) {
    logger.error('Error getting streaks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get streaks'
    });
  }
});

// Update user activity
router.post('/activity', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { activityType, metadata } = req.body;

    const result = await gamificationEngine.updateUserActivity(
      userId,
      activityType,
      metadata
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error updating user activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update activity'
    });
  }
});

// Get leaderboards
router.get('/leaderboards', authMiddleware, async (req: any, res) => {
  try {
    const { type = 'global', period = 'weekly' } = req.query;
    const leaderboards = await gamificationEngine.getLeaderboards(
      type as string,
      period as string
    );

    res.json({
      success: true,
      data: leaderboards
    });
  } catch (error) {
    logger.error('Error getting leaderboards:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get leaderboards'
    });
  }
});

// Get challenges
router.get('/challenges', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const challenges = await gamificationEngine.getChallenges(userId);

    res.json({
      success: true,
      data: challenges
    });
  } catch (error) {
    logger.error('Error getting challenges:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get challenges'
    });
  }
});

// Complete challenge
router.post('/challenges/complete', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { challengeId } = req.body;

    const result = await gamificationEngine.completeChallenge(userId, challengeId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error completing challenge:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete challenge'
    });
  }
});

// Get user progress
router.get('/progress', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const progress = await gamificationEngine.getUserProgress(userId);

    res.json({
      success: true,
      data: progress
    });
  } catch (error) {
    logger.error('Error getting user progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get progress'
    });
  }
});

// Get level system
router.get('/levels', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const levels = await gamificationEngine.getLevelSystem(userId);

    res.json({
      success: true,
      data: levels
    });
  } catch (error) {
    logger.error('Error getting level system:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get levels'
    });
  }
});

// Get addiction metrics (for monitoring)
router.get('/metrics', authMiddleware, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const metrics = await gamificationEngine.getAddictionMetrics(userId);

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error getting addiction metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get metrics'
    });
  }
});

export default router;
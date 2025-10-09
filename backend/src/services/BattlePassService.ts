import { BattlePass, IBattlePass, PlayerBattlePass, IPlayerBattlePass } from '../models/BattlePass';
import { CoinLedgerService } from './CoinLedgerService';
import { logger } from '../config/logger';

/**
 * BattlePassService
 * Handles battle pass purchases, XP tracking, reward claims, and challenge completion
 */
export class BattlePassService {
  private static instance: BattlePassService;

  private constructor() {}

  static getInstance(): BattlePassService {
    if (!BattlePassService.instance) {
      BattlePassService.instance = new BattlePassService();
    }
    return BattlePassService.instance;
  }

  /**
   * Get active battle pass
   */
  async getActiveBattlePass(): Promise<IBattlePass | null> {
    return BattlePass.findOne({
      status: 'active',
      'schedule.startDate': { $lte: new Date() },
      'schedule.endDate': { $gte: new Date() }
    });
  }

  /**
   * Get or create player battle pass progress
   */
  async getOrCreatePlayerProgress(
    userId: string,
    seasonId: string
  ): Promise<IPlayerBattlePass> {
    let progress = await PlayerBattlePass.findOne({ userId, seasonId });

    if (!progress) {
      const battlePass = await BattlePass.findOne({ seasonId });
      if (!battlePass) {
        throw new Error('Battle pass not found for season');
      }

      progress = await PlayerBattlePass.create({
        userId,
        seasonId,
        currentLevel: 1,
        totalXP: 0,
        xpToNextLevel: battlePass.tiers[1].xpRequired,
        hasPremium: false,
        hasPremiumPlus: false,
        claimedRewards: [],
        dailyChallengeProgress: this.initializeChallenges(battlePass.dailyChallenges),
        weeklyChallengeProgress: this.initializeChallenges(battlePass.weeklyChallenges)
      });

      // Update battle pass stats
      battlePass.stats.totalPlayers++;
      await battlePass.save();

      logger.info(`Created battle pass progress for user ${userId} season ${seasonId}`);
    }

    return progress;
  }

  /**
   * Initialize challenge progress
   */
  private initializeChallenges(challenges: any[]): any[] {
    return challenges
      .filter(c => c.active)
      .map(c => ({
        challengeId: c.challengeId,
        progress: 0,
        completed: false
      }));
  }

  /**
   * Add XP after match
   */
  async addMatchXP(
    userId: string,
    matchResult: {
      result: 'win' | 'loss';
      performanceScore: number; // 0-10
      isFirstWin: boolean;
      isInParty: boolean;
      gameMode: string;
      kills?: number;
      damage?: number;
      healing?: number;
      objectives?: number;
    }
  ): Promise<{
    xpEarned: number;
    levelsGained: number;
    newLevel: number;
    rewards: any[];
    challengesCompleted: string[];
  }> {
    const battlePass = await this.getActiveBattlePass();
    if (!battlePass) {
      return { xpEarned: 0, levelsGained: 0, newLevel: 1, rewards: [], challengesCompleted: [] };
    }

    const progress = await this.getOrCreatePlayerProgress(userId, battlePass.seasonId);

    // Calculate XP
    const xpEarned = battlePass.calculateMatchXP(
      matchResult.result,
      matchResult.performanceScore,
      matchResult.isFirstWin,
      matchResult.isInParty
    );

    // Add XP and check for level ups
    const levelsGained = await progress.addXP(xpEarned, battlePass);

    // Update stats
    progress.stats.matchesPlayed++;
    if (matchResult.isFirstWin) {
      progress.stats.firstWinsCollected++;
    }

    // Update challenge progress
    const challengesCompleted = await this.updateChallengeProgress(
      progress,
      battlePass,
      matchResult
    );

    await progress.save();

    // Update battle pass analytics
    battlePass.stats.totalXPEarned += xpEarned;
    if (progress.currentLevel > battlePass.stats.maxLevelReached) {
      battlePass.stats.maxLevelReached = progress.currentLevel;
    }
    await battlePass.save();

    // Collect rewards for new levels
    const rewards: any[] = [];
    if (levelsGained > 0) {
      for (let i = 0; i < levelsGained; i++) {
        const level = progress.currentLevel - levelsGained + i + 1;
        const levelRewards = await this.getRewardsForLevel(battlePass, level, progress.hasPremium);
        rewards.push(...levelRewards);
      }
    }

    logger.info(
      `User ${userId} earned ${xpEarned} XP, gained ${levelsGained} levels (now level ${progress.currentLevel})`
    );

    return {
      xpEarned,
      levelsGained,
      newLevel: progress.currentLevel,
      rewards,
      challengesCompleted
    };
  }

  /**
   * Update challenge progress
   */
  private async updateChallengeProgress(
    progress: IPlayerBattlePass,
    battlePass: IBattlePass,
    matchResult: any
  ): Promise<string[]> {
    const completed: string[] = [];

    // Update daily challenges
    for (const challenge of battlePass.dailyChallenges.filter(c => c.active)) {
      const playerChallenge = progress.dailyChallengeProgress.find(
        p => p.challengeId === challenge.challengeId
      );

      if (playerChallenge && !playerChallenge.completed) {
        const progressAmount = this.calculateChallengeProgress(challenge, matchResult);
        playerChallenge.progress += progressAmount;

        if (playerChallenge.progress >= challenge.requirement.target) {
          playerChallenge.completed = true;
          playerChallenge.claimedAt = new Date();
          progress.stats.challengesCompleted++;
          completed.push(challenge.name);

          // Add challenge XP
          await progress.addXP(challenge.xpReward, battlePass);

          // Add challenge coins
          if (challenge.coinReward) {
            await CoinLedgerService.addCoins(
              progress.userId,
              challenge.coinReward,
              'daily_challenge_reward',
              { challengeId: challenge.challengeId }
            );
          }
        }
      }
    }

    // Update weekly challenges
    for (const challenge of battlePass.weeklyChallenges.filter(c => c.active)) {
      const playerChallenge = progress.weeklyChallengeProgress.find(
        p => p.challengeId === challenge.challengeId
      );

      if (playerChallenge && !playerChallenge.completed) {
        const progressAmount = this.calculateChallengeProgress(challenge, matchResult);
        playerChallenge.progress += progressAmount;

        if (playerChallenge.progress >= challenge.requirement.target) {
          playerChallenge.completed = true;
          playerChallenge.claimedAt = new Date();
          progress.stats.challengesCompleted++;
          completed.push(challenge.name);

          // Add challenge XP
          await progress.addXP(challenge.xpReward, battlePass);

          // Add challenge coins
          if (challenge.coinReward) {
            await CoinLedgerService.addCoins(
              progress.userId,
              challenge.coinReward,
              'weekly_challenge_reward',
              { challengeId: challenge.challengeId }
            );
          }
        }
      }
    }

    return completed;
  }

  /**
   * Calculate challenge progress from match
   */
  private calculateChallengeProgress(challenge: any, matchResult: any): number {
    switch (challenge.requirement.type) {
      case 'wins':
        return matchResult.result === 'win' ? 1 : 0;
      case 'kills':
        return matchResult.kills || 0;
      case 'damage':
        return matchResult.damage || 0;
      case 'healing':
        return matchResult.healing || 0;
      case 'objectives':
        return matchResult.objectives || 0;
      case 'playtime':
        return 1; // 1 game = 1 progress
      default:
        return 0;
    }
  }

  /**
   * Get rewards for specific level
   */
  private async getRewardsForLevel(
    battlePass: IBattlePass,
    level: number,
    hasPremium: boolean
  ): Promise<any[]> {
    const tier = battlePass.tiers.find(t => t.level === level);
    if (!tier) return [];

    const rewards: any[] = [];

    // Add free rewards
    rewards.push(...tier.freeRewards);

    // Add premium rewards if player has premium
    if (hasPremium) {
      rewards.push(...tier.premiumRewards);
    }

    return rewards;
  }

  /**
   * Claim reward for specific level
   */
  async claimReward(
    userId: string,
    seasonId: string,
    level: number,
    rewardType: 'free' | 'premium'
  ): Promise<{
    success: boolean;
    message: string;
    reward?: any;
  }> {
    const progress = await this.getOrCreatePlayerProgress(userId, seasonId);
    const battlePass = await BattlePass.findOne({ seasonId });

    if (!battlePass) {
      return { success: false, message: 'Battle pass not found' };
    }

    // Check if can claim
    if (level > progress.currentLevel) {
      return { success: false, message: 'Level not reached yet' };
    }

    if (rewardType === 'premium' && !progress.hasPremium) {
      return { success: false, message: 'Premium battle pass required' };
    }

    // Check if already claimed
    if (progress.claimedRewards.some(r => r.level === level && r.rewardType === rewardType)) {
      return { success: false, message: 'Reward already claimed' };
    }

    // Claim reward
    const tier = battlePass.tiers.find(t => t.level === level);
    if (!tier) {
      return { success: false, message: 'Invalid level' };
    }

    const rewards = rewardType === 'free' ? tier.freeRewards : tier.premiumRewards;

    for (const reward of rewards) {
      // Award coins
      if (reward.type === 'coins') {
        await CoinLedgerService.addCoins(
          userId,
          reward.quantity,
          'battlepass_reward',
          { level, rewardType }
        );
      }

      // TODO: Award other reward types (skins, emotes, etc.)

      progress.claimedRewards.push({
        level,
        rewardType,
        itemId: reward.itemId,
        claimedAt: new Date()
      });
    }

    await progress.save();

    logger.info(`User ${userId} claimed ${rewardType} rewards for level ${level}`);

    return {
      success: true,
      message: 'Rewards claimed',
      reward: rewards
    };
  }

  /**
   * Purchase premium battle pass
   */
  async purchasePremium(
    userId: string,
    seasonId: string,
    tier: 'premium' | 'premium-plus'
  ): Promise<{
    success: boolean;
    message: string;
    levelsGranted?: number;
  }> {
    const battlePass = await BattlePass.findOne({ seasonId });
    if (!battlePass) {
      return { success: false, message: 'Battle pass not found' };
    }

    const progress = await this.getOrCreatePlayerProgress(userId, seasonId);

    if (progress.hasPremium) {
      return { success: false, message: 'Premium already purchased' };
    }

    // Calculate cost
    const cost = tier === 'premium-plus'
      ? battlePass.pricing.premiumPlusCost
      : battlePass.pricing.premiumCost;

    // Deduct coins
    try {
      await CoinLedgerService.deductCoins(
        userId,
        cost,
        'battlepass_purchase',
        { tier, seasonId }
      );
    } catch (error: any) {
      return { success: false, message: error.message };
    }

    // Grant premium
    progress.purchasePremium(tier, cost);
    await progress.save();

    // Update battle pass stats
    battlePass.stats.premiumOwners++;
    await battlePass.save();

    const levelsGranted = tier === 'premium-plus' ? 25 : 0;

    logger.info(
      `User ${userId} purchased ${tier} battle pass for ${cost} coins ` +
      `(granted ${levelsGranted} levels)`
    );

    return {
      success: true,
      message: `${tier} battle pass purchased`,
      levelsGranted
    };
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(
    seasonId: string,
    limit: number = 100
  ): Promise<IPlayerBattlePass[]> {
    return PlayerBattlePass.find({ seasonId })
      .sort({ currentLevel: -1, totalXP: -1 })
      .limit(limit)
      .populate('userId', 'username avatar');
  }

  /**
   * Refresh daily challenges
   */
  async refreshDailyChallenges(seasonId: string): Promise<number> {
    const battlePass = await BattlePass.findOne({ seasonId });
    if (!battlePass) return 0;

    // Mark old challenges as inactive
    for (const challenge of battlePass.dailyChallenges) {
      if (challenge.expiresAt <= new Date()) {
        challenge.active = false;
      }
    }

    // Generate new daily challenges
    const newChallenges = this.generateDailyChallenges(battlePass);
    battlePass.dailyChallenges.push(...newChallenges);

    await battlePass.save();

    // Reset player progress for expired challenges
    const players = await PlayerBattlePass.find({ seasonId });
    for (const player of players) {
      player.dailyChallengeProgress = player.dailyChallengeProgress.filter(
        p => !p.completed && battlePass.dailyChallenges.some(
          c => c.challengeId === p.challengeId && c.active
        )
      );

      // Add new challenges
      for (const challenge of newChallenges) {
        player.dailyChallengeProgress.push({
          challengeId: challenge.challengeId,
          progress: 0,
          completed: false
        });
      }

      await player.save();
    }

    logger.info(`Refreshed daily challenges for season ${seasonId}, generated ${newChallenges.length} new challenges`);

    return newChallenges.length;
  }

  /**
   * Generate daily challenges
   */
  private generateDailyChallenges(battlePass: IBattlePass): any[] {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    const challenges = [
      {
        challengeId: `daily-wins-${Date.now()}`,
        name: 'Victory Streak',
        description: 'Win 3 games',
        requirement: { type: 'wins', target: 3 },
        xpReward: battlePass.xpConfig.dailyQuestXP,
        coinReward: 200,
        expiresAt: tomorrow,
        active: true
      },
      {
        challengeId: `daily-kills-${Date.now()}`,
        name: 'Elimination Expert',
        description: 'Get 20 kills',
        requirement: { type: 'kills', target: 20 },
        xpReward: battlePass.xpConfig.dailyQuestXP,
        coinReward: 200,
        expiresAt: tomorrow,
        active: true
      },
      {
        challengeId: `daily-damage-${Date.now()}`,
        name: 'Damage Dealer',
        description: 'Deal 50,000 damage',
        requirement: { type: 'damage', target: 50000 },
        xpReward: battlePass.xpConfig.dailyQuestXP,
        coinReward: 200,
        expiresAt: tomorrow,
        active: true
      }
    ];

    return challenges;
  }

  /**
   * End season and distribute rewards
   */
  async endSeason(seasonId: string): Promise<{
    playersRewarded: number;
    totalCoinsAwarded: number;
  }> {
    const battlePass = await BattlePass.findOne({ seasonId });
    if (!battlePass) {
      throw new Error('Battle pass not found');
    }

    battlePass.status = 'ended';
    await battlePass.save();

    const players = await PlayerBattlePass.find({ seasonId, currentLevel: { $gte: 10 } });

    let playersRewarded = 0;
    let totalCoinsAwarded = 0;

    for (const player of players) {
      // Award coins based on final level
      const bonus = player.currentLevel * 100;
      await CoinLedgerService.addCoins(
        player.userId,
        bonus,
        'season_end_bonus',
        { seasonId, level: player.currentLevel }
      );

      playersRewarded++;
      totalCoinsAwarded += bonus;
    }

    logger.info(
      `Ended season ${seasonId}: rewarded ${playersRewarded} players, ` +
      `${totalCoinsAwarded} total coins`
    );

    return { playersRewarded, totalCoinsAwarded };
  }
}

export const battlePassService = BattlePassService.getInstance();

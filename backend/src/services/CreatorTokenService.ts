import { ethers } from 'ethers';
import { logger } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

export interface CreatorTokenData {
  tokenId: string;
  creatorId: string;
  contractAddress: string;
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  totalSupply: number;
  currentPrice: number;
  marketCap: number;
  stakingRewardRate: number;
  isActive: boolean;
  createdAt: Date;
}

export interface StakingData {
  userId: string;
  tokenId: string;
  amount: number;
  stakedAt: Date;
  lastClaimed: Date;
  totalRewards: number;
  isStaking: boolean;
}

export interface TokenTransaction {
  transactionId: string;
  tokenId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  price: number;
  type: 'buy' | 'sell' | 'stake' | 'unstake' | 'claim';
  timestamp: Date;
  txHash?: string;
}

export class CreatorTokenService {
  private provider: ethers.providers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private tokens: Map<string, CreatorTokenData> = new Map();
  private stakingData: Map<string, StakingData> = new Map();
  private transactions: Map<string, TokenTransaction> = new Map();

  constructor() {
    // Initialize with Polygon testnet for development
    this.provider = new ethers.providers.JsonRpcProvider(
      process.env.POLYGON_RPC_URL || 'https://rpc-mumbai.maticvigil.com'
    );
    
    this.wallet = new ethers.Wallet(
      process.env.PRIVATE_KEY || '',
      this.provider
    );
    
    logger.info('CreatorTokenService initialized', { 
      network: 'Polygon Mumbai',
      walletAddress: this.wallet.address 
    });
  }

  async createCreatorToken(
    creatorId: string,
    name: string,
    symbol: string,
    description: string,
    imageUrl: string,
    initialSupply: number
  ): Promise<CreatorTokenData> {
    try {
      logger.info('Creating creator token', { creatorId, name, symbol, initialSupply });

      // Generate unique token ID
      const tokenId = `token_${Date.now()}_${uuidv4().substr(0, 8)}`;
      
      // In a real implementation, this would deploy an actual smart contract
      // For now, we'll simulate the contract deployment
      const contractAddress = `0x${Math.random().toString(16).substr(2, 40)}`;

      const tokenData: CreatorTokenData = {
        tokenId,
        creatorId,
        contractAddress,
        name,
        symbol,
        description,
        imageUrl,
        totalSupply: initialSupply,
        currentPrice: 0.01, // Starting price
        marketCap: initialSupply * 0.01,
        stakingRewardRate: 10, // 10% APY
        isActive: true,
        createdAt: new Date(),
      };

      // Store token data
      this.tokens.set(tokenId, tokenData);

      logger.info('Creator token created successfully', { tokenId, contractAddress });
      return tokenData;
    } catch (error) {
      logger.error('Failed to create creator token:', error);
      throw new Error('Failed to create creator token');
    }
  }

  async stakeTokens(userId: string, tokenId: string, amount: number): Promise<boolean> {
    try {
      logger.info('Staking tokens', { userId, tokenId, amount });

      const tokenData = this.tokens.get(tokenId);
      if (!tokenData) {
        throw new Error('Token not found');
      }

      const minStakingAmount = 100; // Minimum 100 tokens
      if (amount < minStakingAmount) {
        throw new Error(`Minimum staking amount is ${minStakingAmount} tokens`);
      }

      // Check if user is already staking
      const existingStake = this.stakingData.get(`${userId}_${tokenId}`);
      if (existingStake && existingStake.isStaking) {
        throw new Error('User is already staking this token');
      }

      // Create staking data
      const stakingInfo: StakingData = {
        userId,
        tokenId,
        amount,
        stakedAt: new Date(),
        lastClaimed: new Date(),
        totalRewards: 0,
        isStaking: true,
      };

      this.stakingData.set(`${userId}_${tokenId}`, stakingInfo);

      // Record transaction
      const transaction: TokenTransaction = {
        transactionId: `tx_${Date.now()}_${uuidv4().substr(0, 8)}`,
        tokenId,
        fromUserId: userId,
        toUserId: 'staking_contract',
        amount,
        price: tokenData.currentPrice,
        type: 'stake',
        timestamp: new Date(),
      };

      this.transactions.set(transaction.transactionId, transaction);

      logger.info('Tokens staked successfully', { userId, tokenId, amount });
      return true;
    } catch (error) {
      logger.error('Failed to stake tokens:', error);
      return false;
    }
  }

  async claimRewards(userId: string, tokenId: string): Promise<number> {
    try {
      logger.info('Claiming staking rewards', { userId, tokenId });

      const stakingInfo = this.stakingData.get(`${userId}_${tokenId}`);
      if (!stakingInfo || !stakingInfo.isStaking) {
        throw new Error('No active staking found');
      }

      const tokenData = this.tokens.get(tokenId);
      if (!tokenData) {
        throw new Error('Token not found');
      }

      // Calculate rewards based on time staked
      const timeStaked = Date.now() - stakingInfo.lastClaimed.getTime();
      const daysStaked = timeStaked / (1000 * 60 * 60 * 24);
      const annualReward = (stakingInfo.amount * tokenData.stakingRewardRate) / 100;
      const rewards = (annualReward * daysStaked) / 365;

      if (rewards <= 0) {
        return 0;
      }

      // Update staking info
      stakingInfo.lastClaimed = new Date();
      stakingInfo.totalRewards += rewards;

      // Record transaction
      const transaction: TokenTransaction = {
        transactionId: `tx_${Date.now()}_${uuidv4().substr(0, 8)}`,
        tokenId,
        fromUserId: 'staking_contract',
        toUserId: userId,
        amount: rewards,
        price: tokenData.currentPrice,
        type: 'claim',
        timestamp: new Date(),
      };

      this.transactions.set(transaction.transactionId, transaction);

      logger.info('Rewards claimed successfully', { userId, tokenId, rewards });
      return rewards;
    } catch (error) {
      logger.error('Failed to claim rewards:', error);
      return 0;
    }
  }

  async unstakeTokens(userId: string, tokenId: string): Promise<boolean> {
    try {
      logger.info('Unstaking tokens', { userId, tokenId });

      const stakingInfo = this.stakingData.get(`${userId}_${tokenId}`);
      if (!stakingInfo || !stakingInfo.isStaking) {
        throw new Error('No active staking found');
      }

      const tokenData = this.tokens.get(tokenId);
      if (!tokenData) {
        throw new Error('Token not found');
      }

      // Check if staking period is completed (minimum 30 days)
      const stakingPeriod = Date.now() - stakingInfo.stakedAt.getTime();
      const minStakingPeriod = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

      if (stakingPeriod < minStakingPeriod) {
        throw new Error('Minimum staking period of 30 days not completed');
      }

      // Claim any pending rewards first
      const pendingRewards = await this.claimRewards(userId, tokenId);

      // Unstake tokens
      stakingInfo.isStaking = false;

      // Record transaction
      const transaction: TokenTransaction = {
        transactionId: `tx_${Date.now()}_${uuidv4().substr(0, 8)}`,
        tokenId,
        fromUserId: 'staking_contract',
        toUserId: userId,
        amount: stakingInfo.amount,
        price: tokenData.currentPrice,
        type: 'unstake',
        timestamp: new Date(),
      };

      this.transactions.set(transaction.transactionId, transaction);

      logger.info('Tokens unstaked successfully', { userId, tokenId, amount: stakingInfo.amount });
      return true;
    } catch (error) {
      logger.error('Failed to unstake tokens:', error);
      return false;
    }
  }

  async getStakingInfo(userId: string, tokenId: string): Promise<StakingData | null> {
    try {
      const stakingInfo = this.stakingData.get(`${userId}_${tokenId}`);
      return stakingInfo || null;
    } catch (error) {
      logger.error('Failed to get staking info:', error);
      return null;
    }
  }

  async getTokenData(tokenId: string): Promise<CreatorTokenData | null> {
    try {
      const tokenData = this.tokens.get(tokenId);
      return tokenData || null;
    } catch (error) {
      logger.error('Failed to get token data:', error);
      return null;
    }
  }

  async getAllTokens(): Promise<CreatorTokenData[]> {
    try {
      return Array.from(this.tokens.values());
    } catch (error) {
      logger.error('Failed to get all tokens:', error);
      return [];
    }
  }

  async getTokenTransactions(tokenId: string, limit: number = 50): Promise<TokenTransaction[]> {
    try {
      const transactions = Array.from(this.transactions.values())
        .filter(tx => tx.tokenId === tokenId)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);

      return transactions;
    } catch (error) {
      logger.error('Failed to get token transactions:', error);
      return [];
    }
  }

  async updateTokenPrice(tokenId: string, newPrice: number): Promise<boolean> {
    try {
      const tokenData = this.tokens.get(tokenId);
      if (!tokenData) {
        throw new Error('Token not found');
      }

      tokenData.currentPrice = newPrice;
      tokenData.marketCap = tokenData.totalSupply * newPrice;

      logger.info('Token price updated', { tokenId, newPrice, marketCap: tokenData.marketCap });
      return true;
    } catch (error) {
      logger.error('Failed to update token price:', error);
      return false;
    }
  }

  async calculateStakingRewards(userId: string, tokenId: string): Promise<number> {
    try {
      const stakingInfo = this.stakingData.get(`${userId}_${tokenId}`);
      if (!stakingInfo || !stakingInfo.isStaking) {
        return 0;
      }

      const tokenData = this.tokens.get(tokenId);
      if (!tokenData) {
        return 0;
      }

      const timeStaked = Date.now() - stakingInfo.lastClaimed.getTime();
      const daysStaked = timeStaked / (1000 * 60 * 60 * 24);
      const annualReward = (stakingInfo.amount * tokenData.stakingRewardRate) / 100;
      const rewards = (annualReward * daysStaked) / 365;

      return Math.max(0, rewards);
    } catch (error) {
      logger.error('Failed to calculate staking rewards:', error);
      return 0;
    }
  }
}

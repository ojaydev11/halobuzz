import { Schema, model, Document } from 'mongoose';
import { logger } from '@/config/logger';
import { getRedisClient } from '@/config/redis';
import { getSocketIO } from '@/config/socket';

// Interfaces
export interface DAOProposal {
  proposalId: string;
  title: string;
  description: string;
  category: 'platform' | 'creator' | 'economic' | 'technical' | 'community';
  type: 'governance' | 'funding' | 'feature' | 'policy';
  proposerId: string;
  status: 'draft' | 'active' | 'passed' | 'rejected' | 'executed' | 'expired';
  votingPower: {
    creatorCoins: boolean;
    halobuzzCoins: boolean;
    nftHolders: boolean;
    subscriptionTiers: boolean;
  };
  votingPeriod: number; // days
  executionDelay: number; // days
  quorum: number; // percentage
  supportThreshold: number; // percentage
  startDate: Date;
  endDate: Date;
  executionDate?: Date;
  votes: DAOVote[];
  totalVotes: number;
  supportVotes: number;
  oppositionVotes: number;
  abstainVotes: number;
  executionData?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface DAOVote {
  voteId: string;
  proposalId: string;
  userId: string;
  choice: 'support' | 'oppose' | 'abstain';
  votingPower: number;
  weight: number;
  timestamp: Date;
  metadata?: {
    coinHoldings?: { [coinId: string]: number };
    nftHoldings?: number;
    subscriptionTier?: string;
    halobuzzBalance?: number;
  };
}

export interface DAODelegation {
  delegationId: string;
  delegatorId: string;
  delegateId: string;
  coinId?: string; // If null, delegates all voting power
  amount: number;
  status: 'active' | 'revoked' | 'expired';
  createdAt: Date;
  expiresAt?: Date;
}

export interface DAOTreasury {
  treasuryId: string;
  name: string;
  description: string;
  totalValue: number;
  assets: {
    halobuzzCoins: number;
    usdc: number;
    creatorCoins: { [coinId: string]: number };
    nfts: string[];
  };
  transactions: TreasuryTransaction[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TreasuryTransaction {
  transactionId: string;
  treasuryId: string;
  type: 'deposit' | 'withdrawal' | 'transfer' | 'investment' | 'reward';
  amount: number;
  asset: string;
  from?: string;
  to?: string;
  proposalId?: string;
  description: string;
  timestamp: Date;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface DAOMember {
  userId: string;
  votingPower: number;
  delegations: {
    received: number;
    given: number;
  };
  proposals: {
    created: number;
    voted: number;
  };
  reputation: number;
  badges: string[];
  joinedAt: Date;
  lastActivity: Date;
}

export interface DAOAnalytics {
  totalMembers: number;
  activeVoters: number;
  totalProposals: number;
  passedProposals: number;
  treasuryValue: number;
  votingParticipation: number;
  topProposers: { userId: string; count: number }[];
  topVoters: { userId: string; votingPower: number }[];
  categoryBreakdown: { [category: string]: number };
  monthlyActivity: { month: string; proposals: number; votes: number }[];
}

// Mongoose Schemas
const DAOVoteSchema = new Schema<DAOVote>({
  voteId: { type: String, required: true, unique: true },
  proposalId: { type: String, required: true },
  userId: { type: String, required: true },
  choice: { type: String, enum: ['support', 'oppose', 'abstain'], required: true },
  votingPower: { type: Number, required: true },
  weight: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now },
  metadata: { type: Schema.Types.Mixed }
});

const DAOProposalSchema = new Schema<DAOProposal>({
  proposalId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, enum: ['platform', 'creator', 'economic', 'technical', 'community'], required: true },
  type: { type: String, enum: ['governance', 'funding', 'feature', 'policy'], required: true },
  proposerId: { type: String, required: true },
  status: { type: String, enum: ['draft', 'active', 'passed', 'rejected', 'executed', 'expired'], default: 'draft' },
  votingPower: {
    creatorCoins: { type: Boolean, default: true },
    halobuzzCoins: { type: Boolean, default: true },
    nftHolders: { type: Boolean, default: true },
    subscriptionTiers: { type: Boolean, default: true }
  },
  votingPeriod: { type: Number, default: 7 },
  executionDelay: { type: Number, default: 2 },
  quorum: { type: Number, default: 10 },
  supportThreshold: { type: Number, default: 50 },
  startDate: { type: Date },
  endDate: { type: Date },
  executionDate: { type: Date },
  votes: [DAOVoteSchema],
  totalVotes: { type: Number, default: 0 },
  supportVotes: { type: Number, default: 0 },
  oppositionVotes: { type: Number, default: 0 },
  abstainVotes: { type: Number, default: 0 },
  executionData: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const DAODelegationSchema = new Schema<DAODelegation>({
  delegationId: { type: String, required: true, unique: true },
  delegatorId: { type: String, required: true },
  delegateId: { type: String, required: true },
  coinId: { type: String },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['active', 'revoked', 'expired'], default: 'active' },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date }
});

const TreasuryTransactionSchema = new Schema<TreasuryTransaction>({
  transactionId: { type: String, required: true, unique: true },
  treasuryId: { type: String, required: true },
  type: { type: String, enum: ['deposit', 'withdrawal', 'transfer', 'investment', 'reward'], required: true },
  amount: { type: Number, required: true },
  asset: { type: String, required: true },
  from: { type: String },
  to: { type: String },
  proposalId: { type: String },
  description: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'confirmed', 'failed'], default: 'pending' }
});

const DAOTreasurySchema = new Schema<DAOTreasury>({
  treasuryId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  totalValue: { type: Number, default: 0 },
  assets: {
    halobuzzCoins: { type: Number, default: 0 },
    usdc: { type: Number, default: 0 },
    creatorCoins: { type: Schema.Types.Mixed, default: {} },
    nfts: [{ type: String }]
  },
  transactions: [TreasuryTransactionSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const DAOMemberSchema = new Schema<DAOMember>({
  userId: { type: String, required: true, unique: true },
  votingPower: { type: Number, default: 0 },
  delegations: {
    received: { type: Number, default: 0 },
    given: { type: Number, default: 0 }
  },
  proposals: {
    created: { type: Number, default: 0 },
    voted: { type: Number, default: 0 }
  },
  reputation: { type: Number, default: 0 },
  badges: [{ type: String }],
  joinedAt: { type: Date, default: Date.now },
  lastActivity: { type: Date, default: Date.now }
});

// Models
const DAOProposalModel = model<DAOProposal>('DAOProposal', DAOProposalSchema);
const DAODelegationModel = model<DAODelegation>('DAODelegation', DAODelegationSchema);
const DAOTreasuryModel = model<DAOTreasury>('DAOTreasury', DAOTreasurySchema);
const DAOMemberModel = model<DAOMember>('DAOMember', DAOMemberSchema);

export class DAOGovernanceService {
  private static instance: DAOGovernanceService;

  public static getInstance(): DAOGovernanceService {
    if (!DAOGovernanceService.instance) {
      DAOGovernanceService.instance = new DAOGovernanceService();
    }
    return DAOGovernanceService.instance;
  }

  /**
   * Create a new DAO proposal
   */
  async createProposal(
    proposerId: string,
    title: string,
    description: string,
    category: 'platform' | 'creator' | 'economic' | 'technical' | 'community',
    type: 'governance' | 'funding' | 'feature' | 'policy',
    options: {
      votingPeriod?: number;
      executionDelay?: number;
      quorum?: number;
      supportThreshold?: number;
      votingPower?: any;
    } = {}
  ): Promise<DAOProposal> {
    try {
      const proposalId = this.generateProposalId();
      
      const proposal: DAOProposal = {
        proposalId,
        title,
        description,
        category,
        type,
        proposerId,
        status: 'draft',
        votingPower: {
          creatorCoins: options.votingPower?.creatorCoins ?? true,
          halobuzzCoins: options.votingPower?.halobuzzCoins ?? true,
          nftHolders: options.votingPower?.nftHolders ?? true,
          subscriptionTiers: options.votingPower?.subscriptionTiers ?? true
        },
        votingPeriod: options.votingPeriod || 7,
        executionDelay: options.executionDelay || 2,
        quorum: options.quorum || 10,
        supportThreshold: options.supportThreshold || 50,
        startDate: new Date(), // Will be updated when voting starts
        endDate: new Date(), // Will be updated when voting starts
        votes: [],
        totalVotes: 0,
        supportVotes: 0,
        oppositionVotes: 0,
        abstainVotes: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const createdProposal = await DAOProposalModel.create(proposal);

      // Update member stats
      await this.updateMemberStats(proposerId, 'proposal_created');

      // Emit real-time event
      const io = getSocketIO();
      if (io) {
        io.emit('dao_proposal_created', {
          proposalId,
          proposerId,
          title,
          category,
          type
        });
      }

      logger.info('DAO proposal created', { proposalId, proposerId, category, type });
      return createdProposal;
    } catch (error) {
      logger.error('Error creating DAO proposal', { error, proposerId, category });
      throw error;
    }
  }

  /**
   * Start voting on a proposal
   */
  async startVoting(proposalId: string, proposerId: string): Promise<DAOProposal> {
    try {
      const proposal = await DAOProposalModel.findOne({ proposalId });
      if (!proposal) {
        throw new Error('Proposal not found');
      }

      if (proposal.proposerId !== proposerId) {
        throw new Error('Only the proposer can start voting');
      }

      if (proposal.status !== 'draft') {
        throw new Error('Proposal is not in draft status');
      }

      const startDate = new Date();
      const endDate = new Date(Date.now() + proposal.votingPeriod * 24 * 60 * 60 * 1000);

      proposal.status = 'active';
      proposal.startDate = startDate;
      proposal.endDate = endDate;
      proposal.updatedAt = new Date();
      await DAOProposalModel.findByIdAndUpdate((proposal as any)._id, proposal);

      // Cache active proposal
      const redisClient = getRedisClient();
      await redisClient.setEx(
        `dao_proposal:${proposalId}`,
        proposal.votingPeriod * 24 * 60 * 60,
        JSON.stringify(proposal)
      );

      // Emit real-time event
      const io = getSocketIO();
      if (io) {
        io.emit('dao_voting_started', {
          proposalId,
          title: proposal.title,
          endDate: proposal.endDate
        });
      }

      logger.info('DAO voting started', { proposalId, endDate });
      return proposal;
    } catch (error) {
      logger.error('Error starting DAO voting', { error, proposalId, proposerId });
      throw error;
    }
  }

  /**
   * Cast a vote on a proposal
   */
  async castVote(
    proposalId: string,
    userId: string,
    choice: 'support' | 'oppose' | 'abstain'
  ): Promise<DAOVote> {
    try {
      const proposal = await this.getProposal(proposalId);
      if (!proposal) {
        throw new Error('Proposal not found');
      }

      if (proposal.status !== 'active') {
        throw new Error('Proposal is not active for voting');
      }

      if (proposal.endDate < new Date()) {
        throw new Error('Voting period has ended');
      }

      // Check if user already voted
      const existingVote = proposal.votes.find(vote => vote.userId === userId);
      if (existingVote) {
        throw new Error('User has already voted on this proposal');
      }

      // Calculate user's voting power
      const votingPower = await this.calculateVotingPower(userId, proposal);
      if (votingPower <= 0) {
        throw new Error('User has no voting power for this proposal');
      }

      const voteId = this.generateVoteId();
      const vote: DAOVote = {
        voteId,
        proposalId,
        userId,
        choice,
        votingPower,
        weight: votingPower,
        timestamp: new Date(),
        metadata: await this.getVotingMetadata(userId, proposal)
      };

      // Add vote to proposal
      proposal.votes.push(vote);
      proposal.totalVotes += 1;

      // Update vote counts
      switch (choice) {
        case 'support':
          proposal.supportVotes += 1;
          break;
        case 'oppose':
          proposal.oppositionVotes += 1;
          break;
        case 'abstain':
          proposal.abstainVotes += 1;
          break;
      }

      proposal.updatedAt = new Date();
      await DAOProposalModel.findByIdAndUpdate((proposal as any)._id, proposal);

      // Update member stats
      await this.updateMemberStats(userId, 'vote_cast');

      // Emit real-time event
      const io = getSocketIO();
      if (io) {
        io.emit('dao_vote_cast', {
          proposalId,
          userId,
          choice,
          votingPower
        });
      }

      logger.info('DAO vote cast', { proposalId, userId, choice, votingPower });
      return vote;
    } catch (error) {
      logger.error('Error casting DAO vote', { error, proposalId, userId, choice });
      throw error;
    }
  }

  /**
   * Execute a passed proposal
   */
  async executeProposal(proposalId: string, executorId: string): Promise<DAOProposal> {
    try {
      const proposal = await this.getProposal(proposalId);
      if (!proposal) {
        throw new Error('Proposal not found');
      }

      if (proposal.status !== 'passed') {
        throw new Error('Proposal has not passed');
      }

      if (!proposal.executionDate || proposal.executionDate > new Date()) {
        throw new Error('Execution delay period has not ended');
      }

      // Execute proposal based on type
      await this.executeProposalAction(proposal);

      proposal.status = 'executed';
      proposal.updatedAt = new Date();
      await DAOProposalModel.findByIdAndUpdate((proposal as any)._id, proposal);

      // Emit real-time event
      const io = getSocketIO();
      if (io) {
        io.emit('dao_proposal_executed', {
          proposalId,
          title: proposal.title,
          executorId
        });
      }

      logger.info('DAO proposal executed', { proposalId, executorId });
      return proposal;
    } catch (error) {
      logger.error('Error executing DAO proposal', { error, proposalId, executorId });
      throw error;
    }
  }

  /**
   * Delegate voting power
   */
  async delegateVotingPower(
    delegatorId: string,
    delegateId: string,
    amount: number,
    coinId?: string,
    expiresAt?: Date
  ): Promise<DAODelegation> {
    try {
      if (delegatorId === delegateId) {
        throw new Error('Cannot delegate to yourself');
      }

      // Check if delegator has sufficient voting power
      const delegatorPower = await this.getUserVotingPower(delegatorId, coinId);
      if (delegatorPower < amount) {
        throw new Error('Insufficient voting power to delegate');
      }

      const delegationId = this.generateDelegationId();
      const delegation: DAODelegation = {
        delegationId,
        delegatorId,
        delegateId,
        coinId,
        amount,
        status: 'active',
        createdAt: new Date(),
        expiresAt
      };

      const createdDelegation = await DAODelegationModel.create(delegation);

      // Update member stats
      await this.updateMemberStats(delegatorId, 'delegation_given');
      await this.updateMemberStats(delegateId, 'delegation_received');

      // Emit real-time event
      const io = getSocketIO();
      if (io) {
        io.emit('dao_delegation_created', {
          delegationId,
          delegatorId,
          delegateId,
          amount,
          coinId
        });
      }

      logger.info('DAO delegation created', { delegationId, delegatorId, delegateId, amount });
      return createdDelegation;
    } catch (error) {
      logger.error('Error creating DAO delegation', { error, delegatorId, delegateId, amount });
      throw error;
    }
  }

  /**
   * Get DAO treasury
   */
  async getTreasury(treasuryId: string = 'main'): Promise<DAOTreasury | null> {
    try {
      const treasury = await DAOTreasuryModel.findOne({ treasuryId });
      return treasury;
    } catch (error) {
      logger.error('Error getting DAO treasury', { error, treasuryId });
      throw error;
    }
  }

  /**
   * Get DAO analytics
   */
  async getDAOAnalytics(): Promise<DAOAnalytics> {
    try {
      const totalMembers = await DAOMemberModel.countDocuments();
      const activeVoters = await DAOMemberModel.countDocuments({ 'proposals.voted': { $gt: 0 } });
      const totalProposals = await DAOProposalModel.countDocuments();
      const passedProposals = await DAOProposalModel.countDocuments({ status: 'passed' });
      
      const treasury = await this.getTreasury();
      const treasuryValue = treasury?.totalValue || 0;

      const topProposers = await DAOProposalModel.aggregate([
        { $group: { _id: '$proposerId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { userId: '$_id', count: 1, _id: 0 } }
      ]);

      const topVoters = await DAOMemberModel.find()
        .sort({ votingPower: -1 })
        .limit(10)
        .select('userId votingPower');

      const categoryBreakdown = await DAOProposalModel.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $project: { category: '$_id', count: 1, _id: 0 } }
      ]);

      const analytics: DAOAnalytics = {
        totalMembers,
        activeVoters,
        totalProposals,
        passedProposals,
        treasuryValue,
        votingParticipation: totalMembers > 0 ? (activeVoters / totalMembers) * 100 : 0,
        topProposers,
        topVoters: topVoters.map(voter => ({ userId: voter.userId, votingPower: voter.votingPower })),
        categoryBreakdown: categoryBreakdown.reduce((acc, item) => {
          acc[item.category] = item.count;
          return acc;
        }, {} as any),
        monthlyActivity: [] // Would need time-based aggregation
      };

      return analytics;
    } catch (error) {
      logger.error('Error getting DAO analytics', { error });
      throw error;
    }
  }

  /**
   * Get active proposals
   */
  async getActiveProposals(): Promise<DAOProposal[]> {
    try {
      const proposals = await DAOProposalModel.find({
        status: 'active',
        endDate: { $gt: new Date() }
      }).sort({ createdAt: -1 });

      return proposals;
    } catch (error) {
      logger.error('Error getting active proposals', { error });
      throw error;
    }
  }

  // Helper methods
  private async getProposal(proposalId: string): Promise<DAOProposal | null> {
    try {
      // Try cache first
      const redisClient = getRedisClient();
      const cached = await redisClient.get(`dao_proposal:${proposalId}`);
      if (cached) {
        return JSON.parse(cached);
      }

      // Fallback to database
      const proposal = await DAOProposalModel.findOne({ proposalId });
      if (proposal) {
        await redisClient.setEx(`dao_proposal:${proposalId}`, 3600, JSON.stringify(proposal));
      }

      return proposal;
    } catch (error) {
      logger.error('Error getting DAO proposal', { error, proposalId });
      throw error;
    }
  }

  private async calculateVotingPower(userId: string, proposal: DAOProposal): Promise<number> {
    let totalPower = 0;

    // Creator coin voting power
    if (proposal.votingPower.creatorCoins) {
      // Would calculate based on creator coin holdings
      totalPower += await this.getCreatorCoinVotingPower(userId);
    }

    // HALOBUZZ coin voting power
    if (proposal.votingPower.halobuzzCoins) {
      totalPower += await this.getHalobuzzCoinVotingPower(userId);
    }

    // NFT holder voting power
    if (proposal.votingPower.nftHolders) {
      totalPower += await this.getNFTHolderVotingPower(userId);
    }

    // Subscription tier voting power
    if (proposal.votingPower.subscriptionTiers) {
      totalPower += await this.getSubscriptionVotingPower(userId);
    }

    // Add delegated voting power
    totalPower += await this.getDelegatedVotingPower(userId);

    return totalPower;
  }

  private async getVotingMetadata(userId: string, proposal: DAOProposal): Promise<any> {
    return {
      coinHoldings: await this.getUserCoinHoldings(userId),
      nftHoldings: await this.getUserNFTHoldings(userId),
      subscriptionTier: await this.getUserSubscriptionTier(userId),
      halobuzzBalance: await this.getUserHalobuzzBalance(userId)
    };
  }

  private async executeProposalAction(proposal: DAOProposal): Promise<void> {
    // Execute proposal based on type and execution data
    switch (proposal.type) {
      case 'funding':
        await this.executeFundingProposal(proposal);
        break;
      case 'feature':
        await this.executeFeatureProposal(proposal);
        break;
      case 'policy':
        await this.executePolicyProposal(proposal);
        break;
      case 'governance':
        await this.executeGovernanceProposal(proposal);
        break;
    }
  }

  private async updateMemberStats(userId: string, action: string): Promise<void> {
    let member = await DAOMemberModel.findOne({ userId });
    
    if (!member) {
      member = new DAOMemberModel({
        userId,
        votingPower: 0,
        delegations: { received: 0, given: 0 },
        proposals: { created: 0, voted: 0 },
        reputation: 0,
        badges: [],
        joinedAt: new Date(),
        lastActivity: new Date()
      });
    }

    switch (action) {
      case 'proposal_created':
        member.proposals.created += 1;
        member.reputation += 10;
        break;
      case 'vote_cast':
        member.proposals.voted += 1;
        member.reputation += 5;
        break;
      case 'delegation_given':
        member.delegations.given += 1;
        break;
      case 'delegation_received':
        member.delegations.received += 1;
        break;
    }

    member.lastActivity = new Date();
    await DAOMemberModel.findByIdAndUpdate((member as any)._id, member);
  }

  // Mock methods for voting power calculations
  private async getCreatorCoinVotingPower(userId: string): Promise<number> {
    return 100; // Mock value
  }

  private async getHalobuzzCoinVotingPower(userId: string): Promise<number> {
    return 50; // Mock value
  }

  private async getNFTHolderVotingPower(userId: string): Promise<number> {
    return 25; // Mock value
  }

  private async getSubscriptionVotingPower(userId: string): Promise<number> {
    return 10; // Mock value
  }

  private async getDelegatedVotingPower(userId: string): Promise<number> {
    const delegations = await DAODelegationModel.find({ delegateId: userId, status: 'active' });
    return delegations.reduce((sum, del) => sum + del.amount, 0);
  }

  private async getUserVotingPower(userId: string, coinId?: string): Promise<number> {
    return 100; // Mock value
  }

  private async getUserCoinHoldings(userId: string): Promise<{ [coinId: string]: number }> {
    return {}; // Mock value
  }

  private async getUserNFTHoldings(userId: string): Promise<number> {
    return 0; // Mock value
  }

  private async getUserSubscriptionTier(userId: string): Promise<string> {
    return 'basic'; // Mock value
  }

  private async getUserHalobuzzBalance(userId: string): Promise<number> {
    return 1000; // Mock value
  }

  // Mock execution methods
  private async executeFundingProposal(proposal: DAOProposal): Promise<void> {
    // Execute funding proposal
  }

  private async executeFeatureProposal(proposal: DAOProposal): Promise<void> {
    // Execute feature proposal
  }

  private async executePolicyProposal(proposal: DAOProposal): Promise<void> {
    // Execute policy proposal
  }

  private async executeGovernanceProposal(proposal: DAOProposal): Promise<void> {
    // Execute governance proposal
  }

  private generateProposalId(): string {
    return `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateVoteId(): string {
    return `vote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateDelegationId(): string {
    return `del_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default DAOGovernanceService;

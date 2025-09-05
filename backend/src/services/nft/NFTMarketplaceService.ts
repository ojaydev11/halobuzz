import logger from '../../utils/logger';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { Transaction } from '../../models/Transaction';

export interface CreatorNFT {
  id: string;
  creatorId: string;
  contentHash: string;
  metadata: {
    title: string;
    description: string;
    properties: any;
    unlockableContent?: string;
    imageUrl: string;
    animationUrl?: string;
    externalUrl?: string;
    attributes: Array<{
      trait_type: string;
      value: string | number;
      display_type?: string;
    }>;
  };
  pricing: {
    initialPrice: number;
    currentPrice: number;
    royaltyPercentage: number;
    currency: 'ETH' | 'MATIC' | 'HALOBUZZ_COIN' | 'USDC';
    auctionEndTime?: Date;
    reservePrice?: number;
  };
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  status: 'draft' | 'minted' | 'listed' | 'sold' | 'auction' | 'delisted';
  blockchain: {
    contractAddress?: string;
    tokenId?: string;
    transactionHash?: string;
    blockNumber?: number;
    gasUsed?: number;
  };
  ownership: {
    currentOwner: string;
    ownershipHistory: Array<{
      owner: string;
      timestamp: Date;
      transactionHash: string;
      price?: number;
    }>;
  };
  analytics: {
    views: number;
    likes: number;
    shares: number;
    bids: number;
    watchers: number;
    lastActivity: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  type: 'mint' | 'sale' | 'transfer' | 'auction_bid' | 'royalty';
  nftId: string;
  fromUserId?: string;
  toUserId: string;
  amount: number;
  currency: string;
  transactionHash?: string;
  status: 'pending' | 'confirmed' | 'failed';
  gasFee?: number;
  platformFee?: number;
  creatorRoyalty?: number;
  metadata: any;
  createdAt: Date;
}

export interface MarketplaceStats {
  totalNFTs: number;
  totalVolume: number;
  totalSales: number;
  averagePrice: number;
  topCreators: Array<{
    creatorId: string;
    username: string;
    totalSales: number;
    totalVolume: number;
    nftCount: number;
  }>;
  trendingCollections: Array<{
    collectionId: string;
    name: string;
    volume24h: number;
    sales24h: number;
    floorPrice: number;
  }>;
  priceHistory: Array<{
    date: string;
    averagePrice: number;
    volume: number;
    sales: number;
  }>;
}

export interface AuctionData {
  nftId: string;
  startPrice: number;
  reservePrice: number;
  endTime: Date;
  currentBid?: {
    amount: number;
    bidderId: string;
    timestamp: Date;
  };
  bidHistory: Array<{
    amount: number;
    bidderId: string;
    timestamp: Date;
  }>;
  status: 'active' | 'ended' | 'cancelled';
}

// NFT Schema
const nftSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contentHash: { type: String, required: true },
  metadata: {
    title: { type: String, required: true },
    description: { type: String, required: true },
    properties: { type: mongoose.Schema.Types.Mixed },
    unlockableContent: { type: String },
    imageUrl: { type: String, required: true },
    animationUrl: { type: String },
    externalUrl: { type: String },
    attributes: [{
      trait_type: { type: String, required: true },
      value: { type: mongoose.Schema.Types.Mixed, required: true },
      display_type: { type: String }
    }]
  },
  pricing: {
    initialPrice: { type: Number, required: true },
    currentPrice: { type: Number, required: true },
    royaltyPercentage: { type: Number, default: 10 },
    currency: { type: String, enum: ['ETH', 'MATIC', 'HALOBUZZ_COIN', 'USDC'], required: true },
    auctionEndTime: { type: Date },
    reservePrice: { type: Number }
  },
  rarity: { type: String, enum: ['common', 'rare', 'epic', 'legendary'], required: true },
  status: { type: String, enum: ['draft', 'minted', 'listed', 'sold', 'auction', 'delisted'], default: 'draft' },
  blockchain: {
    contractAddress: { type: String },
    tokenId: { type: String },
    transactionHash: { type: String },
    blockNumber: { type: Number },
    gasUsed: { type: Number }
  },
  ownership: {
    currentOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ownershipHistory: [{
      owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      timestamp: { type: Date, required: true },
      transactionHash: { type: String, required: true },
      price: { type: Number }
    }]
  },
  analytics: {
    views: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    bids: { type: Number, default: 0 },
    watchers: { type: Number, default: 0 },
    lastActivity: { type: Date, default: Date.now }
  }
}, {
  timestamps: true
});

// Transaction Schema
const transactionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  type: { type: String, enum: ['mint', 'sale', 'transfer', 'auction_bid', 'royalty'], required: true },
  nftId: { type: mongoose.Schema.Types.ObjectId, ref: 'NFT', required: true },
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  toUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  transactionHash: { type: String },
  status: { type: String, enum: ['pending', 'confirmed', 'failed'], default: 'pending' },
  gasFee: { type: Number },
  platformFee: { type: Number },
  creatorRoyalty: { type: Number },
  metadata: { type: mongoose.Schema.Types.Mixed }
}, {
  timestamps: true
});

// Auction Schema
const auctionSchema = new mongoose.Schema({
  nftId: { type: mongoose.Schema.Types.ObjectId, ref: 'NFT', required: true, unique: true },
  startPrice: { type: Number, required: true },
  reservePrice: { type: Number, required: true },
  endTime: { type: Date, required: true },
  currentBid: {
    amount: { type: Number },
    bidderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date }
  },
  bidHistory: [{
    amount: { type: Number, required: true },
    bidderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    timestamp: { type: Date, required: true }
  }],
  status: { type: String, enum: ['active', 'ended', 'cancelled'], default: 'active' }
}, {
  timestamps: true
});

const NFTModel = mongoose.model('NFT', nftSchema);
// Using imported Transaction model instead of creating duplicate
const AuctionModel = mongoose.model('Auction', auctionSchema);

export class NFTMarketplaceService {
  private static instance: NFTMarketplaceService;
  private activeAuctions: Map<string, AuctionData> = new Map();

  private constructor() {
    this.initializeAuctionMonitoring();
    logger.info('NFTMarketplaceService initialized');
  }

  static getInstance(): NFTMarketplaceService {
    if (!NFTMarketplaceService.instance) {
      NFTMarketplaceService.instance = new NFTMarketplaceService();
    }
    return NFTMarketplaceService.instance;
  }

  /**
   * Mint NFTs from creator content
   */
  async mintCreatorNFT(creatorId: string, content: any, metadata: any): Promise<CreatorNFT> {
    try {
      // Generate unique NFT ID
      const nftId = this.generateNFTId();
      
      // Calculate content hash
      const contentHash = this.calculateContentHash(content);
      
      // Determine rarity based on content analysis
      const rarity = await this.determineRarity(content, metadata);
      
      // Create NFT document
      const nftData = {
        id: nftId,
        creatorId,
        contentHash,
        metadata: {
          title: metadata.title,
          description: metadata.description,
          properties: metadata.properties || {},
          unlockableContent: metadata.unlockableContent,
          imageUrl: content.imageUrl || content.thumbnail,
          animationUrl: content.animationUrl,
          externalUrl: content.externalUrl,
          attributes: metadata.attributes || []
        },
        pricing: {
          initialPrice: metadata.initialPrice || 0,
          currentPrice: metadata.initialPrice || 0,
          royaltyPercentage: metadata.royaltyPercentage || 10,
          currency: metadata.currency || 'HALOBUZZ_COIN'
        },
        rarity,
        status: 'draft',
        ownership: {
          currentOwner: creatorId,
          ownershipHistory: [{
            owner: creatorId,
            timestamp: new Date(),
            transactionHash: 'mint',
            price: metadata.initialPrice || 0
          }]
        },
        analytics: {
          views: 0,
          likes: 0,
          shares: 0,
          bids: 0,
          watchers: 0,
          lastActivity: new Date()
        }
      };

      const nft = new NFTModel(nftData);
      await nft.save();

      // Create mint transaction
      await this.createTransaction({
        type: 'mint',
        nftId: nft._id,
        toUserId: creatorId,
        amount: 0,
        currency: metadata.currency || 'HALOBUZZ_COIN',
        status: 'confirmed',
        metadata: { contentHash, rarity }
      });

      logger.info('NFT minted successfully', {
        nftId,
        creatorId,
        rarity,
        initialPrice: metadata.initialPrice
      });

      return this.mapToCreatorNFT(nft);
    } catch (error) {
      logger.error('Error minting creator NFT:', error);
      throw error;
    }
  }

  /**
   * Handle NFT purchases and transfers
   */
  async purchaseNFT(nftId: string, buyerId: string): Promise<Transaction> {
    try {
      const nft = await NFTModel.findOne({ id: nftId });
      if (!nft) {
        throw new Error(`NFT ${nftId} not found`);
      }

      if (nft.status !== 'listed' && nft.status !== 'auction') {
        throw new Error(`NFT ${nftId} is not available for purchase`);
      }

      const sellerId = nft.ownership.currentOwner;
      const purchasePrice = nft.pricing.currentPrice;

      // Calculate fees
      const platformFee = purchasePrice * 0.025; // 2.5% platform fee
      const creatorRoyalty = purchasePrice * (nft.pricing.royaltyPercentage / 100);
      const sellerAmount = purchasePrice - platformFee - creatorRoyalty;

      // Create purchase transaction
      const transaction = await this.createTransaction({
        type: 'sale',
        nftId: nft._id,
        fromUserId: sellerId,
        toUserId: buyerId,
        amount: purchasePrice,
        currency: nft.pricing.currency,
        status: 'pending',
        platformFee,
        creatorRoyalty,
        metadata: { sellerAmount }
      });

      // Update NFT ownership
      nft.ownership.currentOwner = new mongoose.Types.ObjectId(buyerId);
      nft.ownership.ownershipHistory.push({
        owner: buyerId,
        timestamp: new Date(),
        transactionHash: transaction.id,
        price: purchasePrice
      });
      nft.status = 'sold';
      nft.analytics.lastActivity = new Date();
      await nft.save();

      // Distribute royalties
      await this.distributeRoyalties(nftId, creatorRoyalty, nft.creatorId.toString());

      // Update transaction status
      transaction.status = 'confirmed';
      await transaction.save();

      logger.info('NFT purchased successfully', {
        nftId,
        buyerId,
        sellerId,
        purchasePrice,
        platformFee,
        creatorRoyalty
      });

      return this.mapToTransaction(transaction);
    } catch (error) {
      logger.error('Error purchasing NFT:', error);
      throw error;
    }
  }

  /**
   * Creator royalty distribution
   */
  async distributeRoyalties(nftId: string, saleAmount: number, creatorId: string): Promise<void> {
    try {
      // Create royalty transaction
      await this.createTransaction({
        type: 'royalty',
        nftId,
        toUserId: creatorId,
        amount: saleAmount,
        currency: 'HALOBUZZ_COIN',
        status: 'confirmed',
        metadata: { nftId, saleAmount }
      });

      // Update creator's earnings (would integrate with wallet service)
      logger.info('Royalties distributed', {
        nftId,
        creatorId,
        royaltyAmount: saleAmount
      });
    } catch (error) {
      logger.error('Error distributing royalties:', error);
      throw error;
    }
  }

  /**
   * NFT marketplace analytics
   */
  async getNFTMarketplaceStats(): Promise<MarketplaceStats> {
    try {
      const totalNFTs = await NFTModel.countDocuments();
      const soldNFTs = await NFTModel.find({ status: 'sold' });
      
      const totalVolume = soldNFTs.reduce((sum, nft) => sum + nft.pricing.currentPrice, 0);
      const totalSales = soldNFTs.length;
      const averagePrice = totalSales > 0 ? totalVolume / totalSales : 0;

      // Get top creators
      const creatorStats = await NFTModel.aggregate([
        { $match: { status: 'sold' } },
        {
          $group: {
            _id: '$creatorId',
            totalSales: { $sum: 1 },
            totalVolume: { $sum: '$pricing.currentPrice' },
            nftCount: { $sum: 1 }
          }
        },
        { $sort: { totalVolume: -1 } },
        { $limit: 10 }
      ]);

      const topCreators = await Promise.all(
        creatorStats.map(async (stat) => {
          const user = await mongoose.model('User').findById(stat._id);
          return {
            creatorId: stat._id,
            username: user?.username || 'Unknown',
            totalSales: stat.totalSales,
            totalVolume: stat.totalVolume,
            nftCount: stat.nftCount
          };
        })
      );

      // Get trending collections (mock implementation)
      const trendingCollections = [
        {
          collectionId: 'collection_1',
          name: 'Digital Art Collection',
          volume24h: 50000,
          sales24h: 25,
          floorPrice: 2000
        }
      ];

      // Get price history (last 30 days)
      const priceHistory = await this.getPriceHistory(30);

      const stats: MarketplaceStats = {
        totalNFTs,
        totalVolume,
        totalSales,
        averagePrice,
        topCreators,
        trendingCollections,
        priceHistory
      };

      logger.info('Marketplace stats generated', {
        totalNFTs,
        totalVolume,
        totalSales,
        averagePrice
      });

      return stats;
    } catch (error) {
      logger.error('Error getting marketplace stats:', error);
      throw error;
    }
  }

  /**
   * Create auction for NFT
   */
  async createAuction(nftId: string, startPrice: number, reservePrice: number, durationHours: number): Promise<AuctionData> {
    try {
      const nft = await NFTModel.findOne({ id: nftId });
      if (!nft) {
        throw new Error(`NFT ${nftId} not found`);
      }

      if (nft.status !== 'listed') {
        throw new Error(`NFT ${nftId} is not available for auction`);
      }

      const endTime = new Date(Date.now() + durationHours * 60 * 60 * 1000);

      const auctionData = {
        nftId: nft._id,
        startPrice,
        reservePrice,
        endTime,
        bidHistory: [],
        status: 'active' as const
      };

      const auction = new AuctionModel(auctionData);
      await auction.save();

      // Update NFT status
      nft.status = 'auction';
      nft.pricing.currentPrice = startPrice;
      nft.pricing.auctionEndTime = endTime;
      nft.pricing.reservePrice = reservePrice;
      await nft.save();

      const auctionInfo: AuctionData = {
        nftId,
        startPrice,
        reservePrice,
        endTime,
        bidHistory: [],
        status: 'active'
      };

      this.activeAuctions.set(nftId, auctionInfo);

      logger.info('Auction created', {
        nftId,
        startPrice,
        reservePrice,
        endTime,
        durationHours
      });

      return auctionInfo;
    } catch (error) {
      logger.error('Error creating auction:', error);
      throw error;
    }
  }

  /**
   * Place bid on auction
   */
  async placeBid(nftId: string, bidderId: string, amount: number): Promise<boolean> {
    try {
      const auction = await AuctionModel.findOne({ nftId: await this.getNFTObjectId(nftId) });
      if (!auction) {
        throw new Error(`Auction for NFT ${nftId} not found`);
      }

      if (auction.status !== 'active') {
        throw new Error(`Auction for NFT ${nftId} is not active`);
      }

      if (new Date() > auction.endTime) {
        throw new Error(`Auction for NFT ${nftId} has ended`);
      }

      const currentBid = auction.currentBid?.amount || auction.startPrice;
      if (amount <= currentBid) {
        throw new Error(`Bid amount must be higher than current bid of ${currentBid}`);
      }

      // Add bid to history
      auction.bidHistory.push({
        amount,
        bidderId,
        timestamp: new Date()
      });

      // Update current bid
      auction.currentBid = {
        amount,
        bidderId: new mongoose.Types.ObjectId(bidderId),
        timestamp: new Date()
      };

      await auction.save();

      // Update NFT current price
      const nft = await NFTModel.findOne({ id: nftId });
      if (nft) {
        nft.pricing.currentPrice = amount;
        nft.analytics.bids += 1;
        nft.analytics.lastActivity = new Date();
        await nft.save();
      }

      logger.info('Bid placed successfully', {
        nftId,
        bidderId,
        amount,
        currentBid: amount
      });

      return true;
    } catch (error) {
      logger.error('Error placing bid:', error);
      throw error;
    }
  }

  /**
   * Get NFT details
   */
  async getNFTDetails(nftId: string): Promise<CreatorNFT | null> {
    try {
      const nft = await NFTModel.findOne({ id: nftId });
      if (!nft) {
        return null;
      }

      return this.mapToCreatorNFT(nft);
    } catch (error) {
      logger.error('Error getting NFT details:', error);
      throw error;
    }
  }

  /**
   * List NFT for sale
   */
  async listNFT(nftId: string, price: number): Promise<boolean> {
    try {
      const nft = await NFTModel.findOne({ id: nftId });
      if (!nft) {
        throw new Error(`NFT ${nftId} not found`);
      }

      if (nft.status !== 'minted' && nft.status !== 'delisted') {
        throw new Error(`NFT ${nftId} cannot be listed in current status: ${nft.status}`);
      }

      nft.status = 'listed';
      nft.pricing.currentPrice = price;
      nft.analytics.lastActivity = new Date();
      await nft.save();

      logger.info('NFT listed for sale', {
        nftId,
        price,
        owner: nft.ownership.currentOwner
      });

      return true;
    } catch (error) {
      logger.error('Error listing NFT:', error);
      throw error;
    }
  }

  // Private helper methods
  private generateNFTId(): string {
    return `nft_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private calculateContentHash(content: any): string {
    const contentString = JSON.stringify(content);
    return crypto.createHash('sha256').update(contentString).digest('hex');
  }

  private async determineRarity(content: any, metadata: any): Promise<'common' | 'rare' | 'epic' | 'legendary'> {
    // Mock rarity determination - in real implementation, use AI analysis
    const rarityFactors = {
      contentQuality: Math.random(),
      uniqueness: Math.random(),
      creatorPopularity: Math.random(),
      metadataCompleteness: Object.keys(metadata).length / 10
    };

    const rarityScore = Object.values(rarityFactors).reduce((sum, factor) => sum + factor, 0) / 4;

    if (rarityScore >= 0.9) return 'legendary';
    if (rarityScore >= 0.7) return 'epic';
    if (rarityScore >= 0.4) return 'rare';
    return 'common';
  }

  private async createTransaction(transactionData: any): Promise<any> {
    const transactionId = `tx_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    
    const transaction = new Transaction({
      id: transactionId,
      ...transactionData
    });

    await transaction.save();
    return transaction;
  }

  private async getPriceHistory(days: number): Promise<Array<{ date: string; averagePrice: number; volume: number; sales: number }>> {
    // Mock price history - in real implementation, query actual transaction data
    const history = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      history.push({
        date: date.toISOString().split('T')[0],
        averagePrice: 1000 + Math.random() * 2000,
        volume: Math.random() * 100000,
        sales: Math.floor(Math.random() * 50)
      });
    }

    return history;
  }

  private async getNFTObjectId(nftId: string): Promise<string> {
    const nft = await NFTModel.findOne({ id: nftId });
    return nft?._id?.toString() || nftId;
  }

  private mapToCreatorNFT(nft: any): CreatorNFT {
    return {
      id: nft.id,
      creatorId: nft.creatorId,
      contentHash: nft.contentHash,
      metadata: nft.metadata,
      pricing: nft.pricing,
      rarity: nft.rarity,
      status: nft.status,
      blockchain: nft.blockchain,
      ownership: nft.ownership,
      analytics: nft.analytics,
      createdAt: nft.createdAt,
      updatedAt: nft.updatedAt
    };
  }

  private mapToTransaction(transaction: any): Transaction {
    return {
      id: transaction.id,
      type: transaction.type,
      nftId: transaction.nftId,
      fromUserId: transaction.fromUserId,
      toUserId: transaction.toUserId,
      amount: transaction.amount,
      currency: transaction.currency,
      transactionHash: transaction.transactionHash,
      status: transaction.status,
      gasFee: transaction.gasFee,
      platformFee: transaction.platformFee,
      creatorRoyalty: transaction.creatorRoyalty,
      metadata: transaction.metadata,
      createdAt: transaction.createdAt
    };
  }

  private initializeAuctionMonitoring(): void {
    // Monitor active auctions every minute
    setInterval(async () => {
      try {
        const now = new Date();
        const expiredAuctions = await AuctionModel.find({
          status: 'active',
          endTime: { $lte: now }
        });

        for (const auction of expiredAuctions) {
          await this.endAuction(auction.nftId.toString());
        }
      } catch (error) {
        logger.error('Error monitoring auctions:', error);
      }
    }, 60000); // Check every minute
  }

  private async endAuction(nftId: string): Promise<void> {
    try {
      const auction = await AuctionModel.findOne({ nftId });
      if (!auction) return;

      const nft = await NFTModel.findById(nftId);
      if (!nft) return;

      if (auction.currentBid && auction.currentBid.amount >= auction.reservePrice) {
        // Auction successful - transfer to highest bidder
        await this.purchaseNFT(nft.id, auction.currentBid.bidderId.toString());
        auction.status = 'ended';
      } else {
        // Auction failed - return to owner
        nft.status = 'listed';
        nft.pricing.currentPrice = nft.pricing.initialPrice;
        await nft.save();
        auction.status = 'ended';
      }

      await auction.save();
      this.activeAuctions.delete(nft.id);

      logger.info('Auction ended', {
        nftId: nft.id,
        status: auction.status,
        finalBid: auction.currentBid?.amount
      });
    } catch (error) {
      logger.error('Error ending auction:', error);
    }
  }
}

export default NFTMarketplaceService;

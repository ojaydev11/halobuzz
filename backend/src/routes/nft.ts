import express, { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import { socialLimiter } from '../middleware/security';
import NFTMarketplaceService from '../services/nft/NFTMarketplaceService';
import { logger } from '../config/logger';

const router = express.Router();
const nftService = NFTMarketplaceService.getInstance();

// Apply middleware
router.use(authMiddleware);
router.use(socialLimiter);

/**
 * @route POST /api/nft/mint
 * @desc Mint a new NFT from creator content
 * @access Private
 */
router.post('/mint', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { content, metadata } = req.body;
    const creatorId = req.user.id;

    if (!content || !metadata) {
      return res.status(400).json({
        success: false,
        error: 'Content and metadata are required'
      });
    }

    const nft = await nftService.mintCreatorNFT(creatorId, content, metadata);

    logger.info('NFT minted successfully', {
      nftId: nft.id,
      creatorId,
      rarity: nft.rarity,
      requestId: req.headers['x-request-id']
    });

    res.status(201).json({
      success: true,
      data: {
        nft,
        message: 'NFT minted successfully'
      }
    });
  } catch (error) {
    logger.error('Error minting NFT:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mint NFT'
    });
  }
});

/**
 * @route POST /api/nft/purchase
 * @desc Purchase an NFT
 * @access Private
 */
router.post('/purchase', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { nftId } = req.body;
    const buyerId = req.user.id;

    if (!nftId) {
      return res.status(400).json({
        success: false,
        error: 'nftId is required'
      });
    }

    const transaction = await nftService.purchaseNFT(nftId, buyerId);

    logger.info('NFT purchased successfully', {
      nftId,
      buyerId,
      amount: transaction.amount,
      requestId: req.headers['x-request-id']
    });

    res.json({
      success: true,
      data: {
        transaction,
        message: 'NFT purchased successfully'
      }
    });
  } catch (error) {
    logger.error('Error purchasing NFT:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to purchase NFT'
    });
  }
});

/**
 * @route GET /api/nft/:nftId
 * @desc Get NFT details
 * @access Public
 */
router.get('/:nftId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { nftId } = req.params;

    const nft = await nftService.getNFTDetails(nftId);

    if (!nft) {
      return res.status(404).json({
        success: false,
        error: 'NFT not found'
      });
    }

    res.json({
      success: true,
      data: { nft }
    });
  } catch (error) {
    logger.error('Error getting NFT details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get NFT details'
    });
  }
});

/**
 * @route POST /api/nft/:nftId/list
 * @desc List NFT for sale
 * @access Private
 */
router.post('/:nftId/list', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { nftId } = req.params;
    const { price } = req.body;
    const userId = req.user.id;

    if (!price || price <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid price is required'
      });
    }

    const success = await nftService.listNFT(nftId, price);

    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to list NFT'
      });
    }

    logger.info('NFT listed for sale', {
      nftId,
      price,
      userId,
      requestId: req.headers['x-request-id']
    });

    res.json({
      success: true,
      data: {
        nftId,
        price,
        message: 'NFT listed for sale successfully'
      }
    });
  } catch (error) {
    logger.error('Error listing NFT:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to list NFT'
    });
  }
});

/**
 * @route POST /api/nft/:nftId/auction
 * @desc Create auction for NFT
 * @access Private
 */
router.post('/:nftId/auction', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { nftId } = req.params;
    const { startPrice, reservePrice, durationHours } = req.body;
    const userId = req.user.id;

    if (!startPrice || !reservePrice || !durationHours) {
      return res.status(400).json({
        success: false,
        error: 'startPrice, reservePrice, and durationHours are required'
      });
    }

    if (startPrice <= 0 || reservePrice <= 0 || durationHours <= 0) {
      return res.status(400).json({
        success: false,
        error: 'All values must be positive'
      });
    }

    const auction = await nftService.createAuction(nftId, startPrice, reservePrice, durationHours);

    logger.info('Auction created successfully', {
      nftId,
      startPrice,
      reservePrice,
      durationHours,
      userId,
      requestId: req.headers['x-request-id']
    });

    res.status(201).json({
      success: true,
      data: {
        auction,
        message: 'Auction created successfully'
      }
    });
  } catch (error) {
    logger.error('Error creating auction:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create auction'
    });
  }
});

/**
 * @route POST /api/nft/:nftId/bid
 * @desc Place bid on auction
 * @access Private
 */
router.post('/:nftId/bid', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { nftId } = req.params;
    const { amount } = req.body;
    const bidderId = req.user.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid bid amount is required'
      });
    }

    const success = await nftService.placeBid(nftId, bidderId, amount);

    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to place bid'
      });
    }

    logger.info('Bid placed successfully', {
      nftId,
      bidderId,
      amount,
      requestId: req.headers['x-request-id']
    });

    res.json({
      success: true,
      data: {
        nftId,
        amount,
        bidderId,
        message: 'Bid placed successfully'
      }
    });
  } catch (error) {
    logger.error('Error placing bid:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to place bid'
    });
  }
});

/**
 * @route GET /api/nft/marketplace/stats
 * @desc Get marketplace statistics
 * @access Public
 */
router.get('/marketplace/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await nftService.getNFTMarketplaceStats();

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    logger.error('Error getting marketplace stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get marketplace statistics'
    });
  }
});

/**
 * @route GET /api/nft/creator/:creatorId
 * @desc Get NFTs by creator
 * @access Public
 */
router.get('/creator/:creatorId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { creatorId } = req.params;
    const { page = 1, limit = 20, status } = req.query;

    // Mock implementation - in real app, implement pagination and filtering
    const nfts = []; // Would query database with filters

    res.json({
      success: true,
      data: {
        nfts,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: 0
        }
      }
    });
  } catch (error) {
    logger.error('Error getting creator NFTs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get creator NFTs'
    });
  }
});

/**
 * @route GET /api/nft/user/:userId/owned
 * @desc Get NFTs owned by user
 * @access Private
 */
router.get('/user/:userId/owned', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserId = req.user.id;

    // Check if user is requesting their own NFTs or has permission
    if (userId !== requestingUserId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const { page = 1, limit = 20 } = req.query;

    // Mock implementation - in real app, query user's owned NFTs
    const nfts = [];

    res.json({
      success: true,
      data: {
        nfts,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: 0
        }
      }
    });
  } catch (error) {
    logger.error('Error getting user NFTs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user NFTs'
    });
  }
});

/**
 * @route GET /api/nft/trending
 * @desc Get trending NFTs
 * @access Public
 */
router.get('/trending', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = 20 } = req.query;

    // Mock implementation - in real app, query trending NFTs
    const nfts = [];

    res.json({
      success: true,
      data: {
        nfts,
        limit: parseInt(limit as string)
      }
    });
  } catch (error) {
    logger.error('Error getting trending NFTs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trending NFTs'
    });
  }
});

/**
 * @route GET /api/nft/search
 * @desc Search NFTs
 * @access Public
 */
router.get('/search', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { q, category, rarity, minPrice, maxPrice, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const { page = 1, limit = 20 } = req.query;

    // Mock implementation - in real app, implement search with filters
    const nfts = [];

    res.json({
      success: true,
      data: {
        nfts,
        filters: {
          query: q,
          category,
          rarity,
          minPrice,
          maxPrice,
          sortBy,
          sortOrder
        },
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: 0
        }
      }
    });
  } catch (error) {
    logger.error('Error searching NFTs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search NFTs'
    });
  }
});

export default router;

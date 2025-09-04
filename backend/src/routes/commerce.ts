import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { socialLimiter } from '../middleware/security';
import LiveCommerceService from '../services/commerce/LiveCommerceService';
import { logger } from '../config/logger';

const router = express.Router();
const commerceService = LiveCommerceService.getInstance();

// Apply middleware
router.use(authenticateToken);
router.use(socialLimiter);

/**
 * @route POST /api/commerce/product
 * @desc Create a new shoppable product
 * @access Private (Creator)
 */
router.post('/product', async (req, res) => {
  try {
    const productData = req.body;
    const creatorId = req.user.id;

    if (!productData.name || !productData.price || !productData.description) {
      return res.status(400).json({
        success: false,
        error: 'Product name, price, and description are required'
      });
    }

    // Add creator ID to product data
    productData.creatorId = creatorId;

    // Mock implementation - in real app, create product in database
    const productId = `product_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const product = {
      id: productId,
      ...productData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    logger.info('Product created', {
      productId,
      creatorId,
      name: productData.name,
      price: productData.price,
      requestId: req.headers['x-request-id']
    });

    res.status(201).json({
      success: true,
      data: {
        product,
        message: 'Product created successfully'
      }
    });
  } catch (error) {
    logger.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create product'
    });
  }
});

/**
 * @route POST /api/commerce/stream/:streamId/product
 * @desc Add product to live stream
 * @access Private (Creator)
 */
router.post('/stream/:streamId/product', async (req, res) => {
  try {
    const { streamId } = req.params;
    const { productId } = req.body;
    const userId = req.user.id;

    if (!productId) {
      return res.status(400).json({
        success: false,
        error: 'productId is required'
      });
    }

    await commerceService.addProductToStream(streamId, productId);

    logger.info('Product added to stream', {
      streamId,
      productId,
      userId,
      requestId: req.headers['x-request-id']
    });

    res.json({
      success: true,
      data: {
        streamId,
        productId,
        message: 'Product added to stream successfully'
      }
    });
  } catch (error) {
    logger.error('Error adding product to stream:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to add product to stream'
    });
  }
});

/**
 * @route POST /api/commerce/checkout
 * @desc Process live checkout
 * @access Private
 */
router.post('/checkout', async (req, res) => {
  try {
    const { productId, streamId, quantity = 1, paymentMethod } = req.body;
    const buyerId = req.user.id;

    if (!productId || !streamId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'productId, streamId, and paymentMethod are required'
      });
    }

    const checkout = await commerceService.processLiveCheckout(
      productId,
      buyerId,
      streamId,
      quantity,
      paymentMethod
    );

    logger.info('Live checkout processed', {
      checkoutId: checkout.id,
      productId,
      buyerId,
      streamId,
      totalAmount: checkout.totalAmount,
      requestId: req.headers['x-request-id']
    });

    res.status(201).json({
      success: true,
      data: {
        checkout,
        message: 'Checkout processed successfully'
      }
    });
  } catch (error) {
    logger.error('Error processing live checkout:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process checkout'
    });
  }
});

/**
 * @route POST /api/commerce/group-buy
 * @desc Initiate group buy
 * @access Private
 */
router.post('/group-buy', async (req, res) => {
  try {
    const { productId, targetQuantity, discountTiers } = req.body;
    const initiatorId = req.user.id;

    if (!productId || !targetQuantity || !discountTiers) {
      return res.status(400).json({
        success: false,
        error: 'productId, targetQuantity, and discountTiers are required'
      });
    }

    const groupBuy = await commerceService.initiateGroupBuy(
      productId,
      initiatorId,
      targetQuantity,
      discountTiers
    );

    logger.info('Group buy initiated', {
      groupBuyId: groupBuy.id,
      productId,
      initiatorId,
      targetQuantity,
      requestId: req.headers['x-request-id']
    });

    res.status(201).json({
      success: true,
      data: {
        groupBuy,
        message: 'Group buy initiated successfully'
      }
    });
  } catch (error) {
    logger.error('Error initiating group buy:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to initiate group buy'
    });
  }
});

/**
 * @route POST /api/commerce/group-buy/:groupBuyId/join
 * @desc Join group buy
 * @access Private
 */
router.post('/group-buy/:groupBuyId/join', async (req, res) => {
  try {
    const { groupBuyId } = req.params;
    const { quantity } = req.body;
    const userId = req.user.id;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid quantity is required'
      });
    }

    const success = await commerceService.joinGroupBuy(groupBuyId, userId, quantity);

    if (!success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to join group buy'
      });
    }

    logger.info('User joined group buy', {
      groupBuyId,
      userId,
      quantity,
      requestId: req.headers['x-request-id']
    });

    res.json({
      success: true,
      data: {
        groupBuyId,
        userId,
        quantity,
        message: 'Successfully joined group buy'
      }
    });
  } catch (error) {
    logger.error('Error joining group buy:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to join group buy'
    });
  }
});

/**
 * @route GET /api/commerce/stream/:streamId/session
 * @desc Get live shopping session
 * @access Public
 */
router.get('/stream/:streamId/session', async (req, res) => {
  try {
    const { streamId } = req.params;

    const session = await commerceService.getLiveShoppingSession(streamId);

    res.json({
      success: true,
      data: { session }
    });
  } catch (error) {
    logger.error('Error getting live shopping session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get live shopping session'
    });
  }
});

/**
 * @route GET /api/commerce/analytics
 * @desc Get commerce analytics
 * @access Private (Creator)
 */
router.get('/analytics', async (req, res) => {
  try {
    const { timeframe = '30days' } = req.query;
    const creatorId = req.user.id;

    const analytics = await commerceService.getCommerceAnalytics(creatorId, timeframe as string);

    res.json({
      success: true,
      data: { analytics }
    });
  } catch (error) {
    logger.error('Error getting commerce analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get commerce analytics'
    });
  }
});

/**
 * @route GET /api/commerce/products
 * @desc Get products (with filters)
 * @access Public
 */
router.get('/products', async (req, res) => {
  try {
    const { 
      creatorId, 
      category, 
      minPrice, 
      maxPrice, 
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Mock implementation - in real app, query products with filters
    const products = [];
    const total = 0;

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        },
        filters: {
          creatorId,
          category,
          minPrice,
          maxPrice,
          sortBy,
          sortOrder
        }
      }
    });
  } catch (error) {
    logger.error('Error getting products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get products'
    });
  }
});

/**
 * @route GET /api/commerce/product/:productId
 * @desc Get product details
 * @access Public
 */
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    // Mock implementation - in real app, get product from database
    const product = {
      id: productId,
      name: 'Sample Product',
      price: 29.99,
      description: 'A sample product for demonstration',
      images: ['https://example.com/image1.jpg'],
      inventory: 100,
      categories: ['clothing'],
      tags: ['trending', 'popular']
    };

    res.json({
      success: true,
      data: { product }
    });
  } catch (error) {
    logger.error('Error getting product details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get product details'
    });
  }
});

/**
 * @route PUT /api/commerce/product/:productId
 * @desc Update product
 * @access Private (Creator)
 */
router.put('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const updates = req.body;
    const userId = req.user.id;

    // Mock implementation - in real app, update product in database
    const updatedProduct = {
      id: productId,
      ...updates,
      updatedAt: new Date()
    };

    logger.info('Product updated', {
      productId,
      userId,
      updates: Object.keys(updates),
      requestId: req.headers['x-request-id']
    });

    res.json({
      success: true,
      data: {
        product: updatedProduct,
        message: 'Product updated successfully'
      }
    });
  } catch (error) {
    logger.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update product'
    });
  }
});

/**
 * @route DELETE /api/commerce/product/:productId
 * @desc Delete product
 * @access Private (Creator)
 */
router.delete('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    // Mock implementation - in real app, delete product from database
    logger.info('Product deleted', {
      productId,
      userId,
      requestId: req.headers['x-request-id']
    });

    res.json({
      success: true,
      data: {
        productId,
        message: 'Product deleted successfully'
      }
    });
  } catch (error) {
    logger.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete product'
    });
  }
});

/**
 * @route GET /api/commerce/group-buy/:groupBuyId
 * @desc Get group buy details
 * @access Public
 */
router.get('/group-buy/:groupBuyId', async (req, res) => {
  try {
    const { groupBuyId } = req.params;

    // Mock implementation - in real app, get group buy from database
    const groupBuy = {
      id: groupBuyId,
      productId: 'product_123',
      targetQuantity: 50,
      currentQuantity: 25,
      status: 'active',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      currentDiscount: 10,
      savings: 150
    };

    res.json({
      success: true,
      data: { groupBuy }
    });
  } catch (error) {
    logger.error('Error getting group buy details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get group buy details'
    });
  }
});

/**
 * @route GET /api/commerce/checkout/:checkoutId
 * @desc Get checkout details
 * @access Private
 */
router.get('/checkout/:checkoutId', async (req, res) => {
  try {
    const { checkoutId } = req.params;
    const userId = req.user.id;

    // Mock implementation - in real app, get checkout from database
    const checkout = {
      id: checkoutId,
      userId,
      productId: 'product_123',
      streamId: 'stream_456',
      quantity: 1,
      totalAmount: 29.99,
      status: 'completed',
      orderNumber: 'ORD-123456',
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    };

    res.json({
      success: true,
      data: { checkout }
    });
  } catch (error) {
    logger.error('Error getting checkout details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get checkout details'
    });
  }
});

/**
 * @route GET /api/commerce/trending
 * @desc Get trending products
 * @access Public
 */
router.get('/trending', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    // Mock implementation - in real app, get trending products
    const products = [];

    res.json({
      success: true,
      data: {
        products,
        limit: parseInt(limit as string)
      }
    });
  } catch (error) {
    logger.error('Error getting trending products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trending products'
    });
  }
});

export default router;

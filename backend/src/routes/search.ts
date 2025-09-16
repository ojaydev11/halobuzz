import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { searchService } from '../services/SearchService';
import { logger } from '../config/logger';
import { sanitizeRequest } from '../utils/querySanitizer';
import { searchLimiter } from '../middleware/security';

const router = express.Router();

// Global search endpoint
router.get('/', [
  searchLimiter,
  sanitizeRequest,
  query('q')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query is required (1-100 characters)'),
  query('type')
    .optional()
    .isIn(['all', 'users', 'streams', 'reels', 'hashtags'])
    .withMessage('Invalid search type'),
  query('category')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Invalid category'),
  query('isLive')
    .optional()
    .isBoolean()
    .withMessage('isLive must be a boolean'),
  query('minFollowers')
    .optional()
    .isInt({ min: 0 })
    .withMessage('minFollowers must be a non-negative integer'),
  query('maxFollowers')
    .optional()
    .isInt({ min: 0 })
    .withMessage('maxFollowers must be a non-negative integer'),
  query('dateRange')
    .optional()
    .isIn(['today', 'week', 'month', 'year', 'all'])
    .withMessage('Invalid date range'),
  query('sortBy')
    .optional()
    .isIn(['relevance', 'popularity', 'date', 'followers'])
    .withMessage('Invalid sort option'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      q: query,
      type,
      category,
      isLive,
      minFollowers,
      maxFollowers,
      dateRange,
      sortBy,
      limit = 20,
      offset = 0
    } = req.query;

    const filters = {
      type: type as any,
      category: category as string,
      isLive: isLive === 'true' ? true : isLive === 'false' ? false : undefined,
      minFollowers: minFollowers ? parseInt(minFollowers as string) : undefined,
      maxFollowers: maxFollowers ? parseInt(maxFollowers as string) : undefined,
      dateRange: dateRange as any,
      sortBy: sortBy as any,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    };

    const results = await searchService.search(query as string, filters);

    res.json({
      success: true,
      data: {
        query,
        filters,
        results,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          total: results.totalResults,
          hasMore: results.totalResults > filters.offset + filters.limit
        }
      }
    });

  } catch (error) {
    logger.error('Search failed:', error);
    res.status(500).json({
      success: false,
      error: 'Search operation failed'
    });
  }
});

// Search suggestions endpoint
router.get('/suggestions', [
  query('q')
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Query is required (1-50 characters)'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Limit must be between 1 and 20')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { q: query, limit = 5 } = req.query;
    const suggestions = await searchService.getSearchSuggestions(query as string, parseInt(limit as string));

    res.json({
      success: true,
      data: {
        query,
        suggestions
      }
    });

  } catch (error) {
    logger.error('Search suggestions failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get search suggestions'
    });
  }
});

// Trending hashtags endpoint
router.get('/trending/hashtags', [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
], async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const trendingHashtags = await searchService.getTrendingHashtags(parseInt(limit as string));

    res.json({
      success: true,
      data: {
        hashtags: trendingHashtags,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Trending hashtags failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trending hashtags'
    });
  }
});

// Search users specifically
router.get('/users', [
  query('q')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query is required'),
  query('minFollowers')
    .optional()
    .isInt({ min: 0 })
    .withMessage('minFollowers must be a non-negative integer'),
  query('maxFollowers')
    .optional()
    .isInt({ min: 0 })
    .withMessage('maxFollowers must be a non-negative integer'),
  query('sortBy')
    .optional()
    .isIn(['relevance', 'popularity', 'followers'])
    .withMessage('Invalid sort option'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      q: query,
      minFollowers,
      maxFollowers,
      sortBy,
      limit = 20,
      offset = 0
    } = req.query;

    const filters = {
      type: 'users' as const,
      minFollowers: minFollowers ? parseInt(minFollowers as string) : undefined,
      maxFollowers: maxFollowers ? parseInt(maxFollowers as string) : undefined,
      sortBy: sortBy as any,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    };

    const results = await searchService.search(query as string, filters);

    res.json({
      success: true,
      data: {
        query,
        users: results.users,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          total: results.users.length,
          hasMore: results.users.length === filters.limit
        }
      }
    });

  } catch (error) {
    logger.error('User search failed:', error);
    res.status(500).json({
      success: false,
      error: 'User search failed'
    });
  }
});

// Search streams specifically
router.get('/streams', [
  query('q')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query is required'),
  query('category')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Invalid category'),
  query('isLive')
    .optional()
    .isBoolean()
    .withMessage('isLive must be a boolean'),
  query('sortBy')
    .optional()
    .isIn(['relevance', 'popularity', 'date'])
    .withMessage('Invalid sort option'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      q: query,
      category,
      isLive,
      sortBy,
      limit = 20,
      offset = 0
    } = req.query;

    const filters = {
      type: 'streams' as const,
      category: category as string,
      isLive: isLive === 'true' ? true : isLive === 'false' ? false : undefined,
      sortBy: sortBy as any,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    };

    const results = await searchService.search(query as string, filters);

    res.json({
      success: true,
      data: {
        query,
        streams: results.streams,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          total: results.streams.length,
          hasMore: results.streams.length === filters.limit
        }
      }
    });

  } catch (error) {
    logger.error('Stream search failed:', error);
    res.status(500).json({
      success: false,
      error: 'Stream search failed'
    });
  }
});

// Search reels specifically
router.get('/reels', [
  query('q')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query is required'),
  query('category')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Invalid category'),
  query('dateRange')
    .optional()
    .isIn(['today', 'week', 'month', 'year', 'all'])
    .withMessage('Invalid date range'),
  query('sortBy')
    .optional()
    .isIn(['relevance', 'popularity', 'date'])
    .withMessage('Invalid sort option'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      q: query,
      category,
      dateRange,
      sortBy,
      limit = 20,
      offset = 0
    } = req.query;

    const filters = {
      type: 'reels' as const,
      category: category as string,
      dateRange: dateRange as any,
      sortBy: sortBy as any,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    };

    const results = await searchService.search(query as string, filters);

    res.json({
      success: true,
      data: {
        query,
        reels: results.reels,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          total: results.reels.length,
          hasMore: results.reels.length === filters.limit
        }
      }
    });

  } catch (error) {
    logger.error('Reel search failed:', error);
    res.status(500).json({
      success: false,
      error: 'Reel search failed'
    });
  }
});

export default router;

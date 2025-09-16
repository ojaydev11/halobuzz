import express from 'express';
import { body, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../models/User';
import { Reel } from '../models/Reel';
import { LiveStream } from '../models/LiveStream';
import { reputationService } from '../services/ReputationService';
import { moderationQueue } from '../services/ModerationQueue';
import { s3Service } from '../services/s3Service';
import { logger } from '../config/logger';
import { FileValidator } from '../utils/fileValidator';
import { uploadLimiter } from '../middleware/security';

const router = express.Router();

// Get presigned URL for reel upload
router.post('/upload/presign', [
  uploadLimiter,
  body('fileName')
    .isString()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Valid file name is required'),
  body('fileType')
    .isString()
    .trim()
    .matches(/^video\/(mp4|mov|avi|mkv|webm|quicktime)$/)
    .withMessage('Valid video file type is required'),
  body('fileSize')
    .isInt({ min: 1024, max: 100 * 1024 * 1024 }) // 1KB to 100MB
    .withMessage('File size must be between 1KB and 100MB')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { fileName, fileType, fileSize } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Validate file metadata
    const fileValidationResult = FileValidator.validateFileMetadata(
      fileName,
      fileType,
      fileSize,
      'video'
    );

    if (!fileValidationResult.isValid) {
      return res.status(400).json({
        success: false,
        error: fileValidationResult.error
      });
    }

    // Generate safe filename
    const safeFileName = FileValidator.generateSafeFilename(fileName, userId);
    const fileKey = `reels/${userId}/${safeFileName}`;

    // Create presigned URL for upload using S3 service
    const presignedUrl = await s3Service.generatePresignedUploadUrl(
      fileKey,
      fileType,
      {
        userId: userId,
        originalName: fileName
      }
    );

    res.json({
      success: true,
      data: {
        uploadUrl: presignedUrl,
        fileKey,
        expiresIn: 3600
      }
    });

  } catch (error) {
    logger.error('Generate presigned URL failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate upload URL'
    });
  }
});

// Create reel after upload
router.post('/', [
  body('fileKey')
    .isString()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Valid file key is required'),
  body('title')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be 1-100 characters'),
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('category')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Valid category is required'),
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean')
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
      fileKey,
      title,
      description,
      tags = [],
      category = 'other',
      isPublic = true
    } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify file exists in S3
    const fileExists = await s3Service.fileExists(fileKey);
    if (!fileExists) {
      return res.status(400).json({
        success: false,
        error: 'File not found in storage'
      });
    }

    // Generate presigned URL for viewing
    const viewUrl = await s3Service.generatePresignedViewUrl(fileKey, 86400); // 24 hours

    // Create reel record
    const reel = new Reel({
      userId,
      username: user.username,
      avatar: user.avatar,
      fileKey,
      title,
      description,
      tags,
      category,
      isPublic,
      metadata: {
        originalFileKey: fileKey,
        viewUrl: viewUrl
      }
    });

    await reel.save();

    // Add to moderation queue for content review
    await moderationQueue.addContentForReview({
      contentType: 'reel',
      contentId: reel._id.toString(),
      userId,
      content: JSON.stringify({ title, description, tags })
    });

    // Award reputation points for content creation
    await reputationService.awardPoints(userId, 'content_creation', {
      contentType: 'reel',
      contentId: reel._id.toString()
    });

    res.status(201).json({
      success: true,
      message: 'Reel created successfully',
      data: {
        reel: {
          id: reel._id,
          title: reel.title,
          description: reel.description,
          category: reel.category,
          tags: reel.tags,
          viewUrl,
          createdAt: reel.createdAt
        }
      }
    });

  } catch (error) {
    logger.error('Create reel failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create reel'
    });
  }
});

// Get reels list
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, userId: filterUserId } = req.query;

    // Build filter
    const filter: any = { isPublic: true };
    if (category) filter.category = category;
    if (filterUserId) filter.userId = filterUserId;

    // Get reels with pagination
    const reels = await Reel.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string) * 1)
      .skip((parseInt(page as string) - 1) * parseInt(limit as string))
      .populate('userId', 'username avatar ogLevel');
    
    const total = await Reel.countDocuments(filter);

    // Generate fresh view URLs for each reel
    const reelsWithUrls = await Promise.all(
      reels.map(async (reel) => {
        const viewUrl = await s3Service.generatePresignedViewUrl(reel.fileKey, 86400);

        return {
          id: reel._id,
          userId: reel.userId,
          username: reel.username,
          avatar: reel.avatar,
          title: reel.title,
          description: reel.description,
          category: reel.category,
          tags: reel.tags,
          viewUrl,
          metadata: reel.metadata,
          createdAt: reel.createdAt
        };
      })
    );

    res.json({
      success: true,
      data: {
        reels: reelsWithUrls,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });

  } catch (error) {
    logger.error('Get reels failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get reels'
    });
  }
});

// Get trending reels
router.get('/trending', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get trending reels based on views and recent activity
    const trendingReels = await Reel.find({ isPublic: true })
      .sort({ 
        viewCount: -1,
        createdAt: -1 
      })
      .limit(parseInt(limit as string) * 1)
      .populate('userId', 'username avatar ogLevel');

    // Generate fresh view URLs
    const reelsWithUrls = await Promise.all(
      trendingReels.map(async (reel) => {
        const viewUrl = await s3Service.generatePresignedViewUrl(reel.fileKey, 86400);

        return {
          id: reel._id,
          userId: reel.userId,
          username: reel.username,
          avatar: reel.avatar,
          title: reel.title,
          description: reel.description,
          category: reel.category,
          tags: reel.tags,
          viewUrl,
          viewCount: reel.metadata.views,
          createdAt: reel.createdAt
        };
      })
    );

    res.json({
      success: true,
      data: {
        reels: reelsWithUrls
      }
    });

  } catch (error) {
    logger.error('Get trending reels failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trending reels'
    });
  }
});

// Get reel by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const reel = await Reel.findById(id)
      .populate('userId', 'username avatar ogLevel');
    
    if (!reel) {
      return res.status(404).json({
        success: false,
        error: 'Reel not found'
      });
    }

    // Generate fresh view URL
    const viewUrl = await s3Service.generatePresignedViewUrl(reel.fileKey, 86400);

    // Increment view count
    await reel.incrementView();

    res.json({
      success: true,
      data: {
        reel: {
          id: reel._id,
          userId: reel.userId,
          username: reel.username,
          avatar: reel.avatar,
          title: reel.title,
          description: reel.description,
          category: reel.category,
          tags: reel.tags,
          viewUrl,
          viewCount: reel.metadata.views,
          metadata: reel.metadata,
          createdAt: reel.createdAt
        }
      }
    });

  } catch (error) {
    logger.error('Get reel failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get reel'
    });
  }
});

// Get user's reels
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get user's reels
    const reels = await Reel.find({ userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string) * 1)
      .skip((parseInt(page as string) - 1) * parseInt(limit as string));

    const total = await Reel.countDocuments({ userId });

    // Generate fresh view URLs
    const reelsWithUrls = await Promise.all(
      reels.map(async (reel) => {
        const viewUrl = await s3Service.generatePresignedViewUrl(reel.fileKey, 86400);

        return {
          id: reel._id,
          title: reel.title,
          description: reel.description,
          category: reel.category,
          tags: reel.tags,
          viewUrl,
          viewCount: reel.metadata.views,
          createdAt: reel.createdAt
        };
      })
    );

    res.json({
      success: true,
      data: {
        reels: reelsWithUrls,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string))
        }
      }
    });

  } catch (error) {
    logger.error('Get user reels failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user reels'
    });
  }
});

export default router;

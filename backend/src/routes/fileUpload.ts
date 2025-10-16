/**
 * Enhanced File Upload Routes
 * Provides secure file upload endpoints with comprehensive validation
 */

import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { 
  secureFileUpload, 
  generatePresignedUploadUrl,
  fileUploadService 
} from '../middleware/secureFileUpload';
import { uploadLimiter } from '../middleware/enhancedRateLimiting';
import { logger } from '../config/logger';

const router = express.Router();

/**
 * POST /upload/presign
 * Generate presigned URL for client-side file upload
 */
router.post('/presign', [
  uploadLimiter,
  body('fileName')
    .isString()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Valid file name is required'),
  body('fileType')
    .isString()
    .trim()
    .matches(/^(image|video|audio|application|text)\/[a-zA-Z0-9-+]+$/)
    .withMessage('Valid MIME type is required'),
  body('fileSize')
    .isInt({ min: 1024, max: 100 * 1024 * 1024 }) // 1KB to 100MB
    .withMessage('File size must be between 1KB and 100MB'),
  body('category')
    .optional()
    .isIn(['avatar', 'reel', 'stream', 'document', 'general'])
    .withMessage('Invalid category')
], generatePresignedUploadUrl);

/**
 * POST /upload/direct
 * Direct file upload with server-side processing
 */
router.post('/direct', secureFileUpload({
  maxSize: 50 * 1024 * 1024, // 50MB for direct uploads
  allowedTypes: [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/webm', 'video/quicktime'
  ],
  generateThumbnails: true,
  compressImages: true
}), async (req: Request, res: Response) => {
  try {
    const uploadedFiles = (req as any).uploadedFiles;
    
    res.json({
      success: true,
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      data: {
        files: uploadedFiles
      }
    });

  } catch (error) {
    logger.error('Direct upload failed:', error);
    res.status(500).json({
      success: false,
      error: 'Upload failed'
    });
  }
});

/**
 * POST /upload/avatar
 * Upload user avatar with specific processing
 */
router.post('/avatar', secureFileUpload({
  maxSize: 5 * 1024 * 1024, // 5MB for avatars
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  generateThumbnails: true,
  compressImages: true
}), async (req: Request, res: Response) => {
  try {
    const uploadedFiles = (req as any).uploadedFiles;
    const avatarFile = uploadedFiles[0];

    if (!avatarFile) {
      return res.status(400).json({
        success: false,
        error: 'No avatar file uploaded'
      });
    }

    // Update user avatar URL in database
    const userId = (req as any).user?.userId;
    // TODO: Update user avatar in User model

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        avatar: avatarFile
      }
    });

  } catch (error) {
    logger.error('Avatar upload failed:', error);
    res.status(500).json({
      success: false,
      error: 'Avatar upload failed'
    });
  }
});

/**
 * POST /upload/reel
 * Upload reel video with processing
 */
router.post('/reel', secureFileUpload({
  maxSize: 100 * 1024 * 1024, // 100MB for reels
  allowedTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
  generateThumbnails: true,
  compressImages: false
}), async (req: Request, res: Response) => {
  try {
    const uploadedFiles = (req as any).uploadedFiles;
    const reelFile = uploadedFiles[0];

    if (!reelFile) {
      return res.status(400).json({
        success: false,
        error: 'No reel file uploaded'
      });
    }

    res.json({
      success: true,
      message: 'Reel uploaded successfully',
      data: {
        reel: reelFile
      }
    });

  } catch (error) {
    logger.error('Reel upload failed:', error);
    res.status(500).json({
      success: false,
      error: 'Reel upload failed'
    });
  }
});

/**
 * DELETE /upload/:fileId
 * Delete uploaded file
 */
router.delete('/:fileId', [
  uploadLimiter,
  body('category')
    .optional()
    .isIn(['avatar', 'reel', 'stream', 'document', 'general'])
    .withMessage('Invalid category')
], async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const { category = 'general' } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Construct S3 key
    const s3Key = `uploads/${category}/${userId}/${fileId}`;
    
    // Delete file from S3
    await fileUploadService.deleteFile(s3Key);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    logger.error('File deletion failed:', error);
    res.status(500).json({
      success: false,
      error: 'File deletion failed'
    });
  }
});

/**
 * GET /upload/:fileId/url
 * Get signed URL for file access
 */
router.get('/:fileId/url', [
  uploadLimiter,
  body('category')
    .optional()
    .isIn(['avatar', 'reel', 'stream', 'document', 'general'])
    .withMessage('Invalid category')
], async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const { category = 'general' } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Construct S3 key
    const s3Key = `uploads/${category}/${userId}/${fileId}`;
    
    // Generate signed URL
    const signedUrl = await fileUploadService.getSignedUrl(s3Key, 3600); // 1 hour expiry

    res.json({
      success: true,
      data: {
        url: signedUrl,
        expiresIn: 3600
      }
    });

  } catch (error) {
    logger.error('Signed URL generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate access URL'
    });
  }
});

export default router;

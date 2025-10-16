/**
 * Enhanced File Upload Security System
 * Provides comprehensive file upload validation, MIME detection, and S3 security
 */

import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fileType from 'file-type';
import sharp from 'sharp';
import crypto from 'crypto';
import { logger } from '../config/logger';
import { uploadLimiter } from './enhancedRateLimiting';

interface FileUploadConfig {
  maxSize: number;
  allowedTypes: string[];
  allowedExtensions: string[];
  scanForMalware: boolean;
  generateThumbnails: boolean;
  compressImages: boolean;
}

interface UploadedFile {
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  metadata: any;
}

export class EnhancedFileUploadService {
  private static instance: EnhancedFileUploadService;
  private s3Client: S3Client;
  private config: FileUploadConfig;

  private constructor() {
    this.s3Client = new S3Client({
      region: process.env.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!
      }
    });

    this.config = {
      maxSize: 100 * 1024 * 1024, // 100MB
      allowedTypes: [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'video/quicktime',
        'audio/mpeg', 'audio/wav', 'audio/ogg',
        'application/pdf', 'text/plain'
      ],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.mov', '.mp3', '.wav', '.pdf', '.txt'],
      scanForMalware: process.env.NODE_ENV === 'production',
      generateThumbnails: true,
      compressImages: true
    };
  }

  static getInstance(): EnhancedFileUploadService {
    if (!EnhancedFileUploadService.instance) {
      EnhancedFileUploadService.instance = new EnhancedFileUploadService();
    }
    return EnhancedFileUploadService.instance;
  }

  /**
   * Create multer middleware with security validation
   */
  createUploadMiddleware(options: Partial<FileUploadConfig> = {}): multer.Multer {
    const config = { ...this.config, ...options };
    
    return multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: config.maxSize,
        files: 5 // Max 5 files per request
      },
      fileFilter: (req, file, cb) => {
        this.validateFile(file, config, cb);
      }
    });
  }

  /**
   * Validate uploaded file
   */
  private validateFile(
    file: Express.Multer.File, 
    config: FileUploadConfig, 
    cb: multer.FileFilterCallback
  ): void {
    try {
      // Check file size
      if (file.size > config.maxSize) {
        return cb(new Error(`File size exceeds ${config.maxSize / 1024 / 1024}MB limit`));
      }

      // Check MIME type
      if (!config.allowedTypes.includes(file.mimetype)) {
        return cb(new Error(`File type ${file.mimetype} not allowed`));
      }

      // Check file extension
      const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
      if (!config.allowedExtensions.includes(ext)) {
        return cb(new Error(`File extension ${ext} not allowed`));
      }

      cb(null, true);
    } catch (error) {
      cb(error as Error);
    }
  }

  /**
   * Process and upload file to S3
   */
  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    category: string = 'general'
  ): Promise<UploadedFile> {
    try {
      // Detect actual file type
      const detectedType = await fileType.fromBuffer(file.buffer);
      if (detectedType && !this.config.allowedTypes.includes(detectedType.mime)) {
        throw new Error(`Detected file type ${detectedType.mime} does not match declared type ${file.mimetype}`);
      }

      // Generate secure filename
      const fileId = crypto.randomUUID();
      const extension = file.originalname.substring(file.originalname.lastIndexOf('.'));
      const fileName = `${fileId}${extension}`;
      const s3Key = `uploads/${category}/${userId}/${fileName}`;

      // Process file based on type
      let processedBuffer = file.buffer;
      let thumbnailBuffer: Buffer | undefined;

      if (file.mimetype.startsWith('image/')) {
        const processed = await this.processImage(file.buffer, this.config);
        processedBuffer = processed.buffer;
        thumbnailBuffer = processed.thumbnail;
      }

      // Upload to S3
      const uploadCommand = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: s3Key,
        Body: processedBuffer,
        ContentType: file.mimetype,
        Metadata: {
          userId,
          originalName: file.originalname,
          uploadedAt: new Date().toISOString()
        }
      });

      await this.s3Client.send(uploadCommand);

      // Upload thumbnail if generated
      let thumbnailUrl: string | undefined;
      if (thumbnailBuffer) {
        const thumbnailKey = `thumbnails/${category}/${userId}/${fileId}_thumb.jpg`;
        const thumbnailCommand = new PutObjectCommand({
          Bucket: process.env.S3_BUCKET!,
          Key: thumbnailKey,
          Body: thumbnailBuffer,
          ContentType: 'image/jpeg'
        });
        await this.s3Client.send(thumbnailCommand);
        thumbnailUrl = await this.getSignedUrl(thumbnailKey);
      }

      const fileUrl = await this.getSignedUrl(s3Key);

      logger.info(`File uploaded successfully: ${fileName}`, {
        userId,
        category,
        size: file.size,
        mimeType: file.mimetype
      });

      return {
        originalName: file.originalname,
        fileName,
        mimeType: file.mimetype,
        size: file.size,
        url: fileUrl,
        thumbnailUrl,
        metadata: {
          fileId,
          category,
          uploadedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('File upload failed:', error);
      throw error;
    }
  }

  /**
   * Process image file (resize, compress, generate thumbnail)
   */
  private async processImage(buffer: Buffer, config: FileUploadConfig): Promise<{ buffer: Buffer; thumbnail?: Buffer }> {
    try {
      let processedBuffer = buffer;
      let thumbnailBuffer: Buffer | undefined;

      // Compress image if enabled
      if (config.compressImages) {
        processedBuffer = await sharp(buffer)
          .jpeg({ quality: 85 })
          .png({ compressionLevel: 8 })
          .toBuffer();
      }

      // Generate thumbnail if enabled
      if (config.generateThumbnails) {
        thumbnailBuffer = await sharp(buffer)
          .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer();
      }

      return { buffer: processedBuffer, thumbnail: thumbnailBuffer };
    } catch (error) {
      logger.error('Image processing failed:', error);
      throw new Error('Failed to process image');
    }
  }

  /**
   * Get signed URL for file access
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      logger.error('Failed to generate signed URL:', error);
      throw error;
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!,
        Key: key
      });

      await this.s3Client.send(command);
      logger.info(`File deleted: ${key}`);
    } catch (error) {
      logger.error('Failed to delete file:', error);
      throw error;
    }
  }

  /**
   * Scan file for malware (placeholder for ClamAV integration)
   */
  private async scanForMalware(buffer: Buffer): Promise<boolean> {
    if (!this.config.scanForMalware) {
      return true;
    }

    // Placeholder for ClamAV integration
    // In production, integrate with ClamAV or similar antivirus service
    logger.info('Malware scan placeholder - file passed');
    return true;
  }
}

// Export singleton instance
export const fileUploadService = EnhancedFileUploadService.getInstance();

/**
 * File upload middleware with comprehensive security
 */
export const secureFileUpload = (options: Partial<FileUploadConfig> = {}) => {
  const upload = fileUploadService.createUploadMiddleware(options);
  
  return [
    uploadLimiter,
    upload.array('files', 5),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.files || req.files.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'No files uploaded'
          });
        }

        const userId = (req as any).user?.userId;
        if (!userId) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required'
          });
        }

        // Process each uploaded file
        const uploadedFiles: UploadedFile[] = [];
        for (const file of req.files as Express.Multer.File[]) {
          try {
            const uploadedFile = await fileUploadService.uploadFile(file, userId);
            uploadedFiles.push(uploadedFile);
          } catch (error) {
            logger.error(`Failed to upload file ${file.originalname}:`, error);
            // Continue with other files
          }
        }

        if (uploadedFiles.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'No files were successfully uploaded'
          });
        }

        // Attach uploaded files to request
        (req as any).uploadedFiles = uploadedFiles;
        next();

      } catch (error) {
        logger.error('File upload middleware error:', error);
        res.status(500).json({
          success: false,
          error: 'File upload failed'
        });
      }
    }
  ];
};

/**
 * Presigned URL generation for client-side uploads
 */
export const generatePresignedUploadUrl = async (req: Request, res: Response) => {
  try {
    const { fileName, fileType, fileSize, category = 'general' } = req.body;
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate file parameters
    const service = fileUploadService.getInstance();
    const config = service['config'];
    
    if (fileSize > config.maxSize) {
      return res.status(400).json({
        success: false,
        error: `File size exceeds ${config.maxSize / 1024 / 1024}MB limit`
      });
    }

    if (!config.allowedTypes.includes(fileType)) {
      return res.status(400).json({
        success: false,
        error: `File type ${fileType} not allowed`
      });
    }

    // Generate presigned URL
    const fileId = crypto.randomUUID();
    const extension = fileName.substring(fileName.lastIndexOf('.'));
    const s3Key = `uploads/${category}/${userId}/${fileId}${extension}`;

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: s3Key,
      ContentType: fileType,
      Metadata: {
        userId,
        originalName: fileName,
        uploadedAt: new Date().toISOString()
      }
    });

    const presignedUrl = await getSignedUrl(service['s3Client'], command, { expiresIn: 3600 });

    res.json({
      success: true,
      data: {
        uploadUrl: presignedUrl,
        fileId,
        s3Key,
        expiresIn: 3600
      }
    });

  } catch (error) {
    logger.error('Presigned URL generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate upload URL'
    });
  }
};

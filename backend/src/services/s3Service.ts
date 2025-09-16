import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '../config/logger';

export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.S3_BUCKET_NAME || 'halobuzz-media';
    
    // Initialize S3 client with proper configuration
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    });

    // Validate configuration
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      logger.warn('AWS credentials not configured - S3 service will use mock URLs');
    }
  }

  /**
   * Generate presigned URL for file upload
   */
  async generatePresignedUploadUrl(
    fileKey: string,
    contentType: string,
    metadata: Record<string, string> = {}
  ): Promise<string> {
    try {
      // Check if AWS credentials are configured
      if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        logger.warn('AWS credentials not configured, returning mock URL');
        return `https://${this.bucketName}.s3.amazonaws.com/${fileKey}`;
      }

      const putObjectCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
        ContentType: contentType,
        Metadata: {
          ...metadata,
          uploadedAt: new Date().toISOString()
        }
      });

      const presignedUrl = await getSignedUrl(this.s3Client, putObjectCommand, {
        expiresIn: 3600 // 1 hour
      });

      logger.info(`Generated presigned upload URL for key: ${fileKey}`);
      return presignedUrl;
    } catch (error) {
      logger.error('Failed to generate presigned upload URL:', error);
      throw new Error('Failed to generate upload URL');
    }
  }

  /**
   * Generate presigned URL for file download/viewing
   */
  async generatePresignedViewUrl(fileKey: string, expiresIn: number = 86400): Promise<string> {
    try {
      // Check if AWS credentials are configured
      if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        logger.warn('AWS credentials not configured, returning mock URL');
        return `https://${this.bucketName}.s3.amazonaws.com/${fileKey}`;
      }

      const getObjectCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey
      });

      const presignedUrl = await getSignedUrl(this.s3Client, getObjectCommand, {
        expiresIn
      });

      logger.info(`Generated presigned view URL for key: ${fileKey}`);
      return presignedUrl;
    } catch (error) {
      logger.error('Failed to generate presigned view URL:', error);
      throw new Error('Failed to generate view URL');
    }
  }

  /**
   * Check if file exists in S3
   */
  async fileExists(fileKey: string): Promise<boolean> {
    try {
      // Check if AWS credentials are configured
      if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        logger.warn('AWS credentials not configured, assuming file exists');
        return true;
      }

      const headObjectCommand = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey
      });

      await this.s3Client.send(headObjectCommand);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return false;
      }
      logger.error('Failed to check file existence:', error);
      throw new Error('Failed to check file existence');
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFile(fileKey: string): Promise<boolean> {
    try {
      // Check if AWS credentials are configured
      if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        logger.warn('AWS credentials not configured, cannot delete file');
        return false;
      }

      const deleteObjectCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey
      });

      await this.s3Client.send(deleteObjectCommand);
      logger.info(`Deleted file from S3: ${fileKey}`);
      return true;
    } catch (error) {
      logger.error('Failed to delete file:', error);
      throw new Error('Failed to delete file');
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileKey: string): Promise<any> {
    try {
      // Check if AWS credentials are configured
      if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        logger.warn('AWS credentials not configured, returning mock metadata');
        return {
          size: 0,
          lastModified: new Date(),
          contentType: 'application/octet-stream'
        };
      }

      const headObjectCommand = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey
      });

      const response = await this.s3Client.send(headObjectCommand);
      return {
        size: response.ContentLength || 0,
        lastModified: response.LastModified,
        contentType: response.ContentType,
        metadata: response.Metadata
      };
    } catch (error) {
      logger.error('Failed to get file metadata:', error);
      throw new Error('Failed to get file metadata');
    }
  }
}

// Export singleton instance
export const s3Service = new S3Service();

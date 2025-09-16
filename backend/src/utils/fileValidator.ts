import fileType from 'file-type';
import { logger } from '@/config/logger';

export interface FileValidationResult {
  isValid: boolean;
  mimeType?: string;
  extension?: string;
  error?: string;
}

export class FileValidator {
  // Allowed file types for different categories
  private static readonly ALLOWED_TYPES = {
    video: [
      'video/mp4',
      'video/mov',
      'video/avi',
      'video/mkv',
      'video/webm',
      'video/quicktime'
    ],
    image: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ],
    audio: [
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/mp4'
    ],
    document: [
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  };

  // File size limits (in bytes)
  private static readonly SIZE_LIMITS = {
    video: 100 * 1024 * 1024, // 100MB
    image: 10 * 1024 * 1024,  // 10MB
    audio: 50 * 1024 * 1024,  // 50MB
    document: 5 * 1024 * 1024  // 5MB
  };

  // Dangerous file extensions
  private static readonly DANGEROUS_EXTENSIONS = [
    '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar',
    '.php', '.asp', '.jsp', '.py', '.rb', '.pl', '.sh', '.ps1', '.psm1'
  ];

  /**
   * Validates file content and type
   */
  static async validateFile(
    fileBuffer: Buffer,
    filename: string,
    category: 'video' | 'image' | 'audio' | 'document'
  ): Promise<FileValidationResult> {
    try {
      // Check file size
      const sizeLimit = this.SIZE_LIMITS[category];
      if (fileBuffer.length > sizeLimit) {
        return {
          isValid: false,
          error: `File size exceeds limit of ${sizeLimit / (1024 * 1024)}MB`
        };
      }

      // Check minimum file size (prevent empty files)
      if (fileBuffer.length < 100) {
        return {
          isValid: false,
          error: 'File is too small'
        };
      }

      // Detect actual file type from content
      const detectedType = await fileType.fileTypeFromBuffer(fileBuffer);
      if (!detectedType) {
        return {
          isValid: false,
          error: 'Unable to determine file type'
        };
      }

      // Validate MIME type
      const allowedMimeTypes = this.ALLOWED_TYPES[category];
      if (!allowedMimeTypes.includes(detectedType.mime)) {
        return {
          isValid: false,
          error: `File type ${detectedType.mime} is not allowed for ${category} uploads`
        };
      }

      // Validate file extension
      const extension = this.getFileExtension(filename);
      if (!extension) {
        return {
          isValid: false,
          error: 'File must have a valid extension'
        };
      }

      // Check for dangerous extensions
      if (this.DANGEROUS_EXTENSIONS.includes(extension.toLowerCase())) {
        return {
          isValid: false,
          error: 'File extension is not allowed'
        };
      }

      // Validate extension matches MIME type
      const expectedExtensions = this.getExtensionsForMimeType(detectedType.mime);
      if (!expectedExtensions.includes(extension.toLowerCase())) {
        return {
          isValid: false,
          error: 'File extension does not match file content'
        };
      }

      return {
        isValid: true,
        mimeType: detectedType.mime,
        extension: extension.toLowerCase()
      };

    } catch (error) {
      logger.error('File validation error:', error);
      return {
        isValid: false,
        error: 'File validation failed'
      };
    }
  }

  /**
   * Validates file metadata
   */
  static validateFileMetadata(
    filename: string,
    mimeType: string,
    fileSize: number,
    category: 'video' | 'image' | 'audio' | 'document'
  ): FileValidationResult {
    try {
      // Validate filename
      if (!filename || filename.length > 255) {
        return {
          isValid: false,
          error: 'Invalid filename'
        };
      }

      // Check for path traversal attempts
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return {
          isValid: false,
          error: 'Filename contains invalid characters'
        };
      }

      // Validate file size
      const sizeLimit = this.SIZE_LIMITS[category];
      if (fileSize > sizeLimit) {
        return {
          isValid: false,
          error: `File size exceeds limit of ${sizeLimit / (1024 * 1024)}MB`
        };
      }

      // Validate MIME type
      const allowedMimeTypes = this.ALLOWED_TYPES[category];
      if (!allowedMimeTypes.includes(mimeType)) {
        return {
          isValid: false,
          error: `File type ${mimeType} is not allowed for ${category} uploads`
        };
      }

      // Validate file extension
      const extension = this.getFileExtension(filename);
      if (!extension) {
        return {
          isValid: false,
          error: 'File must have a valid extension'
        };
      }

      // Check for dangerous extensions
      if (this.DANGEROUS_EXTENSIONS.includes(extension.toLowerCase())) {
        return {
          isValid: false,
          error: 'File extension is not allowed'
        };
      }

      return {
        isValid: true,
        mimeType,
        extension: extension.toLowerCase()
      };

    } catch (error) {
      logger.error('File metadata validation error:', error);
      return {
        isValid: false,
        error: 'File metadata validation failed'
      };
    }
  }

  /**
   * Generates a safe filename
   */
  static generateSafeFilename(originalFilename: string, userId: string): string {
    const extension = this.getFileExtension(originalFilename);
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    
    return `${userId}_${timestamp}_${randomString}${extension}`;
  }

  /**
   * Gets file extension from filename
   */
  private static getFileExtension(filename: string): string | null {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1 || lastDot === filename.length - 1) {
      return null;
    }
    return filename.substring(lastDot);
  }

  /**
   * Gets expected extensions for a MIME type
   */
  private static getExtensionsForMimeType(mimeType: string): string[] {
    const mimeToExtension: { [key: string]: string[] } = {
      'video/mp4': ['.mp4'],
      'video/mov': ['.mov'],
      'video/avi': ['.avi'],
      'video/mkv': ['.mkv'],
      'video/webm': ['.webm'],
      'video/quicktime': ['.mov'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      'audio/mpeg': ['.mp3'],
      'audio/wav': ['.wav'],
      'audio/ogg': ['.ogg'],
      'audio/mp4': ['.m4a'],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    };

    return mimeToExtension[mimeType] || [];
  }

  /**
   * Scans file for malicious content (basic check)
   */
  static async scanForMaliciousContent(fileBuffer: Buffer): Promise<boolean> {
    try {
      // Convert buffer to string for pattern matching
      const fileContent = fileBuffer.toString('binary');
      
      // Check for common malicious patterns
      const maliciousPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /onload\s*=/gi,
        /onerror\s*=/gi,
        /eval\s*\(/gi,
        /document\.cookie/gi,
        /window\.location/gi,
        /\.exe/gi,
        /\.bat/gi,
        /\.cmd/gi
      ];

      for (const pattern of maliciousPatterns) {
        if (pattern.test(fileContent)) {
          logger.warn('Malicious content detected in file');
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Malicious content scan error:', error);
      return false;
    }
  }
}

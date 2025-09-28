import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '@/models/User';
import { MFAService, CryptographicSecurity, SecureDesign, SecurityLogging } from '@/middleware/enhancedSecurity';
import { logger } from '@/config/logger';
import { getCache, setCache } from '@/config/redis';
import QRCode from 'qrcode';

/**
 * Multi-Factor Authentication Routes
 * Implements TOTP-based MFA with backup codes
 */

interface MFARequest extends Request {
  user?: {
    userId: string;
    email: string;
    mfaEnabled?: boolean;
  };
}

export default async function mfaRoutes(fastify: FastifyInstance) {
  // Enable MFA for user
  fastify.post('/enable', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['password'],
        properties: {
          password: { type: 'string', minLength: 8 }
        }
      }
    }
  }, async (request: MFARequest, reply: Response) => {
    try {
      const errors = validationResult(request);
      if (!errors.isEmpty()) {
        return reply.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { password } = request.body as { password: string };
      const userId = request.user?.userId;

      if (!userId) {
        return reply.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      // Get user and verify password
      const user = await User.findById(userId);
      if (!user) {
        return reply.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        SecurityLogging.logSecurityEvent('mfa_enable_password_failure', request);
        return reply.status(401).json({
          success: false,
          error: 'Invalid password'
        });
      }

      // Generate TOTP secret and backup codes
      const totpSecret = MFAService.generateTOTPSecret();
      const backupCodes = MFAService.generateBackupCodes();

      // Encrypt and store TOTP secret
      const encryptedSecret = CryptographicSecurity.encrypt(totpSecret);
      
      // Update user with MFA settings
      await User.findByIdAndUpdate(userId, {
        mfaEnabled: true,
        totpSecret: encryptedSecret,
        backupCodes: backupCodes.map(code => ({
          code: CryptographicSecurity.encrypt(code).encrypted,
          used: false,
          createdAt: new Date()
        }))
      });

      // Generate QR code for authenticator app
      const qrData = `otpauth://totp/HaloBuzz:${user.email}?secret=${totpSecret}&issuer=HaloBuzz`;
      const qrCodeUrl = await QRCode.toDataURL(qrData);

      SecurityLogging.logSecurityEvent('mfa_enabled', request);

      return reply.json({
        success: true,
        message: 'MFA enabled successfully',
        data: {
          qrCode: qrCodeUrl,
          secret: totpSecret, // Only shown once during setup
          backupCodes: backupCodes, // Only shown once during setup
          instructions: [
            'Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)',
            'Enter the 6-digit code from your app to verify setup',
            'Save the backup codes in a secure location',
            'You can use backup codes if you lose access to your authenticator app'
          ]
        }
      });
    } catch (error) {
      logger.error('MFA enable error:', error);
      return reply.status(500).json({
        success: false,
        error: 'Failed to enable MFA'
      });
    }
  });

  // Verify MFA setup
  fastify.post('/verify-setup', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['code'],
        properties: {
          code: { type: 'string', pattern: '^[0-9]{6}$' }
        }
      }
    }
  }, async (request: MFARequest, reply: Response) => {
    try {
      const { code } = request.body as { code: string };
      const userId = request.user?.userId;

      if (!userId) {
        return reply.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const user = await User.findById(userId);
      if (!user || !user.mfaEnabled || !user.totpSecret) {
        return reply.status(400).json({
          success: false,
          error: 'MFA not enabled'
        });
      }

      // Decrypt TOTP secret
      const encryptedSecret = user.totpSecret as any;
      const totpSecret = CryptographicSecurity.decrypt(encryptedSecret);

      // Verify TOTP code
      const isValidCode = MFAService.verifyTOTPCode(totpSecret, code);
      if (!isValidCode) {
        SecurityLogging.logSecurityEvent('mfa_verification_failure', request);
        return reply.status(401).json({
          success: false,
          error: 'Invalid verification code'
        });
      }

      // Mark MFA as verified in session
      const sessionId = (request as any).sessionId;
      if (sessionId) {
        const sessionData = await getCache(`session:${sessionId}`);
        if (sessionData) {
          sessionData.mfaVerified = true;
          await setCache(`session:${sessionId}`, sessionData, 24 * 60 * 60);
        }
      }

      SecurityLogging.logSecurityEvent('mfa_verified', request);

      return reply.json({
        success: true,
        message: 'MFA verification successful'
      });
    } catch (error) {
      logger.error('MFA verification error:', error);
      return reply.status(500).json({
        success: false,
        error: 'Failed to verify MFA'
      });
    }
  });

  // Verify MFA code for login
  fastify.post('/verify', {
    schema: {
      body: {
        type: 'object',
        required: ['sessionId', 'code'],
        properties: {
          sessionId: { type: 'string' },
          code: { type: 'string', pattern: '^[0-9]{6}$' }
        }
      }
    }
  }, async (request: Request, reply: Response) => {
    try {
      const { sessionId, code } = request.body as { sessionId: string; code: string };

      // Get session data
      const sessionData = await getCache(`session:${sessionId}`);
      if (!sessionData) {
        return reply.status(401).json({
          success: false,
          error: 'Invalid session'
        });
      }

      const userId = sessionData.userId;
      const user = await User.findById(userId);
      if (!user || !user.mfaEnabled || !user.totpSecret) {
        return reply.status(400).json({
          success: false,
          error: 'MFA not enabled'
        });
      }

      // Decrypt TOTP secret
      const encryptedSecret = user.totpSecret as any;
      const totpSecret = CryptographicSecurity.decrypt(encryptedSecret);

      // Verify TOTP code
      const isValidCode = MFAService.verifyTOTPCode(totpSecret, code);
      if (!isValidCode) {
        SecurityLogging.logSecurityEvent('mfa_login_failure', request);
        return reply.status(401).json({
          success: false,
          error: 'Invalid verification code'
        });
      }

      // Update session with MFA verification
      sessionData.mfaVerified = true;
      sessionData.lastActivity = new Date();
      await setCache(`session:${sessionId}`, sessionData, 24 * 60 * 60);

      SecurityLogging.logSecurityEvent('mfa_login_success', request);

      return reply.json({
        success: true,
        message: 'MFA verification successful',
        data: {
          sessionId,
          mfaVerified: true
        }
      });
    } catch (error) {
      logger.error('MFA verification error:', error);
      return reply.status(500).json({
        success: false,
        error: 'Failed to verify MFA'
      });
    }
  });

  // Use backup code
  fastify.post('/backup-code', {
    schema: {
      body: {
        type: 'object',
        required: ['sessionId', 'backupCode'],
        properties: {
          sessionId: { type: 'string' },
          backupCode: { type: 'string', pattern: '^[A-F0-9]{8}$' }
        }
      }
    }
  }, async (request: Request, reply: Response) => {
    try {
      const { sessionId, backupCode } = request.body as { sessionId: string; backupCode: string };

      // Get session data
      const sessionData = await getCache(`session:${sessionId}`);
      if (!sessionData) {
        return reply.status(401).json({
          success: false,
          error: 'Invalid session'
        });
      }

      const userId = sessionData.userId;
      const user = await User.findById(userId);
      if (!user || !user.mfaEnabled || !user.backupCodes) {
        return reply.status(400).json({
          success: false,
          error: 'MFA not enabled or no backup codes available'
        });
      }

      // Find and verify backup code
      const backupCodeEntry = user.backupCodes.find((entry: any) => {
        const decryptedCode = CryptographicSecurity.decrypt({ 
          encrypted: entry.code, 
          iv: '', 
          tag: '' 
        });
        return decryptedCode === backupCode && !entry.used;
      });

      if (!backupCodeEntry) {
        SecurityLogging.logSecurityEvent('backup_code_failure', request);
        return reply.status(401).json({
          success: false,
          error: 'Invalid or used backup code'
        });
      }

      // Mark backup code as used
      backupCodeEntry.used = true;
      backupCodeEntry.usedAt = new Date();
      await user.save();

      // Update session with MFA verification
      sessionData.mfaVerified = true;
      sessionData.lastActivity = new Date();
      await setCache(`session:${sessionId}`, sessionData, 24 * 60 * 60);

      SecurityLogging.logSecurityEvent('backup_code_success', request);

      return reply.json({
        success: true,
        message: 'Backup code accepted',
        data: {
          sessionId,
          mfaVerified: true
        }
      });
    } catch (error) {
      logger.error('Backup code verification error:', error);
      return reply.status(500).json({
        success: false,
        error: 'Failed to verify backup code'
      });
    }
  });

  // Disable MFA
  fastify.post('/disable', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['password', 'code'],
        properties: {
          password: { type: 'string', minLength: 8 },
          code: { type: 'string', pattern: '^[0-9]{6}$' }
        }
      }
    }
  }, async (request: MFARequest, reply: Response) => {
    try {
      const { password, code } = request.body as { password: string; code: string };
      const userId = request.user?.userId;

      if (!userId) {
        return reply.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const user = await User.findById(userId);
      if (!user || !user.mfaEnabled) {
        return reply.status(400).json({
          success: false,
          error: 'MFA not enabled'
        });
      }

      // Verify password
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        SecurityLogging.logSecurityEvent('mfa_disable_password_failure', request);
        return reply.status(401).json({
          success: false,
          error: 'Invalid password'
        });
      }

      // Verify TOTP code
      if (user.totpSecret) {
        const encryptedSecret = user.totpSecret as any;
        const totpSecret = CryptographicSecurity.decrypt(encryptedSecret);
        const isValidCode = MFAService.verifyTOTPCode(totpSecret, code);
        
        if (!isValidCode) {
          SecurityLogging.logSecurityEvent('mfa_disable_code_failure', request);
          return reply.status(401).json({
            success: false,
            error: 'Invalid verification code'
          });
        }
      }

      // Disable MFA
      await User.findByIdAndUpdate(userId, {
        mfaEnabled: false,
        $unset: {
          totpSecret: 1,
          backupCodes: 1
        }
      });

      SecurityLogging.logSecurityEvent('mfa_disabled', request);

      return reply.json({
        success: true,
        message: 'MFA disabled successfully'
      });
    } catch (error) {
      logger.error('MFA disable error:', error);
      return reply.status(500).json({
        success: false,
        error: 'Failed to disable MFA'
      });
    }
  });

  // Get MFA status
  fastify.get('/status', {
    preHandler: [fastify.authenticate]
  }, async (request: MFARequest, reply: Response) => {
    try {
      const userId = request.user?.userId;

      if (!userId) {
        return reply.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const user = await User.findById(userId).select('mfaEnabled backupCodes');
      if (!user) {
        return reply.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      const remainingBackupCodes = user.backupCodes?.filter((code: any) => !code.used).length || 0;

      return reply.json({
        success: true,
        data: {
          mfaEnabled: user.mfaEnabled || false,
          remainingBackupCodes,
          lastUsed: user.backupCodes?.find((code: any) => code.used)?.usedAt || null
        }
      });
    } catch (error) {
      logger.error('MFA status error:', error);
      return reply.status(500).json({
        success: false,
        error: 'Failed to get MFA status'
      });
    }
  });

  // Regenerate backup codes
  fastify.post('/regenerate-backup-codes', {
    preHandler: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['password', 'code'],
        properties: {
          password: { type: 'string', minLength: 8 },
          code: { type: 'string', pattern: '^[0-9]{6}$' }
        }
      }
    }
  }, async (request: MFARequest, reply: Response) => {
    try {
      const { password, code } = request.body as { password: string; code: string };
      const userId = request.user?.userId;

      if (!userId) {
        return reply.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const user = await User.findById(userId);
      if (!user || !user.mfaEnabled) {
        return reply.status(400).json({
          success: false,
          error: 'MFA not enabled'
        });
      }

      // Verify password
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        SecurityLogging.logSecurityEvent('backup_codes_regenerate_password_failure', request);
        return reply.status(401).json({
          success: false,
          error: 'Invalid password'
        });
      }

      // Verify TOTP code
      if (user.totpSecret) {
        const encryptedSecret = user.totpSecret as any;
        const totpSecret = CryptographicSecurity.decrypt(encryptedSecret);
        const isValidCode = MFAService.verifyTOTPCode(totpSecret, code);
        
        if (!isValidCode) {
          SecurityLogging.logSecurityEvent('backup_codes_regenerate_code_failure', request);
          return reply.status(401).json({
            success: false,
            error: 'Invalid verification code'
          });
        }
      }

      // Generate new backup codes
      const newBackupCodes = MFAService.generateBackupCodes();

      // Update user with new backup codes
      await User.findByIdAndUpdate(userId, {
        backupCodes: newBackupCodes.map(code => ({
          code: CryptographicSecurity.encrypt(code).encrypted,
          used: false,
          createdAt: new Date()
        }))
      });

      SecurityLogging.logSecurityEvent('backup_codes_regenerated', request);

      return reply.json({
        success: true,
        message: 'Backup codes regenerated successfully',
        data: {
          backupCodes: newBackupCodes, // Only shown once
          instructions: [
            'Save these backup codes in a secure location',
            'Each code can only be used once',
            'Use backup codes if you lose access to your authenticator app'
          ]
        }
      });
    } catch (error) {
      logger.error('Backup codes regeneration error:', error);
      return reply.status(500).json({
        success: false,
        error: 'Failed to regenerate backup codes'
      });
    }
  });
}

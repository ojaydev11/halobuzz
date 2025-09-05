import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '@/models/User';
import { setupLogger } from '@/config/logger';

const logger = setupLogger();

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    id: string;
    username: string;
    email: string;
    ogLevel: number;
    isVerified: boolean;
    isBanned: boolean;
    isAdmin?: boolean;
  };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'Bearer token is required'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET not configured');
      res.status(500).json({
        error: 'Server configuration error'
      });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    
    if (!decoded.userId) {
      res.status(401).json({
        error: 'Invalid token',
        message: 'Token does not contain user information'
      });
      return;
    }

    // Get user from database
    const user = await User.findById(decoded.userId).select(
      'username email ogLevel isVerified isBanned kycStatus trust.score'
    );

    if (!user) {
      res.status(401).json({
        error: 'User not found',
        message: 'User account does not exist'
      });
      return;
    }

    if (user.isBanned) {
      res.status(403).json({
        error: 'Account banned',
        message: user.banReason || 'Your account has been suspended'
      });
      return;
    }

    // Attach user to request
    req.user = {
      userId: user._id.toString(),
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      ogLevel: user.ogLevel,
      isVerified: user.isVerified,
      isBanned: user.isBanned,
      isAdmin: user.ogLevel >= 5 // Assuming OG level 5+ is admin
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        error: 'Invalid token',
        message: 'Token is invalid or expired'
      });
    } else if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: 'Token expired',
        message: 'Please login again'
      });
    } else {
      res.status(500).json({
        error: 'Authentication error',
        message: 'An error occurred during authentication'
      });
    }
  }
};

// Middleware for OG level requirements
export const requireOGLevel = (minLevel: number) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required'
      });
      return;
    }

    if (req.user.ogLevel < minLevel) {
      res.status(403).json({
        error: 'OG level required',
        message: `OG level ${minLevel} or higher is required for this action`
      });
      return;
    }

    next();
  };
};

// Middleware for verified users only
export const requireVerified = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      error: 'Authentication required'
    });
    return;
  }

  if (!req.user.isVerified) {
    res.status(403).json({
      error: 'Verification required',
      message: 'Please complete KYC verification to access this feature'
    });
    return;
  }

  next();
};

// Middleware for age verification (18+)
export const requireAgeVerification = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: 'Authentication required'
      });
      return;
    }

    const user = await User.findById(req.user.userId).select('dateOfBirth kycStatus');
    
    if (!user) {
      res.status(401).json({
        error: 'User not found'
      });
      return;
    }

    // Check if user has provided date of birth
    if (!user.dateOfBirth) {
      res.status(403).json({
        error: 'Age verification required',
        message: 'Please provide your date of birth to access this feature'
      });
      return;
    }

    // Calculate age
    const today = new Date();
    const birthDate = new Date(user.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 18) {
      res.status(403).json({
        error: 'Age restriction',
        message: 'You must be 18 or older to access this feature'
      });
      return;
    }

    next();
  } catch (error) {
    logger.error('Age verification error:', error);
    res.status(500).json({
      error: 'Age verification error',
      message: 'An error occurred during age verification'
    });
  }
};

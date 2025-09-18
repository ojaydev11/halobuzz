import { NextApiRequest, NextApiResponse } from 'next';
import { CookieService, AuthService } from '../../../lib/auth';
import { AdminDB } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get auth token from cookie
    const token = CookieService.getAuthToken(req);

    if (!token) {
      return res.status(401).json({
        message: 'Not authenticated',
        success: false
      });
    }

    // Verify session
    const session = AuthService.verifySession(token);

    if (!session) {
      return res.status(401).json({
        message: 'Invalid or expired session',
        success: false
      });
    }

    // Get fresh user data from database
    await AdminDB.initialize();
    const user = await AdminDB.findUserById(session.user.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        message: 'User not found or inactive',
        success: false
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    console.error('Auth check error:', error);
    return res.status(500).json({
      message: 'Internal server error',
      success: false
    });
  }
}
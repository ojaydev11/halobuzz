import { NextApiRequest, NextApiResponse } from 'next';
import { AdminDB } from '../../../lib/db';
import { AuthService, CookieService } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: 'Username and password are required',
        success: false
      });
    }

    // Initialize database
    await AdminDB.initialize();

    // Find user by credentials
    const user = await AdminDB.findUserByCredentials(username, password);

    if (!user) {
      return res.status(401).json({
        message: 'Invalid credentials',
        success: false
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        message: 'Account is disabled',
        success: false
      });
    }

    // Create session
    const session = AuthService.createSession(user);

    // Set auth cookie
    CookieService.setAuthCookie(res, session);

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles
      },
      expiresAt: session.expiresAt
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      message: 'Internal server error',
      success: false
    });
  }
}
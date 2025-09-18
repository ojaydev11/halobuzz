import { NextApiRequest, NextApiResponse } from 'next';
import { CookieService } from '../../../lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Clear auth cookie
    CookieService.clearAuthCookie(res);

    return res.status(200).json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      message: 'Internal server error',
      success: false
    });
  }
}
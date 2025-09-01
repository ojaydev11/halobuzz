import type { NextApiRequest, NextApiResponse } from 'next';
import { buildClearCookie } from '../../lib/cookies';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  const isProd = process.env.NODE_ENV === 'production';
  res.setHeader('Set-Cookie', buildClearCookie(isProd));
  res.status(200).json({ success: true });
}



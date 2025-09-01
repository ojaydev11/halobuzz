import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { buildAuthCookie } from '../../lib/cookies';

const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api/v1';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  try {
    const { identifier, password } = req.body;
    const response = await axios.post(`${apiBase}/auth/login`, { identifier, password });
    const token = response.data?.data?.token || response.data?.token;
    if (!token) {
      return res.status(500).json({ success: false, error: 'No token returned' });
    }
    const isProd = process.env.NODE_ENV === 'production';
    res.setHeader('Set-Cookie', buildAuthCookie(token, isProd));
    return res.status(200).json({ success: true, user: response.data?.data?.user });
  } catch (error: any) {
    const status = error?.response?.status || 500;
    return res.status(status).json({ success: false, error: error?.response?.data?.error || 'Login failed' });
  }
}



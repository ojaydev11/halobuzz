import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001/api/v1';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin authentication
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { status, action, limit = 100, offset = 0 } = req.query;

    // Forward request to backend API
    const response = await axios.get(`${API_BASE}/admin/moderation/flags`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {
        status,
        action,
        limit,
        offset
      }
    });

    res.status(200).json(response.data);
  } catch (error: any) {
    console.error('Error fetching moderation flags:', error);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || 'Internal server error'
    });
  }
}



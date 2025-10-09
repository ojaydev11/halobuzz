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

    const { timeframe = 'day' } = req.query;

    // Forward request to backend API
    const response = await axios.get(`${API_BASE}/admin/moderation/stats`, {
      headers: {
        Authorization: `Bearer ${token}`
      },
      params: {
        timeframe
      }
    });

    res.status(200).json(response.data);
  } catch (error: any) {
    console.error('Error fetching moderation stats:', error);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.message || 'Internal server error'
    });
  }
}



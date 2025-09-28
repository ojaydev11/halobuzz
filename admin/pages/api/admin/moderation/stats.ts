import { NextApiRequest, NextApiResponse } from 'next';
import { aiModerationService } from '../../../../backend/src/services/AIModerationService';

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

    // TODO: Verify admin token with your auth service

    const { timeframe = 'day' } = req.query;

    // Get moderation stats
    const stats = await aiModerationService.getModerationStats(timeframe as 'day' | 'week' | 'month');

    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching moderation stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}



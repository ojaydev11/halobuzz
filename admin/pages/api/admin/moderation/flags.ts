import { NextApiRequest, NextApiResponse } from 'next';
import { ModerationFlag } from '../../../../backend/src/models/ModerationFlag';

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

    const { status, action, limit = 100, offset = 0 } = req.query;

    // Build query
    const query: any = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    if (action && action !== 'all') {
      query.action = action;
    }

    // Fetch flags with pagination
    const flags = await ModerationFlag.find(query)
      .populate('userId', 'username avatar')
      .populate('reviewedBy', 'username')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(offset));

    const totalCount = await ModerationFlag.countDocuments(query);

    res.status(200).json({
      success: true,
      flags,
      pagination: {
        total: totalCount,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < totalCount
      }
    });
  } catch (error) {
    console.error('Error fetching moderation flags:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}



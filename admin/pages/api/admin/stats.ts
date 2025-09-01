import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerApi } from '../../../lib/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  try {
    const api = createServerApi(req.headers as any);
    const resp = await api.get('/admin/stats');
    return res.status(200).json(resp.data);
  } catch (error: any) {
    const status = error?.response?.status || 500;
    return res.status(status).json({ success: false, error: error?.response?.data?.error || 'Failed to load stats' });
  }
}



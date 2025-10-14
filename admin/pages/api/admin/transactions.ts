import type { NextApiRequest, NextApiResponse } from 'next';
import adminAPI from '../../../lib/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const api = adminAPI;
    if (req.method === 'GET') {
      const { type, gateway, status, limit } = req.query;
      const resp = await api.get('/admin/transactions', { params: { type, gateway, status, limit } });
      return res.status(200).json(resp.data);
    }
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    const status = error?.response?.status || 500;
    return res.status(status).json({ success: false, error: error?.response?.data?.error || 'Failed' });
  }
}



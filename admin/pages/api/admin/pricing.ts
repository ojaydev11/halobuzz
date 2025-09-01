import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerApi } from '../../../lib/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const api = createServerApi(req.headers as any);
    if (req.method === 'GET') {
      const resp = await api.get('/admin/pricing');
      return res.status(200).json(resp.data);
    }
    if (req.method === 'PUT') {
      const resp = await api.put('/admin/pricing', req.body);
      return res.status(200).json(resp.data);
    }
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    const status = error?.response?.status || 500;
    return res.status(status).json({ success: false, error: error?.response?.data?.error || 'Failed' });
  }
}



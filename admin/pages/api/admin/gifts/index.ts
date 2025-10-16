import type { NextApiRequest, NextApiResponse } from 'next';
import adminAPI from '../../../../lib/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const api = adminAPI;
    if (req.method === 'GET') {
      const resp = await api.get('/admin/gifts');
      return res.status(200).json(resp.data);
    }
    if (req.method === 'POST') {
      const resp = await api.post('/admin/gifts', req.body);
      return res.status(201).json(resp.data);
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    const status = error?.response?.status || 500;
    return res.status(status).json({ success: false, error: error?.response?.data?.error || 'Failed' });
  }
}



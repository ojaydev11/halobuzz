import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerApi } from '../../../../../lib/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (typeof id !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid id' });
  }
  try {
    const api = createServerApi(req.headers as any);
    if (req.method === 'PATCH') {
      const resp = await api.patch(`/admin/festivals/${id}/toggle`);
      return res.status(200).json(resp.data);
    }
    res.setHeader('Allow', 'PATCH');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error: any) {
    const status = error?.response?.status || 500;
    return res.status(status).json({ success: false, error: error?.response?.data?.error || 'Failed' });
  }
}



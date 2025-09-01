import { useState } from 'react';
import Head from 'next/head';

export default function UsersPage() {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<any[]>([]);

  async function search() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      const res = await fetch('/api/admin/users?' + params.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setItems(data.data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function ban(id: string, ban: boolean) {
    const res = await fetch(`/api/admin/users/${id}/ban`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ban }) });
    if (res.ok) search();
  }

  async function adjustTrust(id: string, delta: number) {
    const res = await fetch(`/api/admin/users/${id}/trust`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ delta }) });
    if (res.ok) search();
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Head><title>Users - HaloBuzz Admin</title></Head>
      <div className="max-w-7xl mx-auto py-6 px-4">
        <h1 className="text-xl font-semibold mb-4">Users</h1>
        <div className="flex gap-2 mb-4">
          <input className="border rounded px-3 py-2 w-80" placeholder="Email, username or phone" value={q} onChange={(e)=>setQ(e.target.value)} />
          <button onClick={search} className="px-3 py-2 bg-indigo-600 text-white rounded">Search</button>
        </div>
        {loading && <div>Loading...</div>}
        {error && <div className="text-red-600">{error}</div>}
        <div className="bg-white rounded shadow overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm">User</th>
                <th className="px-4 py-2 text-left text-sm">Email</th>
                <th className="px-4 py-2 text-left text-sm">Trust</th>
                <th className="px-4 py-2 text-left text-sm">Flags</th>
                <th className="px-4 py-2 text-left text-sm">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((u) => (
                <tr key={u._id}>
                  <td className="px-4 py-2">{u.username}</td>
                  <td className="px-4 py-2">{u.email}</td>
                  <td className="px-4 py-2">{u.trust?.score || 0} ({u.trust?.level || 'low'})</td>
                  <td className="px-4 py-2">{u.trust?.factors?.reportCount || 0}</td>
                  <td className="px-4 py-2">{u.isBanned ? 'Banned' : 'Active'}</td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <button className="px-2 py-1 border rounded" onClick={() => ban(u._id, !u.isBanned)}>{u.isBanned ? 'Unban' : 'Ban'}</button>
                    <button className="px-2 py-1 border rounded" onClick={() => adjustTrust(u._id, 10)}>+Trust</button>
                    <button className="px-2 py-1 border rounded" onClick={() => adjustTrust(u._id, -10)}>-Trust</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

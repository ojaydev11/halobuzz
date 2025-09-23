'use client';
import { useState } from 'react';
import { api } from '../../lib/api';

export default function ProfilePage() {
  const [ogLevel, setOgLevel] = useState(1);
  const [resp, setResp] = useState<any>(null);
  const onDaily = async () => {
    const r = await api(`/og/daily-reward`, { method: 'POST', body: JSON.stringify({ userId: 'self', ogLevel }) });
    setResp(r);
  };
  const onThrone = async () => {
    const r = await api(`/throne/purchase`, { method: 'POST', body: JSON.stringify({ userId: 'self' }) });
    setResp(r);
  };
  return (
    <main className="max-w-lg mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Profile</h1>
      <div className="flex items-center gap-2">
        <label className="text-sm">OG Level</label>
        <input className="w-20 p-2 rounded bg-gray-800" type="number" min={1} max={5} value={ogLevel} onChange={e => setOgLevel(Number(e.target.value))} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button className="bg-blue-600 rounded p-2" onClick={onDaily}>Claim Daily Reward</button>
        <button className="bg-yellow-600 rounded p-2" onClick={onThrone}>Purchase Throne</button>
      </div>
      {resp && <pre className="bg-gray-900 p-2 rounded text-xs overflow-auto">{JSON.stringify(resp, null, 2)}</pre>}
    </main>
  );
}
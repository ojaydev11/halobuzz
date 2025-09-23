'use client';
import { useState } from 'react';
import { api } from '../../lib/api';

export default function WithdrawPage() {
  const [coins, setCoins] = useState(5000);
  const [region, setRegion] = useState('NPR');
  const [resp, setResp] = useState<any>(null);
  const onRequest = async () => {
    const r = await api(`/withdrawals/request`, { method: 'POST', body: JSON.stringify({ userId: 'self', region, amountCoins: coins }) });
    setResp(r);
  };
  return (
    <main className="max-w-lg mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Withdraw</h1>
      <div className="grid grid-cols-2 gap-2">
        <input className="p-2 rounded bg-gray-800" type="number" value={coins} onChange={e => setCoins(Number(e.target.value))} />
        <select className="p-2 rounded bg-gray-800" value={region} onChange={e => setRegion(e.target.value)}>
          <option value="NPR">Nepal (NPR)</option>
          <option value="USD">Global (USD)</option>
        </select>
      </div>
      <button className="bg-red-600 rounded p-2" onClick={onRequest}>Request Withdrawal</button>
      {resp && <pre className="bg-gray-900 p-2 rounded text-xs overflow-auto">{JSON.stringify(resp, null, 2)}</pre>}
    </main>
  );
}


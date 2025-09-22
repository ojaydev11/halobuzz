'use client';
import { useState } from 'react';
import { api } from '../../lib/api';

export default function WalletPage() {
  const [amount, setAmount] = useState(100);
  const [resp, setResp] = useState<any>(null);
  const onStripe = async () => {
    const r = await api(`/payments/stripe/checkout`, {
      method: 'POST',
      body: JSON.stringify({ userId: 'self', currency: 'USD', amountMinor: amount * 100 }),
    });
    setResp(r);
  };
  const onEsewa = async () => {
    const r = await api(`/payments/esewa/init`, { method: 'POST', body: JSON.stringify({ userId: 'self', amount }) });
    setResp(r);
  };
  const onKhalti = async () => {
    const r = await api(`/payments/khalti/init`, { method: 'POST', body: JSON.stringify({ userId: 'self', amount }) });
    setResp(r);
  };

  return (
    <main className="max-w-lg mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Recharge Wallet</h1>
      <input className="w-full p-2 rounded bg-gray-800" type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} />
      <div className="grid grid-cols-3 gap-2">
        <button className="bg-blue-600 rounded p-2" onClick={onStripe}>Stripe</button>
        <button className="bg-green-600 rounded p-2" onClick={onEsewa}>eSewa</button>
        <button className="bg-purple-600 rounded p-2" onClick={onKhalti}>Khalti</button>
      </div>
      {resp && <pre className="bg-gray-900 p-2 rounded text-xs overflow-auto">{JSON.stringify(resp, null, 2)}</pre>}
    </main>
  );
}


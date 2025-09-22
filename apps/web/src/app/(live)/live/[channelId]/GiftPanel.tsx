'use client';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

export function GiftPanel({ channelId, receiverUserId }: { channelId: string; receiverUserId: string }) {
  const [gifts, setGifts] = useState<any[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [multiplier, setMultiplier] = useState<number>(1);
  const [resp, setResp] = useState<any>(null);

  useEffect(() => {
    api<any[]>(`/gifts`).then(setGifts).catch(() => setGifts([]));
  }, []);

  const onSend = async () => {
    if (!selected) return;
    const r = await api(`/gifts/send`, {
      method: 'POST',
      body: JSON.stringify({ senderUserId: 'self', receiverUserId, giftCode: selected, multiplier }),
    });
    setResp(r);
  };

  return (
    <div className="bg-gray-900 p-3 rounded space-y-2">
      <div className="flex gap-2 overflow-auto">
        {gifts.map(g => (
          <button key={g.code} className={`px-2 py-1 rounded ${selected === g.code ? 'bg-purple-700' : 'bg-gray-800'}`} onClick={() => setSelected(g.code)}>
            {g.name} ({g.coinCost})
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400">Multiplier</label>
        <input className="w-20 p-1 rounded bg-gray-800" type="number" min={1} value={multiplier} onChange={e => setMultiplier(Number(e.target.value))} />
        <button onClick={onSend} className="ml-auto bg-pink-600 rounded px-3 py-1">Send</button>
      </div>
      {resp && <pre className="text-xs text-gray-300 overflow-auto">{JSON.stringify(resp)}</pre>}
    </div>
  );
}


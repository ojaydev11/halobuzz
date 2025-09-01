import { useEffect, useState } from 'react';
import Head from 'next/head';

export default function GiftsPage() {
  const [gifts, setGifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/gifts');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setGifts(data.data || data.gifts || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function onCreate() {
    setEditing(null);
    setShowModal(true);
  }

  function onEdit(item: any) {
    setEditing(item);
    setShowModal(true);
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Head><title>Gifts - HaloBuzz Admin</title></Head>
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-semibold">Gifts</h1>
          <button onClick={onCreate} className="px-3 py-2 bg-indigo-600 text-white rounded">New Gift</button>
        </div>
        {loading && <div>Loading...</div>}
        {error && <div className="text-red-600">{error}</div>}
        {!loading && !error && (
          <div className="bg-white rounded shadow overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Name</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Price (Coins)</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Rarity</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Active</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {gifts.map((g) => (
                  <tr key={g.id || g._id}>
                    <td className="px-4 py-2">{g.name}</td>
                    <td className="px-4 py-2">{g.priceCoins}</td>
                    <td className="px-4 py-2">{g.rarity}</td>
                    <td className="px-4 py-2">{String(g.isActive)}</td>
                    <td className="px-4 py-2 text-right">
                      <button onClick={() => onEdit(g)} className="px-2 py-1 text-indigo-600">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <GiftModal
          initial={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}

function GiftModal({ initial, onClose, onSaved }: { initial: any | null; onClose: () => void; onSaved: () => void; }) {
  const [form, setForm] = useState<any>({
    name: initial?.name || '',
    description: initial?.description || '',
    icon: initial?.icon || '',
    animationLottieUrl: initial?.animation || '',
    priceCoins: initial?.priceCoins || 10,
    priceUSD: initial?.priceUSD || 0,
    category: initial?.category || 'special',
    rarity: initial?.rarity || 'common',
    isActive: initial?.isActive ?? true,
    isLimited: initial?.isLimited ?? false,
    limitedQuantity: initial?.limitedQuantity || undefined,
    effects: initial?.effects || { sound: '', visual: '', duration: 3000 },
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends string>(key: K, value: any) {
    setForm((f: any) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(initial?`/api/admin/gifts/${initial.id || initial._id}`:'/api/admin/gifts', {
        method: initial ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Save failed');
      onSaved();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow max-w-lg w-full p-6">
        <h2 className="text-lg font-semibold mb-4">{initial ? 'Edit Gift' : 'New Gift'}</h2>
        {error && <div className="mb-3 text-red-600 text-sm">{error}</div>}
        <div className="grid grid-cols-1 gap-3">
          <Input label="Name" value={form.name} onChange={(v)=>set('name', v)} />
          <Input label="Description" value={form.description} onChange={(v)=>set('description', v)} />
          <Input label="Icon URL" value={form.icon} onChange={(v)=>set('icon', v)} />
          <Input label="Lottie URL" value={form.animationLottieUrl} onChange={(v)=>set('animationLottieUrl', v)} />
          <Input label="Price Coins" type="number" value={form.priceCoins} onChange={(v)=>set('priceCoins', Number(v))} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Rarity</label>
              <select className="w-full border rounded px-3 py-2" value={form.rarity} onChange={(e)=>set('rarity', e.target.value)}>
                <option value="common">common</option>
                <option value="rare">rare</option>
                <option value="epic">epic</option>
                <option value="legendary">legendary</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Active</label>
              <input type="checkbox" checked={form.isActive} onChange={(e)=>set('isActive', e.target.checked)} />
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="px-3 py-2 rounded border">Cancel</button>
          <button onClick={save} disabled={saving} className="px-3 py-2 bg-indigo-600 text-white rounded">{saving?'Saving...':'Save'}</button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type='text' }: { label: string; value: any; onChange: (v: any)=>void; type?: string; }) {
  return (
    <div>
      <label className="block text-sm text-gray-700 mb-1">{label}</label>
      <input className="w-full border rounded px-3 py-2" value={value} type={type} onChange={(e)=>onChange(e.target.value)} />
    </div>
  );
}

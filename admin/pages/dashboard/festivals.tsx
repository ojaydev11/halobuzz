import { useEffect, useState } from 'react';
import Head from 'next/head';

export default function FestivalsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<any | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/festivals');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setItems(data.data || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function toggle(id: string) {
    const res = await fetch(`/api/admin/festivals/${id}/toggle`, { method: 'PATCH' });
    if (res.ok) load();
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Head><title>Festivals - HaloBuzz Admin</title></Head>
      <div className="max-w-7xl mx-auto py-6 px-4">
        <h1 className="text-xl font-semibold mb-4">Festivals</h1>
        {loading && <div>Loading...</div>}
        {error && <div className="text-red-600">{error}</div>}
        {!loading && !error && (
          <div className="bg-white rounded shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm">Name</th>
                  <th className="px-4 py-2 text-left text-sm">Type</th>
                  <th className="px-4 py-2 text-left text-sm">Dates</th>
                  <th className="px-4 py-2 text-left text-sm">Active</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((f) => (
                  <tr key={f._id}>
                    <td className="px-4 py-2">{f.name}</td>
                    <td className="px-4 py-2">{f.type}</td>
                    <td className="px-4 py-2">{new Date(f.startDate).toLocaleDateString()} - {new Date(f.endDate).toLocaleDateString()}</td>
                    <td className="px-4 py-2">{String(f.isActive)}</td>
                    <td className="px-4 py-2 text-right space-x-2">
                      <button className="px-2 py-1 border rounded" onClick={() => toggle(f._id)}>{f.isActive ? 'Deactivate' : 'Activate'}</button>
                      <button className="px-2 py-1 text-indigo-600" onClick={() => setEditing(f)}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <EditModal initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
    </div>
  );
}

function EditModal({ initial, onClose, onSaved }: { initial: any; onClose: () => void; onSaved: () => void; }) {
  const [form, setForm] = useState<any>({
    name: initial.name,
    description: initial.description,
    type: initial.type,
    startDate: initial.startDate?.slice(0,10),
    endDate: initial.endDate?.slice(0,10),
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
      const res = await fetch(`/api/admin/festivals/${initial._id}`, {
        method: 'PUT',
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
        <h2 className="text-lg font-semibold mb-4">Edit Festival</h2>
        {error && <div className="mb-3 text-red-600 text-sm">{error}</div>}
        <div className="grid grid-cols-1 gap-3">
          <Input label="Name" value={form.name} onChange={(v)=>set('name', v)} />
          <Input label="Description" value={form.description} onChange={(v)=>set('description', v)} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Type</label>
              <select className="w-full border rounded px-3 py-2" value={form.type} onChange={(e)=>set('type', e.target.value)}>
                <option value="seasonal">seasonal</option>
                <option value="cultural">cultural</option>
                <option value="special">special</option>
                <option value="anniversary">anniversary</option>
              </select>
            </div>
            <Input label="Start Date" value={form.startDate} onChange={(v)=>set('startDate', v)} type="date" />
          </div>
          <Input label="End Date" value={form.endDate} onChange={(v)=>set('endDate', v)} type="date" />
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

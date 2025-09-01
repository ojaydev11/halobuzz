import { useEffect, useState } from 'react';
import Head from 'next/head';

export default function PricingPage() {
  const [pricing, setPricing] = useState<any>({ countries: {}, gateways: { esewa: true, khalti: true, stripe: false } });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/pricing');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setPricing(data.data || pricing);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function setCountry(code: string, value: number) {
    setPricing((p: any) => ({ ...p, countries: { ...p.countries, [code.toUpperCase()]: value } }));
  }

  function removeCountry(code: string) {
    setPricing((p: any) => { const c = { ...p.countries }; delete c[code]; return { ...p, countries: c }; });
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch('/api/admin/pricing', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pricing) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Save failed');
      setSaved(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Head><title>Pricing - HaloBuzz Admin</title></Head>
      <div className="max-w-3xl mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Pricing</h1>
          <button onClick={save} disabled={saving} className="px-3 py-2 bg-indigo-600 text-white rounded">{saving?'Saving...':'Save'}</button>
        </div>
        {error && <div className="text-red-600 mb-3">{error}</div>}
        {saved && <div className="text-green-600 mb-3">Saved.</div>}
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="bg-white rounded shadow p-4 space-y-6">
            <section>
              <h2 className="font-medium mb-2">Per-country NPR per 500 coins</h2>
              <CountryEditor countries={pricing.countries || {}} onSet={setCountry} onRemove={removeCountry} />
            </section>
            <section>
              <h2 className="font-medium mb-2">Gateways</h2>
              <div className="space-y-2">
                {['esewa','khalti','stripe'].map((k)=> (
                  <label key={k} className="flex items-center gap-2">
                    <input type="checkbox" checked={!!pricing.gateways?.[k]} onChange={(e)=>setPricing((p:any)=>({ ...p, gateways: { ...p.gateways, [k]: e.target.checked } }))} />
                    <span className="capitalize">{k}</span>
                  </label>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function CountryEditor({ countries, onSet, onRemove }: { countries: Record<string, number>; onSet: (c: string, v: number)=>void; onRemove: (c: string)=>void; }) {
  const [newCode, setNewCode] = useState('NP');
  const [newValue, setNewValue] = useState<number>(100);
  const codes = Object.keys(countries).sort();
  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input className="border rounded px-3 py-2 w-24" placeholder="NP" value={newCode} onChange={(e)=>setNewCode(e.target.value)} />
        <input className="border rounded px-3 py-2 w-40" type="number" value={newValue} onChange={(e)=>setNewValue(Number(e.target.value))} />
        <button className="px-3 py-2 border rounded" onClick={()=>onSet(newCode, newValue)}>Add/Update</button>
      </div>
      <div className="border rounded">
        {codes.length === 0 && <div className="p-3 text-gray-500">No countries configured.</div>}
        {codes.map((c)=> (
          <div key={c} className="flex items-center justify-between p-3 border-t first:border-t-0">
            <div className="flex items-center gap-3">
              <span className="font-medium">{c}</span>
              <input className="border rounded px-2 py-1 w-28" type="number" value={countries[c]} onChange={(e)=>onSet(c, Number(e.target.value))} />
            </div>
            <button className="text-red-600" onClick={()=>onRemove(c)}>Remove</button>
          </div>
        ))}
      </div>
    </div>
  );
}

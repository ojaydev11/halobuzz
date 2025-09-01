import { useEffect, useState } from 'react';
import Head from 'next/head';

export default function TransactionsPage() {
  const [filters, setFilters] = useState<{ type?: string; gateway?: string; status?: string }>({});
  const [items, setItems] = useState<any[]>([]);
  const [totals, setTotals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.type) params.set('type', filters.type);
    if (filters.gateway) params.set('gateway', filters.gateway);
    if (filters.status) params.set('status', filters.status);
    const res = await fetch('/api/admin/transactions?' + params.toString());
    const data = await res.json();
    setItems(data?.data?.transactions || []);
    setTotals(data?.data?.totals || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function onChange<K extends keyof typeof filters>(k: K, v: string) {
    setFilters((f) => ({ ...f, [k]: v || undefined }));
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Head><title>Transactions - HaloBuzz Admin</title></Head>
      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="flex items-end gap-3 mb-4">
          <Select label="Type" value={filters.type || ''} onChange={(v)=>onChange('type', v)} options={[ '', 'recharge','gift_sent','gift_received','og_bonus','refund','withdrawal' ]} />
          <Select label="Gateway" value={filters.gateway || ''} onChange={(v)=>onChange('gateway', v)} options={[ '', 'esewa','khalti','stripe','paypal' ]} />
          <Select label="Status" value={filters.status || ''} onChange={(v)=>onChange('status', v)} options={[ '', 'pending','completed','failed','cancelled' ]} />
          <button onClick={load} className="px-3 py-2 bg-indigo-600 text-white rounded">Apply</button>
        </div>

        <div className="mb-4 bg-white rounded shadow p-4">
          <h3 className="font-medium mb-2">Totals</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {totals.map((t) => (
              <div key={t._id} className="border rounded p-3">
                <div className="text-sm text-gray-500">Currency: {t._id}</div>
                <div className="text-lg font-semibold">{t.total}</div>
                <div className="text-sm text-gray-500">Count: {t.count}</div>
              </div>
            ))}
            {totals.length === 0 && <div className="text-gray-500">No totals.</div>}
          </div>
        </div>

        <div className="bg-white rounded shadow overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm">User</th>
                <th className="px-4 py-2 text-left text-sm">Type</th>
                <th className="px-4 py-2 text-left text-sm">Amount</th>
                <th className="px-4 py-2 text-left text-sm">Currency</th>
                <th className="px-4 py-2 text-left text-sm">Status</th>
                <th className="px-4 py-2 text-left text-sm">Gateway</th>
                <th className="px-4 py-2 text-left text-sm">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td className="px-4 py-6" colSpan={7}>Loading...</td></tr>
              ) : (
                items.map((tx) => (
                  <tr key={tx._id}>
                    <td className="px-4 py-2">{tx.userId}</td>
                    <td className="px-4 py-2">{tx.type}</td>
                    <td className="px-4 py-2">{tx.amount}</td>
                    <td className="px-4 py-2">{tx.currency}</td>
                    <td className="px-4 py-2">{tx.status}</td>
                    <td className="px-4 py-2">{tx.paymentMethod || '-'}</td>
                    <td className="px-4 py-2">{new Date(tx.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string)=>void; options: string[]; }) {
  return (
    <div>
      <label className="block text-sm text-gray-700 mb-1">{label}</label>
      <select className="border rounded px-3 py-2" value={value} onChange={(e)=>onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o || 'Any'}</option>)}
      </select>
    </div>
  );
}



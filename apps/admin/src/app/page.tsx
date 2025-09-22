"use client";
import { useEffect, useState } from 'react';

export default function AdminHome() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_API_BASE ? `${process.env.NEXT_PUBLIC_API_BASE}/admin/overview` : 'http://localhost:4000/api/admin/overview')
      .then(r => r.json())
      .then(setData)
      .catch(() => setData({ error: true }));
  }, []);
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">HaloBuzz Admin</h1>
      <p className="text-sm text-slate-300">Monitor earnings, moderation, and operations.</p>
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-900 p-4 rounded">
            <div className="text-xs text-slate-400">Earnings (last 24h) coins</div>
            <div className="text-2xl">{data.earningsLast24hCoins}</div>
          </div>
          <div className="bg-slate-900 p-4 rounded">
            <div className="text-xs text-slate-400">Active Hosts</div>
            <div className="text-2xl">{data.activeHosts}</div>
          </div>
          <div className="bg-slate-900 p-4 rounded">
            <div className="text-xs text-slate-400">Suspicious Reports</div>
            <div className="text-2xl">{data.suspiciousReports}</div>
          </div>
        </div>
      )}
    </main>
  );
}


"use client";
import { useEffect, useState } from 'react';
import { api } from '../lib/api';

export default function HomePage() {
  const [live, setLive] = useState<any[]>([]);
  useEffect(() => {
    api<any[]>(`/streams/live`).then(setLive).catch(() => setLive([]));
  }, []);
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">HaloBuzz</h1>
      <p className="text-sm text-gray-300">Live. Game. Gift. Global.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {live.map(s => (
          <a key={s._id} href={`/live/${s.channelId}`} className="bg-gray-900 rounded p-3 block">
            <div className="aspect-video bg-black/50 rounded mb-2" />
            <div className="font-semibold text-sm">{s.title || 'Untitled'}</div>
            <div className="text-xs text-gray-400">👁 {s.concurrentViewers} • {s.countryCode || 'Global'}</div>
          </a>
        ))}
      </div>
    </main>
  );
}


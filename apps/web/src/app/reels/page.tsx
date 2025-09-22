'use client';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function ReelsPage() {
  const [reels, setReels] = useState<any[]>([]);
  useEffect(() => {
    api<any[]>(`/reels`).then(setReels).catch(() => setReels([]));
  }, []);
  return (
    <main className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Reels</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reels.map(r => (
          <div key={r._id} className="bg-gray-900 rounded p-3 space-y-2">
            <div className="aspect-[9/16] bg-black/50 flex items-center justify-center rounded">Video</div>
            <div className="text-sm text-gray-300">{r.caption || 'Untitled'}</div>
            <div className="text-xs text-gray-500">❤ {r.likes} • 👁 {r.views}</div>
          </div>
        ))}
      </div>
    </main>
  );
}


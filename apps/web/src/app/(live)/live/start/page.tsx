'use client';
import { useState } from 'react';
import { api } from '../../../lib/api';
import { useRouter } from 'next/navigation';

export default function StartLivePage() {
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const onStart = async () => {
    setError(null);
    try {
      // In a real app hostId comes from auth profile
      const hostId = 'self';
      const session = await api<{ channelId: string }>(`/streams/start`, {
        method: 'POST',
        body: JSON.stringify({ hostId, title, tags: tags.split(',').map(t => t.trim()).filter(Boolean) }),
      });
      router.push(`/live/${session.channelId}?role=publisher`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <main className="max-w-lg mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Start Live</h1>
      <input className="w-full p-2 rounded bg-gray-800" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
      <input className="w-full p-2 rounded bg-gray-800" placeholder="Tags (comma-separated)" value={tags} onChange={e => setTags(e.target.value)} />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button className="w-full bg-green-600 hover:bg-green-500 rounded p-2" onClick={onStart}>Go Live</button>
    </main>
  );
}


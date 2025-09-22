'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { api } from '../../../lib/api';
import io from 'socket.io-client';

// Minimal placeholder for player/publisher UI
export default function LiveRoomPage() {
  const params = useParams<{ channelId: string }>();
  const search = useSearchParams();
  const role = search.get('role') || 'subscriber';
  const [tokenInfo, setTokenInfo] = useState<{ token: string; appId: string; uid: string } | null>(null);
  const [messages, setMessages] = useState<{ userId: string; text: string; at: number }[]>([]);
  const [text, setText] = useState('');
  const socketRef = useRef<ReturnType<typeof io> | null>(null);

  useEffect(() => {
    const run = async () => {
      const info = await api<{ token: string; appId: string; uid: string }>(`/streams/token`, {
        method: 'POST',
        body: JSON.stringify({ channelId: params.channelId, role }),
      });
      setTokenInfo(info);
      const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000', { transports: ['websocket'] });
      socket.emit('join', { channelId: params.channelId });
      socket.on('chat', (msg: any) => setMessages(prev => [...prev, msg]));
      socketRef.current = socket;
    };
    run();
    return () => {
      socketRef.current?.emit('leave', { channelId: params.channelId });
      socketRef.current?.disconnect();
    };
  }, [params.channelId, role]);

  const onSend = () => {
    socketRef.current?.emit('chat', { channelId: params.channelId, text, userId: 'viewer' });
    setText('');
  };

  return (
    <main className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Live: {params.channelId}</h1>
      <div className="rounded bg-gray-900 h-64 flex items-center justify-center">
        <span className="text-gray-400 text-sm">Video {role === 'publisher' ? 'Publisher' : 'Player'} Placeholder</span>
      </div>
      <div className="space-y-2">
        <div className="h-40 overflow-auto bg-gray-900 p-2 rounded">
          {messages.map((m, idx) => (
            <div key={idx} className="text-sm text-gray-300">
              <b>{m.userId}</b>: {m.text}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="flex-1 p-2 rounded bg-gray-800" value={text} onChange={e => setText(e.target.value)} placeholder="Say hi" />
          <button className="px-3 py-2 rounded bg-purple-600" onClick={onSend}>Send</button>
        </div>
      </div>
    </main>
  );
}


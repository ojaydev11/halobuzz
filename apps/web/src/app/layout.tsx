import './globals.css';
import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-white">
        <div className="p-3 flex gap-3 text-sm bg-gray-900 sticky top-0 z-10">
          <a href="/" className="font-bold">HaloBuzz</a>
          <a href="/live/start">Start</a>
          <a href="/wallet">Wallet</a>
          <a href="/withdraw">Withdraw</a>
          <a href="/reels">Reels</a>
          <a href="/profile" className="ml-auto">Profile</a>
          <LiteToggle />
        </div>
        {children}
      </body>
    </html>
  );
}

function LiteToggle() {
  return (
    <button
      onClick={() => {
        const lsKey = 'hb_lite';
        const next = localStorage.getItem(lsKey) === '1' ? '0' : '1';
        localStorage.setItem(lsKey, next);
        document.documentElement.classList.toggle('lite', next === '1');
      }}
      className="border border-gray-700 rounded px-2 py-0.5"
    >
      Lite
    </button>
  );
}


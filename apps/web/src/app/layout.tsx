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
        </div>
        {children}
      </body>
    </html>
  );
}


import useSWR from 'swr';
import Head from 'next/head';

const fetcher = (url: string) => fetch(url).then(r=>r.json());

export default function OGPage() {
  const { data, error, isLoading } = useSWR('/api/og/tiers', fetcher);
  const tiers = data?.data?.tiers || [];

  return (
    <div className="min-h-screen bg-gray-100">
      <Head><title>OG Tiers - HaloBuzz Admin</title></Head>
      <div className="max-w-5xl mx-auto py-6 px-4">
        <h1 className="text-xl font-semibold mb-4">OG Tiers</h1>
        {isLoading && <div>Loading...</div>}
        {error && <div className="text-red-600">Failed to load</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiers.map((t: any) => (
            <div key={t.id} className="bg-white rounded shadow p-4">
              <div className="text-sm text-gray-500">Tier {t.tier}</div>
              <div className="text-lg font-semibold">{t.name}</div>
              <div className="mt-2 text-sm">Coins: {t.priceCoins}</div>
              <div className="mt-1 text-sm">USD: ${t.priceUSD}</div>
              <div className="mt-1 text-sm">Duration: {t.duration} days</div>
              {t.benefits?.dailyBonus && (
                <div className="mt-2 text-green-700">Daily bonus: {t.benefits.dailyBonus}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

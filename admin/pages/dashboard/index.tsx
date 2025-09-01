import Head from 'next/head';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function DashboardHome() {
  const { data, error, isLoading } = useSWR('/api/admin/stats', fetcher);

  const stats = data?.data || {};

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Dashboard - HaloBuzz Admin</title>
      </Head>
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">HaloBuzz Admin</h1>
            </div>
            <form method="post" action="/api/logout">
              <button className="text-gray-600 hover:text-gray-900">Logout</button>
            </form>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <h2 className="text-lg font-medium mb-4">Overview</h2>
        {isLoading && <div>Loading...</div>}
        {error && <div className="text-red-600">Failed to load</div>}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard title="DAU" value={stats.dau || 0} />
            <StatCard title="MAU" value={stats.mau || 0} />
            <StatCard title="Coins Sold" value={stats.coinsSold || 0} />
            <StatCard title="Coins Spent" value={stats.coinsSpent || 0} />
          </div>
        )}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold mb-2">Top Hosts by Gifts</h3>
            <ul className="divide-y divide-gray-200">
              {(stats.topHosts || []).map((u: any) => (
                <li key={u.id} className="py-2 flex justify-between">
                  <span>{u.username}</span>
                  <span className="text-gray-600">{u.totalEarned}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold mb-2">Recent Violations</h3>
            <ul className="divide-y divide-gray-200">
              {(stats.recentViolations || []).map((v: any) => (
                <li key={v._id} className="py-2">
                  <div className="text-sm">{v.type} - {v.reason}</div>
                  <div className="text-xs text-gray-500">{new Date(v.createdAt).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-white shadow rounded p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}



import Head from 'next/head';
import useSWR from 'swr';
import Layout from '../../components/Layout';
import RealtimeDashboard from '../../components/RealtimeDashboard';
import {
  ChartBarIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  EyeIcon,
  ChatBubbleLeftEllipsisIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function DashboardHome() {
  const { data, error, isLoading } = useSWR('/api/admin/stats', fetcher);

  const stats = data?.data || {};

  // Mock real-time data for demonstration
  const realTimeStats = {
    onlineUsers: 1247,
    activeStreams: 23,
    messagesPerSecond: 45,
    cpuUsage: 67,
    memoryUsage: 54,
    aiQueriesPerHour: 892
  };

  return (
    <Layout title="Dashboard Overview">
      <Head>
        <title>Dashboard - HaloBuzz Admin</title>
      </Head>

      {/* Real-time Dashboard */}
      <div className="mb-8">
        <RealtimeDashboard />
      </div>

      {/* Real-time status bar */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">System Status</h3>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              <span className="text-gray-600">All Systems Operational</span>
            </div>
            <div className="text-gray-600">Last updated: {new Date().toLocaleTimeString()}</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">{realTimeStats.onlineUsers}</div>
            <div className="text-xs text-gray-500">Online Users</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">{realTimeStats.activeStreams}</div>
            <div className="text-xs text-gray-500">Active Streams</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-purple-600">{realTimeStats.messagesPerSecond}</div>
            <div className="text-xs text-gray-500">Messages/sec</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-orange-600">{realTimeStats.cpuUsage}%</div>
            <div className="text-xs text-gray-500">CPU Usage</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-indigo-600">{realTimeStats.memoryUsage}%</div>
            <div className="text-xs text-gray-500">Memory</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-cyan-600">{realTimeStats.aiQueriesPerHour}</div>
            <div className="text-xs text-gray-500">AI Queries/hr</div>
          </div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Key Metrics</h2>
        {isLoading && <div className="text-center py-8">Loading...</div>}
        {error && <div className="text-red-600 text-center py-8">Failed to load metrics</div>}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Daily Active Users"
              value={stats.dau || 2543}
              change={12.5}
              icon={UserGroupIcon}
              color="blue"
            />
            <MetricCard
              title="Monthly Active Users"
              value={stats.mau || 45678}
              change={8.2}
              icon={ChartBarIcon}
              color="green"
            />
            <MetricCard
              title="Revenue Today"
              value={`$${(stats.revenueToday || 12450).toLocaleString()}`}
              change={-3.1}
              icon={CurrencyDollarIcon}
              color="emerald"
            />
            <MetricCard
              title="Active Reports"
              value={stats.activeReports || 7}
              change={-15.3}
              icon={ExclamationTriangleIcon}
              color="red"
            />
          </div>
        )}
      </div>

      {/* Dashboard grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Performers */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Top Hosts by Gifts</h3>
            <EyeIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {(stats.topHosts || [
              { id: 1, username: 'PriyaStream', totalEarned: '$2,340', avatar: null },
              { id: 2, username: 'NepalLive', totalEarned: '$1,890', avatar: null },
              { id: 3, username: 'MountainView', totalEarned: '$1,567', avatar: null }
            ]).map((host: any, index: number) => (
              <div key={host.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium">{host.username[0]}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{host.username}</span>
                </div>
                <span className="text-sm font-semibold text-green-600">{host.totalEarned}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Violations */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Recent Violations</h3>
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
          </div>
          <div className="space-y-3">
            {(stats.recentViolations || [
              { _id: 1, type: 'Content', reason: 'Inappropriate language', createdAt: new Date().toISOString(), severity: 'medium' },
              { _id: 2, type: 'Harassment', reason: 'User harassment', createdAt: new Date(Date.now() - 3600000).toISOString(), severity: 'high' },
              { _id: 3, type: 'Spam', reason: 'Repetitive messages', createdAt: new Date(Date.now() - 7200000).toISOString(), severity: 'low' }
            ]).map((violation: any) => (
              <div key={violation._id} className="border-l-4 border-red-400 pl-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-900">{violation.type}</div>
                  <div className={`text-xs px-2 py-1 rounded-full ${
                    violation.severity === 'high' ? 'bg-red-100 text-red-800' :
                    violation.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {violation.severity}
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1">{violation.reason}</div>
                <div className="text-xs text-gray-400 mt-1">
                  {new Date(violation.createdAt).toLocaleDateString()} at {new Date(violation.createdAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Intelligence Hub */}
        <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 rounded-lg shadow p-6 text-white">
          <div className="flex items-center mb-4">
            <CpuChipIcon className="h-6 w-6 mr-2" />
            <h3 className="text-lg font-medium">AI Intelligence Hub</h3>
          </div>
          <p className="text-sm text-purple-100 mb-4">
            Monitor AI performance, knowledge base, and intelligent decision making
          </p>
          <div className="space-y-3 mb-4">
            <div className="flex justify-between items-center text-sm">
              <span>Intelligence Level</span>
              <span className="font-semibold">98.7%</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>Processing Speed</span>
              <span className="font-semibold">892ms avg</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span>Knowledge Growth</span>
              <span className="font-semibold">+12.3% today</span>
            </div>
          </div>
          <a
            href="/dashboard/unified-intelligence"
            className="block w-full bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold text-center hover:bg-purple-50 transition-colors"
          >
            Access AI Dashboard
          </a>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickActionButton href="/dashboard/users" icon={UserGroupIcon} label="Manage Users" />
          <QuickActionButton href="/dashboard/content/reports" icon={ExclamationTriangleIcon} label="Review Reports" />
          <QuickActionButton href="/dashboard/promotions/campaigns" icon={ChatBubbleLeftEllipsisIcon} label="Create Campaign" />
          <QuickActionButton href="/dashboard/analytics/behavior" icon={ChartBarIcon} label="View Analytics" />
        </div>
      </div>
    </Layout>
  );
}

function MetricCard({ title, value, change, icon: Icon, color }: {
  title: string;
  value: string | number;
  change: number;
  icon: any;
  color: string;
}) {
  const isPositive = change > 0;
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    red: 'bg-red-50 text-red-600 border-red-200',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
          {isPositive ? <ArrowTrendingUpIcon className="h-4 w-4 mr-1" /> : <ArrowTrendingDownIcon className="h-4 w-4 mr-1" />}
          {Math.abs(change)}%
        </div>
      </div>
      <div className="mt-4">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{title}</div>
      </div>
    </div>
  );
}

function QuickActionButton({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
  return (
    <a
      href={href}
      className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <Icon className="h-6 w-6 text-gray-600 mb-2" />
      <span className="text-sm font-medium text-gray-900">{label}</span>
    </a>
  );
}



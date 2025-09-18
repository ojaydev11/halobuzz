import Head from 'next/head';
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import Layout from '../../../components/Layout';
import {
  ChartBarIcon,
  ClockIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  MapPinIcon,
  UserIcon,
  EyeIcon,
  ChatBubbleLeftRightIcon,
  HeartIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  FunnelIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface BehaviorMetrics {
  sessionDuration: number;
  pageViews: number;
  uniqueVisitors: number;
  bounceRate: number;
  conversionRate: number;
  engagementScore: number;
}

interface UserFlow {
  step: string;
  users: number;
  dropoffRate: number;
  conversionRate: number;
}

interface DeviceData {
  device: string;
  users: number;
  sessions: number;
  avgDuration: number;
  bounceRate: number;
}

interface GeographicData {
  country: string;
  users: number;
  sessions: number;
  revenue: number;
  flag: string;
}

interface TimeAnalytics {
  hour: number;
  users: number;
  streams: number;
  interactions: number;
}

export default function UserBehaviorAnalytics() {
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [selectedSegment, setSelectedSegment] = useState('all');
  const { data: behaviorData, error } = useSWR(`/api/admin/analytics/behavior?range=${selectedTimeRange}&segment=${selectedSegment}`, fetcher);

  // Mock data for demonstration
  const mockMetrics: BehaviorMetrics = {
    sessionDuration: 24.5,
    pageViews: 156789,
    uniqueVisitors: 45632,
    bounceRate: 34.2,
    conversionRate: 8.7,
    engagementScore: 72.4
  };

  const userFlowData: UserFlow[] = [
    { step: 'Landing Page', users: 10000, dropoffRate: 0, conversionRate: 100 },
    { step: 'Browse Streams', users: 7800, dropoffRate: 22, conversionRate: 78 },
    { step: 'Enter Stream', users: 6240, dropoffRate: 20, conversionRate: 62.4 },
    { step: 'Interact (Like/Comment)', users: 4368, dropoffRate: 30, conversionRate: 43.7 },
    { step: 'Send Gift', users: 1747, dropoffRate: 60, conversionRate: 17.5 },
    { step: 'Subscribe/Follow', users: 873, dropoffRate: 50, conversionRate: 8.7 }
  ];

  const deviceData: DeviceData[] = [
    { device: 'Mobile', users: 28450, sessions: 45230, avgDuration: 28.3, bounceRate: 31.2 },
    { device: 'Desktop', users: 12180, sessions: 18960, avgDuration: 35.7, bounceRate: 28.4 },
    { device: 'Tablet', users: 5002, sessions: 7890, avgDuration: 22.1, bounceRate: 42.1 }
  ];

  const geographicData: GeographicData[] = [
    { country: 'Nepal', users: 18500, sessions: 29800, revenue: 12450, flag: '🇳🇵' },
    { country: 'India', users: 15200, sessions: 24100, revenue: 9800, flag: '🇮🇳' },
    { country: 'USA', users: 8900, sessions: 14200, revenue: 15600, flag: '🇺🇸' },
    { country: 'UK', users: 3400, sessions: 5200, revenue: 4200, flag: '🇬🇧' },
    { country: 'Canada', users: 2800, sessions: 4300, revenue: 3800, flag: '🇨🇦' }
  ];

  const timeAnalytics: TimeAnalytics[] = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    users: Math.floor(Math.random() * 2000) + 500,
    streams: Math.floor(Math.random() * 150) + 20,
    interactions: Math.floor(Math.random() * 5000) + 1000
  }));

  return (
    <Layout title="User Behavior Analytics">
      <Head>
        <title>User Behavior Analytics - HaloBuzz Admin</title>
      </Head>

      {/* Header with filters */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Behavior Analytics</h1>
            <p className="text-gray-600 mt-1">Deep insights into user interactions and patterns</p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-4">
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="1d">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 3 Months</option>
            </select>
            <select
              value={selectedSegment}
              onChange={(e) => setSelectedSegment(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Users</option>
              <option value="new">New Users</option>
              <option value="returning">Returning Users</option>
              <option value="premium">Premium Users</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Behavior Metrics */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          title="Avg Session Duration"
          value={`${mockMetrics.sessionDuration} min`}
          change={12.5}
          icon={ClockIcon}
          color="blue"
        />
        <MetricCard
          title="Page Views"
          value={mockMetrics.pageViews.toLocaleString()}
          change={8.3}
          icon={EyeIcon}
          color="green"
        />
        <MetricCard
          title="Unique Visitors"
          value={mockMetrics.uniqueVisitors.toLocaleString()}
          change={-2.1}
          icon={UserIcon}
          color="purple"
        />
        <MetricCard
          title="Bounce Rate"
          value={`${mockMetrics.bounceRate}%`}
          change={-5.2}
          icon={ArrowTrendingDownIcon}
          color="orange"
        />
        <MetricCard
          title="Conversion Rate"
          value={`${mockMetrics.conversionRate}%`}
          change={15.7}
          icon={CurrencyDollarIcon}
          color="emerald"
        />
        <MetricCard
          title="Engagement Score"
          value={mockMetrics.engagementScore}
          change={9.8}
          icon={HeartIcon}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* User Flow Analysis */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">User Journey Flow</h3>
            <FunnelIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {userFlowData.map((step, index) => (
              <div key={step.step} className="relative">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{step.step}</div>
                      <div className="text-sm text-gray-500">{step.users.toLocaleString()} users</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">{step.conversionRate}%</div>
                    {index > 0 && (
                      <div className="text-sm text-red-600">-{step.dropoffRate}% dropoff</div>
                    )}
                  </div>
                </div>
                {index < userFlowData.length - 1 && (
                  <div className="flex justify-center py-2">
                    <ArrowTrendingDownIcon className="h-4 w-4 text-gray-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Time-based Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Activity by Hour</h3>
            <CalendarIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="grid grid-cols-6 gap-1">
            {timeAnalytics.map((hour) => (
              <div
                key={hour.hour}
                className="group relative p-2 rounded text-center cursor-pointer hover:bg-gray-50"
              >
                <div className="text-xs text-gray-500 mb-1">
                  {hour.hour.toString().padStart(2, '0')}:00
                </div>
                <div
                  className="w-full rounded"
                  style={{
                    height: `${Math.max(20, (hour.users / 2000) * 60)}px`,
                    backgroundColor: `rgba(59, 130, 246, ${hour.users / 2000})`
                  }}
                ></div>
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {hour.users} users<br />
                  {hour.streams} streams<br />
                  {hour.interactions} interactions
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Device Breakdown */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Device Usage</h3>
            <DevicePhoneMobileIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {deviceData.map((device) => (
              <div key={device.device} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    {device.device === 'Mobile' ? (
                      <DevicePhoneMobileIcon className="h-5 w-5 text-blue-600" />
                    ) : device.device === 'Desktop' ? (
                      <ComputerDesktopIcon className="h-5 w-5 text-blue-600" />
                    ) : (
                      <DevicePhoneMobileIcon className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{device.device}</div>
                    <div className="text-sm text-gray-500">{device.users.toLocaleString()} users</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-900">{device.avgDuration} min avg</div>
                  <div className="text-sm text-gray-500">{device.bounceRate}% bounce</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Geographic Distribution</h3>
            <MapPinIcon className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {geographicData.map((country) => (
              <div key={country.country} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{country.flag}</div>
                  <div>
                    <div className="font-medium text-gray-900">{country.country}</div>
                    <div className="text-sm text-gray-500">{country.users.toLocaleString()} users</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-green-600">${country.revenue.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">{country.sessions.toLocaleString()} sessions</div>
                </div>
              </div>
            ))}
          </div>
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
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
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
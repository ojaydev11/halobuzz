import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../../../components/Layout';
import {
  EyeIcon,
  CursorArrowRaysIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  ClockIcon,
  MapPinIcon,
  FunnelIcon,
  ArrowPathIcon,
  ChartBarIcon,
  FireIcon
} from '@heroicons/react/24/outline';

interface HeatmapData {
  x: number;
  y: number;
  intensity: number;
  clicks: number;
  duration: number;
  elementType: string;
}

interface PageMetrics {
  page: string;
  totalViews: number;
  uniqueVisitors: number;
  averageTime: number;
  bounceRate: number;
  heatmapData: HeatmapData[];
}

const mockHeatmapData: PageMetrics[] = [
  {
    page: 'Home Feed',
    totalViews: 125420,
    uniqueVisitors: 89320,
    averageTime: 245,
    bounceRate: 23.5,
    heatmapData: Array.from({ length: 50 }, (_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      intensity: Math.random(),
      clicks: Math.floor(Math.random() * 500),
      duration: Math.random() * 10,
      elementType: ['button', 'link', 'image', 'text'][Math.floor(Math.random() * 4)]
    }))
  },
  {
    page: 'Stream Player',
    totalViews: 89750,
    uniqueVisitors: 67890,
    averageTime: 1840,
    bounceRate: 15.2,
    heatmapData: Array.from({ length: 40 }, (_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      intensity: Math.random(),
      clicks: Math.floor(Math.random() * 800),
      duration: Math.random() * 15,
      elementType: ['button', 'video', 'chat', 'donation'][Math.floor(Math.random() * 4)]
    }))
  },
  {
    page: 'User Profile',
    totalViews: 45620,
    uniqueVisitors: 34780,
    averageTime: 180,
    bounceRate: 35.8,
    heatmapData: Array.from({ length: 30 }, (_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      intensity: Math.random(),
      clicks: Math.floor(Math.random() * 300),
      duration: Math.random() * 8,
      elementType: ['follow', 'message', 'image', 'stats'][Math.floor(Math.random() * 4)]
    }))
  }
];

const mockDeviceData = {
  mobile: { percentage: 78.5, sessions: 156420 },
  desktop: { percentage: 18.3, sessions: 36450 },
  tablet: { percentage: 3.2, sessions: 6380 }
};

const mockCountryData = [
  { country: 'Nepal', sessions: 89250, percentage: 45.2 },
  { country: 'India', sessions: 67890, percentage: 34.3 },
  { country: 'Bangladesh', sessions: 23450, percentage: 11.9 },
  { country: 'Pakistan', sessions: 12340, percentage: 6.2 },
  { country: 'Others', sessions: 4870, percentage: 2.4 }
];

export default function HeatmapsPage() {
  const [selectedPage, setSelectedPage] = useState('Home Feed');
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('7d');
  const [heatmapType, setHeatmapType] = useState('clicks');
  const [isLoading, setIsLoading] = useState(false);

  const currentPageData = mockHeatmapData.find(page => page.page === selectedPage) || mockHeatmapData[0];

  const refreshData = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
  };

  const getIntensityColor = (intensity: number) => {
    if (intensity > 0.8) return 'bg-red-500';
    if (intensity > 0.6) return 'bg-orange-500';
    if (intensity > 0.4) return 'bg-yellow-500';
    if (intensity > 0.2) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getIntensityOpacity = (intensity: number) => {
    return Math.max(0.1, intensity);
  };

  return (
    <Layout title="Heatmaps & User Behavior">
      <Head>
        <title>Heatmaps - HaloBuzz Admin</title>
      </Head>

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Heatmaps & User Behavior</h1>
            <p className="mt-1 text-sm text-gray-500">
              Analyze user interactions, click patterns, and engagement across your platform
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              onClick={refreshData}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <ArrowPathIcon className={`-ml-1 mr-2 h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Page</label>
            <select
              value={selectedPage}
              onChange={(e) => setSelectedPage(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500"
            >
              {mockHeatmapData.map(page => (
                <option key={page.page} value={page.page}>{page.page}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Device</label>
            <select
              value={deviceFilter}
              onChange={(e) => setDeviceFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Devices</option>
              <option value="mobile">Mobile</option>
              <option value="desktop">Desktop</option>
              <option value="tablet">Tablet</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Heatmap Type</label>
            <select
              value={heatmapType}
              onChange={(e) => setHeatmapType(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="clicks">Click Heatmap</option>
              <option value="scroll">Scroll Heatmap</option>
              <option value="attention">Attention Heatmap</option>
              <option value="movement">Movement Heatmap</option>
            </select>
          </div>
        </div>
      </div>

      {/* Page metrics */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <EyeIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Total Views</div>
              <div className="text-2xl font-bold text-gray-900">{currentPageData.totalViews.toLocaleString()}</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CursorArrowRaysIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Unique Visitors</div>
              <div className="text-2xl font-bold text-gray-900">{currentPageData.uniqueVisitors.toLocaleString()}</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Avg. Time</div>
              <div className="text-2xl font-bold text-gray-900">{Math.floor(currentPageData.averageTime / 60)}m {currentPageData.averageTime % 60}s</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Bounce Rate</div>
              <div className="text-2xl font-bold text-gray-900">{currentPageData.bounceRate}%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main heatmap */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                {heatmapType.charAt(0).toUpperCase() + heatmapType.slice(1)} Heatmap - {selectedPage}
              </h3>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <FireIcon className="h-4 w-4 text-red-500" />
                <span>Hot</span>
                <div className="w-20 h-2 bg-gradient-to-r from-blue-500 via-yellow-500 to-red-500 rounded"></div>
                <span>Cold</span>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ height: '500px' }}>
              {/* Simulated page layout */}
              <div className="absolute inset-0">
                {/* Header */}
                <div className="h-16 bg-gray-200 border-b border-gray-300"></div>

                {/* Main content area */}
                <div className="p-4 space-y-4">
                  <div className="h-8 bg-gray-300 rounded w-3/4"></div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="h-24 bg-gray-300 rounded"></div>
                    <div className="h-24 bg-gray-300 rounded"></div>
                    <div className="h-24 bg-gray-300 rounded"></div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-300 rounded w-full"></div>
                    <div className="h-4 bg-gray-300 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-300 rounded w-4/5"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-32 bg-gray-300 rounded"></div>
                    <div className="h-32 bg-gray-300 rounded"></div>
                  </div>
                </div>

                {/* Heatmap overlay */}
                {currentPageData.heatmapData.map((point, index) => (
                  <div
                    key={index}
                    className={`absolute w-8 h-8 rounded-full ${getIntensityColor(point.intensity)} pointer-events-none`}
                    style={{
                      left: `${point.x}%`,
                      top: `${point.y}%`,
                      opacity: getIntensityOpacity(point.intensity),
                      transform: 'translate(-50%, -50%)'
                    }}
                    title={`${point.clicks} clicks, ${point.duration.toFixed(1)}s duration`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Side panels */}
        <div className="space-y-6">
          {/* Device breakdown */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Device Breakdown</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <DevicePhoneMobileIcon className="h-5 w-5 text-gray-600 mr-2" />
                  <span className="text-sm text-gray-900">Mobile</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{mockDeviceData.mobile.percentage}%</div>
                  <div className="text-xs text-gray-500">{mockDeviceData.mobile.sessions.toLocaleString()} sessions</div>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${mockDeviceData.mobile.percentage}%` }}></div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ComputerDesktopIcon className="h-5 w-5 text-gray-600 mr-2" />
                  <span className="text-sm text-gray-900">Desktop</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{mockDeviceData.desktop.percentage}%</div>
                  <div className="text-xs text-gray-500">{mockDeviceData.desktop.sessions.toLocaleString()} sessions</div>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: `${mockDeviceData.desktop.percentage}%` }}></div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <DevicePhoneMobileIcon className="h-5 w-5 text-gray-600 mr-2 rotate-90" />
                  <span className="text-sm text-gray-900">Tablet</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{mockDeviceData.tablet.percentage}%</div>
                  <div className="text-xs text-gray-500">{mockDeviceData.tablet.sessions.toLocaleString()} sessions</div>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${mockDeviceData.tablet.percentage}%` }}></div>
              </div>
            </div>
          </div>

          {/* Geographic breakdown */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Geographic Distribution</h3>
            <div className="space-y-3">
              {mockCountryData.map((country, index) => (
                <div key={country.country} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <MapPinIcon className="h-4 w-4 text-gray-600 mr-2" />
                    <span className="text-sm text-gray-900">{country.country}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{country.percentage}%</div>
                    <div className="text-xs text-gray-500">{country.sessions.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top elements */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Most Clicked Elements</h3>
            <div className="space-y-3">
              {currentPageData.heatmapData
                .sort((a, b) => b.clicks - a.clicks)
                .slice(0, 5)
                .map((element, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900 capitalize">{element.elementType}</div>
                      <div className="text-xs text-gray-500">Position: {element.x.toFixed(0)}%, {element.y.toFixed(0)}%</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">{element.clicks}</div>
                      <div className="text-xs text-gray-500">clicks</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
import React from 'react';
import { useRealtimeData } from '../lib/hooks/useRealtimeData';
import { 
  ChartBarIcon, 
  UsersIcon, 
  CurrencyDollarIcon, 
  CpuChipIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

const RealtimeDashboard: React.FC = () => {
  const { data, isConnected, error, reconnect } = useRealtimeData();

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Real-time Connection</h2>
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
            ) : (
              <XCircleIcon className="h-5 w-5 text-red-500" />
            )}
            <span className={`text-sm font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
            {error && (
              <button
                onClick={reconnect}
                className="ml-2 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Reconnect
              </button>
            )}
          </div>
        </div>
        {error && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Users */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UsersIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatNumber(data.users.total)}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Online</p>
              <p className="text-lg font-semibold text-green-600">
                {formatNumber(data.users.online)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">New Today</p>
              <p className="text-lg font-semibold text-blue-600">
                {formatNumber(data.users.newToday)}
              </p>
            </div>
          </div>
        </div>

        {/* Games */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChartBarIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Game Plays</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatNumber(data.games.totalPlays)}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Active</p>
              <p className="text-lg font-semibold text-purple-600">
                {formatNumber(data.games.activeGames)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Revenue</p>
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(data.games.revenue)}
              </p>
            </div>
          </div>
        </div>

        {/* System */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CpuChipIcon className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">System Load</p>
              <p className="text-2xl font-semibold text-gray-900">
                {data.system.cpu.toFixed(1)}%
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500">Memory</p>
              <p className="text-lg font-semibold text-orange-600">
                {data.system.memory.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Uptime</p>
              <p className="text-lg font-semibold text-blue-600">
                {Math.floor(data.system.uptime / 3600)}h
              </p>
            </div>
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(data.games.revenue)}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((data.games.revenue / 10000) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Target: $10,000</p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Notifications</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {data.notifications.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              <ExclamationTriangleIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p>No notifications yet</p>
            </div>
          ) : (
            data.notifications.map((notification) => (
              <div key={notification.id} className="px-6 py-4">
                <div className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${getSeverityColor(notification.severity).split(' ')[1]}`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {notification.timestamp.toLocaleString()}
                    </p>
                  </div>
                  <div className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(notification.severity)}`}>
                    {notification.severity}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RealtimeDashboard;

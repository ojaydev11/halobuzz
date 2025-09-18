import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../../../components/Layout';
import {
  CpuChipIcon,
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BoltIcon,
  BeakerIcon,
  CogIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline';

interface AIMetrics {
  timestamp: string;
  responseTime: number;
  accuracy: number;
  throughput: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  activeQueries: number;
}

interface AIModel {
  id: string;
  name: string;
  version: string;
  status: 'active' | 'training' | 'disabled';
  accuracy: number;
  lastTraining: string;
  requestsProcessed: number;
  averageLatency: number;
}

const mockMetrics: AIMetrics[] = Array.from({ length: 24 }, (_, i) => ({
  timestamp: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
  responseTime: 150 + Math.random() * 100,
  accuracy: 85 + Math.random() * 10,
  throughput: 450 + Math.random() * 200,
  errorRate: Math.random() * 5,
  cpuUsage: 40 + Math.random() * 40,
  memoryUsage: 30 + Math.random() * 50,
  activeQueries: Math.floor(Math.random() * 100)
}));

const mockModels: AIModel[] = [
  {
    id: '1',
    name: 'Content Moderation Model',
    version: 'v2.3.1',
    status: 'active',
    accuracy: 94.5,
    lastTraining: '2024-09-15T10:30:00Z',
    requestsProcessed: 125000,
    averageLatency: 120
  },
  {
    id: '2',
    name: 'Recommendation Engine',
    version: 'v1.8.2',
    status: 'active',
    accuracy: 87.2,
    lastTraining: '2024-09-12T14:20:00Z',
    requestsProcessed: 89000,
    averageLatency: 95
  },
  {
    id: '3',
    name: 'Fraud Detection Model',
    version: 'v3.1.0',
    status: 'training',
    accuracy: 91.8,
    lastTraining: '2024-09-18T08:45:00Z',
    requestsProcessed: 67000,
    averageLatency: 180
  },
  {
    id: '4',
    name: 'User Behavior Analysis',
    version: 'v1.5.4',
    status: 'active',
    accuracy: 89.3,
    lastTraining: '2024-09-10T16:15:00Z',
    requestsProcessed: 156000,
    averageLatency: 85
  }
];

export default function AIPerformancePage() {
  const [timeRange, setTimeRange] = useState('24h');
  const [selectedModel, setSelectedModel] = useState('all');
  const [realTimeData, setRealTimeData] = useState({
    currentLoad: 67,
    activeModels: 4,
    queriesPerSecond: 45,
    averageResponseTime: 132,
    successRate: 98.7,
    errorRate: 1.3
  });

  const currentMetrics = mockMetrics[mockMetrics.length - 1];

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setRealTimeData(prev => ({
        ...prev,
        currentLoad: Math.max(0, Math.min(100, prev.currentLoad + (Math.random() - 0.5) * 10)),
        queriesPerSecond: Math.max(0, prev.queriesPerSecond + (Math.random() - 0.5) * 20),
        averageResponseTime: Math.max(50, prev.averageResponseTime + (Math.random() - 0.5) * 30),
        successRate: Math.max(90, Math.min(100, prev.successRate + (Math.random() - 0.5) * 2)),
        errorRate: Math.max(0, Math.min(10, prev.errorRate + (Math.random() - 0.5) * 2))
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'training':
        return 'text-blue-600 bg-blue-100';
      case 'disabled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getPerformanceColor = (value: number, threshold: { good: number; warning: number }) => {
    if (value >= threshold.good) return 'text-green-600';
    if (value >= threshold.warning) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Layout title="AI Performance Monitoring">
      <Head>
        <title>AI Performance - HaloBuzz Admin</title>
      </Head>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">AI Performance Monitoring</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor AI models, performance metrics, and system health in real-time
        </p>
      </div>

      {/* Real-time status */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">System Status</h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Live</span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="text-center">
            <div className={`text-2xl font-bold ${getPerformanceColor(realTimeData.currentLoad, { good: 80, warning: 60 })}`}>
              {realTimeData.currentLoad.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500">System Load</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{realTimeData.activeModels}</div>
            <div className="text-xs text-gray-500">Active Models</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{realTimeData.queriesPerSecond.toFixed(0)}</div>
            <div className="text-xs text-gray-500">Queries/sec</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${getPerformanceColor(200 - realTimeData.averageResponseTime, { good: 100, warning: 50 })}`}>
              {realTimeData.averageResponseTime.toFixed(0)}ms
            </div>
            <div className="text-xs text-gray-500">Avg Response</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${getPerformanceColor(realTimeData.successRate, { good: 95, warning: 90 })}`}>
              {realTimeData.successRate.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">Success Rate</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${getPerformanceColor(10 - realTimeData.errorRate, { good: 8, warning: 5 })}`}>
              {realTimeData.errorRate.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-500">Error Rate</div>
          </div>
        </div>
      </div>

      {/* Performance metrics cards */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Throughput</div>
              <div className="text-2xl font-bold text-gray-900">{currentMetrics.throughput.toFixed(0)}</div>
              <div className="text-xs text-gray-500">requests/minute</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Response Time</div>
              <div className="text-2xl font-bold text-gray-900">{currentMetrics.responseTime.toFixed(0)}ms</div>
              <div className="text-xs text-gray-500">average latency</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Accuracy</div>
              <div className="text-2xl font-bold text-gray-900">{currentMetrics.accuracy.toFixed(1)}%</div>
              <div className="text-xs text-gray-500">model accuracy</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500">Error Rate</div>
              <div className="text-2xl font-bold text-gray-900">{currentMetrics.errorRate.toFixed(2)}%</div>
              <div className="text-xs text-gray-500">errors/requests</div>
            </div>
          </div>
        </div>
      </div>

      {/* Models status */}
      <div className="mb-6 bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">AI Models Status</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {mockModels.map((model) => (
              <div key={model.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <CpuChipIcon className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-gray-900">{model.name}</h4>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(model.status)}`}>
                        {model.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">Version {model.version}</div>
                    <div className="text-xs text-gray-400">
                      Last training: {new Date(model.lastTraining).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-8">
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900">{model.accuracy}%</div>
                    <div className="text-xs text-gray-500">Accuracy</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900">{model.requestsProcessed.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">Requests</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-900">{model.averageLatency}ms</div>
                    <div className="text-xs text-gray-500">Latency</div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      <CogIcon className="h-4 w-4" />
                    </button>
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      <CommandLineIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response time chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Response Time Trends</h3>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <ChartBarIcon className="mx-auto h-12 w-12 mb-2" />
              <p>Response Time Chart</p>
              <p className="text-sm">(Chart implementation would go here)</p>
            </div>
          </div>
        </div>

        {/* Accuracy trends */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Model Accuracy Trends</h3>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-2 py-1"
            >
              <option value="all">All Models</option>
              {mockModels.map(model => (
                <option key={model.id} value={model.id}>{model.name}</option>
              ))}
            </select>
          </div>
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <ArrowTrendingUpIcon className="mx-auto h-12 w-12 mb-2" />
              <p>Accuracy Trends Chart</p>
              <p className="text-sm">(Chart implementation would go here)</p>
            </div>
          </div>
        </div>

        {/* System resources */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Resources</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>CPU Usage</span>
                <span>{currentMetrics.cpuUsage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${currentMetrics.cpuUsage}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Memory Usage</span>
                <span>{currentMetrics.memoryUsage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${currentMetrics.memoryUsage}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Active Queries</span>
                <span>{currentMetrics.activeQueries}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{ width: `${(currentMetrics.activeQueries / 100) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent alerts */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Alerts</h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-yellow-800">High Response Time</div>
                <div className="text-xs text-yellow-700">Content Moderation Model exceeding 200ms threshold</div>
                <div className="text-xs text-yellow-600">2 minutes ago</div>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <BeakerIcon className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-blue-800">Model Training Started</div>
                <div className="text-xs text-blue-700">Fraud Detection Model v3.1.0 training initiated</div>
                <div className="text-xs text-blue-600">15 minutes ago</div>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-green-800">System Health Normal</div>
                <div className="text-xs text-green-700">All models operating within normal parameters</div>
                <div className="text-xs text-green-600">1 hour ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
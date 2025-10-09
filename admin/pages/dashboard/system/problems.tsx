import Head from 'next/head';
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import Layout from '../../../components/Layout';
import {
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  ServerIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  BellIcon,
  BellSlashIcon,
  ChartBarIcon,
  CpuChipIcon,
  CircleStackIcon,
  SignalIcon,
  FireIcon,
  EyeIcon,
  UserGroupIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'system' | 'security' | 'performance' | 'user' | 'financial';
  status: 'active' | 'acknowledged' | 'resolved';
  createdAt: string;
  lastUpdated: string;
  affectedUsers?: number;
  estimatedImpact?: string;
  source: string;
  tags: string[];
}

interface SystemHealth {
  overall: number;
  categories: {
    performance: number;
    security: number;
    availability: number;
    userExperience: number;
  };
}

interface MetricAlert {
  metric: string;
  current: number;
  threshold: number;
  trend: 'up' | 'down' | 'stable';
  status: 'normal' | 'warning' | 'critical';
}

export default function ProblemsAndAlerts() {
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const { data: alertsData, error } = useSWR('/api/admin/system/alerts', fetcher);

  // Mock data for demonstration
  const mockAlerts: Alert[] = [
    {
      id: 'alert-001',
      title: 'High Memory Usage on Stream Server',
      description: 'Memory usage on stream-server-03 has exceeded 85% for the past 15 minutes',
      severity: 'critical',
      category: 'system',
      status: 'active',
      createdAt: new Date(Date.now() - 900000).toISOString(),
      lastUpdated: new Date(Date.now() - 300000).toISOString(),
      affectedUsers: 1247,
      estimatedImpact: 'Stream quality degradation',
      source: 'Infrastructure Monitor',
      tags: ['memory', 'server', 'performance']
    },
    {
      id: 'alert-002',
      title: 'Unusual Login Pattern Detected',
      description: 'Multiple failed login attempts from suspicious IP addresses',
      severity: 'high',
      category: 'security',
      status: 'acknowledged',
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      lastUpdated: new Date(Date.now() - 600000).toISOString(),
      affectedUsers: 23,
      estimatedImpact: 'Potential account security risk',
      source: 'Security Monitor',
      tags: ['security', 'authentication', 'brute-force']
    },
    {
      id: 'alert-003',
      title: 'Database Connection Pool Exhausted',
      description: 'All database connections are in use, new requests may timeout',
      severity: 'medium',
      category: 'performance',
      status: 'active',
      createdAt: new Date(Date.now() - 600000).toISOString(),
      lastUpdated: new Date(Date.now() - 120000).toISOString(),
      affectedUsers: 567,
      estimatedImpact: 'Slower response times',
      source: 'Database Monitor',
      tags: ['database', 'connections', 'performance']
    },
    {
      id: 'alert-004',
      title: 'Payment Processing Delays',
      description: 'Gift purchases are taking longer than usual to process',
      severity: 'high',
      category: 'financial',
      status: 'active',
      createdAt: new Date(Date.now() - 450000).toISOString(),
      lastUpdated: new Date(Date.now() - 60000).toISOString(),
      affectedUsers: 89,
      estimatedImpact: 'Revenue loss, user frustration',
      source: 'Payment Gateway',
      tags: ['payments', 'latency', 'revenue']
    },
    {
      id: 'alert-005',
      title: 'Content Moderation Queue Backlog',
      description: 'Reported content queue has grown beyond normal capacity',
      severity: 'medium',
      category: 'user',
      status: 'resolved',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      lastUpdated: new Date(Date.now() - 1800000).toISOString(),
      affectedUsers: 234,
      estimatedImpact: 'Delayed content review',
      source: 'Moderation System',
      tags: ['moderation', 'content', 'queue']
    }
  ];

  const systemHealth: SystemHealth = {
    overall: 87,
    categories: {
      performance: 92,
      security: 95,
      availability: 88,
      userExperience: 75
    }
  };

  const metricAlerts: MetricAlert[] = [
    { metric: 'CPU Usage', current: 78, threshold: 80, trend: 'up', status: 'warning' },
    { metric: 'Memory Usage', current: 89, threshold: 85, trend: 'up', status: 'critical' },
    { metric: 'Disk Usage', current: 67, threshold: 90, trend: 'stable', status: 'normal' },
    { metric: 'Network Latency', current: 245, threshold: 200, trend: 'up', status: 'warning' },
    { metric: 'Error Rate', current: 0.8, threshold: 1.0, trend: 'down', status: 'normal' },
    { metric: 'Response Time', current: 1.2, threshold: 2.0, trend: 'stable', status: 'normal' }
  ];

  const filteredAlerts = mockAlerts.filter(alert => {
    const severityMatch = selectedSeverity === 'all' || alert.severity === selectedSeverity;
    const categoryMatch = selectedCategory === 'all' || alert.category === selectedCategory;
    return severityMatch && categoryMatch;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'info': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-red-600';
      case 'acknowledged': return 'text-yellow-600';
      case 'resolved': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'system': return ServerIcon;
      case 'security': return ShieldExclamationIcon;
      case 'performance': return ChartBarIcon;
      case 'user': return UserGroupIcon;
      case 'financial': return CurrencyDollarIcon;
      default: return InformationCircleIcon;
    }
  };

  return (
    <Layout title="Problems & Alerts">
      <Head>
        <title>Problems & Alerts - HaloBuzz Admin</title>
      </Head>

      {/* Header with controls */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Problems & Alerts</h1>
            <p className="text-gray-600 mt-1">Monitor system health and critical issues</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center space-x-4">
            <button
              onClick={() => setAlertsEnabled(!alertsEnabled)}
              className={`flex items-center px-4 py-2 rounded-lg border ${
                alertsEnabled
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-gray-50 text-gray-700 border-gray-200'
              }`}
            >
              {alertsEnabled ? (
                <BellIcon className="h-4 w-4 mr-2" />
              ) : (
                <BellSlashIcon className="h-4 w-4 mr-2" />
              )}
              Alerts {alertsEnabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">System Health Overview</h3>
          <div className={`text-2xl font-bold ${
            systemHealth.overall >= 90 ? 'text-green-600' :
            systemHealth.overall >= 70 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {systemHealth.overall}%
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Object.entries(systemHealth.categories).map(([category, score]) => (
            <div key={category} className="text-center p-4 bg-gray-50 rounded-lg">
              <div className={`text-xl font-semibold mb-2 ${
                score >= 90 ? 'text-green-600' :
                score >= 70 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {score}%
              </div>
              <div className="text-sm text-gray-600 capitalize">{category.replace(/([A-Z])/g, ' $1')}</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full ${
                    score >= 90 ? 'bg-green-500' :
                    score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${score}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Real-time Metrics */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Real-time Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metricAlerts.map((metric) => (
            <div key={metric.metric} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">{metric.metric}</span>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  metric.status === 'critical' ? 'bg-red-100 text-red-800' :
                  metric.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {metric.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-900">
                  {metric.current}
                  {metric.metric.includes('Usage') ? '%' : metric.metric.includes('Time') ? 's' : 'ms'}
                </span>
                <span className="text-sm text-gray-500">
                  Threshold: {metric.threshold}
                  {metric.metric.includes('Usage') ? '%' : metric.metric.includes('Time') ? 's' : 'ms'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full ${
                    metric.status === 'critical' ? 'bg-red-500' :
                    metric.status === 'warning' ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, (metric.current / metric.threshold) * 100)}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="info">Info</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="system">System</option>
              <option value="security">Security</option>
              <option value="performance">Performance</option>
              <option value="user">User</option>
              <option value="financial">Financial</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Active Alerts ({filteredAlerts.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredAlerts.map((alert) => {
            const CategoryIcon = getCategoryIcon(alert.category);
            return (
              <div key={alert.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className={`p-2 rounded-lg ${
                      alert.severity === 'critical' ? 'bg-red-100' :
                      alert.severity === 'high' ? 'bg-orange-100' :
                      alert.severity === 'medium' ? 'bg-yellow-100' :
                      'bg-blue-100'
                    }`}>
                      <CategoryIcon className={`h-5 w-5 ${
                        alert.severity === 'critical' ? 'text-red-600' :
                        alert.severity === 'high' ? 'text-orange-600' :
                        alert.severity === 'medium' ? 'text-yellow-600' :
                        'text-blue-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-lg font-medium text-gray-900">{alert.title}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full border ${getSeverityColor(alert.severity)}`}>
                          {alert.severity}
                        </span>
                        <span className={`text-sm font-medium ${getStatusColor(alert.status)}`}>
                          {alert.status}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-2">{alert.description}</p>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {alert.tags.map((tag) => (
                          <span key={tag} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="text-sm text-gray-500 space-y-1">
                        <div>Source: {alert.source}</div>
                        {alert.affectedUsers && (
                          <div>Affected users: {alert.affectedUsers.toLocaleString()}</div>
                        )}
                        {alert.estimatedImpact && (
                          <div>Impact: {alert.estimatedImpact}</div>
                        )}
                        <div>Created: {new Date(alert.createdAt).toLocaleString()}</div>
                        <div>Last updated: {new Date(alert.lastUpdated).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2">
                    {alert.status === 'active' && (
                      <button className="px-3 py-1 text-sm bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200">
                        Acknowledge
                      </button>
                    )}
                    {alert.status !== 'resolved' && (
                      <button className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200">
                        Resolve
                      </button>
                    )}
                    <button className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded hover:bg-gray-200">
                      Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
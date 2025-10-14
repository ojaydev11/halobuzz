import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import { Bar, Doughnut } from 'react-chartjs-2';

interface EmpireSummary {
  totalApps: number;
  totalRevenue: number;
  totalDAU: number;
  totalMAU: number;
  avgARPU: number;
  avgPayerRate: number;
  totalAlerts: number;
  activeAlerts: number;
  avgSafetyScore: number;
  overallGrowthRate: number;
}

interface AppData {
  appId: string;
  totalRevenue: number;
  totalDAU: number;
  totalMAU: number;
  avgARPU: number;
  avgPayerRate: number;
  totalAlerts: number;
  activeAlerts: number;
  safetyScore: number;
  growthRate: number;
}

interface EmpireDashboardData {
  summary: EmpireSummary;
  apps: AppData[];
  period: {
    from: string;
    to: string;
  };
  generatedAt: string;
}

const EmpirePage: NextPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  
  const [dashboardData, setDashboardData] = useState<EmpireDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Date range state
  const [fromDate, setFromDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  
  const [toDate, setToDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  
  const [selectedCountry, setSelectedCountry] = useState('ALL');

  const countries = ['ALL', 'NP', 'US', 'IN', 'BD', 'LK'];

  useEffect(() => {
    if (!user || !user.roles.includes('admin')) {
      router.push('/login');
      return;
    }

    fetchEmpireData();
  }, [user, fromDate, toDate, selectedCountry]);

  const fetchEmpireData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/api/v1/ai/business/empire-dashboard', {
        params: {
          from: fromDate,
          to: toDate,
          country: selectedCountry === 'ALL' ? undefined : selectedCountry
        }
      });
      
      setDashboardData(response.data);
    } catch (err: any) {
      console.error('Error fetching empire data:', err);
      setError(err.response?.data?.message || 'Failed to fetch empire data');
    } finally {
      setLoading(false);
    }
  };

  const generateEmpireReport = async (format: 'pdf' | 'xlsx') => {
    try {
      const response = await api.post('/api/v1/ai/business/reports/generate', {
        period: 'custom',
        format: format,
        country: selectedCountry,
        from: fromDate,
        to: toDate,
        empire: true // Special flag for empire reports
      });
      
      if (typeof window !== 'undefined') {
        window.open(response.data.downloadUrl, '_blank');
      }
    } catch (err: any) {
      alert('Failed to generate empire report: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
          <button 
            onClick={fetchEmpireData}
            className="ml-4 bg-red-500 text-white px-3 py-1 rounded text-sm"
          >
            Retry
          </button>
        </div>
      </Layout>
    );
  }

  // Chart data
  const revenueByAppData = {
    labels: dashboardData?.apps.map(app => app.appId) || [],
    datasets: [
      {
        label: 'Revenue by App',
        data: dashboardData?.apps.map(app => app.totalRevenue) || [],
        backgroundColor: [
          'rgba(147, 51, 234, 0.8)', // Purple
          'rgba(59, 130, 246, 0.8)',  // Blue
          'rgba(16, 185, 129, 0.8)',  // Green
          'rgba(245, 158, 11, 0.8)',  // Yellow
          'rgba(239, 68, 68, 0.8)',   // Red
        ],
        borderColor: [
          'rgba(147, 51, 234, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const dauByAppData = {
    labels: dashboardData?.apps.map(app => app.appId) || [],
    datasets: [
      {
        label: 'Daily Active Users',
        data: dashboardData?.apps.map(app => app.totalDAU) || [],
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Empire Dashboard</h1>
            <p className="text-gray-600">Multi-app analytics aggregation</p>
          </div>
          <div className="flex space-x-4">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            />
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              {countries.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
            <button
              onClick={() => generateEmpireReport('pdf')}
              className="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600"
            >
              Empire PDF
            </button>
            <button
              onClick={() => generateEmpireReport('xlsx')}
              className="bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-600"
            >
              Empire Excel
            </button>
          </div>
        </div>

        {/* Empire Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-white bg-opacity-30 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold">#</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-purple-100 truncate">Total Apps</dt>
                    <dd className="text-lg font-medium text-white">
                      {dashboardData?.summary.totalApps || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-white bg-opacity-30 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold">$</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-green-100 truncate">Total Revenue</dt>
                    <dd className="text-lg font-medium text-white">
                      ${(dashboardData?.summary.totalRevenue || 0).toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-500 to-blue-600 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-white bg-opacity-30 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold">U</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-blue-100 truncate">Total DAU</dt>
                    <dd className="text-lg font-medium text-white">
                      {(dashboardData?.summary.totalDAU || 0).toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-white bg-opacity-30 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold">A</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-yellow-100 truncate">Avg ARPU</dt>
                    <dd className="text-lg font-medium text-white">
                      ${(dashboardData?.summary.avgARPU || 0).toFixed(2)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-red-500 to-red-600 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-white bg-opacity-30 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold">!</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-red-100 truncate">Active Alerts</dt>
                    <dd className="text-lg font-medium text-white">
                      {dashboardData?.summary.activeAlerts || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue by App</h3>
            <Bar data={revenueByAppData} />
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">DAU Distribution</h3>
            <Doughnut data={dauByAppData} />
          </div>
        </div>

        {/* App Details Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">App Performance Details</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Detailed metrics for each application in the empire
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    App ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    DAU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ARPU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payer Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Safety Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alerts
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dashboardData?.apps.map((app) => (
                  <tr key={app.appId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {app.appId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${app.totalRevenue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {app.totalDAU.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${app.avgARPU.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {app.avgPayerRate.toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full mr-2 ${
                          app.safetyScore >= 0.9 ? 'bg-green-500' :
                          app.safetyScore >= 0.7 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                        {(app.safetyScore * 100).toFixed(1)}%
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        app.activeAlerts === 0 ? 'bg-green-100 text-green-800' :
                        app.activeAlerts <= 2 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {app.activeAlerts} active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Period Info */}
        <div className="bg-gray-50 px-4 py-3 rounded-md">
          <p className="text-sm text-gray-600">
            Data period: {dashboardData?.period.from} to {dashboardData?.period.to} • 
            Generated at: {dashboardData?.generatedAt ? new Date(dashboardData.generatedAt).toLocaleString() : 'N/A'}
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default EmpirePage;

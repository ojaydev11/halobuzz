import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface KPIData {
  revenue: {
    totalRevenue: number;
    byCountry: Record<string, number>;
    byPaymentMethod: Record<string, number>;
    byOGTier: Record<string, number>;
  };
  engagement: {
    dailyActiveUsers: number;
    monthlyActiveUsers: number;
    avgLiveLength: number;
    avgViewersPerSession: number;
    battleParticipation: number;
  };
  monetization: {
    arpu: number;
    arppu: number;
    payerRate: number;
    giftVolume: number;
    coinTopups: number;
  };
  retention: {
    d1Retention: number;
    d7Retention: number;
    d30Retention: number;
  };
  safety: {
    flaggedContentRate: number;
    bans: number;
    appeals: number;
  };
  gaming: {
    gamesPlayed: number;
    totalStake: number;
    totalPayout: number;
    houseEdge: number;
  };
}

interface Alert {
  alertId: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  status: string;
  title: string;
  description: string;
  currentValue: number;
  thresholdValue: number;
  deviation: number;
  country: string;
  rootCause?: string;
  suggestion?: string;
  createdAt: string;
}

const BusinessAnalyticsPage: NextPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState('ALL');
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const [error, setError] = useState<string | null>(null);

  const countries = ['ALL', 'NP', 'US', 'IN', 'BD', 'LK'];
  const periods = ['daily', 'weekly', 'monthly'];

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/login');
      return;
    }
    
    fetchData();
  }, [user, selectedCountry, selectedPeriod]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch KPI data
      const kpiResponse = await api.get('/api/v1/ai/business/kpis', {
        params: {
          country: selectedCountry,
          period: selectedPeriod
        }
      });
      setKpiData(kpiResponse.data.kpis);

      // Fetch active alerts
      const alertsResponse = await api.get('/api/v1/ai/business/alerts', {
        params: {
          status: 'active',
          country: selectedCountry === 'ALL' ? undefined : selectedCountry,
          limit: 10
        }
      });
      setAlerts(alertsResponse.data.alerts);

    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const generateNarrative = async () => {
    try {
      const response = await api.post('/api/v1/ai/business/narratives/generate', {
        period: selectedPeriod,
        country: selectedCountry,
        comparePeriod: 'previous_period'
      });
      
      alert(`Business Narrative:\n\n${response.data.narratives.short}\n\n${response.data.narratives.long}`);
    } catch (err: any) {
      alert('Failed to generate narrative: ' + (err.response?.data?.message || err.message));
    }
  };

  const generateReport = async (format: 'pdf' | 'xlsx') => {
    try {
      const response = await api.post('/api/v1/ai/business/reports/generate', {
        period: selectedPeriod,
        format: format,
        country: selectedCountry
      });
      
      // Open download URL in new tab
      window.open(response.data.downloadUrl, '_blank');
    } catch (err: any) {
      alert('Failed to generate report: ' + (err.response?.data?.message || err.message));
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await api.post(`/api/v1/ai/business/alerts/${alertId}/acknowledge`, {
        acknowledgedBy: user?.id,
        notes: 'Acknowledged from dashboard'
      });
      
      fetchData(); // Refresh data
    } catch (err: any) {
      alert('Failed to acknowledge alert: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
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
            onClick={fetchData}
            className="ml-4 bg-red-500 text-white px-3 py-1 rounded text-sm"
          >
            Retry
          </button>
        </div>
      </Layout>
    );
  }

  // Chart configurations
  const revenueChartData = {
    labels: Object.keys(kpiData?.revenue.byCountry || {}),
    datasets: [
      {
        label: 'Revenue by Country',
        data: Object.values(kpiData?.revenue.byCountry || {}),
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 205, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
        ],
      },
    ],
  };

  const retentionChartData = {
    labels: ['D1 Retention', 'D7 Retention', 'D30 Retention'],
    datasets: [
      {
        label: 'Retention Rates',
        data: [
          kpiData?.retention.d1Retention || 0,
          kpiData?.retention.d7Retention || 0,
          kpiData?.retention.d30Retention || 0,
        ],
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Business Analytics</h1>
          <div className="flex space-x-4">
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              {countries.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2"
            >
              {periods.map(period => (
                <option key={period} value={period}>{period}</option>
              ))}
            </select>
            <button
              onClick={generateNarrative}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
            >
              Generate Narrative
            </button>
            <button
              onClick={() => generateReport('pdf')}
              className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
            >
              PDF Report
            </button>
            <button
              onClick={() => generateReport('xlsx')}
              className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600"
            >
              Excel Report
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold">$</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Revenue</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      ${(kpiData?.revenue.totalRevenue || 0).toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold">U</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Daily Active Users</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {(kpiData?.engagement.dailyActiveUsers || 0).toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold">A</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">ARPU</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      ${(kpiData?.monetization.arpu || 0).toFixed(2)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                    <span className="text-white font-bold">%</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Payer Rate</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {((kpiData?.monetization.payerRate || 0) * 100).toFixed(1)}%
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue by Country</h3>
            <Doughnut data={revenueChartData} />
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">User Retention</h3>
            <Bar data={retentionChartData} />
          </div>
        </div>

        {/* Active Alerts */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Active Alerts</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Current system alerts with AI-powered root cause analysis
            </p>
          </div>
          <ul className="divide-y divide-gray-200">
            {alerts.length === 0 ? (
              <li className="px-4 py-4 text-gray-500">No active alerts</li>
            ) : (
              alerts.map((alert) => (
                <li key={alert.alertId} className="px-4 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 w-4 h-4 rounded-full ${
                        alert.severity === 'high' ? 'bg-red-500' :
                        alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}></div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                        <p className="text-sm text-gray-500">{alert.description}</p>
                        {alert.rootCause && (
                          <p className="text-sm text-blue-600 mt-1">
                            <strong>Root Cause:</strong> {alert.rootCause}
                          </p>
                        )}
                        {alert.suggestion && (
                          <p className="text-sm text-green-600 mt-1">
                            <strong>Suggestion:</strong> {alert.suggestion}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {alert.currentValue} / {alert.thresholdValue}
                      </span>
                      <button
                        onClick={() => acknowledgeAlert(alert.alertId)}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                      >
                        Acknowledge
                      </button>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default BusinessAnalyticsPage;

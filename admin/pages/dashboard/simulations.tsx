import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Line } from 'react-chartjs-2';

interface SimulationRequest {
  scenario: 'double_gift_multiplier' | 'price_change_coin_pack' | 'og_tier_promo' | 'festival_skin_push';
  params?: Record<string, number | string>;
  segment?: { country?: string; og?: string };
  horizonDays: number;
}

interface SimulationResult {
  simulationId: string;
  scenario: string;
  projectedKpis: Array<{ date: string; kpis: any }>;
  baselineKpis: Array<{ date: string; kpis: any }>;
  deltaVsBaseline: any;
  insights: string[];
  generatedAt: string;
}

interface HistoricalSimulation {
  simulationId: string;
  scenario: string;
  params: Record<string, any>;
  segment: Record<string, any>;
  horizonDays: number;
  insights: string[];
  createdAt: string;
}

const SimulationsPage: NextPage = () => {
  const { user } = useAuth();
  const router = useRouter();
  
  const [currentSimulation, setCurrentSimulation] = useState<SimulationResult | null>(null);
  const [historicalSimulations, setHistoricalSimulations] = useState<HistoricalSimulation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [scenario, setScenario] = useState<SimulationRequest['scenario']>('double_gift_multiplier');
  const [horizonDays, setHorizonDays] = useState(7);
  const [country, setCountry] = useState('');
  const [ogTier, setOgTier] = useState('');
  const [multiplier, setMultiplier] = useState(2.0);
  const [priceChange, setPriceChange] = useState(10);
  const [discountPercent, setDiscountPercent] = useState(20);

  const scenarios = [
    { value: 'double_gift_multiplier', label: 'Double Gift Multiplier' },
    { value: 'price_change_coin_pack', label: 'Coin Pack Price Change' },
    { value: 'og_tier_promo', label: 'OG Tier Promotion' },
    { value: 'festival_skin_push', label: 'Festival Skin Push' },
  ];

  const countries = ['', 'NP', 'US', 'IN', 'BD', 'LK'];
  const ogTiers = ['', 'tier1', 'tier2', 'tier3'];

  useEffect(() => {
    if (!user || !user.roles.includes('admin')) {
      router.push('/login');
      return;
    }

    fetchHistoricalSimulations();
  }, [user]);

  const fetchHistoricalSimulations = async () => {
    try {
      const response = await api.get('/api/v1/ai/business/simulations', {
        params: { limit: 10 }
      });
      setHistoricalSimulations(response.data.simulations);
    } catch (err: any) {
      console.error('Error fetching historical simulations:', err);
    }
  };

  const runSimulation = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params: Record<string, number | string> = {};
      
      // Set params based on scenario
      switch (scenario) {
        case 'double_gift_multiplier':
          params.multiplier = multiplier;
          break;
        case 'price_change_coin_pack':
          params.priceChange = priceChange;
          break;
        case 'og_tier_promo':
          params.discountPercent = discountPercent;
          break;
        case 'festival_skin_push':
          params.durationDays = horizonDays;
          break;
      }

      const segment: Record<string, string> = {};
      if (country) segment.country = country;
      if (ogTier) segment.og = ogTier;

      const request: SimulationRequest = {
        scenario,
        params: Object.keys(params).length > 0 ? params : undefined,
        segment: Object.keys(segment).length > 0 ? segment : undefined,
        horizonDays
      };

      const response = await api.post('/api/v1/ai/business/simulate', request);
      setCurrentSimulation(response.data);
      
      // Refresh historical simulations
      fetchHistoricalSimulations();
      
    } catch (err: any) {
      console.error('Error running simulation:', err);
      setError(err.response?.data?.message || 'Failed to run simulation');
    } finally {
      setLoading(false);
    }
  };

  const getChartData = () => {
    if (!currentSimulation) return null;

    const dates = currentSimulation.projectedKpis.map(item => 
      new Date(item.date).toLocaleDateString()
    );
    
    const projectedRevenue = currentSimulation.projectedKpis.map(item => 
      item.kpis.revenue?.totalRevenue || 0
    );
    
    const baselineRevenue = currentSimulation.baselineKpis.map(item => 
      item.kpis.revenue?.totalRevenue || 0
    );

    return {
      labels: dates,
      datasets: [
        {
          label: 'Projected Revenue',
          data: projectedRevenue,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.1,
        },
        {
          label: 'Baseline Revenue',
          data: baselineRevenue,
          borderColor: 'rgb(156, 163, 175)',
          backgroundColor: 'rgba(156, 163, 175, 0.1)',
          tension: 0.1,
        },
      ],
    };
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Business Simulations</h1>
        </div>

        {/* Simulation Form */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Run New Simulation</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Scenario Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Scenario</label>
              <select
                value={scenario}
                onChange={(e) => setScenario(e.target.value as SimulationRequest['scenario'])}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              >
                {scenarios.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Horizon Days */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Horizon (Days)</label>
              <input
                type="number"
                value={horizonDays}
                onChange={(e) => setHorizonDays(Number(e.target.value))}
                min={7}
                max={60}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>

            {/* Country Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700">Country (Optional)</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">All Countries</option>
                {countries.slice(1).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* OG Tier Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700">OG Tier (Optional)</label>
              <select
                value={ogTier}
                onChange={(e) => setOgTier(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">All Tiers</option>
                {ogTiers.slice(1).map(t => (
                  <option key={t} value={t}>{t.toUpperCase()}</option>
                ))}
              </select>
            </div>

            {/* Scenario-specific parameters */}
            {scenario === 'double_gift_multiplier' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Multiplier</label>
                <input
                  type="number"
                  value={multiplier}
                  onChange={(e) => setMultiplier(Number(e.target.value))}
                  min={0.1}
                  max={5.0}
                  step={0.1}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            )}

            {scenario === 'price_change_coin_pack' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Price Change (%)</label>
                <input
                  type="number"
                  value={priceChange}
                  onChange={(e) => setPriceChange(Number(e.target.value))}
                  min={-50}
                  max={100}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            )}

            {scenario === 'og_tier_promo' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Discount (%)</label>
                <input
                  type="number"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value))}
                  min={0}
                  max={100}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            )}
          </div>

          <div className="mt-4">
            <button
              onClick={runSimulation}
              disabled={loading}
              className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Running Simulation...' : 'Run Simulation'}
            </button>
          </div>

          {error && (
            <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
        </div>

        {/* Simulation Results */}
        {currentSimulation && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Simulation Results</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart */}
              <div className="lg:col-span-2">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Projection</h3>
                {getChartData() && <Line data={getChartData()!} />}
              </div>

              {/* Summary */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Summary</h3>
                <div className="space-y-3">
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-sm text-gray-600">Scenario</div>
                    <div className="font-medium">{scenarios.find(s => s.value === currentSimulation.scenario)?.label}</div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-sm text-gray-600">Revenue Impact</div>
                    <div className="font-medium text-green-600">
                      +${currentSimulation.deltaVsBaseline?.revenue?.totalRevenue?.toLocaleString() || 0}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded">
                    <div className="text-sm text-gray-600">Horizon</div>
                    <div className="font-medium">{horizonDays} days</div>
                  </div>
                </div>

                {/* Insights */}
                <div className="mt-6">
                  <h4 className="text-md font-medium text-gray-900 mb-2">Key Insights</h4>
                  <ul className="space-y-2">
                    {currentSimulation.insights.map((insight, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start">
                        <span className="text-blue-500 mr-2">•</span>
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Historical Simulations */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Recent Simulations</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {historicalSimulations.length === 0 ? (
              <div className="px-6 py-4 text-gray-500">No simulations found</div>
            ) : (
              historicalSimulations.map((sim) => (
                <div key={sim.simulationId} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {scenarios.find(s => s.value === sim.scenario)?.label || sim.scenario}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {sim.horizonDays} days • {new Date(sim.createdAt).toLocaleDateString()}
                      </p>
                      {sim.segment?.country && (
                        <p className="text-sm text-blue-600">Country: {sim.segment.country}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        {Object.keys(sim.params).map(key => (
                          <div key={key}>{key}: {sim.params[key]}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {sim.insights.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">{sim.insights[0]}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SimulationsPage;

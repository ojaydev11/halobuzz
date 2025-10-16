import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../../../components/Layout';
import useSWR from 'swr';
import {
  PlusIcon,
  MegaphoneIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  ChartBarIcon,
  UserGroupIcon,
  GlobeAltIcon,
  MapPinIcon,
  TagIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface Campaign {
  id: string;
  name: string;
  description: string;
  type: 'banner' | 'push' | 'email' | 'in_app' | 'social';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  budget: number;
  spent: number;
  reach: number;
  clicks: number;
  conversions: number;
  startDate: string;
  endDate: string;
  targetAudience: {
    countries: string[];
    ageRange: [number, number];
    interests: string[];
    userTypes: string[];
  };
  createdAt: string;
  createdBy: string;
}

const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Dashain Festival Celebration 2024',
    description: 'Special promotion for Dashain festival featuring traditional content and rewards',
    type: 'banner',
    status: 'active',
    budget: 50000,
    spent: 23450,
    reach: 125000,
    clicks: 8750,
    conversions: 1205,
    startDate: '2024-09-15',
    endDate: '2024-10-15',
    targetAudience: {
      countries: ['Nepal', 'India'],
      ageRange: [18, 45],
      interests: ['Culture', 'Festival', 'Traditional'],
      userTypes: ['active_streamers', 'regular_viewers']
    },
    createdAt: '2024-09-10',
    createdBy: 'admin@halobuzz.com'
  },
  {
    id: '2',
    name: 'New User Welcome Campaign',
    description: 'Onboarding campaign for new users with coin bonuses',
    type: 'in_app',
    status: 'active',
    budget: 25000,
    spent: 12350,
    reach: 45000,
    clicks: 12000,
    conversions: 3400,
    startDate: '2024-09-01',
    endDate: '2024-12-31',
    targetAudience: {
      countries: ['Nepal', 'India', 'Bangladesh'],
      ageRange: [16, 35],
      interests: ['Live Streaming', 'Entertainment'],
      userTypes: ['new_users']
    },
    createdAt: '2024-08-25',
    createdBy: 'marketing@halobuzz.com'
  },
  {
    id: '3',
    name: 'Creator Incentive Program',
    description: 'Monthly incentive program for top performing creators',
    type: 'push',
    status: 'paused',
    budget: 75000,
    spent: 45600,
    reach: 89000,
    clicks: 5400,
    conversions: 890,
    startDate: '2024-08-01',
    endDate: '2024-11-30',
    targetAudience: {
      countries: ['Nepal'],
      ageRange: [20, 50],
      interests: ['Content Creation', 'Streaming'],
      userTypes: ['verified_streamers', 'top_creators']
    },
    createdAt: '2024-07-25',
    createdBy: 'creator@halobuzz.com'
  }
];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data, error, isLoading, mutate } = useSWR('/api/admin/campaigns', fetcher);

  const filteredCampaigns = campaigns.filter(campaign => {
    if (selectedFilter === 'all') return true;
    return campaign.status === selectedFilter;
  });

  const sortedCampaigns = [...filteredCampaigns].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'budget':
        return b.budget - a.budget;
      case 'reach':
        return b.reach - a.reach;
      case 'conversion_rate':
        const aRate = (a.conversions / a.clicks) * 100;
        const bRate = (b.conversions / b.clicks) * 100;
        return bRate - aRate;
      case 'created_at':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const handleCampaignAction = async (campaignId: string, action: string) => {
    try {
      const response = await fetch(`/api/admin/campaigns/${campaignId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        mutate();
        // Update local state for immediate feedback
        setCampaigns(prev => prev.map(c =>
          c.id === campaignId
            ? { ...c, status: action as Campaign['status'] }
            : c
        ));
      }
    } catch (error) {
      console.error('Campaign action failed:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      draft: 'bg-gray-100 text-gray-800',
      completed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const getTypeBadge = (type: string) => {
    const styles = {
      banner: 'bg-purple-100 text-purple-800',
      push: 'bg-blue-100 text-blue-800',
      email: 'bg-green-100 text-green-800',
      in_app: 'bg-orange-100 text-orange-800',
      social: 'bg-pink-100 text-pink-800'
    };
    return styles[type as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const calculateConversionRate = (conversions: number, clicks: number) => {
    return clicks > 0 ? ((conversions / clicks) * 100).toFixed(2) : '0.00';
  };

  const calculateROI = (conversions: number, spent: number) => {
    // Assuming average revenue per conversion is $5
    const revenue = conversions * 5;
    return spent > 0 ? (((revenue - spent) / spent) * 100).toFixed(2) : '0.00';
  };

  return (
    <Layout title="Campaign Management">
      <Head>
        <title>Campaigns - HaloBuzz Admin</title>
      </Head>

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Campaign Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              Create and manage promotional campaigns across all channels
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Create Campaign
            </button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <MegaphoneIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Active Campaigns</div>
                <div className="text-2xl font-bold text-gray-900">
                  {campaigns.filter(c => c.status === 'active').length}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Total Budget</div>
                <div className="text-2xl font-bold text-gray-900">
                  ${campaigns.reduce((sum, c) => sum + c.budget, 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <UserGroupIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Total Reach</div>
                <div className="text-2xl font-bold text-gray-900">
                  {campaigns.reduce((sum, c) => sum + c.reach, 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ChartBarIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <div className="text-sm font-medium text-gray-500">Conversions</div>
                <div className="text-2xl font-bold text-gray-900">
                  {campaigns.reduce((sum, c) => sum + c.conversions, 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Campaigns</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="draft">Draft</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="created_at">Created Date</option>
              <option value="name">Name</option>
              <option value="budget">Budget</option>
              <option value="reach">Reach</option>
              <option value="conversion_rate">Conversion Rate</option>
            </select>
          </div>

          <div className="text-sm text-gray-500">
            {sortedCampaigns.length} campaign(s) found
          </div>
        </div>
      </div>

      {/* Campaigns list */}
      <div className="space-y-4">
        {sortedCampaigns.map((campaign) => (
          <div key={campaign.id} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">{campaign.name}</h3>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(campaign.status)}`}>
                      {campaign.status}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadge(campaign.type)}`}>
                      {campaign.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">{campaign.description}</p>

                  {/* Campaign metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    <div>
                      <div className="text-sm font-medium text-gray-500">Budget</div>
                      <div className="text-lg font-semibold text-gray-900">${campaign.budget.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">
                        Spent: ${campaign.spent.toLocaleString()} ({((campaign.spent / campaign.budget) * 100).toFixed(1)}%)
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">Reach</div>
                      <div className="text-lg font-semibold text-gray-900">{campaign.reach.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">Users reached</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">Clicks</div>
                      <div className="text-lg font-semibold text-gray-900">{campaign.clicks.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">
                        CTR: {((campaign.clicks / campaign.reach) * 100).toFixed(2)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">Conversions</div>
                      <div className="text-lg font-semibold text-gray-900">{campaign.conversions.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">
                        Rate: {calculateConversionRate(campaign.conversions, campaign.clicks)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-500">ROI</div>
                      <div className="text-lg font-semibold text-gray-900">{calculateROI(campaign.conversions, campaign.spent)}%</div>
                      <div className="text-xs text-gray-500">Return on investment</div>
                    </div>
                  </div>

                  {/* Campaign details */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      {new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}
                    </div>
                    <div className="flex items-center">
                      <MapPinIcon className="h-4 w-4 mr-1" />
                      {campaign.targetAudience.countries.join(', ')}
                    </div>
                    <div className="flex items-center">
                      <TagIcon className="h-4 w-4 mr-1" />
                      {campaign.targetAudience.interests.slice(0, 2).join(', ')}
                      {campaign.targetAudience.interests.length > 2 && ' +' + (campaign.targetAudience.interests.length - 2)}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.open(`/dashboard/promotions/campaigns/${campaign.id}`, '_blank');
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600"
                    title="View Details"
                  >
                    <EyeIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.open(`/dashboard/promotions/campaigns/${campaign.id}/edit`, '_blank');
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600"
                    title="Edit Campaign"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>

                  {campaign.status === 'active' && (
                    <button
                      onClick={() => handleCampaignAction(campaign.id, 'paused')}
                      className="p-2 text-yellow-600 hover:text-yellow-800"
                      title="Pause Campaign"
                    >
                      <PauseIcon className="h-5 w-5" />
                    </button>
                  )}

                  {campaign.status === 'paused' && (
                    <button
                      onClick={() => handleCampaignAction(campaign.id, 'active')}
                      className="p-2 text-green-600 hover:text-green-800"
                      title="Resume Campaign"
                    >
                      <PlayIcon className="h-5 w-5" />
                    </button>
                  )}

                  {(campaign.status === 'active' || campaign.status === 'paused') && (
                    <button
                      onClick={() => handleCampaignAction(campaign.id, 'cancelled')}
                      className="p-2 text-red-600 hover:text-red-800"
                      title="Cancel Campaign"
                    >
                      <StopIcon className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-500 mb-1">
                  <span>Campaign Progress</span>
                  <span>{((campaign.spent / campaign.budget) * 100).toFixed(1)}% of budget used</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min((campaign.spent / campaign.budget) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {sortedCampaigns.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <MegaphoneIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No campaigns found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first campaign.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Create Campaign
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
}
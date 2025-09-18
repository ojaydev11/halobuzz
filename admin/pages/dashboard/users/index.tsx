import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import Layout from '../../../components/Layout';
import useSWR from 'swr';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  UserIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  BanknotesIcon,
  ChatBubbleLeftIcon,
  VideoCameraIcon,
  CalendarIcon,
  MapPinIcon,
  CheckBadgeIcon,
  XMarkIcon,
  BellSlashIcon,
  UserMinusIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  country: string;
  isVerified: boolean;
  kycStatus: 'pending' | 'approved' | 'rejected' | 'none';
  role: 'user' | 'moderator' | 'admin';
  coins: number;
  followers: number;
  following: number;
  totalStreams: number;
  lastActive: string;
  joinedAt: string;
  status: 'active' | 'suspended' | 'banned';
  trust: {
    score: number;
    violations: number;
  };
}

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [sortBy, setSortBy] = useState('lastActive');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const { data, error, isLoading, mutate } = useSWR('/api/admin/users', fetcher);

  // Mock data for demonstration
  const mockUsers: User[] = [
    {
      id: '1',
      username: 'PriyaKhatri',
      email: 'priya@example.com',
      avatar: null,
      country: 'Nepal',
      isVerified: true,
      kycStatus: 'approved',
      role: 'user',
      coins: 2500,
      followers: 1234,
      following: 567,
      totalStreams: 89,
      lastActive: new Date(Date.now() - 300000).toISOString(), // 5 min ago
      joinedAt: '2024-01-15',
      status: 'active',
      trust: { score: 92, violations: 1 }
    },
    {
      id: '2',
      username: 'ModeratorRam',
      email: 'ram@halobuzz.com',
      avatar: null,
      country: 'Nepal',
      isVerified: true,
      kycStatus: 'approved',
      role: 'moderator',
      coins: 500,
      followers: 234,
      following: 123,
      totalStreams: 12,
      lastActive: new Date(Date.now() - 900000).toISOString(), // 15 min ago
      joinedAt: '2023-11-20',
      status: 'active',
      trust: { score: 98, violations: 0 }
    },
    {
      id: '3',
      username: 'SuspiciousUser',
      email: 'suspicious@example.com',
      avatar: null,
      country: 'India',
      isVerified: false,
      kycStatus: 'pending',
      role: 'user',
      coins: 0,
      followers: 5,
      following: 100,
      totalStreams: 1,
      lastActive: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      joinedAt: '2024-09-15',
      status: 'suspended',
      trust: { score: 23, violations: 5 }
    }
  ];

  const users = data?.users || mockUsers;

  const filteredUsers = useMemo(() => {
    let filtered = users.filter((user: User) => {
      const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter = selectedFilter === 'all' ||
                           (selectedFilter === 'verified' && user.isVerified) ||
                           (selectedFilter === 'unverified' && !user.isVerified) ||
                           (selectedFilter === 'moderators' && user.role === 'moderator') ||
                           (selectedFilter === 'suspended' && user.status === 'suspended') ||
                           (selectedFilter === 'banned' && user.status === 'banned') ||
                           (selectedFilter === 'kyc_pending' && user.kycStatus === 'pending');

      return matchesSearch && matchesFilter;
    });

    // Sort users
    filtered.sort((a: User, b: User) => {
      switch (sortBy) {
        case 'username':
          return a.username.localeCompare(b.username);
        case 'joinedAt':
          return new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime();
        case 'followers':
          return b.followers - a.followers;
        case 'trust':
          return b.trust.score - a.trust.score;
        case 'lastActive':
        default:
          return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
      }
    });

    return filtered;
  }, [users, searchTerm, selectedFilter, sortBy]);

  const handleUserAction = async (userId: string, action: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        mutate(); // Refresh data
      }
    } catch (error) {
      console.error('User action failed:', error);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.length === 0) return;

    try {
      const response = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: selectedUsers, action })
      });

      if (response.ok) {
        setSelectedUsers([]);
        mutate();
      }
    } catch (error) {
      console.error('Bulk action failed:', error);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-yellow-100 text-yellow-800',
      banned: 'bg-red-100 text-red-800'
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Layout title="User Management">
      <Head>
        <title>Users - HaloBuzz Admin</title>
      </Head>

      {/* Header with search and filters */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <div className="flex items-center space-x-2 mt-4 sm:mt-0">
            <span className="text-sm text-gray-500">{filteredUsers.length} users found</span>
          </div>
        </div>

        {/* Search and filter bar */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users by username or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-4">
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Users</option>
                <option value="verified">Verified Only</option>
                <option value="unverified">Unverified</option>
                <option value="moderators">Moderators</option>
                <option value="suspended">Suspended</option>
                <option value="banned">Banned</option>
                <option value="kyc_pending">KYC Pending</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="lastActive">Last Active</option>
                <option value="username">Username</option>
                <option value="joinedAt">Join Date</option>
                <option value="followers">Followers</option>
                <option value="trust">Trust Score</option>
              </select>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <AdjustmentsHorizontalIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Bulk actions */}
          {selectedUsers.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">
                  {selectedUsers.length} user(s) selected
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleBulkAction('suspend')}
                    className="px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                  >
                    Suspend
                  </button>
                  <button
                    onClick={() => handleBulkAction('ban')}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    Ban
                  </button>
                  <button
                    onClick={() => handleBulkAction('verify')}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                  >
                    Verify
                  </button>
                  <button
                    onClick={() => setSelectedUsers([])}
                    className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers(filteredUsers.map(u => u.id));
                      } else {
                        setSelectedUsers([]);
                      }
                    }}
                    checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stats
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trust
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => toggleUserSelection(user.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        {user.avatar ? (
                          <img className="h-10 w-10 rounded-full" src={user.avatar} alt="" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <UserIcon className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">{user.username}</div>
                          {user.isVerified && (
                            <CheckBadgeIcon className="ml-1 h-4 w-4 text-blue-500" />
                          )}
                          {user.role === 'moderator' && (
                            <ShieldCheckIcon className="ml-1 h-4 w-4 text-green-500" />
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        <div className="text-xs text-gray-400 flex items-center">
                          <MapPinIcon className="h-3 w-3 mr-1" />
                          {user.country}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(user.status)}`}>
                        {user.status}
                      </span>
                      <div className="text-xs text-gray-500">
                        KYC: {user.kycStatus}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <BanknotesIcon className="h-4 w-4 text-yellow-500 mr-1" />
                        {user.coins.toLocaleString()} coins
                      </div>
                      <div className="flex items-center">
                        <UserIcon className="h-4 w-4 text-blue-500 mr-1" />
                        {user.followers.toLocaleString()} followers
                      </div>
                      <div className="flex items-center">
                        <VideoCameraIcon className="h-4 w-4 text-red-500 mr-1" />
                        {user.totalStreams} streams
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-center">
                      <div className={`text-lg font-bold ${getTrustScoreColor(user.trust.score)}`}>
                        {user.trust.score}
                      </div>
                      <div className="text-xs text-gray-500">
                        {user.trust.violations} violations
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>
                      <div>{new Date(user.lastActive).toLocaleDateString()}</div>
                      <div className="text-xs">{new Date(user.lastActive).toLocaleTimeString()}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => window.open(`/dashboard/users/${user.id}`, '_blank')}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => window.open(`/dashboard/users/${user.id}/edit`, '_blank')}
                        className="text-green-600 hover:text-green-900"
                        title="Edit User"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      {user.status === 'active' ? (
                        <button
                          onClick={() => handleUserAction(user.id, 'suspend')}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Suspend User"
                        >
                          <BellSlashIcon className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUserAction(user.id, 'activate')}
                          className="text-green-600 hover:text-green-900"
                          title="Activate User"
                        >
                          <CheckBadgeIcon className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleUserAction(user.id, 'ban')}
                        className="text-red-600 hover:text-red-900"
                        title="Ban User"
                      >
                        <UserMinusIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}
      </div>

      {/* Pagination would go here */}
      <div className="mt-6 flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Showing {filteredUsers.length} of {users.length} users
        </div>
        <div className="flex items-center space-x-2">
          <button className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
            Previous
          </button>
          <button className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
            Next
          </button>
        </div>
      </div>
    </Layout>
  );
}
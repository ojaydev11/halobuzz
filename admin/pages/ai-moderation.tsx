import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Eye, 
  Ban, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  TrendingUp,
  Users,
  Filter,
  Search,
  Download,
  RefreshCw
} from 'lucide-react';

interface ModerationFlag {
  _id: string;
  userId: {
    _id: string;
    username: string;
    avatar?: string;
  };
  contentType: 'text' | 'image' | 'video' | 'stream' | 'profile';
  action: 'allow' | 'warn' | 'block' | 'review';
  confidence: number;
  categories: string[];
  reason?: string;
  status: 'pending' | 'reviewed' | 'flagged' | 'resolved';
  reviewedBy?: {
    _id: string;
    username: string;
  };
  reviewedAt?: Date;
  resolution?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ModerationStats {
  timeframe: string;
  totalFlags: number;
  actions: {
    [key: string]: {
      count: number;
      avgConfidence: number;
    };
  };
  startDate: Date;
  endDate: Date;
}

export default function AIModerationPage() {
  const [flags, setFlags] = useState<ModerationFlag[]>([]);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<string>('day');
  const [selectedFlags, setSelectedFlags] = useState<string[]>([]);

  useEffect(() => {
    fetchModerationData();
  }, [timeframe]);

  const fetchModerationData = async () => {
    try {
      setLoading(true);
      
      // Fetch moderation flags
      const flagsResponse = await fetch('/api/admin/moderation/flags', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      const flagsData = await flagsResponse.json();
      setFlags(flagsData.flags || []);

      // Fetch moderation stats
      const statsResponse = await fetch(`/api/admin/moderation/stats?timeframe=${timeframe}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      const statsData = await statsResponse.json();
      setStats(statsData.stats || null);
    } catch (error) {
      console.error('Error fetching moderation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveFlag = async (flagId: string, resolution: string) => {
    try {
      const response = await fetch(`/api/admin/moderation/flags/${flagId}/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ resolution })
      });

      if (response.ok) {
        fetchModerationData();
      }
    } catch (error) {
      console.error('Error resolving flag:', error);
    }
  };

  const handleBulkAction = async (action: string) => {
    try {
      const response = await fetch('/api/admin/moderation/bulk-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({
          flagIds: selectedFlags,
          action
        })
      });

      if (response.ok) {
        setSelectedFlags([]);
        fetchModerationData();
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
    }
  };

  const exportData = () => {
    const csvData = flags.map(flag => ({
      'Flag ID': flag._id,
      'User': flag.userId.username,
      'Content Type': flag.contentType,
      'Action': flag.action,
      'Confidence': flag.confidence,
      'Categories': flag.categories.join(', '),
      'Status': flag.status,
      'Created At': new Date(flag.createdAt).toLocaleString(),
      'Reason': flag.reason || ''
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moderation-flags-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const filteredFlags = flags.filter(flag => {
    const matchesSearch = flag.userId.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         flag.categories.some(cat => cat.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || flag.status === statusFilter;
    const matchesAction = actionFilter === 'all' || flag.action === actionFilter;
    
    return matchesSearch && matchesStatus && matchesAction;
  });

  const getActionColor = (action: string) => {
    switch (action) {
      case 'block': return 'destructive';
      case 'warn': return 'warning';
      case 'allow': return 'success';
      case 'review': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'reviewed': return 'success';
      case 'flagged': return 'destructive';
      case 'resolved': return 'secondary';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Moderation Dashboard</h1>
          <p className="text-muted-foreground">Monitor and manage AI-powered content moderation</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchModerationData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportData} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Flags</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalFlags}</div>
              <p className="text-xs text-muted-foreground">
                Last {timeframe}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Blocked</CardTitle>
              <Ban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.actions.block?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Avg confidence: {stats.actions.block?.avgConfidence?.toFixed(2) || 'N/A'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Warnings</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.actions.warn?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Avg confidence: {stats.actions.warn?.avgConfidence?.toFixed(2) || 'N/A'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.actions.review?.count || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Requires attention
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Filters & Controls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Timeframe</label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Last 24 hours</SelectItem>
                  <SelectItem value="week">Last 7 days</SelectItem>
                  <SelectItem value="month">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="flagged">Flagged</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Action</label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="allow">Allow</SelectItem>
                  <SelectItem value="warn">Warn</SelectItem>
                  <SelectItem value="block">Block</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users or categories..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedFlags.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedFlags.length} flag(s) selected
              </span>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleBulkAction('resolve')}
                  variant="outline"
                  size="sm"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Resolve
                </Button>
                <Button
                  onClick={() => handleBulkAction('flag')}
                  variant="destructive"
                  size="sm"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Flag
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Moderation Flags Table */}
      <Card>
        <CardHeader>
          <CardTitle>Moderation Flags ({filteredFlags.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredFlags.map((flag) => (
              <div
                key={flag._id}
                className="border rounded-lg p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedFlags.includes(flag._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFlags([...selectedFlags, flag._id]);
                        } else {
                          setSelectedFlags(selectedFlags.filter(id => id !== flag._id));
                        }
                      }}
                      className="rounded"
                    />
                    <div className="flex items-center space-x-2">
                      {flag.userId.avatar && (
                        <img
                          src={flag.userId.avatar}
                          alt={flag.userId.username}
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      <div>
                        <p className="font-medium">{flag.userId.username}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(flag.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getActionColor(flag.action)}>
                      {flag.action}
                    </Badge>
                    <Badge variant={getStatusColor(flag.status)}>
                      {flag.status}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium">Content Type</p>
                    <p className="text-sm text-muted-foreground">{flag.contentType}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Confidence</p>
                    <p className="text-sm text-muted-foreground">
                      {(flag.confidence * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Categories</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {flag.categories.map((category) => (
                        <Badge key={category} variant="outline" className="text-xs">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {flag.reason && (
                  <div>
                    <p className="text-sm font-medium">Reason</p>
                    <p className="text-sm text-muted-foreground">{flag.reason}</p>
                  </div>
                )}

                {flag.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleResolveFlag(flag._id, 'Resolved by admin')}
                      size="sm"
                      variant="outline"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Resolve
                    </Button>
                    <Button
                      onClick={() => handleResolveFlag(flag._id, 'Flagged by admin')}
                      size="sm"
                      variant="destructive"
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Flag
                    </Button>
                  </div>
                )}

                {flag.resolution && (
                  <div>
                    <p className="text-sm font-medium">Resolution</p>
                    <p className="text-sm text-muted-foreground">{flag.resolution}</p>
                    {flag.reviewedBy && (
                      <p className="text-xs text-muted-foreground">
                        Reviewed by {flag.reviewedBy.username} on{' '}
                        {new Date(flag.reviewedAt!).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



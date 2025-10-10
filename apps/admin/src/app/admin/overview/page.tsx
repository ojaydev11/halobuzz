'use client';

import { useQuery } from '@tanstack/react-query';
import { KPICard } from '@/components/admin/overview/KPICard';
import {
  Users,
  DollarSign,
  Video,
  Gamepad2,
  Shield,
  TrendingUp,
  Activity,
  Server,
} from 'lucide-react';
import { RBACGate } from '@/components/admin/shared/RBACGate';
import { analyticsAPI } from '@/lib/api/services';

/**
 * Overview Dashboard Page
 * Shows key metrics and KPIs for the platform
 * Now connected to real backend API!
 */
export default function OverviewPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => analyticsAPI.getDashboardStats().then(res => res.data),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">
          Platform metrics and key performance indicators
        </p>
      </div>

      {/* User Metrics */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">User Metrics</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Total Users"
            value={stats?.users.total.toLocaleString() ?? '--'}
            change={stats?.users.growth7d}
            icon={Users}
            loading={isLoading}
          />
          <KPICard
            title="Active Users (7d)"
            value={stats?.users.active7d.toLocaleString() ?? '--'}
            icon={Activity}
            loading={isLoading}
          />
          <KPICard
            title="Revenue (30d)"
            value={`$${(stats?.economy.revenue30d ?? 0).toLocaleString()}`}
            change={stats?.economy.growth30d}
            icon={DollarSign}
            loading={isLoading}
          />
          <KPICard
            title="Verified Users"
            value={stats?.users.verified.toLocaleString() ?? '--'}
            icon={TrendingUp}
            loading={isLoading}
          />
        </div>
      </div>

      {/* Platform Activity */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Platform Activity</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Live Sessions"
            value={stats?.platform.liveSessions.toLocaleString() ?? '--'}
            icon={Video}
            loading={isLoading}
          />
          <KPICard
            title="Game Sessions (24h)"
            value={stats?.platform.gameSessions24h.toLocaleString() ?? '--'}
            icon={Gamepad2}
            loading={isLoading}
          />
          <KPICard
            title="Flagged Content"
            value={stats?.platform.flagsPending ?? '--'}
            icon={Shield}
            description="Pending review"
            loading={isLoading}
          />
          <KPICard
            title="Reels Created (24h)"
            value={stats?.platform.reelsCreated24h.toLocaleString() ?? '--'}
            icon={Video}
            loading={isLoading}
          />
        </div>
      </div>

      {/* Infrastructure Metrics (Super Admin only) */}
      <RBACGate superAdminOnly>
        <div>
          <h2 className="mb-4 text-lg font-semibold">
            Infrastructure Metrics
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              (Super Admin Only)
            </span>
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="API Response Time (p95)"
              value={`${stats?.infrastructure?.apiResponseTimeP95 ?? '--'}ms`}
              icon={Activity}
              description="Lower is better"
              loading={isLoading}
            />
            <KPICard
              title="System Uptime (30d)"
              value={`${stats?.infrastructure?.uptime30d ?? '--'}%`}
              icon={Server}
              description="Target: 99.9%"
              loading={isLoading}
            />
            <KPICard
              title="Database Load"
              value={`${stats?.infrastructure?.dbLoad ?? '--'}%`}
              icon={Server}
              loading={isLoading}
            />
            <KPICard
              title="Redis Hit Rate"
              value={`${stats?.infrastructure?.redisHitRate ?? '--'}%`}
              icon={Server}
              loading={isLoading}
            />
          </div>
        </div>
      </RBACGate>

      {/* Recent Activity / Charts Section */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Real-Time Data</h2>
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Connected to backend API at {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1'}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Data refreshes every 30 seconds
          </p>
        </div>
      </div>
    </div>
  );
}

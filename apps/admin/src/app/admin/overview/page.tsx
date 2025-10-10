'use client';

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

/**
 * Overview Dashboard Page
 * Shows key metrics and KPIs for the platform
 *
 * TODO: Connect to real API endpoints (currently using mock data for development)
 */
export default function OverviewPage() {
  // TODO: Replace with actual API calls using React Query
  const mockData = {
    totalUsers: 124583,
    activeUsers: 45892,
    revenue: '$234,567',
    liveSessions: 1243,
    gamesSessions: 8756,
    flaggedContent: 34,
    apiResponseTime: '245ms',
    uptime: '99.97%',
  };

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
            value={mockData.totalUsers.toLocaleString()}
            change={12.5}
            icon={Users}
          />
          <KPICard
            title="Active Users (7d)"
            value={mockData.activeUsers.toLocaleString()}
            change={8.2}
            icon={Activity}
          />
          <KPICard
            title="Revenue (30d)"
            value={mockData.revenue}
            change={15.3}
            icon={DollarSign}
          />
          <KPICard
            title="Growth Rate"
            value="+18.4%"
            change={3.1}
            changeLabel="30d"
            icon={TrendingUp}
          />
        </div>
      </div>

      {/* Platform Activity */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">Platform Activity</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Live Sessions"
            value={mockData.liveSessions.toLocaleString()}
            change={-2.3}
            icon={Video}
          />
          <KPICard
            title="Game Sessions (24h)"
            value={mockData.gamesSessions.toLocaleString()}
            change={22.1}
            icon={Gamepad2}
          />
          <KPICard
            title="Flagged Content"
            value={mockData.flaggedContent}
            change={-15.4}
            icon={Shield}
            description="Down is good"
          />
          <KPICard
            title="Content Takedowns (7d)"
            value="12"
            change={-8.3}
            icon={Shield}
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
              value={mockData.apiResponseTime}
              change={-5.2}
              icon={Activity}
              description="Lower is better"
            />
            <KPICard
              title="System Uptime (30d)"
              value={mockData.uptime}
              icon={Server}
              description="Target: 99.9%"
            />
            <KPICard
              title="Database Load"
              value="42%"
              change={2.1}
              icon={Server}
            />
            <KPICard
              title="Redis Hit Rate"
              value="94.2%"
              change={1.3}
              icon={Server}
            />
          </div>
        </div>
      </RBACGate>

      {/* Recent Activity / Charts Section */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold">Recent Activity</h2>
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          <p>Revenue charts, activity graphs, and trend analysis coming soon...</p>
          <p className="mt-2 text-sm">
            Will use Recharts for data visualization
          </p>
        </div>
      </div>
    </div>
  );
}

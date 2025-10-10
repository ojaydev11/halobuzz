'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  description?: string;
  loading?: boolean;
}

export function KPICard({
  title,
  value,
  change,
  changeLabel = '7d',
  icon: Icon,
  description,
  loading = false,
}: KPICardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <>
            <div className="skeleton h-8 w-32 rounded" />
            <div className="skeleton mt-1 h-4 w-24 rounded" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {change !== undefined && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {isPositive && <TrendingUp className="h-3 w-3 text-green-500" />}
                {isNegative && <TrendingDown className="h-3 w-3 text-red-500" />}
                <span
                  className={cn(
                    isPositive && 'text-green-500',
                    isNegative && 'text-red-500'
                  )}
                >
                  {isPositive && '+'}
                  {change}%
                </span>
                <span>vs {changeLabel}</span>
              </div>
            )}
            {description && !change && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

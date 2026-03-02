import React, { useState, useCallback } from 'react';
import { Users, Package, CreditCard } from 'lucide-react';
import { BaseCard } from '../base';
import { DynamicSection } from '../sections';
import { useFetchOnce } from '../../hooks';
import { dashboardService, type DashboardStatsDto } from '../../services';

interface Stat {
  label: string;
  value: string;
  icon: React.ComponentType<{ className: string }>;
  iconColor: string;
  change: string;
}

const formatNumber = (num: number): string => {
  return num.toLocaleString('en-US', {
    maximumFractionDigits: 0,
  });
};

const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(num);
};

/**
 * StatsCards Component
 *
 * Displays key dashboard statistics (total users, active users, revenue, transactions).
 * Integrated with DynamicSection for loading and error management.
 *
 * Features:
 * - Smooth loading skeleton animation
 * - Error handling display
 * - Responsive grid layout (1 col mobile → 4 cols desktop)
 * - Hover effects for interactivity
 * - Accessibility-first with proper ARIA roles
 * - Single API call on mount (prevents duplicate requests)
 */
const StatsCards: React.FC = () => {
  const [stats, setStats] = useState<DashboardStatsDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch function wrapped in useCallback
  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await dashboardService.fetchStats();
      setStats(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load statistics'
      );
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Only call fetch once on mount
  useFetchOnce(fetchStats);

  const loadingContent = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array(4)
        .fill(0)
        .map((_, i) => (
          <BaseCard key={i} padding="md">
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
              <div className="h-8 bg-gray-200 rounded w-3/4 animate-pulse" />
              <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse" />
            </div>
          </BaseCard>
        ))}
    </div>
  );

  const statsList: Stat[] = stats
    ? [
      {
        label: 'Total Users',
        value: formatNumber(stats.totalUsers),
        icon: Users,
        iconColor: 'text-blue-600',
        change: `${stats.monthlyGrowth > 0 ? '+' : ''}${stats.monthlyGrowth.toFixed(1)}% growth`,
      },
      {
        label: 'Active Users',
        value: formatNumber(stats.activeUsers),
        icon: Users,
        iconColor: 'text-green-600',
        change: `${((stats.activeUsers / Math.max(1, stats.totalUsers)) * 100).toFixed(1)}% of total`,
      },
      {
        label: 'Total Revenue',
        value: formatCurrency(stats.totalRevenue),
        icon: CreditCard,
        iconColor: 'text-emerald-600',
        change: `${stats.totalTransactions} transactions`,
      },
      {
        label: 'Transactions',
        value: formatNumber(stats.totalTransactions),
        icon: Package,
        iconColor: 'text-purple-600',
        change: 'Completed',
      },
    ]
    : [];

  const contentNode = (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statsList.map((stat) => {
        const Icon = stat.icon;
        return (
          <BaseCard
            key={stat.label}
            padding="md"
            className="hover:shadow-lg transition-all duration-200 hover:scale-105"
            role="article"
            aria-label={`${stat.label}: ${stat.value}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-600 mb-2 uppercase tracking-wider">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-gray-900 mb-2">
                  {stat.value}
                </p>
                <p className="text-xs text-gray-500 font-medium">{stat.change}</p>
              </div>
              <Icon className={`h-8 w-8 ${stat.iconColor} opacity-20`} aria-hidden="true" />
            </div>
          </BaseCard>
        );
      })}
    </div>
  );

  return (
    <DynamicSection
      title="Key Statistics"
      description="Overview of your dashboard metrics"
      isLoading={isLoading}
      error={error}
      loadingContent={loadingContent}
      skeletonCount={4}
      className="mb-8"
    >
      {contentNode}
    </DynamicSection>
  );
};

export default React.memo(StatsCards);
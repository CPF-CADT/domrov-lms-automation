import React, { useState, useCallback } from 'react';
import { ShoppingBag, UserPlus } from 'lucide-react';
import { BaseCard } from '../base';
import { DynamicSection } from '../sections';
import { useFetchOnce } from '../../hooks';
import { dashboardService, type Activity } from '../../services';

const getActivityIcon = (type: string) => {
    switch (type) {
        case 'purchase':
            return ShoppingBag;
        case 'user_registration':
            return UserPlus;
        default:
            return ShoppingBag;
    }
};

const getActivityColor = (type: string): string => {
    switch (type) {
        case 'purchase':
            return 'text-green-600';
        case 'user_registration':
            return 'text-blue-600';
        default:
            return 'text-gray-600';
    }
};

const formatTimeAgo = (isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
};

/**
 * RecentActivity Component
 *
 * Displays the latest system activities (user registrations, purchases, etc.).
 * Integrated with DynamicSection for loading and error management.
 *
 * Features:
 * - Real-time activity display
 * - Loading skeleton animation
 * - Error handling display
 * - Activity icon color coding
 * - Time-relative timestamps
 * - Full accessibility support
 * - Single API call on mount (prevents duplicate requests)
 */
const RecentActivity: React.FC = () => {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch function wrapped in useCallback
    const fetchActivity = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await dashboardService.fetchRecentActivity();
            setActivities(data.activities || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load activities');
            console.error('Failed to fetch recent activity:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Only call fetch once on mount
    useFetchOnce(fetchActivity);

    const loadingContent = (
        <div className="space-y-3">
            {Array(4)
                .fill(0)
                .map((_, i) => (
                    <div key={i} className="h-5 bg-gray-200 rounded animate-pulse" />
                ))}
        </div>
    );

    const displayActivities = activities.slice(0, 5);

    const contentNode = (
        <BaseCard padding="md" className="mt-0">
            {displayActivities.length === 0 ? (
                <div className="py-8 text-center">
                    <p className="text-gray-500 text-sm">No recent activity yet</p>
                </div>
            ) : (
                <ul className="space-y-3" role="list">
                    {displayActivities.map((activity) => {
                        const Icon = getActivityIcon(activity.type);
                        const colorClass = getActivityColor(activity.type);
                        return (
                            <li
                                key={activity.id}
                                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                                role="listitem"
                            >
                                <span className="flex items-center gap-3 flex-1 min-w-0">
                                    <Icon
                                        className={`w-5 h-5 flex-shrink-0 ${colorClass}`}
                                        aria-hidden="true"
                                    />
                                    <div className="text-sm text-gray-700 font-medium truncate">
                                        <span className="font-semibold block">{activity.user}</span>
                                        {activity.amount && (
                                            <span className="text-gray-500 text-xs">
                                                Amount: ${activity.amount}
                                            </span>
                                        )}
                                    </div>
                                </span>
                                <span className="text-gray-500 text-xs font-medium flex-shrink-0 ml-2 whitespace-nowrap">
                                    {formatTimeAgo(activity.timestamp)}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </BaseCard>
    );

    return (
        <div className="col-span-1">
            <DynamicSection
                title="Recent Activity"
                description="Latest system events"
                isLoading={isLoading}
                error={error}
                loadingContent={loadingContent}
                skeletonCount={4}
            >
                {contentNode}
            </DynamicSection>
        </div>
    );
};

export default React.memo(RecentActivity);
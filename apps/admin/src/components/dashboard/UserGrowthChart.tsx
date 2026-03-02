
import React, { useState, useCallback } from 'react';
import { BaseCard } from '../base';
import { DynamicSection } from '../sections';
import { useFetchOnce } from '../../hooks';
import { dashboardService, type DailyGrowthData } from '../../services';

interface ChartDataPoint {
    day: string;
    value: number;
}

/**
 * UserGrowthChart Component
 *
 * Displays daily income/user growth as an interactive bar chart.
 * Integrated with DynamicSection for loading and error management.
 *
 * Features:
 * - Dynamic bar chart with responsive scaling
 * - Daily breakdown over 7 days
 * - Hover effects on bars
 * - Loading skeleton state
 * - Error handling display
 * - Accessibility-first with proper ARIA roles
 * - Single API call on mount (prevents duplicate requests)
 */
const UserGrowthChart: React.FC = () => {
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch function wrapped in useCallback
    const fetchChartData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await dashboardService.fetchDailyGrowth();

            // Transform API data to chart format
            const transformedData: ChartDataPoint[] = data.dailyData?.map((item: DailyGrowthData) => ({
                day: new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }),
                value: item.value,
            })) || [];

            setChartData(transformedData);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load chart data');
            console.error('Failed to fetch growth chart:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Only call fetch once on mount
    useFetchOnce(fetchChartData);

    const loadingContent = (
        <BaseCard padding="md" className="mt-0">
            <div className="h-64 flex items-end gap-2">
                {Array(7)
                    .fill(0)
                    .map((_, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center">
                            <div className="w-full h-32 bg-gray-200 rounded-t-sm animate-pulse" />
                            <div className="h-4 bg-gray-200 rounded w-3/4 mt-2 animate-pulse" />
                        </div>
                    ))}
            </div>
        </BaseCard>
    );

    const maxValue = chartData.length > 0 ? Math.max(...chartData.map(d => d.value)) : 0;

    const contentNode = (
        <BaseCard padding="md" className="mt-0 col-span-1 md:col-span-2">
            {chartData.length === 0 ? (
                <div className="h-64 flex items-center justify-center">
                    <p className="text-gray-500 text-sm">No chart data available</p>
                </div>
            ) : (
                <div
                    className="h-64 flex items-end gap-2"
                    role="figure"
                    aria-label="Daily user growth chart"
                >
                    {chartData.map((point, i) => (
                        <div
                            key={i}
                            className="flex-1 flex flex-col items-center group"
                            role="presentation"
                        >
                            <span className="text-xs font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                                ${point.value}
                            </span>
                            <div
                                className="w-full bg-blue-500 rounded-t-sm hover:bg-blue-600 transition-all duration-200 hover:shadow-lg cursor-pointer group"
                                style={{
                                    height: maxValue > 0 ? `${(point.value / maxValue) * 200}px` : '8px',
                                    minHeight: '8px',
                                }}
                                role="img"
                                aria-label={`${point.day}: $${point.value}`}
                                title={`${point.day}: $${point.value}`}
                            />
                            <span className="text-xs text-gray-500 mt-2 font-medium group-hover:text-gray-700 transition-colors">
                                {point.day}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </BaseCard>
    );

    return (
        <div className="col-span-1 md:col-span-2">
            <DynamicSection
                title="Income Daily"
                description="Daily income - Last 7 days"
                isLoading={isLoading}
                error={error}
                loadingContent={loadingContent}
                skeletonCount={1}
            >
                {contentNode}
            </DynamicSection>
        </div>
    );
};

export default React.memo(UserGrowthChart);

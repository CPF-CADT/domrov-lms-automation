
import React from 'react';
import Header from '../components/dashboard/Header';
import StatsCards from '../components/dashboard/StatsCards';
import UserGrowthChart from '../components/dashboard/UserGrowthChart';
import RecentActivity from '../components/dashboard/RecentActivity';
import { MainLayout } from '../components/layout';
import { StaticSection } from '../components/sections';

/**
 * Dashboard Page
 *
 * Home page with optimized static and dynamic sections:
 * - StaticSection: Header (never re-renders)
 * - DynamicSection: StatsCards, UserGrowthChart, RecentActivity (only update when data changes)
 *
 * Architecture:
 * - Static header ensures visual stability
 * - Each dynamic section manages its own loading/error/refresh state
 * - Memoized components prevent unnecessary re-renders
 * - Smooth transitions between loading and loaded states
 * - Full accessibility support with ARIA roles
 */
const Dashboard: React.FC = () => {
    return (
        <MainLayout>
            {/* Static Section - Header never re-renders */}
            <StaticSection ariaLabel="Dashboard header section">
                <Header />
            </StaticSection>

            {/* Dynamic Sections - Only update when their specific data changes */}
            <div className="space-y-8">
                {/* Key Statistics Section */}
                <StatsCards />

                {/* Charts and Activity Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <UserGrowthChart />
                    <RecentActivity />
                </div>
            </div>
        </MainLayout>
    );
};

export default React.memo(Dashboard);

import React, { useMemo, type ReactNode } from 'react';

interface StaticSectionProps {
    children: ReactNode;
    className?: string;
    role?: string;
    ariaLabel?: string;
}

/**
 * StaticSection Component
 *
 * A memoized wrapper for static content sections that ensures the content
 * never re-renders, providing optimal performance for stable UI elements.
 *
 * Use this for:
 * - Header/Navigation elements
 * - Footer content
 * - Branding areas
 * - Any UI that should remain visually stable
 *
 * Benefits:
 * - Completely isolated from parent re-renders
 * - Uses memoization to prevent unnecessary updates
 * - Preserves visual stability
 * - Ideal for consuming static data or context
 *
 * Usage:
 * <StaticSection className="border-b">
 *   <Header />
 * </StaticSection>
 */
const StaticSection: React.FC<StaticSectionProps> = ({
    children,
    className = '',
    role = 'banner',
    ariaLabel,
}) => {
    // Usememo ensures children are only created once
    const memoizedChildren = useMemo(() => children, []);

    return (
        <div
            className={className}
            role={role}
            aria-label={ariaLabel}
        >
            {memoizedChildren}
        </div>
    );
};

export default React.memo(StaticSection);

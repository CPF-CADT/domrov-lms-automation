import React, { type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { BaseCard } from '../base';

interface DynamicSectionProps {
    children: ReactNode;
    isLoading?: boolean;
    error?: string | null;
    loadingContent?: ReactNode;
    title?: string;
    description?: string;
    skeletonCount?: number;
    className?: string;
}

/**
 * DynamicSection Component
 *
 * A reusable wrapper for dynamic content sections that provides:
 * - Loading states with customizable skeleton content
 * - Error handling with user-friendly messages
 * - Smooth fade transitions
 * - Proper ARIA roles for accessibility
 *
 * Usage:
 * <DynamicSection
 *   isLoading={isLoading}
 *   error={error}
 *   title="Stats Cards"
 *   skeletonCount={4}
 * >
 *   <YourDynamicContent />
 * </DynamicSection>
 */
const DynamicSection: React.FC<DynamicSectionProps> = ({
    children,
    isLoading = false,
    error = null,
    loadingContent,
    title,
    description,
    skeletonCount = 3,
    className = '',
}) => {
    return (
        <section
            className={`transition-opacity duration-300 ease-in-out ${isLoading ? 'opacity-75' : 'opacity-100'} ${className}`}
            role="region"
            aria-label={title}
            aria-live="polite"
            aria-busy={isLoading}
        >
            {/* Header with title */}
            {title && (
                <div className="mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                    {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div role="status" aria-label="Loading content">
                    {loadingContent ? (
                        loadingContent
                    ) : (
                        // Default skeleton loader
                        <div className="space-y-4">
                            {Array(skeletonCount)
                                .fill(0)
                                .map((_, i) => (
                                    <BaseCard key={i} padding="md">
                                        <div className="h-16 bg-gray-200 rounded animate-pulse" />
                                    </BaseCard>
                                ))}
                        </div>
                    )}
                </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
                <BaseCard
                    padding="md"
                    className="bg-red-50 border border-red-200"
                    role="alert"
                >
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <div className="flex-1">
                            <h3 className="font-medium text-red-800 mb-1">Error Loading Content</h3>
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                </BaseCard>
            )}

            {/* Content with smooth fade transition */}
            {!isLoading && !error && (
                <div className="animate-fade-in">{children}</div>
            )}
        </section>
    );
};

export default DynamicSection;

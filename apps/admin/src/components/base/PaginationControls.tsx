import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BaseButton } from './index';

interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    pageSize: number;
    onPrevPage: () => void;
    onNextPage: () => void;
    onGoToPage: (page: number) => void;
    isLoading?: boolean;
}

/**
 * Production-ready pagination component
 * - Shows page numbers with current page highlighted
 * - Previous/Next buttons with proper disabled states
 * - Total records and pagination info
 * - Responsive design
 * - Accessible button labels
 */
const PaginationControls: React.FC<PaginationControlsProps> = ({
    currentPage,
    totalPages,
    totalRecords,
    pageSize,
    onPrevPage,
    onNextPage,
    onGoToPage,
    isLoading = false,
}) => {
    const hasPrevPage = currentPage > 1;
    const hasNextPage = currentPage < totalPages;
    const startRecord = (currentPage - 1) * pageSize + 1;
    const endRecord = Math.min(currentPage * pageSize, totalRecords);

    // Show max 5 page buttons to prevent overflow
    const getPageNumbers = () => {
        if (totalPages <= 5) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        const pages: number[] = [];
        const leftBuffer = Math.max(1, currentPage - 2);
        const rightBuffer = Math.min(totalPages, currentPage + 2);

        if (leftBuffer > 1) {
            pages.push(1);
            if (leftBuffer > 2) {
                pages.push(-1); // Placeholder for ellipsis
            }
        }

        for (let i = leftBuffer; i <= rightBuffer; i++) {
            pages.push(i);
        }

        if (rightBuffer < totalPages) {
            if (rightBuffer < totalPages - 1) {
                pages.push(-1); // Placeholder for ellipsis
            }
            pages.push(totalPages);
        }

        return pages;
    };

    const pageNumbers = getPageNumbers();

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-3 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
            {/* Info Section */}
            <div className="text-xs sm:text-sm text-gray-600 whitespace-nowrap order-2 sm:order-1">
                {totalRecords > 0 ? (
                    <span>
                        Showing <strong>{startRecord}</strong>-<strong>{endRecord}</strong> of{' '}
                        <strong>{totalRecords}</strong>
                    </span>
                ) : (
                    <span>No records</span>
                )}
            </div>

            {/* Pagination Buttons */}
            <div className="flex items-center gap-0.5 flex-wrap justify-center order-1 sm:order-2">
                {/* Previous Button */}
                <BaseButton
                    variant="secondary"
                    size="sm"
                    onClick={onPrevPage}
                    disabled={!hasPrevPage || isLoading}
                    aria-label="Previous page"
                    className="flex items-center gap-0 py-1 px-1.5 text-xs"
                >
                    <ChevronLeft className="w-3 h-3" />
                    <span className="hidden sm:inline">Prev</span>
                </BaseButton>

                {/* Page Numbers */}
                {pageNumbers.map((page, index) => {
                    if (page === -1) {
                        return (
                            <span key={`ellipsis-${index}`} className="px-1 text-gray-400 text-xs">
                                ...
                            </span>
                        );
                    }

                    return (
                        <BaseButton
                            key={page}
                            variant={currentPage === page ? 'primary' : 'secondary'}
                            size="sm"
                            onClick={() => onGoToPage(page)}
                            disabled={isLoading}
                            aria-label={`Go to page ${page}`}
                            aria-current={currentPage === page ? 'page' : undefined}
                            className="py-1 px-1.5 text-xs min-w-fit"
                        >
                            {page}
                        </BaseButton>
                    );
                })}

                {/* Next Button */}
                <BaseButton
                    variant="secondary"
                    size="sm"
                    onClick={onNextPage}
                    disabled={!hasNextPage || isLoading}
                    aria-label="Next page"
                    className="flex items-center gap-0 py-1 px-1.5 text-xs"
                >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRight className="w-3 h-3" />
                </BaseButton>
            </div>
        </div>
    );
};

export default React.memo(PaginationControls);

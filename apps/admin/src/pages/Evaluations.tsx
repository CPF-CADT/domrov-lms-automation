import React, { useState, useEffect, useCallback } from 'react';
import AIUsageLogTable from '../components/evaluations/AIUsageLogTable';
import AIUsageLogModal from '../components/evaluations/AIUsageLogModal';
import { MainLayout, PageHeader } from '../components/layout';
import { PaginationControls } from '../components/base';
import { aiUsageLogService, type AIUsageLog } from '../services/aiEvaluationservice';
import { useModal, usePaginationWithPrefetch } from '../hooks';
import { AlertCircle } from 'lucide-react';

const PAGE_SIZE = 10;

const useDebounce = <T,>(value: T, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
};

const MemoizedAIUsageLogTable = React.memo(AIUsageLogTable);

interface AIUsageLogFiltersSectionProps {
    search: string;
    dateFrom: string;
    dateTo: string;
    sortBy: string;
    onSearchChange: (value: string) => void;
    onDateFromChange: (value: string) => void;
    onDateToChange: (value: string) => void;
    onSortByChange: (value: string) => void;
}

const AIUsageLogFiltersSection = React.memo<AIUsageLogFiltersSectionProps>(({
    search,
    dateFrom,
    dateTo,
    sortBy,
    onSearchChange,
    onDateFromChange,
    onDateToChange,
    onSortByChange,
}) => (
    <div className="mb-3 flex-shrink-0 flex flex-col md:flex-row gap-3">
        <input
            type="text"
            placeholder="Search user name, email, or log title..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1 px-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            title="Date From"
            className="px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            title="Date To"
            className="px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
            className="px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="tokenCountDesc">Tokens (High to Low)</option>
            <option value="tokenCountAsc">Tokens (Low to High)</option>
        </select>
    </div>
));
AIUsageLogFiltersSection.displayName = 'AIUsageLogFiltersSection';

interface AIUsageLogPaginationSectionProps {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    isLoading: boolean;
    onPrevPage: () => void;
    onNextPage: () => void;
    onGoToPage: (page: number) => void;
}

const AIUsageLogPaginationSection = React.memo<AIUsageLogPaginationSectionProps>(({
    currentPage,
    totalPages,
    totalRecords,
    isLoading,
    onPrevPage,
    onNextPage,
    onGoToPage,
}) => {
    if (totalPages === 0) return null;

    return (
        <div className="flex-shrink-0">
            <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalRecords={totalRecords}
                pageSize={PAGE_SIZE}
                onPrevPage={onPrevPage}
                onNextPage={onNextPage}
                onGoToPage={onGoToPage}
                isLoading={isLoading}
            />
        </div>
    );
});
AIUsageLogPaginationSection.displayName = 'AIUsageLogPaginationSection';

const AIUsageLogs = () => {
    const [currentSearch, setCurrentSearch] = useState<string>('');
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');
    const [sortBy, setSortBy] = useState<string>('newest');
    const [selectedLog, setSelectedLog] = useState<AIUsageLog | null>(null);

    const debouncedSearch = useDebounce(currentSearch, 500);
    const { isOpen: modalOpen, openModal, closeModal } = useModal();

    const fetchLogsWithParams = useCallback(
        async (page: number, limit: number) => {
            const response = await aiUsageLogService.fetchLogs(
                page,
                limit,
                debouncedSearch || undefined,
                dateFrom || undefined,
                dateTo || undefined,
                sortBy as any
            );

            return {
                data: response.data || [],
                total: response.total || 0,
            };
        }, [debouncedSearch, dateFrom, dateTo, sortBy]
    );

    const {
        currentData: logs,
        isLoading,
        error: paginationError,
        totalRecords,
        totalPages,
        currentPage,
        goToPage,
        nextPage,
        prevPage,
        prefetchPage,
    } = usePaginationWithPrefetch(
        fetchLogsWithParams,
        PAGE_SIZE, [debouncedSearch, dateFrom, dateTo, sortBy]
    );

    // Reset to page 1 whenever filters change
    useEffect(() => {
        goToPage(1);
    }, [debouncedSearch, dateFrom, dateTo, sortBy, goToPage]);

    // Prefetch next page for smooth UX
    useEffect(() => {
        if (currentPage < totalPages) {
            prefetchPage(currentPage + 1);
        }
    }, [currentPage, totalPages, prefetchPage]);

    const handleSearch = useCallback((value: string) => setCurrentSearch(value), []);
    const handleDateFromFilter = useCallback((value: string) => setDateFrom(value), []);
    const handleDateToFilter = useCallback((value: string) => setDateTo(value), []);
    const handleSortByFilter = useCallback((value: string) => setSortBy(value), []);

    const handleGoToPage = useCallback((page: number) => {
        const validPage = Math.max(1, Math.min(page, totalPages || 1));
        goToPage(validPage);
    }, [totalPages, goToPage]);

    const handleNextPage = useCallback(() => {
        if (currentPage < totalPages) {
            nextPage();
        }
    }, [currentPage, totalPages, nextPage]);

    const handlePrevPage = useCallback(() => {
        if (currentPage > 1) {
            prevPage();
        }
    }, [currentPage, prevPage]);

    const handleViewLog = useCallback((log: AIUsageLog) => {
        setSelectedLog(log);
        openModal();
    }, [openModal]);

    return (
        <MainLayout>
            <PageHeader
                title="AI Usage Logs"
                description="View and monitor AI usage and token consumption across the system."
            />

            {paginationError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>{paginationError}</span>
                </div>
            )}

            <AIUsageLogFiltersSection
                search={currentSearch}
                dateFrom={dateFrom}
                dateTo={dateTo}
                sortBy={sortBy}
                onSearchChange={handleSearch}
                onDateFromChange={handleDateFromFilter}
                onDateToChange={handleDateToFilter}
                onSortByChange={handleSortByFilter}
            />

            <div className="flex-1 flex flex-col min-h-0 mb-3">
                <div className="overflow-y-auto">
                    <MemoizedAIUsageLogTable
                        logs={logs}
                        isLoading={isLoading}
                        onView={handleViewLog}
                    />
                </div>
            </div>

            <AIUsageLogPaginationSection
                currentPage={currentPage}
                totalPages={totalPages}
                totalRecords={totalRecords}
                isLoading={isLoading}
                onPrevPage={handlePrevPage}
                onNextPage={handleNextPage}
                onGoToPage={handleGoToPage}
            />

            {modalOpen && selectedLog && (
                <AIUsageLogModal
                    isOpen={modalOpen}
                    log={selectedLog}
                    onClose={closeModal}
                />
            )}
        </MainLayout>
    );
};

export default AIUsageLogs;
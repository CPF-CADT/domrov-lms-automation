import React, { useState, useEffect, useCallback } from 'react';
import TransactionTable from '../components/transactions/TransactionTable';
import TransactionModal from '../components/transactions/TransactionModal';
import { MainLayout, PageHeader } from '../components/layout';
import { PaginationControls } from '../components/base';
import { transactionService, type Transaction } from '../services';
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

const MemoizedTransactionTable = React.memo(TransactionTable);

interface TransactionFiltersSectionProps {
    search: string;
    status: string;
    onSearchChange: (value: string) => void;
    onStatusChange: (value: string) => void;
}

const TransactionFiltersSection = React.memo<TransactionFiltersSectionProps>(({
    search,
    status,
    onSearchChange,
    onStatusChange,
}) => (
    <div className="mb-3 flex-shrink-0 flex flex-col md:flex-row gap-3">
        <input
            type="text"
            placeholder="Search transaction ID or user..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1 pl-4 pr-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        <select
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            className="px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        >
            <option value="">All Status</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
        </select>
    </div>
));
TransactionFiltersSection.displayName = 'TransactionFiltersSection';

interface TransactionPaginationSectionProps {
    currentPage: number;
    totalPages: number;
    totalRecords: number;
    isLoading: boolean;
    onPrevPage: () => void;
    onNextPage: () => void;
    onGoToPage: (page: number) => void;
}

const TransactionPaginationSection = React.memo<TransactionPaginationSectionProps>(({
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
TransactionPaginationSection.displayName = 'TransactionPaginationSection';

const Transactions = () => {
    const [currentSearch, setCurrentSearch] = useState<string>('');
    const [currentStatus, setCurrentStatus] = useState<string>('');
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

    const debouncedSearch = useDebounce(currentSearch, 500);

    const { isOpen: modalOpen, openModal, closeModal } = useModal();

    const fetchTransactionsWithParams = useCallback(
        async (page: number, limit: number) => {
            const response = await transactionService.fetchTransactions(
                page,
                limit,
                currentStatus || undefined,
                debouncedSearch || undefined
            );

            return {
                data: response.data || [],
                total: response.total || 0,
            };
        },
        [currentStatus, debouncedSearch]
    );

    const {
        currentData: transactions,
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
        fetchTransactionsWithParams,
        PAGE_SIZE,
        [currentStatus, debouncedSearch]
    );

    useEffect(() => {
        goToPage(1);
    }, [debouncedSearch, currentStatus, goToPage]);

    useEffect(() => {
        if (currentPage < totalPages) {
            prefetchPage(currentPage + 1);
        }
    }, [currentPage, totalPages, prefetchPage]);

    const handleSearch = useCallback((value: string) => {
        setCurrentSearch(value);
    }, []);

    const handleStatusFilter = useCallback((value: string) => {
        setCurrentStatus(value);
    }, []);

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

    const handleViewTransaction = useCallback((transaction: Transaction) => {
        setSelectedTransaction(transaction);
        openModal();
    }, [openModal]);

    return (
        <MainLayout>
            <PageHeader
                title="Transactions"
                description="View and manage all payment transactions."
            />

            {paginationError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>{paginationError}</span>
                </div>
            )}

            <TransactionFiltersSection
                search={currentSearch || ''}
                status={currentStatus || ''}
                onSearchChange={handleSearch}
                onStatusChange={handleStatusFilter}
            />

            <div className="flex-1 flex flex-col min-h-0 mb-3">
                <div className="overflow-y-auto">
                    <MemoizedTransactionTable
                        transactions={transactions}
                        isLoading={isLoading}
                        onView={handleViewTransaction}
                    />
                </div>
            </div>

            <TransactionPaginationSection
                currentPage={currentPage}
                totalPages={totalPages}
                totalRecords={totalRecords}
                isLoading={isLoading}
                onPrevPage={handlePrevPage}
                onNextPage={handleNextPage}
                onGoToPage={handleGoToPage}
            />

            {modalOpen && selectedTransaction && (
                <TransactionModal
                    isOpen={modalOpen}
                    transaction={selectedTransaction}
                    onClose={closeModal}
                />
            )}
        </MainLayout>
    );
};

export default Transactions;

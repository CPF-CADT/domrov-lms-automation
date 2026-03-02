import { useState, useCallback } from 'react';

interface UsePaginationReturn {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    goToPage: (page: number) => void;
    nextPage: () => void;
    prevPage: () => void;
    setPageSize: (size: number) => void;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export const usePagination = (
    totalItems: number,
    initialPageSize: number = 10
): UsePaginationReturn => {
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(initialPageSize);

    const totalPages = Math.ceil(totalItems / pageSize);
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;

    const goToPage = useCallback((page: number) => {
        const validPage = Math.max(1, Math.min(page, totalPages));
        setCurrentPage(validPage);
    }, [totalPages]);

    const nextPage = useCallback(() => {
        goToPage(currentPage + 1);
    }, [currentPage, goToPage]);

    const prevPage = useCallback(() => {
        goToPage(currentPage - 1);
    }, [currentPage, goToPage]);

    const handleSetPageSize = useCallback((newSize: number) => {
        setPageSize(newSize);
        setCurrentPage(1); // Reset to first page when changing page size
    }, []);

    return {
        currentPage,
        pageSize,
        totalItems,
        totalPages,
        goToPage,
        nextPage,
        prevPage,
        setPageSize: handleSetPageSize,
        hasNextPage,
        hasPrevPage,
    };
};

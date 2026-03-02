import { useState, useCallback, useRef, useEffect } from 'react';

interface PaginationCache<T> {
    data: T[];
    totalRecords: number;
    totalPages: number;
    timestamp: number;
}

interface PrefetchState<T> {
    currentData: T[];
    isLoading: boolean;
    error: string | null;
    totalRecords: number;
    totalPages: number;
    currentPage: number;
    isPrefetching: boolean;
}

type FetchFn<T> = (page: number, limit: number, ...args: any[]) => Promise<{
    data: T[];
    total: number;
}>;

const CACHE_DURATION = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 5;

export const usePaginationWithPrefetch = <T,>(
    fetchFn: FetchFn<T>,
    pageSize: number,
    dependencies: any[] = []
) => {
    const [state, setState] = useState<PrefetchState<T>>({
        currentData: [],
        isLoading: true,
        error: null,
        totalRecords: 0,
        totalPages: 0,
        currentPage: 1,
        isPrefetching: false,
    });

    const cacheRef = useRef<Map<number, PaginationCache<T>>>(new Map());
    const pendingRequestsRef = useRef<Set<number>>(new Set());
    const lastDependenciesRef = useRef<any[]>(dependencies);

    const isCacheValid = (page: number): boolean => {
        const cached = cacheRef.current.get(page);
        if (!cached) return false;
        return Date.now() - cached.timestamp < CACHE_DURATION;
    };

    const addToCache = (page: number, data: T[], total: number) => {
        const cache = cacheRef.current;
        cache.set(page, {
            data,
            totalRecords: total,
            totalPages: Math.ceil(total / pageSize),
            timestamp: Date.now(),
        });

        if (cache.size > MAX_CACHE_SIZE) {
            const oldestKey = Array.from(cache.keys()).reduce((a, b) =>
                cache.get(a)!.timestamp < cache.get(b)!.timestamp ? a : b
            );
            cache.delete(oldestKey);
        }
    };

    const fetchPage = useCallback(
        async (page: number, ...args: any[]): Promise<T[]> => {
            if (isCacheValid(page)) {
                const cached = cacheRef.current.get(page)!;
                return cached.data;
            }

            if (pendingRequestsRef.current.has(page)) {
                await new Promise((resolve) => {
                    const checkInterval = setInterval(() => {
                        if (!pendingRequestsRef.current.has(page)) {
                            clearInterval(checkInterval);
                            resolve(null);
                        }
                    }, 50);
                });
                const cached = cacheRef.current.get(page);
                return cached?.data || [];
            }

            pendingRequestsRef.current.add(page);
            try {
                const response = await fetchFn(page, pageSize, ...args);
                const total = response.total || 0;
                addToCache(page, response.data || [], total);
                return response.data || [];
            } finally {
                pendingRequestsRef.current.delete(page);
            }
        },
        [fetchFn, pageSize]
    );

    const loadPage = useCallback(
        async (page: number, ...args: any[]) => {
            try {
                setState((prev) => ({ ...prev, isLoading: true, error: null }));

                const data = await fetchPage(page, ...args);
                const cached = cacheRef.current.get(page);

                setState((prev) => ({
                    ...prev,
                    currentData: data,
                    totalRecords: cached?.totalRecords || 0,
                    totalPages: cached?.totalPages || 0,
                    currentPage: page,
                    isLoading: false,
                }));

                return true;
            } catch (err) {
                const errorMsg =
                    err instanceof Error ? err.message : 'Failed to load data';
                setState((prev) => ({
                    ...prev,
                    isLoading: false,
                    error: errorMsg,
                }));
                return false;
            }
        },
        [fetchPage]
    );

    const prefetchPage = useCallback(
        async (page: number, ...args: any[]) => {
            if (isCacheValid(page) || page < 1) return;

            setState((prev) => ({ ...prev, isPrefetching: true }));
            try {
                await fetchPage(page, ...args);
            } finally {
                setState((prev) => ({ ...prev, isPrefetching: false }));
            }
        },
        [fetchPage]
    );

    const clearCache = useCallback(() => {
        cacheRef.current.clear();
        pendingRequestsRef.current.clear();
    }, []);

    const goToPage = useCallback(
        async (page: number, ...args: any[]) => {
            await loadPage(page, ...args);
        },
        [loadPage]
    );

    const nextPage = useCallback(
        async (...args: any[]) => {
            const next = state.currentPage + 1;
            if (next <= state.totalPages) {
                await loadPage(next, ...args);
            }
        },
        [state.currentPage, state.totalPages, loadPage]
    );

    const prevPage = useCallback(
        async (...args: any[]) => {
            const prev = state.currentPage - 1;
            if (prev >= 1) {
                await loadPage(prev, ...args);
            }
        },
        [state.currentPage, loadPage]
    );

    useEffect(() => {
        const depsChanged = JSON.stringify(dependencies) !== JSON.stringify(lastDependenciesRef.current);
        if (depsChanged) {
            clearCache();
            lastDependenciesRef.current = dependencies;
        }
    }, [dependencies, clearCache]);

    return {
        ...state,
        goToPage,
        nextPage,
        prevPage,
        prefetchPage,
        clearCache,
    };
};

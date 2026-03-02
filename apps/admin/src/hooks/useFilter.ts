import { useState, useCallback, useMemo } from 'react';

interface FilterOptions {
    [key: string]: string | string[];
}

interface UseFilterReturn<T> {
    filters: FilterOptions;
    filteredData: T[];
    setFilter: (key: string, value: string) => void;
    resetFilters: () => void;
    clearFilter: (key: string) => void;
}

export const useFilter = <T extends Record<string, any>>(
    data: T[],
    searchFields?: (keyof T)[],
    initialFilters?: FilterOptions
): UseFilterReturn<T> => {
    const [filters, setFilters] = useState<FilterOptions>(initialFilters || {});

    const setFilter = useCallback((key: string, value: string) => {
        setFilters((prev) => ({
            ...prev,
            [key]: value,
        }));
    }, []);

    const clearFilter = useCallback((key: string) => {
        setFilters((prev) => {
            const newFilters = { ...prev };
            delete newFilters[key];
            return newFilters;
        });
    }, []);

    const resetFilters = useCallback(() => {
        setFilters(initialFilters || {});
    }, [initialFilters]);

    const filteredData = useMemo(() => {
        return data.filter((item) => {
            // Search filter
            if (filters.search && searchFields && searchFields.length > 0) {
                const searchTerm = (filters.search as string).toLowerCase();
                const matchesSearch = searchFields.some((field) => {
                    const fieldValue = String(item[field]).toLowerCase();
                    return fieldValue.includes(searchTerm);
                });
                if (!matchesSearch) return false;
            }

            // Other filters
            for (const [key, filterValue] of Object.entries(filters)) {
                if (key === 'search') continue;

                if (filterValue === '' || filterValue === null) continue;

                const itemValue = String(item[key as keyof T]);
                if (Array.isArray(filterValue)) {
                    if (!filterValue.includes(itemValue)) return false;
                } else {
                    if (itemValue !== filterValue) return false;
                }
            }

            return true;
        });
    }, [data, filters, searchFields]);

    return {
        filters,
        filteredData,
        setFilter,
        resetFilters,
        clearFilter,
    };
};

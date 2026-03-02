import { useEffect, useRef } from 'react';

/**
 * useFetchOnce Hook
 *
 * Prevents duplicate API calls when component mounts (especially in React Strict Mode where
 * useEffect can run twice in development).
 *
 * Features:
 * - Only calls the fetch function once per component mount
 * - Safe for React Strict Mode
 * - Eliminates double API calls automatically
 * - Simple to use - just pass a callback
 *
 * Usage:
 * const fetchData = useCallback(async () => {
 *   const data = await apiService.getData();
 *   setData(data);
 * }, []);
 *
 * useFetchOnce(fetchData);
 *
 * @param callback - Async function to call once on mount
 */
export const useFetchOnce = (callback: () => Promise<void> | void): void => {
    // useRef doesn't cause re-render and persists across renders
    const hasCalledRef = useRef(false);

    useEffect(() => {
        // Only call if we haven't called before
        if (!hasCalledRef.current) {
            hasCalledRef.current = true;
            callback();
        }
    }, [callback]);
};

export default useFetchOnce;

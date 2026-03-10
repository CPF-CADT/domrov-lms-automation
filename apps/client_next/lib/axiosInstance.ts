import axios, { type AxiosRequestConfig, type AxiosInstance } from 'axios';
import { type RefObject } from 'react';

/**
 * Main axios instance for client-side API calls
 * Configured for Next.js internal API routes (/api/*)
 * Includes request/response interceptors for token management and refresh
 */
export const apiClient: AxiosInstance = axios.create({
    // Use relative URLs for Next.js internal API routes
    // Axios will use the current domain automatically
    baseURL: '/api',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Setup authentication interceptors for refresh token handling
 * Must be called from AuthProvider with context methods
 *
 * @param setAccessToken - Context method to update access token
 * @param logout - Context method to logout user
 * @param accessTokenRef - Ref containing current access token
 *
 * @returns Cleanup function to remove interceptors
 *
 * @example
 * ```tsx
 * // In AuthProvider
 * useEffect(() => {
 *   const cleanup = setupAuthInterceptors(setToken, handleLogout, tokenRef);
 *   return cleanup;
 * }, []);
 * ```
 */
export const setupAuthInterceptors = (
    setAccessToken: (token: string | null) => void,
    logout: () => void,
    accessTokenRef: RefObject<string | null>
) => {
    console.info('[Auth] Setting up authentication interceptors...');

    /**
     * Request interceptor: Add Bearer token to all requests
     * Reads token from ref to ensure freshness
     * Falls back to localStorage if ref is not set yet
     */
    const requestInterceptor = apiClient.interceptors.request.use(
        (config) => {
            // Try to get token from ref first (most current)
            let token = accessTokenRef.current;

            // Fallback to localStorage if ref is empty
            if (!token && typeof window !== 'undefined') {
                token = localStorage.getItem('adminToken') || localStorage.getItem('authToken');
            }

            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
                console.debug(`[Auth] Request to ${config.url} - Token attached`);
            } else {
                console.warn(`[Auth] Request to ${config.url} - No token available. Headers:`, config.headers);
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    console.info(`[Auth] Request interceptor registered with ID: ${requestInterceptor}`);

    // Queue for requests that failed due to 401 while refreshing token
    let isRefreshing = false;
    let failedQueue: {
        resolve: (value: unknown) => void;
        reject: (reason?: any) => void;
    }[] = [];

    /**
     * Process queued requests after token refresh
     * Resolves with new token or rejects with error
     */
    const processQueue = (error: Error | null, token: string | null = null) => {
        failedQueue.forEach((prom) => {
            if (error) {
                prom.reject(error);
            } else {
                prom.resolve(token);
            }
        });
        failedQueue = [];
    };

    /**
     * Response interceptor: Handle 401 errors and refresh token
     * Implements queue-based retry logic for concurrent requests
     */
    const responseInterceptor = apiClient.interceptors.response.use(
        (response) => response,
        async (error: any) => {
            // Log the error details for debugging
            console.error(`[Auth] Response error:`, {
                status: error?.response?.status,
                message: error?.message,
                url: error?.config?.url,
                errorKeys: Object.keys(error || {})
            });

            const originalRequest = error?.config as AxiosRequestConfig & {
                _retry?: boolean;
            };

            if (!originalRequest) {
                console.error('[Auth] No request config in error. Rejecting.');
                return Promise.reject(error);
            }

            /**
             * CRITICAL: If refresh token request itself fails, logout immediately
             * This prevents infinite refresh loops
             */
            if (originalRequest.url?.includes('/refresh-token') ||
                originalRequest.url?.includes('/api/auth')) {
                console.error(
                    '[Auth] Refresh token request failed. Session has expired or refresh token is invalid. Logging out.'
                );
                logout();
                return Promise.reject(error);
            }

            // Only handle 401 Unauthorized errors that haven't been retried
            // Check if response exists and has status 401
            const is401Error = error?.response?.status === 401;
            const alreadyRetried = originalRequest._retry === true;

            console.debug(`[Auth] Error classification: status=${error?.response?.status}, is401Error=${is401Error}, alreadyRetried=${alreadyRetried}`);

            if (is401Error && !alreadyRetried) {
                console.warn(`[Auth] 401 Unauthorized on ${originalRequest.url}. Attempting token refresh...`);

                // If already refreshing, queue this request
                if (isRefreshing) {
                    console.debug(`[Auth] Token refresh in progress, queueing request`);
                    return new Promise((resolve, reject) => {
                        failedQueue.push({ resolve, reject });
                    }).then((token) => {
                        console.debug(`[Auth] Retrying queued request with new token`);
                        // Retry original request with new token
                        if (originalRequest.headers) {
                            originalRequest.headers.Authorization =
                                `Bearer ${token}`;
                        }
                        return apiClient(originalRequest);
                    }).catch((err) => {
                        console.error(`[Auth] Queued request failed:`, err);
                        throw err;
                    });
                }

                // Mark request as retried and start refresh process
                originalRequest._retry = true;
                isRefreshing = true;

                try {
                    // Call refresh token endpoint via Next.js API route
                    // This handles the backend call internally
                    console.debug(`[Auth] Current token:`, accessTokenRef.current?.substring(0, 20) + '...');
                    console.debug(`[Auth] Calling refresh token endpoint...`);

                    const response = await fetch('/api/auth?action=refresh-token', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${accessTokenRef.current}`,
                        },
                    });

                    console.debug(`[Auth] Refresh response status:`, response.status);

                    const data = await response.json();

                    if (!response.ok) {
                        console.error(`[Auth] Token refresh failed with status ${response.status}:`, data);
                        throw new Error(data.error || `Token refresh failed with status ${response.status}`);
                    }

                    // Extract new access token
                    const newAccessToken =
                        data.data?.accessToken || data.accessToken;

                    if (!newAccessToken) {
                        console.error(`[Auth] No access token in refresh response:`, data);
                        throw new Error('No access token in refresh response');
                    }

                    console.info(`[Auth] Token refreshed successfully. New token:`, newAccessToken.substring(0, 20) + '...');
                    // Update token in context and ref
                    setAccessToken(newAccessToken);
                    accessTokenRef.current = newAccessToken; // Also update ref immediately

                    if (originalRequest.headers) {
                        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    }

                    // Process queued requests with new token
                    processQueue(null, newAccessToken);

                    console.debug(`[Auth] Retrying original request with new token`);
                    // Retry original request
                    return apiClient(originalRequest);
                } catch (refreshError) {
                    // Refresh failed - logout and reject all queued requests
                    console.error(`[Auth] Token refresh error:`, refreshError);
                    processQueue((refreshError as Error), null);
                    console.error(
                        '[Auth] Session expired. Please log in again.',
                        refreshError
                    );
                    logout();
                    return Promise.reject(refreshError);
                } finally {
                    isRefreshing = false;
                }
            } else {
                console.debug(`[Auth] Not a 401 error or already retried. Status:`, error?.response?.status, '_retry:', originalRequest._retry);
            }

            return Promise.reject(error);
        }
    );

    console.info(`[Auth] Response interceptor registered with ID: ${responseInterceptor}`);
    console.info('[Auth] Authentication interceptors setup complete');

    /**
     * Return cleanup function to remove interceptors
     * Should be called in useEffect cleanup
     */
    return () => {
        console.info('[Auth] Cleaning up authentication interceptors');
        apiClient.interceptors.request.eject(requestInterceptor);
        apiClient.interceptors.response.eject(responseInterceptor);
    };
};

export default apiClient;

/**
 * Helper to create axios instance with authorization header
 * Kept for backward compatibility
 *
 * @deprecated Use apiClient with setupAuthInterceptors instead
 */
export function createAuthorizedAxios(token?: string) {
    const instance = axios.create({
        baseURL:
            process.env.NEXT_PUBLIC_BACKEND_URL ||
            process.env.BACKEND_API_URL ||
            'http://localhost:3000',
        timeout: 30000,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
        },
    });

    instance.interceptors.response.use(
        (response) => response,
        (error) => {
            const message =
                error?.response?.data?.message ||
                error?.message ||
                'Unknown API error';
            return Promise.reject(new Error(message));
        }
    );

    return instance;
}

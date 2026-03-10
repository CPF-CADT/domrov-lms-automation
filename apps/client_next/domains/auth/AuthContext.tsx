'use client';

import {
    useState,
    useEffect,
    useContext,
    createContext,
    useMemo,
    useRef,
    useCallback,
    type ReactNode,
} from 'react';

// ============================================================================
// DTOs imported from Next.js API routes
// These types ensure type safety when communicating with /api/auth and /api/users
// ============================================================================
import type { LoginUserDTO, LoginResponseDto, ApiResponse } from '@/app/api/auth/dto';
import type { UserProfileResponseDto } from '@/app/api/users/dto';

// ============================================================================
// API Client Setup
// Import setupAuthInterceptors to configure axios for token refresh handling
// ============================================================================
import { setupAuthInterceptors } from '@/lib/axiosInstance';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * User interface representing the authenticated user
 * Uses UserProfileResponseDto from the users API for consistency
 */
interface IUser {
    id: number;
    firstName: string;
    lastName?: string;
    email: string;
    profilePictureUrl?: string | null;
}

/**
 * Auth context type exposed to consuming components
 */
interface AuthContextType {
    user: IUser | null;
    login: (credentials: LoginUserDTO) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
    token: string | null;
}

// ============================================================================
// API Client Functions
// These functions call the internal Next.js API routes instead of external APIs
// ============================================================================

/**
 * Generic fetch wrapper for API calls
 * Handles JSON parsing and error extraction
 */
async function fetchAPI<T>(
    url: string,
    options: RequestInit = {}
): Promise<T> {
    const response = await fetch(url, {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || data.message || 'API request failed');
    }

    return data;
}

/**
 * Login via Next.js API route: POST /api/auth?action=login
 * @param credentials - User email and password (LoginUserDTO from dto.ts)
 * @returns ApiResponse containing LoginResponseDto with accessToken
 */
async function apiLogin(credentials: LoginUserDTO): Promise<ApiResponse<LoginResponseDto>> {
    return fetchAPI<ApiResponse<LoginResponseDto>>('/api/auth?action=login', {
        method: 'POST',
        body: JSON.stringify(credentials),
    });
}

/**
 * Logout via Next.js API route: POST /api/auth?action=logout
 * @param token - Current access token for authorization
 */
async function apiLogout(token: string): Promise<void> {
    await fetchAPI('/api/auth?action=logout', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
    });
}

/**
 * Get user profile via Next.js API route: GET /api/users?action=me
 * @param token - Current access token for authorization
 * @returns ApiResponse containing UserProfileResponseDto
 */
async function apiGetProfile(token: string): Promise<ApiResponse<UserProfileResponseDto>> {
    return fetchAPI<ApiResponse<UserProfileResponseDto>>('/api/users?action=me', {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}

// ============================================================================
// Context Creation
// ============================================================================

const AuthContext = createContext<AuthContextType | null>(null);

// ============================================================================
// AuthProvider Component
// ============================================================================

/**
 * AuthProvider - Manages authentication state and provides auth context to children
 *
 * This provider has been refactored to use internal Next.js API routes:
 * - Login: POST /api/auth?action=login
 * - Logout: POST /api/auth?action=logout
 * - Profile: GET /api/users?action=me
 *
 * All DTOs are imported from the respective API route dto.ts files
 */
export function AuthProvider({ children }: { children: ReactNode }) {
    // State for user data, token, and loading status
    const [user, setUser] = useState<IUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Ref to track current token for use in cleanup/effects
    const tokenRef = useRef<string | null>(token);
    useEffect(() => {
        tokenRef.current = token;
    }, [token]);

    /**
     * Handle logout - clears state and localStorage
     * Calls POST /api/auth?action=logout to invalidate server session
     * Using useCallback to maintain stable reference for interceptor closure
     */
    const handleLogout = useCallback(() => {
        // Attempt to call logout API if we have a token
        if (tokenRef.current) {
            // Fire-and-forget: call logout API but don't block on it
            apiLogout(tokenRef.current).catch(() => {
                // Ignore errors during logout - we're clearing local state anyway
            });
        }

        // Clear local state
        setToken(null);
        setUser(null);

        // Clear persisted auth data from localStorage
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
    }, []);

    /**
     * Setup axios interceptors for automatic token refresh
     * Configures request interceptor to add Bearer token
     * Configures response interceptor to handle 401 and refresh token
     */
    useEffect(() => {
        const cleanupInterceptors = setupAuthInterceptors(
            setToken,
            handleLogout,
            tokenRef
        );

        return cleanupInterceptors;
    }, [handleLogout]);

    /**
     * Refresh user profile from API
     * Calls GET /api/users?action=me with current token
     */
    const refreshProfile = async (): Promise<void> => {
        if (!tokenRef.current) {
            throw new Error('No token available');
        }

        try {
            // Call internal Next.js API route to get profile
            // Uses UserProfileResponseDto from /app/api/users/dto.ts
            const response = await apiGetProfile(tokenRef.current);

            // Extract user data - API returns ApiResponse<UserProfileResponseDto>
            const userData = response.data || response;

            // Map to IUser interface
            const mappedUser: IUser = {
                id: userData.id,
                firstName: userData.firstName,
                lastName: userData.lastName,
                email: userData.email,
                profilePictureUrl: userData.profilePictureUrl,
            };

            setUser(mappedUser);
            localStorage.setItem('adminUser', JSON.stringify(mappedUser));
        } catch (error) {
            console.error('Failed to fetch profile:', error);
            handleLogout();
        }
    };

    /**
     * Initialize auth state on mount
     * Attempts to restore session from localStorage and validate with server
     */
    useEffect(() => {
        (async () => {
            try {
                console.info('[Auth] Initializing auth state...');
                // Try to restore from localStorage
                const storedToken = localStorage.getItem('adminToken');
                const storedUser = localStorage.getItem('adminUser');

                console.debug('[Auth] Stored token found:', !!storedToken);

                if (storedToken && storedUser) {
                    // Restore token to state first (needed for API calls)
                    setToken(storedToken);
                    // Update ref immediately for refreshProfile
                    tokenRef.current = storedToken;
                    setUser(JSON.parse(storedUser));

                    console.info('[Auth] Restored session from storage. Validating with server...');
                    // Verify token is still valid by fetching fresh profile
                    // This calls GET /api/users?action=me
                    await refreshProfile();
                    console.info('[Auth] Session validation successful');
                } else {
                    console.info('[Auth] No stored session found');
                }
            } catch (error) {
                console.error('[Auth] Auth initialization error:', error);
                // If validation fails, clear auth state
                handleLogout();
            } finally {
                setIsLoading(false);
                console.info('[Auth] Auth initialization complete');
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Handle login - authenticates user and fetches profile
     * Calls POST /api/auth?action=login with credentials (LoginUserDTO)
     * Then fetches profile via GET /api/users?action=me
     *
     * @param credentials - LoginUserDTO { email: string, password: string }
     */
    const handleLogin = async (credentials: LoginUserDTO) => {
        try {
            // Call internal Next.js API route for login
            // Uses LoginUserDTO and LoginResponseDto from /app/api/auth/dto.ts
            const loginRes = await apiLogin(credentials);

            // Extract access token from response
            // API returns ApiResponse<LoginResponseDto> where LoginResponseDto has accessToken
            const accessToken = loginRes.data?.accessToken || (loginRes as any).accessToken;

            if (!accessToken) {
                throw new Error('Login failed - no access token received');
            }

            // Store token in state and localStorage
            setToken(accessToken);
            tokenRef.current = accessToken;
            localStorage.setItem('adminToken', accessToken);

            // Fetch user profile after successful login
            try {
                const userRes = await apiGetProfile(accessToken);

                // Extract and map user data
                const userData = userRes.data || userRes;
                const mappedUser: IUser = {
                    id: userData.id,
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    email: userData.email,
                    profilePictureUrl: userData.profilePictureUrl,
                };

                setUser(mappedUser);
                localStorage.setItem('adminUser', JSON.stringify(mappedUser));
            } catch (profileError) {
                console.error('Failed to fetch user profile after login:', profileError);
                // Keep the token even if profile fetch fails
                // User can retry profile fetch later
                setUser(null);
                localStorage.removeItem('adminUser');
            }
        } catch (error: any) {
            // Re-throw with meaningful message for login page to display
            throw new Error(error?.message || 'Login failed');
        }
    };

    // Memoize context value to prevent unnecessary re-renders
    const value = useMemo(
        () => ({
            user,
            login: handleLogin,
            logout: handleLogout,
            isAuthenticated: !!token,
            isLoading,
            token,
        }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [user, token, isLoading]
    );

    return (
        <AuthContext.Provider value={value}>
            {!isLoading ? (
                children
            ) : (
                // Loading screen while initializing auth state
                <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 to-gray-800">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4 mx-auto"></div>
                        <p className="text-white text-lg font-medium">Loading...</p>
                    </div>
                </div>
            )}
        </AuthContext.Provider>
    );
}

// ============================================================================
// useAuth Hook
// ============================================================================

/**
 * useAuth - Hook to access auth context
 *
 * @returns AuthContextType with:
 *   - user: Current authenticated user (IUser | null)
 *   - login: Function to login with credentials (LoginUserDTO)
 *   - logout: Function to logout
 *   - isAuthenticated: Boolean indicating auth status
 *   - isLoading: Boolean indicating if auth is being initialized
 *   - token: Current access token (string | null)
 *
 * @throws Error if used outside of AuthProvider
 *
 * @example
 * ```tsx
 * function LoginPage() {
 *   const { login, isLoading, isAuthenticated } = useAuth();
 *
 *   const handleSubmit = async (e: FormEvent) => {
 *     e.preventDefault();
 *     await login({ email, password }); // Uses LoginUserDTO
 *   };
 *
 *   if (isAuthenticated) {
 *     return <Navigate to="/dashboard" />;
 *   }
 *
 *   return <form onSubmit={handleSubmit}>...</form>;
 * }
 * ```
 */
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// ============================================================================
// Re-export types for consumers
// ============================================================================
export type { IUser, AuthContextType, LoginUserDTO };

import {
    useState,
    useEffect,
    useContext,
    createContext,
    useMemo,
    useRef,
    type ReactNode,
} from 'react';
import authService from '@/services/authService';
import userService from '@/services/userService';

export interface IUser {
    id: number;
    firstName: string;
    lastName?: string;
    email: string;
    gender?: string;
    dob?: Date;
    phoneNumber?: string;
    profilePictureUrl?: string;
    isVerified?: boolean;
    isTwoFactorEnable?: boolean;
    status?: string;
}

interface AuthContextType {
    user: IUser | null;
    login: (credentials: { email: string; password: string }) => Promise<void>;
    logout: () => void;
    isAuthenticated: boolean;
    isLoading: boolean;
    token: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<IUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const tokenRef = useRef<string | null>(token);
    useEffect(() => {
        tokenRef.current = token;
    }, [token]);

    const handleLogout = () => {
        if (tokenRef.current) {
            authService.logout().catch(() => {
                // Ignore errors during logout
            });
        }
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    const refreshProfile = async (): Promise<void> => {
        try {
            const userResponse = await userService.getMyProfile();
            // Backend returns user data directly, not wrapped in { data: ... }
            const userData = (userResponse as any).data || userResponse;
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
        } catch (error) {
            console.error('Failed to fetch profile:', error);
            handleLogout();
        }
    };

    // Initialize auth on mount
    useEffect(() => {
        (async () => {
            try {
                // Try to restore from localStorage
                const storedToken = localStorage.getItem('token');
                const storedUser = localStorage.getItem('user');

                if (storedToken && storedUser) {
                    setToken(storedToken);
                    setUser(JSON.parse(storedUser));
                    // Verify token is still valid
                    await refreshProfile();
                }
            } catch {
                handleLogout();
            } finally {
                setIsLoading(false);
            }
        })();

        // Listen for storage changes (e.g., from OAuth callback)
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'token' && e.newValue) {
                console.log('Token updated from OAuth callback');
                setToken(e.newValue);
                // Fetch user profile when token is set via OAuth
                (async () => {
                    try {
                        const userResponse = await userService.getMyProfile();
                        const userData = (userResponse as any).data || userResponse;
                        setUser(userData);
                        localStorage.setItem('user', JSON.stringify(userData));
                    } catch (error) {
                        console.error('Failed to fetch profile after OAuth:', error);
                    }
                })();
            } else if (e.key === 'token' && !e.newValue) {
                // Token was cleared
                handleLogout();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const handleLogin = async (credentials: {
        email: string;
        password: string;
    }) => {
        try {
            const loginRes = await authService.login(credentials);
            // Extract accessToken from response.data or root
            const accessToken = loginRes.accessToken;
            if (!accessToken) {
                throw new Error('Login failed.');
            }
            setToken(accessToken);
            localStorage.setItem('token', accessToken);
            // Fetch user info after login
            try {
                const userRes = await userService.getMyProfile();
                // Backend returns user data directly, not wrapped in { data: ... }
                const userData = (userRes as any).data || userRes;
                setUser(userData);
                localStorage.setItem('user', JSON.stringify(userData));
            } catch (error) {
                console.error('Failed to fetch user profile after login:', error);
                // Still keep the token even if profile fetch fails
                setUser(null);
                localStorage.removeItem('user');
            }
        } catch (error: any) {
            // Expose error to login page
            throw new Error(error?.message || 'Login failed');
        }
    };

    const value = useMemo(
        () => ({
            user,
            login: handleLogin,
            logout: handleLogout,
            isAuthenticated: !!token,
            isLoading,
            token,
        }),
        [user, token, isLoading]
    );

    return (
        <AuthContext.Provider value={value}>
            {!isLoading ? (
                children
            ) : (
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

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context)
        throw new Error('useAuth must be used within an AuthProvider');
    return context;
};

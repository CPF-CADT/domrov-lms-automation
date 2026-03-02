import {
    useState,
    useEffect,
    useContext,
    createContext,
    useMemo,
    useRef,
    type ReactNode,
} from 'react';
import authService from '../services/authService';

interface IUser {
    id: string;
    name: string;
    email: string;
    role: 'admin';
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

// Auth API now handled in authService

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
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
    };

    const refreshProfile = async (): Promise<void> => {
        try {
            const userResponse = await authService.getProfile();
            // Backend returns user data directly, not wrapped in { data: ... }
            const userData = userResponse.data || userResponse;
            setUser(userData);
            localStorage.setItem('adminUser', JSON.stringify(userData));
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
                const storedToken = localStorage.getItem('adminToken');
                const storedUser = localStorage.getItem('adminUser');

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
    }, []);

    const handleLogin = async (credentials: {
        email: string;
        password: string;
    }) => {
        try {
            const loginRes = await authService.login(credentials);
            // Accept accessToken at root level
            const accessToken = loginRes.accessToken;
            if (!accessToken) {
                throw new Error('Login failed.');
            }
            setToken(accessToken);
            localStorage.setItem('adminToken', accessToken);
            // Fetch user info after login
            try {
                const userRes = await authService.getProfile();
                // Backend returns user data directly, not wrapped in { data: ... }
                const userData = userRes.data || userRes;
                setUser(userData);
                localStorage.setItem('adminUser', JSON.stringify(userData));
            } catch (error) {
                console.error('Failed to fetch user profile after login:', error);
                // Still keep the token even if profile fetch fails
                setUser(null);
                localStorage.removeItem('adminUser');
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

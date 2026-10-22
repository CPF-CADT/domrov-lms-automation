import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import AppLoadingScreen from '@/components/feedback/AppLoadingScreen';

interface ProtectedRouteProps {
    children: React.ReactNode;
}

/**
 * ProtectedRoute - Prevents unauthorized users from accessing protected pages.
 * Redirects to login if not authenticated.
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    // Show loading state while checking authentication
    if (isLoading) {
        return <AppLoadingScreen variant="route" />;
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        // Save the attempted URL for redirecting after login
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
}

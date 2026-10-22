import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import AppLoadingScreen from '@/components/feedback/AppLoadingScreen';

interface PublicRouteProps {
    children: React.ReactNode;
}

/**
 * PublicRoute - Redirects authenticated users away from public-only pages (login/signup).
 * If user is already logged in, redirect them to dashboard.
 */
export default function PublicRoute({ children }: PublicRouteProps) {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    // Show loading state while checking authentication
    if (isLoading) {
        return <AppLoadingScreen variant="route" />;
    }

    // Redirect to dashboard if already authenticated
    if (isAuthenticated) {
        // Check if there's a redirect location saved
        const from = (location.state as { from?: Location })?.from?.pathname || '/dashboard';
        return <Navigate to={from} replace />;
    }

    return <>{children}</>;
}

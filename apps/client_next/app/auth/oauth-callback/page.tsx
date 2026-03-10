'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * OAuth Callback Handler Page
 * 
 * This page handles the OAuth redirect from the backend after successful authentication.
 * It extracts the accessToken from the URL and stores it for use in subsequent API calls.
 * 
 * Flow:
 * 1. Backend redirects here with ?accessToken=<token>
 * 2. This page extracts the token from URL
 * 3. Stores token in localStorage
 * 4. Redirects to dashboard
 * 
 * Security:
 * - Token is passed via URL query param (visible in browser) - acceptable for OAuth flow
 * - Token is stored in localStorage (also accessible to JS - not HttpOnly)
 * - Refresh token is stored in HttpOnly cookie by backend (secure)
 */
export default function OAuthCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const accessToken = searchParams.get('accessToken');

    useEffect(() => {
        console.info('[OAuth] Processing OAuth callback...');

        if (!accessToken) {
            console.error('[OAuth] No accessToken in URL. Redirecting to login.');
            router.push('/login');
            return;
        }

        try {
            console.info('[OAuth] Storing accessToken from OAuth callback');

            // Store access token in localStorage
            // Keys: 'adminToken' (primary) or 'authToken' (fallback)
            localStorage.setItem('adminToken', accessToken);
            localStorage.setItem('authToken', accessToken); // Fallback key

            console.info('[OAuth] AccessToken stored successfully');
            console.debug('[OAuth] Token preview:', accessToken.substring(0, 20) + '...');

            // TODO: You might want to fetch user profile here and store it
            // For now, dashboard will handle this via useAuth hook

            // Redirect to dashboard
            console.info('[OAuth] Redirecting to dashboard');
            router.push('/dashboard');
        } catch (error) {
            console.error('[OAuth] Error processing OAuth callback:', error);
            router.push('/login?error=oauth_failed');
        }
    }, [accessToken, router]);

    return (
        <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-900 to-gray-800">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4 mx-auto"></div>
                <p className="text-white text-lg font-medium">Processing OAuth login...</p>
                <p className="text-gray-400 text-sm mt-2">Please wait while we redirect you to the dashboard</p>
            </div>
        </div>
    );
}

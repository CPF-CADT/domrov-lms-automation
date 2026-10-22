"use client";

import { useEffect, useState } from 'react';
import { STORAGE_KEYS, storage } from '@/lib/Storage';
import { useNavigate } from 'react-router-dom';
import AppLoadingScreen from '@/components/feedback/AppLoadingScreen';

export default function OAuthCallback() {
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        const handleOAuthCallback = async () => {
            try {
                console.log('OAuth callback page loaded, calling refresh-token endpoint...');
                console.log('API URL:', import.meta.env.VITE_API_URL);

                // Check if refresh_token cookie is set by backend (automatically included in requests)
                // Call refresh-token endpoint to get access token using the refresh token cookie
                const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/refresh-token`, {
                    method: 'POST',
                    credentials: 'include', // Include cookies in request
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                console.log('Refresh token response status:', response.status);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Refresh token error response:', errorText);
                    throw new Error(`Failed to refresh token: ${response.status}`);
                }

                const data = await response.json();
                console.log('Refresh token response:', data);

                if (data.success && data.data?.accessToken) {
                    // Store access token in localStorage using the same key as AuthContext expects
                    const accessToken = data.data.accessToken;
                    storage.set(STORAGE_KEYS.token, accessToken);
                    console.log('Access token stored successfully');

                    // Emit a storage event to trigger AuthContext update
                    window.dispatchEvent(
                        new StorageEvent('storage', {
                            key: 'token',
                            newValue: accessToken,
                        })
                    );

                    setStatus('success');

                    // Redirect to dashboard after a longer delay to ensure context updates
                    setTimeout(() => {
                        console.log('Redirecting to dashboard...');
                        navigate('/dashboard');
                    }, 1000);
                } else {
                    throw new Error('No access token received');
                }
            } catch (error) {
                console.error('OAuth callback error:', error);
                setStatus('error');
                setErrorMessage(error instanceof Error ? error.message : 'Authentication failed');

                // Redirect to login after 3 seconds
                setTimeout(() => {
                    navigate('/login');
                }, 3000);
            }
        };

        handleOAuthCallback();
    }, [navigate]);

    return (
        <AppLoadingScreen
            variant="google"
            status={status}
            detail={status === 'error' ? `${errorMessage} Redirecting to login in 3 seconds...` : undefined}
        />
    );
}

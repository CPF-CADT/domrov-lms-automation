"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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
                    localStorage.setItem('token', accessToken);
                    console.log('Access token stored successfully');

                    // Emit a storage event to trigger AuthContext update
                    window.dispatchEvent(
                        new StorageEvent('storage', {
                            key: 'token',
                            newValue: accessToken,
                            storageArea: localStorage,
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
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-600 to-purple-800">
            <div className="text-center">
                {status === 'loading' && (
                    <>
                        <div className="inline-flex items-center justify-center w-12 h-12 mb-4 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                        <h2 className="text-2xl font-semibold text-white mb-2">Completing Login</h2>
                        <p className="text-purple-100">Please wait while we authenticate you...</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="inline-flex items-center justify-center w-12 h-12 mb-4 bg-green-500 rounded-full">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-semibold text-white mb-2">Login Successful</h2>
                        <p className="text-purple-100">Redirecting to dashboard...</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="inline-flex items-center justify-center w-12 h-12 mb-4 bg-red-500 rounded-full">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-semibold text-white mb-2">Authentication Failed</h2>
                        <p className="text-red-200 mb-4 font-mono text-sm">{errorMessage}</p>
                        <p className="text-purple-200 text-sm">Check console (F12) for more details</p>
                        <p className="text-purple-200 text-sm mt-2">Redirecting to login in 3 seconds...</p>
                    </>
                )}
            </div>
        </div>
    );
}

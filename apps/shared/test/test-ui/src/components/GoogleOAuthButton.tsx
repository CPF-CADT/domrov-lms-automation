import React from 'react';

interface GoogleOAuthButtonProps {
    redirectUrl?: string; // backend OAuth endpoint
    width?: number;       // popup width
    height?: number;      // popup height
}

const GoogleOAuthButton: React.FC<GoogleOAuthButtonProps> = ({
    redirectUrl = 'http://localhost:3000/auth/google/login',
    width = 500,
    height = 600,
}) => {
    const handleLogin = (): void => {
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const popup = window.open(
            redirectUrl,
            'OAuthLogin',
            `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,status=yes`
        );

        // Optional: listen for message from popup when OAuth completes
        const messageHandler = (event: MessageEvent) => {
            if (event.origin !== 'http://localhost:3000') return; // validate origin
            if (event.data?.type === 'OAUTH_SUCCESS') {
                console.log('User logged in:', event.data.payload);
                popup?.close();
            }
        };

        window.addEventListener('message', messageHandler, false);
    };

    return (
        <button
            onClick={handleLogin}
            style={{
                padding: '10px 20px',
                backgroundColor: '#4285F4',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
            }}
        >
            Sign in with Google
        </button>
    );
};

export default GoogleOAuthButton;
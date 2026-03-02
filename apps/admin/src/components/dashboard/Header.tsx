

import React from 'react';
import { Bell } from 'lucide-react';

/**
 * Header Component
 *
 * Static header section that displays the page title, notifications, and user avatar.
 * Memoized to prevent re-renders from parent component updates.
 *
 * Features:
 * - Fixed at top of dashboard (never re-renders)
 * - Responsive layout
 * - Accessibility-first with ARIA labels
 * - Dark mode support ready
 */
const Header: React.FC = () => (
    <header
        className="flex items-center justify-between pb-6 mb-8 border-b border-neutral-200"
        role="banner"
        aria-label="Dashboard header"
    >
        <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Welcome back! Here's your overview.</p>
        </div>
        <div className="flex items-center gap-6">
            <button
                className="p-2.5 rounded-lg hover:bg-blue-50 transition-colors text-gray-600 hover:text-blue-600 relative"
                aria-label="View notifications"
                title="Notifications"
            >
                <Bell className="w-5 h-5" />
                {/* Notification badge - optional */}
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-neutral-200">
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium text-gray-900">Admin User</p>
                    <p className="text-xs text-gray-500">System Administrator</p>
                </div>
                <img
                    src="https://randomuser.me/api/portraits/women/44.jpg"
                    alt="User profile picture"
                    className="w-10 h-10 rounded-full border-2 border-blue-100 object-cover"
                />
            </div>
        </div>
    </header>
);

Header.displayName = 'Header';

export default React.memo(Header);

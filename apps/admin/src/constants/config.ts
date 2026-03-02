// Application Configuration and Constants

export const APP_NAME = 'Domrov';
export const APP_VERSION = '1.0.0';

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
export const API_TIMEOUT = 30000; // 30 seconds

// Routes
export const ROUTES = {
    LOGIN: '/login',
    DASHBOARD: '/dashboard',
    USERS: '/user',
    PACKAGES: '/packages',
    TRANSACTIONS: '/transactions',
    EVALUATIONS: '/evaluations',
    SETTINGS: '/settings',
} as const;

// UI Constants
export const SIDEBAR_WIDTH = 'w-64';
export const MAIN_PADDING = 'px-6 py-10 md:px-12 md:py-12';
export const MAX_WIDTH_CONTAINER = 'max-w-7xl mx-auto';

// Status Options
export const USER_STATUSES = ['active', 'inactive'] as const;
export const USER_ROLES = ['user', 'admin', 'superadmin'] as const;
export const TRANSACTION_STATUSES = ['completed', 'pending', 'failed'] as const;
export const EVALUATION_STATUSES = ['completed', 'pending', 'failed'] as const;

// UI Colors for Status
export const STATUS_COLORS = {
    active: { bg: 'bg-green-50', text: 'text-green-700', icon: 'text-green-500' },
    inactive: { bg: 'bg-red-50', text: 'text-red-700', icon: 'text-red-500' },
    completed: { bg: 'bg-green-50', text: 'text-green-700', icon: 'text-green-500' },
    pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: 'text-yellow-500' },
    failed: { bg: 'bg-red-50', text: 'text-red-700', icon: 'text-red-500' },
} as const;

// Pagination
export const DEFAULT_PAGE_SIZE = 10;
export const DEFAULT_PAGE = 1;

// Form Validation
export const FORM_VALIDATION = {
    MIN_PASSWORD_LENGTH: 8,
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    PHONE_REGEX: /^[\d\s\-\+\(\)]+$/,
} as const;

// Empty States
export const EMPTY_STATES = {
    NO_DATA: 'No data available',
    NO_RESULTS: 'No results found',
    ERROR: 'Something went wrong. Please try again.',
} as const;

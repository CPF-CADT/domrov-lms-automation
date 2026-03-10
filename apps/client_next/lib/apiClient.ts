/**
 * Client-side API wrapper functions to call internal Next.js API routes
 * Use these functions in your React components to make API calls
 * 
 * This module provides typed API clients that communicate with internal
 * Next.js API routes. All external API calls should go through these
 * functions - do NOT call external APIs directly from components.
 * 
 * IMPORTANT: Uses axios instance with refresh token interceptors configured
 * in axiosInstance.ts. Token refresh is handled automatically on 401 responses.
 */

// ==================== AXIOS CLIENT IMPORT ====================
// Import axios instance with refresh token interceptors already configured
import { apiClient } from './axiosInstance';

// ==================== DTO IMPORTS ====================
// Import DTOs from API routes for proper typing
import type {
    RegisterUserDTO,
    LoginUserDTO,
    LoginResponseDto,
    SignUpResponseDto,
    ApiResponse as AuthApiResponse,
} from '@/app/api/auth/dto';

import type {
    GetMyClassesResponseDto,
    ClassResponseDto,
    CreateClassDto,
    JoinClassResponseDto,
    ClassMembersDto,
    ApiResponse as ClassApiResponse,
} from '@/app/api/class/dto';

import type { UserProfileResponseDto } from '@/app/api/users/dto';

// ==================== STORAGE & UTILITIES ====================

// Storage keys - centralized for consistency
const STORAGE_KEYS = {
    AUTH_TOKEN: 'authToken',    // Primary auth token
    ADMIN_TOKEN: 'adminToken',  // Admin panel token
    AUTH_USER: 'adminUser',     // Cached user data
} as const;

/**
 * Generic axios wrapper for internal API calls
 * Uses axios instance with refresh token interceptors already configured
 * 
 * Benefits over fetch:
 * - Automatic token refresh on 401 responses via interceptors
 * - Automatic request queue while refreshing token
 * - Proper error handling
 * 
 * @param url - API endpoint path (without /api prefix)
 * @param options - Axios request config options
 * @returns Parsed response data
 * @throws Error with message from API response
 */
async function fetchAPI<T>(
    url: string,
    options: any = {}
): Promise<T> {
    try {
        // Make request using axios instance with interceptors
        // Interceptors handle Authorization header and token refresh
        const response = await apiClient.request<T>({
            url,
            ...options,
        });

        return response.data;
    } catch (error: any) {
        // Extract meaningful error message
        const errorMessage =
            error.response?.data?.error ||
            error.response?.data?.message ||
            error.message ||
            'API call failed';

        throw new Error(errorMessage);
    }
}

// ==================== AUTH API ====================
/**
 * Authentication API client
 * Calls: POST /api/auth?action=...
 * DTOs: RegisterUserDTO, LoginUserDTO, LoginResponseDto from @/app/api/auth/dto
 */
export const authAPI = {
    /**
     * Register a new user account
     * @param data - Registration data (RegisterUserDTO)
     * @returns SignUpResponseDto with user info
     */
    signUp: (data: RegisterUserDTO) =>
        fetchAPI<AuthApiResponse<SignUpResponseDto>>('/auth?action=signup', {
            method: 'POST',
            data
        }),

    /**
     * Login with email and password
     * @param data - Login credentials (LoginUserDTO)  
     * @returns LoginResponseDto with accessToken
     */
    login: (data: LoginUserDTO) =>
        fetchAPI<AuthApiResponse<LoginResponseDto>>('/auth?action=login', {
            method: 'POST',
            data
        }),

    /**
     * Logout current user session
     */
    logout: () =>
        fetchAPI('/auth?action=logout', { method: 'POST' }),

    /**
     * Refresh the access token
     */
    refreshToken: () =>
        fetchAPI('/auth?action=refresh-token', { method: 'POST' }),

    /**
     * Verify email with OTP code
     * @param data - Email and OTP code
     */
    verifyOtp: (data: { email: string; otp: string }) =>
        fetchAPI('/auth?action=verify-otp', { method: 'POST', data }),

    /**
     * Resend OTP verification code
     * @param data - Email to send OTP to
     */
    resendOtp: (data: { email: string }) =>
        fetchAPI('/auth?action=resend-otp', { method: 'POST', data }),
};

// ==================== ASSESSMENTS API ====================

export const assessmentsAPI = {
    getByClass: (classId: number) =>
        fetchAPI(`/assessments?action=by-class&classId=${classId}`),

    getByClassSession: (classId: number, sessionId: number) =>
        fetchAPI(`/assessments?action=by-class-session&classId=${classId}&sessionId=${sessionId}`),

    getDetails: (assessmentId: number) =>
        fetchAPI(`/assessments?action=details&assessmentId=${assessmentId}`),

    getTracking: (assessmentId: number) =>
        fetchAPI(`/assessments?action=tracking&assessmentId=${assessmentId}`),

    getStats: (classId: number, assessmentId: number) =>
        fetchAPI(`/assessments?action=stats&classId=${classId}&assessmentId=${assessmentId}`),

    createDraft: (classId: number, session: number) =>
        fetchAPI('/assessments?action=create-draft', {
            method: 'POST',
            data: { classId, session }
        }),

    complete: (assessmentId: number) =>
        fetchAPI('/assessments?action=complete', {
            method: 'POST',
            data: { assessmentId }
        }),

    update: (assessmentId: number, data: any) =>
        fetchAPI(`/assessments?action=update&assessmentId=${assessmentId}`, {
            method: 'PATCH',
            data
        }),

    publish: (assessmentId: number) =>
        fetchAPI(`/assessments?action=publish&assessmentId=${assessmentId}`, { method: 'PATCH' }),

    delete: (assessmentId: number) =>
        fetchAPI(`/assessments?assessmentId=${assessmentId}`, { method: 'DELETE' }),
};

// ==================== CLASS API ====================
/**
 * Class management API client
 * Calls: /api/class?action=...
 * DTOs: CreateClassDto, ClassResponseDto, etc. from @/app/api/class/dto
 */
export const classAPI = {
    /**
     * Get all classes for the current user
     * @returns Array of GetMyClassesResponseDto
     */
    getMyClasses: () =>
        fetchAPI<ClassApiResponse<GetMyClassesResponseDto[]>>('/class?action=my-classes'),

    /**
     * Get a specific class by ID
     * @param classId - Class ID
     * @returns ClassResponseDto
     */
    get: (classId: number) =>
        fetchAPI<ClassApiResponse<ClassResponseDto>>(`/class?action=get&classId=${classId}`),

    /**
     * Get class members
     * @param classId - Class ID
     * @returns ClassMembersDto
     */
    getMembers: (classId: number) =>
        fetchAPI<ClassApiResponse<ClassMembersDto>>(`/class?action=members&classId=${classId}`),

    /**
     * Get class leaderboard
     * @param classId - Class ID
     */
    getLeaderboard: (classId: number) =>
        fetchAPI(`/class?action=leaderboard&classId=${classId}`),

    /**
     * Create a new class
     * @param data - CreateClassDto with name and optional description
     * @returns Created ClassResponseDto
     */
    create: (data: CreateClassDto) =>
        fetchAPI<ClassApiResponse<ClassResponseDto>>('/class?action=create', {
            method: 'POST',
            data
        }),

    /**
     * Join a class using join code
     * @param joinCode - Class join code
     * @returns JoinClassResponseDto
     */
    joinByCode: (joinCode: string) =>
        fetchAPI<ClassApiResponse<JoinClassResponseDto>>('/class?action=join-by-code', {
            method: 'POST',
            data: { joinCode }
        }),

    /**
     * Join a class using invitation token
     * @param token - Invitation token
     * @returns JoinClassResponseDto
     */
    joinByToken: (token: string) =>
        fetchAPI<ClassApiResponse<JoinClassResponseDto>>('/class?action=join-by-token', {
            method: 'POST',
            data: { token }
        }),

    inviteMembers: (classId: number, emails: string[]) =>
        fetchAPI('/class?action=invite-members', {
            method: 'POST',
            data: { classId, emails }
        }),

    transferOwnership: (classId: number, newOwnerId: number) =>
        fetchAPI('/class?action=transfer-ownership', {
            method: 'POST',
            data: { classId, newOwnerId }
        }),

    assignTA: (classId: number, userId: number) =>
        fetchAPI('/class?action=assign-ta', {
            method: 'POST',
            data: { classId, userId }
        }),

    complete: (classId: number) =>
        fetchAPI('/class?action=complete', {
            method: 'POST',
            data: { classId }
        }),

    update: (classId: number, data: any) =>
        fetchAPI(`/class?classId=${classId}`, {
            method: 'PATCH',
            data
        }),

    delete: (classId: number) =>
        fetchAPI(`/class?action=delete&classId=${classId}`, { method: 'DELETE' }),

    removeMember: (classId: number, userId: number) =>
        fetchAPI(`/class?action=remove-member&classId=${classId}&userId=${userId}`, { method: 'DELETE' }),
};

// ==================== USERS API ====================
/**
 * User profile API client
 * Calls: /api/users?action=...
 * DTOs: UserProfileResponseDto, etc. from @/app/api/users/dto
 */
export const usersAPI = {
    /**
     * Get current user's profile
     * @returns UserProfileResponseDto
     */
    getMyProfile: () =>
        fetchAPI<{ success: boolean; data: UserProfileResponseDto }>('/users?action=me'),

    /**
     * Search for users
     * @param query - Search parameters
     */
    search: (query: { id?: number; email?: string; firstName?: string; lastName?: string; phoneNumber?: string }) => {
        const params = new URLSearchParams({ action: 'search' });
        if (query.id) params.append('id', query.id.toString());
        if (query.email) params.append('email', query.email);
        if (query.firstName) params.append('firstName', query.firstName);
        if (query.lastName) params.append('lastName', query.lastName);
        if (query.phoneNumber) params.append('phoneNumber', query.phoneNumber);
        return fetchAPI(`/users?${params.toString()}`);
    },

    /**
     * Update current user's profile
     * @param data - Profile data to update
     */
    updateProfile: (data: any) =>
        fetchAPI('/users', { method: 'PATCH', data }),

    /**
     * Change user's password
     * @param data - Current and new password
     */
    changePassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
        fetchAPI('/users?action=change-password', { method: 'POST', data }),
};

// ==================== TEAM API ====================

export const teamAPI = {
    getByClass: (classId: number) =>
        fetchAPI(`/team?action=by-class&classId=${classId}`),

    getDetails: (teamId: number) =>
        fetchAPI(`/team?action=details&teamId=${teamId}`),

    create: (data: { name: string; maxMember: number; classId: number }) =>
        fetchAPI('/team?action=create', { method: 'POST', data }),

    createMany: (data: any) =>
        fetchAPI('/team?action=create-many', { method: 'POST', data }),

    joinByCode: (joinCode: string) =>
        fetchAPI('/team?action=join-by-code', {
            method: 'POST',
            data: { joinCode }
        }),

    joinByToken: (token: string) =>
        fetchAPI('/team?action=join-by-token', {
            method: 'POST',
            data: { token }
        }),

    invite: (teamId: number, email: string) =>
        fetchAPI('/team?action=invite', {
            method: 'POST',
            data: { teamId, email }
        }),

    leave: (teamId: number) =>
        fetchAPI(`/team?action=leave&teamId=${teamId}`, { method: 'DELETE' }),

    removeMember: (teamId: number, memberId: number) =>
        fetchAPI(`/team?action=remove-member&teamId=${teamId}&memberId=${memberId}`, { method: 'DELETE' }),
};

// ==================== SUBMISSIONS API ====================

export const submissionsAPI = {
    getMyStatusInClass: (classId: number) =>
        fetchAPI(`/submissions?action=my-status-in-class&classId=${classId}`),

    getMyStatus: (assessmentId: number) =>
        fetchAPI(`/submissions?action=my-status&assessmentId=${assessmentId}`),

    getRoster: (assessmentId: number) =>
        fetchAPI(`/submissions?action=roster&assessmentId=${assessmentId}`),

    getStats: (assessmentId: number) =>
        fetchAPI(`/submissions?action=stats&assessmentId=${assessmentId}`),

    grade: (submissionId: number, data: { score: number; feedback?: string }) =>
        fetchAPI('/submissions?action=grade', {
            method: 'POST',
            data: { submissionId, ...data }
        }),

    addFeedback: (submissionId: number, feedback: any) =>
        fetchAPI('/submissions?action=add-feedback', {
            method: 'POST',
            data: { submissionId, ...feedback }
        }),

    updateFeedback: (feedbackId: string, data: any) =>
        fetchAPI(`/submissions?feedbackId=${feedbackId}`, {
            method: 'PATCH',
            data
        }),
};

// ==================== EVALUATIONS API ====================

export const evaluationsAPI = {
    getFileContent: (submissionId: number, filePath: string) =>
        fetchAPI(`/evaluations?action=file-content&submissionId=${submissionId}&filePath=${encodeURIComponent(filePath)}`),

    getFolderStructure: (submissionId: number) =>
        fetchAPI(`/evaluations?action=folder-structure&submissionId=${submissionId}`),

    addToQueue: (submission_id: string) =>
        fetchAPI('/evaluations?action=add-to-queue', {
            method: 'POST',
            data: { submission_id }
        }),
};

// ==================== WALLET API ====================

export const walletAPI = {
    getBalance: () =>
        fetchAPI('/wallet?action=balance'),

    getTransactions: (page: number = 1, limit: number = 10) =>
        fetchAPI(`/wallet?action=transactions&page=${page}&limit=${limit}`),

    getPackages: () =>
        fetchAPI('/wallet?action=packages'),
};

// ==================== FILE API ====================

export const fileAPI = {
    getPresignedUrl: (params: {
        filename: string;
        contentType: string;
        resourceType: string;
        resourceId: number
    }) => {
        const searchParams = new URLSearchParams({
            action: 'presigned-url',
            ...params,
            resourceId: params.resourceId.toString(),
        });
        return fetchAPI(`/file?${searchParams.toString()}`);
    },

    notifyUpload: (data: { key: string; filename: string }) =>
        fetchAPI('/file?action=notify-upload', {
            method: 'POST',
            data
        }),

    download: (resourceId: number) =>
        apiClient.get(`/file?action=download&resourceId=${resourceId}`, {
            responseType: 'blob'
        }).then(res => res.data),
};

// ==================== PAYMENT API ====================

export const paymentAPI = {
    startPayment: (packageId: number) =>
        fetchAPI('/payment?action=start-payment', {
            method: 'POST',
            data: { packageId }
        }),

    checkTransaction: (data: { hash: string; amount: number; currency: string }) =>
        fetchAPI('/payment?action=check-transaction', {
            method: 'POST',
            data
        }),
};

// ==================== USER AI API ====================

export const userAIAPI = {
    getAll: () =>
        fetchAPI('/user-ai?action=all'),

    get: (keyId: number) =>
        fetchAPI(`/user-ai?action=get&keyId=${keyId}`),

    getLogs: (limit?: number, offset?: number) => {
        const params = new URLSearchParams({ action: 'logs' });
        if (limit) params.append('limit', limit.toString());
        if (offset) params.append('offset', offset.toString());
        return fetchAPI(`/user-ai?${params.toString()}`);
    },

    create: (data: any) =>
        fetchAPI('/user-ai', { method: 'POST', data }),

    update: (keyId: number, data: any) =>
        fetchAPI(`/user-ai?keyId=${keyId}`, {
            method: 'PATCH',
            data
        }),

    delete: (keyId: number) =>
        fetchAPI(`/user-ai?keyId=${keyId}`, { method: 'DELETE' }),
};

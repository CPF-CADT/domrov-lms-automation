import axiosInstance from '@/lib/axiosInstance';
import type { MessageResponse } from '@/types/api';
import type {
    RegisterUserDTO,
    LoginUserDTO,
    VerifyOtpDTO,
    ResendOtpDTO,
    SignUpResponseDto,
    LoginResponseDto,
    RefreshTokenResponseDto,
    AuthMessageResponseDto,
} from '@/types/auth';

/**
 * Register a new user account
 */
export async function signUp(data: RegisterUserDTO): Promise<SignUpResponseDto> {
    const response = (await axiosInstance.post('/auth/sign-up', data)).data;
    return response.data;
}

/**
 * Login user with email and password
 */
export async function login(data: LoginUserDTO): Promise<LoginResponseDto> {
    const response = (await axiosInstance.post('/auth/login', data)).data;
    return response.data;
}

/**
 * Logout user - clears token from storage and calls API
 */
export async function logout(): Promise<AuthMessageResponseDto> {
    const response = (await axiosInstance.post('/auth/logout')).data;
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    return response.data;
}

/**
 * Refresh access token using refresh token
 */
export async function refreshToken(): Promise<RefreshTokenResponseDto> {
    const response = (await axiosInstance.post('/auth/refresh-token')).data;
    return response.data;
}

/**
 * Verify OTP for email confirmation
 */
export async function verifyOtp(data: VerifyOtpDTO): Promise<MessageResponse> {
    const response = (await axiosInstance.post('/auth/verify-email', data)).data;
    return response.data;
}

/**
 * Resend OTP to user email
 */
export async function resendOtp(data: ResendOtpDTO): Promise<MessageResponse> {
    const response = (await axiosInstance.post('/auth/resend-verification', data)).data;
    return response.data;
}

const authService = {
    signUp,
    login,
    logout,
    refreshToken,
    verifyOtp,
    resendOtp,
};

export default authService;

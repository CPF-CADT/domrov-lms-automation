// /api/auth/auth.api.ts
import axiosInstance from '../axios';
import {
  RegisterUserDTO,
  LoginUserDTO,
  SignUpResponseDto,
  LoginResponseDto,
  RefreshTokenResponseDto,
  AuthMessageResponseDto,
  VerifyOtpDTO,
  ResendOtpDTO,
  MessageResponseDto
} from './dto';

/**
 * Register a new user account
 */
export async function signUp(data: RegisterUserDTO): Promise<SignUpResponseDto> {
  try {
    const response = await axiosInstance.post<SignUpResponseDto>('/auth/sign-up', data);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      error?.message ||
      'Unknown API error'
    );
  }
}

/**
 * Login user with email and password
 */
export async function login(data: LoginUserDTO): Promise<LoginResponseDto> {
  try {
    const response = await axiosInstance.post<LoginResponseDto>('/auth/login', data);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      error?.message ||
      'Unknown API error'
    );
  }
}

/**
 * Logout user - clears token from storage
 */
export async function logout(): Promise<void> {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  } catch (error: any) {
    throw new Error('Failed to logout');
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshToken(): Promise<RefreshTokenResponseDto> {
  try {
    const response = await axiosInstance.post<RefreshTokenResponseDto>('/auth/refresh-token');
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      error?.message ||
      'Unknown API error'
    );
  }
}


/**
 * Verify OTP for email confirmation
 */
export async function verifyOtp(data: VerifyOtpDTO): Promise<AuthMessageResponseDto> {
  try {
    const response = await axiosInstance.post<AuthMessageResponseDto>('/auth/verify-otp', data);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      error?.message ||
      'Unknown API error'
    );
  }
}

/**
 * Resend OTP to user email
 */
export async function resendOtp(data: ResendOtpDTO): Promise<MessageResponseDto> {
  try {
    const response = await axiosInstance.post<MessageResponseDto>('/auth/resend-otp', data);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      error?.message ||
      'Unknown API error'
    );
  }
}

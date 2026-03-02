// /api/user/user.api.ts

import axiosInstance from '../axios';
import {
  UserResponseDto,
  UpdateProfileDto,
  ChangePasswordDto,
  UserProfileResponseDto,
  UpdateProfileResponseDto,
  SharedUserResponseDto
} from './dto';

/**
 * Get user profile by ID
 */
export async function getUser(id: number): Promise<UserResponseDto> {
  try {
    const response = await axiosInstance.get<UserResponseDto>(`/user/${id}`);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      error?.message ||
      'Failed to get user'
    );
  }
}

/**
 * Get current user's profile
 */
export async function getMyProfile(): Promise<UserProfileResponseDto> {
  try {
    const response = await axiosInstance.get<UserProfileResponseDto>(`/user/profile`);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      error?.message ||
      'Failed to get profile'
    );
  }
}

/**
 * Update current user's profile
 */
export async function updateMyProfile(data: UpdateProfileDto): Promise<UpdateProfileResponseDto> {
  try {
    const response = await axiosInstance.patch<UpdateProfileResponseDto>(`/user/profile`, data);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      error?.message ||
      'Failed to update profile'
    );
  }
}

/**
 * Change user's password
 */
export async function changePassword(data: ChangePasswordDto): Promise<{ message: string }> {
  try {
    const response = await axiosInstance.post<{ message: string }>(`/user/change-password`, data);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      error?.message ||
      'Failed to change password'
    );
  }
}

/**
 * Search for users
 */
export async function searchUsers(query?: string): Promise<SharedUserResponseDto[]> {
  try {
    const response = await axiosInstance.get<SharedUserResponseDto[]>(`/user/search`, {
      params: { query }
    });
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      error?.message ||
      'Failed to search users'
    );
  }
}

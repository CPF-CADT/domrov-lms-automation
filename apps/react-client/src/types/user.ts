import type { UserStatus } from './enums';

export interface User {
  user_id: number;
  first_name: string;
  last_name: string;
  gender: string;
  phone_number: string;
  email: string;
  profile_picture_url: string;
  is_verified: boolean;
  is_two_factor_enable: boolean;
  dob: Date;
}

// API DTOs
export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  gender?: string;
  dob?: Date;
  phoneNumber?: string;
  profilePictureUrl?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserProfileResponseDto {
  id: number;
  firstName: string;
  lastName?: string;
  email: string;
  gender?: string;
  dob?: Date;
  phoneNumber?: string;
  profilePictureUrl?: string;
  isVerified: boolean;
  isTwoFactorEnable: boolean;
  status: UserStatus;
  created_at: Date;
  updated_at: Date;
}

export interface UpdateProfileResponseDto {
  message: string;
  user: UserProfileResponseDto;
}

export interface ChangePasswordResponseDto {
  message: string;
}

export interface UserListItemDto {
  id: number;
  firstName: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
  status: UserStatus;
  isVerified: boolean;
}

export interface UserBasicInfoDto {
  id: number;
  firstName: string;
  lastName: string;
}

export interface UserResponseDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  profilePictureUrl: string | null;
}

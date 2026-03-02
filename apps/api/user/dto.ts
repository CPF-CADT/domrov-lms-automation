// /api/user/dto.ts

export interface UserResponseDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  profilePictureUrl: string | null;
}

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
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface UpdateProfileResponseDto {
  message: string;
  user: UserProfileResponseDto;
}

export interface ChangePasswordResponseDto {
  message: string;
  status: string;
}

export interface SharedUserResponseDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  profilePictureUrl?: string | null;
}

export interface SearchUsersResponseDto extends SharedUserResponseDto {}

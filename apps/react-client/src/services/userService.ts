import axiosInstance from '@/lib/axiosInstance';
import type { ApiResponse } from '@/types/api';
import type {
    UserProfileResponseDto,
    UpdateProfileDto,
    ChangePasswordDto,
    UpdateProfileResponseDto,
    ChangePasswordResponseDto,
    UserListItemDto,
} from '@/types/user';

/**
 * Get current user's profile
 */
export async function getMyProfile(): Promise<UserProfileResponseDto> {
    const response = (await axiosInstance.get('/users/me')).data;
    return response.data;
}

/**
 * Update current user's profile
 */
export async function updateMyProfile(data: UpdateProfileDto): Promise<UpdateProfileResponseDto> {
    const response = (await axiosInstance.patch('/users/me', data)).data;
    return response.data;
}

/**
 * Change user's password
 */
export async function changePassword(data: ChangePasswordDto): Promise<ChangePasswordResponseDto> {
    const response = (await axiosInstance.post('/users/change-password', data)).data;
    return response.data;
}

/**
 * Search for users
 */
export async function searchUsers(query?: {
    id?: number;
    email?: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
}): Promise<UserListItemDto[]> {
    const response = (await axiosInstance.get('/users/search', {
        params: query
    })).data;
    return response.data;
}

const userService = {
    getMyProfile,
    updateMyProfile,
    changePassword,
    searchUsers,
};

export default userService;

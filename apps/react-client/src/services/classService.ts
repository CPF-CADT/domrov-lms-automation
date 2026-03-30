import axiosInstance from '@/lib/axiosInstance';
import type { ApiResponse, MessageResponse } from '@/types/api';
import type {
    ClassResponseDto,
    GetMyClassesResponseDto,
    CreateClassDto,
    UpdateClassDto,
    JoinClassByCodeDto,
    JoinClassByTokenDto,
    JoinClassResponseDto,
    ClassMembersDto,
    InviteMembersDto,
    TransferOwnershipDto,
    LeaderboardItemDto,
} from '@/types/class';

/**
 * Create a new class
 */
export async function createClass(data: CreateClassDto): Promise<ClassResponseDto> {
    const response = (await axiosInstance.post('/class', data)).data;
    return response.data;
}

/**
 * Get all classes for current user
 */
export async function getMyClasses(): Promise<GetMyClassesResponseDto[]> {
    const response = (await axiosInstance.get('/class/my-classes')).data;
    return response.data;
}

/**
 * Get a specific class by ID
 */
export async function getClass(classId: number): Promise<ClassResponseDto> {
    const response = (await axiosInstance.get(`/class/${classId}`)).data;
    return response.data;
}

/**
 * Update class information
 */
export async function updateClass(classId: number, data: UpdateClassDto): Promise<ClassResponseDto> {
    const response = (await axiosInstance.patch(`/class/${classId}`, data)).data;
    return response.data;
}

/**
 * Delete a class
 */
export async function deleteClass(classId: number): Promise<MessageResponse> {
    const response = (await axiosInstance.delete(`/class/${classId}`)).data;
    return response;
}

/**
 * Join a class using join code
 */
export async function joinClassByCode(data: JoinClassByCodeDto): Promise<JoinClassResponseDto> {
    const response = (await axiosInstance.post('/class/join/code', data)).data;
    return response.data;
}

/**
 * Join a class using join token
 */
export async function joinClassByToken(data: JoinClassByTokenDto): Promise<JoinClassResponseDto> {
    const response = (await axiosInstance.post('/class/join/token', data)).data;
    return response.data;
}

/**
 * Get class members
 */
export async function getClassMembers(classId: number): Promise<ClassMembersDto[]> {
    const response = (await axiosInstance.get(`/class/${classId}/members`)).data;
    return response.data;
}

/**
 * Invite members to class
 */
export async function inviteMembers(classId: number, data: InviteMembersDto): Promise<MessageResponse> {
    const response = (await axiosInstance.post(`/class/${classId}/members`, data)).data;
    return response;
}

/**
 * Remove member from class
 */
export async function removeMember(classId: number, userId: number): Promise<MessageResponse> {
    const response = (await axiosInstance.delete(`/class/${classId}/members/${userId}`)).data;
    return response;
}

/**
 * Transfer class ownership
 */
export async function transferOwnership(classId: number, data: TransferOwnershipDto): Promise<MessageResponse> {
    const response = (await axiosInstance.post(`/class/${classId}/transfer-ownership`, data)).data;
    return response;
}

/**
 * Get class leaderboard
 */
export async function getLeaderboard(classId: number): Promise<LeaderboardItemDto[]> {
    const response = (await axiosInstance.get(`/class/${classId}/leaderboard`)).data;
    return response.data;
}

const classService = {
    createClass,
    getMyClasses,
    getClass,
    updateClass,
    deleteClass,
    joinClassByCode,
    joinClassByToken,
    getClassMembers,
    inviteMembers,
    removeMember,
    transferOwnership,
    getLeaderboard,
};

export default classService;

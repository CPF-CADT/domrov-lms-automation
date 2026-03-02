// /api/class/class.api.ts
import axiosInstance from '../axios';
import {
  ClassResponseDto,
  CreateClassDto,
  UpdateClassDto,
  JoinClassByCodeDto,
  JoinClassByTokenDto,
  JoinClassResponseDto,
  LeaderboardItemDto,
  ClassMembersDto,
  InviteMembersDto,
  TransferOwnershipDto,
  AssignTADto,
  CompleteClassResponseDto,
  GetMyClassesResponseDto
} from './dto';

/**
 * Create a new class
 */
export async function createClass(data: CreateClassDto): Promise<ClassResponseDto> {
  try {
    const response = await axiosInstance.post<ClassResponseDto>(`/class`, data);
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
 * Get all classes for current user
 */
export async function getMyClasses(): Promise<GetMyClassesResponseDto[]> {
  try {
    const response = await axiosInstance.get<GetMyClassesResponseDto[]>(`/class/my-classes`);
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
 * Get a specific class by ID
 */
export async function getClass(classId: number): Promise<ClassResponseDto> {
  try {
    const response = await axiosInstance.get<ClassResponseDto>(`/class/${classId}`);
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
 * Update class information
 */
export async function updateClass(classId: number, data: UpdateClassDto): Promise<ClassResponseDto> {
  try {
    const response = await axiosInstance.patch<ClassResponseDto>(`/class/${classId}`, data);
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
 * Delete a class
 */
export async function deleteClass(classId: number): Promise<{ message: string }> {
  try {
    const response = await axiosInstance.delete<{ message: string }>(`/class/${classId}`);
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
 * Join a class using join code
 */
export async function joinClassByCode(data: JoinClassByCodeDto): Promise<JoinClassResponseDto> {
  try {
    const response = await axiosInstance.post<JoinClassResponseDto>(`/class/join/code`, data);
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
 * Join a class using join token
 */
export async function joinClassByToken(data: JoinClassByTokenDto): Promise<JoinClassResponseDto> {
  try {
    const response = await axiosInstance.post<JoinClassResponseDto>(`/class/join/token`, data);
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
 * Get class members
 */
export async function getClassMembers(classId: number): Promise<ClassMembersDto[]> {
  try {
    const response = await axiosInstance.get<ClassMembersDto[]>(`/class/${classId}/members`);
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
 * Invite members to class
 */
export async function inviteMembers(classId: number, data: InviteMembersDto): Promise<{ message: string }> {
  try {
    const response = await axiosInstance.post<{ message: string }>(
      `/class/${classId}/members`,
      data
    );
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
 * Remove member from class
 */
export async function removeMember(classId: number, userId: number): Promise<{ message: string }> {
  try {
    const response = await axiosInstance.delete<{ message: string }>(
      `/class/${classId}/members/${userId}`
    );
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
 * Transfer class ownership
 */
export async function transferOwnership(classId: number, data: TransferOwnershipDto): Promise<{ message: string }> {
  try {
    const response = await axiosInstance.post<{ message: string }>(
      `/class/${classId}/transfer-ownership`,
      data
    );
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
 * Assign TA to class
 */
export async function assignTA(classId: number, data: AssignTADto): Promise<{ message: string }> {
  try {
    const response = await axiosInstance.post<{ message: string }>(
      `/class/${classId}/assign-ta`,
      data
    );
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
 * Complete a class
 */
export async function completeClass(classId: number): Promise<CompleteClassResponseDto> {
  try {
    const response = await axiosInstance.post<CompleteClassResponseDto>(
      `/class/${classId}/complete`
    );
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
 * Get class leaderboard
 */
export async function getLeaderboard(classId: number): Promise<LeaderboardItemDto[]> {
  try {
    const response = await axiosInstance.get<LeaderboardItemDto[]>(
      `/class/${classId}/leaderboard`
    );
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      error?.message ||
      'Unknown API error'
    );
  }
}

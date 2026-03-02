// /api/user-ai/user-ai.api.ts
import axiosInstance from '../axios';
import {
  CreateUserAIKeyDto,
  UserAIKeyResponseDto,
  UpdateUserAIKeyDto,
  UserAILogsResponseDto,
  UserAILogByModelResponseDto
} from './dto';

/**
 * Create a new AI key for the user
 */
export async function createUserAIKey(data: CreateUserAIKeyDto): Promise<UserAIKeyResponseDto> {
  try {
    const response = await axiosInstance.post<UserAIKeyResponseDto>(`/user-ai`, data);
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
 * Get all AI keys for the user
 */
export async function getAllUserAIKeys(): Promise<UserAIKeyResponseDto[]> {
  try {
    const response = await axiosInstance.get<UserAIKeyResponseDto[]>(`/user-ai`);
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
 * Get a specific AI key by ID
 */
export async function getUserAIKey(keyId: number): Promise<UserAIKeyResponseDto> {
  try {
    const response = await axiosInstance.get<UserAIKeyResponseDto>(`/user-ai/${keyId}`);
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
 * Update an AI key
 */
export async function updateUserAIKey(
  keyId: number,
  data: UpdateUserAIKeyDto
): Promise<UserAIKeyResponseDto> {
  try {
    const response = await axiosInstance.patch<UserAIKeyResponseDto>(`/user-ai/${keyId}`, data);
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
 * Delete an AI key
 */
export async function deleteUserAIKey(keyId: number): Promise<{ message: string }> {
  try {
    const response = await axiosInstance.delete<{ message: string }>(`/user-ai/${keyId}`);
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
 * Get usage logs for the user's AI keys
 */
export async function getUserAIUsageLogs(): Promise<UserAILogsResponseDto[]> {
  try {
    const response = await axiosInstance.get<UserAILogsResponseDto[]>(`/user-ai/user/logs`);
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
 * Get usage logs for a specific AI model
 */
export async function getAIModelUsageLogs(keyId: number): Promise<UserAILogByModelResponseDto[]> {
  try {
    const response = await axiosInstance.get<UserAILogByModelResponseDto[]>(
      `/user-ai/model/${keyId}`
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

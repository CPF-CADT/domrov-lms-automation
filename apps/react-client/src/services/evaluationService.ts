import axiosInstance from '@/lib/axiosInstance';

import type {
  ProcessSubmissionResponseDto,
  FolderStructureResponseDto,
  AddToQueueDto,
  AddToQueueResponseDto,
} from '@/types/evaluation';
import type {
  AIProviderDto,
  CreateUserAIKeyDto,
  UserAIKeyResponseDto,
  UpdateUserAIKeyDto,
} from "@/types/ai";

/**
 * Get the content of a file in a submission
 */
export async function getSubmissionFileContent(
  submissionId: number,
  filePath: string
): Promise<{ message: string; data: ProcessSubmissionResponseDto }> {
  const response = (await axiosInstance.get(
    `/evaluations/submission/${submissionId}/file`,
    { params: { file_path: filePath } }
  )).data;
  return response.data;
}

/**
 * Get the folder structure of a submission
 */
export async function getSubmissionFolderStructure(
  submissionId: number
): Promise<{ message: string; data: FolderStructureResponseDto }> {
  const response = (await axiosInstance.get(
    `/evaluations/submission/${submissionId}/folder-structure`
  )).data;
  return response.data;
}

/**
 * Add submission to evaluation queue
 */
export async function addToEvaluationQueue(data: AddToQueueDto): Promise<AddToQueueResponseDto> {
  const response = (await axiosInstance.post('/evaluations/queue', data)).data;
  return response.data;
}

/**
 * Save AI configuration
 */
export async function saveAIConfig(config: {
  provider: string;
  model: string;
  apiKey: string;
  apiEndpoint: string;
}): Promise<{ message: string }> {
  const response = (await axiosInstance.post(
    '/evaluations/ai-config',
    config
  )).data;
  return response.data;
}

/**
 * Fetch all AI providers
 */
export async function fetchAIProviders(): Promise<AIProviderDto[]> {
  const response = (await axiosInstance.get('/user-ai/providers')).data;
  return response.data;
}

/**
 * Create a new AI key
 * apiEndpoint added — required for gemini, ollama, openrouter, grok, custom
 */
export async function createAIKey(
  data: CreateUserAIKeyDto & { apiEndpoint?: string }
): Promise<UserAIKeyResponseDto> {
  const response = (await axiosInstance.post('/user-ai', data)).data;
  return response.data;
}

/**
 * Fetch all AI keys for the authenticated user
 */
export async function fetchAIKeys(): Promise<UserAIKeyResponseDto[]> {
  const response = (await axiosInstance.get('/user-ai')).data;
  return response.data;
}

/**
 * Fetch a single AI key by ID
 */
export async function fetchAIKeyById(id: number): Promise<UserAIKeyResponseDto> {
  const response = (await axiosInstance.get(`/user-ai/${id}`)).data;
  return response.data;
}

/**
 * Update an existing AI key
 * ✅ apiEndpoint added — can be updated for non-managed providers
 */
export async function updateAIKey(
  id: number,
  data: UpdateUserAIKeyDto & { apiEndpoint?: string }
): Promise<UserAIKeyResponseDto> {
  const response = (await axiosInstance.patch(`/user-ai/${id}`, data)).data;
  return response.data;
}

/**
 * Delete an AI key
 */
export async function deleteAIKey(id: number): Promise<{ message: string }> {
  const response = (await axiosInstance.delete(`/user-ai/${id}`)).data;
  return response.data;
}

const evaluationService = {
  getSubmissionFileContent,
  getSubmissionFolderStructure,
  addToEvaluationQueue,
  saveAIConfig,
  fetchAIProviders,
  createAIKey,
  fetchAIKeys,
  fetchAIKeyById,
  updateAIKey,
  deleteAIKey,
};

export default evaluationService;
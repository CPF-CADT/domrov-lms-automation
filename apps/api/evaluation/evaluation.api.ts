// /api/evaluation/evaluation.api.ts

import axiosInstance from '../axios';
import {
  FileContentResponseDto,
  FolderStructureResponseDto,
  AddToQueueDto,
  AddToQueueResponseDto,
} from './dto';

/**
 * Get the content of a file in a submission
 */
export async function getSubmissionFileContent(
  submissionId: number,
  filePath: string
): Promise<FileContentResponseDto> {
  try {
    const response = await axiosInstance.get<FileContentResponseDto>(
      `/evaluations/submission/${submissionId}/file`,
      { params: { filePath } }
    );
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      error?.message ||
      'Failed to get file content'
    );
  }
}

/**
 * Get the folder structure of a submission
 */
export async function getSubmissionFolderStructure(
  submissionId: number
): Promise<FolderStructureResponseDto> {
  try {
    const response = await axiosInstance.get<FolderStructureResponseDto>(
      `/evaluations/submission/${submissionId}/folder-structure`
    );
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      error?.message ||
      'Failed to get folder structure'
    );
  }
}

/**
 * Add submission to evaluation queue
 */
export async function addToEvaluationQueue(
  data: AddToQueueDto
): Promise<AddToQueueResponseDto> {
  try {
    const response = await axiosInstance.post<AddToQueueResponseDto>(
      `/evaluations/queue`,
      data
    );
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      error?.message ||
      'Failed to add to evaluation queue'
    );
  }
}

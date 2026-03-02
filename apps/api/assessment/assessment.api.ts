// /api/assessment/assessment.api.ts
import axiosInstance from '../axios';
import {
  AssessmentListItemDto,
  AssessmentDetailDto,
  CreateDraftResponseDto,
  PublishAssessmentResponseDto,
  UpdateAssessmentResponseDto,
  DeleteAssessmentResponseDto,
  AssessmentTrackingResponseDto,
  AssessmentStatsResponseDto,
  CompleteAssessmentResponseDto,
  CreateAssessmentDto,
  UpdateAssessmentDto
} from './dto';

/**
 * Get assessments for a specific class
 */
export async function getAssessmentsByClass(classId: number): Promise<AssessmentListItemDto[]> {
  try {
    const response = await axiosInstance.get<AssessmentListItemDto[]>(
      `/assessments/class/${classId}`
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
 * Get assessments for a specific class session
 */
export async function getAssessmentsByClassSession(
  classId: number,
  sessionId: number
): Promise<AssessmentListItemDto[]> {
  try {
    const response = await axiosInstance.get<AssessmentListItemDto[]>(
      `/assessments/class/${classId}/${sessionId}`
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
 * Get detailed information about a specific assessment
 */
export async function getAssessmentDetails(assessmentId: number): Promise<AssessmentDetailDto> {
  try {
    const response = await axiosInstance.get<AssessmentDetailDto>(
      `/assessments/${assessmentId}`
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
 * Create a new assessment draft
 */
export async function createAssessmentDraft(data: CreateAssessmentDto): Promise<CreateDraftResponseDto> {
  try {
    const response = await axiosInstance.post<CreateDraftResponseDto>(
      `/assessments`,
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
 * Update an assessment draft
 */
export async function updateAssessment(
  assessmentId: number,
  data: UpdateAssessmentDto
): Promise<UpdateAssessmentResponseDto> {
  try {
    const response = await axiosInstance.patch<UpdateAssessmentResponseDto>(
      `/assessments/${assessmentId}`,
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
 * Publish an assessment
 */
export async function publishAssessment(assessmentId: number): Promise<PublishAssessmentResponseDto> {
  try {
    const response = await axiosInstance.patch<PublishAssessmentResponseDto>(
      `/assessments/${assessmentId}/publish`
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
 * Delete an assessment
 */
export async function deleteAssessment(assessmentId: number): Promise<DeleteAssessmentResponseDto> {
  try {
    const response = await axiosInstance.delete<DeleteAssessmentResponseDto>(
      `/assessments/${assessmentId}`
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
 * Complete an assessment
 */
export async function completeAssessment(classId: number, assessmentId: number): Promise<CompleteAssessmentResponseDto> {
  try {
    const response = await axiosInstance.post<CompleteAssessmentResponseDto>(
      `/assessments/${assessmentId}/complete`
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
 * Get assessment tracking information (team or individual)
 */
export async function getAssessmentTracking(
  assessmentId: number,
  type: 'team' | 'individual'
): Promise<AssessmentTrackingResponseDto> {
  try {
    const response = await axiosInstance.get<AssessmentTrackingResponseDto>(
      `/assessments/${assessmentId}/tracking/${type}`
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
 * Get assessment statistics
 */
export async function getAssessmentStats(classId: number, assessmentId: number): Promise<AssessmentStatsResponseDto> {
  try {
    const response = await axiosInstance.get<AssessmentStatsResponseDto>(
      `/assessments/${classId}/stats/${assessmentId}`
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
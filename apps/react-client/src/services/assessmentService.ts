import axiosInstance from '@/lib/axiosInstance';
import type { ApiResponse } from '@/types/api';
import type {
  AssessmentListItemDto,
  AssessmentDetailDto,
  CreateDraftResponseDto,
  PublishAssessmentResponseDto,
  UpdateAssessmentResponseDto,
  DeleteAssessmentResponseDto,
  UpdateAssessmentDto,
  TeamTrackingItemDto,
  IndividualTrackingItemDto,
  AssessmentStatsResponseDto,
  CompleteAssessmentResponseDto,
} from '@/types/assessment';

/**
 * Get assessments for a specific class
 */
export async function getAssessmentsByClass(classId: number): Promise<ApiResponse<AssessmentListItemDto[]>> {
  const response = await axiosInstance.get<ApiResponse<AssessmentListItemDto[]>>(`/assessments/class/${classId}`);
  return response.data;
}

/**
 * Get assessments for a specific class session
 */
export async function getAssessmentsByClassSession(classId: number, sessionId: number): Promise<AssessmentListItemDto[]> {
  const response = await axiosInstance.get<AssessmentListItemDto[]>(`/assessments/class/${classId}/${sessionId}`);
  return response.data;
}

/**
 * Get detailed information about a specific assessment
 */
export async function getAssessmentDetails(assessmentId: number): Promise<AssessmentDetailDto> {
  const response = await axiosInstance.get<AssessmentDetailDto>(`/assessments/${assessmentId}`);
  return response.data;
}

/**
 * Create a new assessment draft
 */
export async function createAssessmentDraft(classId: number, session: number): Promise<ApiResponse<CreateDraftResponseDto>> {
  const response = await axiosInstance.post<ApiResponse<CreateDraftResponseDto>>(`/assessments/class/${classId}/draft`, { session });
  return response.data;
}

/**
 * Update an assessment draft
 */
export async function updateAssessment(assessmentId: number, data: UpdateAssessmentDto): Promise<ApiResponse<UpdateAssessmentResponseDto>> {
  const response = await axiosInstance.patch<ApiResponse<UpdateAssessmentResponseDto>>(`/assessments/${assessmentId}`, data);
  return response.data;
}

/**
 * Publish an assessment
 */
export async function publishAssessment(assessmentId: number): Promise<ApiResponse<PublishAssessmentResponseDto>> {
  const response = await axiosInstance.patch<ApiResponse<PublishAssessmentResponseDto>>(`/assessments/${assessmentId}/publish`);
  return response.data;
}

/**
 * Delete an assessment
 */
export async function deleteAssessment(assessmentId: number): Promise<ApiResponse<DeleteAssessmentResponseDto>> {
  const response = await axiosInstance.delete<ApiResponse<DeleteAssessmentResponseDto>>(`/assessments/${assessmentId}`);
  return response.data;
}

/**
 * Complete an assessment
 */
export async function completeAssessment(assessmentId: number): Promise<CompleteAssessmentResponseDto> {
  const response = await axiosInstance.post<CompleteAssessmentResponseDto>(`/assessments/${assessmentId}/complete`);
  return response.data;
}

/**
 * Get assessment tracking information (team or individual)
 */
export async function getAssessmentTracking(assessmentId: number): Promise<ApiResponse<TeamTrackingItemDto[] | IndividualTrackingItemDto[]>> {
  const response = await axiosInstance.get<ApiResponse<TeamTrackingItemDto[] | IndividualTrackingItemDto[]>>(`/assessments/${assessmentId}/tracking`);
  return response.data;
}

/**
 * Get assessment statistics
 */
export async function getAssessmentStats(classId: number, assessmentId: number): Promise<AssessmentStatsResponseDto> {
  const response = await axiosInstance.get<AssessmentStatsResponseDto>(`/assessments/${classId}/stats/${assessmentId}`);
  return response.data;
}

const assessmentService = {
  getAssessmentsByClass,
  getAssessmentsByClassSession,
  getAssessmentDetails,
  createAssessmentDraft,
  updateAssessment,
  publishAssessment,
  deleteAssessment,
  completeAssessment,
  getAssessmentTracking,
  getAssessmentStats,
};

export default assessmentService;

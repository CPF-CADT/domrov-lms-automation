
import axiosInstance from '@/lib/AxiosInstance';
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
} from '@/types/Assessment';

/**
 * Get assessments for a specific class
 */
export async function getAssessmentsByClass(classId: string | number): Promise<AssessmentListItemDto[]> {
  const response = (await axiosInstance.get(`/assessments/class/${classId}`)).data;
  return response.data;
}

/**
 * Get assessments for a specific class session
 */
export async function getAssessmentsByClassSession(classId: string | number, sessionId: number): Promise<AssessmentListItemDto[]> {
  const response = await axiosInstance.get<AssessmentListItemDto[]>(`/assessments/class/${classId}/${sessionId}`);
  return response.data;
}

/**
 * Get detailed information about a specific assessment
 */
export async function getAssessmentDetails(assessmentId: string | number): Promise<AssessmentDetailDto> {
  const response = (await axiosInstance.get(`/assessments/${assessmentId}`)).data;
  return response.data;
}

/**
 * Create a new assessment draft
 */
export async function createAssessmentDraft(classId: string | number, session: number): Promise<CreateDraftResponseDto> {
  // The backend validates CreateAssignmentDto before the controller can merge
  // the route parameter, so include classId in the request body as well.
  const response = (await axiosInstance.post(`/assessments/class/${classId}/draft`, { classId, session })).data;
  const draft = response.data;
  return { ...draft, assessmentId: draft.assessmentId ?? draft.id };
}

/**
 * Update an assessment draft
 */
export async function updateAssessment(assessmentId: string | number, data: UpdateAssessmentDto | FormData): Promise<UpdateAssessmentResponseDto> {
  const response = (await axiosInstance.patch(`/assessments/${assessmentId}`, data)).data;
  return response.data;
}

/**
 * Publish an assessment
 */
export async function publishAssessment(assessmentId: string | number): Promise<PublishAssessmentResponseDto> {
  const response = (await axiosInstance.patch(`/assessments/${assessmentId}/publish`, {})).data;
  return response.data;
}

/**
 * Delete an assessment
 */
export async function deleteAssessment(assessmentId: string | number): Promise<DeleteAssessmentResponseDto> {
  const response = (await axiosInstance.delete(`/assessments/${assessmentId}`)).data;
  return response.data;
}

/**
 * Get assessment tracking information (team or individual)
 */
export async function getAssessmentTracking(assessmentId: string | number): Promise<TeamTrackingItemDto[] | IndividualTrackingItemDto[]> {
  const response = (await axiosInstance.get(`/assessments/${assessmentId}/tracking`)).data;
  return response.data;
}

/**
 * Get assessment statistics
 */
export async function getAssessmentStats(assessmentId: string | number): Promise<AssessmentStatsResponseDto> {
  const response = (await axiosInstance.get(`/submissions/assessment/${assessmentId}/stats`)).data;
  return response.data;
}
// Fetch assignments for a class from backend API

const assessmentService = {
  getAssessmentsByClass,
  getAssessmentsByClassSession,
  getAssessmentDetails,
  createAssessmentDraft,
  updateAssessment,
  publishAssessment,
  deleteAssessment,
  getAssessmentTracking,
  getAssessmentStats,
};

export default assessmentService;

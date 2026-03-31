
import axiosInstance from '@/lib/axiosInstance';
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
export async function getAssessmentsByClass(classId: number): Promise<AssessmentListItemDto[]> {
  const response = (await axiosInstance.get(`/assessments/class/${classId}`)).data;
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
  const response = (await axiosInstance.get(`/assessments/${assessmentId}`)).data;
  return response.data;
}

/**
 * Create a new assessment draft
 */
export async function createAssessmentDraft(classId: number, session: number): Promise<CreateDraftResponseDto> {
  const response = (await axiosInstance.post(`/assessments/class/${classId}/draft`, { session })).data;
  return response.data;
}

/**
 * Update an assessment draft
 */
export async function updateAssessment(assessmentId: number, data: UpdateAssessmentDto): Promise<UpdateAssessmentResponseDto> {
  const response = (await axiosInstance.patch(`/assessments/${assessmentId}`, data)).data;
  return response.data;
}

/**
 * Publish an assessment
 */
export async function publishAssessment(assessmentId: number): Promise<PublishAssessmentResponseDto> {
  const response = (await axiosInstance.patch(`/assessments/${assessmentId}/publish`, {})).data;
  return response.data;
}

/**
 * Delete an assessment
 */
export async function deleteAssessment(assessmentId: number): Promise<DeleteAssessmentResponseDto> {
  const response = (await axiosInstance.delete(`/assessments/${assessmentId}`)).data;
  return response.data;
}

/**
 * Complete an assessment
 */
export async function completeAssessment(assessmentId: number): Promise<CompleteAssessmentResponseDto> {
  const response = await axiosInstance.post(`/assessments/${assessmentId}/complete`);
  return response.data;
}

/**
 * Get assessment tracking information (team or individual)
 */
export async function getAssessmentTracking(assessmentId: number): Promise<TeamTrackingItemDto[] | IndividualTrackingItemDto[]> {
  const response = (await axiosInstance.get(`/assessments/${assessmentId}/tracking`)).data;
  return response.data;
}

/**
 * Get assessment statistics
 */
export async function getAssessmentStats(classId: number, assessmentId: number): Promise<AssessmentStatsResponseDto> {
  const response = (await axiosInstance.get(`/assessments/${classId}/stats/${assessmentId}`)).data;
  return response.data;
}
// Fetch assignments for a class from backend API
export async function fetchAssignmentsByClass(classId: string) {
  const res = await fetch(`https://api.domrov.app/assessments/class/${classId}`);
  if (!res.ok) throw new Error("Failed to fetch assignments");
  return res.json();
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

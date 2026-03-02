// /api/submission/submission.api.ts  
import axiosInstance from '../axios';
import {
  SubmissionDetailTeacherDto,
  SubmissionDetailStudentDto,
  ApproveSubmissionResponseDto,
  SaveDraftResponseDto,
  FinalSubmitResponseDto,
  MySubmissionResponseDto,
  SubmissionStatusResponseDto,
  RosterResponseDto,
  SubmissionStatsResponseDto,
  AddFeedbackResponseDto,
  UpdateFeedbackResponseDto,
  FeedbackItemDto,
  SaveSubmissionDraftDto
} from './dto';

/**
 * Get submission details for teacher view
 */
export async function getSubmissionTeacherView(submissionId: number): Promise<SubmissionDetailTeacherDto> {
  try {
    const response = await axiosInstance.get<SubmissionDetailTeacherDto>(
      `/submissions/${submissionId}/teacher`
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
 * Get submission details for student view
 */
export async function getSubmissionStudentView(submissionId: number): Promise<SubmissionDetailStudentDto> {
  try {
    const response = await axiosInstance.get<SubmissionDetailStudentDto>(
      `/submissions/${submissionId}/student`
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
 * Save submission as draft
 */
export async function saveSubmissionDraft(
  assessmentId: number,
  data: SaveSubmissionDraftDto
): Promise<SaveDraftResponseDto> {
  try {
    const response = await axiosInstance.patch<SaveDraftResponseDto>(
      `/submissions/${assessmentId}/submit`,
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
 * Submit final submission for assessment
 */
export async function submitFinalSubmission(
  assessmentId: number,
  data?: SaveSubmissionDraftDto
): Promise<FinalSubmitResponseDto> {
  try {
    const response = await axiosInstance.post<FinalSubmitResponseDto>(
      `/submissions/${assessmentId}/submit`,
      data || {}
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
 * Get current user's submission for an assessment
 */
export async function getMySubmission(assessmentId: number): Promise<MySubmissionResponseDto> {
  try {
    const response = await axiosInstance.get<MySubmissionResponseDto>(
      `/submissions/${assessmentId}/my-submission`
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
 * Get submission status for assessment
 */
export async function getSubmissionStatus(assessmentId: number): Promise<SubmissionStatusResponseDto> {
  try {
    const response = await axiosInstance.get<SubmissionStatusResponseDto>(
      `/submissions/${assessmentId}/status`
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
 * Get submission roster (team or individual)
 */
export async function getSubmissionRoster(
  assessmentId: number,
  type: 'team' | 'individual'
): Promise<RosterResponseDto> {
  try {
    const response = await axiosInstance.get<RosterResponseDto>(
      `/submissions/${assessmentId}/roster/${type}`
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
 * Get submission statistics
 */
export async function getSubmissionStats(assessmentId: number): Promise<SubmissionStatsResponseDto> {
  try {
    const response = await axiosInstance.get<SubmissionStatsResponseDto>(
      `/submissions/${assessmentId}/stats`
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
 * Approve a submission
 */
export async function approveSubmission(submissionId: number): Promise<ApproveSubmissionResponseDto> {
  try {
    const response = await axiosInstance.patch<ApproveSubmissionResponseDto>(
      `/submissions/approve/${submissionId}`
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
 * Add feedback to a submission
 */
export async function addFeedback(
  submissionId: number,
  data: FeedbackItemDto
): Promise<AddFeedbackResponseDto> {
  try {
    const response = await axiosInstance.post<AddFeedbackResponseDto>(
      `/submissions/${submissionId}/feedback`,
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
 * Update feedback on a submission
 */
export async function updateFeedback(
  submissionId: number,
  feedbackId: number,
  data: FeedbackItemDto
): Promise<UpdateFeedbackResponseDto> {
  try {
    const response = await axiosInstance.patch<UpdateFeedbackResponseDto>(
      `/submissions/${submissionId}/feedback/${feedbackId}`,
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

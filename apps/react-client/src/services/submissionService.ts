import axiosInstance from '@/lib/axiosInstance';
import type { ApiResponse } from '@/types/api';
import type {
    SubmissionStatusItemDto,
    MySubmissionResponseDto,
    TeamRosterItemDto,
    IndividualRosterItemDto,
    AssessmentStatsResponseDto,
    EvaluationResponseDto,
    AddFeedbackResponseDto,
    UpdateFeedbackResponseDto,
    FeedbackItemDto,
    GradeSubmissionDTO,
} from '@/types/submission';

/**
 * Get my submission status for all assessments in a class (Student)
 */
export async function getMySubmissionStatusInClass(classId: number): Promise<SubmissionStatusItemDto[]> {
    const response = (await axiosInstance.get(`/submissions/class/${classId}/my-status`)).data;
    return response.data;
}

/**
 * Get my submission status for a specific assessment (Student)
 */
export async function getMySubmissionStatus(assessmentId: number): Promise<MySubmissionResponseDto> {
    const response = (await axiosInstance.get(`/submissions/${assessmentId}/my-status`)).data;
    return response.data;
}

/**
 * Get submission roster for an assessment (Teacher)
 */
export async function getSubmissionRoster(assessmentId: number): Promise<(TeamRosterItemDto | IndividualRosterItemDto)[]> {
    const response = (await axiosInstance.get(`/submissions/assessment/${assessmentId}/roster`)).data;
    return response.data;
}

/**
 * Get submission statistics for an assessment (Teacher)
 */
export async function getSubmissionStats(assessmentId: number): Promise<AssessmentStatsResponseDto> {
    const response = (await axiosInstance.get(`/submissions/assessment/${assessmentId}/stats`)).data;
    return response.data;
}

/**
 * Grade a submission (Teacher)
 */
export async function gradeSubmission(submissionId: number, data: GradeSubmissionDTO): Promise<EvaluationResponseDto> {
    const response = (await axiosInstance.post(`/submissions/${submissionId}/grade`, data)).data;
    return response.data;
}

/**
 * Add line-by-line feedback to a submission (Teacher)
 */
export async function addFeedback(submissionId: number, data: FeedbackItemDto): Promise<AddFeedbackResponseDto> {
    const response = (await axiosInstance.post(`/submissions/${submissionId}/feedback`, data)).data;
    return response.data;
}

/**
 * Update a feedback item (Teacher)
 */
export async function updateFeedback(feedbackId: string, data: FeedbackItemDto): Promise<UpdateFeedbackResponseDto> {
    const response = (await axiosInstance.patch(`/submissions/feedback/${feedbackId}`, data)).data;
    return response.data;
}

const submissionService = {
    getMySubmissionStatusInClass,
    getMySubmissionStatus,
    getSubmissionRoster,
    getSubmissionStats,
    gradeSubmission,
    addFeedback,
    updateFeedback,
};

export default submissionService;

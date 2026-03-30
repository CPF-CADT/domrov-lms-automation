import axiosInstance from '@/lib/axiosInstance';

import type {
    SubmissionStatusItemDto,
    MySubmissionResponseDto,
    SubmissionViewerResponseDto,
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
    const response = (await axiosInstance.get(`/submissions/my-status/class/${classId}`)).data;
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
 * Get detailed submission information for a specific submission (Student)
 */
export async function getSubmissionDetails(submissionId: number): Promise<SubmissionViewerResponseDto> {
    const response = (await axiosInstance.get(`/submissions/${submissionId}/student`)).data;
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

/**
 * Submit a draft submission as final (Student)
 */
export async function submitSubmission(assessmentId: number): Promise<MySubmissionResponseDto> {
    const response = (await axiosInstance.post(`/submissions/${assessmentId}/submit`)).data;
    return response.data;
}

/**
 * Unsubmit a submission (Student) - Only allowed before grading
 */
export async function unsubmitSubmission(submissionId: number): Promise<MySubmissionResponseDto> {
    const response = (await axiosInstance.post(`/submissions/${submissionId}/unsubmit`)).data;
    return response.data;
}

/**
 * Delete a file/resource from a submission (Student)
 */
export async function deleteSubmissionResource(submissionId: number, resourcePath: string): Promise<MySubmissionResponseDto> {
    const response = (await axiosInstance.delete(`/submissions/${submissionId}/resource`, {
        data: { resourcePath }
    })).data;
    return response.data;
}

/**
 * Save or update draft assignment (Student) - Backend-driven state sync
 * Fully replaces submission resources on each call
 * @param assessmentId - Assessment ID
 * @param data - Draft data with resources, githubUrl, and comments
 * @returns Updated submission response from backend
 */
export async function saveDraftAssignment(
    assessmentId: number,
    data: {
        resources?: { resourceId?: number }[];
        githubUrl?: string;
        comments?: string;
    }
): Promise<MySubmissionResponseDto> {
    const response = (await axiosInstance.patch(`/submissions/${assessmentId}/submit`, data)).data;
    return response.data;
}

const submissionService = {
    getMySubmissionStatusInClass,
    getMySubmissionStatus,
    getSubmissionDetails,
    getSubmissionRoster,
    getSubmissionStats,
    gradeSubmission,
    addFeedback,
    updateFeedback,
    submitSubmission,
    unsubmitSubmission,
    deleteSubmissionResource,
    saveDraftAssignment,
};

export default submissionService;

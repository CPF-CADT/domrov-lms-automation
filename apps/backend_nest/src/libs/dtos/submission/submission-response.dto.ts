import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubmissionStatus } from '../../enums/Status';
import { EvaluationType } from '../../enums/Assessment';
import { ResourceType } from '../../enums/Resource';
import { FeedbackType } from '../../entities/assessment/evaluation-feedback.entity';

// ==================== BASIC RESPONSE DTOs ====================

export class SubmitAssignmentResponseDto {
    @ApiProperty({ example: 'Submitted successfully', description: 'Success message' })
    message: string;

    @ApiProperty({ example: 1, description: 'ID of the created/updated submission' })
    submissionId: number;
}

export class ApproveSubmissionResponseDto {
    @ApiProperty({ example: 'Submission approved successfully', description: 'Success message' })
    message: string;

    @ApiProperty({ example: 1, description: 'ID of the approved submission' })
    submissionId: number;

    @ApiProperty({ example: 1, description: 'ID of the evaluation' })
    evaluationId: number;

    @ApiProperty({ example: true, description: 'Whether the submission is approved' })
    isApproved: boolean;
}

export class AddFeedbackResponseDto {
    @ApiProperty({ example: 'Feedback item added successfully', description: 'Success message' })
    message: string;

    @ApiProperty({ example: 1, description: 'ID of the evaluation' })
    evaluationId: number;

    @ApiProperty({ example: 1, description: 'Number of feedback items added' })
    addedItemsCount: number;
}

export class UpdateFeedbackResponseDto {
    @ApiProperty({ example: 'Feedback item updated successfully', description: 'Success message' })
    message: string;

    @ApiProperty({ example: 'uuid-string', description: 'ID of the updated feedback' })
    feedbackId: string;
}

// ==================== USER/TEAM INFO DTOs ====================

export class UserBasicInfoDto {
    @ApiProperty({ example: 1, description: 'User ID' })
    id: number;

    @ApiProperty({ example: 'John', description: 'First name' })
    firstName: string;

    @ApiProperty({ example: 'Doe', description: 'Last name' })
    lastName: string;
}

export class TeamMemberDto {
    @ApiProperty({ example: 1, description: 'Team member ID' })
    id: number;

    @ApiPropertyOptional({ type: UserBasicInfoDto, description: 'User information' })
    user: UserBasicInfoDto | null;
}

export class TeamInfoDto {
    @ApiProperty({ example: 1, description: 'Team ID' })
    id: number;

    @ApiProperty({ example: 'Team Alpha', description: 'Team name' })
    name: string;

    @ApiProperty({ example: 5, description: 'Maximum team members' })
    maxMember: number;

    @ApiProperty({ type: [TeamMemberDto], description: 'List of team members' })
    members: TeamMemberDto[];
}

export class ClassBasicInfoDto {
    @ApiProperty({ example: 1, description: 'Class ID' })
    id: number;

    @ApiProperty({ example: 'Data Structures', description: 'Class name' })
    name: string;
}

export class AssessmentBasicInfoDto {
    @ApiProperty({ example: 1, description: 'Assessment ID' })
    id: number;

    @ApiProperty({ example: 'Assignment 1', description: 'Assessment title' })
    title: string;

    @ApiProperty({ example: 100, description: 'Maximum score' })
    maxScore: number;

    @ApiPropertyOptional({ type: ClassBasicInfoDto, description: 'Class information' })
    class: ClassBasicInfoDto | null;
}

// ==================== RESOURCE DTOs ====================

export class ResourceBasicInfoDto {
    @ApiProperty({ example: 1, description: 'Resource ID' })
    id: number;

    @ApiProperty({ example: 'main.cpp', description: 'Resource title' })
    title: string;

    @ApiProperty({ enum: ResourceType, example: 'URL', description: 'Resource type' })
    type: ResourceType;

    @ApiPropertyOptional({ example: 'https://github.com/user/repo', description: 'Resource URL' })
    url: string | null;
}

export class SubmissionResourceDto {
    @ApiProperty({ example: 1, description: 'Submission resource ID' })
    id: number;

    @ApiPropertyOptional({ type: ResourceBasicInfoDto, description: 'Resource details' })
    resource: ResourceBasicInfoDto | null;
}

// ==================== EVALUATION DTOs ====================

export class EvaluationFeedbackItemDto {
    @ApiProperty({ example: 'uuid-string', description: 'Feedback ID' })
    id: string;

    @ApiProperty({ example: 'main.cpp', description: 'File path' })
    filePath: string;

    @ApiPropertyOptional({ example: 10, description: 'Start line number' })
    startLine: number | null;

    @ApiPropertyOptional({ example: 15, description: 'End line number' })
    endLine: number | null;

    @ApiProperty({ example: 'Consider adding error handling', description: 'Feedback message' })
    message: string;

    @ApiProperty({ enum: FeedbackType, example: 'suggestion', description: 'Feedback type' })
    feedbackType: FeedbackType;

    @ApiProperty({ example: '2024-01-15T10:30:00Z', description: 'Created timestamp' })
    createdAt: Date;
}

export class EvaluationResponseDto {
    @ApiProperty({ example: 1, description: 'Evaluation ID' })
    id: number;

    @ApiProperty({ example: 85.5, description: 'Score awarded' })
    score: number;

    @ApiPropertyOptional({ example: 'Good work, but needs improvement', description: 'Feedback text' })
    feedback: string | null;

    @ApiProperty({ example: 0, description: 'Penalty score deducted' })
    penaltyScore: number;

    @ApiProperty({ example: false, description: 'Whether evaluation is approved' })
    isApproved: boolean;

    @ApiProperty({ example: false, description: 'Whether evaluation has been modified' })
    isModified: boolean;

    @ApiProperty({ enum: EvaluationType, example: 'MANUAL', description: 'Type of evaluation' })
    evaluationType: EvaluationType;

    @ApiPropertyOptional({ example: '{"analysis": "..."}', description: 'AI output JSON string' })
    aiOutput: string | null;

    @ApiPropertyOptional({ example: '0.85', description: 'AI confidence score' })
    confidencePoint: string | null;

    @ApiPropertyOptional({ type: [EvaluationFeedbackItemDto], description: 'List of line-by-line feedback items' })
    feedbacks: EvaluationFeedbackItemDto[];

    @ApiProperty({ example: '2024-01-15T10:30:00Z', description: 'Created timestamp' })
    created_at: Date;

    @ApiProperty({ example: '2024-01-15T10:30:00Z', description: 'Updated timestamp' })
    updated_at: Date;
}

export class EvaluationSummaryDto {
    @ApiProperty({ example: 1, description: 'Evaluation ID' })
    id: number;

    @ApiProperty({ example: 85.5, description: 'Score awarded' })
    score: number;

    @ApiPropertyOptional({ example: 'Good work!', description: 'Feedback text' })
    feedback: string | null;

    @ApiPropertyOptional({ example: '{"analysis": "..."}', description: 'AI feedback output' })
    aiFeedback: string | null;

    @ApiProperty({ example: true, description: 'Whether evaluation is approved' })
    isApproved: boolean;
}

// ==================== SUBMISSION VIEWER RESPONSE ====================

export class SubmissionViewerResponseDto {
    @ApiProperty({ example: 1, description: 'Submission ID' })
    id: number;

    @ApiProperty({ example: '2024-01-15T10:30:00Z', description: 'Created timestamp' })
    created_at: Date;

    @ApiProperty({ example: '2024-01-15T10:30:00Z', description: 'Updated timestamp' })
    updated_at: Date;

    @ApiProperty({ example: '2024-01-15T10:30:00Z', description: 'Submission timestamp' })
    submissionTime: Date;

    @ApiProperty({ enum: SubmissionStatus, example: 'SUBMITTED', description: 'Submission status' })
    status: SubmissionStatus;

    @ApiProperty({ example: 1, description: 'Attempt number' })
    attemptNumber: number;

    @ApiPropertyOptional({ type: UserBasicInfoDto, description: 'User who submitted (for individual submissions)' })
    user: UserBasicInfoDto | null;

    @ApiPropertyOptional({ type: TeamInfoDto, description: 'Team that submitted (for team submissions)' })
    team: TeamInfoDto | null;

    @ApiPropertyOptional({ type: AssessmentBasicInfoDto, description: 'Assessment information' })
    assessment: AssessmentBasicInfoDto | null;

    @ApiPropertyOptional({ type: EvaluationResponseDto, description: 'Evaluation details' })
    evaluation: EvaluationResponseDto | null;

    @ApiProperty({ type: [SubmissionResourceDto], description: 'Submitted resources' })
    resources: SubmissionResourceDto[];
}

// ==================== MY SUBMISSION RESPONSE ====================

export class MySubmissionResourceDto {
    @ApiProperty({ example: 1, description: 'Resource ID' })
    id: number;

    @ApiProperty({ example: 'main.cpp', description: 'Resource title' })
    title: string;

    @ApiProperty({ enum: ResourceType, example: 'URL', description: 'Resource type' })
    type: ResourceType;

    @ApiPropertyOptional({ example: 'https://github.com/user/repo', description: 'Resource URL' })
    url: string | null;
}

export class MySubmissionResponseDto {
    @ApiPropertyOptional({ example: 1, description: 'Submission ID (null if not submitted)' })
    id?: number;

    @ApiProperty({ enum: SubmissionStatus, example: 'SUBMITTED', description: 'Submission status' })
    status: SubmissionStatus;

    @ApiPropertyOptional({ example: 1, description: 'Attempt number' })
    attemptNumber?: number;

    @ApiPropertyOptional({ example: '2024-01-15T10:30:00Z', description: 'Submission timestamp' })
    submissionTime?: Date;

    @ApiPropertyOptional({ example: 'This is my final submission', description: 'Comments' })
    comments?: string | null;

    @ApiPropertyOptional({ example: 'Not in an allowed team for this assessment', description: 'Message for team submissions' })
    message?: string;

    @ApiProperty({ type: [MySubmissionResourceDto], description: 'Submitted resources' })
    resources: MySubmissionResourceDto[];

    @ApiPropertyOptional({ type: EvaluationSummaryDto, description: 'Evaluation details (only if approved)' })
    evaluation: EvaluationSummaryDto | null;
}

// ==================== SUBMISSIONS STATUS RESPONSE ====================

export class SubmissionStatusItemDto {
    @ApiProperty({ example: 1, description: 'Assessment ID' })
    assessmentId: number;

    @ApiProperty({ example: 'Assignment 1', description: 'Assessment title' })
    title: string;

    @ApiProperty({ example: '2024-01-20T23:59:59Z', description: 'Due date' })
    dueDate: Date;

    @ApiProperty({ example: 'SUBMITTED', description: 'Submission status' })
    status: string;

    @ApiPropertyOptional({ example: 1, description: 'Submission ID (null if not submitted)' })
    submissionId: number | null;

    @ApiPropertyOptional({ example: 85, description: 'Grade (null if not graded)' })
    grade: number | null;
}

// ==================== ASSIGNMENT ROSTER RESPONSE ====================

export class RosterMemberDto {
    @ApiProperty({ example: 1, description: 'User ID' })
    userId: number;

    @ApiProperty({ example: 'John Doe', description: 'Full name' })
    fullName: string;

    @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg', description: 'Profile picture URL' })
    profileUrl: string | null;
}

export class TeamRosterItemDto {
    @ApiProperty({ example: 'TEAM', description: 'Type indicator' })
    type: 'TEAM';

    @ApiProperty({ example: 1, description: 'Team ID' })
    id: number;

    @ApiProperty({ example: 'Team Alpha', description: 'Team name' })
    name: string;

    @ApiProperty({ type: [RosterMemberDto], description: 'Team members' })
    members: RosterMemberDto[];

    @ApiProperty({ example: 'SUBMITTED', description: 'Submission status' })
    status: string;

    @ApiPropertyOptional({ example: 1, description: 'Submission ID' })
    submissionId: number | null;

    @ApiPropertyOptional({ example: 85, description: 'Score' })
    score: number | null;

    @ApiPropertyOptional({ example: '2024-01-15T10:30:00Z', description: 'Submission timestamp' })
    submittedAt: Date | null;
}

export class IndividualRosterItemDto {
    @ApiProperty({ example: 'INDIVIDUAL', description: 'Type indicator' })
    type: 'INDIVIDUAL';

    @ApiProperty({ example: 1, description: 'Student ID' })
    id: number;

    @ApiProperty({ example: 'John Doe', description: 'Student name' })
    name: string;

    @ApiProperty({ example: 'john@example.com', description: 'Student email' })
    email: string;

    @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg', description: 'Profile picture URL' })
    profileUrl: string | null;

    @ApiProperty({ example: 'SUBMITTED', description: 'Submission status' })
    status: string;

    @ApiPropertyOptional({ example: 1, description: 'Submission ID' })
    submissionId: number | null;

    @ApiPropertyOptional({ example: 85, description: 'Score' })
    score: number | null;

    @ApiPropertyOptional({ example: '2024-01-15T10:30:00Z', description: 'Submission timestamp' })
    submittedAt: Date | null;
}

// ==================== ASSESSMENT STATS RESPONSE ====================

export class AssessmentStatsResponseDto {
    @ApiProperty({ example: 30, description: 'Total number of students or teams' })
    totalStudentsOrTeams: number;

    @ApiProperty({ example: 25, description: 'Number of submissions received' })
    submittedCount: number;

    @ApiProperty({ example: 5, description: 'Number of pending submissions' })
    pendingCount: number;

    @ApiProperty({ example: 20, description: 'Number of graded submissions' })
    gradedCount: number;
}

// ==================== SUBMISSION RESOURCES RESPONSE ====================

export class SubmissionResourceUrlResponseDto {
    @ApiPropertyOptional({ example: 'https://github.com/user/repo', description: 'Resource URL or R2 key' })
    resource_url: string | null;
}

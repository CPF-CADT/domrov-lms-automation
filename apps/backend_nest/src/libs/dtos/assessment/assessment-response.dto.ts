import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AIModelSelectionMode, SubmissionMethod, SubmissionType } from '../../enums/Assessment';

// ==================== BASIC INFO DTOs ====================

export class ResourceInfoDto {
    @ApiProperty({ description: 'Resource ID', example: 1 })
    id: number;

    @ApiPropertyOptional({ description: 'Resource title', example: 'Assignment_Guidelines.pdf' })
    title?: string;

    @ApiPropertyOptional({ description: 'Resource type', example: 'FILE' })
    type?: string;

    @ApiPropertyOptional({ description: 'Resource URL', example: 'https://storage.example.com/files/doc.pdf' })
    url?: string;
}

export class AssessmentResourceDto {
    @ApiProperty({ description: 'AssessmentResource junction ID', example: 1 })
    id: number;

    @ApiProperty({ description: 'Resource details', type: ResourceInfoDto })
    resource: ResourceInfoDto;
}

export class RubricDto {
    @ApiProperty({ description: 'Rubric ID', example: 1 })
    id: number;

    @ApiProperty({ description: 'Rubric criterion definition', example: 'Code Quality' })
    definition: string;

    @ApiProperty({ description: 'Total score for this rubric', example: 25 })
    totalScore: number;
}

export class ClassInfoForAssessmentDto {
    @ApiProperty({ description: 'Class ID', example: 1 })
    id: number;

    @ApiPropertyOptional({ description: 'Class name', example: 'Data Structures' })
    name?: string;
}

export class AIModelInfoDto {
    @ApiProperty({ description: 'AI Model ID', example: 1 })
    id: number;

    @ApiPropertyOptional({ description: 'AI Model name', example: 'GPT-4' })
    name?: string;

    @ApiPropertyOptional({ description: 'AI Model provider', example: 'OpenAI' })
    provider?: string;
}

export class TeamAssessmentDto {
    @ApiProperty({ description: 'Assessment ID', example: 1 })
    assessment_id: number;

    @ApiProperty({ description: 'Team ID', example: 1 })
    team_id: number;

    @ApiPropertyOptional({ description: 'Team details (when loaded with relations)' })
    team?: {
        id: number;
        name: string;
    };
}

// ==================== ASSESSMENT RESPONSE DTOs ====================

export class AssessmentListItemDto {
    @ApiProperty({ description: 'Assessment ID', example: 1 })
    id: number;

    @ApiProperty({ description: 'Assessment title', example: 'Math Assignment 1' })
    title: string;

    @ApiProperty({ description: 'Assessment instructions', example: 'Please read instructions carefully' })
    instruction: string;

    @ApiProperty({ description: 'Due date', example: '2024-01-20T23:59:59Z' })
    dueDate: Date;

    @ApiProperty({ description: 'Start date', example: '2024-01-10T00:00:00Z' })
    startDate: Date;

    @ApiProperty({ description: 'Maximum score', example: 100 })
    maxScore: number;

    @ApiProperty({ description: 'Session/Week number', example: 1 })
    session: number;

    @ApiProperty({ description: 'Whether assessment is published', example: true })
    isPublic: boolean;

    @ApiProperty({ enum: SubmissionType, description: 'Submission type (INDIVIDUAL or TEAM)', example: SubmissionType.INDIVIDUAL })
    submissionType: SubmissionType;

    @ApiProperty({ description: 'Allow late submissions', example: false })
    allowLate: boolean;

    @ApiPropertyOptional({ description: 'Penalty criteria for late submissions', example: '10% per day' })
    penaltyCriteria?: string;

    @ApiProperty({ description: 'AI evaluation enabled', example: false })
    aiEvaluationEnable: boolean;

    @ApiProperty({ enum: AIModelSelectionMode, description: 'AI model selection mode (SYSTEM or CUSTOM)', example: AIModelSelectionMode.SYSTEM })
    aiModelSelectionMode: AIModelSelectionMode;

    @ApiProperty({ enum: SubmissionMethod, description: 'Allowed submission method (GITHUB, FILE, or ANY)', example: SubmissionMethod.ANY })
    allowedSubmissionMethod: SubmissionMethod;

    @ApiPropertyOptional({ description: 'Created timestamp', example: '2024-01-01T00:00:00Z' })
    created_at?: Date;

    @ApiPropertyOptional({ description: 'Updated timestamp', example: '2024-01-05T00:00:00Z' })
    updated_at?: Date;

    @ApiPropertyOptional({ description: 'Attached resources (instructor files)', type: [AssessmentResourceDto] })
    resources?: AssessmentResourceDto[];
}

export class AssessmentDetailDto extends AssessmentListItemDto {
    @ApiPropertyOptional({ description: 'Rubrics for grading', type: [RubricDto] })
    rubrics?: RubricDto[];

    @ApiPropertyOptional({ 
        description: 'File/folder patterns to exclude from AI evaluation (glob patterns)', 
        type: [String], 
        example: ['node_modules/', '.git/', 'test/', 'android/', 'ios/'] 
    })
    user_exclude_files?: string[];

    @ApiPropertyOptional({ 
        description: 'File/folder patterns to include for AI evaluation (glob patterns)', 
        type: [String], 
        example: ['src/**/*.ts', 'lib/**/*.js', 'main.cpp'] 
    })
    user_include_files?: string[];

    @ApiPropertyOptional({ description: 'Class this assessment belongs to', type: ClassInfoForAssessmentDto })
    class?: ClassInfoForAssessmentDto;

    @ApiPropertyOptional({ description: 'Custom AI model for evaluation (if aiModelSelectionMode is CUSTOM)', type: AIModelInfoDto })
    aiModel?: AIModelInfoDto;

    @ApiPropertyOptional({ description: 'Teams allowed to submit (for TEAM submission type)', type: [TeamAssessmentDto] })
    teamAssessments?: TeamAssessmentDto[];
}

// ==================== CREATE/UPDATE RESPONSE DTOs ====================

export class CreateDraftResponseDto {
    @ApiProperty({ description: 'Success message', example: 'Draft created' })
    message: string;

    @ApiProperty({ description: 'Created assessment ID', example: 1 })
    assessmentId: number;
}

export class PublishAssessmentResponseDto {
    @ApiProperty({ description: 'Success message', example: 'Assessment published successfully' })
    message: string;
}

export class UpdateAssessmentResponseDto {
    @ApiProperty({ description: 'Success message', example: 'Draft updated successfully' })
    message: string;

    @ApiProperty({ description: 'Updated assessment details', type: AssessmentDetailDto })
    assessment: AssessmentDetailDto;
}

export class DeleteAssessmentResponseDto {
    @ApiProperty({ description: 'Deleted assessment ID', example: 1 })
    id: number;

    @ApiPropertyOptional({ description: 'Deleted assessment title', example: 'Math Assignment 1' })
    title?: string;
}

// ==================== TRACKING DTOs ====================

export class TeamTrackingItemDto {
    @ApiProperty({ description: 'Team ID', example: 1 })
    teamId: number;

    @ApiProperty({ description: 'Team name', example: 'Team Alpha' })
    name: string;

    @ApiProperty({ 
        description: 'Submission status', 
        example: 'SUBMITTED',
        enum: ['NOT_SUBMITTED', 'SUBMITTED', 'GRADED']
    })
    status: string;

    @ApiPropertyOptional({ description: 'Evaluation score', example: 85 })
    score: number | null;
}

export class IndividualTrackingItemDto {
    @ApiProperty({ description: 'Student user ID', example: 1 })
    studentId: number;

    @ApiProperty({ description: 'Student full name', example: 'John Doe' })
    name: string;

    @ApiProperty({ 
        description: 'Submission status', 
        example: 'SUBMITTED',
        enum: ['NOT_SUBMITTED', 'SUBMITTED', 'GRADED']
    })
    status: string;

    @ApiPropertyOptional({ description: 'Evaluation score', example: 85 })
    score: number | null;
}

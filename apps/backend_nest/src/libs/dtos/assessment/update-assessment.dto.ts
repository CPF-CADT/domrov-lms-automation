import {
    IsString,
    IsDate,
    IsNumber,
    IsBoolean,
    IsOptional,
    ValidateNested,
    IsEnum,
    IsArray,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UpdateRubricDTO } from './update-rubric.dto';
import { AIModelSelectionMode, SubmissionMethod, SubmissionType } from '../../enums/Assessment';

class UpdateResourceDTO {
    @ApiPropertyOptional({
        description: 'Existing uploaded resource id',
        example: 12,
    })
    @IsNumber()
    @Type(() => Number)
    resourceId: number;
}

export class UpdateAssessmentDTO {
    @ApiPropertyOptional({ example: 'Math Assignment 1', description: 'Title of the assessment' })
    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim())
    title?: string;

    @ApiPropertyOptional({ example: 'Please read instructions carefully', description: 'Instructions for students' })
    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim())
    instruction?: string;

    @ApiPropertyOptional({ example: '2026-03-01T08:00:00Z', description: 'Assessment start date' })
    @IsOptional()
    @Transform(({ value }) => (value ? new Date(value) : undefined))
    @IsDate()
    startDate?: Date;

    @ApiPropertyOptional({ example: '2026-03-10T23:59:59Z', description: 'Assessment due date' })
    @IsOptional()
    @Transform(({ value }) => (value ? new Date(value) : undefined))
    @IsDate()
    dueDate?: Date;

    @ApiPropertyOptional({ example: 100, description: 'Maximum score allowed' })
    @IsOptional()
    @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
    @IsNumber()
    maxScore?: number;

    @ApiPropertyOptional({ example: 1, description: 'Session or class id associated with this assessment' })
    @IsNumber()
    @IsOptional()
    session?: number;

    @ApiPropertyOptional({ example: false, description: 'Whether late submission is allowed' })
    @IsBoolean()
    @IsOptional()
    allowLate?: boolean;

    @ApiPropertyOptional({ enum: SubmissionType, example: SubmissionType.INDIVIDUAL, description: 'Submission type (individual or team)' })
    @IsEnum(SubmissionType)
    @IsOptional()
    submissionType?: SubmissionType;

    @ApiPropertyOptional({ example: false, description: 'Enable AI evaluation for this assessment' })
    @IsBoolean()
    @IsOptional()
    aiEvaluationEnable?: boolean;

    @ApiPropertyOptional({ enum: AIModelSelectionMode, example: AIModelSelectionMode.SYSTEM, description: 'AI model selection mode' })
    @IsOptional()
    @IsEnum(AIModelSelectionMode)
    aiModelSelectionMode?: AIModelSelectionMode;

    @ApiPropertyOptional({ enum: SubmissionMethod, example: SubmissionMethod.GITHUB, description: 'Allowed submission method' })
    @IsEnum(SubmissionMethod)
    @IsOptional()
    allowedSubmissionMethod?: SubmissionMethod;

    @ApiPropertyOptional({ type: [Number], example: [1, 2, 3], description: 'IDs of teams allowed to submit' })
    @IsOptional()
    @IsArray()
    @IsNumber({}, { each: true })
    allowedTeamIds?: number[];

    @ApiPropertyOptional({ type: [Boolean], example: false, description: 'Assessment accessible' })
    @IsOptional()
    @IsBoolean()
    isPublic ?: boolean;

    @ApiPropertyOptional({ type: [UpdateRubricDTO], description: 'Rubrics for this assessment' })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UpdateRubricDTO)
    rubrics?: UpdateRubricDTO[];

    @ApiPropertyOptional({ type: [UpdateResourceDTO], description: 'Resources attached to this assessment' })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => UpdateResourceDTO)
    resources?: UpdateResourceDTO[];

    @ApiPropertyOptional({ type: [String], example: ["android/", "ios/", "linux/", "windows/", "macos/", "test/", "web/"], description: 'Files to exclude from submission' })
    @IsOptional()
    @IsArray()
    user_exclude_files?: string[];

    @ApiPropertyOptional({ type: [String], example: ["android/app/build.gradle.kts"], description: 'Files to include for submission' })
    @IsOptional()
    @IsArray()
    user_include_files?: string[];
}
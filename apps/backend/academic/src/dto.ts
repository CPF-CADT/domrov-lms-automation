import { IsArray, IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CreateClassDto { @IsString() @MinLength(1) name!: string; @IsOptional() @IsString() description?: string; @IsOptional() @IsString() coverImageUrl?: string; }
export class UpdateClassDto { @IsOptional() @IsString() @MinLength(1) name?: string; @IsOptional() @IsString() description?: string; @IsOptional() @IsString() coverImageUrl?: string; }
export class EnrollDto { @IsOptional() @IsString() userId?: string; }
export class JoinClassDto { @IsString() joinCode!: string; }
export class CreateTeamDto { @IsUUID() classId!: string; @IsString() @MinLength(1) name!: string; @IsOptional() @IsString() leaderId?: string; @IsOptional() @IsInt() @Min(1) maxMembers?: number; }
export class JoinTeamDto { @IsString() joinCode!: string; }
export class AddTeamMemberDto { @IsString() userId!: string; }
export class RubricDto { @IsString() definition!: string; @IsOptional() @IsString() criterion?: string; @IsNumber() totalScore!: number; }
export class CreateAssignmentDto { @IsUUID() classId!: string; @IsOptional() @IsString() @MinLength(1) title?: string; @IsOptional() @IsString() @MinLength(1) instruction?: string; @IsOptional() @Min(0) maxScore?: number; @IsOptional() @IsBoolean() aiEvaluationEnabled?: boolean; @IsOptional() @IsDateString() startAt?: string; @IsOptional() @IsDateString() dueAt?: string; @IsOptional() @IsBoolean() allowLate?: boolean; @IsOptional() @IsString() submissionType?: string; @IsOptional() @IsString() allowedSubmissionMethod?: string; @IsOptional() @IsInt() session?: number; @IsOptional() @IsBoolean() isPublic?: boolean; @IsOptional() @IsArray() rubrics?: RubricDto[]; }
export class UpdateAssignmentDto { @IsOptional() @IsString() title?: string; @IsOptional() @IsString() instruction?: string; @IsOptional() @IsNumber() maxScore?: number; @IsOptional() @IsBoolean() aiEvaluationEnabled?: boolean; @IsOptional() @IsDateString() startAt?: string; @IsOptional() @IsDateString() dueAt?: string; @IsOptional() @IsBoolean() allowLate?: boolean; @IsOptional() @IsString() submissionType?: string; @IsOptional() @IsString() allowedSubmissionMethod?: string; @IsOptional() @IsInt() session?: number; @IsOptional() @IsBoolean() isPublic?: boolean; @IsOptional() @IsArray() rubrics?: RubricDto[]; }
export class CreateSubmissionDto { @IsOptional() @IsUUID() resourceId?: string; @IsOptional() @IsString() language?: string; @IsOptional() @IsUUID() teamId?: string; @IsOptional() @IsString() githubUrl?: string; @IsOptional() @IsString() comments?: string; }
export class GradeSubmissionDto { @IsNumber() score!: number; @IsOptional() @IsString() feedback?: string; }
export class FeedbackDto { @IsString() feedback!: string; }
export class NotifyUploadDto { @IsString() key!: string; @IsString() filename!: string; @IsOptional() @IsString() contentType?: string; @IsOptional() @IsString() resourceType?: string; @IsOptional() @IsUUID() resourceId?: string; }

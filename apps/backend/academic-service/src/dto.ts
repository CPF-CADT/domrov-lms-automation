import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CreateClassDto { @IsString() @MinLength(1) name!: string; @IsOptional() @IsString() description?: string; }
export class EnrollDto { @IsOptional() @IsUUID() userId?: string; }
export class CreateTeamDto { @IsUUID() classId!: string; @IsString() @MinLength(1) name!: string; @IsOptional() @IsUUID() leaderId?: string; @IsOptional() @IsInt() @Min(1) maxMembers?: number; }
export class AddTeamMemberDto { @IsUUID() userId!: string; }
export class CreateAssignmentDto { @IsUUID() classId!: string; @IsString() @MinLength(1) title!: string; @IsString() @MinLength(1) instruction!: string; @Min(0) maxScore!: number; @IsOptional() @IsBoolean() aiEvaluationEnabled?: boolean; @IsOptional() @IsDateString() dueAt?: string; }
export class CreateSubmissionDto { @IsUUID() resourceId!: string; @IsOptional() @IsString() language?: string; @IsOptional() @IsUUID() teamId?: string; }

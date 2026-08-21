import {
  IsString,
  IsNotEmpty,
  IsDate,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsEnum,
  ValidateNested,
  ArrayNotEmpty,
  Validate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SubmissionMethod, SubmissionType } from '../../enums/Assessment';
import { CreateRubricDTO } from './create-rubric.dto';
import { IsAfterStartDate } from '../../../common/decorators/IsAfterStartDate';
import { ResourceDTO } from '../file/resource.dto';
export class CreateAssessmentDTO {
  @ApiProperty({ example: 'Data Structures Assignment', description: 'Title of the assessment' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Implement a binary search tree with insert, delete, and search operations', description: 'Instructions for the assessment' })
  @IsString()
  instruction: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @ApiPropertyOptional({ example: '2026-03-01T08:00:00Z', format: 'date-time', description: 'Assessment start date' })
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  @Validate(IsAfterStartDate)
  @ApiPropertyOptional({ example: '2026-03-15T23:59:59Z', format: 'date-time', description: 'Assessment due date' })
  dueDate?: Date;

  @ApiProperty({ example: 100, default: 100, description: 'Maximum score for the assessment' })
  @IsNumber()
  maxScore: number;

  @ApiProperty({ enum: SubmissionType, example: 'INDIVIDUAL', description: 'Submission type (INDIVIDUAL or TEAM)' })
  @IsEnum(SubmissionType)
  submissionType: SubmissionType;

  @ApiProperty({ example: false, description: 'Allow late submissions' })
  @IsBoolean()
  allowLate: boolean;

  @ApiProperty({ example: false, description: 'Enable AI evaluation', default: false })
  @IsBoolean()
  @IsOptional()
  aiEvaluationEnable?: boolean;

  @ApiProperty({ enum: SubmissionMethod, example: 'GITHUB', default: SubmissionMethod.GITHUB, description: 'Allowed submission method' })
  @IsEnum(SubmissionMethod)
  allowedSubmissionMethod: SubmissionMethod;

  @ApiProperty({ type: [CreateRubricDTO], description: 'Rubrics for grading the assessment' })
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => CreateRubricDTO)
  rubrics: CreateRubricDTO[];


  @ApiPropertyOptional({ type: [ResourceDTO] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ResourceDTO)
  resources?: ResourceDTO[];
}
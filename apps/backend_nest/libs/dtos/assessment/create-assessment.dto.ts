import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString, IsBoolean, IsNumber, IsOptional, IsEnum, IsDate } from 'class-validator';
import { SubmissionType } from '../../enums/Assessment';
import { Transform } from 'class-transformer';

export class CreateAssessmentDTO {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  instruction: string;

  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined), { toClassOnly: true })
  @IsDate({ message: 'dob must be a Date in format "YYYY-MM-DD"' })
  @ApiPropertyOptional({ example: '2000-01-01', description: 'Date of birth in YYYY-MM-DD format' })
  startDate: Date;

  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined), { toClassOnly: true })
  @IsDate({ message: 'dob must be a Date in format "YYYY-MM-DD"' })
  @ApiPropertyOptional({ example: '2000-01-01', description: 'Date of birth in YYYY-MM-DD format' })
  dueDate: Date;

  @ApiProperty()
  @IsNumber()
  maxScore: number;

  @ApiProperty({ enum: SubmissionType })
  @IsEnum(SubmissionType)
  submissionType: SubmissionType;

  @ApiProperty()
  @IsBoolean()
  allowLate: boolean;

  @ApiProperty()
  @IsBoolean()
  allowTeamSubmition: boolean; // Matches your entity typo

  @ApiProperty()
  @IsNumber()
  classId: number;
}
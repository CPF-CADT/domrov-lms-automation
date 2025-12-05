import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsDateString, IsNumber, IsBoolean, IsOptional, IsEnum, IsDate } from 'class-validator';
import { SubmissionType } from '../../enums/Assessment';
import { Transform } from 'class-transformer';

export class UpdateAssessmentDTO {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    title?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    instruction?: string;

    @IsOptional()
    @Transform(({ value }) => (value ? new Date(value) : undefined), { toClassOnly: true })
    @IsDate({ message: 'dob must be a Date in format "YYYY-MM-DD"' })
    @ApiPropertyOptional({ example: '2000-01-01', description: 'Date of birth in YYYY-MM-DD format' })
    dueDate?: Date;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    maxScore?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    allowLate?: boolean;
}
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional } from 'class-validator';

export class GradeSubmissionDTO {
    @ApiProperty({ example: 85, description: 'Score for the submission' })
    @IsNumber()
    score: number;

    @ApiPropertyOptional({ example: 'Good work, but needs improvement in code structure', description: 'Feedback for the submission' })
    @IsString()
    @IsOptional()
    feedback?: string;
}
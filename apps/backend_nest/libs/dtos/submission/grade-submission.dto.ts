import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional } from 'class-validator';

export class GradeSubmissionDTO {
    @ApiProperty()
    @IsNumber()
    score: number;

    @ApiProperty()
    @IsString()
    @IsOptional()
    feedback: string;
}
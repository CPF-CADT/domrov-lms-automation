import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class UpdateRubricDTO {
    @ApiPropertyOptional({ example: 1, description: 'Rubric ID (omit to create new)' })
    @IsOptional()
    @IsNumber()
    id?: number;

    @ApiPropertyOptional({ example: 'Code Quality', description: 'Criterion definition' })
    @IsOptional()
    @IsString()
    definition?: string;

    @ApiPropertyOptional({ example: 40, description: 'Total score for this criterion' })
    @IsOptional()
    @IsNumber()
    totalScore?: number;

}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ValidateNested, IsUrl, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

// Reusable DTO for submission resources
export class SubmitResourceDTO {
  @ApiPropertyOptional({
    description: 'ID of an existing uploaded resource',
    example: 12,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  resourceId?: number;
}

export class SubmitAssignmentDto {
  @ApiPropertyOptional({
    type: [SubmitResourceDTO],
    description: 'List of resources for the submission (existing or new)',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitResourceDTO)
  resources?: SubmitResourceDTO[];

  @ApiPropertyOptional({
    description: 'GitHub repository URL for code submissions',
    example: 'https://github.com/username/repository',
  })
  @IsOptional()
  @IsUrl()
  githubUrl?: string;

  @ApiPropertyOptional({
    description: 'Optional comments for this submission',
    example: 'This is my final submission for the assignment',
  })
  @IsOptional()
  @IsString()
  comments?: string;
}

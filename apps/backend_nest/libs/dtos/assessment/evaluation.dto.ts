import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

import { EvaluationType } from '../../enums/Assessment';

export class EvaluationDto {
  @ApiProperty({ example: 85 })
  @IsNumber()
  score: number;

  @ApiProperty({
    example: 'Good job, but improve structure',
    required: false,
  })
  @IsOptional()
  @IsString()
  feedback?: string;

  @ApiProperty({ example: 2, default: 0 })
  @IsOptional()
  @IsNumber()
  penaltyScore?: number;

  @ApiProperty({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;

  @ApiProperty({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isModified?: boolean;

  @ApiProperty({
    enum: EvaluationType,
    example: EvaluationType.MANUAL,
  })
  @IsEnum(EvaluationType)
  evaluationType: EvaluationType;

  @ApiProperty({
    example: 'AI suggests improving grammar',
    required: false,
  })
  @IsOptional()
  @IsString()
  aiOutput?: string;

  @ApiProperty({
    example: 'High confidence',
    required: false,
  })
  @IsOptional()
  @IsString()
  confidencePoint?: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  submissionId: number;
}

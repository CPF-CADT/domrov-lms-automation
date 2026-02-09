import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";

export enum FeedbackType {
  suggestion = 'suggestion',
  warning = 'warning',
  error = 'error',
}

export class FeedbackItemDto {
  @ApiProperty({ example: 'main.cpp' })
  @IsString()
  path: string;

  @ApiProperty({ example: 9, required: false })
  @IsOptional()
  @IsNumber()
  startLine?: number;

  @ApiProperty({ example: 9, required: false })
  @IsOptional()
  @IsNumber()
  endLine?: number;

  @ApiProperty({ example: 'Consider validating input' })
  @IsString()
  message: string;

  @ApiProperty({ enum: FeedbackType, example: FeedbackType.suggestion })
  @IsEnum(FeedbackType)
  type: FeedbackType;

  @ApiProperty({ example: 'uuid', required: false })
  @IsOptional()
  @IsString()
  id?: string; // optional, used for updating existing feedback
}

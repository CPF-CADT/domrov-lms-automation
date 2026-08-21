import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { FeedbackType } from "../../entities/assessment/evaluation-feedback.entity";


export class FeedbackItemDto {
  @ApiProperty({ example: 'main.cpp' })
  @IsString()
  path: string; // Used as filePath in service mapping

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

  @ApiProperty({ enum: FeedbackType, example: FeedbackType.SUGGESTION })
  @IsEnum(FeedbackType)
  type: FeedbackType; // Used as feedbackType in service mapping

  @ApiProperty({ example: 'uuid', required: false })
  @IsOptional()
  @IsString()
  id?: string; 
}
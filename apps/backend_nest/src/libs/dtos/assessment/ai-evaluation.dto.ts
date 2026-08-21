import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsString,
  IsOptional,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RubricScoreDto } from './rubric-score.dto';

export class EvaluationDto {

  // 👈 Proto: string submission_id = 1;
  @ApiProperty({ example: "10" })
  @IsString()
  submissionId: string;

  // 👈 Proto: ScoreCriteria score = 2;
  @ApiProperty({ type: [RubricScoreDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RubricScoreDto)
  rubricScores?: RubricScoreDto[];

  // 👈 Proto: string feedback = 3;
  @ApiProperty({
    example: 'Good job, but improve structure',
    required: false,
  })
  @IsOptional()
  @IsString()
  feedback?: string;

  // 👈 Proto: int32 input_token = 4;
  @ApiProperty({ example: 150 })
  @IsOptional()
  @IsNumber()
  inputToken?: number;

  // 👈 Proto: int32 output_token = 5;
  @ApiProperty({ example: 50 })
  @IsOptional()
  @IsNumber()
  outputToken?: number;
}
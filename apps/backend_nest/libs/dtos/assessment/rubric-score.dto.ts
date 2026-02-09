import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class RubricScoreDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  rubricId: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  score: number;

  @ApiProperty({ example: 'Great logic implementation' })
  @IsOptional()
  @IsString()
  comment?: string;
}
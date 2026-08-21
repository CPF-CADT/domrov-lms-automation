import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";


export class CreateRubricDTO {
  @ApiProperty({ example: 'Logic correctness' })
  @IsString()
  @IsNotEmpty()
  criterion: string;

  @ApiProperty({ example: 80 })
  @IsNumber()
  weight: number; // percentage

}

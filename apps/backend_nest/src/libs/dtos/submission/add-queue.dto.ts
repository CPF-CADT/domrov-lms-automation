import { IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AddQueueDto {
  @ApiProperty({
    example: 1234,
    description: 'Submission ID to enqueue',
  })
  @Type(() => Number) // converts string to number automatically
  @IsNumber()
  submission_id: number;
}
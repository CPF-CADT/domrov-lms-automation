import { ApiProperty } from '@nestjs/swagger';

export class EvaluationItemDto {
  @ApiProperty({ example: 123, description: 'Evaluation ID' })
  id: number;

  @ApiProperty({ example: 123, description: 'User ID' })
  userId: number;

  @ApiProperty({ example: 'John Doe', description: 'User name' })
  userName: string;

  @ApiProperty({
    example: 'pending',
    enum: ['pending', 'approved', 'rejected'],
    description: 'Evaluation status',
  })
  status: string;

  @ApiProperty({ example: '2026-03-01T09:00:00Z', description: 'Submitted date' })
  submittedAt: string;
}

export class EvaluationListResponseDto {
  @ApiProperty({ type: [EvaluationItemDto] })
  data: EvaluationItemDto[];

  @ApiProperty({ example: 45, description: 'Total evaluations' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page' })
  page: number;

  @ApiProperty({ example: 10, description: 'Items per page' })
  limit?: number;
}

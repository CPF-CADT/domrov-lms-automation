import { ApiProperty } from '@nestjs/swagger';

export class AIEvaluationItemDto {
  @ApiProperty({ example: 123, description: 'Evaluation ID' })
  id: number;

  @ApiProperty({ example: 456, description: 'Submission ID' })
  submissionId: number;

  @ApiProperty({ example: 789, description: 'Assessment ID' })
  assessmentId: number;

  @ApiProperty({ example: 'Introduction to Programming', description: 'Assessment title' })
  assessmentTitle: string;

  @ApiProperty({ example: 101, description: 'User ID who submitted' })
  userId: number;

  @ApiProperty({ example: 'John Doe', description: 'User name who submitted' })
  userName: string;

  @ApiProperty({ example: 'john.doe@example.com', description: 'User email' })
  userEmail: string;

  @ApiProperty({ 
    example: 'SYSTEM', 
    enum: ['SYSTEM', 'USER', 'NONE'],
    description: 'AI model selection mode - indicates if system or user API key was used' 
  })
  aiModelSelectionMode: string;

  @ApiProperty({ example: 85.5, description: 'Evaluation score' })
  score: number;

  @ApiProperty({ example: 5, description: 'Penalty score applied' })
  penaltyScore: number;

  @ApiProperty({ 
    example: 'AI', 
    enum: ['AI', 'MANUAL'],
    description: 'Type of evaluation' 
  })
  evaluationType: string;

  @ApiProperty({ example: true, description: 'Whether evaluation is approved' })
  isApproved: boolean;

  @ApiProperty({ example: false, description: 'Whether evaluation was modified after AI generation' })
  isModified: boolean;

  @ApiProperty({ example: 'high', description: 'AI confidence point', nullable: true })
  confidencePoint: string | null;

  @ApiProperty({ example: 1500, description: 'Estimated input tokens used', nullable: true })
  estimatedInputTokens: number | null;

  @ApiProperty({ example: 800, description: 'Estimated output tokens used', nullable: true })
  estimatedOutputTokens: number | null;

  @ApiProperty({ example: 2300, description: 'Total estimated tokens used', nullable: true })
  estimatedTotalTokens: number | null;

  @ApiProperty({ example: '2026-03-01T09:00:00Z', description: 'When submission was created' })
  submissionDate: string;

  @ApiProperty({ example: '2026-03-01T10:30:00Z', description: 'When evaluation was created' })
  evaluationDate: string;

  @ApiProperty({ example: 'gpt-4', description: 'AI model/provider used if available', nullable: true })
  aiProvider: string | null;
}

export class AIEvaluationListResponseDto {
  @ApiProperty({ type: [AIEvaluationItemDto] })
  data: AIEvaluationItemDto[];

  @ApiProperty({ example: 150, description: 'Total AI evaluations matching the filter' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page' })
  page: number;

  @ApiProperty({ example: 10, description: 'Items per page' })
  limit: number;

  @ApiProperty({ example: true, description: 'Whether any filters were applied' })
  filtered: boolean;
}

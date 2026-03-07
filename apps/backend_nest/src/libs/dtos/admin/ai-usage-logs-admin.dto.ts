import { ApiProperty } from '@nestjs/swagger';

export class UserProfileDto {

  @ApiProperty({ example: 'John', description: 'User first name' })
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'User last name', nullable: true })
  lastName: string | null;

  @ApiProperty({ example: 'john.doe@example.com', description: 'User email' })
  email: string;

  @ApiProperty({ example: 'https://example.com/profile.jpg', description: 'User profile picture URL', nullable: true })
  profilePictureUrl: string | null;

  @ApiProperty({ example: 'ACTIVE', description: 'User status' })
  status: string;
}

export class AIUsageLogItemDto {
  @ApiProperty({ example: 123, description: 'AI Usage Log ID' })
  id: number;

  @ApiProperty({ example: 'AI Evaluation - Submission 456 in assessment Introduction to Programming', description: 'Log title' })
  title: string;

  @ApiProperty({ example: 1500, description: 'Input token count' })
  inputTokenCount: number;

  @ApiProperty({ example: 800, description: 'Output token count' })
  outputTokenCount: number;

  @ApiProperty({ example: 2300, description: 'Total token count' })
  totalTokenCount: number;

  @ApiProperty({ example: '2026-03-01T10:30:00Z', description: 'When the AI was used' })
  usingDate: string;

  @ApiProperty({ type: UserProfileDto, description: 'User who used the AI' })
  user: UserProfileDto;

  @ApiProperty({ example: '2026-03-01T10:30:00Z', description: 'Log created at' })
  createdAt: string;
}

export class AIUsageLogsListResponseDto {
  @ApiProperty({ type: [AIUsageLogItemDto] })
  data: AIUsageLogItemDto[];

  @ApiProperty({ example: 150, description: 'Total AI usage logs matching the filter' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page' })
  page: number;

  @ApiProperty({ example: 10, description: 'Items per page' })
  limit: number;

  @ApiProperty({ example: true, description: 'Whether any filters were applied' })
  filtered: boolean;
}

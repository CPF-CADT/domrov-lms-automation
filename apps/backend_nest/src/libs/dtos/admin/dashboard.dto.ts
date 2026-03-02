import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsDto {
  @ApiProperty({ example: 1500, description: 'Total number of users' })
  totalUsers: number;

  @ApiProperty({ example: 1200, description: 'Number of active users' })
  activeUsers: number;

  @ApiProperty({ example: 5432, description: 'Total number of transactions' })
  totalTransactions: number;

  @ApiProperty({ example: 45000, description: 'Total revenue' })
  totalRevenue: number;

  @ApiProperty({ example: 12.5, description: 'Monthly growth percentage' })
  monthlyGrowth: number;
}

export class ActivityItemDto {
  @ApiProperty({ example: 'act_001', description: 'Activity ID' })
  id: string;

  @ApiProperty({ 
    example: 'user_registration',
    enum: ['user_registration', 'purchase', 'credit_added', 'credit_deducted', 'package_created', 'user_suspended'],
    description: 'Type of activity'
  })
  type: string;

  @ApiProperty({ example: 'New user registered', description: 'Activity description' })
  description: string;

  @ApiProperty({ example: 'John Doe', description: 'User name associated with activity' })
  user: string;

  @ApiProperty({ example: '2026-03-01T10:30:00Z', description: 'Timestamp of activity' })
  timestamp: string;

  @ApiProperty({ example: 49.99, description: 'Amount (if applicable)', nullable: true })
  amount?: number;
}

export class RecentActivityResponseDto {
  @ApiProperty({ type: [ActivityItemDto] })
  activities: ActivityItemDto[];
}

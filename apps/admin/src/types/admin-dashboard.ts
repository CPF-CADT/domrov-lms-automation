/**
 * Admin Dashboard API Types
 * Matches backend DTOs: DashboardStatsDto, UserListTableResponseDto, RecentActivityResponseDto
 */

export interface DashboardStatsDto {
  totalUsers: number;
  activeUsers: number;
  totalTransactions: number;
  totalRevenue: number;
  monthlyGrowth: number;
}

export interface UserTableItemDto {
  id: number;
  avatar: string;
  name: string;
  email: string;
  role: string;
  balance: number;
  status: string;
  created: string;
}

export interface UserListTableResponseDto {
  data: UserTableItemDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  totalRecords: number;
}

export interface ActivityItem {
  id: string;
  type: 'user_registration' | 'purchase';
  description: string;
  user: string;
  timestamp: string;
  amount: number | null;
}

export interface RecentActivityResponseDto {
  activities: ActivityItem[];
}

export interface DailyGrowthData {
  date: string;
  value: number;
}

export interface DailyIncomeResponseDto {
  dailyData: DailyGrowthData[];
}

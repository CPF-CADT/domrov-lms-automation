// Dashboard Service - Admin Dashboard Controller Integration
// Handles dashboard statistics and recent activity

import { apiClient } from './api';
import type {
  DashboardStatsDto,
  UserListTableResponseDto,
  RecentActivityResponseDto,
  ActivityItem,
  DailyGrowthData,
  DailyIncomeResponseDto,
} from '../types/admin-dashboard';

export type { DashboardStatsDto, RecentActivityResponseDto, ActivityItem, DailyGrowthData, DailyIncomeResponseDto };

class DashboardService {
  /**
   * Fetch dashboard statistics
   * Matches: GET /admin/dashboard/stats
   */
  async fetchStats(): Promise<DashboardStatsDto> {
    try {
      const response = await apiClient.dashboard.getStats();
      return {
        totalUsers: response.totalUsers || 0,
        activeUsers: response.activeUsers || 0,
        totalTransactions: response.totalTransactions || 0,
        totalRevenue: response.totalRevenue || 0,
        monthlyGrowth: response.monthlyGrowth || 0,
      };
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Fetch recent activity feed
   * Matches: GET /admin/dashboard/recent-activity
   */
  async fetchRecentActivity(): Promise<RecentActivityResponseDto> {
    try {
      const response = await apiClient.dashboard.getRecentActivity();
      return {
        activities: response.activities || [],
      };
    } catch (error) {
      console.error('Failed to fetch recent activity:', error);
      throw error;
    }
  }

  /**
   * Fetch users list from dashboard endpoint
   * Matches: GET /admin/dashboard/users
   */
  async fetchDashboardUsersList(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: string,
    role?: string
  ): Promise<UserListTableResponseDto> {
    try {
      const response = await apiClient.dashboard.getUsers(
        page,
        limit,
        search,
        status,
        role
      );
      return response;
    } catch (error) {
      console.error('Failed to fetch dashboard users list:', error);
      throw error;
    }
  }

  /**
   * Fetch daily income data for the last 7 days
   * Matches: GET /admin/dashboard/income-daily
   */
  async fetchDailyGrowth(): Promise<DailyIncomeResponseDto> {
    try {
      const response = await apiClient.dashboard.getDailyIncome();
      return {
        dailyData: response.dailyData,
      };
    } catch (error) {
      console.error('Failed to fetch daily income:', error);
      throw error;
    }
  }
}

export const dashboardService = new DashboardService();

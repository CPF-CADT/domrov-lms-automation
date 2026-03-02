// User Service - Admin Users Controller Integration
// Handles all user management operations for admin dashboard

import { apiClient } from './api';
import type {
  UserListItemDto,
  UserListResponseDto,
  UserDetailDto,
  AddCreditsResponseDto,
  UserStatusChangeDto,
} from '../types/admin-users';

export interface User extends UserListItemDto {
  // Backward compatibility fields
  avatar?: string;
  name?: string;
  balance?: number;
  created?: string;
  totalSpent?: number;
  recentTransactions?: Array<{
    id: string | number;
    amount: number;
    date: string;
    status: string;
  }>;
}

export interface UserDetail extends UserDetailDto { }

class UserService {
  private normalizeTransactionStatus(
    status: string
  ): UserDetailDto['recentTransactions'][number]['status'] {
    const validStatuses: Array<UserDetailDto['recentTransactions'][number]['status']> = [
      'PENDING',
      'COMPLETED',
      'FAILED',
    ];

    return validStatuses.includes(
      status as UserDetailDto['recentTransactions'][number]['status']
    )
      ? (status as UserDetailDto['recentTransactions'][number]['status'])
      : 'PENDING';
  }

  /**
   * Fetch all users with advanced filtering and pagination
   * Matches: GET /admin/users with query parameters
   */
  async fetchUsers(
    page: number = 1,
    limit: number = 10,
    options?: {
      status?: string;
      role?: string;
      verified?: string;
      search?: string;
      joinDateFrom?: string;
      joinDateTo?: string;
      sortBy?: string;
    }
  ): Promise<UserListResponseDto> {
    try {
      const response = await apiClient.users.getAll(
        page,
        limit,
        options?.status,
        options?.role,
        options?.verified,
        options?.search,
        options?.joinDateFrom,
        options?.joinDateTo,
        options?.sortBy
      );

      return {
        data: response.data,
        total: response.total,
        page: response.page,
        limit: response.limit,
        filtered: response.filtered,
      };
    } catch (error) {
      console.error('Failed to fetch users:', error);
      throw error;
    }
  }

  /**
   * Fetch dashboard users - simpler endpoint for dashboard display
   * Matches: GET /admin/dashboard/users
   */
  async fetchDashboardUsers(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: string,
    role?: string
  ): Promise<{
    data: Array<{
      id: number;
      avatar: string;
      name: string;
      email: string;
      role: string;
      balance: number;
      status: string;
      created: string;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    totalRecords: number;
  }> {
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
      console.error('Failed to fetch dashboard users:', error);
      throw error;
    }
  }

  /**
   * Get detailed information about a specific user
   * Matches: GET /admin/users/:userId
   */
  async fetchUserById(userId: number): Promise<UserDetailDto> {
    try {
      const response = await apiClient.users.getById(userId);

      return {
        ...response,
        recentTransactions: (response.recentTransactions ?? []).map((transaction) => ({
          ...transaction,
          status: this.normalizeTransactionStatus(transaction.status),
        })),
      };
    } catch (error) {
      console.error(`Failed to fetch user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get user details with comprehensive information
   * Alias for fetchUserById with same functionality
   * Returns: user info + purchasedPackages[] + recentTransactions[]
   */
  async getUserDetails(userId: number): Promise<UserDetailDto> {
    return this.fetchUserById(userId);
  }

  /**
   * Add credits to a user's wallet
   * Matches: POST /admin/users/:userId/credits/add
   */
  async addCredits(
    userId: number,
    amount: number,
    reason: string,
    adminNote?: string
  ): Promise<AddCreditsResponseDto> {
    try {
      if (!amount || amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      const response = await apiClient.users.addCredits(userId, {
        amount,
        reason,
        adminNote,
      });

      return response;
    } catch (error) {
      console.error(`Failed to add credits to user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Deduct credits from a user's wallet
   * Matches: POST /admin/users/:userId/credits/deduct
   */
  async deductCredits(
    userId: number,
    amount: number,
    reason: string,
    adminNote?: string
  ): Promise<AddCreditsResponseDto> {
    try {
      if (!amount || amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      const response = await apiClient.users.deductCredits(userId, {
        amount,
        reason,
        adminNote,
      });

      return response;
    } catch (error) {
      console.error(`Failed to deduct credits from user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Toggle user status (active/inactive/banned)
   * Matches: PATCH /admin/users/:userId/status
   */
  async toggleUserStatus(
    userId: number,
    status: 'active' | 'inactive' | 'banned',
    reason?: string
  ): Promise<UserStatusChangeDto> {
    try {
      const validStatuses = ['active', 'inactive', 'banned'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      const response = await apiClient.users.toggleStatus(userId, {
        status,
        reason,
      });

      return response;
    } catch (error) {
      console.error(`Failed to toggle status for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Delete a user permanently
   * Matches: DELETE /admin/users/:userId
   */
  async deleteUser(userId: number): Promise<{ message: string; deletedUserId: number }> {
    try {
      const response = await apiClient.users.delete(userId);
      return response;
    } catch (error) {
      console.error(`Failed to delete user ${userId}:`, error);
      throw error;
    }
  }
}

export const userService = new UserService();

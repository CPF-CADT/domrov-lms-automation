// Credit Package Service - Admin Wallet Controller Integration
// Handles credit package management

import type { CreditPackage } from '../types/credit-package';
import type {
  CreditPackageResponseDto,
  CreateCreditPackageDto,
  AdminAdjustWalletDTO,
  TransactionResponseDto,
  TransactionDetailsDto,
} from '../types/admin-wallet';
import { apiClient } from './api';

class CreditPackageService {
  /**
   * Fetch all credit packages (includes active and inactive)
   * Matches: GET /admin/wallet/packages
   */
  async fetchPackages(): Promise<CreditPackageResponseDto[]> {
    try {
      const response = await apiClient.wallet.getAllPackages();
      return response || [];
    } catch (error) {
      console.error('Failed to fetch credit packages:', error);
      throw error;
    }
  }

  /**
   * Create a new credit package
   * Matches: POST /admin/wallet/packages
   */
  async createPackage(
    data: CreateCreditPackageDto
  ): Promise<CreditPackageResponseDto> {
    try {
      if (!data.name || data.name.trim().length === 0) {
        throw new Error('Package name is required');
      }
      if (!data.credits || data.credits <= 0) {
        throw new Error('Credits must be greater than 0');
      }
      if (!data.price || data.price < 0) {
        throw new Error('Price must be non-negative');
      }

      const response = await apiClient.wallet.createPackage(data);
      return response;
    } catch (error) {
      console.error('Failed to create credit package:', error);
      throw error;
    }
  }

  /**
   * Toggle package active status
   * Matches: PATCH /admin/wallet/packages/:id/toggle
   */
  async togglePackageStatus(id: number): Promise<CreditPackageResponseDto> {
    try {
      const response = await apiClient.wallet.togglePackage(id);
      return response;
    } catch (error) {
      console.error(`Failed to toggle package status for ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update package (NOT SUPPORTED - use togglePackageStatus instead)
   */
  async updatePackage(
    id: number,
    _updates: Partial<CreditPackage>
  ): Promise<CreditPackageResponseDto> {
    console.warn(
      `Package update not supported by backend API. Package ID: ${id}`
    );
    throw new Error(
      'Package updates are not supported. Please deactivate the old package and create a new one.'
    );
  }

  /**
   * Delete package (deactivates it)
   */
  async deletePackage(id: number): Promise<void> {
    await this.togglePackageStatus(id);
  }
}

/**
 * Wallet Service - Admin Wallet Controller Integration
 * Handles wallet adjustments and transactions
 */
class WalletService {
  /**
   * Manually adjust user wallet balance
   * Matches: POST /admin/wallet/adjust
   */
  async adjustWallet(data: AdminAdjustWalletDTO): Promise<{ id?: number; creditBalance?: number; updated_at: string; success?: boolean }> {
    try {
      if (!data.userId || data.userId <= 0) {
        throw new Error('Valid user ID is required');
      }
      if (typeof data.amount !== 'number' || data.amount === 0) {
        throw new Error('Amount must be a non-zero number');
      }
      if (!data.reason || data.reason.trim().length === 0) {
        throw new Error('Reason is required');
      }

      const response = await apiClient.wallet.adjustWallet(data);
      return response;
    } catch (error) {
      console.error('Failed to adjust wallet:', error);
      throw error;
    }
  }

  /**
   * Fetch all transactions with pagination
   * Matches: GET /admin/wallet/transactions
   */
  async fetchTransactions(
    page: number = 1,
    limit: number = 10,
    status?: string,
    search?: string
  ): Promise<TransactionResponseDto> {
    try {
      const response = await apiClient.wallet.getTransactions(
        page,
        limit,
        status,
        search
      );
      return response;
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      throw error;
    }
  }

  /**
   * Fetch transaction details
   * Matches: GET /admin/wallet/transactions/:transactionId
   */
  async fetchTransactionDetails(
    transactionId: string | number
  ): Promise<TransactionDetailsDto> {
    try {
      const response = await apiClient.wallet.getTransactionDetails(
        transactionId
      );
      return response;
    } catch (error) {
      console.error(`Failed to fetch transaction ${transactionId}:`, error);
      throw error;
    }
  }
}

export const creditPackageService = new CreditPackageService();
export const walletService = new WalletService();

// Export type for re-exports
export type { CreditPackage } from '../types/credit-package';

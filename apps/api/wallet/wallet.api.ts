// /api/wallet/wallet.api.ts

import axiosInstance from '../axios';
import {
  WalletBalanceResponseDto,
  TransactionHistoryResponseDto,
  CreditPackageResponseDto,
} from './dto';

/**
 * Get user's current wallet balance
 */
export async function getWalletBalance(): Promise<WalletBalanceResponseDto> {
  try {
    const response = await axiosInstance.get<WalletBalanceResponseDto>('/wallet/balance');
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      error?.message ||
      'Failed to get wallet balance'
    );
  }
}

/**
 * Get transaction history with pagination
 */
export async function getTransactionHistory(
  page: number = 1,
  limit: number = 10
): Promise<TransactionHistoryResponseDto> {
  try {
    const response = await axiosInstance.get<TransactionHistoryResponseDto>(
      '/wallet/transactions',
      {
        params: { page, limit },
      }
    );
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      error?.message ||
      'Failed to get transaction history'
    );
  }
}

/**
 * Get available credit packages for purchase
 */
export async function getCreditPackages(): Promise<CreditPackageResponseDto[]> {
  try {
    const response = await axiosInstance.get<CreditPackageResponseDto[]>('/wallet/packages');
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      error?.message ||
      'Failed to get credit packages'
    );
  }
}

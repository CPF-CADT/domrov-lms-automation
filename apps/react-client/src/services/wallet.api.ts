// /api/wallet/wallet.api.ts

import axiosInstance from "@/lib/axiosInstance";
import type {
  WalletBalanceResponseDto,
  TransactionHistoryResponseDto,
  CreditPackageResponseDto,
} from "@/types/wallet.types";


/**
 * Get user's current wallet balance
 */
export async function getWalletBalance(): Promise<WalletBalanceResponseDto> {
  const response = (await axiosInstance.get("/wallet/balance")).data;
  return response.data;
}

/**
 * Get transaction history with pagination
 */
export async function getTransactionHistory(
  page: number = 1,
  limit: number = 10,
): Promise<TransactionHistoryResponseDto> {
  const response = (await axiosInstance.get(
    "/wallet/transactions",
    {
      params: { page, limit },
    },
  )).data;
  return response.data;
}

/**
 * Get available credit packages for purchase
 */
export async function getCreditPackages(): Promise<CreditPackageResponseDto[]> {
  const response = (await axiosInstance.get(
    "/wallet/packages"
  )).data;
  return response.data;
}

const walletService = {
  getWalletBalance,
  getTransactionHistory,
  getCreditPackages,
};

export default walletService;

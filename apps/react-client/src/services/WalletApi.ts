// /api/wallet/wallet.api.ts

import axiosInstance from "@/lib/AxiosInstance";
import type {
  WalletBalanceResponseDto,
  TransactionHistoryResponseDto,
  CreditPackageResponseDto,
} from "@/types/WalletTypes";


/**
 * Get user's current wallet balance
 */
export async function getWalletBalance(): Promise<WalletBalanceResponseDto> {
  const response = (await axiosInstance.get("/wallet")).data;
  return { ...response, credits: Number(response.availableCredits ?? response.credits ?? 0) };
}

/**
 * Get transaction history with pagination
 */
export async function getTransactionHistory(
  page: number = 1,
  limit: number = 10,
): Promise<TransactionHistoryResponseDto> {
  return (await axiosInstance.get("/wallet/transactions", { params: { page, limit } })).data;
}

/**
 * Get available credit packages for purchase
 */
export async function getCreditPackages(): Promise<CreditPackageResponseDto[]> {
  return (await axiosInstance.get("/credit-packages")).data;
}

const walletService = {
  getWalletBalance,
  getTransactionHistory,
  getCreditPackages,
};

export default walletService;

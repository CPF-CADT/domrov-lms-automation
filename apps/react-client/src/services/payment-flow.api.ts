

import axiosInstance from "@/lib/axiosInstance";
import type { ApiResponse } from "@/types";
import type {
  StartPaymentResponseDto,
  CheckTransactionByHashDto,
  CheckTransactionResponseDto,
} from "@/types/payment.type";

/**
 * Start payment for a credit package
 */
export async function startPayment(
  packageId: number,
): Promise<ApiResponse<StartPaymentResponseDto>> {
  try {
    const response = await axiosInstance.post<
      ApiResponse<StartPaymentResponseDto>
    >(`/payment/start-payment/${packageId}`);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || error?.message || "Unknown API error",
    );
  }
}

/**
 * Check transaction status by short hash
 */
export async function checkTransactionByHash(
  data: CheckTransactionByHashDto,
): Promise<ApiResponse<CheckTransactionResponseDto>> {
  try {
    const response = await axiosInstance.post<
      ApiResponse<CheckTransactionResponseDto>
    >(`/payment/check_transaction_by_short_hash`, data);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || error?.message || "Unknown API error",
    );
  }
}

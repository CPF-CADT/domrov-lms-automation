

import axiosInstance from "@/lib/axiosInstance";

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
): Promise<StartPaymentResponseDto> {
  try {
    const response = (await axiosInstance.post(
      `/payment/start-payment/${packageId}`
    )).data;
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
): Promise<CheckTransactionResponseDto> {
  try {
    const response = (await axiosInstance.post(
      `/payment/check_transaction_by_short_hash`, data
    )).data;
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message || error?.message || "Unknown API error",
    );
  }
}

// /api/payment-flow/payment-flow.api.ts
import axiosInstance from '../axios';
import {
  StartPaymentDto,
  StartPaymentResponseDto,
  PaymentStatusResponseDto
} from './dto';

/**
 * Start payment for a credit package
 */
export async function startPayment(packageId: number, data: StartPaymentDto): Promise<StartPaymentResponseDto> {
  try {
    const response = await axiosInstance.post<StartPaymentResponseDto>(
      `/payment/start-payment/${packageId}`,
      data
    );
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      error?.message ||
      'Unknown API error'
    );
  }
}

/**
 * Get payment status
 */
export async function getPaymentStatus(paymentId: string): Promise<PaymentStatusResponseDto> {
  try {
    const response = await axiosInstance.get<PaymentStatusResponseDto>(
      `/payment/status/${paymentId}`
    );
    return response.data;
  } catch (error: any) {
    throw new Error(
      error?.response?.data?.message ||
      error?.message ||
      'Unknown API error'
    );
  }
}

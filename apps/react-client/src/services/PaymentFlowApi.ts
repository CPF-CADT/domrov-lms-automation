

import axiosInstance from "@/lib/axiosInstance";

export type PaymentStatus = "pending" | "verifying" | "paid" | "failed";
export interface UserPayment {
  id: string;
  packageName: string;
  amount: number;
  currency: string;
  credits: number;
  status: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

function apiErrorMessage(error: unknown, fallback: string): string {
  const candidate = error as { response?: { data?: { message?: unknown } }; message?: unknown };
  if (typeof candidate?.response?.data?.message === "string") return candidate.response.data.message;
  if (typeof candidate?.message === "string") return candidate.message;
  return fallback;
}

/**
 * Start payment for a credit package
 */
export async function startPayment(
  packageId: string,
): Promise<{ id: string; status: string; qr: string; packageName: string; amount: number; currency: string; credits: number; providerMode?: string }> {
  try {
    const response = await axiosInstance.post("/payments", { creditPackageId: packageId }, {
      headers: { "Idempotency-Key": `web-payment:${crypto.randomUUID()}` },
    });
    return response.data;
  } catch (error: unknown) {
    throw new Error(apiErrorMessage(error, "Unknown API error"));
  }
}

export async function uploadPaymentProof(paymentId: string, proof: File): Promise<{ paymentId: string; status: string; extractedHash?: string }> {
  try {
    const form = new FormData();
    form.append('proof', proof);
    const response = await axiosInstance.post(`/payments/${paymentId}/proof`, form);
    return response.data;
  } catch (error: unknown) {
    throw new Error(apiErrorMessage(error, "Unable to verify the receipt"));
  }
}

export async function getPaymentStatus(paymentId: string): Promise<UserPayment> {
  try {
    const response = await axiosInstance.get(`/payments/${paymentId}/status`);
    return response.data;
  } catch (error: unknown) {
    throw new Error(apiErrorMessage(error, "Unable to refresh payment status"));
  }
}

export async function deletePendingPayment(paymentId: string): Promise<void> {
  try {
    await axiosInstance.delete(`/payments/${paymentId}`);
  } catch (error: unknown) {
    throw new Error(apiErrorMessage(error, 'Unable to delete this payment'));
  }
}

export async function getPaymentHistory(page = 1, limit = 10): Promise<{ payments: UserPayment[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  try {
    const response = await axiosInstance.get("/payments", { params: { page, limit } });
    return response.data;
  } catch (error: unknown) {
    throw new Error(apiErrorMessage(error, "Unable to load payment history"));
  }
}

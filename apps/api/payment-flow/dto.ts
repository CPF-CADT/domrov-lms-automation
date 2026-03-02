// /api/payment-flow/dto.ts

export interface StartPaymentDto {
  packageId: number;
  paymentMethod?: string;
}

export interface StartPaymentResponseDto {
  message: string;
  paymentId: string;
  packageId: number;
  amount: number;
  currency: string;
  qrCodeUrl?: string;
  paymentUrl?: string;
  createdAt: Date;
}

export interface PaymentStatusResponseDto {
  paymentId: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  packageId: number;
  amount: number;
  currency: string;
  createdAt: Date;
  completedAt?: Date;
  message?: string;
}

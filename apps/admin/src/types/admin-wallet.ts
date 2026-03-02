/**
 * Admin Wallet API Types - Extended Transaction Support
 * Matches backend DTOs from wallet controller
 */

export interface CreditPackageInfoDto {
  id: number;
  name: string;
  credits: number;
  bonusCredits: number;
}

// Payment Transaction
export interface PaymentTransactionDto {
  id: number;
  user: string;
  userId: number;
  amount: number;
  currency: string;
  method: string;
  status: 'paid' | 'unpaid';
  date: string;
  transactionType: 'payment';
  userNote?: string | null;
  proofImageUrl?: string | null;
  verificationNote?: string | null;
  creditPackage?: CreditPackageInfoDto | null;
}

// Admin Adjustment Transaction
export interface AdminAdjustmentTransactionDto {
  id: number;
  user: string;
  userId: number;
  amount: number;
  date: string;
  transactionType: 'admin_adjustment';
  adjustmentType: 'credit' | 'debit' | 'purchase';
  reason: string;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  metadata?: Record<string, any>;
}

// Union type for all transactions
export type TransactionResponseDto = PaymentTransactionDto | AdminAdjustmentTransactionDto;

export interface TransactionListResponseDto {
  data: TransactionResponseDto[];
  total: number;
  page: number;
  limit: number;
}

export interface CreditPackageDto {
  id: number;
  name: string;
  description: string;
  credits: number;
  bonusCredits: number;
  price: number;
  currency: string;
  discountInPercent: number;
  isActive: boolean;
  sortOrder: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCreditPackageDto {
  name: string;
  description: string;
  credits: number;
  price: number;
  currency: string;
  bonusCredits?: number;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateCreditPackageDto {
  name?: string;
  description?: string;
  credits?: number;
  price?: number;
  currency?: string;
  bonusCredits?: number;
  sortOrder?: number;
  isActive?: boolean;
}

// Reason types for wallet adjustments as per Admin Wallet API spec
export type WalletAdjustmentReason = 'BONUS' | 'ADMIN_ADJUSTMENT' | 'REFUND';

// Reason types for user credit operations (user credits endpoint)
export type UserCreditReason = 'bonus' | 'refund' | 'promo' | 'other';

export interface AdminAdjustWalletDTO {
  userId: number;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  reason: WalletAdjustmentReason;
  description?: string;
}

export interface AdminAdjustWalletResponseDto {
  id: number;
  creditBalance: number;
  updated_at: string;
}

// User Credit Operation DTOs (for /admin/users/:userId/credits/* endpoints)
export interface AddUserCreditsDto {
  amount: number;
  reason: UserCreditReason;
  adminNote?: string;
}

export interface AddCreditsResponseDto {
  userId: string | number;
  previousBalance: number;
  newBalance: number;
  transactionId: string;
  timestamp: string;
}

export interface DeductUserCreditsDto {
  amount: number;
  reason: UserCreditReason;
  adminNote?: string;
}

export interface AdminDeductResponseDto {
  userId: string | number;
  previousBalance: number;
  newBalance: number;
  transactionId: string;
  timestamp: string;
}

export interface CreditPackageInfoDto {
  id: number;
  name: string;
  credits: number;
  bonusCredits: number;
}

export interface TransactionDetailsDto {
  transactionDetails: {
    hash?: string;
    fromAccountId?: string;
    toAccountId?: string;
    amount: number;
    currency: string;
    description?: string;
    proofImageUrl?: string;
  };
}

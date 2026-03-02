// /api/wallet/dto.ts

import { Currency } from '../enums/Currency';
import { TransactionType } from '../enums/TransactionType';
export interface WalletBalanceResponseDto {
  id: number;
  userId: number;
  credits: number;
  updatedAt: Date;
}

export interface TransactionDto {
  id: number;
  walletId: number;
  amount: number;
  type: TransactionType;
  reason?: string;
  description?: string;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: Date;
}

export interface TransactionHistoryResponseDto {
  transactions: TransactionDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AddCreditsDto {
  amount: number;
  reason: string;
  description?: string;
}

export interface DeductCreditsDto {
  amount: number;
  reason: string;
  description?: string;
}

export interface WalletTransactionResponseDto {
  id: number;
  walletId: number;
  amount: number;
  type: string;
  reason?: string;
  balanceBefore?: number;
  balanceAfter: number;
  description?: string;
  metadata?: Record<string, any>;
  created_at: Date;
}

export interface TransactionHistoryMetaDto {
  total: number;
  page: number;
}

export interface CreditPackageResponseDto {
  id: number;
  name: string;
  description?: string;
  credits: number;
  bonusCredits: number;
  price: number;
  currency: Currency;
  discountInPercent: number;
  isActive: boolean;
  sortOrder?: number;
  created_at: Date;
  updated_at: Date;
}

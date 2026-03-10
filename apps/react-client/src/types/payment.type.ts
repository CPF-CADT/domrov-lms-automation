// /api/payment-flow/dto.ts

import type { Currency } from "./wallet.types";

// import { Currency } from "../enums/Currency";

export interface CheckTransactionByHashDto {
  hash: string;
  amount: number;
  currency: Currency;
}

export interface TransactionDataDto {
  hash: string;
  fromAccountId: string;
  toAccountId: string;
  currency: string;
  amount: number;
  description: string;
  createdDateMs: number;
  acknowledgedDateMs: number;
  trackingStatus?: string;
  receiverBank?: string;
  receiverBankAccount?: string;
}

export interface CheckTransactionResponseDto {
  responseCode: number;
  responseMessage: string;
  data?: TransactionDataDto;
  errorCode?: number;
}

export interface StartPaymentResponseDto {
  paymentId: number;
  message: string;
}

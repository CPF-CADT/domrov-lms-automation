// Transaction Service

import { apiClient } from './api';
import type { TransactionResponseDto } from '../types/admin-wallet';

export interface CreditPackageInfo {
    id: number;
    name: string;
    credits: number;
    bonusCredits: number;
}

// Payment transaction
export interface PaymentTransaction {
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
    creditPackage?: CreditPackageInfo | null;
}

// Admin adjustment transaction
export interface AdminAdjustmentTransaction {
    id: number;
    user: string;
    userId: number;
    amount: number;
    date: string;
    transactionType: 'admin_adjustment';
    adjustmentType: 'credit' | 'debit';
    reason: string;
    balanceBefore: number;
    balanceAfter: number;
    description?: string;
    metadata?: Record<string, any>;
}

export type Transaction = PaymentTransaction | AdminAdjustmentTransaction;

export interface TransactionDetail {
    id: number;
    user: string;
    userId: number;
    amount: number;
    currency: string;
    method: string;
    status: 'paid' | 'unpaid';
    date: string;
    transactionDetails: any;
}

export interface TransactionListResponse {
    data: Transaction[];
    total: number;
    page: number;
    limit: number;
}

class TransactionService {
    async fetchTransactions(page: number = 1, limit: number = 10, status?: string, search?: string): Promise<TransactionListResponse> {
        try {
            // API returns { success: true, data: { data: [...items], total, page, limit } }
            // request function automatically unwraps to { data: [...items], total, page, limit }
            const response = await apiClient.transactions.getAll(page, limit, status, search);
            // For paginated responses, items are in response.data
            const itemsData = response.data || [];

            const transactions: Transaction[] = itemsData.map((t: TransactionResponseDto) => {
                if (t.transactionType === 'admin_adjustment') {
                    return {
                        id: t.id,
                        user: t.user,
                        userId: t.userId,
                        amount: t.amount,
                        date: t.date,
                        transactionType: 'admin_adjustment',
                        adjustmentType: t.adjustmentType,
                        reason: t.reason,
                        balanceBefore: t.balanceBefore,
                        balanceAfter: t.balanceAfter,
                        description: t.description,
                        metadata: t.metadata,
                    } as AdminAdjustmentTransaction;
                } else {
                    return {
                        id: t.id,
                        user: t.user,
                        userId: t.userId,
                        amount: t.amount,
                        currency: t.currency || 'USD',
                        method: t.method || 'Unknown',
                        status: t.status as 'paid' | 'unpaid',
                        date: t.date,
                        transactionType: 'payment',
                        userNote: t.userNote,
                        proofImageUrl: t.proofImageUrl,
                        verificationNote: t.verificationNote,
                    } as PaymentTransaction;
                }
            });
            return {
                data: transactions,
                total: response.total || 0,
                page: response.page || 1,
                limit: response.limit || 10,
            };
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
            throw error;
        }
    }

    async fetchTransactionById(id: number): Promise<Transaction | null> {
        try {
            // API returns { success: true, data: { id, user, userId, ... } }
            // request function automatically unwraps to { id, user, userId, ... }
            const response = await apiClient.transactions.getById(id);
            
            if (response.transactionType === 'admin_adjustment') {
                return {
                    id: response.id,
                    user: response.user,
                    userId: response.userId,
                    amount: response.amount,
                    date: response.date,
                    transactionType: 'admin_adjustment',
                    adjustmentType: response.adjustmentType,
                    reason: response.reason,
                    balanceBefore: response.balanceBefore,
                    balanceAfter: response.balanceAfter,
                    description: response.description,
                    metadata: response.metadata,
                } as AdminAdjustmentTransaction;
            } else {
                return {
                    id: response.id,
                    user: response.user,
                    userId: response.userId,
                    amount: response.amount,
                    currency: response.currency || 'USD',
                    method: response.method || 'Unknown',
                    status: response.status as 'paid' | 'unpaid',
                    date: response.date,
                    transactionType: 'payment',
                    userNote: response.userNote,
                    proofImageUrl: response.proofImageUrl,
                    verificationNote: response.verificationNote,
                } as PaymentTransaction;
            }
        } catch (error) {
            console.error(`Failed to fetch transaction ${id}:`, error);
            return null;
        }
    }

    async verifyTransaction(id: number, verificationNote?: string): Promise<any> {
        try {
            // API returns { success: true, data: { message: "..." } }
            // request function automatically unwraps to { message: "..." }
            const response = await apiClient.transactions.markAsPaid(id, verificationNote);
            return response;
        } catch (error) {
            console.error(`Failed to verify transaction ${id}:`, error);
            throw error;
        }
    }

    async failTransaction(id: number, reason: string = 'Rejected by admin', note?: string): Promise<any> {
        try {
            // API returns { success: true, data: { message: "..." } }
            // request function automatically unwraps to { message: "..." }
            const response = await apiClient.transactions.reject(id, reason, note);
            return response;
        } catch (error) {
            console.error(`Failed to reject transaction ${id}:`, error);
            throw error;
        }
    }

    async verifyByHash(transactionHash: string, amount: number, userId: number): Promise<any> {
        try {
            // API returns { success: true, data: { message: "..." } }
            // request function automatically unwraps to { message: "..." }
            const response = await apiClient.transactions.verifyByHash(transactionHash, amount, userId);
            return response;
        } catch (error) {
            console.error('Failed to verify transaction by hash:', error);
            throw error;
        }
    }
}

export const transactionService = new TransactionService();

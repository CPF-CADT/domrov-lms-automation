/**
 * Admin Users API Types
 * Matches backend DTOs: UserListResponseDto, UserDetailDto, AddCreditsResponseDto, etc.
 */

export interface UserListItemDto {
  id: number;
  firstName: string;
  lastName: string | null;
  gender: string | null;
  dob: string | null;
  email: string;
  phoneNumber: string | null;
  profilePictureUrl: string | null;
  isVerified: boolean;
  status: 'active' | 'inactive' | 'banned' | 'ACTIVE' | 'INACTIVE' | 'BANNED';
  role: 'user' | 'admin' | 'superadmin' | 'User' | 'Admin' | 'SuperAdmin';
  credits: number;
  joinDate: string;
  lastActivity: string;
  totalPurchased: number;
}

export interface UserListResponseDto {
  data: UserListItemDto[];
  total: number;
  page: number;
  limit: number;
  filtered: boolean;
}

export interface PurchasedPackageDto {
  packageId: number | null;
  packageName: string;
  credits: number;
  bonusCredits: number;
  price: number;
  currency: string;
  purchaseDate: string;
  paymentStatus: string;
}

export interface DetailedTransactionDto {
  id: number;
  amount: number;
  reason: string;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  date: string;
}

export interface RecentTransactionDto {
  id: string | number;
  amount: number;
  date: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
}

export interface UserDetailDto {
  id: number;
  firstName: string;
  lastName: string | null;
  gender: string | null;
  dob: string | null;
  email: string;
  phoneNumber: string | null;
  profilePictureUrl: string | null;
  isVerified: boolean;
  status: 'active' | 'inactive' | 'banned' | 'ACTIVE' | 'INACTIVE' | 'BANNED';
  role: 'user' | 'admin' | 'superadmin' | 'User' | 'Admin' | 'SuperAdmin';
  credits: number;
  joinDate: string;
  lastActivity: string;
  totalSpent: number;
  totalPurchased?: number;
  purchasedPackages: PurchasedPackageDto[];
  recentTransactions: DetailedTransactionDto[];
}

export interface AddCreditsResponseDto {
  userId: string | number;
  previousBalance: number;
  newBalance: number;
  transactionId: string;
  timestamp: string;
}

// Re-export from admin-wallet.ts for user credit operations
export type { UserCreditReason } from './admin-wallet';
export type { AddUserCreditsDto, DeductUserCreditsDto } from './admin-wallet';

export interface ToggleUserStatusDto {
  status: 'active' | 'inactive' | 'banned';
  reason?: string;
}

export interface UserStatusChangeDto {
  id: number;
  status: string;
  reason: string | null;
  updatedAt: string;
}

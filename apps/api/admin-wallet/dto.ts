// /api/admin-wallet/dto.ts

export interface CreatePackageDto {
  name: string;
  credits: number;
  price: number;
  currency: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdatePackageDto {
  name?: string;
  credits?: number;
  price?: number;
  currency?: string;
  description?: string;
  isActive?: boolean;
}

export interface PackageResponseDto {
  id: number;
  name: string;
  credits: number;
  price: number;
  currency: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeletePackageResponseDto {
  message: string;
  packageId: number;
}

export interface AdjustWalletDto {
  userId: number;
  credits: number;
  reason: string;
  description?: string;
}

export interface AdjustWalletResponseDto {
  message: string;
  userId: number;
  creditsBefore: number;
  creditsAfter: number;
  transactionId: number;
}

export interface AdminWalletResponseDto {
  totalPackagesSold: number;
  totalRevenueUSD: number;
  totalCreditsIssued: number;
  totalUsersWithWallet: number;
  createdAt: Date;
}

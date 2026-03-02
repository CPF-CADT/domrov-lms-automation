// /api/admin-wallet/admin-wallet.api.ts
import axiosInstance from '../axios';
import {
  CreatePackageDto,
  PackageResponseDto,
  UpdatePackageDto,
  DeletePackageResponseDto,
  AdjustWalletDto,
  AdjustWalletResponseDto,
  AdminWalletResponseDto
} from './dto';

/**
 * Create a new credit package (admin only)
 */
export async function createPackage(data: CreatePackageDto): Promise<PackageResponseDto> {
  try {
    const response = await axiosInstance.post<PackageResponseDto>(`/admin-wallet/packages`, data);
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
 * Get all credit packages (admin only)
 */
export async function getAllPackages(): Promise<PackageResponseDto[]> {
  try {
    const response = await axiosInstance.get<PackageResponseDto[]>(`/admin-wallet/packages`);
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
 * Update a credit package (admin only)
 */
export async function updatePackage(packageId: number, data: UpdatePackageDto): Promise<PackageResponseDto> {
  try {
    const response = await axiosInstance.patch<PackageResponseDto>(
      `/admin-wallet/packages/${packageId}`,
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
 * Delete a credit package (admin only)
 */
export async function deletePackage(packageId: number): Promise<DeletePackageResponseDto> {
  try {
    const response = await axiosInstance.delete<DeletePackageResponseDto>(
      `/admin-wallet/packages/${packageId}`
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
 * Add credits to user wallet (admin only)
 */
export async function addCreditsToWallet(userId: number, data: AdjustWalletDto): Promise<AdjustWalletResponseDto> {
  try {
    const response = await axiosInstance.post<AdjustWalletResponseDto>(
      `/admin-wallet/adjust-wallet/${userId}`,
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
 * Deduct credits from user wallet (admin only)
 */
export async function deductCreditsFromWallet(userId: number, data: AdjustWalletDto): Promise<AdjustWalletResponseDto> {
  try {
    const response = await axiosInstance.patch<AdjustWalletResponseDto>(
      `/admin-wallet/deduct/${userId}`,
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
 * Get wallet details (admin only)
 */
export async function getAdminWalletDetails(userId: number): Promise<AdminWalletResponseDto> {
  try {
    const response = await axiosInstance.get<AdminWalletResponseDto>(
      `/admin-wallet/${userId}`
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

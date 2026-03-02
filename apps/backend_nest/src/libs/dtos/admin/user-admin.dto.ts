import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsEnum, IsOptional } from 'class-validator';

export enum CreditReason {
  BONUS = 'bonus',
  REFUND = 'refund',
  PROMO = 'promo',
  OTHER = 'other',
}

export enum DeductReason {
  REFUND = 'refund',
  ADJUSTMENT = 'adjustment',
  CHARGEBACK = 'chargeback',
  OTHER = 'other',
}

export class AddCreditsDto {
  @ApiProperty({ example: 100, description: 'Amount of credits to add' })
  @IsNumber()
  amount: number;

  @ApiProperty({
    example: 'bonus',
    enum: CreditReason,
    description: 'Reason for adding credits',
  })
  @IsEnum(CreditReason)
  reason: CreditReason;

  @ApiProperty({ example: 'Monthly promotion bonus', description: 'Admin note' })
  @IsString()
  @IsOptional()
  adminNote?: string;
}

export class DeductCreditsDto {
  @ApiProperty({ example: 50, description: 'Amount of credits to deduct' })
  @IsNumber()
  amount: number;

  @ApiProperty({
    example: 'refund',
    enum: DeductReason,
    description: 'Reason for deducting credits',
  })
  @IsEnum(DeductReason)
  reason: DeductReason;

  @ApiProperty({ example: 'Customer requested refund', description: 'Admin note' })
  @IsString()
  @IsOptional()
  adminNote?: string;
}

export class AddCreditsResponseDto {
  @ApiProperty({ example: 1, description: 'User ID' })
  userId: number;

  @ApiProperty({ example: 500, description: 'Balance before adjustment' })
  previousBalance: number;

  @ApiProperty({ example: 600, description: 'Balance after adjustment' })
  newBalance: number;

  @ApiProperty({ example: 5, description: 'Transaction ID' })
  transactionId: number;

  @ApiProperty({ example: '2026-03-01T10:30:00Z', description: 'Timestamp' })
  timestamp: string;
}

export class ToggleUserStatusDto {
  @ApiProperty({
    example: 'active',
    enum: ['active', 'inactive'],
    description: 'New user status',
  })
  @IsEnum(['active', 'inactive'])
  status: string;

  @ApiProperty({ example: 'Account deactivation', description: 'Reason for status change' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class UserListResponseDto {
  @ApiProperty({
    type: 'object',
    properties: {
      id: { type: 'number' },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      gender: { type: 'string' },
      dob: { type: 'string' },
      email: { type: 'string' },
      phoneNumber: { type: 'string' },
      profilePictureUrl: { type: 'string' },
      isVerified: { type: 'boolean' },
      status: { type: 'string' },
      role: { type: 'string' },
      credits: { type: 'number' },
      joinDate: { type: 'string' },
      lastActivity: { type: 'string' },
      totalPurchased: { type: 'number' },
    },
  })
  data: any[];

  @ApiProperty({ example: 1500, description: 'Total users' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page' })
  page: number;

  @ApiProperty({ example: 10, description: 'Items per page' })
  limit: number;

  @ApiProperty({ example: true, description: 'Whether any filters were applied' })
  filtered?: boolean;
}

export class PurchasedPackageDto {
  @ApiProperty({ example: 1 })
  packageId: number;

  @ApiProperty({ example: 'Premium Pack' })
  packageName: string;

  @ApiProperty({ example: 500 })
  credits: number;

  @ApiProperty({ example: 50 })
  bonusCredits: number;

  @ApiProperty({ example: 39.99 })
  price: number;

  @ApiProperty({ example: 'USD' })
  currency: string;

  @ApiProperty({ example: '2026-03-01T10:30:00Z' })
  purchaseDate: string;

  @ApiProperty({ example: 'COMPLETED', enum: ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'] })
  paymentStatus: string;
}

export class DetailedTransactionDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 100 })
  amount: number;

  @ApiProperty({ example: 'Payment', enum: ['Payment', 'Bonus', 'Refund', 'Adjustment', 'AI Usage'] })
  reason: string;

  @ApiProperty({ example: 500 })
  balanceBefore: number;

  @ApiProperty({ example: 600 })
  balanceAfter: number;

  @ApiProperty({ example: 'Admin added 100 credits - bonus' })
  description: string;

  @ApiProperty({ example: '2026-03-01T10:30:00Z' })
  date: string;
}

export class UserDetailDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName?: string;

  @ApiProperty({ example: 'M' })
  gender?: string;

  @ApiProperty({ example: '1990-05-15' })
  dob?: string;

  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @ApiProperty({ example: '+855 92 123 4567' })
  phoneNumber?: string;

  @ApiProperty({ example: 'https://example.com/profile.jpg' })
  profilePictureUrl?: string;

  @ApiProperty({ example: true })
  isVerified: boolean;

  @ApiProperty({ example: 'active' })
  status: string;

  @ApiProperty({ example: 'user' })
  role: string;

  @ApiProperty({ example: 500 })
  credits: number;

  @ApiProperty({ example: '2026-01-15T00:00:00Z' })
  joinDate: string;

  @ApiProperty({ example: '2026-03-01T10:00:00Z' })
  lastActivity: string;

  @ApiProperty({ example: 500.0 })
  totalSpent: number;

  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        packageId: { type: 'number', example: 1 },
        packageName: { type: 'string', example: 'Premium Pack' },
        credits: { type: 'number', example: 500 },
        bonusCredits: { type: 'number', example: 50 },
        price: { type: 'number', example: 39.99 },
        currency: { type: 'string', example: 'USD' },
        purchaseDate: { type: 'string', example: '2026-03-01T10:30:00Z' },
        paymentStatus: { type: 'string', example: 'COMPLETED' },
      },
    },
    description: 'Purchased credit packages',
  })
  purchasedPackages: PurchasedPackageDto[];

  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        amount: { type: 'number', example: 100 },
        reason: { type: 'string', example: 'Payment' },
        balanceBefore: { type: 'number', example: 500 },
        balanceAfter: { type: 'number', example: 600 },
        description: { type: 'string' },
        date: { type: 'string', example: '2026-03-01T10:30:00Z' },
      },
    },
    description: 'All credit transactions: payments, bonuses, refunds, and admin adjustments',
  })
  recentTransactions: DetailedTransactionDto[];
}

export class UserTableItemDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'https://cdn.example.com/avatar.jpg', description: 'Avatar URL' })
  avatar: string;

  @ApiProperty({ example: 'John Doe', description: 'Full name' })
  name: string;

  @ApiProperty({ example: 'john@example.com', description: 'Email address' })
  email: string;

  @ApiProperty({ example: 'user', enum: ['user', 'instructor', 'superadmin'], description: 'User role' })
  role: string;

  @ApiProperty({ example: 500, description: 'Credit balance' })
  balance: number;

  @ApiProperty({ example: 'active', enum: ['active', 'inactive', 'suspended'], description: 'User status' })
  status: string;

  @ApiProperty({ example: '2026-01-15T10:30:00Z', description: 'Account creation date' })
  created: string;
}

export class UserListTableResponseDto {
  @ApiProperty({
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        avatar: { type: 'string', example: 'https://ui-avatars.com/api/?name=John' },
        name: { type: 'string', example: 'John Doe' },
        email: { type: 'string', example: 'john@example.com' },
        role: { type: 'string', example: 'user' },
        balance: { type: 'number', example: 500 },
        status: { type: 'string', example: 'active' },
        created: { type: 'string', example: '2026-01-15T10:30:00Z' },
      },
    },
    description: 'List of users for table display',
  })
  data: UserTableItemDto[];

  @ApiProperty({ example: 150, description: 'Total number of users' })
  total: number;

  @ApiProperty({ example: 1, description: 'Current page' })
  page: number;

  @ApiProperty({ example: 10, description: 'Items per page' })
  limit: number;

  @ApiProperty({ example: 15, description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ example: 150, description: 'Total number of matching records' })
  totalRecords: number;
}

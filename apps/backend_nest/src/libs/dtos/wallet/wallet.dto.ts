import {
    IsNumber,
    IsEnum,
    IsOptional,
    IsString,
    Min,
    IsBoolean,
    IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionReason, TransactionType } from '../../entities/ai/wallet-transaction.entity';
import { Currency } from '../../enums/Payment';

export class AddCreditsDto {
    @ApiProperty({ example: 50.00, description: 'Amount of credits to add', minimum: 0.01 })
    @IsNumber()
    @Min(0.01)
    amount: number; // matches entity type (float)

    @ApiProperty({
        enum: TransactionReason,
        example: 'PURCHASE',
        description: 'Reason for adding credits',
    })
    @IsEnum(TransactionReason)
    reason: TransactionReason;

    @ApiPropertyOptional({ example: 'Credits added via purchase', description: 'Optional description' })
    @IsOptional()
    @IsString()
    description?: string;
}

export class DeductCreditsDto {
    @ApiProperty({ example: 10.00, description: 'Amount of credits to deduct', minimum: 0.01 })
    @IsNumber()
    @Min(0.01)
    amount: number; // matches entity type (float)

    @ApiProperty({
        enum: TransactionReason,
        example: 'AI_USAGE',
        description: 'Reason for deduction',
    })
    @IsEnum(TransactionReason)
    reason: TransactionReason;

    @ApiPropertyOptional({ example: 'AI evaluation usage', description: 'Optional description' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ example: { evaluationId: 123 }, description: 'Additional metadata' })
    @IsOptional()
    metadata?: Record<string, any>;
}

export class WalletBalanceResponseDto {
    @ApiProperty({ example: 1, description: 'User unique identifier' })
    userId: number;

    @ApiProperty({ example: 150.50, description: 'Current credit balance' })
    creditBalance: number; // matches entity type (float)
}

export class TransactionHistoryQueryDto {
    @ApiPropertyOptional({ example: 1, default: 1, description: 'Page number' })
    @IsOptional()
    page?: number = 1;

    @ApiPropertyOptional({ example: 10, default: 10, description: 'Items per page' })
    @IsOptional()
    limit?: number = 10;
}

export class WalletTransactionDto {
    @ApiProperty({ example: 1, description: 'Unique identifier of the transaction' })
    id: number;

    @ApiProperty({ example: 1, description: 'Wallet ID associated with the transaction' })
    walletId: number;

    @ApiProperty({ example: 50.00, description: 'Transaction amount' })
    amount: number;

    @ApiProperty({ enum: TransactionType, example: 'credit', description: 'Type of transaction' })
    type: TransactionType;

    @ApiPropertyOptional({ enum: TransactionReason, example: 'purchase', description: 'Reason for the transaction' })
    reason?: TransactionReason;

    @ApiPropertyOptional({ example: 100.00, description: 'Balance before transaction' })
    balanceBefore?: number;

    @ApiProperty({ example: 150.00, description: 'Balance after transaction' })
    balanceAfter: number;

    @ApiPropertyOptional({ example: 'Added 50 credits via purchase', description: 'Transaction description' })
    description?: string;

    @ApiPropertyOptional({ example: { evaluationId: 123 }, description: 'Additional metadata' })
    metadata?: Record<string, any>;

    @ApiProperty({ example: '2024-01-15T10:30:00Z', description: 'Transaction timestamp' })
    created_at: Date;
}

export class TransactionHistoryMetaDto {
    @ApiProperty({ example: 100, description: 'Total number of transactions' })
    total: number;

    @ApiProperty({ example: 1, description: 'Current page number' })
    page: number;

    @ApiProperty({ example: 10, description: 'Items per page' })
    limit: number;

    @ApiProperty({ example: 10, description: 'Total number of pages' })
    totalPages: number;
}

export class TransactionHistoryResponseDto {
    @ApiProperty({ type: [WalletTransactionDto], description: 'List of transactions' })
    data: WalletTransactionDto[];

    @ApiProperty({ type: TransactionHistoryMetaDto, description: 'Pagination metadata' })
    meta: TransactionHistoryMetaDto;
}

export class CreateCreditPackageDto {
    @ApiProperty({ example: 'Premium Pack', description: 'Name of the credit package' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ example: 'Best value for power users', description: 'Description of the package' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ example: 500, description: 'Number of credits in package' })
    @IsNumber()
    credits: number; // float

    @ApiProperty({ example: 39.99, description: 'Price of the package' })
    @IsNumber()
    price: number; // float

    @ApiPropertyOptional({ example: 'USD', default: Currency.USD, description: 'Currency for the price' })
    @IsOptional()
    @IsString()
    currency?: Currency;

    @ApiPropertyOptional({ example: 50, description: 'Bonus credits included' })
    @IsOptional()
    @IsNumber()
    bonusCredits?: number; // float

    @ApiPropertyOptional({ example: 1, description: 'Display order' })
    @IsOptional()
    @IsInt()
    sortOrder?: number;

    @ApiPropertyOptional({ example: true, description: 'Active status', default: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

export class UpdateCreditPackageDto {
    @ApiPropertyOptional({ example: 'Updated Premium Pack', description: 'Name of the credit package' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ example: 'Updated description', description: 'Description of the package' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ example: 600, description: 'Number of credits in package' })
    @IsOptional()
    @IsNumber()
    credits?: number; // float

    @ApiPropertyOptional({ example: 49.99, description: 'Price of the package' })
    @IsOptional()
    @IsNumber()
    price?: number; // float

    @ApiPropertyOptional({ example: 'USD', description: 'Currency for the price' })
    @IsOptional()
    @IsString()
    currency?: string;

    @ApiPropertyOptional({ example: 75, description: 'Bonus credits included' })
    @IsOptional()
    @IsNumber()
    bonusCredits?: number; // float

    @ApiPropertyOptional({ example: 2, description: 'Display order' })
    @IsOptional()
    @IsInt()
    sortOrder?: number;

    @ApiPropertyOptional({ example: true, description: 'Active status' })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
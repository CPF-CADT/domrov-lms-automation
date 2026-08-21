import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransactionType, TransactionReason } from '../../entities/ai/wallet-transaction.entity';

export class WalletTransactionResponseDto {
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
    @ApiProperty({ type: [WalletTransactionResponseDto], description: 'List of transactions' })
    data: WalletTransactionResponseDto[];

    @ApiProperty({ type: TransactionHistoryMetaDto, description: 'Pagination metadata' })
    meta: TransactionHistoryMetaDto;
}

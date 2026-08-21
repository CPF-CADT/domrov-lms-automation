import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsEnum, IsNotEmpty } from 'class-validator';
import { TransactionReason, TransactionType } from '../../entities/ai/wallet-transaction.entity';

export class AdminAdjustWalletDTO {
    @ApiProperty({ example: 1, description: 'User ID to adjust wallet for' })
    @IsNumber()
    userId: number;

    @ApiProperty({ example: 50, description: 'Amount to adjust (positive to add, negative to deduct)' })
    @IsNumber()
    amount: number; // Positive to add, Negative to deduct

    @ApiProperty({ enum: TransactionType, example: 'CREDIT', description: 'Transaction type' })
    @IsEnum(TransactionType)
    type: TransactionType;

    @ApiProperty({ enum: TransactionReason, example: 'ADMIN_ADJUSTMENT', description: 'Reason for the adjustment' })
    @IsEnum(TransactionReason)
    reason: TransactionReason;

    @ApiProperty({ example: 'Bonus credits for early adopter', description: 'Description of the adjustment' })
    @IsString()
    @IsNotEmpty()
    description: string;
}
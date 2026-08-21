import { ApiProperty } from '@nestjs/swagger';

export class AdminAdjustWalletResponseDto {
    @ApiProperty({ example: 1, description: 'Wallet ID' })
    id: number;

    @ApiProperty({ example: 150.50, description: 'Updated credit balance' })
    creditBalance: number;

    @ApiProperty({ example: '2024-01-15T10:30:00Z', description: 'Last update timestamp' })
    updated_at: Date;
}

export class AdminDeductResponseDto {
    @ApiProperty({ example: true, description: 'Whether the deduction was successful' })
    success: boolean;
}

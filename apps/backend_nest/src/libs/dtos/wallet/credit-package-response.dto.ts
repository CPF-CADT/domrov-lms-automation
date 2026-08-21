import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '../../enums/Payment';

export class CreditPackageResponseDto {
    @ApiProperty({ example: 1, description: 'Unique identifier of the credit package' })
    id: number;

    @ApiProperty({ example: 'Premium Pack', description: 'Name of the credit package' })
    name: string;

    @ApiPropertyOptional({ example: 'Best value for power users', description: 'Description of the package' })
    description?: string;

    @ApiProperty({ example: 500, description: 'Number of credits in the package' })
    credits: number;

    @ApiProperty({ example: 50, description: 'Bonus credits included' })
    bonusCredits: number;

    @ApiProperty({ example: 39.99, description: 'Price of the package' })
    price: number;

    @ApiProperty({ enum: Currency, example: 'USD', description: 'Currency for the price' })
    currency: Currency;

    @ApiProperty({ example: 10, description: 'Discount percentage' })
    discountInPercent: number;

    @ApiProperty({ example: true, description: 'Whether the package is active' })
    isActive: boolean;

    @ApiPropertyOptional({ example: 1, description: 'Display order' })
    sortOrder?: number;

    @ApiProperty({ example: '2024-01-15T10:30:00Z', description: 'Creation timestamp' })
    created_at: Date;

    @ApiProperty({ example: '2024-01-15T10:30:00Z', description: 'Last update timestamp' })
    updated_at: Date;
}

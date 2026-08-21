import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, Min, IsBoolean } from 'class-validator';
import { Currency } from '../../enums/Payment';

export class CreateTokenPackageDTO {
    @ApiProperty({ example: 'Starter Pack', description: 'Name of the token package' })
    @IsString()
    name: string;

    @ApiProperty({ example: 100, description: 'Number of tokens in the package' })
    @IsNumber()
    @Min(1)
    tokenAmount: number;

    @ApiProperty({ example: 9.99, description: 'Price of the package' })
    @IsNumber()
    @Min(0)
    price: number;

    @ApiPropertyOptional({ example: 10, default: 0, description: 'Bonus tokens included' })
    @IsOptional()
    @IsNumber()
    bonusTokenAmount?: number;

    @ApiProperty({ enum: Currency, example: 'USD', default: Currency.USD, description: 'Currency for the price' })
    @IsEnum(Currency)
    currency: Currency;
}
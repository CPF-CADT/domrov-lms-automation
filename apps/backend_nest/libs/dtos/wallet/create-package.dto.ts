import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum, Min, IsBoolean } from 'class-validator';
import { Currency } from '../../enums/Payment';

export class CreateTokenPackageDTO {
    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty()
    @IsNumber()
    @Min(1)
    tokenAmount: number;

    @ApiProperty()
    @IsNumber()
    @Min(0)
    price: number;

    @ApiPropertyOptional({ default: 0 })
    @IsOptional()
    @IsNumber()
    bonusTokenAmount?: number;

    @ApiProperty({ enum: Currency, default: Currency.USD })
    @IsEnum(Currency)
    currency: Currency;
}
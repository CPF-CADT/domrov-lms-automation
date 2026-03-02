import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, Length, Min } from 'class-validator';

enum Currency {
    USD = 'USD',
    KHR = 'KHR',
}

export class CheckTransactionByHashDto {
    @ApiProperty({
        example: 1,
        description: 'User ID',
    })
    @IsNumber()
    userId: number;

    @ApiProperty({
        example: '8465d722',
        description: '8 characters transaction hash',
        minLength: 8,
        maxLength: 8,
    })
    @IsString()
    @Length(8, 8, { message: 'Hash must be exactly 8 characters' })
    hash: string;

    @ApiProperty({
        example: 1.0,
        description: 'Transaction amount (can be int or float)',
    })
    @IsNumber()
    @Min(0, { message: 'Amount must be greater than 0' })
    amount: number;

    @ApiProperty({
        example: 'USD',
        description: 'Transaction currency',
        enum: Currency,
    })
    @IsEnum(Currency, { message: 'Currency must be either USD or KHR' })
    currency: Currency;
}

export class TransactionDataDto {
    @ApiProperty({ example: '8465d722d7d5065f2886f0a474a4d34dc6a7855355b611836f7b6111228893e9' })
    hash: string;

    @ApiProperty({ example: 'rieu_dhqj_1984@devb' })
    fromAccountId: string;

    @ApiProperty({ example: 'bridge_account@devb' })
    toAccountId: string;

    @ApiProperty({ example: 'USD' })
    currency: string;

    @ApiProperty({ example: 1.0 })
    amount: number;

    @ApiProperty({ example: 'testing bakong generator' })
    description: string;

    @ApiProperty({ example: 1586852120700.0 })
    createdDateMs: number;

    @ApiProperty({ example: 1586852123544.0 })
    acknowledgedDateMs: number;

    @ApiProperty({ required: false, nullable: true })
    trackingStatus?: string;

    @ApiProperty({ required: false, nullable: true })
    receiverBank?: string;

    @ApiProperty({ required: false, nullable: true })
    receiverBankAccount?: string;
}

export class CheckTransactionResponseDto {
    @ApiProperty({ example: 0, description: 'Response code: 0 for success, 1 for failure' })
    responseCode: number;

    @ApiProperty({ example: 'Getting transaction successfully.' })
    responseMessage: string;

    @ApiProperty({ type: TransactionDataDto, required: false, nullable: true })
    data?: TransactionDataDto;

    @ApiProperty({ required: false, nullable: true })
    errorCode?: number;
}

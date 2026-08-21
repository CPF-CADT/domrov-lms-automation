import { ApiProperty } from '@nestjs/swagger';

export class StartPaymentResponseDto {
    @ApiProperty({ example: 1, description: 'Unique identifier of the payment' })
    paymentId: number;

    @ApiProperty({ example: 'Payment initiated', description: 'Status message' })
    message: string;
}

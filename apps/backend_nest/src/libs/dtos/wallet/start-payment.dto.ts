// Create this in a file like 'start-payment.dto.ts' or keep it in the controller file
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty } from 'class-validator';

export class StartPaymentDto {
  @ApiProperty({ example: 1, description: 'The ID of the Token Package to buy' })
  @IsNotEmpty()
  @IsNumber()
  packageId: number;
}
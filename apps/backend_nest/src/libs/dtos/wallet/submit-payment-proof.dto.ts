import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, Length, IsUrl, Min } from 'class-validator';

export class SubmitPaymentProofDto {
  @ApiProperty({
    example: '208212f0',
    description: 'Bakong transaction hash (exactly 8 characters)',
    minLength: 8,
    maxLength: 8,
  })
  @IsString({ message: 'Payment hash must be a string' })
  @Length(8, 8, { message: 'Payment hash must be exactly 8 characters' })
  paymentHash: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/xxx/image/upload/receipt.jpg',
    description: 'Cloudinary URL of the payment proof image',
  })
  @IsUrl({}, { message: 'Image URL must be a valid URL' })
  imageUrl: string;

  @ApiProperty({
    example: 3,
    description: 'ID of the credit package user purchased',
  })
  @IsNumber({}, { message: 'Package ID must be a number' })
  @Min(1, { message: 'Package ID must be a positive number' })
  packageId: number;
}

export class SubmitPaymentProofResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Payment transaction ID',
  })
  transactionId: number;

  @ApiProperty({
    example: 'Payment verified and credits applied',
    description: 'Success message',
  })
  message: string;

  @ApiProperty({
    example: 50,
    description: 'Total credits applied to wallet',
  })
  creditsApplied: number;
}

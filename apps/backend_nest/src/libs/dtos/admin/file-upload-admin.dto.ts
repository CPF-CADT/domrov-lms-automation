import { ApiProperty } from '@nestjs/swagger';

export class FileUploadResponseDto {
  @ApiProperty({ example: 'TX-9814', description: 'Transaction ID' })
  transactionId: string;

  @ApiProperty({
    example: 'https://example.com/uploads/TX-9814-proof.jpg',
    description: 'URL of uploaded proof image',
  })
  proofImageUrl: string;

  @ApiProperty({ example: '2026-03-01T10:30:00Z', description: 'Upload timestamp' })
  uploadedAt: string;
}

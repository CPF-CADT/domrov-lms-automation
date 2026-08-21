import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class NotifyUploadDto {
  @ApiProperty({ description: 'The key of the uploaded file', example: '123/module/456/file.pdf' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ description: 'The filename of the uploaded file', example: 'file.pdf' })
  @IsString()
  @IsNotEmpty()
  filename: string;
}

export class PresignedUrlResponseDto {
  @ApiProperty({ description: 'Presigned URL for uploading the file', example: 'https://example.r2.com/presigned-url' })
  presignedUrl: string;

  @ApiProperty({ description: 'The key for the file', example: '123/module/456/file.pdf' })
  key: string;
}

export class NotifyUploadResponseDto {
  @ApiProperty({ description: 'Success message', example: 'Resource saved successfully' })
  message: string;

  @ApiProperty({ type: Number, description: 'ID of the created resource', example: 123 })
  resourceId?: number;
}
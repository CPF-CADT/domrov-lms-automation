import { ApiProperty } from '@nestjs/swagger';

export class AuthMessageResponseDto {
    @ApiProperty({ example: 'success', description: 'Status of the operation' })
    status: string;

    @ApiProperty({ example: 'Operation completed successfully', description: 'Response message' })
    message: string;
}

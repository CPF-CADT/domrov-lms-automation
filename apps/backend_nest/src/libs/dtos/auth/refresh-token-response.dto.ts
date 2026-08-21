import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenResponseDto {
    @ApiProperty({ example: 'success', description: 'Status of the operation' })
    status: string;

    @ApiProperty({ 
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', 
        description: 'New JWT access token' 
    })
    accessToken: string;

    @ApiProperty({ example: 1708704000, description: 'Unix timestamp when the token was issued' })
    issuedAt: number;
}

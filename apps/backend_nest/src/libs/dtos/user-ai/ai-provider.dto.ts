// dto/ai-provider.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class AIProviderDto {
    @ApiProperty({ description: 'AI provider identifier' })
    provider: string;

    @ApiProperty({ description: 'Description of the AI provider' })
    description: string;
}   

export class ApiResponse<T> {
    @ApiProperty({ description: 'Indicates if request was successful' })
    success: boolean;

    @ApiProperty({ description: 'Response data', type: Object })
    data: T;
}
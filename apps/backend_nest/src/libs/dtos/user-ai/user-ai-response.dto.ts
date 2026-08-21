import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserAIKeyResponseDto {
    @ApiProperty({ example: 1, description: 'Unique identifier for the AI key' })
    id: number;

    @ApiProperty({ example: 101, description: 'User ID who owns this key' })
    userId: number;

    @ApiProperty({ example: 'openai', description: 'AI provider name' })
    provider: string;

    @ApiPropertyOptional({ example: 'gpt-4', description: 'Preferred model' })
    model?: string;

    @ApiProperty({ example: true, description: 'Whether the key is active' })
    isActive: boolean;

    @ApiProperty({ example: true, description: 'Whether the key is valid' })
    isValid: boolean;

    @ApiPropertyOptional({ example: 'My OpenAI Key', description: 'Label for the key' })
    label?: string;

    @ApiProperty({ example: '2026-03-01T10:00:00Z', description: 'Creation timestamp' })
    createdAt: Date;

    @ApiProperty({ example: '2026-03-01T10:00:00Z', description: 'Last update timestamp' })
    updatedAt: Date;
}

export class AIUsageLogResponseDto {
    @ApiProperty({ example: 1, description: 'Unique identifier for the usage log' })
    id: number;

    @ApiProperty({ example: 'AI Evaluation - Submission 123', description: 'Title of the usage' })
    title: string;

    @ApiProperty({ example: '2026-03-01T10:00:00Z', description: 'Date when the AI was used' })
    usingDate: Date;

    @ApiProperty({ example: 150, description: 'Number of input tokens used' })
    inputTokenCount: number;

    @ApiProperty({ example: 200, description: 'Number of output tokens used' })
    outputTokenCount: number;

    @ApiProperty({ example: 101, description: 'User ID' })
    userId: number;

    @ApiPropertyOptional({ example: 1, description: 'AI key ID used' })
    userAiKeyId?: number;

    @ApiProperty({ example: '2026-03-01T10:00:00Z', description: 'Creation timestamp' })
    createdAt: Date;

    @ApiProperty({ example: '2026-03-01T10:00:00Z', description: 'Last update timestamp' })
    updatedAt: Date;
}
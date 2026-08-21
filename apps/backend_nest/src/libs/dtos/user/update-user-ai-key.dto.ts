import { IsString, IsOptional, IsBoolean, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import * as aiConnectionTestService from '../../../services/ai-connection-test.service';

export class UpdateUserAIKeyDto {
    @ApiPropertyOptional({
        description: 'Update model preference',
        example: 'gpt-4',
    })
    @IsOptional()
    @IsString()
    model?: string;

    @ApiProperty({
        description: 'AI provider name',
        example: 'openai',
        enum: aiConnectionTestService.AI_PROVIDERS, // swagger dropdown
    })
    @IsIn(aiConnectionTestService.AI_PROVIDERS) // runtime validation
    provider: aiConnectionTestService.AIProvider;

    @ApiPropertyOptional({
        description: 'Update API key (plaintext, will be re-encrypted)',
        example: 'sk-1234567890abcdef',
    })
    @IsOptional()
    @IsString()
    apiKey?: string;

    @ApiPropertyOptional({
        description: 'Update API endpoint',
        example: 'https://api.openai.com/v1',
    })
    @IsOptional()
    @IsString()
    apiEndpoint?: string;

    @ApiPropertyOptional({
        description: 'Update label for the key',
        example: 'Updated Key Label',
    })
    @IsOptional()
    @IsString()
    label?: string;

    @ApiPropertyOptional({
        description: 'Activate or deactivate the key',
        example: true,
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({
        description: 'Activate or deactivate the key',
        example: true,
    })
    @IsOptional()
    @IsBoolean()
    isValid?: boolean;
}
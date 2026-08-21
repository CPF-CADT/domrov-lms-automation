import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import * as aiConnectionTestService from '../../../services/ai-connection-test.service';

export class CreateUserAIKeyDto {
    @ApiProperty({
        description: 'AI provider name',
        example: 'openai',
        enum: aiConnectionTestService.AI_PROVIDERS, // swagger dropdown
    })
    @IsIn(aiConnectionTestService.AI_PROVIDERS) // runtime validation
    provider: aiConnectionTestService.AIProvider;


    @ApiPropertyOptional({ description: 'Optional model preference', example: 'gpt-4' })
    @IsOptional()
    @IsString()
    model?: string;

    @ApiProperty({ description: 'User API key (plaintext, will be encrypted)', example: 'sk-1234567890abcdef' })
    @IsString()
    apiKey: string;

    @ApiPropertyOptional({ description: 'Optional API endpoint', example: 'https://api.openai.com/v1' })
    @IsOptional()
    @IsString()
    apiEndpoint?: string;

    @ApiPropertyOptional({ description: 'Optional label for identifying this key', example: 'My OpenAI Key' })
    @IsOptional()
    @IsString()
    label?: string;
}
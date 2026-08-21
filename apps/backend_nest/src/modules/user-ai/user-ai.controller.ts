import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiResponse,
} from '@nestjs/swagger';
import { CreateUserAIKeyDto } from '../../libs/dtos/user/create-user-ai-key.dto';
import { UpdateUserAIKeyDto } from '../../libs/dtos/user/update-user-ai-key.dto';
import { UserAIKeyResponseDto, AIUsageLogResponseDto } from '../../libs/dtos/user-ai/user-ai-response.dto';
import { UserAIKey } from '../../libs/entities/ai/user-ai-key.entity';
import { AIUsageLog } from '../../libs/entities/ai/ai-usage-log.entity';
import { UserId } from '../../common/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserAiService } from './user-ai.service';
import { AIUsageLogService } from './ai-usage-log.service';
import { AIProviderDto } from '../../libs/dtos/user-ai/ai-provider.dto';

@ApiTags('User AI Keys & Usage Logs')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('user-ai')
export class UserAiController {
  constructor(
    private readonly userAIService: UserAiService,
    private readonly aiLogService: AIUsageLogService,
  ) { }

  // --------------------- AI Key CRUD ---------------------

  @Get('providers')
  @ApiOperation({ summary: 'Get list of AI providers with descriptions' })
  @ApiResponse({ status: 200, description: 'List of AI providers' })
  getAll() {
    const data:AIProviderDto[] = [
      { provider: 'openai', description: 'OpenAI GPT models' },
      { provider: 'gemini', description: 'Google Gemini AI models' },
      { provider: 'ollama', description: 'Ollama AI models' },
      { provider: 'openrouter', description: 'OpenRouter API models' },
      { provider: 'grok', description: 'Grok AI models' },
      { provider: 'custom', description: 'Custom AI provider' },
    ];
    return {
      success: true,
      data,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new AI key for the authenticated user' })
  @ApiBody({ type: CreateUserAIKeyDto, description: 'AI key creation payload' })
  @ApiCreatedResponse({
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          userId: 101,
          provider: 'OpenAI',
          model: 'gpt-4',
          isActive: true,
          isValid: true,
          label: 'My AI Key',
          createdAt: '2026-03-01T10:00:00Z',
          updatedAt: '2026-03-01T10:00:00Z',
        },
      },
    },
  })
  async create(
    @Body() createUserAIKeyDto: CreateUserAIKeyDto,
    @UserId() userId: number,
  ): Promise<{ success: true; data: UserAIKeyResponseDto }> {
    const entity = await this.userAIService.create(userId, createUserAIKeyDto);
    const data: UserAIKeyResponseDto = {
      id: entity.id,
      userId: entity.userId,
      provider: entity.provider,
      model: entity.model,
      isActive: entity.isActive,
      isValid: entity.isValid,
      label: entity.label,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    };
    return { success: true, data };
  }

  @Get()
  @ApiOperation({ summary: 'Get all AI keys of the authenticated user' })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 1,
            userId: 101,
            provider: 'OpenAI',
            model: 'gpt-4',
            isActive: true,
            isValid: true,
            label: 'My AI Key',
            createdAt: '2026-03-01T10:00:00Z',
            updatedAt: '2026-03-01T10:00:00Z',
          },
        ],
      },
    },
  })
  async findAll(@UserId() userId: number): Promise<{ success: true; data: UserAIKeyResponseDto[] }> {
    const entities = await this.userAIService.findAll(userId);
    const data = entities.map(entity => ({
      id: entity.id,
      userId: entity.userId,
      provider: entity.provider,
      model: entity.model,
      isActive: entity.isActive,
      isValid: entity.isValid,
      label: entity.label,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    }));
    return { success: true, data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single AI key by ID' })
  @ApiParam({ name: 'id', description: 'AI key ID', example: 1 })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          userId: 101,
          provider: 'OpenAI',
          model: 'gpt-4',
          isActive: true,
          isValid: true,
          label: 'My AI Key',
          createdAt: '2026-03-01T10:00:00Z',
          updatedAt: '2026-03-01T10:00:00Z',
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'User AI key not found' })
  async findOne(@Param('id', ParseIntPipe) id: number, @UserId() userId: number): Promise<{ success: true; data: UserAIKeyResponseDto }> {
    const entity = await this.userAIService.findOne(userId, id);
    const data: UserAIKeyResponseDto = {
      id: entity.id,
      userId: entity.userId,
      provider: entity.provider,
      model: entity.model,
      isActive: entity.isActive,
      isValid: entity.isValid,
      label: entity.label,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    };
    return { success: true, data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Partially update an existing AI key' })
  @ApiParam({ name: 'id', description: 'AI key ID', example: 1 })
  @ApiBody({ type: UpdateUserAIKeyDto, description: 'Fields to update for the AI key' })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: {
          id: 1,
          userId: 101,
          provider: 'OpenAI',
          model: 'gpt-4',
          isActive: true,
          isValid: true,
          label: 'My AI Key',
          createdAt: '2026-03-01T10:00:00Z',
          updatedAt: '2026-03-01T10:00:00Z',
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'User AI key not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserAIKeyDto: UpdateUserAIKeyDto,
    @UserId() userId: number,
  ): Promise<{ success: true; data: UserAIKeyResponseDto }> {
    const entity = await this.userAIService.update(userId, id, updateUserAIKeyDto);
    const data: UserAIKeyResponseDto = {
      id: entity.id,
      userId: entity.userId,
      provider: entity.provider,
      model: entity.model,
      isActive: entity.isActive,
      isValid: entity.isValid,
      label: entity.label,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    };
    return { success: true, data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an AI key' })
  @ApiParam({ name: 'id', description: 'AI key ID', example: 1 })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: {
          message: 'The AI key has been deleted',
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'User AI key not found' })
  async remove(@Param('id', ParseIntPipe) id: number, @UserId() userId: number): Promise<{ success: true; data: any }> {
    const data = await this.userAIService.remove(userId, id);
    return { success: true, data };
  }

  // --------------------- Usage Logs ---------------------
  @Get('user/logs')
  @ApiOperation({ summary: 'Get AI usage logs for the authenticated user' })
  @ApiQuery({ name: 'limit', required: false, example: 50, description: 'Maximum number of logs to return' })
  @ApiQuery({ name: 'offset', required: false, example: 0, description: 'Number of logs to skip for pagination' })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 1,
            title: 'AI Evaluation - Submission 123',
            usingDate: '2026-03-01T10:00:00Z',
            inputTokenCount: 150,
            outputTokenCount: 200,
            userId: 101,
            userAiKeyId: 1,
            createdAt: '2026-03-01T10:00:00Z',
            updatedAt: '2026-03-01T10:00:00Z',
          },
        ],
      },
    },
  })
  async getUserLogs(
    @UserId() userId: number,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<{ success: true; data: AIUsageLogResponseDto[] }> {
    const entities = await this.aiLogService.getUserLogs(userId, limit ? +limit : 50, offset ? +offset : 0);
    const data = entities.map(entity => ({
      id: entity.id,
      title: entity.title,
      usingDate: entity.usingDate,
      inputTokenCount: entity.inputTokenCount,
      outputTokenCount: entity.outputTokenCount,
      userId: entity.user.id,
      userAiKeyId: entity.userKey?.id,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    }));
    return { success: true, data };
  }

  @Get('model/:keyId')
  @ApiOperation({ summary: 'Get AI usage logs filtered by model of a given AI key' })
  @ApiParam({ name: 'keyId', description: 'User AI Key ID to fetch model', example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50, description: 'Maximum number of logs to return' })
  @ApiQuery({ name: 'offset', required: false, example: 0, description: 'Number of logs to skip for pagination' })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 1,
            title: 'AI Evaluation - Submission 123',
            usingDate: '2026-03-01T10:00:00Z',
            inputTokenCount: 150,
            outputTokenCount: 200,
            userId: 101,
            userAiKeyId: 1,
            createdAt: '2026-03-01T10:00:00Z',
            updatedAt: '2026-03-01T10:00:00Z',
          },
        ],
      },
    },
  })
  async getLogsByModel(
    @Param('keyId', ParseIntPipe) keyId: number,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<{ success: true; data: AIUsageLogResponseDto[] }> {
    const entities = await this.aiLogService.getLogsByModel(keyId, limit ? +limit : 50, offset ? +offset : 0);
    const data = entities.map(entity => ({
      id: entity.id,
      title: entity.title,
      usingDate: entity.usingDate,
      inputTokenCount: entity.inputTokenCount,
      outputTokenCount: entity.outputTokenCount,
      userId: entity.user.id,
      userAiKeyId: entity.userKey?.id,
      createdAt: entity.created_at,
      updatedAt: entity.updated_at,
    }));
    return { success: true, data };
  }
}
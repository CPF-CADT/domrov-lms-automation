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
} from '@nestjs/swagger';
import { CreateUserAIKeyDto } from '../../libs/dtos/user/create-user-ai-key.dto';
import { UpdateUserAIKeyDto } from '../../libs/dtos/user/update-user-ai-key.dto';
import { UserAIKey } from '../../libs/entities/ai/user-ai-key.entity';
import { AIUsageLog } from '../../libs/entities/ai/ai-usage-log.entity';
import { UserId } from '../../common/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserAiService } from './user-ai.service';
import { AIUsageLogService } from './ai-usage-log.service';

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
          keyName: 'My AI Key',
          keyValue: 'sk-...',
          provider: 'OpenAI',
          createdAt: '2026-03-01T10:00:00Z',
        },
      },
    },
  })
  async create(
    @Body() createUserAIKeyDto: CreateUserAIKeyDto,
    @UserId() userId: number,
  ): Promise<{ success: true; data: UserAIKey }> {
    const data = await this.userAIService.create(userId, createUserAIKeyDto);
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
            keyName: 'My AI Key',
            keyValue: 'sk-...',
            provider: 'OpenAI',
            createdAt: '2026-03-01T10:00:00Z',
          },
        ],
      },
    },
  })
  async findAll(@UserId() userId: number): Promise<{ success: true; data: UserAIKey[] }> {
    const data = await this.userAIService.findAll(userId);
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
          keyName: 'My AI Key',
          keyValue: 'sk-...',
          provider: 'OpenAI',
          createdAt: '2026-03-01T10:00:00Z',
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'User AI key not found' })
  async findOne(@Param('id', ParseIntPipe) id: number, @UserId() userId: number): Promise<{ success: true; data: UserAIKey }> {
    const data = await this.userAIService.findOne(userId, id);
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
          keyName: 'My AI Key',
          keyValue: 'sk-...',
          provider: 'OpenAI',
          createdAt: '2026-03-01T10:00:00Z',
        },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'User AI key not found' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserAIKeyDto: UpdateUserAIKeyDto,
    @UserId() userId: number,
  ): Promise<{ success: true; data: UserAIKey }> {
    const data = await this.userAIService.update(userId, id, updateUserAIKeyDto);
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
            userId: 101,
            model: 'gpt-4',
            inputTokens: 150,
            outputTokens: 200,
            totalTokens: 350,
            createdAt: '2026-03-01T10:00:00Z',
          },
        ],
      },
    },
  })
  async getUserLogs(
    @UserId() userId: number,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<{ success: true; data: AIUsageLog[] }> {
    const data = await this.aiLogService.getUserLogs(userId, limit ? +limit : 50, offset ? +offset : 0);
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
            userId: 101,
            model: 'gpt-4',
            inputTokens: 150,
            outputTokens: 200,
            totalTokens: 350,
            createdAt: '2026-03-01T10:00:00Z',
          },
        ],
      },
    },
  })
  async getLogsByModel(
    @Param('keyId', ParseIntPipe) keyId: number,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<{ success: true; data: AIUsageLog[] }> {
    const data = await this.aiLogService.getLogsByModel(keyId, limit ? +limit : 50, offset ? +offset : 0);
    return { success: true, data };
  }
}
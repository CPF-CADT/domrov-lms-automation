import { Controller, Get, Query, Logger, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIEvaluationListResponseDto } from '../../libs/dtos/admin/evaluation-admin.dto';
import { AIUsageLogsListResponseDto } from '../../libs/dtos/admin/ai-usage-logs-admin.dto';
import { Evaluation } from '../../libs/entities/assessment/evaluation.entity';
import { AIUsageLog } from '../../libs/entities/ai/ai-usage-log.entity';
import { EvaluationType, AIModelSelectionMode } from '../../libs/enums/Assessment';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/security/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SystemRole } from '../../libs/enums/Role';

@ApiTags('Admin - Evaluations')
@Controller('admin/evaluations')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('JWT-auth')
@Roles(SystemRole.SuperAdmin)
export class AdminEvaluationsController {
  private readonly logger = new Logger(AdminEvaluationsController.name);

  constructor(
    @InjectRepository(AIUsageLog)
    private readonly aiUsageLogRepo: Repository<AIUsageLog>,
  ) {}



  // ==================== GET ALL AI USAGE LOGS ====================
  @Get('ai-usage-logs')
  @ApiOperation({
    summary: 'Get All AI Usage Logs',
    description: 'Retrieve paginated list of AI usage logs with user profile information. Shows all AI evaluations and their token usage across the system.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10, description: 'Items per page (default: 10, max: 100)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by user name, email, or log title' })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'Filter logs from date (ISO format)' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'Filter logs to date (ISO format)' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['newest', 'oldest', 'tokenCountDesc', 'tokenCountAsc'], description: 'Sort order', example: 'newest' })
  @ApiOkResponse({
    description: 'AI usage logs retrieved successfully',
    type: AIUsageLogsListResponseDto,
    schema: {
      example: {
        data: [
          {
            id: 123,
            title: 'AI Evaluation - Submission 456 in assessment Introduction to Programming',
            inputTokenCount: 1500,
            outputTokenCount: 800,
            totalTokenCount: 2300,
            usingDate: '2026-03-01T10:30:00Z',
            user: {
              id: 101,
              firstName: 'John',
              lastName: 'Doe',
              email: 'john.doe@example.com',
              profilePictureUrl: 'https://example.com/profile.jpg',
              status: 'ACTIVE',
            },
            createdAt: '2026-03-01T10:30:00Z',
          },
        ],
        total: 150,
        page: 1,
        limit: 10,
        filtered: false,
      },
    },
  })
  async getAIUsageLogs(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
    @Query('dateFrom') dateFrom: string = '',
    @Query('dateTo') dateTo: string = '',
    @Query('sortBy') sortBy: string = 'newest',
  ): Promise<{ success: true; data: AIUsageLogsListResponseDto }> {
    try {
      // Validate and parse pagination parameters
      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 10));

      // Build query with joins
      let query = this.aiUsageLogRepo
        .createQueryBuilder('log')
        .leftJoinAndSelect('log.user', 'user')
        .leftJoinAndSelect('log.userKey', 'userKey');

      // Apply search filter (multi-field search)
      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        query = query.andWhere(
          '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search OR log.title ILIKE :search)',
          { search: searchTerm },
        );
      }

      // Date range filter
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        if (!isNaN(fromDate.getTime())) {
          query = query.andWhere('log.usingDate >= :fromDate', { fromDate });
        }
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        if (!isNaN(toDate.getTime())) {
          query = query.andWhere('log.usingDate <= :toDate', { toDate });
        }
      }

      // Apply sorting
      const sortMap: Record<string, [string, 'ASC' | 'DESC']> = {
        'newest': ['log.usingDate', 'DESC'],
        'oldest': ['log.usingDate', 'ASC'],
        'tokenCountDesc': ['(log.inputTokenCount + log.outputTokenCount)', 'DESC'],
        'tokenCountAsc': ['(log.inputTokenCount + log.outputTokenCount)', 'ASC'],
      };
      const [sortField, sortOrder] = sortMap[sortBy] || sortMap['newest'];

      // Execute query with pagination
      const [logs, total] = await query
        .orderBy(sortField, sortOrder)
        .skip((pageNum - 1) * limitNum)
        .take(limitNum)
        .getManyAndCount();

      // Map results to DTO
      // const data = logs.map((log) => {
      //   const user = log.user;
      //   return {
      //     id: log.id,
      //     title: log.title,
      //     inputTokenCount: log.inputTokenCount,
      //     outputTokenCount: log.outputTokenCount,
      //     totalTokenCount: log.inputTokenCount + log.outputTokenCount,
      //     usingDate: log.usingDate?.toISOString() || new Date().toISOString(),
      //     user: {
      //       id: user?.id || null,
      //       firstName: user?.firstName || 'Unknown',
      //       lastName: user?.lastName || null,
      //       email: user?.email || 'unknown@example.com',
      //       profilePictureUrl: user?.profilePictureUrl || null,
      //       status: user?.status || 'UNKNOWN',
      //     },
      //     createdAt: log.created_at?.toISOString() || new Date().toISOString(),
      //   };
      // });
      const data = logs.map((log) => {
        const user = log.user;
        return {
          id: log.id,
          title: log.title,
          inputTokenCount: log.inputTokenCount,
          outputTokenCount: log.outputTokenCount,
          totalTokenCount: log.inputTokenCount + log.outputTokenCount,
          usingDate: log.usingDate?.toISOString() || new Date().toISOString(),
          user: {
            firstName: user?.firstName || 'Unknown',
            lastName: user?.lastName || null,
            email: user?.email || 'unknown@example.com',
            profilePictureUrl: user?.profilePictureUrl || null,
            status: user?.status || 'UNKNOWN',
          },
          createdAt: log.created_at?.toISOString() || new Date().toISOString(),
        };
      });

      const responseData: AIUsageLogsListResponseDto = {
        data,
        total,
        page: pageNum,
        limit: limitNum,
        filtered: !!(search || dateFrom || dateTo),
      };

      return { success: true, data: responseData };
    } catch (err) {
      this.logger.error('Failed to fetch AI usage logs:', err);
      throw new BadRequestException('Failed to fetch AI usage logs. Please check your filter parameters.');
    }
  }
}

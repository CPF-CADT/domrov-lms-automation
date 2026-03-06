import { Controller, Get, Query, Logger, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AIEvaluationListResponseDto } from '../../libs/dtos/admin/evaluation-admin.dto';
import { Evaluation } from '../../libs/entities/assessment/evaluation.entity';
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
    @InjectRepository(Evaluation)
    private readonly evaluationRepo: Repository<Evaluation>,
  ) {}

  // ==================== GET ALL AI EVALUATIONS ====================
  @Get()
  @ApiOperation({
    summary: 'Get All AI Evaluations',
    description: 'Retrieve paginated list of AI evaluations with search functionality. Tracks AI usage across the system (both system and user API keys) for cost estimation.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10, description: 'Items per page (default: 10, max: 100)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by user name, email, or assessment title' })
  @ApiQuery({ name: 'evaluationType', required: false, enum: ['AI', 'MANUAL', 'all'], description: 'Filter by evaluation type' })
  @ApiQuery({ name: 'aiModelSelectionMode', required: false, enum: ['SYSTEM', 'USER', 'NONE', 'all'], description: 'Filter by AI key usage type' })
  @ApiQuery({ name: 'isApproved', required: false, enum: ['true', 'false', 'all'], description: 'Filter by approval status' })
  @ApiQuery({ name: 'isModified', required: false, enum: ['true', 'false', 'all'], description: 'Filter by modification status' })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, description: 'Filter evaluations from date (ISO format)' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, description: 'Filter evaluations to date (ISO format)' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['newest', 'oldest', 'scoreAsc', 'scoreDesc'], description: 'Sort order', example: 'newest' })
  @ApiOkResponse({
    description: 'AI evaluations retrieved successfully',
    type: AIEvaluationListResponseDto,
    schema: {
      example: {
        data: [
          {
            id: 123,
            submissionId: 456,
            assessmentId: 789,
            assessmentTitle: 'Introduction to Programming',
            userId: 101,
            userName: 'John Doe',
            userEmail: 'john.doe@example.com',
            aiModelSelectionMode: 'SYSTEM',
            score: 85.5,
            penaltyScore: 5,
            evaluationType: 'AI',
            isApproved: true,
            isModified: false,
            confidencePoint: 'high',
            estimatedInputTokens: 1500,
            estimatedOutputTokens: 800,
            estimatedTotalTokens: 2300,
            submissionDate: '2026-03-01T09:00:00Z',
            evaluationDate: '2026-03-01T10:30:00Z',
            aiProvider: 'gpt-4',
          },
        ],
        total: 150,
        page: 1,
        limit: 10,
        filtered: true,
      },
    },
  })
  async getAllAIEvaluations(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search: string = '',
    @Query('evaluationType') evaluationType: string = 'all',
    @Query('aiModelSelectionMode') aiModelSelectionMode: string = 'all',
    @Query('isApproved') isApproved: string = 'all',
    @Query('isModified') isModified: string = 'all',
    @Query('dateFrom') dateFrom: string = '',
    @Query('dateTo') dateTo: string = '',
    @Query('sortBy') sortBy: string = 'newest',
  ): Promise<{ success: true; data: AIEvaluationListResponseDto }> {
    try {
      // Validate and parse pagination parameters
      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 10));

      // Build query with joins
      let query = this.evaluationRepo
        .createQueryBuilder('evaluation')
        .leftJoinAndSelect('evaluation.submission', 'submission')
        .leftJoinAndSelect('submission.user', 'user')
        .leftJoinAndSelect('submission.assessment', 'assessment');

      // Apply search filter (multi-field search)
      if (search && search.trim()) {
        const searchTerm = `%${search.trim()}%`;
        query = query.andWhere(
          '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search OR assessment.title ILIKE :search)',
          { search: searchTerm },
        );
      }

      // Filter by evaluation type
      if (evaluationType !== 'all') {
        const typeMap: Record<string, EvaluationType> = {
          'AI': EvaluationType.AI,
          'MANUAL': EvaluationType.MANUAL,
        };
        if (typeMap[evaluationType]) {
          query = query.andWhere('evaluation.evaluationType = :evaluationType', {
            evaluationType: typeMap[evaluationType],
          });
        }
      }

      // Filter by AI model selection mode (SYSTEM vs USER key)
      if (aiModelSelectionMode !== 'all') {
        const modeMap: Record<string, AIModelSelectionMode> = {
          'SYSTEM': AIModelSelectionMode.SYSTEM,
          'USER': AIModelSelectionMode.USER,
          'NONE': AIModelSelectionMode.NONE,
        };
        if (modeMap[aiModelSelectionMode]) {
          query = query.andWhere('assessment.aiModelSelectionMode = :aiModelSelectionMode', {
            aiModelSelectionMode: modeMap[aiModelSelectionMode],
          });
        }
      }

      // Filter by approval status
      if (isApproved !== 'all') {
        const approved = isApproved === 'true';
        query = query.andWhere('evaluation.isApproved = :isApproved', { isApproved: approved });
      }

      // Filter by modification status
      if (isModified !== 'all') {
        const modified = isModified === 'true';
        query = query.andWhere('evaluation.isModified = :isModified', { isModified: modified });
      }

      // Date range filter
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        if (!isNaN(fromDate.getTime())) {
          query = query.andWhere('evaluation.created_at >= :fromDate', { fromDate });
        }
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        if (!isNaN(toDate.getTime())) {
          query = query.andWhere('evaluation.created_at <= :toDate', { toDate });
        }
      }

      // Apply sorting
      const sortMap: Record<string, [string, 'ASC' | 'DESC']> = {
        'newest': ['evaluation.created_at', 'DESC'],
        'oldest': ['evaluation.created_at', 'ASC'],
        'scoreAsc': ['evaluation.score', 'ASC'],
        'scoreDesc': ['evaluation.score', 'DESC'],
      };
      const [sortField, sortOrder] = sortMap[sortBy] || sortMap['newest'];

      // Execute query with pagination
      const [evaluations, total] = await query
        .orderBy(sortField, sortOrder)
        .skip((pageNum - 1) * limitNum)
        .take(limitNum)
        .getManyAndCount();

      // Map results to DTO
      const data = evaluations.map((evaluation) => {
        const submission = evaluation.submission;
        const user = submission?.user;
        const assessment = submission?.assessment;

        // Estimate token usage from aiOutput length (rough estimation)
        let estimatedInputTokens: number | null = null;
        let estimatedOutputTokens: number | null = null;
        let estimatedTotalTokens: number | null = null;

        if (evaluation.aiOutput) {
          // Rough token estimation: ~4 characters per token
          estimatedOutputTokens = Math.ceil(evaluation.aiOutput.length / 4);
          // Assume input is typically 2x output for evaluations
          estimatedInputTokens = estimatedOutputTokens * 2;
          estimatedTotalTokens = estimatedInputTokens + estimatedOutputTokens;
        }

        return {
          id: evaluation.id,
          submissionId: submission?.id || null,
          assessmentId: assessment?.id || null,
          assessmentTitle: assessment?.title || 'Unknown Assessment',
          userId: user?.id || null,
          userName: user ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Unknown User',
          userEmail: user?.email || 'unknown@example.com',
          aiModelSelectionMode: assessment?.aiModelSelectionMode || AIModelSelectionMode.NONE,
          score: evaluation.score,
          penaltyScore: evaluation.penaltyScore,
          evaluationType: evaluation.evaluationType,
          isApproved: evaluation.isApproved,
          isModified: evaluation.isModified,
          confidencePoint: evaluation.confidencePoint || null,
          estimatedInputTokens,
          estimatedOutputTokens,
          estimatedTotalTokens,
          submissionDate: submission?.created_at?.toISOString() || new Date().toISOString(),
          evaluationDate: evaluation.created_at.toISOString(),
          aiProvider: null, // Could be extracted from aiOutput or stored separately
        };
      });

      const responseData: AIEvaluationListResponseDto = {
        data,
        total,
        page: pageNum,
        limit: limitNum,
        filtered: !!(
          search ||
          evaluationType !== 'all' ||
          aiModelSelectionMode !== 'all' ||
          isApproved !== 'all' ||
          isModified !== 'all' ||
          dateFrom ||
          dateTo
        ),
      };

      return { success: true, data: responseData };
    } catch (err) {
      this.logger.error('Failed to fetch AI evaluations:', err);
      throw new BadRequestException('Failed to fetch AI evaluations. Please check your filter parameters.');
    }
  }
}

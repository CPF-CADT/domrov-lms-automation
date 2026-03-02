import { Controller, Get, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EvaluationListResponseDto } from '../../libs/dtos/admin/evaluation-admin.dto';
import { Submission } from '../../libs/entities/assessment/submission.entity';
import { SubmissionStatus } from '../../libs/enums/Status';

@ApiTags('Admin - Evaluations')
@Controller('admin/evaluations')
export class AdminEvaluationsController {
  private readonly logger = new Logger(AdminEvaluationsController.name);

  constructor(
    @InjectRepository(Submission)
    private readonly submissionRepo: Repository<Submission>,
  ) {}

  // ==================== GET ALL EVALUATIONS ====================
  // @Get()
  // @ApiOperation({
  //   summary: 'Get All Evaluations',
  //   description: 'Retrieve paginated list of evaluations with optional filtering',
  // })
  // @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  // @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  // @ApiQuery({ name: 'status', required: false, enum: ['pending', 'approved', 'rejected', 'all'] })
  // @ApiOkResponse({
  //   description: 'Evaluations retrieved successfully',
  //   type: EvaluationListResponseDto,
  //   example: {
  //     data: [
  //       {
  //         id: 'eval_001',
  //         userId: 'user_001',
  //         userName: 'John Doe',
  //         type: 'assignment',
  //         status: 'pending',
  //         submittedAt: '2026-03-01T09:00:00Z',
  //         reviewedAt: null,
  //         reviewer: null,
  //       },
  //     ],
  //     total: 45,
  //     page: 1,
  //     limit: 10,
  //   },
  // })
  // async getAllEvaluations(
  //   @Query('page') page: number = 1,
  //   @Query('limit') limit: number = 10,
  // ): Promise<EvaluationListResponseDto> {
  //   page = Math.max(1, page);
  //   limit = Math.min(100, Math.max(1, limit));

  //   const query = this.submissionRepo.createQueryBuilder('submission')
  //     .leftJoinAndSelect('submission.student', 'student')
  //     .leftJoinAndSelect('submission.assessment', 'assessment')
  //     .leftJoinAndSelect('submission.evaluation', 'evaluation')
  //     // Only include submissions that are graded and have AI output
  //     .where('submission.status = :gradedStatus', { gradedStatus: SubmissionStatus.GRADED })
  //     .andWhere('evaluation.aiOutput IS NOT NULL');

  //   const [submissions, total] = await query
  //     .skip((page - 1) * limit)
  //     .take(limit)
  //     .orderBy('submission.created_at', 'DESC')
  //     .getManyAndCount();

  //   const data = submissions.map((submission) => ({
  //     id: submission.id,
  //     userId: submission.userId,
  //     userName: submission.user
  //       ? `${submission.user.firstName} ${submission.user.lastName || ''}`.trim()
  //       : 'Unknown',
  //     submittedAt: submission.created_at,
  //     aiOutput: submission.evaluation?.aiOutput ?? null,
  //   }));

  //   return {
  //     data,
  //     total,
  //     page,
  //     limit,
  //   };
  // }
}

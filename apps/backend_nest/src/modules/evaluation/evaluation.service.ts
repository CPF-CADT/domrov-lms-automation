import { Injectable, OnModuleInit, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import * as microservices from '@nestjs/microservices';
import { lastValueFrom, Observable } from 'rxjs';
import { EvaluationDto } from '../../../libs/dtos/assessment/evaluation.dto';
import { Submission } from '../../../libs/entities/assessment/submission.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Evaluation } from '../../../libs/entities/assessment/evaluation.entity';
import { SubmissionStatus } from '../../../libs/enums/Status';
import { EvaluationFeedback } from '../../../libs/entities/assessment/evaluation-feedback.entity';
import { EvaluationRubricScore } from '../../../libs/entities/assessment/evaluation-rubric-score.entity';

interface SubmissionService {
    processSubmission(request: { submission_id: string; file_path: string }): Observable<any>;
}

interface TasksQueueService {
    AddQueue(request: {
        submission_id: string;
    }): Observable<{ success: boolean; message: string }>;
}


@Injectable()
export class EvaluationService implements OnModuleInit {
  private submissionService: SubmissionService;

  constructor(
    @Inject('SUBMISSION_PACKAGE')
    private readonly client: microservices.ClientGrpc,
    @InjectRepository(Submission)
    private submissionRepo: Repository<Submission>,
    @InjectRepository(Evaluation)
    private evaluationRepo: Repository<Evaluation>,
    @InjectRepository(EvaluationFeedback) 
    private evaluationRubricRepo: Repository<EvaluationFeedback>,
     @InjectRepository(EvaluationRubricScore) 
    private evaluationRubricScoreRepo: Repository<EvaluationRubricScore>,
  ) {}

  onModuleInit() {
    this.submissionService =
      this.client.getService<SubmissionService>('SubmissionService');
  }

  // Calls gRPC to process a submission file
  async processSubmission(submission_id: string, file_path: string) {
    try {
      // Convert Observable to Promise
      const result = await lastValueFrom(
        this.submissionService.processSubmission({ submission_id, file_path }),
      );
      return result;
    } catch (err) {
      console.error('gRPC error:', err.message);

      if (err.code === 5) {
        throw new NotFoundException(`File not found or empty: ${file_path}`);
      }

      throw err;
    }
  }
  async createEvaluation(
    userId: number,
    submissionId: number,
    dto: EvaluationDto,
  ) {
    const submission = await this.submissionRepo.findOne({
      where: { id: submissionId },
      relations: ['assessment', 'assessment.class', 'assessment.class.owner'],
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    if (submission.assessment.class.owner.id !== userId) {
      throw new BadRequestException('Unauthorized');
    }

    const existing = await this.evaluationRepo.findOne({
      where: { submission: { id: submissionId } },
    });

    if (existing) {
      throw new BadRequestException('Already evaluated');
    }

    const evaluation = this.evaluationRepo.create({
      score: dto.score,
      feedback: dto.feedback,
      evaluationType: dto.evaluationType,
      submission,
    });

    await this.evaluationRepo.save(evaluation);

    if (dto.rubricScores?.length) {
      for (const rubric of dto.rubricScores) {
        await this.evaluationRubricScoreRepo.save({
          score: rubric.score,
          comment: rubric.comment,
          rubricId: rubric.rubricId,
          evaluation: evaluation,
        });
      }
    }

    submission.status = SubmissionStatus.GRADED;
    await this.submissionRepo.save(submission);

    return {
      message: 'Evaluation created successfully',
      evaluationId: evaluation.id,
    };
  }
    private submissionService: SubmissionService;
    private tasksQueueService: TasksQueueService

    constructor(
        @Inject('CODE_EVAL_GRPC')
        private readonly client: microservices.ClientGrpc,
    ) { }


    onModuleInit() {
        this.submissionService =
            this.client.getService<SubmissionService>('SubmissionService');

        this.tasksQueueService =
            this.client.getService<TasksQueueService>('TasksQueue');
    }


    // Calls gRPC to process a submission file
    async processSubmission(submission_id: string, file_path: string) {
        try {
            // Convert Observable to Promise
            const result = await lastValueFrom(
                this.submissionService.processSubmission({ submission_id, file_path }),
            );
            return result;
        } catch (err: unknown) {
            const grpcError = err as { code?: number; message?: string };

            console.error('gRPC error:', grpcError.message);

            if (grpcError.code === 5) {
                throw new NotFoundException(`File not found or empty: ${file_path}`);
            }

            throw err;
        }

    }

    async addTaskToQueue(submission_id: string) {
        return await lastValueFrom(
            this.tasksQueueService.AddQueue({
                submission_id,
            }),
        );
    }

}

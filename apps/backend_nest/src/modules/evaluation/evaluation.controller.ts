import { Body, Controller, Get, Logger, Param, ParseIntPipe, Post, Query, UseGuards, ValidationPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import * as grpcJs from '@grpc/grpc-js';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import * as evaluation from '../../libs/interfaces/evaluation';
import * as submission from '../../libs/interfaces/submission';

import { GetFilesSubmissionDto, GetSubmissionFolderDto } from '../../libs/dtos/submission/process-submission.dto';
import { AddQueueDto } from '../../libs/dtos/submission/add-queue.dto';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiParam
} from '@nestjs/swagger';
import { SubmissionService } from '../assessment/submission.service';
import {
  ProcessSubmissionResponseDto,
  FolderStructureResponseDto,
  AddQueueResponseDto,
} from '../../libs/dtos/evaluation/evaluation-response.dto';
import { SubmissionMemberGuard, SubmissionInstructorGuard } from '../../common/security';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Evaluations')
@ApiBearerAuth('JWT-auth')
@Controller('evaluations')
export class EvaluationController {
  private readonly logger = new Logger("EvaluationController");

  constructor(private readonly evaluationService: EvaluationService,
    private readonly submissionService: SubmissionService) { }

  // ==================== VIEW FILE CONTENT ====================
  @Get('submission/:submission_id/file')
  @UseGuards(JwtAuthGuard, SubmissionMemberGuard)
  @ApiOperation({
    summary: 'View file content in submission',
    description: 'Retrieves the content of a specific file from a submission.'
  })
  @ApiParam({
    name: 'submission_id',
    type: Number,
    description: 'ID of the submission',
    example: 1
  })
  @ApiQuery({
    name: 'file_path',
    type: String,
    description: 'Relative path of the file',
    example: 'main.cpp'
  })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: {
          fileContent: 'file content here',
          fileName: 'main.cpp'
        }
      }
    }
  })
  @ApiNotFoundResponse({
    description: 'File not found'
  })
  async processSubmission(
    @Param('submission_id', new ValidationPipe({ transform: true })) submission_id: number,
    @Query(new ValidationPipe({ transform: true })) query: GetFilesSubmissionDto
  ): Promise<{ success: true; data: ProcessSubmissionResponseDto }> {
    const { file_path } = query;
    const data = await this.evaluationService.processSubmission(String(submission_id), file_path);
    return { success: true, data };
  }

  // ==================== GET FOLDER STRUCTURE ====================
  @Get('submission/:submission_id/folder-structure')
  @UseGuards(JwtAuthGuard, SubmissionMemberGuard)
  @ApiOperation({
    summary: 'Get submission folder structure',
    description: 'Retrieves the complete folder tree structure of a submission.'
  })
  @ApiParam({
    name: 'submission_id',
    type: Number,
    description: 'ID of the submission',
    example: 1
  })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: {
          folderName: 'root',
          files: [],
          subfolders: []
        }
      }
    }
  })
  @ApiNotFoundResponse({
    description: 'Submission not found'
  })
  async getSubmissionFolderStructure(
    @Param('submission_id', new ValidationPipe({ transform: true })) submission_id: number,
  ): Promise<{ success: true; data: FolderStructureResponseDto }> {
    const data = await this.evaluationService.getSubmissionFolderStructure(String(submission_id));
    return { success: true, data };
  }

  // ==================== ADD TO AI EVALUATION QUEUE ====================
  @Post('queue')
  @UseGuards(JwtAuthGuard, SubmissionInstructorGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Queue submission for AI evaluation',
    description: `Adds a submission to the AI evaluation processing queue. The submission will be evaluated asynchronously by the AI grading system.

**Workflow:**
1. Student submits assignment via \`PATCH /submissions/:assessmentId/submit\`
2. Teacher triggers AI evaluation by calling this endpoint
3. AI processes submission and creates evaluation with scores and feedback
4. Teacher reviews and approves the AI evaluation

**Requirements:**
- Submission must exist and have status SUBMITTED
- Assessment must have \`aiEvaluationEnable: true\`
- Class owner must have sufficient wallet credits for AI usage

**Future Enhancement:** This endpoint will support both AI and manual evaluation modes.`
  })
  @ApiBody({
    type: AddQueueDto,
    description: 'Submission to queue for AI evaluation',
    examples: {
      basic: {
        summary: 'Queue single submission',
        value: { submission_id: '123' }
      }
    }
  })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        data: {
          success: true,
          message: 'Task queued successfully'
        }
      }
    }
  })
  @ApiBadRequestResponse({
    description: 'Invalid submission or queue error',
    examples: {
      notFound: {
        summary: 'Submission not found',
        value: {
          statusCode: 400,
          message: 'Submission not found',
          error: 'Bad Request'
        }
      },
      alreadyGraded: {
        summary: 'Already graded',
        value: {
          statusCode: 400,
          message: 'Submission already has an evaluation',
          error: 'Bad Request'
        }
      },
      aiDisabled: {
        summary: 'AI evaluation disabled',
        value: {
          statusCode: 400,
          message: 'AI evaluation is not enabled for this assessment',
          error: 'Bad Request'
        }
      },
      insufficientCredits: {
        summary: 'Insufficient credits',
        value: {
          statusCode: 400,
          message: 'Insufficient wallet credits for AI evaluation',
          error: 'Bad Request'
        }
      }
    }
  })
  async addQueue(
    @Body(new ValidationPipe({ transform: true })) body: AddQueueDto,
  ): Promise<{ success: true; data: AddQueueResponseDto }> {
    console.log('addQueue called with:', body);
    const { submission_id } = body;
    const data = await this.evaluationService.addTaskToQueue(String(submission_id));
    return { success: true, data };
  }

  // ==================== EVALUATE SUBMISSION ====================
  @GrpcMethod('EvaluateWithAI', 'EvaluateSubmission')
  async evaluateSubmission(
    data: evaluation.EvaluateRequest,
    metadata: grpcJs.Metadata,
    call: grpcJs.ServerUnaryCall<any, any>,
  ): Promise<evaluation.EvaluateResponse> {
    const logger = new Logger('EvaluateSubmission');
    logger.log(`Received EvaluateSubmission request: ${JSON.stringify(data)}`);
    try {
      const { submission_id, score, feedback, input_token, output_token, ai_model } = data;
      if (!submission_id || !score?.value?.length) {
        logger.log(`Invalid submission or empty score criteria: submission_id=${submission_id}, score=${JSON.stringify(score)}, feedback=${feedback}, input_token=${input_token}, output_token=${output_token}`);
        return {
          success: false,
          message: 'Invalid submission or empty score criteria',
        };
      }
      const serverMetadata = new grpcJs.Metadata();
      serverMetadata.add('evaluated-by', 'nestjs-grpc');
      call.sendMetadata(serverMetadata);
      await this.evaluationService.aiEvaluate(
        Number(submission_id), feedback, score.value, input_token, output_token, ai_model
      );
      return {
        success: true,
        message: `Submission ${submission_id} evaluated successfully`,
      };
    } catch (err: unknown) {
      let message = 'Unknown error occurred';
      if (err instanceof Error) {
        message = err.message;
      }
      return {
        success: false,
        message,
      };
    }
  }

  @GrpcMethod('SubmissionService', 'GetSubmission')
  async getSubmission(
    data: submission.SubmissionContentRequest,
    metadata: grpcJs.Metadata,
    call: grpcJs.ServerUnaryCall<any, any>,
  ): Promise<submission.SubmissionContentResponse> {
    const { submission_id } = data;
    console.log('getSubmission called with:', data);
    const serverMetadata = new grpcJs.Metadata();
    serverMetadata.add('served-by', 'nestjs-grpc');
    call.sendMetadata(serverMetadata);
    try {
      const result = await this.submissionService.getSubmissionDetails(Number(submission_id));
      console.log('Submission found:', result);
      return result;
    } catch (err) {
      console.log('Error fetching submission:', (err as Error).message || err);
      throw new RpcException({
        code: grpcJs.status.NOT_FOUND,
        message: `Submission with id ${submission_id} not found`,
      });
    }
  }

  // ==================== NOTIFY LLM ERROR / INSUFFICIENT BALANCE ====================
  @GrpcMethod('EvaluateWithAI', 'NotifyUserAiModelInsufficient')
  async notifyUserAiModelInsufficient(
    data: evaluation.NotifyUserAiModelInsufficientRequest,
    metadata: grpcJs.Metadata,
    call: grpcJs.ServerUnaryCall<any, any>,
  ): Promise<evaluation.NotifyUserAiModelInsufficientResponse> {

    this.logger.log(`NotifyUserAiModelInsufficient request: ${JSON.stringify(data)}`);
    const { submission_id, raw_response_message } = data;
    const serverMetadata = new grpcJs.Metadata();
    serverMetadata.add('served-by', 'nestjs-grpc');
    call.sendMetadata(serverMetadata);
    try {
      if (!submission_id || !raw_response_message) {
        return { success: false, message: 'Missing submission_id or raw_response_message' };
      }

      await this.evaluationService.handleAiModelInsufficient(submission_id, raw_response_message);
      return { success: true, message: `AI model disabled for submission ${submission_id}` };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Failed to notify AI model insufficiency: ${message}`);
      return { success: false, message };
    }
  }

  @GrpcMethod('SubmissionService', 'GetSubmissionResource')
  async getSubmissionResource(
    data: submission.SubmissionContentRequest,
    metadata: grpcJs.Metadata,
    call: grpcJs.ServerUnaryCall<any, any>,
  ): Promise<submission.SubmissionContentResource> {
    const { submission_id } = data;
    const serverMetadata = new grpcJs.Metadata();
    serverMetadata.add('served-by', 'nestjs-grpc');
    call.sendMetadata(serverMetadata);
    try {
      const result = await this.submissionService.getSubmissionResoucrs(Number(submission_id));
      console.log('Submission found:', result);
      return result;
    } catch (err) {
      console.log('Error fetching submission:', (err as Error).message || err);
      throw new RpcException({
        code: grpcJs.status.NOT_FOUND,
        message: `Submission with id ${submission_id} not found`,
      });
    }
  }
}
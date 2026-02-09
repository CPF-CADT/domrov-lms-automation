import { Body, Controller, Get, Logger, Param, ParseIntPipe, Post, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Get, Logger, Post, Query, ValidationPipe } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { EvaluationService } from './evaluation.service';
import * as grpcJs from '@grpc/grpc-js';
import { GrpcMethod, RpcException } from '@nestjs/microservices';
import * as evaluation from '../../../libs/interfaces/evaluation';
import * as submission from '../../../libs/interfaces/submission';

import { GetFilesSubmissionDto } from '../../../libs/dtos/submission/process-submission.dto';
import { UserId } from '../../common/decorators/user.decorator';
import { EvaluationDto } from '../../../libs/dtos/assessment/evaluation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AddQueueDto } from '../../../libs/dtos/submission/add-queue.dto';

@ApiTags('evaluations')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('evaluations')
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) { }

  @Get('process')
  @ApiResponse({
    status: 200,
    description: 'Submission processed',
    schema: {
      example: {
        success: true,
        message: 'File processed',
        file: {
          type: 'file',
          name: 'main.bat',
          path: '1a502673e8870d73/main.bat',
          content: [
            '@echo off',
            'REM This batch file compiles and runs the C++ Library Management System.',
            'out\\library_app.exe'
          ]
        }
      }
    }
  })
  async processSubmission(
    @Query(new ValidationPipe({ transform: true })) query: GetFilesSubmissionDto
  ) {
    const { submission_id, file_path } = query;
    return this.evaluationService.processSubmission(
      String(submission_id),
      String(file_path),
    );
  }

  @Post('queue')
  @ApiResponse({
    status: 200,
    description: 'Submission added to processing queue',
    schema: {
      example: {
        success: true,
        message: 'Task queued successfully',
      },
    },
  })
  async addQueue(
    @Body(new ValidationPipe({ transform: true }))
    body: AddQueueDto,
  ) {
    const { submission_id } = body;

    return this.evaluationService.addTaskToQueue(
      String(submission_id),
    );
  }



  @GrpcMethod('EvaluateWithAI', 'EvaluateSubmission')
  evaluateSubmission(
    data: evaluation.EvaluateRequest,
    metadata: grpcJs.Metadata,
    call: grpcJs.ServerUnaryCall<any, any>,
  ): evaluation.EvaluateResponse {

    const logger = new Logger('EvaluateSubmission');
    logger.log(`Received EvaluateSubmission request: ${JSON.stringify(data)}`);
    try {
      const { submission_id, score, feedback, input_token, output_token } = data;

      if (!submission_id || !score?.value?.length) {
        logger.log(`Invalid submission or empty score criteria: submission_id=${submission_id}, score=${JSON.stringify(score)}, feedback=${feedback}, input_token=${input_token}, output_token=${output_token}`);
        return {
          success: false,
          message: 'Invalid submission or empty score criteria',
        };
      }

      // Optionally send metadata back
      const serverMetadata = new grpcJs.Metadata();
      serverMetadata.add('evaluated-by', 'nestjs-grpc');
      call.sendMetadata(serverMetadata);

      return {
        success: true,
        message: `Submission ${submission_id} evaluated successfully`,
      };
    } catch (err) {
      return {
        success: false,
        message: err.message,
      };
    }
  } 

  @GrpcMethod('SubmissionService', 'GetSubmission')
  getSubmission(
    data: submission.SubmissionContentRequest,
    metadata: grpcJs.Metadata,
    call: grpcJs.ServerUnaryCall<any, any>,
  ): submission.SubmissionContentResponse {
    const { submission_id } = data;
    console.log('getSubmission called with:', data);

    const serverMetadata = new grpcJs.Metadata();
    serverMetadata.add('served-by', 'nestjs-grpc');
    call.sendMetadata(serverMetadata);

    if (submission_id !== "2") {
      throw new RpcException({
        code: grpcJs.status.NOT_FOUND,
        message: `Submission with id ${submission_id} not found`,
      });
    }

    return {
      submission_id,
      instrctions: 'Evaluate C++ project using static analysis only. No STL sort allowed.',
      resource_url: 'https://github.com/Next-Gen-G9/week-2-algorithms-anisda.git',
      rubric: [
        {
          criterion:
            'Define Book struct in models/Book.h: Must include int id, string title, string author, and bool isAvailable.',
          weight: 15,
        },
        {
          criterion:
            'Implement addBook and displayAllBooks in LibraryUtils.cpp: Must handle user input, storage in a collection, and iterative printing.',
          weight: 15,
        },
        {
          criterion:
            'Implement findBookById returning a pointer (Book*): Must return the memory address of the found object or nullptr if not found.',
          weight: 25,
        },
        {
          criterion:
            'Implement checkOutBook and returnBook: Must use findBookById to retrieve a pointer and toggle the isAvailable boolean state.',
          weight: 10,
        },
        {
          criterion:
            'Implement showPromotionalBooks in main.cpp: Must use a standard int array of IDs and a loop to display them.',
          weight: 10,
        },
        {
          criterion:
            'Implement Sorting and Searching: Must use manual Bubble Sort by title and Binary Search logic (only functional on sorted data).',
          weight: 25,
        },
      ],
    };
  }
@Post('submission/:id')
@ApiResponse({
  status: 201,
  description: 'Evaluation created successfully',
})
@ApiResponse({
  status: 400,
  description: 'Unauthorized or already evaluated',
})
@ApiResponse({
  status: 404,
  description: 'Submission not found',
})
async createEvaluation(
  @UserId() userId: number,
  @Param('id', ParseIntPipe) submissionId: number,
  @Body() dto: EvaluationDto,
) {
  return this.evaluationService.createEvaluation(
    userId,
    submissionId,
    dto,
  );
}


}

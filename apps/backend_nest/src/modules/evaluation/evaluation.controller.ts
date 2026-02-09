import { Body, Controller, Get, Logger, Param, ParseIntPipe, Post, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EvaluationService } from './evaluation.service';
import * as grpcJs from '@grpc/grpc-js';
import { GrpcMethod } from '@nestjs/microservices';
import * as evaluation from '../../../libs/interfaces/evaluation';
import { GetFilesSubmissionDto } from '../../../libs/dtos/submission/process-submission.dto';
import { UserId } from '../../common/decorators/user.decorator';
import { EvaluationDto } from '../../../libs/dtos/assessment/evaluation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

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

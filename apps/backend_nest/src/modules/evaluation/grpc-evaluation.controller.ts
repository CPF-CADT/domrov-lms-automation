// import { Controller, Logger, UseGuards } from '@nestjs/common';
// import { GrpcMethod, RpcException } from '@nestjs/microservices';
// import * as grpcJs from '@grpc/grpc-js';
// import * as evaluation from '../../libs/interfaces/evaluation';
// import * as submission from '../../libs/interfaces/submission';
// import { EvaluationService } from './evaluation.service';
// import { SubmissionService } from '../assessment/submission.service';

// @Controller()
// export class GrpcEvaluationController {
//     private readonly logger = new Logger(GrpcEvaluationController.name);

//     constructor(
//         private readonly evaluationService: EvaluationService,
//         private readonly submissionService: SubmissionService,
//     ) { }

//     // ==================== EVALUATE SUBMISSION ====================
//     @GrpcMethod('EvaluateWithAI', 'EvaluateSubmission')
//     async evaluateSubmission(
//         data: evaluation.EvaluateRequest,
//         metadata: grpcJs.Metadata,
//         call: grpcJs.ServerUnaryCall<any, any>,
//     ): Promise<evaluation.EvaluateResponse> {
//         this.logger.log(`EvaluateSubmission request: ${JSON.stringify(data)}`);
//         try {
//             const { submission_id, score, feedback, input_token, output_token, ai_model } = data;

//             if (!submission_id || !score?.value?.length) {
//                 return { success: false, message: 'Invalid submission or empty score criteria' };
//             }

//             const serverMetadata = new grpcJs.Metadata();
//             serverMetadata.add('evaluated-by', 'nestjs-grpc');
//             call.sendMetadata(serverMetadata);

//             await this.evaluationService.aiEvaluate(
//                 Number(submission_id), feedback, score.value, input_token, output_token, ai_model
//             );

//             return { success: true, message: `Submission ${submission_id} evaluated successfully` };
//         } catch (err: unknown) {
//             const message = err instanceof Error ? err.message : 'Unknown error';
//             return { success: false, message };
//         }
//     }

//     // ==================== NOTIFY LLM ERROR / INSUFFICIENT BALANCE ====================
//     @GrpcMethod('EvaluateWithAI', 'NotifyUserAiModelInsufficient')
//     async notifyUserAiModelInsufficient(
//         data: evaluation.NotifyUserAiModelInsufficientRequest,
//         metadata: grpcJs.Metadata,
//         call: grpcJs.ServerUnaryCall<any, any>,
//     ): Promise<evaluation.NotifyUserAiModelInsufficientResponse> {
//         this.logger.log(`NotifyUserAiModelInsufficient request: ${JSON.stringify(data)}`);
//         try {
//             const { submission_id, raw_response_message } = data;

//             if (!submission_id || !raw_response_message) {
//                 return { success: false, message: 'Missing submission_id or raw_response_message' };
//             }

//             await this.evaluationService.handleAiModelInsufficient(submission_id, raw_response_message);
//             return { success: true, message: `AI model disabled for submission ${submission_id}` };
//         } catch (err: unknown) {
//             const message = err instanceof Error ? err.message : 'Unknown error';
//             this.logger.error(`Failed to notify AI model insufficiency: ${message}`);
//             return { success: false, message };
//         }
//     }

//     // ==================== GET SUBMISSION ====================
//     @GrpcMethod('SubmissionService', 'GetSubmission')
//     async getSubmission(
//         data: submission.SubmissionContentRequest,
//     ): Promise<submission.SubmissionContentResponse> {
//         try {
//             return await this.submissionService.getSubmissionDetails(Number(data.submission_id));
//         } catch {
//             throw new RpcException({ code: grpcJs.status.NOT_FOUND, message: `Submission not found` });
//         }
//     }

//     // ==================== GET SUBMISSION RESOURCE ====================
//     @GrpcMethod('SubmissionService', 'GetSubmissionResource')
//     async getSubmissionResource(
//         data: submission.SubmissionContentRequest,
//     ): Promise<submission.SubmissionContentResource> {
//         try {
//             return await this.submissionService.getSubmissionResoucrs(Number(data.submission_id));
//         } catch {
//             throw new RpcException({ code: grpcJs.status.NOT_FOUND, message: `Submission not found` });
//         }
//     }
// }
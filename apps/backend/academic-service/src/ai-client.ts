import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EvaluationPublisher } from './messaging/rabbitmq';

export interface EvaluationRequest { submissionId: string; assignmentId: string; userId: string; resourceId: string; language?: string; }
export interface EvaluationClient { requestEvaluation(input: EvaluationRequest): Promise<{ evaluationId: string; status: 'queued' | 'pending' }>; }

@Injectable()
export class AsyncEvaluationClient implements EvaluationClient {
  constructor(private readonly publisher: EvaluationPublisher) {}
  async requestEvaluation(input: EvaluationRequest) {
    const evaluationId = randomUUID();
    await this.publisher.publishRequested({ ...input, evaluationId });
    return { evaluationId, status: 'queued' as const };
  }
}

import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ClientProxy, Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission } from '../entities';

export const AI_RABBITMQ_CLIENT = 'AI_RABBITMQ_CLIENT';

export interface RabbitEnvelope<T> {
  messageId: string;
  correlationId: string;
  idempotencyKey: string;
  eventType: string;
  occurredAt: string;
  producer: string;
  payload: T;
}

export interface EvaluationRequested {
  evaluationId: string;
  submissionId: string;
  assignmentId: string;
  userId: string;
  resourceId: string;
  language?: string;
}

export interface EvaluationCompleted {
  evaluationId: string;
  submissionId: string;
  status: string;
  score?: number;
  feedback?: string;
  result?: { score?: number; feedback?: string };
}

@Injectable()
export class EvaluationPublisher {
  private readonly logger = new Logger(EvaluationPublisher.name);

  constructor(@Optional() @Inject(AI_RABBITMQ_CLIENT) private readonly client?: ClientProxy) {}

  async publishRequested(payload: EvaluationRequested): Promise<void> {
    if (!this.client) throw new Error('RabbitMQ AI client is not configured');
    const message: RabbitEnvelope<EvaluationRequested> = {
      messageId: payload.evaluationId,
      correlationId: payload.evaluationId,
      idempotencyKey: `evaluation:${payload.evaluationId}`,
      eventType: 'evaluation.requested',
      occurredAt: new Date().toISOString(),
      producer: 'academic-service',
      payload,
    };
    await firstValueFrom(this.client.emit('evaluation.requested', message).pipe(timeout(5000)));
  }

  reportPublishFailure(error: unknown) {
    this.logger.warn(`Unable to publish evaluation.requested: ${error instanceof Error ? error.message : String(error)}`);
  }
}

@Injectable()
export class EvaluationEventsController {
  private readonly logger = new Logger(EvaluationEventsController.name);

  constructor(@InjectRepository(Submission) private readonly submissions: Repository<Submission>) {}

  @EventPattern('evaluation.completed')
  async completed(@Payload() envelope: RabbitEnvelope<EvaluationCompleted> | EvaluationCompleted, @Ctx() context: RmqContext) {
    await this.handleResult(this.normalize(envelope), context, 'COMPLETED');
  }

  @EventPattern('evaluation.failed')
  async failed(@Payload() envelope: RabbitEnvelope<EvaluationCompleted> | EvaluationCompleted, @Ctx() context: RmqContext) {
    await this.handleResult(this.normalize(envelope), context, 'FAILED');
  }

  private async handleResult(envelope: RabbitEnvelope<EvaluationCompleted>, context: RmqContext, fallbackStatus: string) {
    try {
      await this.applyResult(envelope.payload, fallbackStatus);
      context.getChannelRef().ack(context.getMessage());
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : String(error));
      context.getChannelRef().nack(context.getMessage(), false, false);
      throw error;
    }
  }

  private async applyResult(payload: EvaluationCompleted, fallbackStatus: string) {
    const submission = await this.submissions.findOneBy({ id: payload.submissionId });
    if (!submission) {
      this.logger.warn(`Ignoring evaluation result for unknown submission ${payload.submissionId}`);
      return;
    }
    // Idempotent consumer: a completed/failed result must not overwrite a newer terminal result.
    if (['COMPLETED', 'FAILED', 'GRADED'].includes(String(submission.status).toUpperCase())) return;
    const result = payload.result ?? {};
    submission.evaluationId = payload.evaluationId || submission.evaluationId;
    submission.status = payload.status || fallbackStatus;
    if (payload.score !== undefined || result.score !== undefined) submission.score = payload.score ?? result.score;
    if (payload.feedback !== undefined || result.feedback !== undefined) submission.feedback = payload.feedback ?? result.feedback;
    await this.submissions.save(submission);
  }

  private normalize(message: RabbitEnvelope<EvaluationCompleted> | EvaluationCompleted): RabbitEnvelope<EvaluationCompleted> {
    if ('payload' in message && message.payload) return message as RabbitEnvelope<EvaluationCompleted>;
    const result = message as EvaluationCompleted;
    return {
      messageId: result.evaluationId,
      correlationId: result.evaluationId,
      idempotencyKey: `evaluation:${result.evaluationId}`,
      eventType: result.status === 'failed' ? 'evaluation.failed' : 'evaluation.completed',
      occurredAt: new Date().toISOString(),
      producer: 'ai-service',
      payload: result,
    };
  }
}

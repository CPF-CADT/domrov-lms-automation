import { amqpHeaders, withMessagingSpan } from '../telemetry';
import { Controller, Inject, Injectable, Optional } from '@nestjs/common';
import { ClientProxy, Ctx, EventPattern, Payload, RmqContext, RmqRecordBuilder } from '@nestjs/microservices';
import { firstValueFrom, timeout, TimeoutError } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Submission } from '../entities';
import { getLogContext, logger, markErrorLogged, newId, safeId, withLogContext } from '../logging';

export const AI_RABBITMQ_CLIENT = 'AI_RABBITMQ_CLIENT';
export const EXECUTION_RABBITMQ_CLIENT = 'EXECUTION_RABBITMQ_CLIENT';
const PUBLISH_TIMEOUT_MS = 5_000;

export interface RabbitEnvelope<T> {
  messageId: string;
  correlationId: string;
  idempotencyKey: string;
  eventType: string;
  schemaVersion: number;
  occurredAt: string;
  producer: string;
  payload: T;
}

export interface EvaluationRequested {
  evaluationId: string;
  submissionId: string;
  assignmentId: string;
  userId: string;
  billingUserId: string;
  resourceId: string;
  language?: string;
  assignmentTitle: string;
  instruction: string;
  maxScore: number;
  rubric: Array<{ definition: string; criterion?: string; totalScore: number }>;
  files: Array<{ path: string; content: string }>;
}

export interface EvaluationCompleted {
  evaluationId: string;
  submissionId: string;
  status: string;
  score?: number;
  feedback?: string;
  result?: { score?: number; feedback?: string };
}

export interface CodeExecutionFile { path: string; content: string; }
export interface CodeExecutionRequested {
  executionId: string;
  submissionId: string;
  snapshotId?: string;
  teacherId: string;
  language: string;
  command: string;
  stdin?: string;
  files: CodeExecutionFile[];
  limits?: { timeoutMs?: number; memoryMb?: number; cpuLimit?: string; maxOutputBytes?: number };
}

@Injectable()
export class EvaluationPublisher {
  constructor(
    @Optional() @Inject(AI_RABBITMQ_CLIENT) private readonly client?: ClientProxy,
    @Optional() @Inject(EXECUTION_RABBITMQ_CLIENT) private readonly executionClient?: ClientProxy,
  ) {}

  async publishRequested(payload: EvaluationRequested): Promise<void> {
    await this.publish(this.client, {
      messageId: payload.evaluationId,
      correlationId: payload.evaluationId,
      idempotencyKey: `evaluation:${payload.evaluationId}`,
      eventType: 'evaluation.requested',
      schemaVersion: 1,
      occurredAt: new Date().toISOString(),
      producer: 'academic-service',
      payload,
    }, 'RabbitMQ AI client is not configured');
  }

  async publishCodeExecution(payload: CodeExecutionRequested): Promise<void> {
    await this.publish(this.executionClient, {
      messageId: payload.executionId,
      correlationId: payload.executionId,
      idempotencyKey: `code-execution:${payload.executionId}`,
      eventType: 'code.execution.requested',
      schemaVersion: 1,
      occurredAt: new Date().toISOString(),
      producer: 'academic-service',
      payload,
    }, 'RabbitMQ execution client is not configured');
  }

  private async publish<T>(client: ClientProxy | undefined, message: RabbitEnvelope<T>, configurationError: string) {
    const startedAt = performance.now();
    const request = getLogContext();
    const correlationId = safeId(request.correlation_id) ?? safeId(message.correlationId) ?? newId();
    const requestId = safeId(request.request_id);
    const envelope = { ...message, correlationId };
    const fields = { routing_key: message.eventType, message_id: message.messageId };

    await withMessagingSpan('publish', message.eventType, undefined, () => withLogContext({ request_id: requestId, correlation_id: correlationId }, async () => {
      try {
        if (!client) throw new Error(configurationError);
        const headers = amqpHeaders(requestId);
        const record = Object.keys(headers).length
          ? new RmqRecordBuilder(envelope).setOptions({ headers }).build()
          : envelope;
        await firstValueFrom(client.emit(message.eventType, record).pipe(timeout(PUBLISH_TIMEOUT_MS)));
        logger.info('rabbitmq.publish.completed', 'RabbitMQ event published', { ...fields, duration_ms: Math.round(performance.now() - startedAt) });
      } catch (error) {
        const duration_ms = Math.round(performance.now() - startedAt);
        if (error instanceof TimeoutError) {
          logger.warn('rabbitmq.publish.timeout', 'RabbitMQ publish timed out', { ...fields, duration_ms, outcome: 'timeout' });
        } else {
          logger.error('rabbitmq.publish.failed', 'RabbitMQ publish failed', { ...fields, duration_ms, error_code: client ? 'PUBLISH_FAILED' : 'CLIENT_UNAVAILABLE' });
        }
        markErrorLogged(error);
        throw error;
      }
    }));
  }
}

@Controller()
export class EvaluationEventsController {
  constructor(@InjectRepository(Submission) private readonly submissions: Repository<Submission>) {}

  @EventPattern('evaluation.completed')
  async completed(@Payload() envelope: RabbitEnvelope<EvaluationCompleted> | EvaluationCompleted, @Ctx() context: RmqContext) {
    await this.handleResult(this.normalize(envelope), context, 'COMPLETED', 'evaluation.completed');
  }

  @EventPattern('evaluation.failed')
  async failed(@Payload() envelope: RabbitEnvelope<EvaluationCompleted> | EvaluationCompleted, @Ctx() context: RmqContext) {
    await this.handleResult(this.normalize(envelope), context, 'FAILED', 'evaluation.failed');
  }

  private async handleResult(envelope: RabbitEnvelope<EvaluationCompleted>, context: RmqContext, fallbackStatus: string, eventType: string) {
    const startedAt = performance.now();
    const delivery = context.getMessage();
    const requestId = safeId(delivery?.properties?.headers?.['x-request-id']);
    const correlationId = safeId(envelope.correlationId) ?? safeId(envelope.payload?.evaluationId) ?? newId();
    const fields = { routing_key: eventType, message_id: envelope.messageId, redelivered: delivery?.fields?.redelivered };

    await withMessagingSpan('process', eventType, delivery?.properties?.headers, () => withLogContext({ request_id: requestId, correlation_id: correlationId }, async () => {
      try {
        const outcome = await this.applyResult(envelope.payload, fallbackStatus);
        context.getChannelRef().ack(delivery);
        const result = { ...fields, outcome, duration_ms: Math.round(performance.now() - startedAt) };
        if (outcome === 'missing_submission') {
          logger.warn('rabbitmq.consume.ignored', 'Evaluation result has no matching submission', result);
        } else if (outcome === 'already_terminal') {
          logger.debug('rabbitmq.consume.ignored', 'Submission already has a terminal result', result);
        } else {
          logger.info('rabbitmq.consume.completed', 'Evaluation result stored', result);
        }
      } catch (error) {
        logger.error('rabbitmq.consume.failed', 'Evaluation result could not be stored', { ...fields, requeue: false, duration_ms: Math.round(performance.now() - startedAt) });
        markErrorLogged(error);
        context.getChannelRef().nack(delivery, false, false);
        throw error;
      }
    }));
  }

  private async applyResult(payload: EvaluationCompleted, fallbackStatus: string) {
    const submission = await this.submissions.findOneBy({ id: payload.submissionId });
    if (!submission) return 'missing_submission';
    // Idempotent consumer: a completed/failed result must not overwrite a newer terminal result.
    if (['COMPLETED', 'FAILED', 'GRADED'].includes(String(submission.status).toUpperCase())) return 'already_terminal';
    const result = payload.result ?? {};
    submission.evaluationId = payload.evaluationId || submission.evaluationId;
    submission.status = payload.status || fallbackStatus;
    if (payload.score !== undefined || result.score !== undefined) submission.score = payload.score ?? result.score;
    if (payload.feedback !== undefined || result.feedback !== undefined) submission.feedback = payload.feedback ?? result.feedback;
    await this.submissions.save(submission);
    return 'stored';
  }

  private normalize(message: RabbitEnvelope<EvaluationCompleted> | EvaluationCompleted): RabbitEnvelope<EvaluationCompleted> {
    if ('payload' in message && message.payload) return message as RabbitEnvelope<EvaluationCompleted>;
    const result = message as EvaluationCompleted;
    return {
      messageId: result.evaluationId,
      correlationId: result.evaluationId,
      idempotencyKey: `evaluation:${result.evaluationId}`,
      eventType: result.status === 'failed' ? 'evaluation.failed' : 'evaluation.completed',
      schemaVersion: 1,
      occurredAt: new Date().toISOString(),
      producer: 'academic-service',
      payload: result,
    };
  }
}

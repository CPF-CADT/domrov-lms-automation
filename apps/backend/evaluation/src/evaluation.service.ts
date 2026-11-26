import { amqpHeaders, withMessagingSpan } from './telemetry';
import { ConflictException, Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, RmqRecordBuilder } from '@nestjs/microservices';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import { firstValueFrom, timeout, TimeoutError } from 'rxjs';
import { Envelope, EvaluationRequest, EvaluationResult } from './contracts';
import { Evaluation } from './evaluation.entity';
import { FreeEvaluationQuota } from './free-evaluation-quota.entity';
import { getLogContext, logger, markErrorLogged } from './logging';
import { OllamaEvaluationService } from './ollama-evaluation.service';

interface CreditReservationReply {
  reservationId?: string;
  data?: { reservationId?: string };
}

@Injectable()
export class EvaluationService {
  private readonly monthlyFreeLimit: number;
  private readonly paymentEnabled: boolean;

  constructor(
    @InjectRepository(Evaluation) private readonly repository: Repository<Evaluation>,
    @InjectRepository(FreeEvaluationQuota) private readonly quotas: Repository<FreeEvaluationQuota>,
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject('EVALUATION_EVENTS') private readonly events: ClientProxy,
    @Inject('PAYMENT_COMMANDS') private readonly payment: ClientProxy,
    private readonly ollama: OllamaEvaluationService,
    @Optional() config?: ConfigService,
  ) {
    this.monthlyFreeLimit = Math.max(0, Number(config?.get<string>('FREE_EVALUATIONS_PER_MONTH') ?? 10));
    this.paymentEnabled = config?.get<string>('EVALUATION_PAYMENT_MODE') === 'enabled';
  }

  async request(request: EvaluationRequest): Promise<Evaluation> {
    const startedAt = performance.now();
    const evaluationId = request.evaluationId ?? randomUUID();
    const existing = await this.repository.findOneBy({ evaluationId });
    if (existing) {
      logger.debug('evaluation.request_skipped', 'Evaluation request already exists');
      return existing;
    }
    const record = this.repository.create({ ...request, billingUserId: request.billingUserId ?? request.userId, evaluationId, status: 'queued', attempts: 0 });
    await this.repository.save(record);
    await this.publish('evaluation.job', { ...request, evaluationId });
    logger.info('evaluation.queued', 'Evaluation job queued', { duration_ms: performance.now() - startedAt });
    return record;
  }

  async process(evaluationId: string, request: EvaluationRequest): Promise<void> {
    const startedAt = performance.now();
    const claimed = await this.dataSource.transaction(async (manager) => {
      const record = await manager.findOne(Evaluation, { where: { evaluationId }, lock: { mode: 'pessimistic_write' } });
      if (!record || ['completed', 'failed', 'running'].includes(record.status)) return null;
      record.status = 'running';
      record.attempts += 1;
      return manager.save(record);
    });
    if (!claimed) {
      logger.debug('evaluation.job_skipped', 'Evaluation job could not be claimed');
      return;
    }
    logger.info('evaluation.started', 'Evaluation processing started', { attempt: claimed.attempts });

    let reservationId: string | undefined;
    let freePeriod: string | undefined;
    let operation = 'reserve_allowance';
    const billingUserId = claimed.billingUserId ?? claimed.userId;
    try {
      if (this.paymentEnabled) {
        try {
          freePeriod = await this.reserveFreeEvaluation(billingUserId);
        } catch (error) {
          if (!(error instanceof ConflictException)) throw error;
          logger.debug('evaluation.allowance_unavailable', 'Free evaluation allowance unavailable');
        }
      }
      if (!freePeriod && this.paymentEnabled) {
        operation = 'reserve_credits';
        const result = await this.sendCreditCommand<CreditReservationReply>(
          'credit.reserve',
          { userId: billingUserId, amount: Number(process.env.EVALUATION_CREDIT_COST ?? 1), referenceId: evaluationId },
          evaluationId,
        );
        reservationId = result?.reservationId ?? result?.data?.reservationId;
        if (!reservationId) throw new Error('CREDIT_RESERVATION_FAILED');
      } else if (!freePeriod) {
        freePeriod = await this.reserveFreeEvaluation(billingUserId);
      }

      operation = 'evaluate_submission';
      const output = await this.ollama.evaluate({
        assignmentTitle: request.assignmentTitle,
        instruction: request.instruction,
        language: request.language ?? claimed.language,
        maxScore: request.maxScore,
        rubric: request.rubric ?? [],
        files: request.files ?? [],
      });
      claimed.status = 'completed';
      claimed.score = output.score;
      claimed.feedback = output.feedback;
      claimed.provider = 'ollama';
      claimed.model = output.model;
      claimed.promptTokens = output.promptTokens;
      claimed.completionTokens = output.completionTokens;
      operation = 'persist_completed';
      await this.repository.save(claimed);

      operation = 'finalize_allowance';
      if (reservationId) await this.paymentTransition(reservationId, 'committed', evaluationId);
      if (freePeriod) await this.finishFreeEvaluation(billingUserId, freePeriod, true);
      operation = 'publish_completed';
      await this.publishResult(claimed, 'evaluation.completed');
      logger.info('evaluation.completed', 'Evaluation processing completed', { duration_ms: performance.now() - startedAt, attempt: claimed.attempts });
    } catch (error) {
      const allowanceUnavailable = operation === 'reserve_allowance' && error instanceof ConflictException;
      const failure = {
        operation,
        error_code: error instanceof TimeoutError ? 'DEPENDENCY_TIMEOUT' : allowanceUnavailable ? 'ALLOWANCE_UNAVAILABLE' : 'EVALUATION_FAILED',
        duration_ms: performance.now() - startedAt,
        attempt: claimed.attempts,
      };
      if (allowanceUnavailable) {
        logger.warn('evaluation.failed', 'Evaluation was rejected because the allowance is unavailable', failure);
      } else {
        logger.error('evaluation.failed', 'Evaluation processing failed', failure);
      }
      if (reservationId) await this.paymentTransition(reservationId, 'released', evaluationId).catch(() => undefined);
      if (freePeriod) await this.finishFreeEvaluation(billingUserId, freePeriod, false).catch(() => {
        logger.error('evaluation.allowance_release_failed', 'Could not release free evaluation allowance', { error_code: 'ALLOWANCE_RELEASE_FAILED' });
      });
      claimed.status = 'failed';
      claimed.errorCode = error instanceof Error ? error.message : 'EVALUATION_FAILED';
      claimed.feedback = error instanceof ConflictException ? error.message : 'Evaluation failed. Please try again later.';
      await this.repository.save(claimed);
      await this.publishResult(claimed, 'evaluation.failed');
    }
  }

  async find(evaluationId: string) { return this.repository.findOneBy({ evaluationId }); }
  async list() { return this.repository.find({ order: { updatedAt: 'DESC' } }); }
  async freeQuota(userId: string) {
    const period = new Date().toISOString().slice(0, 7);
    const quota = await this.quotas.findOneBy({ userId, period });
    const used = quota?.used ?? 0;
    const reserved = quota?.reserved ?? 0;
    return { provider: 'ollama', model: process.env.OLLAMA_MODEL ?? 'qwen2.5:7b-instruct', period, limit: this.monthlyFreeLimit, used, remaining: Math.max(0, this.monthlyFreeLimit - used - reserved), reserved };
  }
  async health() {
    const startedAt = performance.now();
    try {
      await this.repository.query('SELECT 1');
      return true;
    } catch (error) {
      logger.error('dependency.check.failed', 'PostgreSQL readiness check failed', {
        dependency: 'postgres',
        duration_ms: performance.now() - startedAt,
        error_code: 'POSTGRES_READINESS_FAILED',
      });
      markErrorLogged(error);
      throw error;
    }
  }

  private async reserveFreeEvaluation(userId: string): Promise<string> {
    if (this.monthlyFreeLimit <= 0) throw new ConflictException('Free AI evaluations are not enabled');
    const period = new Date().toISOString().slice(0, 7);
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        'INSERT INTO "free_evaluation_quota" ("user_id", "period", "used", "reserved") VALUES ($1, $2, 0, 0) ON CONFLICT ("user_id", "period") DO NOTHING',
        [userId, period],
      );
      const quota = await manager.findOne(FreeEvaluationQuota, { where: { userId, period }, lock: { mode: 'pessimistic_write' } });
      if (!quota) throw new Error('FREE_QUOTA_UNAVAILABLE');
      if (quota.used + quota.reserved >= this.monthlyFreeLimit) throw new ConflictException(`Monthly free evaluation limit reached (${this.monthlyFreeLimit}). Try again next month.`);
      quota.reserved += 1;
      await manager.save(quota);
      return period;
    });
  }

  private async finishFreeEvaluation(userId: string, period: string, completed: boolean) {
    await this.dataSource.transaction(async (manager) => {
      const quota = await manager.findOne(FreeEvaluationQuota, { where: { userId, period }, lock: { mode: 'pessimistic_write' } });
      if (!quota || quota.reserved < 1) return;
      quota.reserved -= 1;
      if (completed) quota.used += 1;
      await manager.save(quota);
    });
  }

  private async paymentTransition(reservationId: string, status: 'committed' | 'released', evaluationId: string) {
    await this.sendCreditCommand(`credit.${status}`, { reservationId }, evaluationId);
  }

  private async sendCreditCommand<T>(routingKey: string, payload: object, evaluationId: string): Promise<T> {
    return withMessagingSpan('publish', routingKey, undefined, async () => {
      const startedAt = performance.now();
      const fields = { dependency: 'payment-service', routing_key: routingKey };
      try {
        const result = await firstValueFrom(this.payment.send<T>(routingKey, this.envelope(routingKey, payload, `${routingKey}:${evaluationId}`)).pipe(timeout(10_000)));
        logger.debug('rabbitmq.command.completed', 'Credit command reply received', { ...fields, duration_ms: performance.now() - startedAt });
        return result;
      } catch (error) {
        const timedOut = error instanceof TimeoutError;
        logger.warn(timedOut ? 'rabbitmq.command.timeout' : 'rabbitmq.command.failed', 'Credit command failed', {
          ...fields,
          error_code: timedOut ? 'CREDIT_COMMAND_TIMEOUT' : 'CREDIT_COMMAND_FAILED',
          duration_ms: performance.now() - startedAt,
        });
        throw error;
      }
    });
  }

  private async publishResult(record: Evaluation, eventType: 'evaluation.completed' | 'evaluation.failed') {
    const result: EvaluationResult = { evaluationId: record.evaluationId, submissionId: record.submissionId, userId: record.userId, status: record.status as 'completed' | 'failed', score: record.score, feedback: record.feedback, errorCode: record.errorCode };
    await this.publish(eventType, result);
  }

  private async publish<T extends { evaluationId?: string }>(eventType: string, payload: T) {
    return withMessagingSpan('publish', eventType, undefined, async () => {
      const startedAt = performance.now();
      const fields = { dependency: 'rabbitmq', routing_key: eventType };
      const idempotencyKey = payload.evaluationId == null ? undefined : `${eventType}:${payload.evaluationId}`;
      try {
        await firstValueFrom(this.events.emit(eventType, this.envelope(eventType, payload, idempotencyKey)).pipe(timeout(5000)));
        logger.debug('rabbitmq.publish.completed', 'Evaluation event published', { ...fields, duration_ms: performance.now() - startedAt });
      } catch (error) {
        const timedOut = error instanceof TimeoutError;
        logger.warn(timedOut ? 'rabbitmq.publish.timeout' : 'rabbitmq.publish.failed', 'Evaluation event publication failed', {
          ...fields,
          error_code: timedOut ? 'RABBITMQ_PUBLISH_TIMEOUT' : 'RABBITMQ_PUBLISH_FAILED',
          duration_ms: performance.now() - startedAt,
        });
        throw error;
      }
    });
  }

  private envelope<T>(eventType: string, payload: T, idempotencyKey?: string) {
    const id = randomUUID();
    const context = getLogContext();
    const envelope: Envelope<T> = { messageId: id, correlationId: context?.correlation_id ?? id, idempotencyKey: idempotencyKey ?? `${eventType}:${id}`, eventType, schemaVersion: 1, occurredAt: new Date().toISOString(), producer: 'evaluation-service', payload };
    const record = new RmqRecordBuilder(envelope);
    const headers = amqpHeaders(context.request_id);
    if (Object.keys(headers).length) record.setOptions({ headers });
    return record.build();
  }
}

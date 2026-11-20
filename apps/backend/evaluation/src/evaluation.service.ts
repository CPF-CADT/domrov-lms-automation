import { ConflictException, Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy } from '@nestjs/microservices';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import { firstValueFrom, timeout } from 'rxjs';
import { Envelope, EvaluationRequest, EvaluationResult } from './contracts';
import { Evaluation } from './evaluation.entity';
import { FreeEvaluationQuota } from './free-evaluation-quota.entity';
import { OllamaEvaluationService } from './ollama-evaluation.service';

@Injectable()
export class EvaluationService {
  private readonly logger = new Logger(EvaluationService.name);
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
    const evaluationId = request.evaluationId ?? randomUUID();
    const existing = await this.repository.findOneBy({ evaluationId });
    if (existing) return existing;
    const record = this.repository.create({ ...request, billingUserId: request.billingUserId ?? request.userId, evaluationId, status: 'queued', attempts: 0 });
    await this.repository.save(record);
    await firstValueFrom(this.events.emit('evaluation.job', this.envelope('evaluation.job', { ...request, evaluationId })).pipe(timeout(5000)));
    return record;
  }

  async process(evaluationId: string, request: EvaluationRequest): Promise<void> {
    const claimed = await this.dataSource.transaction(async (manager) => {
      const record = await manager.findOne(Evaluation, { where: { evaluationId }, lock: { mode: 'pessimistic_write' } });
      if (!record || ['completed', 'failed', 'running'].includes(record.status)) return null;
      record.status = 'running';
      record.attempts += 1;
      return manager.save(record);
    });
    if (!claimed) return;

    let reservationId: string | undefined;
    let freePeriod: string | undefined;
    const billingUserId = claimed.billingUserId ?? claimed.userId;
    try {
      if (this.paymentEnabled) {
        try {
          freePeriod = await this.reserveFreeEvaluation(billingUserId);
        } catch (error) {
          if (!(error instanceof ConflictException)) throw error;
          this.logger.debug(`Free evaluation allowance unavailable for ${billingUserId}; using paid credits`);
        }
      }
      if (!freePeriod && this.paymentEnabled) {
        const result = await firstValueFrom(this.payment.send('credit.reserve', this.envelope(
          'credit.reserve',
          { userId: billingUserId, amount: Number(process.env.EVALUATION_CREDIT_COST ?? 1), referenceId: evaluationId },
          `credit.reserve:${evaluationId}`,
        )).pipe(timeout(10_000)));
        reservationId = result?.reservationId ?? result?.data?.reservationId;
        if (!reservationId) throw new Error('CREDIT_RESERVATION_FAILED');
      } else if (!freePeriod) {
        freePeriod = await this.reserveFreeEvaluation(billingUserId);
      }

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
      await this.repository.save(claimed);

      if (reservationId) await this.paymentTransition(reservationId, 'committed', evaluationId);
      if (freePeriod) await this.finishFreeEvaluation(billingUserId, freePeriod, true);
      await this.publishResult(claimed, 'evaluation.completed');
    } catch (error) {
      if (reservationId) await this.paymentTransition(reservationId, 'released', evaluationId).catch((releaseError) => this.logger.error('Could not release evaluation credits', releaseError));
      if (freePeriod) await this.finishFreeEvaluation(billingUserId, freePeriod, false).catch((releaseError) => this.logger.error('Could not release free evaluation quota', releaseError));
      claimed.status = 'failed';
      claimed.errorCode = error instanceof Error ? error.message : 'EVALUATION_FAILED';
      claimed.feedback = error instanceof ConflictException ? error.message : 'Evaluation failed. Please try again later.';
      await this.repository.save(claimed);
      await this.publishResult(claimed, 'evaluation.failed');
      this.logger.error(`Evaluation ${evaluationId} failed`, error);
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
  async health() { await this.repository.query('SELECT 1'); return true; }

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
    await firstValueFrom(this.payment.send(`credit.${status}`, this.envelope(
      `credit.${status}`,
      { reservationId },
      `credit.${status}:${evaluationId}`,
    )).pipe(timeout(10_000)));
  }

  private async publishResult(record: Evaluation, eventType: 'evaluation.completed' | 'evaluation.failed') {
    const result: EvaluationResult = { evaluationId: record.evaluationId, submissionId: record.submissionId, userId: record.userId, status: record.status as 'completed' | 'failed', score: record.score, feedback: record.feedback, errorCode: record.errorCode };
    await firstValueFrom(this.events.emit(eventType, this.envelope(eventType, result)).pipe(timeout(5000)));
  }

  private envelope<T>(eventType: string, payload: T, idempotencyKey?: string): Envelope<T> {
    const id = randomUUID();
    return { messageId: id, correlationId: id, idempotencyKey: idempotencyKey ?? `${eventType}:${(payload as any).evaluationId ?? id}`, eventType, schemaVersion: 1, occurredAt: new Date().toISOString(), producer: 'evaluation-service', payload };
  }
}

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { firstValueFrom, timeout } from 'rxjs';
import { Repository } from 'typeorm';
import { Envelope, EvaluationRequest, EvaluationResult } from './contracts';
import { Evaluation } from './evaluation.entity';
import { MockRunnerService } from './mock-runner.service';

@Injectable()
export class EvaluationService {
  private readonly logger = new Logger(EvaluationService.name);
  constructor(
    @InjectRepository(Evaluation) private readonly repository: Repository<Evaluation>,
    @Inject('EVALUATION_EVENTS') private readonly events: ClientProxy,
    @Inject('PAYMENT_COMMANDS') private readonly payment: ClientProxy,
    private readonly runner: MockRunnerService,
  ) {}

  async request(request: EvaluationRequest): Promise<Evaluation> {
    const evaluationId = request.evaluationId ?? randomUUID();
    const existing = await this.repository.findOneBy({ evaluationId });
    if (existing) return existing;
    const record = this.repository.create({ ...request, evaluationId, status: 'queued', attempts: 0 });
    await this.repository.save(record);
    await firstValueFrom(this.events.emit('evaluation.job', this.envelope('evaluation.job', { ...request, evaluationId })).pipe(timeout(5000)));
    return record;
  }

  async process(evaluationId: string): Promise<void> {
    const record = await this.repository.findOneBy({ evaluationId });
    if (!record || ['completed', 'failed'].includes(record.status)) return;
    record.status = 'running'; record.attempts += 1; await this.repository.save(record);
    let reservationId: string | undefined;
    try {
      if (process.env.EVALUATION_PAYMENT_MODE !== 'disabled') {
        const result = await firstValueFrom(this.payment.send('credit.reserve', this.envelope('credit.reserve', {
          userId: record.userId, amount: Number(process.env.EVALUATION_CREDIT_COST ?? 1), referenceId: evaluationId,
        })).pipe(timeout(5000)));
        reservationId = result?.reservationId ?? result?.data?.reservationId;
      }
      const output = await this.runner.run({ language: record.language, resourceKey: record.resourceKey });
      record.status = 'completed'; record.score = output.score; record.feedback = output.feedback; await this.repository.save(record);
      if (reservationId) await firstValueFrom(this.payment.emit('credit.commit', this.envelope('credit.commit', { reservationId })).pipe(timeout(5000)));
      await this.publishResult(record, 'evaluation.completed');
    } catch (error) {
      record.status = 'failed'; record.errorCode = error instanceof Error ? error.message : 'EVALUATION_FAILED'; record.feedback = 'Evaluation failed'; await this.repository.save(record);
      if (reservationId) await firstValueFrom(this.payment.emit('credit.release', this.envelope('credit.release', { reservationId })).pipe(timeout(5000)));
      await this.publishResult(record, 'evaluation.failed');
      this.logger.error(`Evaluation ${evaluationId} failed`, error);
    }
  }

  async find(evaluationId: string) { return this.repository.findOneBy({ evaluationId }); }
  async list() { return this.repository.find({ order: { updatedAt: 'DESC' } }); }
  async health() { await this.repository.query('SELECT 1'); return true; }

  private async publishResult(record: Evaluation, eventType: 'evaluation.completed' | 'evaluation.failed') {
    const result: EvaluationResult = { evaluationId: record.evaluationId, submissionId: record.submissionId, userId: record.userId, status: record.status as 'completed' | 'failed', score: record.score, feedback: record.feedback, errorCode: record.errorCode };
    await firstValueFrom(this.events.emit(eventType, this.envelope(eventType, result)).pipe(timeout(5000)));
  }
  private envelope<T>(eventType: string, payload: T): Envelope<T> { const id = randomUUID(); return { messageId: id, correlationId: id, idempotencyKey: `${eventType}:${(payload as any).evaluationId ?? id}`, eventType, schemaVersion: 1, occurredAt: new Date().toISOString(), producer: 'evaluation-service', payload }; }
}

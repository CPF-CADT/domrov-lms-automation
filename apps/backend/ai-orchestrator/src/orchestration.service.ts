import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { randomUUID } from 'node:crypto';
import { firstValueFrom, timeout } from 'rxjs';
import {
  EvaluationJob,
  EvaluationRequested,
  EvaluationResult,
  OrchestrationRecord,
} from './contracts';

@Injectable()
export class OrchestrationService {
  private readonly logger = new Logger(OrchestrationService.name);
  private readonly records = new Map<string, OrchestrationRecord>();

  constructor(
    @Inject('AI_WORKER_EVENTS') private readonly workerClient: ClientProxy,
  ) {}

  async requestEvaluation(request: EvaluationRequested): Promise<OrchestrationRecord> {
    const evaluationId = request.evaluationId ?? randomUUID();
    const existing = this.records.get(evaluationId);
    if (existing) return existing;

    const now = new Date().toISOString();
    const record: OrchestrationRecord = {
      evaluationId,
      correlationId: request.correlationId || evaluationId,
      submissionId: request.submissionId,
      userId: request.userId,
      status: 'queued',
      createdAt: now,
      updatedAt: now,
    };
    this.records.set(evaluationId, record);

    const job: EvaluationJob = {
      ...request,
      evaluationId,
      jobId: randomUUID(),
      eventType: 'evaluation.job',
    };

    try {
      await firstValueFrom(this.workerClient.emit('evaluation.job', job).pipe(timeout(5000)));
    } catch (error) {
      record.status = 'failed';
      record.errorCode = 'WORKER_PUBLISH_FAILED';
      record.updatedAt = new Date().toISOString();
      this.logger.error(`Unable to publish evaluation.job for ${evaluationId}`, error);
      throw error;
    }

    return record;
  }

  markRunning(evaluationId: string): OrchestrationRecord | undefined {
    return this.update(evaluationId, { status: 'running' });
  }

  complete(result: EvaluationResult): OrchestrationRecord {
    const current = this.records.get(result.evaluationId) ?? this.createFromResult(result);
    Object.assign(current, {
      status: 'completed',
      score: result.score,
      feedback: result.feedback,
      updatedAt: new Date().toISOString(),
    });
    this.records.set(current.evaluationId, current);
    return current;
  }

  fail(result: EvaluationResult): OrchestrationRecord {
    const current = this.records.get(result.evaluationId) ?? this.createFromResult(result);
    Object.assign(current, {
      status: 'failed',
      errorCode: result.errorCode ?? 'EVALUATION_FAILED',
      feedback: result.errorMessage,
      updatedAt: new Date().toISOString(),
    });
    this.records.set(current.evaluationId, current);
    return current;
  }

  get(evaluationId: string): OrchestrationRecord | undefined {
    return this.records.get(evaluationId);
  }

  list(): OrchestrationRecord[] {
    return [...this.records.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  private update(evaluationId: string, patch: Partial<OrchestrationRecord>) {
    const record = this.records.get(evaluationId);
    if (!record) return undefined;
    Object.assign(record, patch, { updatedAt: new Date().toISOString() });
    return record;
  }

  private createFromResult(result: EvaluationResult): OrchestrationRecord {
    const now = new Date().toISOString();
    return {
      evaluationId: result.evaluationId,
      correlationId: result.correlationId,
      submissionId: result.submissionId,
      userId: 'unknown',
      status: 'queued',
      createdAt: now,
      updatedAt: now,
    };
  }
}

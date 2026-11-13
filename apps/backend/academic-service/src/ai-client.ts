import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

export interface EvaluationRequest { submissionId: string; assignmentId: string; userId: string; resourceId: string; language?: string; }
export interface EvaluationClient { requestEvaluation(input: EvaluationRequest): Promise<{ evaluationId: string; status: 'queued' | 'pending' }>; }

@Injectable()
export class AsyncEvaluationClient implements EvaluationClient {
  constructor(private readonly config: ConfigService) {}
  async requestEvaluation(input: EvaluationRequest) {
    const evaluationId = randomUUID();
    const url = this.config.get<string>('AI_SERVICE_URL');
    if (url) {
      const response = await fetch(`${url.replace(/\/$/, '')}/evaluations`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...input, evaluationId }) });
      if (!response.ok) throw new Error(`AI service rejected evaluation: ${response.status}`);
      const body = await response.json() as { evaluationId?: string; status?: 'queued' | 'pending' };
      return { evaluationId: body.evaluationId ?? evaluationId, status: body.status ?? 'queued' };
    }
    return { evaluationId, status: 'pending' as const };
  }
}

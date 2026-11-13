import { Test } from '@nestjs/testing';
import { of } from 'rxjs';
import { OrchestrationService } from '../src/orchestration.service';

describe('OrchestrationService', () => {
  let service: OrchestrationService;
  const workerClient = { emit: jest.fn(() => of(undefined)) };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OrchestrationService,
        { provide: 'AI_WORKER_EVENTS', useValue: workerClient },
      ],
    }).compile();
    service = module.get(OrchestrationService);
    jest.clearAllMocks();
  });

  it('publishes an evaluation job and tracks it', async () => {
    const record = await service.requestEvaluation({
      correlationId: 'corr-1',
      submissionId: 'submission-1',
      assignmentId: 'assignment-1',
      userId: 'user-1',
      language: 'python',
    });

    expect(record.status).toBe('queued');
    expect(workerClient.emit).toHaveBeenCalledWith('evaluation.job', expect.objectContaining({
      evaluationId: record.evaluationId,
      eventType: 'evaluation.job',
    }));
  });

  it('is idempotent for a repeated evaluation id', async () => {
    const request = {
      correlationId: 'corr-2',
      evaluationId: 'eval-2',
      submissionId: 'submission-2',
      userId: 'user-2',
      language: 'javascript',
    };
    await service.requestEvaluation(request);
    const second = await service.requestEvaluation(request);

    expect(second.evaluationId).toBe('eval-2');
    expect(workerClient.emit).toHaveBeenCalledTimes(1);
  });

  it('records completion and failure events', async () => {
    await service.requestEvaluation({
      correlationId: 'corr-3', evaluationId: 'eval-3', submissionId: 'submission-3', userId: 'user-3', language: 'python',
    });
    service.complete({ correlationId: 'corr-3', evaluationId: 'eval-3', submissionId: 'submission-3', status: 'completed', score: 92, feedback: 'Good' });
    expect(service.get('eval-3')?.status).toBe('completed');
    service.fail({ correlationId: 'corr-3', evaluationId: 'eval-3', submissionId: 'submission-3', status: 'failed', errorCode: 'TIMEOUT' });
    expect(service.get('eval-3')?.status).toBe('failed');
  });
});

import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EvaluationEventsController, EvaluationPublisher, AI_RABBITMQ_CLIENT } from '../src/messaging/rabbitmq';
import { Submission } from '../src/entities';
import { of } from 'rxjs';

const context = () => { const channel = { ack: jest.fn(), nack: jest.fn() }; return { getChannelRef: () => channel, getMessage: () => ({}) } as any; };

describe('Academic RabbitMQ integration', () => {
  it('publishes an enveloped evaluation.requested message', async () => {
    const emit = jest.fn().mockReturnValue(of(undefined));
    const module = await Test.createTestingModule({ providers: [{ provide: AI_RABBITMQ_CLIENT, useValue: { emit } }, EvaluationPublisher] }).compile();
    const publisher = module.get(EvaluationPublisher);
    // Avoid a broker dependency while still asserting the exact application payload.
    await publisher.publishRequested({ evaluationId: 'eval-1', submissionId: 'sub-1', assignmentId: 'a-1', userId: 'u-1', resourceId: 'r-1', language: 'python' });
    expect(emit).toHaveBeenCalledWith('evaluation.requested', expect.objectContaining({ eventType: 'evaluation.requested', idempotencyKey: 'evaluation:eval-1', payload: expect.objectContaining({ submissionId: 'sub-1' }) }));
  });

  it('applies evaluation.completed once and acknowledges the message', async () => {
    const submission = { id: 'sub-1', status: 'queued', evaluationId: undefined };
    const save = jest.fn().mockResolvedValue(submission);
    const module = await Test.createTestingModule({ controllers: [EvaluationEventsController], providers: [{ provide: getRepositoryToken(Submission), useValue: { findOneBy: jest.fn().mockResolvedValue(submission), save } }] }).compile();
    const channel = context();
    await module.get(EvaluationEventsController).completed({ payload: { evaluationId: 'eval-1', submissionId: 'sub-1', status: 'COMPLETED', score: 90, feedback: 'Good' } } as any, channel);
    expect(submission).toMatchObject({ evaluationId: 'eval-1', status: 'COMPLETED', score: 90, feedback: 'Good' });
    expect(save).toHaveBeenCalled();
    expect(channel.getChannelRef().ack).toHaveBeenCalled();
  });
});

import { markTelemetryFailure, withMessagingSpan } from './telemetry';
import { Controller } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { TimeoutError } from 'rxjs';
import { Envelope, EvaluationRequest, unwrap } from './contracts';
import { EvaluationService } from './evaluation.service';
import { logger, newId, safeId, withLogContext } from './logging';

type EvaluationJob = EvaluationRequest & { evaluationId: string };

@Controller()
export class RabbitController {
  constructor(private readonly evaluations: EvaluationService) {}

  @EventPattern('evaluation.requested')
  async requested(@Payload() message: EvaluationRequest | Envelope<EvaluationRequest>, @Ctx() context: RmqContext) {
    await this.consume('evaluation.requested', message, context, true, (payload) => this.evaluations.request(payload));
  }

  @EventPattern('evaluation.job')
  async job(@Payload() message: EvaluationJob | Envelope<EvaluationJob>, @Ctx() context: RmqContext) {
    await this.consume('evaluation.job', message, context, false, (payload) => this.evaluations.process(payload.evaluationId, payload));
  }

  private async consume<T extends EvaluationRequest>(
    routingKey: string,
    message: T | Envelope<T>,
    context: RmqContext,
    requeue: boolean,
    handle: (payload: T) => Promise<unknown>,
  ) {
    const delivery = context.getMessage();
    const envelope = message as Envelope<T> | undefined;
    const messageId = safeId(envelope?.messageId) ?? safeId(delivery.properties?.messageId);
    const payload = unwrap(message);
    const requestId = safeId(delivery.properties?.headers?.['x-request-id']);
    const correlationId = safeId(envelope?.correlationId) ?? requestId ?? messageId ?? safeId(payload?.evaluationId) ?? newId();
    const fields = { dependency: 'rabbitmq', routing_key: routingKey, message_id: messageId, redelivered: delivery.fields?.redelivered === true };

    await withMessagingSpan('process', routingKey, delivery.properties?.headers, () => withLogContext({ request_id: requestId, correlation_id: correlationId }, async () => {
      const startedAt = performance.now();
      try {
        await handle(payload);
        context.getChannelRef().ack(delivery);
        const completed = { ...fields, outcome: 'acknowledged', duration_ms: performance.now() - startedAt };
        if (fields.redelivered) {
          logger.info('rabbitmq.consume.completed', 'Redelivered message acknowledged', completed);
        } else {
          logger.debug('rabbitmq.consume.completed', 'Message acknowledged', completed);
        }
      } catch (error) {
        markTelemetryFailure();
        logger.exception('rabbitmq.consume.failed', 'Message processing failed', error, {
          ...fields,
          outcome: 'failed',
          requeue,
          duration_ms: performance.now() - startedAt,
          error_code: error instanceof TimeoutError ? 'RABBITMQ_OPERATION_TIMEOUT' : 'RABBITMQ_DELIVERY_FAILED',
        });
        context.getChannelRef().nack(delivery, false, requeue);
      }
    }));
  }
}

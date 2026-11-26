import { amqpHeaders, markTelemetryFailure, withMessagingSpan } from '../telemetry';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { ClientProxy, RmqRecordBuilder } from '@nestjs/microservices';
import { firstValueFrom, timeout, TimeoutError } from 'rxjs';
import { getLogContext, logger, newId, safeId, withLogContext } from '../logging';

export const PAYMENT_EVENTS_CLIENT = 'PAYMENT_EVENTS_CLIENT';
type PaymentEvent = 'payment.completed' | 'payment.failed' | 'credit.committed' | 'credit.released';

@Injectable()
export class PaymentEventsPublisher {
  constructor(@Optional() @Inject(PAYMENT_EVENTS_CLIENT) private readonly client?: ClientProxy) {}

  async publish(eventType: PaymentEvent, payload: Record<string, unknown>, idempotencySeed = newId()) {
    const context = getLogContext();
    const correlationId = context.correlation_id ?? safeId(idempotencySeed) ?? newId();
    const envelope = {
      messageId: newId(),
      correlationId,
      idempotencyKey: `payment-event:${idempotencySeed}:${eventType}`,
      eventType,
      occurredAt: new Date().toISOString(),
      schemaVersion: 1,
      producer: 'payment-service',
      payload,
    };
    const fields = { dependency: 'rabbitmq', routing_key: eventType, message_id: envelope.messageId };
    const client = this.client;
    await withMessagingSpan('publish', eventType, undefined, () => withLogContext({ ...context, correlation_id: correlationId }, async () => {
      if (!client) {
        markTelemetryFailure();
        logger.warn('rabbitmq.publish.failed', 'Payment event client unavailable', { ...fields, outcome: 'unavailable' });
        return;
      }
      const headers = amqpHeaders(context.request_id);
      const record = Object.keys(headers).length
        ? new RmqRecordBuilder(envelope).setOptions({ headers }).build()
        : envelope;
      const started = performance.now();
      try {
        await firstValueFrom(client.emit(eventType, record).pipe(timeout(5000)));
        logger.debug('rabbitmq.publish.completed', 'Payment event published', {
          ...fields, outcome: 'published', duration_ms: performance.now() - started,
        });
      } catch (error) {
        markTelemetryFailure();
        const timedOut = error instanceof TimeoutError;
        logger.warn(timedOut ? 'rabbitmq.publish.timeout' : 'rabbitmq.publish.failed', 'Payment event publication failed', {
          ...fields, outcome: timedOut ? 'timeout' : 'failed',
          duration_ms: performance.now() - started,
        });
      }
    }));
  }
}

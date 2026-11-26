import { amqpHeaders, markTelemetryFailure, withMessagingSpan } from '../telemetry';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { ClientProxy, RmqRecordBuilder } from '@nestjs/microservices';
import { firstValueFrom, timeout, TimeoutError } from 'rxjs';
import { getLogContext, logger, newId, withLogContext } from '../logging';

export const AUTH_EVENTS_CLIENT = 'AUTH_EVENTS_CLIENT';
type AuthEvent = 'user.created' | 'notification.created';

@Injectable()
export class AuthEventsPublisher {
  constructor(@Optional() @Inject(AUTH_EVENTS_CLIENT) private readonly client?: ClientProxy) {}

  async publish(eventType: AuthEvent, payload: Record<string, unknown>, idempotencyScope = newId()) {
    const client = this.client;
    if (!client) {
      logger.debug('rabbitmq.publish.skipped', 'RabbitMQ publisher is unavailable', { dependency: 'rabbitmq', routing_key: eventType, error_code: 'client_unavailable' });
      return;
    }
    const context = getLogContext();
    const correlationId = context.correlation_id ?? context.request_id ?? newId();
    const envelope = {
      messageId: newId(),
      correlationId,
      idempotencyKey: `user-event:${idempotencyScope}:${eventType}`,
      eventType,
      occurredAt: new Date().toISOString(),
      schemaVersion: 1,
      producer: 'user',
      payload,
    };
    await withMessagingSpan('publish', eventType, undefined, () => withLogContext({ ...context, correlation_id: correlationId }, async () => {
      const headers = amqpHeaders(context.request_id);
      const event = Object.keys(headers).length
        ? new RmqRecordBuilder(envelope).setOptions({ headers }).build()
        : envelope;
      const startedAt = performance.now();
      const fields = { dependency: 'rabbitmq', routing_key: eventType, message_id: envelope.messageId };
      try {
        await firstValueFrom(client.emit(eventType, event).pipe(timeout(5000)));
        logger.debug('rabbitmq.publish.completed', 'RabbitMQ event published', { ...fields, duration_ms: performance.now() - startedAt });
      } catch (error) {
        markTelemetryFailure();
        // Publishing remains best effort for authentication and notifications.
        const timedOut = error instanceof TimeoutError;
        logger.warn(timedOut ? 'rabbitmq.publish.timeout' : 'rabbitmq.publish.failed', 'RabbitMQ event publish did not complete', {
          ...fields,
          duration_ms: performance.now() - startedAt,
          error_code: timedOut ? 'timeout' : 'publish_error',
        });
      }
    }));
  }
}

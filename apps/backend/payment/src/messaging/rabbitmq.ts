import { withMessagingSpan } from '../telemetry';
import { Controller, HttpException } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { logger, newId, safeId, withLogContext } from '../logging';
import { PaymentService } from '../payment.service';

export interface RabbitEnvelope<T> {
  messageId: string;
  correlationId: string;
  idempotencyKey: string;
  eventType: string;
  schemaVersion?: number;
  occurredAt: string;
  producer: string;
  payload: T;
}

export interface CreditCommand {
  userId: string;
  amount?: number;
  referenceId?: string;
  reservationId?: string;
}

@Controller()
export class PaymentRabbitController {
  constructor(private readonly payments: PaymentService) {}

  @MessagePattern('credit.reserve')
  async reserve(@Payload() envelope: RabbitEnvelope<CreditCommand>, @Ctx() context: RmqContext) {
    return this.handleRequest('credit.reserve', envelope, context, () => this.payments.reserve(envelope.payload as Required<Pick<CreditCommand, 'userId' | 'amount' | 'referenceId'>>, envelope.idempotencyKey));
  }

  @MessagePattern('credit.commit')
  async commit(@Payload() envelope: RabbitEnvelope<CreditCommand>, @Ctx() context: RmqContext) {
    return this.handleRequest('credit.commit', envelope, context, () => this.payments.transition(envelope.payload.reservationId!, 'committed', envelope.idempotencyKey));
  }

  @MessagePattern('credit.release')
  async release(@Payload() envelope: RabbitEnvelope<CreditCommand>, @Ctx() context: RmqContext) {
    return this.handleRequest('credit.release', envelope, context, () => this.payments.transition(envelope.payload.reservationId!, 'released', envelope.idempotencyKey));
  }

  private handleRequest(
    operation: string,
    envelope: RabbitEnvelope<CreditCommand>,
    context: RmqContext,
    handle: () => Promise<unknown>,
  ): Promise<unknown> {
    const message = context.getMessage();
    const fields = {
      dependency: 'rabbitmq',
      routing_key: operation,
      message_id: safeId(envelope?.messageId),
      redelivered: message.fields?.redelivered === true,
    };
    return withMessagingSpan('process', operation, message.properties?.headers, () => withLogContext({
      correlation_id: safeId(envelope?.correlationId) ?? fields.message_id ?? newId(),
      request_id: safeId(message.properties?.headers?.['x-request-id']),
    }, async () => {
      const started = performance.now();
      try {
        const result = await handle();
        context.getChannelRef().ack(message);
        logger.debug('rabbitmq.consume.completed', 'Credit command acknowledged', {
          ...fields, outcome: 'acknowledged', duration_ms: performance.now() - started,
        });
        return result;
      } catch (error) {
        const status = error instanceof HttpException ? error.getStatus() : undefined;
        const failure = {
          ...fields, outcome: 'rejected', requeue: false, status_code: status,
          duration_ms: performance.now() - started,
        };
        if (status && status < 500) {
          logger.exception('rabbitmq.consume.failed', 'Credit command rejected', error, failure, 'warn');
        } else {
          logger.exception('rabbitmq.consume.failed', 'Credit command failed', error, failure);
        }
        context.getChannelRef().nack(message, false, false);
        throw error;
      }
    }));
  }
}

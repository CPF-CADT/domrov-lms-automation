import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { randomUUID } from 'crypto';

export const PAYMENT_EVENTS_CLIENT = 'PAYMENT_EVENTS_CLIENT';

@Injectable()
export class PaymentEventsPublisher {
  private readonly logger = new Logger(PaymentEventsPublisher.name);

  constructor(@Optional() @Inject(PAYMENT_EVENTS_CLIENT) private readonly client?: ClientProxy) {}

  async publish(eventType: string, payload: Record<string, unknown>, correlationId: string = randomUUID()) {
    if (!this.client) return;
    const envelope = { messageId: randomUUID(), correlationId, idempotencyKey: `payment-event:${correlationId}:${eventType}`, eventType, occurredAt: new Date().toISOString(), schemaVersion: 1, producer: 'payment-service', payload };
    try {
      await firstValueFrom(this.client.emit(eventType, envelope).pipe(timeout(5000)));
    } catch (error) {
      this.logger.warn(`Unable to publish ${eventType}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

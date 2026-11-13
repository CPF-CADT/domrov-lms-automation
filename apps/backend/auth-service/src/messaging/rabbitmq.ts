import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { randomUUID } from 'crypto';

export const AUTH_EVENTS_CLIENT = 'AUTH_EVENTS_CLIENT';

@Injectable()
export class AuthEventsPublisher {
  private readonly logger = new Logger(AuthEventsPublisher.name);

  constructor(@Optional() @Inject(AUTH_EVENTS_CLIENT) private readonly client?: ClientProxy) {}

  async publish(eventType: string, payload: Record<string, unknown>, correlationId: string = randomUUID()) {
    if (!this.client) return;
    const envelope = { messageId: randomUUID(), correlationId, idempotencyKey: `auth-event:${correlationId}:${eventType}`, eventType, occurredAt: new Date().toISOString(), schemaVersion: 1, producer: 'auth-service', payload };
    try {
      await firstValueFrom(this.client.emit(eventType, envelope).pipe(timeout(5000)));
    } catch (error) {
      // Events must not make an existing authentication or notification request fail.
      this.logger.warn(`Unable to publish ${eventType}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { PaymentService } from '../payment.service';

export interface RabbitEnvelope<T> {
  messageId: string;
  correlationId: string;
  idempotencyKey: string;
  eventType: string;
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
  private readonly logger = new Logger(PaymentRabbitController.name);

  constructor(private readonly payments: PaymentService) {}

  @MessagePattern('credit.reserve')
  async reserve(@Payload() envelope: RabbitEnvelope<CreditCommand>, @Ctx() context: RmqContext) {
    return this.handleRequest(context, () => this.payments.reserve(envelope.payload as Required<Pick<CreditCommand, 'userId' | 'amount' | 'referenceId'>>, envelope.idempotencyKey));
  }

  @MessagePattern('credit.commit')
  async commit(@Payload() envelope: RabbitEnvelope<CreditCommand>, @Ctx() context: RmqContext) {
    return this.handleRequest(context, () => this.payments.transition(envelope.payload.reservationId!, 'committed', envelope.idempotencyKey));
  }

  @MessagePattern('credit.release')
  async release(@Payload() envelope: RabbitEnvelope<CreditCommand>, @Ctx() context: RmqContext) {
    return this.handleRequest(context, () => this.payments.transition(envelope.payload.reservationId!, 'released', envelope.idempotencyKey));
  }

  private async handleRequest(context: RmqContext, operation: () => Promise<unknown>) {
    try {
      const result = await operation();
      context.getChannelRef().ack(context.getMessage());
      return result;
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : String(error));
      context.getChannelRef().nack(context.getMessage(), false, false);
      throw error;
    }
  }
}

import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { EvaluationRequested, EvaluationResult } from './contracts';
import { OrchestrationService } from './orchestration.service';

@Controller()
export class RabbitMqController {
  private readonly logger = new Logger(RabbitMqController.name);

  constructor(private readonly orchestration: OrchestrationService) {}

  @EventPattern('evaluation.requested')
  async handleRequested(@Payload() message: EvaluationRequested | { payload: EvaluationRequested }, @Ctx() context: RmqContext) {
    try {
      const payload = this.unwrapRequested(message);
      await this.orchestration.requestEvaluation(payload);
      this.ack(context);
    } catch (error) {
      this.logger.error('evaluation.requested handling failed', error);
      this.nack(context, true);
    }
  }

  @EventPattern('evaluation.completed')
  handleCompleted(@Payload() message: EvaluationResult | { payload: EvaluationResult }, @Ctx() context: RmqContext) {
    this.orchestration.complete(this.unwrapResult(message));
    this.ack(context);
  }

  @EventPattern('evaluation.failed')
  handleFailed(@Payload() message: EvaluationResult | { payload: EvaluationResult }, @Ctx() context: RmqContext) {
    this.orchestration.fail(this.unwrapResult(message));
    this.ack(context);
  }

  private ack(context: RmqContext) {
    context.getChannelRef().ack(context.getMessage());
  }

  private nack(context: RmqContext, requeue: boolean) {
    context.getChannelRef().nack(context.getMessage(), false, requeue);
  }

  private unwrapRequested<T>(message: T | { payload: T }): T {
    if (message && typeof message === 'object' && 'payload' in message) {
      return (message as { payload: T }).payload;
    }
    return message as T;
  }

  private unwrapResult(message: EvaluationResult | { payload: EvaluationResult }): EvaluationResult {
    if ('payload' in message && message.payload) {
      const outer = message as EvaluationResult & { payload: EvaluationResult };
      if (outer.evaluationId) return { ...outer.payload, ...outer, evaluationId: outer.evaluationId };
      return outer.payload;
    }
    return message as EvaluationResult;
  }
}

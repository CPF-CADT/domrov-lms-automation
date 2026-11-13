import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { EvaluationRequested, EvaluationResult } from './contracts';
import { OrchestrationService } from './orchestration.service';

@Controller()
export class RabbitMqController {
  private readonly logger = new Logger(RabbitMqController.name);

  constructor(private readonly orchestration: OrchestrationService) {}

  @EventPattern('evaluation.requested')
  async handleRequested(@Payload() payload: EvaluationRequested, @Ctx() context: RmqContext) {
    try {
      await this.orchestration.requestEvaluation(payload);
      this.ack(context);
    } catch (error) {
      this.logger.error('evaluation.requested handling failed', error);
      this.nack(context, true);
    }
  }

  @EventPattern('evaluation.completed')
  handleCompleted(@Payload() payload: EvaluationResult, @Ctx() context: RmqContext) {
    this.orchestration.complete(payload);
    this.ack(context);
  }

  @EventPattern('evaluation.failed')
  handleFailed(@Payload() payload: EvaluationResult, @Ctx() context: RmqContext) {
    this.orchestration.fail(payload);
    this.ack(context);
  }

  private ack(context: RmqContext) {
    context.getChannelRef().ack(context.getMessage());
  }

  private nack(context: RmqContext, requeue: boolean) {
    context.getChannelRef().nack(context.getMessage(), false, requeue);
  }
}

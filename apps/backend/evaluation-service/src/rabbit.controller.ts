import { Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { EvaluationRequest, unwrap } from './contracts';
import { EvaluationService } from './evaluation.service';

@Controller()
export class RabbitController {
  private readonly logger = new Logger(RabbitController.name);
  constructor(private readonly evaluations: EvaluationService) {}

  @EventPattern('evaluation.requested')
  async requested(@Payload() message: EvaluationRequest, @Ctx() context: RmqContext) {
    try { await this.evaluations.request(unwrap(message)); this.ack(context); }
    catch (error) { this.logger.error(error); this.nack(context, true); }
  }

  @EventPattern('evaluation.job')
  async job(@Payload() message: EvaluationRequest & { evaluationId: string }, @Ctx() context: RmqContext) {
    try { const payload = unwrap(message); await this.evaluations.process(payload.evaluationId); this.ack(context); }
    catch (error) { this.logger.error(error); this.nack(context, false); }
  }

  private ack(c: RmqContext) { c.getChannelRef().ack(c.getMessage()); }
  private nack(c: RmqContext, requeue: boolean) { c.getChannelRef().nack(c.getMessage(), false, requeue); }
}

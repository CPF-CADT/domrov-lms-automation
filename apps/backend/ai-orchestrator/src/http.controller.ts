import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { OrchestrationService } from './orchestration.service';

@Controller()
export class HttpController {
  constructor(private readonly orchestration: OrchestrationService) {}

  @Get('health/live')
  live() {
    return { status: 'ok', service: 'ai-orchestrator' };
  }

  @Get('health/ready')
  ready() {
    return { status: 'ok', service: 'ai-orchestrator', rabbitmq: 'configured' };
  }

  @Get('metrics')
  metrics() {
    const records = this.orchestration.list();
    const count = (status: string) => records.filter((record) => record.status === status).length;
    return {
      service: 'ai-orchestrator',
      evaluations_total: records.length,
      evaluations_queued: count('queued'),
      evaluations_running: count('running'),
      evaluations_completed: count('completed'),
      evaluations_failed: count('failed'),
    };
  }

  @Get('admin/status')
  status() {
    return { service: 'ai-orchestrator', evaluations: this.orchestration.list() };
  }

  @Get('admin/status/:evaluationId')
  statusById(@Param('evaluationId') evaluationId: string) {
    const record = this.orchestration.get(evaluationId);
    if (!record) throw new NotFoundException('Evaluation not found');
    return record;
  }
}

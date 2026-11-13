import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';

@Controller()
export class HttpController {
  constructor(private readonly evaluations: EvaluationService) {}
  @Get('health/live') live() { return { status: 'ok', service: 'evaluation-service' }; }
  @Get('health/ready') async ready() { await this.evaluations.health(); return { status: 'ok', service: 'evaluation-service', database: 'connected' }; }
  @Get('metrics') async metrics() { const rows = await this.evaluations.list(); const count = (s: string) => rows.filter((r) => r.status === s).length; return { service: 'evaluation-service', evaluations_total: rows.length, evaluations_queued: count('queued'), evaluations_running: count('running'), evaluations_completed: count('completed'), evaluations_failed: count('failed') }; }
  @Get('evaluations/:evaluationId') async get(@Param('evaluationId') id: string) { const record = await this.evaluations.find(id); if (!record) throw new NotFoundException('Evaluation not found'); return record; }
  @Get('admin/status') status() { return this.evaluations.list(); }
}

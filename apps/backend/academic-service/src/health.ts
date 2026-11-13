import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}
  @Get('live') live() { return { status: 'ok', service: 'academic-service' }; }
  @Get('ready') @HttpCode(HttpStatus.OK) async ready() { if (!this.dataSource.isInitialized) return { status: 'not_ready', database: 'disconnected' }; await this.dataSource.query('SELECT 1'); return { status: 'ok', database: 'connected' }; }
}

@Controller()
export class MetricsController {
  @Get('metrics') metrics() { return '# HELP academic_service_up Academic service process status\n# TYPE academic_service_up gauge\nacademic_service_up 1\n'; }
}

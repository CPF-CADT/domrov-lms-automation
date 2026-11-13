import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('live')
  live() { return { status: 'ok', service: 'user' }; }

  @Get('ready')
  @HttpCode(HttpStatus.OK)
  async ready() {
    if (!this.dataSource.isInitialized) return { status: 'not_ready', database: 'disconnected' };
    await this.dataSource.query('SELECT 1');
    return { status: 'ok', database: 'connected' };
  }

}

@Controller()
export class MetricsController {
  @Get('metrics')
  metrics() {
    return '# HELP auth_service_up Auth service process status\n# TYPE auth_service_up gauge\nauth_service_up 1\n';
  }
}

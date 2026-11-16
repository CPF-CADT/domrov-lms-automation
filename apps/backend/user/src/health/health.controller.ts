import { Controller, Get, Header, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ReadinessService } from './readiness.service';

@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource, private readonly readiness: ReadinessService) {}

  @Get('live')
  live() { return { status: 'ok', service: 'user' }; }

  @Get('ready')
  async ready() {
    let database = 'disconnected';
    if (this.dataSource.isInitialized) {
      try {
        // Read no rows. Detect schema drift (including pending OTP/refresh
        // cutovers) without changing data or applying migrations.
        for (const entity of this.dataSource.entityMetadatas) {
          await this.dataSource.getRepository(entity.target)
            .createQueryBuilder('probe').where('1 = 0').getRawMany();
        }
        database = 'connected';
      } catch {
        database = 'unavailable_or_schema_mismatch';
      }
    }
    const rabbitmq = this.readiness.rabbitMqReady ? 'connected' : 'unavailable';
    if (database !== 'connected' || rabbitmq !== 'connected')
      throw new ServiceUnavailableException({ status: 'not_ready', database, rabbitmq });
    return { status: 'ok', database, rabbitmq };
  }

}

@Controller()
export class MetricsController {
  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  metrics() {
    return '# HELP auth_service_up Auth service process status\n# TYPE auth_service_up gauge\nauth_service_up 1\n';
  }
}

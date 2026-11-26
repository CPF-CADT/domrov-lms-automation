import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { logger, markErrorLogged } from './logging';

@Controller('health')
export class HealthController {
  private databaseAvailable = true;

  constructor(private readonly dataSource: DataSource) {}
  @Get('live') live() { return { status: 'ok', service: 'academic-service' }; }

  @Get('ready')
  @HttpCode(HttpStatus.OK)
  async ready() {
    if (!this.dataSource.isInitialized) {
      this.updateDatabaseStatus(false);
      return { status: 'not_ready', database: 'disconnected' };
    }
    try {
      await this.dataSource.query('SELECT 1');
    } catch (error) {
      this.updateDatabaseStatus(false);
      markErrorLogged(error);
      throw error;
    }
    this.updateDatabaseStatus(true);
    return { status: 'ok', database: 'connected' };
  }

  private updateDatabaseStatus(available: boolean) {
    if (this.databaseAvailable === available) return;
    this.databaseAvailable = available;
    if (available) {
      logger.info('dependency.connected', 'Database readiness restored', { dependency: 'postgres' });
    } else {
      logger.warn('dependency.disconnected', 'Database readiness check failed', { dependency: 'postgres' });
    }
  }
}

@Controller()
export class MetricsController {
  @Get('metrics') metrics() { return '# HELP academic_service_up Academic service process status\n# TYPE academic_service_up gauge\nacademic_service_up 1\n'; }
}

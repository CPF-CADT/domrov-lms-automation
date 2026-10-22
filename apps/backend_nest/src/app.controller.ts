import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { LocalStorageService } from './services/local-storage.service';
@Controller()
export class AppController {

  constructor(private readonly localStorageService: LocalStorageService) {}

  @Get('health')
  checkHealth() {
    return { status: 'Good!' };
  }

  @Get('health/storage')
  async checkStorageHealth() {
    const health = await this.localStorageService.healthCheck();
    return {
      status: health.readable && health.writable && health.enoughFreeSpace ? 'ok' : 'degraded',
      exists: health.exists,
      readable: health.readable,
      writable: health.writable,
      enoughFreeSpace: health.enoughFreeSpace,
      freeBytes: health.freeBytes,
      usedBytes: health.usedBytes,
    };
  }

  @Get('error')
  checkErrorLogs() {
    throw new Error('This is a test error to check error logging');
  }
}

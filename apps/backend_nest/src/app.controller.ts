import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
@Controller()
export class AppController {

  @Get('health')
  checkHealth() {
    return { status: 'Good!' };
  }

  @Get('error')
  checkErrorLogs() {
    throw new Error('This is a test error to check error logging');
  }
}
  
import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { PaymentService } from './services/payment.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService,private readonly paymentService:PaymentService) {}


    @Get('qr')
  createQr(@Query('amount') amount: string) {
    const qr = this.paymentService.createQR({ currency: 'USD', amount });
    const md5 = this.paymentService.generateMD5(qr);
    return { qr, md5 };
  }

  @Get('deeplink')
  async getDeeplink(@Query('qr') qr: string) {
    const link = await this.paymentService.generateDeeplink(qr);
    return { link };
  }

  @Get('status')
  async checkPayment(@Query('md5') md5: string) {
    const status = await this.paymentService.checkPayment(md5);
    return { status };
  }

}

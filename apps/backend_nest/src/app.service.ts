import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {

  getQrPay(): string {
  
    return 'Hello World!';
  }
}

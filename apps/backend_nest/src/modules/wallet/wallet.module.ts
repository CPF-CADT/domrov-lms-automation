// wallet.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';

// Services
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { AdminWalletController } from './admin-wallet.controller';
import { CreditPackageService } from './credit-package.service';
import { PaymentFlowService } from './payment-flow.service';
import { PaymentGateway } from './payment.gateway';
import { PaymentService } from '../../services/payment.service';

// Entities
import { WalletTransaction } from '../../libs/entities/ai/wallet-transaction.entity';
import { Payment } from '../../libs/entities/ai/payment.entity';
import { User } from '../../libs/entities/user/user.entity';
import { UserCreditBalance } from '../../libs/entities/ai/user-credit-balance.entity';
import { CreditPackage } from '../../libs/entities/ai/credit-package.entity';
import { PaymentController } from './payment.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserCreditBalance,
      WalletTransaction,
      Payment,
      User,
      CreditPackage,
    ]),
    HttpModule,
  ],
  controllers: [WalletController, AdminWalletController, PaymentController],
  providers: [
    WalletService,
    CreditPackageService,
    PaymentGateway,
    PaymentFlowService,
    PaymentService,
  ],
  exports: [WalletService, CreditPackageService, PaymentFlowService],
})
export class WalletModule { }
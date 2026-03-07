import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminUsersController } from './admin-users.controller';

import { AdminEvaluationsController } from './admin-evaluations.controller';
import { WalletService } from '../wallet/wallet.service';
import { PaymentService } from '../../services/payment.service';
import { User } from '../../libs/entities/user/user.entity';
import { UserCreditBalance } from '../../libs/entities/ai/user-credit-balance.entity';
import { WalletTransaction } from '../../libs/entities/ai/wallet-transaction.entity';
import { Payment } from '../../libs/entities/ai/payment.entity';
import { CreditPackage } from '../../libs/entities/ai/credit-package.entity';
import { Evaluation } from '../../libs/entities/assessment/evaluation.entity';
import { AIUsageLog } from '../../libs/entities/ai/ai-usage-log.entity';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserCreditBalance,
      WalletTransaction,
      Payment,
      CreditPackage,
      Evaluation,
      AIUsageLog,
    ]),
    HttpModule.register({}),
    WalletModule,
  ],
  controllers: [
    AdminDashboardController,
    AdminUsersController,
    AdminEvaluationsController,
  ],
  providers: [WalletService, PaymentService],
  exports: [],
})
export class AdminModule { }

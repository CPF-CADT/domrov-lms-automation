import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Services
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { AdminWalletController } from './admin-wallet.controller';
import { TokenPackageService } from './token-package.service';
import { UserTokenBalance } from '../../../libs/entities/ai/user-token-balance.entity';
import { TokenPackage } from '../../../libs/entities/ai/token-package.entity';
import { User } from '../../common/decorators/user.decorator';
import { WalletTransaction } from '../../../libs/entities/ai/wallet-transaction.entity';
import { Payment } from '../../../libs/entities/ai/payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserTokenBalance,
      WalletTransaction,
      TokenPackage,
      Payment,
      User
    ]),
  ],
  controllers: [WalletController, AdminWalletController],
  providers: [WalletService, TokenPackageService],
  exports: [WalletService],
})
export class WalletModule {}
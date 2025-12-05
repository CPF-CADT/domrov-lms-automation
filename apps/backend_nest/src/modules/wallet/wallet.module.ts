import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Services
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { AdminWalletController } from './admin-wallet.controller';
import { TokenPackageService } from './token-package.service';
import { UserTokenBalance } from '../../../libs/entities/user-token-balance.entity';
import { WalletTransaction } from '../../../libs/entities/wallet-transaction.entity';
import { TokenPackage } from '../../../libs/entities/token-package.entity';
import { Payment } from '../../../libs/entities/payment.entity';
import { User } from '../../common/decorators/user.decorator';

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
import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../libs/entities/user/user.entity';
import { OAuthProvider } from '../../libs/entities/user/oauth-provider.entity';
import { OAuthAccount } from '../../libs/entities/user/oauth-account.entity';
import { Payment } from '../../libs/entities/ai/payment.entity';
import { WalletTransaction } from '../../libs/entities/ai/wallet-transaction.entity';
import { UserCreditBalance } from '../../libs/entities/ai/user-credit-balance.entity';

@Module({
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
  imports: [TypeOrmModule.forFeature([User, OAuthProvider, OAuthAccount, Payment, WalletTransaction, UserCreditBalance])],
})
export class UserModule { }

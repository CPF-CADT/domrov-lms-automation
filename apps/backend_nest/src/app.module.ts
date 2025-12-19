import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { SQLDatabaseModule } from './database/sql-database/sql-database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { ClassModule } from './modules/class/class.module';
import { TeamModule } from './modules/team/team.module';
import { FileModule } from './modules/file/file.module';
import { AssessmentModule } from './modules/assessment/assessment.module';
import { HttpModule } from '@nestjs/axios';
import { PaymentService } from './services/payment.service';
import { WalletModule } from './modules/wallet/wallet.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal:true,
      expandVariables:true,
    }),
    SQLDatabaseModule,
    AuthModule,
    UserModule,
    ClassModule,
    TeamModule,
    FileModule,
    AssessmentModule,
    HttpModule,
    WalletModule
  ],
  controllers: [AppController],
  providers: [AppService,PaymentService],
  exports:[AppService]
})
export class AppModule {}

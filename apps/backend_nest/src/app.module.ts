import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { SQLDatabaseModule } from './database/sql-database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { ClassModule } from './modules/class/class.module';
import { TeamModule } from './modules/team/team.module';
import { FileModule } from './modules/file/file.module';
import { AssessmentModule } from './modules/assessment/assessment.module';
import { HttpModule } from '@nestjs/axios';
import { PaymentService } from './services/payment.service';
import { WalletModule } from './modules/wallet/wallet.module';
import { EvaluationModule } from './modules/evaluation/evaluation.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { RedisService } from './modules/tasks/redis.service';

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
    WalletModule,
    EvaluationModule,
    TasksModule,
  ],
  controllers: [AppController],
  providers: [AppService,PaymentService, RedisService],
  exports:[AppService]
})
export class AppModule {}

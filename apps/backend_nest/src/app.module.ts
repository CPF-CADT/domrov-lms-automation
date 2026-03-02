import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SQLDatabaseModule } from './database/sql-database.module';
import { SecurityModule } from './common/security';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { ClassModule } from './modules/class/class.module';
import { TeamModule } from './modules/team/team.module';
import { FileModule } from './modules/file/file.module';
import { AssessmentModule } from './modules/assessment/assessment.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { EvaluationModule } from './modules/evaluation/evaluation.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { AdminModule } from './modules/admin/admin.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PaymentService } from './services/payment.service';
import { PaymentFlowService } from './modules/wallet/payment-flow.service';
import { PaymentGateway } from './modules/wallet/payment.gateway';
import { RedisService } from './services/redis.service';

import { Payment } from './libs/entities/ai/payment.entity';
import { WalletTransaction } from './libs/entities/ai/wallet-transaction.entity';
import { CreditPackage } from './libs/entities/ai/credit-package.entity';
import { UserCreditBalance } from './libs/entities/ai/user-credit-balance.entity';
import { HttpModule } from '@nestjs/axios';
import { UserAiModule } from './modules/user-ai/user-ai.module';
import { NotificationService } from './services/notification.service';
import { Assessment } from './libs/entities/assessment/assessment.entity';
import { Notification } from './libs/entities/user/notification.entity';    

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, expandVariables: true }),
        SQLDatabaseModule,
        SecurityModule,
        AuthModule,
        UserModule,
        ClassModule,
        TeamModule,
        FileModule,
        AssessmentModule,
        WalletModule,
        EvaluationModule,
        TasksModule,
        AdminModule,
        UserAiModule,
        HttpModule.register({}),
        TypeOrmModule.forFeature([Payment, CreditPackage, UserCreditBalance, WalletTransaction, Notification,Assessment,]),
    ],
    controllers: [AppController],
    providers: [AppService, PaymentService, RedisService, PaymentFlowService, PaymentGateway, NotificationService],
    exports: [NotificationService], 
})
export class AppModule {}
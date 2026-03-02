import { Module, forwardRef } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { EvaluationController } from './evaluation.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { AssessmentModule } from '../assessment/assessment.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvaluationFeedback } from '../../libs/entities/assessment/evaluation-feedback.entity';
import { Evaluation } from '../../libs/entities/assessment/evaluation.entity';
import { Submission } from '../../libs/entities/assessment/submission.entity';
import { join } from 'path';
import { WalletModule } from '../wallet/wallet.module';
import { UserAiModule } from '../user-ai/user-ai.module';
import { UserAIKey } from '../../libs/entities/ai/user-ai-key.entity';
import { NotificationService } from '../../services/notification.service';
import { Notification } from '../../libs/entities/user/notification.entity';
import { NotificationModule } from '../../services/notification.module';
@Module({
  imports: [
    TypeOrmModule.forFeature([Submission, Evaluation, EvaluationFeedback,UserAIKey,Notification]),
    forwardRef(() => AssessmentModule),
    WalletModule,
    UserAiModule,
    NotificationModule,
    ClientsModule.registerAsync([
      {
        name: 'CODE_EVAL_GRPC',
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            url: `${config.get('CODE_EVAL_GRPC_CLIENT_HOST')}:${config.get('CODE_EVAL_GRPC_CLIENT_PORT')}`,
            package: 'submission',
            protoPath: [
              join(__dirname, '../../libs/protos/submission.proto'),
              join(__dirname, '../../libs/protos/tasks.proto'),
            ],
            loader: { keepCase: true },
          },
        }),
      },
    ]),
  ],
  controllers: [EvaluationController],
  providers: [EvaluationService,],
  exports: [EvaluationService],
})
export class EvaluationModule { }

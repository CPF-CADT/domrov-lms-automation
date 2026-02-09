import { Module } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { EvaluationController } from './evaluation.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { Submission } from '../../../libs/entities/assessment/submission.entity';
import { Evaluation } from '../../../libs/entities/assessment/evaluation.entity';
import { EvaluationFeedback } from '../../../libs/entities/assessment/evaluation-feedback.entity';
import { EvaluationRubricScore } from '../../../libs/entities/assessment/evaluation-rubric-score.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Submission,
      Evaluation,
      EvaluationFeedback,
      EvaluationRubricScore,
    ]),
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
              '/app/shared/protos/submission.proto',
              '/app/shared/protos/tasks.proto',
            ],
            loader: {
              keepCase: true,
            },
          },
        }),
      },
    ]),
  ],
  controllers: [EvaluationController],
  providers: [EvaluationService],
})
export class EvaluationModule { }

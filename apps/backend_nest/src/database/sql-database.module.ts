import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

// User Entities
import { User } from 'libs/entities/user/user.entity';

import { OAuthProvider } from 'libs/entities/user/oauth-provider.entity';
import { TelegramChat } from 'libs/entities/user/telegram-chat.entity';
import { UserEmailOtp } from 'libs/entities/user/user-email-otp.entity';
import { UserRefreshToken } from 'libs/entities/user/user-refresh-token.entity';

// Classroom Entities
import { Class } from 'libs/entities/classroom/class.entity';
import { Enrollment } from 'libs/entities/classroom/enrollment.entity';
import { Team } from 'libs/entities/classroom/team.entity';
import { TeamMember } from 'libs/entities/classroom/user-team.entity';

// Assessment Entities
import { Assessment } from 'libs/entities/assessment/assessment.entity';
import { Submission } from 'libs/entities/assessment/submission.entity';
import { Evaluation } from 'libs/entities/assessment/evaluation.entity';
import { Rubrics } from 'libs/entities/assessment/rubic.entity';

// Lesson Entities
import { Module as LessonModule } from 'libs/entities/lesson/module.entity';
import { Topic } from 'libs/entities/lesson/topic.entity';

// Resource Entities
import { Resource } from 'libs/entities/resource/resource.entity';
import { AssessmentResource } from 'libs/entities/resource/assessment-resource.entity';
import { ClassResource } from 'libs/entities/resource/class-resource.entity';
import { ModuleResource } from 'libs/entities/resource/module-resource.entity';
import { SubmissionResource } from 'libs/entities/resource/submission-resource.entity';
import { TopicResource } from 'libs/entities/resource/topic-resource.entity';

// AI/Wallet Entities
import { AIUsageLog } from 'libs/entities/ai/ai-usage-log.entity';
import { Payment } from 'libs/entities/ai/payment.entity';
import { PlatformAIModel } from 'libs/entities/ai/platform-ai-model.entity';
import { TokenPackage } from 'libs/entities/ai/token-package.entity';
import { UserTokenBalance } from 'libs/entities/ai/user-token-balance.entity';
import { WalletTransaction } from 'libs/entities/ai/wallet-transaction.entity';
import { OAuthAccount } from 'libs/entities/user/oauth-account.entity';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('POSTGRES_HOST'),
        port: Number(configService.get('POSTGRES_PORT')),
        username: configService.get('POSTGRES_USER'),
        password: configService.get('POSTGRES_PASSWORD'),
        database: configService.get('POSTGRES_DB'),
        entities: [
          User,
          OAuthAccount,
          OAuthProvider,
          TelegramChat,
          UserEmailOtp,
          UserRefreshToken,
          Class,
          Enrollment,
          Team,
          TeamMember,
          Assessment,
          Submission,
          Evaluation,
          Rubrics,
          LessonModule,
          Topic,
          Resource,
          AssessmentResource,
          ClassResource,
          ModuleResource,
          SubmissionResource,
          TopicResource,
          AIUsageLog,
          Payment,
          PlatformAIModel,
          TokenPackage,
          UserTokenBalance,
          WalletTransaction,
        ],

        synchronize:true,

      }),
      inject: [ConfigService],
    }),
  ],
})
export class SQLDatabaseModule{}

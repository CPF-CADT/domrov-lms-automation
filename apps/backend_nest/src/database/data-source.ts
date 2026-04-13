import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

import { User } from '../libs/entities/user/user.entity';
import { OAuthAccount } from '../libs/entities/user/oauth-account.entity';
import { OAuthProvider } from '../libs/entities/user/oauth-provider.entity';
import { TelegramChat } from '../libs/entities/user/telegram-chat.entity';
import { UserEmailOtp } from '../libs/entities/user/user-email-otp.entity';
import { UserRefreshToken } from '../libs/entities/user/user-refresh-token.entity';
import { Notification } from '../libs/entities/user/notification.entity';

import { Class } from '../libs/entities/classroom/class.entity';
import { Enrollment } from '../libs/entities/classroom/enrollment.entity';
import { Team } from '../libs/entities/classroom/team.entity';
import { TeamMember } from '../libs/entities/classroom/user-team.entity';
import { Assessment } from '../libs/entities/assessment/assessment.entity';
import { Submission } from '../libs/entities/assessment/submission.entity';
import { Evaluation } from '../libs/entities/assessment/evaluation.entity';
import { Rubrics } from '../libs/entities/assessment/rubic.entity';
import { Resource } from '../libs/entities/resource/resource.entity';
import { AssessmentResource } from '../libs/entities/resource/assessment-resource.entity';
import { SubmissionResource } from '../libs/entities/resource/submission-resource.entity';
import { AIUsageLog } from '../libs/entities/ai/ai-usage-log.entity';
import { Payment } from '../libs/entities/ai/payment.entity';
import { WalletTransaction } from '../libs/entities/ai/wallet-transaction.entity';
import { EvaluationFeedback } from '../libs/entities/assessment/evaluation-feedback.entity';
import { UserAIKey } from '../libs/entities/ai/user-ai-key.entity';
import { UserCreditBalance } from '../libs/entities/ai/user-credit-balance.entity';
import { CreditPackage } from '../libs/entities/ai/credit-package.entity';
import { TeamAssessment } from '../libs/entities/classroom/team-assessment.entity';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.POSTGRES_URL,
  synchronize: true,
  logging: false,
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
    Resource,
    AssessmentResource,
    SubmissionResource,
    AIUsageLog,
    Payment,
    UserCreditBalance,
    CreditPackage,
    WalletTransaction,
    EvaluationFeedback,
    UserAIKey,
    TeamAssessment,
    Notification
  ],
  migrations: ['migrations/*.ts'],
};
const AppDataSource = new DataSource(dataSourceOptions);
export default AppDataSource;
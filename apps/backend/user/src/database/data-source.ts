import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserRefreshToken } from '../entities/user-refresh-token.entity';
import { UserEmailOtp } from '../entities/user-email-otp.entity';
import { InitialAuthSchema1763000000000 } from './migrations/1763000000000-InitialAuthSchema';
import { AddOAuthAccounts1763000001000 } from './migrations/1763000001000-AddOAuthAccounts';
import { AddNotifications1763000002000 } from './migrations/1763000002000-AddNotifications';
import { HashRefreshTokens1763000003000 } from './migrations/1763000003000-HashRefreshTokens';
import { HardenEmailOtps1763000004000 } from './migrations/1763000004000-HardenEmailOtps';
import { OAuthAccount } from '../entities/oauth-account.entity';
import { Notification } from '../entities/notification.entity';

export const authDataSourceOptions = {
  type: 'postgres' as const,
  url: process.env.DATABASE_URL,
  entities: [User, UserRefreshToken, UserEmailOtp, OAuthAccount, Notification],
  migrations: [InitialAuthSchema1763000000000, AddOAuthAccounts1763000001000, AddNotifications1763000002000, HashRefreshTokens1763000003000, HardenEmailOtps1763000004000],
  synchronize: false,
  migrationsRun: false,
};

export default new DataSource(authDataSourceOptions);

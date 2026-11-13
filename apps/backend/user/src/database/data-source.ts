import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserRefreshToken } from '../entities/user-refresh-token.entity';
import { UserEmailOtp } from '../entities/user-email-otp.entity';
import { InitialAuthSchema1763000000000 } from './migrations/1763000000000-InitialAuthSchema';
import { AddOAuthAccounts1763000001000 } from './migrations/1763000001000-AddOAuthAccounts';
import { AddNotifications1763000002000 } from './migrations/1763000002000-AddNotifications';
import { OAuthAccount } from '../entities/oauth-account.entity';
import { Notification } from '../entities/notification.entity';

export const authDataSourceOptions = {
  type: 'postgres' as const,
  url: process.env.DATABASE_URL,
  entities: [User, UserRefreshToken, UserEmailOtp, OAuthAccount, Notification],
  migrations: [InitialAuthSchema1763000000000, AddOAuthAccounts1763000001000, AddNotifications1763000002000],
  synchronize: false,
};

export default new DataSource(authDataSourceOptions);

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserRefreshToken } from '../entities/user-refresh-token.entity';
import { UserEmailOtp } from '../entities/user-email-otp.entity';
import { InitialAuthSchema1763000000000 } from './migrations/1763000000000-InitialAuthSchema';

export const authDataSourceOptions = {
  type: 'postgres' as const,
  url: process.env.DATABASE_URL,
  entities: [User, UserRefreshToken, UserEmailOtp],
  migrations: [InitialAuthSchema1763000000000],
  synchronize: false,
};

export default new DataSource(authDataSourceOptions);

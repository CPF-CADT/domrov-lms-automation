import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController, UsersController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { UserEmailOtp } from './entities/user-email-otp.entity';
import { UserRefreshToken } from './entities/user-refresh-token.entity';
import { User } from './entities/user.entity';
import { OAuthAccount } from './entities/oauth-account.entity';
import { HealthController, MetricsController } from './health/health.controller';
import { MailerService } from './mailer/mailer.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        entities: [User, UserRefreshToken, UserEmailOtp, OAuthAccount],
        synchronize: false,
      }),
    }),
    TypeOrmModule.forFeature([User, UserRefreshToken, UserEmailOtp, OAuthAccount]),
  ],
  controllers: [AuthController, UsersController, HealthController, MetricsController],
  providers: [
    AuthService,
    JwtAuthGuard,
    MailerService,
    {
      provide: 'ACCESS_JWT_SERVICE',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => new JwtService({ secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'), signOptions: { expiresIn: config.get<string>('JWT_ACCESS_EXPIRES_IN', '20h') as any } }),
    },
    {
      provide: 'REFRESH_JWT_SERVICE',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => new JwtService({ secret: config.getOrThrow<string>('JWT_REFRESH_SECRET'), signOptions: { expiresIn: config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d') as any } }),
    },
  ],
})
export class AppModule {}

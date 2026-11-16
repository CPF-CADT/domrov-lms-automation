import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthController, UsersController } from './auth/auth.controller'
import { AuthService } from './auth/auth.service'
import { JwtAuthGuard } from './auth/jwt-auth.guard'
import { UserEmailOtp } from './entities/user-email-otp.entity'
import { UserRefreshToken } from './entities/user-refresh-token.entity'
import { User } from './entities/user.entity'
import { OAuthAccount } from './entities/oauth-account.entity'
import { HealthController, MetricsController } from './health/health.controller'
import { MailerService } from './mailer/mailer.service'
import { Notification } from './entities/notification.entity'
import { NotificationController } from './notifications/notification.controller'
import { NotificationService } from './notifications/notification.service'
import { AdminUserController } from './admin/admin-user.controller'
import { AdminUserService } from './admin/admin-user.service'
import { AdminRoleGuard, SuperAdminRoleGuard } from './admin/admin-role.guard'
import { ClientsModule, Transport } from '@nestjs/microservices'
import { AUTH_EVENTS_CLIENT, AuthEventsPublisher } from './messaging/rabbitmq'
import { JwtService, type JwtSignOptions } from '@nestjs/jwt'
import { validateOtpConfiguration } from './auth/otp.config'
import { authDataSourceOptions } from './database/data-source'
import { ReadinessService } from './health/readiness.service'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateOtpConfiguration }),
    ClientsModule.registerAsync([
      {
        name: AUTH_EVENTS_CLIENT,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [config.getOrThrow<string>('RABBITMQ_URL')],
            queue: config.get<string>(
              'RABBITMQ_AUTH_EVENTS_QUEUE',
              'auth-events',
            ),
            exchange: config.get<string>(
              'RABBITMQ_EVENTS_EXCHANGE',
              'domrov.events',
            ),
            exchangeType: 'topic',
            wildcards: true,
            queueOptions: { durable: true },
            noAck: true,
            prefetchCount: 10,
          },
        }),
      },
    ]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...authDataSourceOptions,
        url: config.getOrThrow<string>('DATABASE_URL'),
      }),
    }),
    TypeOrmModule.forFeature([
      User,
      UserRefreshToken,
      UserEmailOtp,
      OAuthAccount,
      Notification,
    ]),
  ],
  controllers: [
    AuthController,
    UsersController,
    NotificationController,
    AdminUserController,
    HealthController,
    MetricsController,
  ],
  providers: [
    AuthService,
    JwtAuthGuard,
    MailerService,
    NotificationService,
    AdminUserService,
    AuthEventsPublisher,
    AdminRoleGuard,
    SuperAdminRoleGuard,
    ReadinessService,
    {
      provide: 'ACCESS_JWT_SERVICE',
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new JwtService({
          secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
          signOptions: {
            expiresIn: config.get<string>(
              'JWT_ACCESS_EXPIRES_IN',
              '20h',
            ) as JwtSignOptions['expiresIn'],
          },
        }),
    },
    {
      provide: 'REFRESH_JWT_SERVICE',
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new JwtService({
          secret: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
          signOptions: {
            expiresIn: config.get<string>(
              'JWT_REFRESH_EXPIRES_IN',
              '7d',
            ) as JwtSignOptions['expiresIn'],
          },
        }),
    },
  ],
})
export class AppModule {}

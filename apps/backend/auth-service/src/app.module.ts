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
import { Notification } from './entities/notification.entity';
import { NotificationController } from './notifications/notification.controller';
import { NotificationService } from './notifications/notification.service';
import { AdminUserController } from './admin/admin-user.controller';
import { AdminUserService } from './admin/admin-user.service';
import { AdminRoleGuard, SuperAdminRoleGuard } from './admin/admin-role.guard';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AUTH_EVENTS_CLIENT, AuthEventsPublisher } from './messaging/rabbitmq';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ClientsModule.registerAsync([{ name: AUTH_EVENTS_CLIENT, imports: [ConfigModule], inject: [ConfigService], useFactory: (config: ConfigService) => ({ transport: Transport.RMQ, options: { urls: [config.get<string>('RABBITMQ_URL', 'amqp://domrov:domrov@localhost:5672')], queue: config.get<string>('RABBITMQ_AUTH_EVENTS_QUEUE', 'auth-events'), queueOptions: { durable: true }, noAck: false, prefetchCount: 10 } }) }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        entities: [User, UserRefreshToken, UserEmailOtp, OAuthAccount, Notification],
        synchronize: false,
      }),
    }),
    TypeOrmModule.forFeature([User, UserRefreshToken, UserEmailOtp, OAuthAccount, Notification]),
  ],
  controllers: [AuthController, UsersController, NotificationController, AdminUserController, HealthController, MetricsController],
  providers: [
    AuthService,
    JwtAuthGuard,
    MailerService,
    NotificationService,
    AdminUserService,
    AuthEventsPublisher,
    AdminRoleGuard,
    SuperAdminRoleGuard,
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

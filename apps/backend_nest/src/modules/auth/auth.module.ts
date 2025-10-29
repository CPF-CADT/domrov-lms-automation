import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../../libs/entities/user.entity';
import { AccessJwtConfigModule } from '../../config/access-jwt.config';
import { RefreshJwtConfigModule } from '../../config/refresh-jwt.config';
import { JwtStrategy } from './stragies/access-jwt-strategy';
import { RefreshTokenStrategy } from './stragies/refresh-jwt-strategy';
import { UserRefreshToken } from '../../../libs/entities/user-refresh-token.entity';
import { MailModule } from '../../config/mailer.config';
import { UserEmailOtp } from '../../../libs/entities/user-email-otp.entity';

@Module({
  controllers: [AuthController],
  providers: [AuthService,JwtStrategy, RefreshTokenStrategy],
  imports:[
    TypeOrmModule.forFeature([User,UserRefreshToken,UserEmailOtp]),
    AccessJwtConfigModule,
    RefreshJwtConfigModule,
    MailModule
  ],
  exports: [TypeOrmModule],
})
export class AuthModule {}

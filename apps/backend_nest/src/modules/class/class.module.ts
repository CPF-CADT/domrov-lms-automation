import { Module } from '@nestjs/common';
import { ClassService } from './class.service';
import { ClassController } from './class.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Class } from '../../../libs/entities/class.entity';
import { User } from '../../../libs/entities/user.entity';
import { Enrollment } from '../../../libs/entities/enrollment.entity';
import { AuthModule } from '../auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { MailModule } from '../../config/mailer.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Class, Enrollment]),
    AuthModule,
    JwtModule,
    ConfigModule,
    MailModule
  ],
  controllers: [ClassController],
  providers: [ClassService],
})
export class ClassModule { }
